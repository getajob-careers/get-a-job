import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'

// generate-daily-action — Wk 3 Daily Action Card backend.
//
// Picks ONE action per user per day for the top of the Home dashboard.
// Lazy generation: called when the user opens Home and no row exists in
// daily_actions for today. If today's row already exists, return it
// unchanged — UNIQUE (user_id, for_date) protects against duplicates.
//
// Two-stage logic:
//   1. Deterministic rule-based ranking (this file) — score every
//      candidate from the pool (tasks + applications + career_roles +
//      stories) using leverage × urgency × low_friction × calibration.
//   2. LLM framing only (gpt-4o-mini) — the winning candidate is passed
//      to the LLM which writes the user-facing title + rationale. The
//      LLM does NOT rank. Ranking is auditable from pick_score in the
//      DB.
//
// Calibration loop: count last-7-day dismissals per action_type for
// this user. ≥3 dismissals → score multiplied by 0.2 (deweight, don't
// zero). Persisted threshold; can be tuned from pilot signal.
//
// Anti-fab: the LLM only frames a candidate the rules picked. It can
// reword the title and rationale but it can't invent a candidate or
// change the action_type / source_table / source_id.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MODEL = 'gpt-4o-mini'
// 60/hour. Daily Action is per-user-per-day so the natural cap is 1/day
// per user. 60 is comfortable headroom for force_regenerate during dev
// and for the rare case a user clicks done/dismiss multiple times.
const RATE_LIMIT_CALLS = 60
const RATE_LIMIT_WINDOW = 3600

type ActionType =
  | 'apply'
  | 'reach_out'
  | 'follow_up'
  | 'interview_prep'
  | 'skill_practice'
  | 'reflect'
  | 'update_profile'
  | 'capture_story'

type SourceTable = 'tasks' | 'applications' | 'career_roles' | 'stories' | null

interface Candidate {
  action_type: ActionType
  source_table: SourceTable
  source_id: string | null
  // Free-text context the LLM uses to write the framing — e.g. for a
  // 'follow_up' candidate: "Atera, applied 2026-05-04, no response 7 days".
  // The LLM gets this and only this (no PII, no raw DB rows).
  context: string
  // Component scores. Final score = leverage * urgency * low_friction.
  leverage: number
  urgency: number
  low_friction: number
}

// Leverage weights — higher = bigger career-impact per minute of effort.
// Anchored on the ROADMAP "Leverage" examples: warm outreach > generic
// application > skill-gap practice. Tune from pilot signal.
const LEVERAGE: Record<ActionType, number> = {
  reach_out: 10,
  follow_up: 8,
  interview_prep: 8,
  apply: 6,
  capture_story: 5,
  skill_practice: 4,
  reflect: 3,
  update_profile: 2,
}

// Dismissed-type backoff threshold. ≥3 dismissals of a type in the last
// 7 days → multiply that type's candidate scores by 0.2 (deweight, not
// zero — we want pilot signal to flow even on de-prioritised types).
const CALIBRATION_DISMISSAL_THRESHOLD = 3
const CALIBRATION_BACKOFF_MULTIPLIER = 0.2
const CALIBRATION_WINDOW_DAYS = 7

// Returns YYYY-MM-DD in Asia/Jerusalem (pilot timezone). Daily action
// boundary follows the user's local "day", not UTC midnight.
function todayInIsrael(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('generate-daily-action')
  let _ok = false
  let _http = 500
  let _err: string | null = null

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      _http = 500; _err = 'no_openai_key'
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      _http = 401; _err = 'auth'
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      _http = 401; _err = 'auth'
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    m.userId = user.id

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: allowed } = await serviceClient.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'generate-daily-action',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (allowed === false) {
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Optional dev/test flag — bypass the "today exists?" short-circuit.
    let force_regenerate = false
    try {
      const rawBody = await req.text()
      if (rawBody) {
        const body = JSON.parse(rawBody)
        force_regenerate = body?.force_regenerate === true
      }
    } catch {
      // Empty / non-JSON body is fine — no params required.
    }

    const for_date = todayInIsrael()

    // Short-circuit if today's row already exists (the common case after
    // first generation of the day). Lazy generation pattern.
    if (!force_regenerate) {
      const { data: existing } = await supabase
        .from('daily_actions')
        .select('*')
        .eq('user_id', user.id)
        .eq('for_date', for_date)
        .maybeSingle()
      if (existing) {
        _ok = true; _http = 200
        return new Response(JSON.stringify({ daily_action: existing }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      // force_regenerate: DELETE today's row if any so the unique
      // constraint doesn't reject the new insert.
      await supabase
        .from('daily_actions')
        .delete()
        .eq('user_id', user.id)
        .eq('for_date', for_date)
    }

    // Build candidate pool. All reads in parallel — single round-trip.
    const [tasksRes, applicationsRes, careerRolesRes, storiesRes, dismissalsRes] = await Promise.all([
      supabase.from('tasks')
        .select('id, title, description, category, priority, due_date, role_title')
        .eq('user_id', user.id)
        .eq('is_complete', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(15),
      supabase.from('applications')
        .select('id, company, role_title, status, applied_date, updated_at')
        .eq('user_id', user.id)
        .in('status', ['applied', 'interview', 'interested'])
        .order('updated_at', { ascending: false })
        .limit(15),
      supabase.from('career_roles')
        .select('id, title, track, skills_gap')
        .eq('user_id', user.id)
        .eq('track', 'track_1')
        .limit(3),
      supabase.from('stories')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      // Calibration: count last-7-day dismissals per action_type.
      supabase.from('daily_actions')
        .select('action_type')
        .eq('user_id', user.id)
        .eq('status', 'dismissed')
        .gte('for_date', new Date(Date.now() - CALIBRATION_WINDOW_DAYS * 86400 * 1000).toISOString().slice(0, 10)),
    ])

    const tasks = tasksRes.data || []
    const applications = applicationsRes.data || []
    const careerRoles = careerRolesRes.data || []
    const storyCount = storiesRes.count ?? 0
    const dismissals = dismissalsRes.data || []

    // Per-type dismissal counts. Used to apply backoff in scoreCandidates.
    const dismissedByType = new Map<ActionType, number>()
    for (const d of dismissals) {
      const t = d.action_type as ActionType
      dismissedByType.set(t, (dismissedByType.get(t) || 0) + 1)
    }

    const candidates = buildCandidates({
      tasks,
      applications,
      careerRoles,
      storyCount,
      todayIso: for_date,
    })

    if (candidates.length === 0) {
      // Brand-new user with no tasks / apps / roles / stories. Fall back
      // to update_profile with no source_table.
      candidates.push({
        action_type: 'update_profile',
        source_table: null,
        source_id: null,
        context: 'You haven\'t generated a career analysis yet. Complete it to unlock track-1 role recommendations and tailored guidance.',
        leverage: LEVERAGE.update_profile,
        urgency: 1.0,
        low_friction: 1.2,
      })
    }

    // Score + sort.
    const scored = candidates.map((c) => {
      const base = c.leverage * c.urgency * c.low_friction
      const dismissCount = dismissedByType.get(c.action_type) || 0
      const calibrationMultiplier =
        dismissCount >= CALIBRATION_DISMISSAL_THRESHOLD ? CALIBRATION_BACKOFF_MULTIPLIER : 1.0
      const final_score = base * calibrationMultiplier
      return { ...c, final_score, calibrationMultiplier }
    }).sort((a, b) => b.final_score - a.final_score)

    const winner = scored[0]

    // LLM framing only — gpt-4o-mini writes the title + rationale +
    // estimated_minutes. The action_type / source_table / source_id are
    // set by the rules, NOT the model.
    const llmInput = {
      action_type: winner.action_type,
      context: winner.context,
      pilot_audience: 'Israeli BBA student from Reichman entering tech (CS/PM/BD/RevOps/CSM roles)',
    }

    const systemPrompt = `You are a daily-action coach for "Get A Job," a career operating system for Israeli business students entering tech roles. The product backend has already picked the single highest-leverage action for this user today based on their data. Your job is ONLY to frame that action for the user.

Write three fields:
1. title — one short imperative line (≤80 chars). The action they should do today. Specific, concrete, references the named entity if available (company, role, skill). Examples: "Follow up with Atera on your application from 5 days ago", "Capture your Guardio onboarding story for the Bank", "Open the SQL course you flagged as a Track 1 gap".
2. rationale — 1-2 sentences explaining why TODAY specifically. Tie the urgency to the user's actual state (days since applied, gap until interview, story count vs target, etc.). NOT generic motivation.
3. estimated_minutes — realistic time estimate. 5 / 10 / 15 / 20 / 30 / 45 / 60. Be honest — if it's a 30-minute task, say 30, not 10.

VOICE: direct, peer-to-peer, no "you've got this" cheerleader tone. Treat them like a smart adult who needs a nudge, not a pep talk. Israeli professional culture skews direct — match that register, no American hedging.

ANTI-FABRICATION: only reference facts from the context provided. Don't invent metrics, dates, company names, or skill names the context doesn't include. If the context is sparse, write something generic-but-honest rather than inventing detail.

Return EXACTLY this JSON shape:
{
  "title": "string",
  "rationale": "string",
  "estimated_minutes": number
}

Return ONLY valid JSON.`

    const userPrompt = `Frame today's daily action.

INPUT:
${JSON.stringify(llmInput, null, 2)}

Return ONLY valid JSON.`

    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'generate-daily-action',
        userId: user.id,
        metadata: {
          action_type: winner.action_type,
          source_table: winner.source_table,
          pick_score: winner.final_score,
          calibration_applied: winner.calibrationMultiplier < 1.0,
          candidate_pool_size: candidates.length,
        },
      },
      { signal: AbortSignal.timeout(20000) },
    )

    if (!openaiResponse.ok) {
      console.error(`[generate-daily-action] OpenAI ${openaiResponse.status}`)
      _http = 502; _err = `openai_${openaiResponse.status}`
      m.modelUsed = MODEL
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const completion = await openaiResponse.json()
    m.modelUsed = MODEL
    m.tokensIn = completion.usage?.prompt_tokens ?? null
    m.tokensOut = completion.usage?.completion_tokens ?? null

    const content: string = completion.choices?.[0]?.message?.content || '{}'
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (parseErr) {
      console.error('[generate-daily-action] JSON parse failed:', content.slice(0, 200), parseErr)
      _http = 502; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned malformed response. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Sanitise LLM output. action_type / source_table / source_id come
    // from the rules — model can't override them.
    const title = typeof parsed.title === 'string' ? parsed.title.trim().slice(0, 200) : ''
    const rationale = typeof parsed.rationale === 'string' ? parsed.rationale.trim().slice(0, 500) : ''
    let estimated_minutes: number | null = null
    if (typeof parsed.estimated_minutes === 'number' && parsed.estimated_minutes > 0 && parsed.estimated_minutes < 240) {
      estimated_minutes = Math.round(parsed.estimated_minutes)
    }

    if (!title || !rationale) {
      _http = 502; _err = 'bad_shape'
      return new Response(JSON.stringify({ error: 'AI returned an unexpected structure. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert. Unique (user_id, for_date) protects against race conditions
    // — if two Home loads fire concurrently, one of them gets a 23505
    // conflict and we re-read the row that won.
    const { data: inserted, error: insertError } = await supabase
      .from('daily_actions')
      .insert({
        user_id: user.id,
        for_date,
        action_type: winner.action_type,
        source_table: winner.source_table,
        source_id: winner.source_id,
        title,
        rationale,
        estimated_minutes,
        pick_score: winner.final_score,
      })
      .select()
      .single()

    if (insertError) {
      // Race fallback: another tab won the insert. Read whatever row landed.
      if (insertError.code === '23505') {
        const { data: existing } = await supabase
          .from('daily_actions')
          .select('*')
          .eq('user_id', user.id)
          .eq('for_date', for_date)
          .single()
        if (existing) {
          _ok = true; _http = 200
          return new Response(JSON.stringify({ daily_action: existing }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
      console.error('[generate-daily-action] insert failed:', insertError)
      _http = 500; _err = 'insert_failed'
      return new Response(JSON.stringify({ error: 'Failed to save daily action.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify({ daily_action: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[generate-daily-action] unhandled:', error?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})

// ============================================================
// Candidate building (deterministic rules — no LLM)
// ============================================================

interface BuildCandidatesArgs {
  tasks: any[]
  applications: any[]
  careerRoles: any[]
  storyCount: number
  todayIso: string
}

function buildCandidates(args: BuildCandidatesArgs): Candidate[] {
  const { tasks, applications, careerRoles, storyCount, todayIso } = args
  const candidates: Candidate[] = []
  const today = new Date(todayIso)

  // ── 1. Tasks → map to action_type by category ──────────────────
  for (const t of tasks) {
    const action_type = mapTaskCategoryToActionType(t.category)
    const urgency = taskUrgency(t.due_date, today)
    const low_friction = t.description && t.description.length > 30 ? 1.5 : 1.0
    candidates.push({
      action_type,
      source_table: 'tasks',
      source_id: t.id,
      context: `Task: ${t.title}${t.role_title ? ` (for ${t.role_title})` : ''}${t.due_date ? `. Due ${t.due_date.slice(0, 10)}` : ''}. ${t.description ? `Description: ${t.description.slice(0, 200)}` : 'No description.'}`,
      leverage: LEVERAGE[action_type],
      urgency,
      low_friction,
    })
  }

  // ── 2. Applications → follow_up (stale) or interview_prep ───────
  for (const a of applications) {
    if (a.status === 'interview') {
      candidates.push({
        action_type: 'interview_prep',
        source_table: 'applications',
        source_id: a.id,
        context: `Interview at ${a.company || 'unnamed company'} for ${a.role_title || 'a role'}. Prepare common questions and tailor stories to the role.`,
        leverage: LEVERAGE.interview_prep,
        urgency: 3.0,         // interview prep is always today-urgent
        low_friction: 1.2,
      })
    } else if (a.status === 'applied') {
      const appliedAt = a.applied_date ? new Date(a.applied_date) : new Date(a.updated_at)
      const daysSince = daysBetween(appliedAt, today)
      // Sweet spot for follow-up: 5-10 days. Earlier = too eager, later = stale.
      if (daysSince >= 5 && daysSince <= 14) {
        candidates.push({
          action_type: 'follow_up',
          source_table: 'applications',
          source_id: a.id,
          context: `Applied to ${a.company || 'unnamed company'} for ${a.role_title || 'a role'} ${daysSince} days ago, no response yet. A brief follow-up keeps your name visible without being pushy.`,
          leverage: LEVERAGE.follow_up,
          urgency: daysSince >= 7 ? 2.0 : 1.5,
          low_friction: 1.5,        // template follow-ups exist
        })
      }
    }
  }

  // ── 3. Career roles → skill_practice for track_1 skill gaps ──────
  for (const r of careerRoles) {
    const gaps = Array.isArray(r.skills_gap) ? r.skills_gap.slice(0, 3) : []
    if (gaps.length > 0) {
      candidates.push({
        action_type: 'skill_practice',
        source_table: 'career_roles',
        source_id: r.id,
        context: `Track-1 role: ${r.title}. Top skill gaps: ${gaps.join(', ')}. Even 20 minutes today closes the gap meaningfully.`,
        leverage: LEVERAGE.skill_practice,
        urgency: 0.8,           // no hard deadline → lower urgency
        low_friction: 1.0,
      })
    }
  }

  // ── 4. Story Bank — encourage capture if under target ───────────
  // Target heuristic: ~10 stories is a healthy bank for tailored CV + LinkedIn.
  if (storyCount < 10) {
    candidates.push({
      action_type: 'capture_story',
      source_table: 'stories',
      source_id: null,
      context: `You have ${storyCount} story(ies) captured. A bigger Story Bank means better tailored CVs and stronger LinkedIn posts. Capture one specific moment from a recent role or project today.`,
      leverage: LEVERAGE.capture_story,
      urgency: storyCount < 3 ? 1.3 : 0.9,
      low_friction: 1.4,        // quick-add modal is fast
    })
  }

  // ── 5. Reflect — always available, low priority ────────────────
  // Surfaced when nothing more urgent qualifies. Triggers Story Bank
  // capture in the UI (per design strategy: "the reflection IS the
  // story capture").
  candidates.push({
    action_type: 'reflect',
    source_table: null,
    source_id: null,
    context: 'What did this past week teach you? Spend 5 minutes jotting down one specific moment — a customer call, a tough decision, a small win. The reflection becomes a story you can use later.',
    leverage: LEVERAGE.reflect,
    urgency: 0.7,
    low_friction: 1.6,        // 5 minutes, no setup
  })

  return candidates
}

function mapTaskCategoryToActionType(category: string | null | undefined): ActionType {
  switch ((category || '').toLowerCase()) {
    case 'networking': return 'reach_out'
    case 'application': case 'apply': return 'apply'
    case 'interview_prep': case 'interview': return 'interview_prep'
    case 'skill_gap': case 'learning': case 'course': return 'skill_practice'
    case 'follow_up': return 'follow_up'
    case 'profile': case 'cv': case 'linkedin': return 'update_profile'
    default: return 'apply'
  }
}

function taskUrgency(dueDate: string | null | undefined, today: Date): number {
  if (!dueDate) return 0.9
  const due = new Date(dueDate)
  const days = daysBetween(today, due)
  if (days < 0) return 2.5         // overdue
  if (days === 0) return 2.0       // due today
  if (days <= 2) return 1.5        // due within 2 days
  if (days <= 7) return 1.2        // this week
  return 0.8                       // further out
}

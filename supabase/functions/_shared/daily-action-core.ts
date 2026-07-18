// daily-action-core.ts — shared daily-action generation logic.
//
// Extracted from generate-daily-action/index.ts so the same scoring +
// LLM-framing pipeline runs from both:
//   - user-JWT path: `generate-daily-action` (lazy on-demand when a user
//     opens Home and no row exists for today)
//   - service-role path: `cron-generate-daily-action` (invoked by the
//     GH Actions nightly job at 04:00 UTC for every user with
//     onboarding_complete=true)
//
// Both paths share this helper so any future tweak to scoring weights,
// LLM prompt, or candidate-pool composition stays in ONE place.
//
// The helper does NOT do auth or rate-limiting — callers handle those.
// It DOES do: existing-row check, candidate fetch, scoring, LLM call,
// insert with race fallback. Result is identical between both paths.
//
// Output shape mirrors what the user-facing edge function used to return:
//   { ok: true, daily_action: <row> }     — generated or already existed
//   { ok: false, status: <http>, error: <msg> }   — failed somewhere
//
// Callers translate the result to their own Response shape.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { openaiChatCompletion } from './openai-chat.ts'
import type { Metric } from './metrics.ts'

const MODEL = 'gpt-4o-mini'

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
  context: string
  leverage: number
  urgency: number
  low_friction: number
}

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

const CALIBRATION_DISMISSAL_THRESHOLD = 3
const CALIBRATION_BACKOFF_MULTIPLIER = 0.2
const CALIBRATION_WINDOW_DAYS = 7

// Returns YYYY-MM-DD in Asia/Jerusalem (pilot timezone). Daily action
// boundary follows the user's local "day", not UTC midnight, so both the
// cron run (04:00 UTC = 06:00-07:00 IL) and an on-demand user request
// land on the same `for_date` regardless of who fired first.
export function todayInIsrael(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export interface DailyActionResult {
  ok: boolean
  daily_action?: Record<string, unknown> | null
  status?: number
  error?: string
}

export interface GenerateOptions {
  forceRegenerate?: boolean
  // Optional metric to mutate (modelUsed, tokensIn, tokensOut). Caller
  // owns startMetric/finishMetric; this just fills in fields.
  metric?: Metric
}

/**
 * Generate (or return the existing) daily action for `userId`.
 *
 * `client` must be authorised to read this user's tasks/applications/
 * career_roles/stories/daily_actions AND insert into daily_actions:
 *   - User-JWT path: pass a user-scoped client. RLS enforces ownership.
 *   - Cron path: pass a service-role client. RLS bypassed; safety comes
 *     from the cron script's own auth check + only iterating users it
 *     fetched from profiles.
 *
 * Idempotent: if today's row already exists, returns it without calling
 * OpenAI (unless forceRegenerate). UNIQUE (user_id, for_date) provides
 * concurrency safety; race fallback re-reads the winning row.
 */
export async function generateDailyActionForUser(
  userId: string,
  client: SupabaseClient,
  openaiKey: string,
  options: GenerateOptions = {},
): Promise<DailyActionResult> {
  const { forceRegenerate = false, metric } = options
  const for_date = todayInIsrael()

  // Short-circuit if today's row already exists (the common case for the
  // user-JWT path after the cron has already populated it).
  if (!forceRegenerate) {
    const { data: existing } = await client
      .from('daily_actions')
      .select('*')
      .eq('user_id', userId)
      .eq('for_date', for_date)
      .maybeSingle()
    if (existing) {
      return { ok: true, daily_action: existing }
    }
  } else {
    // force_regenerate: DELETE today's row if any so the unique
    // constraint doesn't reject the new insert.
    await client.from('daily_actions').delete().eq('user_id', userId).eq('for_date', for_date)
  }

  // Build candidate pool. All reads in parallel — single round-trip.
  const [tasksRes, applicationsRes, careerRolesRes, storiesRes, dismissalsRes] = await Promise.all([
    client.from('tasks')
      .select('id, title, description, category, priority, due_date, role_title')
      .eq('user_id', userId)
      .eq('is_complete', false)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(15),
    client.from('applications')
      .select('id, company, role_title, status, applied_date, updated_at')
      .eq('user_id', userId)
      .in('status', ['applied', 'interview', 'interested'])
      .order('updated_at', { ascending: false })
      .limit(15),
    client.from('career_roles')
      .select('id, title, track, skills_gap')
      .eq('user_id', userId)
      .eq('track', 'track_1')
      .limit(3),
    client.from('stories').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    client.from('daily_actions')
      .select('action_type')
      .eq('user_id', userId)
      .eq('status', 'dismissed')
      .gte('for_date', new Date(Date.now() - CALIBRATION_WINDOW_DAYS * 86400 * 1000).toISOString().slice(0, 10)),
  ])

  const tasks = tasksRes.data || []
  const applications = applicationsRes.data || []
  const careerRoles = careerRolesRes.data || []
  const storyCount = storiesRes.count ?? 0
  const dismissals = dismissalsRes.data || []

  const dismissedByType = new Map<ActionType, number>()
  for (const d of dismissals) {
    const t = d.action_type as ActionType
    dismissedByType.set(t, (dismissedByType.get(t) || 0) + 1)
  }

  const candidates = buildCandidates({ tasks, applications, careerRoles, storyCount, todayIso: for_date })

  if (candidates.length === 0) {
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

  const scored = candidates.map((c) => {
    const base = c.leverage * c.urgency * c.low_friction
    const dismissCount = dismissedByType.get(c.action_type) || 0
    const calibrationMultiplier =
      dismissCount >= CALIBRATION_DISMISSAL_THRESHOLD ? CALIBRATION_BACKOFF_MULTIPLIER : 1.0
    return { ...c, final_score: base * calibrationMultiplier, calibrationMultiplier }
  }).sort((a, b) => b.final_score - a.final_score)

  const winner = scored[0]

  const llmInput = {
    action_type: winner.action_type,
    context: winner.context,
    pilot_audience: 'Early-career business student entering tech (CS/PM/BD/RevOps/CSM roles)',
  }

  const systemPrompt = `You are a daily-action coach for "Get A Job," a career operating system for business students entering tech roles. The product backend has already picked the single highest-leverage action for this user today based on their data. Your job is ONLY to frame that action for the user.

Write three fields:
1. title — one short imperative line (≤80 chars). The action they should do today. Specific, concrete, references the named entity if available (company, role, skill). Examples: "Follow up with [company] on your application from 5 days ago", "Capture your onboarding story for the Bank", "Open the SQL course you flagged as a Track 1 gap".
2. rationale — 1-2 sentences explaining why TODAY specifically. Tie the urgency to the user's actual state (days since applied, gap until interview, story count vs target, etc.). NOT generic motivation.
3. estimated_minutes — realistic time estimate. 5 / 10 / 15 / 20 / 30 / 45 / 60. Be honest — if it's a 30-minute task, say 30, not 10.

VOICE: direct, peer-to-peer, no "you've got this" cheerleader tone. Treat them like a smart adult who needs a nudge, not a pep talk. Direct register beats hedging.

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
      userId,
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
    console.error(`[daily-action-core] OpenAI ${openaiResponse.status}`)
    if (metric) metric.modelUsed = MODEL
    return { ok: false, status: 502, error: 'AI service temporarily unavailable.' }
  }

  const completion = await openaiResponse.json()
  if (metric) {
    metric.modelUsed = MODEL
    metric.tokensIn = completion.usage?.prompt_tokens ?? null
    metric.tokensOut = completion.usage?.completion_tokens ?? null
  }

  const content: string = completion.choices?.[0]?.message?.content || '{}'
  let parsed: { title?: unknown; rationale?: unknown; estimated_minutes?: unknown }
  try {
    parsed = JSON.parse(content)
  } catch (parseErr) {
    console.error('[daily-action-core] JSON parse failed:', content.slice(0, 200), parseErr)
    return { ok: false, status: 502, error: 'AI returned malformed response.' }
  }

  const title = typeof parsed.title === 'string' ? parsed.title.trim().slice(0, 200) : ''
  const rationale = typeof parsed.rationale === 'string' ? parsed.rationale.trim().slice(0, 500) : ''
  let estimated_minutes: number | null = null
  if (typeof parsed.estimated_minutes === 'number' && parsed.estimated_minutes > 0 && parsed.estimated_minutes < 240) {
    estimated_minutes = Math.round(parsed.estimated_minutes)
  }

  if (!title || !rationale) {
    return { ok: false, status: 502, error: 'AI returned an unexpected structure.' }
  }

  const { data: inserted, error: insertError } = await client
    .from('daily_actions')
    .insert({
      user_id: userId,
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
    // Race fallback: another invocation (or the user-JWT path racing the
    // cron path) won the insert. Read whatever row landed.
    if ((insertError as { code?: string }).code === '23505') {
      const { data: existing } = await client
        .from('daily_actions')
        .select('*')
        .eq('user_id', userId)
        .eq('for_date', for_date)
        .single()
      if (existing) return { ok: true, daily_action: existing }
    }
    console.error('[daily-action-core] insert failed:', insertError)
    return { ok: false, status: 500, error: 'Failed to save daily action.' }
  }

  return { ok: true, daily_action: inserted }
}

// ============================================================
// Candidate building (deterministic rules — no LLM)
// ============================================================

interface BuildCandidatesArgs {
  tasks: Array<{ id: string; title: string; description: string | null; category: string | null; priority: string | null; due_date: string | null; role_title: string | null }>
  applications: Array<{ id: string; company: string | null; role_title: string | null; status: string; applied_date: string | null; updated_at: string }>
  careerRoles: Array<{ id: string; title: string; track: string; skills_gap: string[] | null }>
  storyCount: number
  todayIso: string
}

function buildCandidates(args: BuildCandidatesArgs): Candidate[] {
  const { tasks, applications, careerRoles, storyCount, todayIso } = args
  const candidates: Candidate[] = []
  const today = new Date(todayIso)

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

  for (const a of applications) {
    if (a.status === 'interview') {
      candidates.push({
        action_type: 'interview_prep',
        source_table: 'applications',
        source_id: a.id,
        context: `Interview at ${a.company || 'unnamed company'} for ${a.role_title || 'a role'}. Prepare common questions and tailor stories to the role.`,
        leverage: LEVERAGE.interview_prep,
        urgency: 3.0,
        low_friction: 1.2,
      })
    } else if (a.status === 'applied') {
      const appliedAt = a.applied_date ? new Date(a.applied_date) : new Date(a.updated_at)
      const daysSince = daysBetween(appliedAt, today)
      if (daysSince >= 5 && daysSince <= 14) {
        candidates.push({
          action_type: 'follow_up',
          source_table: 'applications',
          source_id: a.id,
          context: `Applied to ${a.company || 'unnamed company'} for ${a.role_title || 'a role'} ${daysSince} days ago, no response yet. A brief follow-up keeps your name visible without being pushy.`,
          leverage: LEVERAGE.follow_up,
          urgency: daysSince >= 7 ? 2.0 : 1.5,
          low_friction: 1.5,
        })
      }
    }
  }

  for (const r of careerRoles) {
    const gaps = Array.isArray(r.skills_gap) ? r.skills_gap.slice(0, 3) : []
    if (gaps.length > 0) {
      candidates.push({
        action_type: 'skill_practice',
        source_table: 'career_roles',
        source_id: r.id,
        context: `Track-1 role: ${r.title}. Top skill gaps: ${gaps.join(', ')}. Even 20 minutes today closes the gap meaningfully.`,
        leverage: LEVERAGE.skill_practice,
        urgency: 0.8,
        low_friction: 1.0,
      })
    }
  }

  if (storyCount < 10) {
    candidates.push({
      action_type: 'capture_story',
      source_table: 'stories',
      source_id: null,
      context: `You have ${storyCount} story(ies) captured. A bigger Story Bank means better tailored CVs and stronger LinkedIn posts. Capture one specific moment from a recent role or project today.`,
      leverage: LEVERAGE.capture_story,
      urgency: storyCount < 3 ? 1.3 : 0.9,
      low_friction: 1.4,
    })
  }

  candidates.push({
    action_type: 'reflect',
    source_table: null,
    source_id: null,
    context: 'What did this past week teach you? Spend 5 minutes jotting down one specific moment — a customer call, a tough decision, a small win. The reflection becomes a story you can use later.',
    leverage: LEVERAGE.reflect,
    urgency: 0.7,
    low_friction: 1.6,
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
  if (days < 0) return 2.5
  if (days === 0) return 2.0
  if (days <= 2) return 1.5
  if (days <= 7) return 1.2
  return 0.8
}

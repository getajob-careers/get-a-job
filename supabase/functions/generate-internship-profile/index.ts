import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'
import { pickPrimaryEducation } from '../_shared/education-helpers.ts'

// generate-internship-profile — Wk 4 Internship Finder profile generator.
//
// Emits the 9-field internship_profiles row that the matcher reads. The
// row IS the pitch strategy: realistic targets + pitchable role
// archetypes grounded in TODAY's strengths + career-compound rationale.
//
// One LLM call (gpt-4o, strategic reasoning), strict JSON. UPSERT
// always overwrites — this is a derived view, not user-edited content.
//
// Anti-fab on pitch_strength_signals: each signal must substring-match
// at least one of stories.text / stories.tools_used /
// stories.metrics / stories.skills_demonstrated / experience.title /
// experience.company / profile.skills. Dropped signals logged to
// Langfuse metadata so we can audit calibration over time.
//
// Trigger: explicit user click from /Practicum (empty-state CTA or
// Refresh button on InternshipProfileStrip). Rate-limited 4/hr.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MODEL = 'gpt-4o'
const RATE_LIMIT_CALLS = 4
const RATE_LIMIT_WINDOW = 3600

// Stage guidance for the prompt — NOT a track-to-stage hardcode. Per
// Eli's design call: stage is one signal, not the filter. The prompt
// reasons about team size + culture + intern/junior infrastructure
// alongside stage. A 200-person Series B with formal internship
// programs is more realistic for a Track 3 student than a 5-person Seed.
const STAGE_VOCAB = [
  'Seed', 'Pre-Series A', 'Series A', 'Series B', 'Series C', 'Growth', 'Public',
]

// Israeli-market sector vocab. LLM picks 3–6 based on user's skills /
// experiences. Free-form is allowed but this anchors the vocabulary
// so the matcher's downstream sector-match doesn't fragment.
const SECTOR_VOCAB = [
  'FinTech', 'InsurTech', 'B2B SaaS', 'AI/ML', 'DevTools', 'Cyber',
  'MedTech', 'HealthTech', 'EdTech', 'eCommerce', 'Marketplaces',
  'Gaming', 'AdTech', 'MarTech', 'PropTech', 'Mobility', 'AgriTech',
  'Consumer', 'Enterprise', 'Infrastructure',
]

interface CareerRole {
  id: string
  title: string
  track: string | null
  readiness_score: number | null
  goal_alignment_score: number | null
  matched_skills: string[] | null
  missing_skills: string[] | null
  alignment_reason: string | null
  reasoning: string | null
  updated_at: string
}

interface Experience {
  id: string
  title: string
  company: string
  description: string | null
  start_date: string | null
  end_date: string | null
}

interface Story {
  id: string
  title: string | null
  situation: string | null
  task: string | null
  action: string | null
  result: string | null
  metrics: string[] | null
  skills_demonstrated: string[] | null
  tools_used: string[] | null
  relevance_tags: string[] | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('generate-internship-profile')
  let _ok = false
  let _http = 500
  let _err: string | null = null
  let _droppedSignals: string[] = []

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
      p_function_name: 'generate-internship-profile',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (allowed === false) {
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Pull user signal in parallel ──────────────────────────────────
    const [profileRes, careerRolesRes, experiencesRes, storiesRes] = await Promise.all([
      supabase.from('profiles').select('*, education(*)').eq('id', user.id).maybeSingle(),
      supabase.from('career_roles').select('*').eq('user_id', user.id),
      supabase.from('experiences').select('id, title, company, description, start_date, end_date').eq('user_id', user.id),
      supabase.from('stories')
        .select('id, title, situation, task, action, result, metrics, skills_demonstrated, tools_used, relevance_tags')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    const profile = profileRes.data as Record<string, any> | null
    const careerRoles = (careerRolesRes.data || []) as CareerRole[]
    const experiences = (experiencesRes.data || []) as Experience[]
    const stories = (storiesRes.data || []) as Story[]

    // Precondition: must have something to build a profile from.
    const hasSummary = typeof profile?.summary === 'string' && profile.summary.trim().length > 0
    if (careerRoles.length === 0 && experiences.length === 0 && !hasSummary) {
      _http = 400; _err = 'no_signal'
      return new Response(JSON.stringify({
        error: 'Complete your profile first — add at least an experience, a career role, or a profile summary so we have something to build a pitch strategy from.',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Build context block ──────────────────────────────────────────
    const tierOneRoles = careerRoles.filter((r) => r.track === 'track_1')
    const tierTwoRoles = careerRoles.filter((r) => r.track === 'track_2')
    const tierThreeRoles = careerRoles.filter((r) => r.track === 'track_3')

    // Anti-fab corpus — every pitch_strength_signal the LLM emits must
    // substring-match (case-insensitive) somewhere in this haystack.
    // Built from: every story field, every experience title/company,
    // profile.skills, career_roles matched_skills.
    const groundingCorpus: string[] = []
    if (Array.isArray(profile?.skills)) groundingCorpus.push(...profile.skills)
    for (const e of experiences) {
      if (e.title) groundingCorpus.push(e.title)
      if (e.company) groundingCorpus.push(e.company)
      if (e.description) groundingCorpus.push(e.description)
    }
    for (const s of stories) {
      if (s.title) groundingCorpus.push(s.title)
      if (s.situation) groundingCorpus.push(s.situation)
      if (s.task) groundingCorpus.push(s.task)
      if (s.action) groundingCorpus.push(s.action)
      if (s.result) groundingCorpus.push(s.result)
      if (Array.isArray(s.metrics)) groundingCorpus.push(...s.metrics)
      if (Array.isArray(s.skills_demonstrated)) groundingCorpus.push(...s.skills_demonstrated)
      if (Array.isArray(s.tools_used)) groundingCorpus.push(...s.tools_used)
    }
    for (const r of careerRoles) {
      if (Array.isArray(r.matched_skills)) groundingCorpus.push(...r.matched_skills)
    }
    const haystack = groundingCorpus.filter(Boolean).join(' | ').toLowerCase()

    // Latest career_roles.updated_at for staleness checks.
    const generatedFromCareerRolesAt = careerRoles.reduce<string | null>((max, r) => {
      if (!r.updated_at) return max
      if (!max || r.updated_at > max) return r.updated_at
      return max
    }, null)

    const userContext = buildUserContext({
      profile,
      tierOneRoles,
      tierTwoRoles,
      tierThreeRoles,
      experiences,
      stories,
    })

    // ── LLM call ──────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt()
    const userPrompt = `Build this user's internship pitch strategy.

USER CONTEXT:
${userContext}

Return ONLY valid JSON in the exact shape specified.`

    const sessionId = `internship-profile-${user.id}-${Date.now()}`
    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'generate-internship-profile',
        userId: user.id,
        sessionId,
        metadata: {
          tier_1_role_count: tierOneRoles.length,
          tier_2_role_count: tierTwoRoles.length,
          experience_count: experiences.length,
          story_count: stories.length,
          has_summary: hasSummary,
        },
      },
      { signal: AbortSignal.timeout(45000) },
    )

    if (!openaiResponse.ok) {
      console.error(`[generate-internship-profile] OpenAI ${openaiResponse.status}`)
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
      console.error('[generate-internship-profile] JSON parse failed:', content.slice(0, 200), parseErr)
      _http = 502; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned malformed response. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Normalise + anti-fab ──────────────────────────────────────────
    const { row, droppedSignals } = normalizeProfile(parsed, haystack)
    _droppedSignals = droppedSignals

    // Validate non-trivial signal — if every field came back empty after
    // anti-fab, treat as a regen-worthy failure rather than persisting
    // a useless row.
    const hasSubstance =
      row.realistic_company_stages.length > 0 ||
      row.realistic_sectors.length > 0 ||
      row.pitchable_role_archetypes.length > 0 ||
      (row.career_compound_rationale && row.career_compound_rationale.length > 0)
    if (!hasSubstance) {
      _http = 502; _err = 'empty_after_normalize'
      return new Response(JSON.stringify({ error: 'Pitch strategy came back too sparse. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── UPSERT — always overwrite ─────────────────────────────────────
    const upsertRow = {
      user_id: user.id,
      realistic_company_stages: row.realistic_company_stages,
      realistic_team_size_range: row.realistic_team_size_range,
      realistic_sectors: row.realistic_sectors,
      realistic_signal_filters: row.realistic_signal_filters,
      pitchable_role_archetypes: row.pitchable_role_archetypes,
      pitch_strength_signals: row.pitch_strength_signals,
      pitch_anti_patterns: row.pitch_anti_patterns,
      skill_gaps_to_close: row.skill_gaps_to_close,
      career_compound_rationale: row.career_compound_rationale,
      track_1_role_alignment: row.track_1_role_alignment,
      rationale: row.rationale,
      generated_from_career_roles_at: generatedFromCareerRolesAt,
    }

    const { data: upserted, error: upsertError } = await supabase
      .from('internship_profiles')
      .upsert(upsertRow, { onConflict: 'user_id' })
      .select()
      .single()

    if (upsertError) {
      console.error('[generate-internship-profile] upsert failed:', upsertError)
      _http = 500; _err = 'upsert_failed'
      return new Response(JSON.stringify({ error: 'Failed to save pitch strategy.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify({
      internship_profile: upserted,
      dropped_signal_count: _droppedSignals.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[generate-internship-profile] unhandled:', error?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    // Surface dropped signals into the metric error_code stream for
    // Langfuse-cross-correlation when calibrating the anti-fab rubric.
    if (_droppedSignals.length > 0 && _ok) {
      console.warn(`[generate-internship-profile] dropped ${_droppedSignals.length} ungrounded signals:`, _droppedSignals.slice(0, 5))
    }
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})

// ============================================================
// Prompt construction
// ============================================================

function buildSystemPrompt(): string {
  return `You are an internship strategy advisor for "Get A Job," a career operating system for Israeli business students (Reichman University) entering tech roles. Your job is to turn a student's profile, career roles, experiences, and stories into a PITCH STRATEGY they can use to find an internship that compounds their career.

You MUST emit JSON with this exact shape — 9 substantive fields plus rationale + track_1_role_alignment:

{
  "realistic_company_stages": ["Series A", "Series B", ...],
  "realistic_team_size_range": "20–200",
  "realistic_sectors": ["B2B SaaS", "FinTech", ...],
  "realistic_signal_filters": ["formal internship program", "junior PM role posted in last 90 days", ...],
  "pitchable_role_archetypes": ["User research support for product teams", ...],
  "pitch_strength_signals": ["competitive analysis for Strauss marketing course", "94% gross retention at Atera renewal playbook", ...],
  "pitch_anti_patterns": ["framing as Senior PM", "claiming 5+ years of SaaS experience", ...],
  "skill_gaps_to_close": ["SQL", "consumer research methodology", ...],
  "career_compound_rationale": "1–2 sentences explaining why an internship of THIS shape now serves their Track-1 long-term path.",
  "track_1_role_alignment": "1 sentence explicitly linking this internship strategy to one of their Track-1 career roles.",
  "rationale": "1–2 sentences summarising the overall strategy for the student."
}

REALISTIC TARGETS — what would actually hire this student NOW.

Stage is ONE signal, not the filter. Consider these together:
  • Team size — a 200-person Series B with intern/junior infrastructure is often more realistic for a junior than a 5-person Seed where everyone wears 4 hats.
  • Intern / junior infrastructure — does the company have a formal internship program? Junior roles posted? An onboarding process?
  • Culture — does the company hire generalists who learn on the job (good for a student) or only specialists with proven track records (bad)?
  • Hiring posture — companies that publish junior roles, run university partnerships, or attend hackathons signal openness to early-career talent.

realistic_company_stages: pick 2–4 stages from this vocabulary that fit the student's track + readiness: ${STAGE_VOCAB.join(' / ')}. Stage selection should reflect WHERE companies of this size + culture cluster, not a hardcoded track-to-stage map.

realistic_team_size_range: a single string like "20–200" capturing the band of company sizes the student should target. Drives the matcher's sizing filter.

realistic_sectors: 3–6 sectors from this Israeli-market vocab: ${SECTOR_VOCAB.join(' / ')}. Pick based on the student's domain experience + stated interests. Sectors should be where the student's existing signals already have traction.

realistic_signal_filters: 3–6 short search-style filters that describe a TYPE of company posting (e.g. "formal internship program", "career page lists junior roles", "Israeli HQ with offices in Tel Aviv or Herzliya"). The matcher does substring scans on company descriptions against these — keep them concrete and scannable.

PITCHABLE — what to offer given TODAY's strengths.

pitchable_role_archetypes: 3–5 short role descriptions the student could realistically pitch. Examples: "User research support for the product team", "Sales ops analyst supporting the BDR team", "Junior PM rotating across customer-facing teams". NOT "Senior PM", NOT "Head of Growth". Match the student's current level.

pitch_strength_signals: 4–8 SPECIFIC signals the student can point to in an outreach message. Each signal MUST reference real artefacts from their stories / experiences / skills — named projects, named tools, named outcomes, named companies. NEVER fabricate metrics. NEVER write generic skills ("strong analytical thinking") — that's fluff, not a signal.

Good: "94% gross retention on Atera renewal playbook", "Highest-grade competitive analysis in Strauss MBA cohort", "Built SQL dashboards in Metabase for 3 customer cohorts".
Bad: "Strong analytical skills", "Team player", "Quick learner", "Passionate about product".

pitch_anti_patterns: 2–4 specific framings the student should AVOID. Examples: "Claiming senior-level PM experience when they're a student", "Pitching for roles requiring 3+ years of SaaS", "Asking for roles that need US work authorisation". Anchor in the student's actual constraints.

CAREER COMPOUND — why this internship serves the long game.

skill_gaps_to_close: 3–5 specific gaps from their career_roles missing_skills that this kind of internship could close. Concrete skills, not abstractions — "SQL" not "data fluency"; "Customer interview methodology" not "user empathy".

career_compound_rationale: 1–2 sentences explaining why doing an internship of THIS shape NOW (not later, not different) compounds toward their Track-1 path. Tie to specific Track-1 role + specific gaps.

track_1_role_alignment: 1 sentence explicitly naming the Track-1 role from their career_roles and stating the connection. Example: "An InsurTech B2B SaaS PM internship builds the data + customer-research skills needed for the Senior PM (FinTech) Track-1 target."

rationale: 1–2 sentences. The overall north star — what kind of internship are we looking for, and what's the win condition?

DISCIPLINE:
- Be SPECIFIC. Generic strategy is useless — every field should be sharp enough that a stranger reading the row could identify which kind of company to target.
- Do NOT pad arrays. If you only have 2 real pitchable archetypes, return 2. Empty filler is worse than honest sparseness.
- Do NOT invent. If the student has no SaaS experience, do not write "SaaS sales support" as a pitchable archetype. Ground every pitch in real artefacts.
- Match the student's track honestly. A Track 3 student should not get Series D unicorn-targeted strategy, but the realistic targets aren't only "tiny startup" either — consider team size + culture + junior infrastructure as the real filter.

Return ONLY valid JSON.`
}

function buildUserContext(args: {
  profile: Record<string, any> | null
  tierOneRoles: CareerRole[]
  tierTwoRoles: CareerRole[]
  tierThreeRoles: CareerRole[]
  experiences: Experience[]
  stories: Story[]
}): string {
  const { profile, tierOneRoles, tierTwoRoles, tierThreeRoles, experiences, stories } = args
  const lines: string[] = []

  if (profile) {
    lines.push('PROFILE:')
    if (profile.full_name) lines.push(`- Name: ${profile.full_name}`)
    // Phase B: education is now a nested array. Surface the primary row
    // for the LLM prompt context.
    const primaryEdu = pickPrimaryEducation((profile as any).education || [])
    if (primaryEdu?.degree_type || primaryEdu?.field_of_study || primaryEdu?.education_level) {
      lines.push(`- Education: ${[primaryEdu.degree_type, primaryEdu.field_of_study, primaryEdu.education_level].filter(Boolean).join(' · ')}`)
    }
    if (primaryEdu?.institution) lines.push(`- Institution: ${primaryEdu.institution}`)
    if (profile.location) lines.push(`- Location: ${profile.location}`)
    if (profile.five_year_role) lines.push(`- 5-year goal: ${profile.five_year_role}`)
    if (profile.primary_domain) lines.push(`- Primary domain interest: ${profile.primary_domain}`)
    if (profile.qualification_level) lines.push(`- Qualification level: ${profile.qualification_level}`)
    if (Array.isArray(profile.employment_status) && profile.employment_status.length > 0) {
      lines.push(`- Life status: ${profile.employment_status.join(', ')}`)
    }
    if (Array.isArray(profile.skills) && profile.skills.length > 0) {
      lines.push(`- Skills: ${profile.skills.slice(0, 30).join(', ')}`)
    }
    if (profile.summary) lines.push(`- Summary: ${String(profile.summary).slice(0, 600)}`)
  }

  if (tierOneRoles.length > 0) {
    lines.push('\nTIER 1 CAREER ROLES (the long-term targets — the pitch strategy must compound toward at least one of these):')
    for (const r of tierOneRoles) {
      lines.push(`- ${r.title}`)
      if (r.readiness_score != null) lines.push(`  Readiness: ${Math.round(Number(r.readiness_score) * 100)}%`)
      if (Array.isArray(r.matched_skills) && r.matched_skills.length > 0) {
        lines.push(`  Matched skills: ${r.matched_skills.slice(0, 8).join(', ')}`)
      }
      if (Array.isArray(r.missing_skills) && r.missing_skills.length > 0) {
        lines.push(`  Missing skills: ${r.missing_skills.slice(0, 8).join(', ')}`)
      }
      if (r.alignment_reason) lines.push(`  Why this role: ${r.alignment_reason}`)
    }
  }

  if (tierTwoRoles.length > 0) {
    lines.push('\nTIER 2 CAREER ROLES (Plan B — interesting but secondary):')
    for (const r of tierTwoRoles.slice(0, 3)) {
      lines.push(`- ${r.title}${r.readiness_score != null ? ` (${Math.round(Number(r.readiness_score) * 100)}% ready)` : ''}`)
    }
  }

  if (tierThreeRoles.length > 0) {
    lines.push('\nTIER 3 CAREER ROLES (work toward — bigger gaps):')
    for (const r of tierThreeRoles.slice(0, 3)) {
      lines.push(`- ${r.title}${r.readiness_score != null ? ` (${Math.round(Number(r.readiness_score) * 100)}% ready)` : ''}`)
    }
  }

  if (experiences.length > 0) {
    lines.push('\nEXPERIENCES:')
    for (const e of experiences.slice(0, 8)) {
      lines.push(`- ${e.title} at ${e.company}${e.start_date ? ` (${e.start_date.slice(0, 7)}${e.end_date ? `–${e.end_date.slice(0, 7)}` : '–present'})` : ''}`)
      if (e.description) lines.push(`  ${String(e.description).slice(0, 200)}`)
    }
  }

  if (stories.length > 0) {
    lines.push('\nSTORIES (verbatim signal — pitch_strength_signals MUST come from this material):')
    for (const s of stories.slice(0, 12)) {
      const parts: string[] = []
      if (s.title) parts.push(s.title)
      const summary = [s.situation, s.action, s.result].filter(Boolean).join(' — ').slice(0, 250)
      if (summary) parts.push(summary)
      if (Array.isArray(s.metrics) && s.metrics.length > 0) parts.push(`metrics: ${s.metrics.slice(0, 5).join(', ')}`)
      if (Array.isArray(s.tools_used) && s.tools_used.length > 0) parts.push(`tools: ${s.tools_used.slice(0, 5).join(', ')}`)
      if (Array.isArray(s.skills_demonstrated) && s.skills_demonstrated.length > 0) parts.push(`skills: ${s.skills_demonstrated.slice(0, 5).join(', ')}`)
      lines.push(`- ${parts.join(' | ')}`)
    }
  }

  return lines.join('\n')
}

// ============================================================
// Output normalisation + anti-fab
// ============================================================
//
// Strict shape: every field is clamped to a reasonable length, every
// array is capped + de-duped, every string is trimmed. pitch_strength_signals
// also gets the substring-grounding check against the user's real artefacts.

interface NormalizedProfile {
  realistic_company_stages: string[]
  realistic_team_size_range: string | null
  realistic_sectors: string[]
  realistic_signal_filters: string[]
  pitchable_role_archetypes: string[]
  pitch_strength_signals: string[]
  pitch_anti_patterns: string[]
  skill_gaps_to_close: string[]
  career_compound_rationale: string | null
  track_1_role_alignment: string | null
  rationale: string | null
}

function normalizeProfile(raw: any, haystack: string): { row: NormalizedProfile; droppedSignals: string[] } {
  const droppedSignals: string[] = []

  const cleanStringArray = (v: unknown, maxItems: number, maxLen: number): string[] => {
    if (!Array.isArray(v)) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const item of v) {
      if (typeof item !== 'string') continue
      const trimmed = item.trim().slice(0, maxLen)
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(trimmed)
      if (out.length >= maxItems) break
    }
    return out
  }

  const cleanString = (v: unknown, maxLen: number): string | null => {
    if (typeof v !== 'string') return null
    const trimmed = v.trim()
    if (!trimmed) return null
    return trimmed.slice(0, maxLen)
  }

  // pitch_strength_signals — same array cleaning + anti-fab grounding.
  // A signal must substring-match (case-insensitive) somewhere in the
  // user's actual artefacts (haystack). Drop ungrounded items.
  const rawSignals = cleanStringArray(raw?.pitch_strength_signals, 12, 300)
  const groundedSignals: string[] = []
  for (const sig of rawSignals) {
    // Grounding heuristic: a signal is grounded if any "content word"
    // (≥4 chars, alphanumeric) from the signal appears in the
    // haystack. Skips stopwords by length; case-insensitive. This is
    // generous on purpose — false negatives are worse than false
    // positives (we'd rather keep a real signal even if the LLM
    // rephrased it slightly than drop it).
    const contentWords = sig
      .toLowerCase()
      .replace(/[^a-z0-9\s%]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)

    const hits = contentWords.filter((w) => haystack.includes(w)).length
    // Require at least 1 content-word hit. Tune up if false-positives
    // start showing in Langfuse calibration audits.
    if (hits >= 1) {
      groundedSignals.push(sig)
    } else {
      droppedSignals.push(sig)
    }
    if (groundedSignals.length >= 8) break
  }

  const row: NormalizedProfile = {
    realistic_company_stages: cleanStringArray(raw?.realistic_company_stages, 6, 50),
    realistic_team_size_range: cleanString(raw?.realistic_team_size_range, 50),
    realistic_sectors: cleanStringArray(raw?.realistic_sectors, 8, 50),
    realistic_signal_filters: cleanStringArray(raw?.realistic_signal_filters, 8, 200),
    pitchable_role_archetypes: cleanStringArray(raw?.pitchable_role_archetypes, 6, 200),
    pitch_strength_signals: groundedSignals,
    pitch_anti_patterns: cleanStringArray(raw?.pitch_anti_patterns, 6, 200),
    skill_gaps_to_close: cleanStringArray(raw?.skill_gaps_to_close, 8, 100),
    career_compound_rationale: cleanString(raw?.career_compound_rationale, 500),
    track_1_role_alignment: cleanString(raw?.track_1_role_alignment, 300),
    rationale: cleanString(raw?.rationale, 500),
  }

  return { row, droppedSignals }
}

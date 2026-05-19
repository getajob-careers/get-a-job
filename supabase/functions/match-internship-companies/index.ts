import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'

// match-internship-companies — Wk 4 Strategic Internship Finder matcher.
//
// Scores companies from the global `companies` pool against this user's
// internship_profiles pitch strategy and UPSERTs results into
// company_targets. Self-sourced practicum only — faculty-assigned
// students don't run this; their placements arrive via SQL with
// source='faculty_assigned'.
//
// Two-stage pipeline (mirrors generate-daily-action):
//   1. Deterministic pre-filter — rule-based scoring on every company
//      in the pool. Output: top 30 candidates by rule score.
//   2. ONE batched LLM call (gpt-4o) — score + pitch each of the 30
//      with discrete-band rubric (per LLM-calibration lesson: tight
//      thresholds, sharp rubric, raw scores persisted).
//
// UPSERT respects human edits: always refresh fit/career scores +
// fit_rationale (AI signal), but only refresh pitch fields if the user
// hasn't moved the row past 'exploring' AND notes is null. Once the
// user invests in a row, their pitch direction is theirs.
//
// Trigger: explicit user action from /Practicum. Rate-limited to 1/hr
// — protects against cost runaway and accidental double-clicks.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const MODEL = 'gpt-4o'
// 1 successful run per hour. Manual trigger from /Practicum — user
// doesn't need rapid retries, and each run is ~$0.10. Cap prevents
// accidental cost burn.
const RATE_LIMIT_CALLS = 4
const RATE_LIMIT_WINDOW = 3600

// Pool cap: how many companies we even consider for pre-filtering. The
// curated pool (companies.source IN ('research', 'manual', 'faculty_seeded'))
// currently sits ~391 rows and grows via admin curation + student self-adds.
// 500 is comfortable headroom without blowing up memory or input cost.
const POOL_CAP = 500

// Top-N from rule pre-filter → LLM scoring batch.
const LLM_BATCH_SIZE = 30

// Rule-pre-filter weights. Transparent so we can tune from pilot signal.
const W_STAGE = 30
const W_SECTOR = 25
const W_SIGNAL = 15
const W_GEO = 10
const W_BASE = 5      // every authenticated, non-null company gets a floor

interface InternshipProfile {
  user_id: string
  realistic_company_stages: string[]
  realistic_team_size_range: string | null
  realistic_sectors: string[]
  realistic_signal_filters: string[]
  pitchable_role_archetypes: string[]
  pitch_strength_signals: string[]
  pitch_anti_patterns: string[]
  skill_gaps_to_close: string[]
  career_compound_rationale: string | null
  tier_1_role_alignment: string | null
  rationale: string | null
}

interface Company {
  id: string
  name: string
  domain: string | null
  description: string | null
  industry: string | null
  sector: string | null
  stage: string | null
  hq_country: string | null
  hq_city: string | null
  employee_count_range: string | null
}

interface PreScoredCompany extends Company {
  rule_score: number
}

interface LlmScoredCompany {
  company_id: string
  fit_score: number
  career_compound_score: number
  fit_rationale: string
  pitched_role: string
  pitch_rationale: string
  skill_gaps_this_fills: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('match-internship-companies')
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
      p_function_name: 'match-internship-companies',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (allowed === false) {
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Preconditions: practicum_path + internship_profile must exist ──
    const [profileRes, internshipProfileRes] = await Promise.all([
      supabase.from('profiles')
        .select('practicum_path')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('internship_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const practicumPath = profileRes.data?.practicum_path as string | null | undefined
    if (!practicumPath) {
      _http = 400; _err = 'no_practicum_path'
      return new Response(JSON.stringify({
        error: "Set your practicum path first (Settings → Practicum). The Internship Finder is for self-sourced students.",
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (practicumPath === 'faculty_assigned') {
      _http = 400; _err = 'faculty_path'
      return new Response(JSON.stringify({
        error: "Your placement is faculty-assigned. The Internship Finder runs for self-sourced students only.",
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const internshipProfile = internshipProfileRes.data as InternshipProfile | null
    if (!internshipProfile) {
      _http = 400; _err = 'no_internship_profile'
      return new Response(JSON.stringify({
        error: "Generate your internship profile first — it captures your pitch strategy before we match companies.",
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Pull company pool ──────────────────────────────────────────────
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, domain, description, industry, sector, stage, hq_country, hq_city, employee_count_range')
      .limit(POOL_CAP)

    if (companiesError) {
      console.error('[match-internship-companies] companies fetch failed:', companiesError)
      _http = 500; _err = 'companies_fetch'
      return new Response(JSON.stringify({ error: 'Failed to load company pool.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pool = (companiesData || []) as Company[]
    if (pool.length === 0) {
      _ok = true; _http = 200
      return new Response(JSON.stringify({
        matched: 0,
        message: "The company pool is being seeded — check back soon.",
        top_targets: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Stage 1: rule-based pre-filter ─────────────────────────────────
    const preScored = pool
      .map((c) => ({ ...c, rule_score: ruleScore(c, internshipProfile) }))
      .sort((a, b) => b.rule_score - a.rule_score)
      .slice(0, LLM_BATCH_SIZE)

    // ── Stage 2: batched LLM scoring ───────────────────────────────────
    const llmInput = {
      internship_profile: {
        realistic_company_stages: internshipProfile.realistic_company_stages,
        realistic_team_size_range: internshipProfile.realistic_team_size_range,
        realistic_sectors: internshipProfile.realistic_sectors,
        realistic_signal_filters: internshipProfile.realistic_signal_filters,
        pitchable_role_archetypes: internshipProfile.pitchable_role_archetypes,
        pitch_strength_signals: internshipProfile.pitch_strength_signals,
        pitch_anti_patterns: internshipProfile.pitch_anti_patterns,
        skill_gaps_to_close: internshipProfile.skill_gaps_to_close,
        career_compound_rationale: internshipProfile.career_compound_rationale,
        tier_1_role_alignment: internshipProfile.tier_1_role_alignment,
      },
      candidate_companies: preScored.map((c) => ({
        company_id: c.id,
        name: c.name,
        domain: c.domain,
        sector: c.sector,
        industry: c.industry,
        stage: c.stage,
        hq: c.hq_city || c.hq_country
          ? [c.hq_city, c.hq_country].filter(Boolean).join(', ')
          : null,
        employee_count_range: c.employee_count_range,
        description: c.description ? c.description.slice(0, 400) : null,
      })),
    }

    const systemPrompt = `You are an internship strategy advisor for "Get A Job," a career operating system for Israeli business students (Reichman University) entering tech roles. The student has a PITCH STRATEGY (internship_profile) describing what KINDS of companies are realistic for them, what role archetypes they can pitch given today's strengths, and how this internship serves their long-term career.

You will score CANDIDATE COMPANIES against this strategy. Return TWO scores per company and a specific pitch recommendation.

SCORING RUBRIC — use these discrete bands, do not hedge in the middle.

fit_score (0-100) — how well this company matches the realistic_* targets:
  85-100  Obvious fit. Multiple strong matches on stage / sector / signals. Student walks in with a clear story.
  70-84   Real fit with one or two caveats. Worth pitching; rationale should name the caveat.
  50-69   Stretch fit. Defensible but requires the student to bridge a gap. Rationale must name the strongest hook.
  0-49    Weak fit. Skip unless the candidate_companies list is thin.

career_compound_score (0-100) — how much an internship at THIS specific company serves the student's long-term Tier 1 path (career_compound_rationale + tier_1_role_alignment):
  85-100  Strong compound. The role archetypes pitchable here close named skill_gaps_to_close and align with tier_1_role_alignment.
  70-84   Solid compound. Closes some gaps; partial alignment.
  50-69   Weak compound. Doesn't hurt the path but doesn't accelerate it.
  0-49    Anti-compound. Pulls the student sideways; rationale should name what would be lost.

RULES:
- Do not output any score in the 60-65 hedge band unless you can name the specific signal that makes it borderline. Force yourself to commit.
- A company can have fit_score 85 and career_compound_score 55 (great fit, weak long-term move) — these are independent. Score them independently.
- pitched_role must be GROUNDED in pitch_strength_signals — the student's actual current strengths, not aspirations. "User research support for the CS team" not "Senior PM". Reference specific signals when possible.
- pitch_rationale: 1-2 sentences. WHY this role at THIS company given the student's signals. Concrete, not generic.
- skill_gaps_this_fills: pick 1-3 items from internship_profile.skill_gaps_to_close that this specific company + role would actually close. Empty array if none.
- fit_rationale: 1 sentence naming the primary signal driving the fit_score (the hook OR the caveat).
- Honour pitch_anti_patterns — if a company would push the student into one of those patterns, that's a fit caveat or career_compound hit.

Output ONLY valid JSON in this exact shape:
{
  "scored": [
    {
      "company_id": "<uuid from input>",
      "fit_score": <number 0-100>,
      "career_compound_score": <number 0-100>,
      "fit_rationale": "<string>",
      "pitched_role": "<string>",
      "pitch_rationale": "<string>",
      "skill_gaps_this_fills": ["<string>", ...]
    },
    ...
  ]
}

One object per input company. Same order is fine but not required — we match by company_id.`

    const userPrompt = `Score the candidate companies for this student.

INPUT:
${JSON.stringify(llmInput, null, 2)}

Return ONLY valid JSON.`

    const sessionId = `match-internship-${user.id}-${Date.now()}`
    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'match-internship-companies',
        userId: user.id,
        sessionId,
        metadata: {
          pool_size: pool.length,
          prefilter_size: preScored.length,
          practicum_cohort: null,
        },
      },
      { signal: AbortSignal.timeout(60000) },
    )

    if (!openaiResponse.ok) {
      console.error(`[match-internship-companies] OpenAI ${openaiResponse.status}`)
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
      console.error('[match-internship-companies] JSON parse failed:', content.slice(0, 200), parseErr)
      _http = 502; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned malformed response. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const validCompanyIds = new Set(preScored.map((c) => c.id))
    const rawScored = Array.isArray(parsed?.scored) ? parsed.scored : []
    const scored: LlmScoredCompany[] = []
    for (const r of rawScored) {
      const norm = normalizeScoredCompany(r, validCompanyIds)
      if (norm) scored.push(norm)
    }

    if (scored.length === 0) {
      _http = 502; _err = 'no_valid_scores'
      return new Response(JSON.stringify({ error: 'AI returned no valid company scores. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Pull existing matched rows to decide per-row update semantics ──
    // Only need rows for the (user, scored company_ids) we're about to
    // UPSERT. Service client is fine — RLS would block reads of other
    // sources by accident; this is per-user-scoped read of own rows.
    const scoredIds = scored.map((s) => s.company_id)
    const { data: existingRows } = await supabase
      .from('company_targets')
      .select('id, company_id, source, status, notes')
      .eq('user_id', user.id)
      .in('company_id', scoredIds)

    const existingByCompanyId = new Map<string, { id: string; source: string; status: string; notes: string | null }>()
    for (const row of (existingRows || [])) {
      existingByCompanyId.set(row.company_id as string, row as any)
    }

    // ── UPSERT one row at a time (RLS-safe, allows per-row branching) ──
    // The volume is small (≤30) and per-row branching matters: existing
    // rows with non-matched source must NEVER be clobbered, and matched
    // rows with user investment skip pitch-field updates.
    let inserted = 0
    let refreshed = 0
    let skipped_user_owned = 0
    let failures = 0

    for (const s of scored) {
      const existing = existingByCompanyId.get(s.company_id)

      if (!existing) {
        const { error } = await supabase
          .from('company_targets')
          .insert({
            user_id: user.id,
            company_id: s.company_id,
            source: 'matched',
            fit_score: s.fit_score,
            career_compound_score: s.career_compound_score,
            fit_rationale: s.fit_rationale,
            pitched_role: s.pitched_role,
            pitch_rationale: s.pitch_rationale,
            skill_gaps_this_fills: s.skill_gaps_this_fills,
            status: 'exploring',
          })
        if (error) {
          // Race fallback: another concurrent run inserted. Fall through
          // to update path on next iteration if any; for now record + move on.
          console.warn('[match-internship-companies] insert conflict/error:', error.code, error.message)
          failures++
          continue
        }
        inserted++
        continue
      }

      // Existing row. Never touch faculty_assigned / self_added rows.
      if (existing.source !== 'matched') {
        skipped_user_owned++
        continue
      }

      // Matched row: always refresh AI signal (scores + fit_rationale).
      // Only refresh pitch fields if user hasn't invested.
      const userInvested = existing.status !== 'exploring' || (existing.notes && existing.notes.trim().length > 0)

      const patch: Record<string, unknown> = {
        fit_score: s.fit_score,
        career_compound_score: s.career_compound_score,
        fit_rationale: s.fit_rationale,
      }
      if (!userInvested) {
        patch.pitched_role = s.pitched_role
        patch.pitch_rationale = s.pitch_rationale
        patch.skill_gaps_this_fills = s.skill_gaps_this_fills
      }

      const { error } = await supabase
        .from('company_targets')
        .update(patch)
        .eq('id', existing.id)

      if (error) {
        console.warn('[match-internship-companies] update failed:', error.code, error.message)
        failures++
        continue
      }
      if (userInvested) skipped_user_owned++
      refreshed++
    }

    // ── Build response summary ─────────────────────────────────────────
    // Frontend re-queries company_targets for the canonical kanban view.
    // This summary is for the trigger UI: "Matched 27 companies, here
    // are your top 5".
    const topTargets = scored
      .map((s) => {
        const company = preScored.find((c) => c.id === s.company_id)
        return {
          company_id: s.company_id,
          name: company?.name || null,
          fit_score: s.fit_score,
          career_compound_score: s.career_compound_score,
          pitched_role: s.pitched_role,
        }
      })
      .sort((a, b) => b.fit_score - a.fit_score)
      .slice(0, 5)

    _ok = true; _http = 200
    return new Response(JSON.stringify({
      matched: scored.length,
      inserted,
      refreshed,
      skipped_user_owned,
      failures,
      top_targets: topTargets,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('[match-internship-companies] unhandled:', error?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})

// ============================================================
// Stage 1: rule-based pre-filter scoring
// ============================================================
//
// Cheap, deterministic, transparent. Goal is NOT to be the final score
// — it's to narrow 500 → 30 so the LLM stage stays cheap. Bias toward
// recall over precision: a borderline company should pass through to
// LLM review, not get filtered out by a brittle keyword match.

function ruleScore(company: Company, profile: InternshipProfile): number {
  let score = W_BASE  // floor — every company gets baseline so a profile
                      // with empty arrays still produces SOME ranking signal.

  // Stage match. Exact case-insensitive contains is fine — we control
  // the realistic_company_stages vocabulary in generate-internship-profile.
  if (company.stage && profile.realistic_company_stages.length > 0) {
    const cStage = company.stage.toLowerCase()
    if (profile.realistic_company_stages.some((s) => s.toLowerCase() === cStage)) {
      score += W_STAGE
    }
  }

  // Sector match — check both `sector` and `industry` since not every
  // company row will have both populated.
  if (profile.realistic_sectors.length > 0) {
    const haystacks = [company.sector, company.industry]
      .filter(Boolean)
      .map((s) => (s as string).toLowerCase())
    if (haystacks.length > 0) {
      const hit = profile.realistic_sectors.some((s) =>
        haystacks.some((h) => h.includes(s.toLowerCase()) || s.toLowerCase().includes(h))
      )
      if (hit) score += W_SECTOR
    }
  }

  // Signal filter match. Substring scan over name + description +
  // industry. These are heuristics the LLM produced — keep matching loose.
  if (profile.realistic_signal_filters.length > 0) {
    const haystack = [
      company.name,
      company.description,
      company.industry,
      company.sector,
    ]
      .filter(Boolean)
      .map((s) => (s as string).toLowerCase())
      .join(' | ')
    if (haystack) {
      const hits = profile.realistic_signal_filters.filter((sig) =>
        haystack.includes(sig.toLowerCase())
      ).length
      // Up to W_SIGNAL points total — one hit gets most of it, more
      // hits get incrementally more but capped.
      score += Math.min(W_SIGNAL, hits * (W_SIGNAL / 2))
    }
  }

  // Geography. Default-favour Israel + remote-friendly. Soft signal —
  // it's a tilt, not a filter.
  if (company.hq_country) {
    const country = company.hq_country.toLowerCase()
    if (country === 'israel' || country === 'il') score += W_GEO
    else if (country === 'united states' || country === 'usa' || country === 'us') {
      score += W_GEO / 2  // many Israeli students target US-HQ companies with TLV offices
    }
  }

  return score
}

// ============================================================
// LLM output normalisation
// ============================================================
//
// Defensive parsing — never trust LLM output shape. Reject any company
// not in the input set (anti-fab guard), clamp scores into 0-100, cap
// string lengths, validate array shape.

function normalizeScoredCompany(
  raw: any,
  validIds: Set<string>,
): LlmScoredCompany | null {
  if (!raw || typeof raw !== 'object') return null
  const company_id = typeof raw.company_id === 'string' ? raw.company_id : null
  if (!company_id || !validIds.has(company_id)) return null

  const fit_score = clampScore(raw.fit_score)
  const career_compound_score = clampScore(raw.career_compound_score)
  if (fit_score === null || career_compound_score === null) return null

  const fit_rationale = typeof raw.fit_rationale === 'string'
    ? raw.fit_rationale.trim().slice(0, 500) : ''
  const pitched_role = typeof raw.pitched_role === 'string'
    ? raw.pitched_role.trim().slice(0, 200) : ''
  const pitch_rationale = typeof raw.pitch_rationale === 'string'
    ? raw.pitch_rationale.trim().slice(0, 600) : ''

  if (!fit_rationale || !pitched_role || !pitch_rationale) return null

  const skill_gaps_this_fills = Array.isArray(raw.skill_gaps_this_fills)
    ? raw.skill_gaps_this_fills
        .filter((g: unknown) => typeof g === 'string' && g.trim().length > 0)
        .map((g: string) => g.trim().slice(0, 100))
        .slice(0, 5)
    : []

  return {
    company_id,
    fit_score,
    career_compound_score,
    fit_rationale,
    pitched_role,
    pitch_rationale,
    skill_gaps_this_fills,
  }
}

function clampScore(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  if (v < 0) return 0
  if (v > 100) return 100
  return Math.round(v * 100) / 100
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'
import { ruleScore } from '../_shared/internship-rule-score.ts'
import {
  MATCHER_SYSTEM_PROMPT,
  buildUserPrompt,
  normalizeScoredMatch as sharedNormalizeScoredMatch,
  type ScoredMatch,
} from '../_shared/internship-pitch.ts'
import { buildTargetContext } from '../_shared/internship-target.ts'
import { chunk } from './batch.ts'

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

// Companies per parallel LLM batch. One call across all 30 candidates pushed
// gpt-4o past its wall-clock budget and timed out (the 2026-06-23 500 for
// user 5dce661c). Splitting into smaller parallel calls keeps each well
// inside its own 45s abort window and removes the single-point timeout.
const BATCH_COMPANIES = 10

// PR7: pipeline UPSERT filter. The matcher scores all 30 LLM-prefiltered
// candidates, but only adds High-band matches to the user's pipeline so
// "Pipeline" stays a clean go-pursue list. Medium / Low scored rows live
// on Browse — visible but not in the kanban.
// Threshold mirrors LLM_BAND_THRESHOLDS.high in scoreHelpers.js (70).
const PIPELINE_MATCH_THRESHOLD = 70

// Safety floor: if fewer than this many High matches come back (narrow
// or weak profile), upsert the top N by score anyway so the pipeline is
// never empty after a Find run.
const PIPELINE_FLOOR = 5

// Rule-pre-filter weights live in _shared/internship-rule-score.ts —
// imported by both this edge function and the React browse page so the
// two surfaces can never drift. Touch the weights there.

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
  track_1_role_alignment: string | null
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

// LlmScoredCompany aliases ScoredMatch (PR8). The matcher emits a
// narrow shape now — match_score + match_rationale + pitched_role —
// and the verbose prose (pitch_rationale, skill_gaps_this_fills,
// who_to_contact) moves to generate-internship-pitch, called by the
// Pipeline drawer on demand with this pitched_role as a hint.
type LlmScoredCompany = ScoredMatch

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('match-internship-companies')
  const startedAt = Date.now()
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
    // PR9: also pull profile.five_year_role + primary_domain + the user's
    // career_roles (Track-1, alignment-DESC). buildTargetContext rolls
    // these into the target_context block the matcher prompt anchors
    // pitched_role on. Without it the matcher only sees the upstream-
    // generated internship_profile, which is too narrow a signal for
    // bridge selection.
    const [profileRes, internshipProfileRes, careerRolesRes] = await Promise.all([
      supabase.from('profiles')
        .select('practicum_path, five_year_role, primary_domain')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('internship_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('career_roles')
        .select('title, track, goal_alignment_score')
        .eq('user_id', user.id),
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
    // PR9: target_context block built from profile + career_roles via
    // shared helper. goal_aligned_targets is the steering signal the
    // matcher anchors pitched_role on.
    const targetContext = buildTargetContext(
      profileRes.data ?? null,
      (careerRolesRes.data ?? []) as any[],
    )
    const sharedInput = {
      target_context: targetContext,
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
        track_1_role_alignment: internshipProfile.track_1_role_alignment,
      },
    }
    const mapCandidate = (c: PreScoredCompany) => ({
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
    })

    // PR8: matcher uses the dedicated MATCHER_SYSTEM_PROMPT (score +
    // match_rationale + pitched_role only). Prose was moved to
    // generate-internship-pitch, called on demand by the Pipeline drawer.
    // Batched scoring (2026-06-23 timeout fix): split the prefiltered pool
    // into parallel calls of BATCH_COMPANIES, each with its own short abort
    // window, then merge. max_tokens is per batch, so a tighter 2500 cap is
    // plenty for the narrow score + rationale + role output.
    const companyBatches = chunk(preScored, BATCH_COMPANIES)
    const sessionId = `match-internship-${user.id}-${Date.now()}`

    const batchResponses = await Promise.all(
      companyBatches.map((batch, i) =>
        openaiChatCompletion(
          {
            model: MODEL,
            messages: [
              { role: 'system', content: MATCHER_SYSTEM_PROMPT },
              {
                role: 'user',
                content: buildUserPrompt({
                  ...sharedInput,
                  candidate_companies: batch.map(mapCandidate),
                }),
              },
            ],
            temperature: 0.3,
            max_tokens: 2500,
            response_format: { type: 'json_object' },
          },
          openaiKey,
          {
            traceName: 'match-internship-companies',
            userId: user.id,
            sessionId: `${sessionId}-b${i}`,
            metadata: {
              pool_size: pool.length,
              prefilter_size: preScored.length,
              batch_index: i,
              batch_size: batch.length,
              practicum_cohort: null,
            },
          },
          { signal: AbortSignal.timeout(45000) },
        )
      ),
    )

    m.modelUsed = MODEL
    let tokensIn = 0
    let tokensOut = 0
    const rawScored: any[] = []
    for (const openaiResponse of batchResponses) {
      if (!openaiResponse.ok) {
        console.error(`[match-internship-companies] OpenAI ${openaiResponse.status}`)
        _http = 502; _err = `openai_${openaiResponse.status}`
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable. Please try again.' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const completion = await openaiResponse.json()
      tokensIn += completion.usage?.prompt_tokens ?? 0
      tokensOut += completion.usage?.completion_tokens ?? 0
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
      if (Array.isArray(parsed?.scored)) rawScored.push(...parsed.scored)
    }
    m.tokensIn = tokensIn
    m.tokensOut = tokensOut

    const validCompanyIds = new Set(preScored.map((c) => c.id))
    const scored: LlmScoredCompany[] = []
    for (const r of rawScored) {
      const norm = sharedNormalizeScoredMatch(r, validCompanyIds)
      if (norm) scored.push(norm)
    }

    if (scored.length === 0) {
      _http = 502; _err = 'no_valid_scores'
      return new Response(JSON.stringify({ error: 'AI returned no valid company scores. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Pipeline filter (PR7) ──────────────────────────────────────────
    // Pipeline is meant to be a clean "go pursue these" list, not a
    // dump of every scored company. We UPSERT only High-band matches
    // (match_score >= PIPELINE_MATCH_THRESHOLD). When a profile is
    // narrow or weak and not enough High matches come back, the safety
    // floor pulls in the top PIPELINE_FLOOR by score so a new user
    // never lands on an empty kanban after clicking Find. Medium/Low
    // companies are still visible on Browse.
    //
    // FUTURE RUNS ONLY: this is a write filter, not a sweep. Existing
    // Medium/Low rows in someone's pipeline from prior runs are the
    // user's to manage — they stay. The for-loop below never deletes.
    const sortedByScore = [...scored].sort((a, b) => b.match_score - a.match_score)
    const highBand = sortedByScore.filter((s) => s.match_score >= PIPELINE_MATCH_THRESHOLD)
    const toUpsert: LlmScoredCompany[] =
      highBand.length >= PIPELINE_FLOOR ? highBand : sortedByScore.slice(0, PIPELINE_FLOOR)
    const upsertIds = new Set(toUpsert.map((s) => s.company_id))

    // ── Pull existing matched rows to decide per-row update semantics ──
    // Only need rows for the (user, scored company_ids) we're about to
    // UPSERT. Service client is fine — RLS would block reads of other
    // sources by accident; this is per-user-scoped read of own rows.
    const scoredIds = toUpsert.map((s) => s.company_id)
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
    const scoredButFiltered = scored.length - toUpsert.length

    for (const s of toUpsert) {
      const existing = existingByCompanyId.get(s.company_id)

      if (!existing) {
        // PR8: write only score + 1-line rationale + pitched_role. The
        // prose columns (pitch_rationale / skill_gaps_this_fills /
        // who_to_contact) are now generated on-demand by the Pipeline
        // drawer via generate-internship-pitch using pitched_role as a
        // hint. Columns remain nullable on company_targets — they're
        // deprecated, dropped in a follow-up PR after a week of green.
        const { error } = await supabase
          .from('company_targets')
          .insert({
            user_id: user.id,
            company_id: s.company_id,
            source: 'matched',
            match_score: s.match_score,
            match_rationale: s.match_rationale,
            pitched_role: s.pitched_role,
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

      // Matched row: always refresh AI signal (scores + match_rationale).
      // Only refresh pitched_role if user hasn't invested in the row —
      // once they've moved it past 'exploring' or written notes, their
      // pitch direction is theirs. PR8: pitch prose moved to the on-
      // demand drawer; the matcher no longer touches the deprecated
      // pitch_rationale/skill_gaps/who_to_contact columns.
      const userInvested = existing.status !== 'exploring' || (existing.notes && existing.notes.trim().length > 0)

      const patch: Record<string, unknown> = {
        match_score: s.match_score,
        match_rationale: s.match_rationale,
      }
      if (!userInvested) {
        patch.pitched_role = s.pitched_role
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
    // are your top 5". `matched` = total LLM-scored; `added_to_pipeline`
    // = how many actually UPSERTed after the High-band filter; the
    // rest stay visible on Browse with no pipeline row created.
    const topTargets = sortedByScore
      .map((s) => {
        const company = preScored.find((c) => c.id === s.company_id)
        return {
          company_id: s.company_id,
          name: company?.name || null,
          match_score: s.match_score,
          pitched_role: s.pitched_role,
          in_pipeline: upsertIds.has(s.company_id),
        }
      })
      .slice(0, 5)

    _ok = true; _http = 200
    return new Response(JSON.stringify({
      matched: scored.length,
      added_to_pipeline: toUpsert.length,
      filtered_out: scoredButFiltered,
      inserted,
      refreshed,
      skipped_user_owned,
      failures,
      top_targets: topTargets,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    const name = error?.name || ''
    const durationMs = Date.now() - startedAt
    // A batch that ran past its AbortSignal.timeout rejects with a
    // TimeoutError (AbortError on some runtimes). That is the 2026-06-23
    // failure mode: surface it as a retryable 504, not a generic 500.
    if (name === 'TimeoutError' || name === 'AbortError') {
      console.error(`[match-internship-companies] timeout (${name}) after ${durationMs}ms`)
      _http = 504; _err = 'timeout'
      return new Response(JSON.stringify({
        error: 'matching_timeout',
        message: 'Internship matching took longer than expected. Please retry in a moment.',
        retry_after_seconds: 5,
      }), {
        status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.error(`[match-internship-companies] unhandled (${name || 'Error'}) after ${durationMs}ms:`, error?.message || error)
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
// `ruleScore` is imported from _shared/internship-rule-score.ts — same
// function the browse page calls so the pre-filter and the per-card
// chip never disagree. See that file for weights and rationale.

// ============================================================
// LLM output normalisation — imported from _shared/internship-pitch.ts.
// Same anti-fab guard, score-clamp, and field caps the drawer's
// generate-internship-pitch function uses. See that module for tests.
// ============================================================

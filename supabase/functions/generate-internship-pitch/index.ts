import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletion } from '../_shared/openai-chat.ts'
import { sha256Hex } from '../_shared/content-hash.ts'
import {
  buildSystemPrompt,
  buildUserPrompt,
  normalizeScoredCompany,
  type ScoredPitch,
} from '../_shared/internship-pitch.ts'

// generate-internship-pitch — single-company pitch generator for the
// Internship detail drawer (PR4).
//
// Auth-gated: only the student themself can request their own pitches.
// Cached per (user_id, company_id) in public.internship_pitches with an
// input_hash + 30-day TTL. Reopen the same card after a profile-stable
// week → returns instantly + free. Edit your experiences or
// internship_profile → next click regenerates.
//
// Body: { company_id: string, force?: boolean }
// Response: { cached: boolean, pitch: <see ScoredPitch type> } on 200.
//
// Rate limit: 30/hr per user — enough headroom for a student browsing
// dozens of companies, plus 10x headroom for cache hits which don't
// count toward the budget.

const MODEL = 'gpt-4o-mini'
// 30 misses/hr — at $0.02-0.05 per miss this caps user-day cost at ~$5.
// Cache hits don't count (checked before rate-limit consultation).
const RATE_LIMIT_CALLS = 30
const RATE_LIMIT_WINDOW = 3600
// TTL — 30 days. Aligned with the cache shape decision in PR4: pitches
// are profile-stable; signals change slower than the catalog. Force
// regeneration via { force: true }.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// ─── Hash input shape ────────────────────────────────────────────────
// What changes regenerates the pitch. Adding fields here is a cache
// invalidation event for every user — only add what materially shifts
// what the LLM would output.
interface CacheInputs {
  profile: {
    target_job_titles: string[]
    five_year_role: string
    primary_domain: string
    summary: string
  }
  experiences: Array<{
    title: string
    company: string
    skills_used: string[]
  }>
  internship_profile: {
    pitch_strength_signals: string[]
    pitchable_role_archetypes: string[]
    skill_gaps_to_close: string[]
    career_compound_rationale: string
    track_1_role_alignment: string
    pitch_anti_patterns: string[]
  }
  company: {
    id: string
    name: string
    sector: string
    industry: string
    stage: string
    description: string
  }
  model: string
}

const trunc = (s: unknown, max: number) => String(s ?? '').slice(0, max)
const arr = (a: unknown, n: number, cap: number): string[] =>
  Array.isArray(a)
    ? a.filter((x: unknown) => typeof x === 'string').slice(0, n).map((x: unknown) => trunc(x, cap))
    : []

function buildCacheInputs(
  profile: Record<string, unknown>,
  experiences: Array<Record<string, unknown>>,
  internshipProfile: Record<string, unknown>,
  company: Record<string, unknown>,
): CacheInputs {
  return {
    profile: {
      target_job_titles: arr(profile.target_job_titles, 3, 100),
      five_year_role:    trunc(profile.five_year_role, 100),
      primary_domain:    trunc(profile.primary_domain, 60),
      summary:           trunc(profile.summary, 500),
    },
    experiences: (experiences || []).slice(0, 5).map((e) => ({
      title:       trunc(e.title, 120),
      company:     trunc(e.company, 120),
      skills_used: arr(e.skills_used, 10, 60),
    })),
    internship_profile: {
      pitch_strength_signals:     arr(internshipProfile.pitch_strength_signals, 12, 120),
      pitchable_role_archetypes:  arr(internshipProfile.pitchable_role_archetypes, 12, 120),
      skill_gaps_to_close:        arr(internshipProfile.skill_gaps_to_close, 12, 120),
      career_compound_rationale:  trunc(internshipProfile.career_compound_rationale, 600),
      track_1_role_alignment:     trunc(internshipProfile.track_1_role_alignment, 300),
      pitch_anti_patterns:        arr(internshipProfile.pitch_anti_patterns, 12, 120),
    },
    company: {
      id:          trunc(company.id, 64),
      name:        trunc(company.name, 150),
      sector:      trunc(company.sector, 120),
      industry:    trunc(company.industry, 120),
      stage:       trunc(company.stage, 60),
      description: trunc(company.description, 400),
    },
    model: MODEL,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('generate-internship-pitch')
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
      { global: { headers: { Authorization: authHeader } } },
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let body: { company_id?: string; force?: boolean } = {}
    try {
      body = await req.json()
    } catch {
      // empty body OK
    }
    const companyId = body.company_id
    const force = body.force === true
    if (!companyId || typeof companyId !== 'string') {
      _http = 400; _err = 'no_company_id'
      return new Response(JSON.stringify({ error: 'company_id required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Load company, profile bundle, internship_profile in parallel ──
    const [companyRes, profileRes, experiencesRes, internshipProfileRes] = await Promise.all([
      supabase.from('companies')
        .select('id, name, domain, description, industry, sector, stage, hq_country, hq_city, employee_count_range')
        .eq('id', companyId)
        .maybeSingle(),
      supabase.from('profiles')
        .select('id, target_job_titles, five_year_role, primary_domain, summary')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('experiences')
        .select('title, company, skills_used')
        .eq('user_id', user.id),
      supabase.from('internship_profiles')
        .select('pitch_strength_signals, pitchable_role_archetypes, skill_gaps_to_close, career_compound_rationale, track_1_role_alignment, pitch_anti_patterns, realistic_company_stages, realistic_sectors, realistic_signal_filters, realistic_team_size_range')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (companyRes.error || !companyRes.data) {
      _http = 404; _err = 'company_not_found'
      return new Response(JSON.stringify({ error: 'Company not found.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const company = companyRes.data
    const profile = profileRes.data ?? {}
    const experiences = experiencesRes.data ?? []
    const internshipProfile = internshipProfileRes.data

    if (!internshipProfile) {
      _http = 400; _err = 'no_internship_profile'
      return new Response(JSON.stringify({
        error: "Generate your pitch profile first — the drawer needs it to ground the angle in your strengths.",
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Cache check ────────────────────────────────────────────────────
    // Fail-open: any read error against internship_pitches (RLS hiccup,
    // table missing during migration race) falls through to regen.
    const cacheInputs = buildCacheInputs(
      profile as Record<string, unknown>,
      experiences as Array<Record<string, unknown>>,
      internshipProfile as Record<string, unknown>,
      company as Record<string, unknown>,
    )
    const inputHash = await sha256Hex(cacheInputs)

    if (!force) {
      try {
        const { data: cached } = await serviceClient
          .from('internship_pitches')
          .select('pitch, input_hash, cached_at')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .maybeSingle()
        if (cached && cached.input_hash === inputHash) {
          const cachedAt = new Date(cached.cached_at).getTime()
          if (Date.now() - cachedAt < CACHE_TTL_MS) {
            _ok = true; _http = 200
            return new Response(JSON.stringify({ cached: true, pitch: cached.pitch }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
        }
      } catch (err) {
        console.error('[generate-internship-pitch] cache read failed (fail-open):', err)
      }
    }

    // ── Rate limit (only on cache miss — hits don't count) ───────────
    const { data: allowed } = await serviceClient.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_function_name: 'generate-internship-pitch',
      p_max_calls: RATE_LIMIT_CALLS,
      p_window_seconds: RATE_LIMIT_WINDOW,
    })
    if (allowed === false) {
      _http = 429; _err = 'rate_limit'
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Wait a moment and try again.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── LLM call ─────────────────────────────────────────────────────
    // Shared prompt builder — same strings the matcher uses, plus the
    // PR4 who_to_contact extension. One company per request, wrapped in
    // a "scored" array to match the schema the parser expects.
    const ip = internshipProfile as Record<string, unknown>
    const llmInput = {
      internship_profile: {
        realistic_company_stages:  ip.realistic_company_stages,
        realistic_team_size_range: ip.realistic_team_size_range,
        realistic_sectors:         ip.realistic_sectors,
        realistic_signal_filters:  ip.realistic_signal_filters,
        pitchable_role_archetypes: ip.pitchable_role_archetypes,
        pitch_strength_signals:    ip.pitch_strength_signals,
        pitch_anti_patterns:       ip.pitch_anti_patterns,
        skill_gaps_to_close:       ip.skill_gaps_to_close,
        career_compound_rationale: ip.career_compound_rationale,
        track_1_role_alignment:    ip.track_1_role_alignment,
      },
      candidate_companies: [{
        company_id:           company.id,
        name:                 company.name,
        domain:               company.domain,
        sector:               company.sector,
        industry:             company.industry,
        stage:                company.stage,
        hq: company.hq_city || company.hq_country
          ? [company.hq_city, company.hq_country].filter(Boolean).join(', ')
          : null,
        employee_count_range: company.employee_count_range,
        description:          company.description ? company.description.slice(0, 400) : null,
      }],
    }

    const systemPrompt = buildSystemPrompt({ includeWhoToContact: true })
    const userPrompt = buildUserPrompt(llmInput)

    const sessionId = `internship-pitch-${user.id}-${Date.now()}`
    const openaiResponse = await openaiChatCompletion(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'generate-internship-pitch',
        userId: user.id,
        sessionId,
        metadata: { company_id: companyId },
      },
      { signal: AbortSignal.timeout(30000) },
    )

    if (!openaiResponse.ok) {
      console.error(`[generate-internship-pitch] OpenAI ${openaiResponse.status}`)
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
    let parsed: { scored?: unknown[] }
    try {
      parsed = JSON.parse(content)
    } catch (parseErr) {
      console.error('[generate-internship-pitch] JSON parse failed:', String(content).slice(0, 200), parseErr)
      _http = 502; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned malformed response. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const raw = Array.isArray(parsed.scored) ? parsed.scored[0] : null
    const pitch: ScoredPitch | null = normalizeScoredCompany(raw, new Set([companyId]))
    if (!pitch) {
      _http = 502; _err = 'no_valid_pitch'
      return new Response(JSON.stringify({ error: 'AI returned no valid pitch. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Cache write ──────────────────────────────────────────────────
    // Single UPSERT — pitch + hash + cached_at together so there's no
    // window where one is stale.
    const { error: cacheWriteErr } = await serviceClient
      .from('internship_pitches')
      .upsert({
        user_id:    user.id,
        company_id: companyId,
        pitch,
        input_hash: inputHash,
        cached_at:  new Date().toISOString(),
      })
    if (cacheWriteErr) {
      console.error('[generate-internship-pitch] cache write failed:', cacheWriteErr)
      // Still return the pitch — write failure shouldn't 5xx the user.
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify({ cached: false, pitch }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[generate-internship-pitch] unhandled:', err)
    _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'Server error. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, http: _http, err: _err })
  }
})

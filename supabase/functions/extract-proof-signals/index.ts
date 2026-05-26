import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletionWithRetry } from '../_shared/openai-chat.ts'
import { proofSignalExtractionLogic } from '../_shared/libraries/08_proof_signal_extraction_logic.ts'
import { proofSignalLibrary } from '../_shared/libraries/02_proof_signal_library.ts'
import { skillLibrary } from '../_shared/libraries/01_skill_library.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// gpt-4o (not -mini): proof-signal extraction is the first thing every
// new user sees after resume upload, and -mini was 25s p50 — bad first
// impression. -4o brings it to ~10s for ~$3/mo extra (100 students,
// onboarding once each). Cost is negligible because volume is one-shot
// per user.
const MODEL = 'gpt-4o'

// Build reference strings once at startup
const el = proofSignalExtractionLogic as any

const signalRef = (proofSignalLibrary.proof_signal_library as any[])
  .map(s => `${s.id}: ${s.description}${s.maps_to_skills?.length ? ` [skills: ${s.maps_to_skills.slice(0, 4).join(', ')}]` : ''}`)
  .join('\n')

const skillRef = (skillLibrary.skill_library as any[])
  .map(s => `${s.id}: ${s.name}`)
  .join('\n')

const strengthRules = [
  `strong (1.0): ${el.strength_rules.strong.join(', ')}`,
  `medium (0.6): ${el.strength_rules.medium.join(', ')}`,
  `weak (0.3): ${el.strength_rules.weak.join(', ')}`,
  `very_weak (0.1): ${el.strength_rules.very_weak.join(', ')}`,
].join('\n')

const domainRules = Object.entries(el.domain_detection.primary_domain_rules as Record<string, string[]>)
  .map(([domain, keywords]) => `${domain}: ${keywords.join(', ')}`)
  .join('\n')

const SYSTEM_PROMPT = `You are a CV analyst extracting structured proof signals — concrete evidence of real capabilities, based on what someone actually did.

STRENGTH CLASSIFICATION (action verb determines base strength):
${strengthRules}

OWNERSHIP DEPTH:
high: ${el.ownership_depth_rules.high.join(', ')}
medium: ${el.ownership_depth_rules.medium.join(', ')}
low: ${el.ownership_depth_rules.low.join(', ')}

CONFIDENCE MODIFIERS (add to base confidence from source weighting):
+0.2 quantified metric detected (%, $, numbers + users/customers/revenue)
+0.1 unquantified positive impact (improved, increased, enhanced)
+0.2 large scale (100k+ users, $1m+, company-wide, multi-team, 60+ people)
+0.1 medium scale (team of 6-20, hundreds of users, department-wide)
+0.15 growth velocity (promoted, fast-tracked, accelerated, within X months)
+0.15 elite/high-pressure environment (combat, intelligence unit, mission-critical)
+0.1 3+ tools used in same role
+0.2 5+ tools used in same role

SOURCE BASE CONFIDENCE: experience=1.0, cv_bullet=0.9, project=0.8, certification=0.4, declared_skill=0.3

DOMAIN DETECTION (2+ keyword matches = primary domain):
${domainRules}

PROOF SIGNAL REFERENCE — map each detected signal to the closest ID below:
${signalRef}

SKILL REFERENCE — use only these IDs in mapped_skills:
${skillRef}

EXTRACTION RULES:
1. Extract 5-20 proof signals, prioritising strong signals from experience sections
2. Prefer experience/cv_bullet sources over declared skills (higher confidence)
3. Map each to the closest proof signal ID from the reference list above
4. Use only skill IDs from the skill reference for mapped_skills (4 max per signal)
5. Include exact CV phrases in supporting_evidence
6. Deduplicate: same signal detected multiple times → single entry with boosted confidence
7. Do not invent signal IDs — only use IDs from the provided list

Return ONLY valid JSON:
{
  "proof_signals": [
    {
      "proof_signal": "id from reference list",
      "source": "experience|cv_bullet|project|certification|declared_skill",
      "strength": "strong|medium|weak|very_weak",
      "confidence_score": 0.0-1.0,
      "mapped_skills": ["skill_id_from_reference"],
      "supporting_evidence": ["exact phrase from CV"],
      "primary_domain": "domain name from detection list",
      "adjacent_fields": ["other relevant domain names"],
      "level_modifiers": {
        "scale": "none|small|medium|large",
        "growth_velocity": "none|present",
        "environment": "standard|high_pressure|elite"
      }
    }
  ],
  "primary_domain": "main detected domain of this CV",
  "adjacent_fields": ["other plausible domains this person could work in"]
}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('extract-proof-signals')
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

    const body = await req.json()
    const cvText = String(body.cv_text || '').slice(0, 15000)
    if (!cvText.trim()) {
      _http = 400; _err = 'missing_input'
      return new Response(JSON.stringify({ error: 'No CV text provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiResponse = await openaiChatCompletionWithRetry(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Extract proof signals from this CV:\n\n${cvText}` },
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      },
      openaiKey,
      {
        traceName: 'extract-proof-signals',
        userId: user.id,
        metadata: { cv_text_length: cvText.length },
      },
      { signal: AbortSignal.timeout(45000) },
    )

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text()
      // D2 — keep upstream detail server-side only; client gets generic message.
      console.error(`[extract-proof-signals] OpenAI ${openaiResponse.status}: ${errText}`)
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

    let result: any
    try {
      result = JSON.parse(completion.choices?.[0]?.message?.content || '{}')
    } catch {
      _http = 500; _err = 'json_parse'
      return new Response(JSON.stringify({ error: 'AI returned invalid format' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!Array.isArray(result.proof_signals)) {
      _http = 500; _err = 'bad_shape'
      return new Response(JSON.stringify({ error: 'Unexpected response structure' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const VALID_STRENGTHS = new Set(['strong', 'medium', 'weak', 'very_weak'])
    const VALID_SOURCES = new Set(['experience', 'cv_bullet', 'project', 'certification', 'declared_skill'])
    result.proof_signals = (result.proof_signals as any[]).filter(s =>
      typeof s.proof_signal === 'string' && s.proof_signal.trim() &&
      VALID_STRENGTHS.has(s.strength) &&
      VALID_SOURCES.has(s.source)
    )

    _ok = true; _http = 200
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'Unexpected error: ' + (error?.message || 'unknown') }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})

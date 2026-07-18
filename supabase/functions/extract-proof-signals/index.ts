import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletionWithRetry } from '../_shared/openai-chat.ts'
// SYSTEM_PROMPT and USER_MESSAGE_PREFIX are sourced from the shared
// module so the bake-off harness (scripts/test-proof-signals-bakeoff.ts)
// imports the exact production prompt without replicating the build.
import { SYSTEM_PROMPT, USER_MESSAGE_PREFIX } from '../_shared/proof-signals-prompt.ts'
// Model identity + reasoning-model params now live in model-routing.ts.
// The PR #282 bake-off picked gpt-5.4-mini at reasoning_effort='none'
// + max_completion_tokens=16000; that decision is encoded in the
// 'proof-signals' route entry. This module reads the entry once at
// module load and branches the request body shape accordingly.
import { routeFor } from '../_shared/model-routing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Production model + request shape come from the routing layer. The
// shared openai-chat helper is a pure pass-through (does NOT translate
// max_tokens → max_completion_tokens for reasoning models), so the
// branching has to happen at the caller — same pattern as ai-chat's
// callOpenAI for resume-extractor (ai-chat/index.ts:893-916). Reading
// the route once at module load is safe because the route is a static
// object literal in model-routing.ts.
const ROUTE = routeFor('proof-signals')
const MODEL = ROUTE.model
// Non-reasoning cap fallback. Today's route IS reasoning (gpt-5.4-mini
// + effort=none), so this only fires if a future route swap drops
// reasoning_effort. Pre-Phase-2 production was 4000 → keep that as the
// floor so any downgrade lands on a known-good cap.
const NONREASONING_MAX_TOKENS = 4000

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

    // Body shape branches on the route's reasoning_effort presence —
    // mirrors ai-chat/index.ts callOpenAI for resume-extractor. The
    // shared helper does NOT translate params; the caller is on the
    // hook for sending max_completion_tokens (reasoning) vs max_tokens
    // (non-reasoning). Sending both, or sending max_tokens to a
    // reasoning model, fails with HTTP 400 "Unsupported parameter".
    const payload: Record<string, unknown> = {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${USER_MESSAGE_PREFIX}${cvText}` },
      ],
      temperature: ROUTE.temperature ?? 0.2,
    }
    if (ROUTE.response_format) payload.response_format = ROUTE.response_format
    if (ROUTE.reasoning_effort) {
      // Reasoning branch — hidden thinking tokens count against the cap,
      // so use the route's bake-off-validated max_completion_tokens
      // (currently 16000) and never send max_tokens alongside.
      payload.max_completion_tokens = ROUTE.max_completion_tokens ?? NONREASONING_MAX_TOKENS
      payload.reasoning_effort = ROUTE.reasoning_effort
    } else {
      // Non-reasoning branch — kept for any future route downgrade.
      payload.max_tokens = NONREASONING_MAX_TOKENS
    }

    const openaiResponse = await openaiChatCompletionWithRetry(
      payload,
      openaiKey,
      {
        traceName: 'extract-proof-signals',
        userId: user.id,
        metadata: { cv_text_length: cvText.length, model: MODEL },
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

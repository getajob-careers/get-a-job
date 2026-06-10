import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { openaiChatCompletionWithRetry } from '../_shared/openai-chat.ts'
// SYSTEM_PROMPT and USER_MESSAGE_PREFIX are now sourced from the shared
// module so the bake-off harness (scripts/test-proof-signals-bakeoff.ts)
// can import the exact production prompt without replicating the build
// logic. String produced is byte-identical to the prior inline version.
import { SYSTEM_PROMPT, USER_MESSAGE_PREFIX } from '../_shared/proof-signals-prompt.ts'

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
          { role: 'user', content: `${USER_MESSAGE_PREFIX}${cvText}` },
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

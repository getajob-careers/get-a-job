import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { generateDailyActionForUser } from '../_shared/daily-action-core.ts'

// cron-generate-daily-action — service-role entry point invoked once per
// user per day by the GH Actions cron at 04:00 UTC (~06–07am IL).
//
// Why a separate endpoint instead of extending generate-daily-action:
// the user-facing function does JWT auth + per-user rate limiting; both
// are wrong shape for the cron path (no user session, trusted caller,
// 100 sequential invocations against the rate limit would lock users
// out of the lazy fallback for an hour). Sharing the generation logic
// via daily-action-core.ts keeps the actual pipeline identical between
// the two paths — scoring weights, LLM prompt, race-fallback all live
// in one place.
//
// Auth: bearer must equal SUPABASE_SERVICE_ROLE_KEY. No anon-key
// fallback. Anything else → 401.
//
// Body: { user_id: string, force_regenerate?: boolean }
//
// Result shape mirrors generate-daily-action so the cron script can
// log identical fields:
//   200 { daily_action: <row> }
//   4xx/5xx { error: <msg> }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('cron-generate-daily-action')
  let _ok = false
  let _http = 500
  let _err: string | null = null

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!openaiKey || !serviceKey) {
      _http = 500; _err = 'no_env'
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service-role auth: exact-match the bearer against the configured
    // service-role key. This is the only way in — no JWT path, no
    // anon-key path. Constant-time compare would be marginally safer
    // against timing oracles, but the key isn't a user secret (it's
    // a Supabase project secret, leakage of which means total project
    // compromise) and Deno doesn't expose a stdlib timing-safe compare.
    const authHeader = req.headers.get('Authorization') ?? ''
    if (authHeader !== `Bearer ${serviceKey}`) {
      _http = 401; _err = 'auth'
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: { user_id?: unknown; force_regenerate?: unknown }
    try {
      body = await req.json()
    } catch {
      _http = 400; _err = 'bad_json'
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = typeof body.user_id === 'string' ? body.user_id : null
    if (!userId) {
      _http = 400; _err = 'no_user_id'
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    m.userId = userId

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey,
    )

    const result = await generateDailyActionForUser(userId, serviceClient, openaiKey, {
      forceRegenerate: body.force_regenerate === true,
      metric: m,
    })

    if (!result.ok) {
      _http = result.status ?? 500
      _err = 'core_failed'
      return new Response(JSON.stringify({ error: result.error ?? 'Generation failed' }), {
        status: result.status ?? 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify({ daily_action: result.daily_action }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('[cron-generate-daily-action] unhandled:', (error as Error)?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})

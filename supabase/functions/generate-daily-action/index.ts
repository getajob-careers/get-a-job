import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { generateDailyActionForUser } from '../_shared/daily-action-core.ts'

// generate-daily-action — user-JWT entry point for the daily action card.
//
// Two production callers:
//   1. Home dashboard's DailyActionCard (lazy, when a user opens Home)
//   2. The Tasks page (any other surface that needs today's action)
//
// In the normal flow the GH Actions cron at 04:00 UTC has already
// populated every user's `daily_actions` row for today. This endpoint
// then short-circuits with the existing-row check and returns in ~50ms.
//
// Fallback: if a user opens Home BEFORE the cron has run that day, or
// the cron fails/skips them, or they're a brand-new user whose first
// Home visit is mid-day — this endpoint runs the same generation
// pipeline as the cron and inserts the missing row. Idempotent via
// UNIQUE (user_id, for_date); a race between cron and on-demand
// triggers the race-fallback path in daily-action-core.ts.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// 60/hour. Daily Action is per-user-per-day so the natural cap is 1/day
// per user. 60 is comfortable headroom for force_regenerate during dev
// and for the rare case a user clicks done/dismiss multiple times.
const RATE_LIMIT_CALLS = 60
const RATE_LIMIT_WINDOW = 3600

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
    let forceRegenerate = false
    try {
      const rawBody = await req.text()
      if (rawBody) {
        const body = JSON.parse(rawBody)
        forceRegenerate = body?.force_regenerate === true
      }
    } catch {
      // Empty / non-JSON body is fine — no params required.
    }

    const result = await generateDailyActionForUser(user.id, supabase, openaiKey, { forceRegenerate, metric: m })

    if (!result.ok) {
      _http = result.status ?? 500
      _err = 'core_failed'
      return new Response(JSON.stringify({ error: result.error ?? 'An unexpected error occurred.' }), {
        status: result.status ?? 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify({ daily_action: result.daily_action }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('[generate-daily-action] unhandled:', (error as Error)?.message || error)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})

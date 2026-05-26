import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { sendEmail } from '../_shared/send-email.ts'

// send-welcome-email — fired fire-and-forget from Onboarding.jsx
// AFTER the first profile insert succeeds. By that point the user
// has confirmed their email, landed on /Onboarding, completed at
// least one step, and we have a profile row stamped with their
// invite_code + cohort_label.
//
// Authentication: user JWT (the caller is the freshly-onboarded
// user themselves, hitting this from the authenticated frontend).
// We verify the user via auth.getUser() and only send to the email
// on their auth record — no body-supplied email, no spoofing.
//
// Idempotency: Resend's Idempotency-Key header de-dupes retries
// within 24h. Key = `welcome:<user_id>`. If the frontend retries
// (page reload mid-onboarding, etc.) we don't double-send.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const FROM = 'Get A Job <noreply@getajob.careers>'
const REPLY_TO = 'eli@getajob.careers'

// Copy is intentionally short + direct. Pilot students don't need
// onboarding instructions in an email — they're already mid-flow on
// /Onboarding. The email exists to: (1) confirm they're in, (2) set
// expectation that Eli reads replies, (3) name the pilot context so
// they understand they're part of a cohort.
function buildBody(fullName: string, cohortLabel: string | null): string {
  const greeting = fullName ? `Hey ${fullName},` : 'Hey,'
  const cohort = cohortLabel === 'practicum_reichman'
    ? "You're in the Reichman practicum cohort."
    : cohortLabel === 'pilot_whatsapp'
      ? "You're part of the Aug-Nov 2026 pilot cohort (100 students)."
      : cohortLabel === 'employee'
        ? "You're on the team account."
        : cohortLabel === 'handpicked'
          ? "Glad to have you in early."
          : "Welcome to the pilot."

  return [
    greeting,
    '',
    "You're set up — welcome to Get A Job.",
    '',
    cohort,
    '',
    'Five specialised agents — career strategy, CV, interview, LinkedIn, skill development — have read your profile. They\'ll stop asking you to re-paste your CV.',
    '',
    'Anything broken or weird, reply to this email. It goes straight to Eli.',
    '',
    '— The Get A Job team',
  ].join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('send-welcome-email')
  let _ok = false
  let _http = 500
  let _err: string | null = null

  try {
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

    if (!user.email) {
      _http = 400; _err = 'no_email'
      return new Response(JSON.stringify({ error: 'User has no email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pull cohort_label + full_name for personalization. Best-effort —
    // missing profile / new user / partial onboarding still gets a
    // generic email rather than a 500.
    let fullName = user.user_metadata?.full_name as string | undefined
    let cohortLabel: string | null = null
    try {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('full_name, cohort_label')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.full_name) fullName = profile.full_name
      if (profile?.cohort_label) cohortLabel = profile.cohort_label as string
    } catch (lookupErr) {
      console.warn('[send-welcome-email] profile lookup failed (non-fatal):', (lookupErr as Error)?.message)
    }

    const result = await sendEmail({
      to: user.email,
      from: FROM,
      replyTo: REPLY_TO,
      subject: "You're in.",
      text: buildBody(fullName || '', cohortLabel),
      // 24h-stable key so retries during a tab reload don't double-send.
      idempotencyKey: `welcome:${user.id}`,
    })

    if (!result.ok) {
      _http = result.status ?? 500
      _err = 'send_failed'
      return new Response(JSON.stringify({ error: result.error ?? 'Send failed' }), {
        status: result.status ?? 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    _ok = true; _http = 200
    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    console.error('[send-welcome-email] unhandled:', (err as Error)?.message)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})

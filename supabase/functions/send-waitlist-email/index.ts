import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { startMetric, finishMetric } from '../_shared/metrics.ts'
import { sendEmail } from '../_shared/send-email.ts'

// send-waitlist-email — fired fire-and-forget from Login.jsx's
// handleWaitlistSubmit AFTER the waitlist_signups insert succeeds.
//
// Authentication: NONE — the caller is pre-auth (signing up failed
// the invite-code gate, fell into waitlist). We can't require a JWT.
// Spoofing risk is bounded: anyone can spam-call this endpoint with
// any email, BUT they could equally well just create a waitlist row
// directly via the anon INSERT policy on waitlist_signups. So the
// exposure is "spam someone's inbox with a single Get-A-Job-waitlist
// confirmation"; not a meaningful attack surface.
//
// Mitigations:
// - Rate limit by IP (not implemented in v1; rely on Resend's own
//   rate limits + the unique constraint on waitlist_signups.email
//   which limits abuse-per-target-email)
// - Idempotency key = email — so even multiple calls for the same
//   address dedupe inside Resend's 24h window
//
// If we see spam in practice, add a Turnstile check on the calling
// frontend (same widget already on the signup form).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const FROM = 'Get A Job <noreply@getajob.careers>'
const REPLY_TO = 'eli@getajob.careers'

function buildBody(): string {
  // Address recipient generically — waitlist signup only captures
  // email, no name. Keep it short: pilot is capped, we'll email when
  // a spot opens, manual escalation door open via reply.
  return [
    'Hey,',
    '',
    "You're on the Get A Job waitlist. The pilot is capped at 100 students for Aug–Nov 2026, so spots are tight — we'll email you the moment one opens.",
    '',
    'If your timing is sensitive (graduating soon, active job search, specific deadline), reply to this email and we\'ll see what we can do.',
    '',
    '— The Get A Job team',
  ].join('\n')
}

// Cheap email validation — defensive against junk body input.
// Supabase's anon INSERT on waitlist_signups already enforces a
// unique constraint, but it doesn't validate format, so we don't
// want to call Resend with garbage like " ".
function looksLikeEmail(s: unknown): s is string {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const m = startMetric('send-waitlist-email')
  let _ok = false
  let _http = 500
  let _err: string | null = null

  try {
    let body: { email?: unknown }
    try {
      body = await req.json()
    } catch {
      _http = 400; _err = 'bad_json'
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!looksLikeEmail(body.email)) {
      _http = 400; _err = 'bad_email'
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = body.email.trim().toLowerCase()

    const result = await sendEmail({
      to: email,
      from: FROM,
      replyTo: REPLY_TO,
      subject: "You're on the list.",
      text: buildBody(),
      // Email-as-key so spam-clicks on the waitlist form de-dupe within
      // Resend's 24h window.
      idempotencyKey: `waitlist:${email}`,
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
    console.error('[send-waitlist-email] unhandled:', (err as Error)?.message)
    _http = 500; _err = 'unhandled'
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } finally {
    finishMetric(m, { ok: _ok, httpStatus: _http, errorCode: _err })
  }
})

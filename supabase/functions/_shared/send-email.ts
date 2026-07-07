// send-email.ts — Resend REST API wrapper. Used by the
// transactional-email edge function send-welcome-email.
//
// Why raw HTTP, not @resend/sdk: the SDK adds a dependency we don't
// otherwise need + a small Deno cold-start cost. Resend's REST API
// is stable and the request shape is dead simple. Matches the
// pattern in _shared/openai-chat.ts (raw fetch to OpenAI rather
// than the @openai/openai SDK).
//
// Required env var:
//   RESEND_API_KEY — distinct from the Resend SMTP credentials used
//                    by Supabase Auth's custom SMTP integration.
//                    Set via Supabase Dashboard → Project Settings →
//                    Edge Functions → Secrets.
//
// If RESEND_API_KEY is missing the helper returns
// { ok: false, status: 500, error: 'RESEND_API_KEY_missing — ...' }
// without throwing — callers can fire-and-forget without a crash,
// and the missing-key state is self-describing in both the function
// logs and the response body.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface SendEmailArgs {
  to: string                  // single recipient (we don't batch for now)
  from: string                // e.g. "Get A Job <noreply@getajob.careers>"
  subject: string
  text: string                // plain-text body
  // html is optional — text-only is fine for transactional. If we add
  // html later, Resend renders the multipart/alternative for us.
  html?: string
  // Idempotency key — if Resend sees a duplicate within 24h it returns
  // the same email id instead of sending again. Use for client retries.
  idempotencyKey?: string
  // Reply-to override. Default unset — replies go to `from`. Setting
  // this routes replies somewhere monitored (e.g. eli@getajob.careers)
  // when `from` is a noreply address.
  replyTo?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string                 // Resend's email id on success
  status?: number
  error?: string
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKeyRaw = Deno.env.get('RESEND_API_KEY')
  if (!apiKeyRaw) {
    console.warn('[send-email] RESEND_API_KEY not configured — skipping send')
    return { ok: false, status: 500, error: 'RESEND_API_KEY_missing — set it in Supabase Dashboard → Project Settings → Edge Functions → Secrets' }
  }

  // Defensive: a trailing \n on the Supabase Dashboard secret value
  // (very easy when pasting) puts a newline into the Authorization
  // header. Deno's Request constructor then rejects the whole headers
  // object with `'headers' ... is not a valid ByteString` — opaque
  // error that caused 17/17 welcome-email sends to fail silently
  // from June 2 onwards.
  //
  // The format check is a second guard against any non-printable-ASCII
  // sneaking through (smart-quoted paste, etc.). Resend keys are
  // `re_` + alphanumeric — pure ASCII by spec.
  const apiKey = apiKeyRaw.trim()
  if (!apiKey || !/^[\x21-\x7e]+$/.test(apiKey)) {
    console.error('[send-email] RESEND_API_KEY invalid format after trim (length=' + apiKey.length + ')')
    return { ok: false, status: 500, error: 'RESEND_API_KEY_invalid_format — non-printable-ASCII characters present (whitespace/newline?)' }
  }

  const body: Record<string, unknown> = {
    from: args.from,
    to: [args.to],
    subject: args.subject,
    text: args.text,
  }
  if (args.html) body.html = args.html
  if (args.replyTo) body.reply_to = args.replyTo

  try {
    // Headers constructor (not a plain Record) gives a clearer
    // per-header error if any value somehow ends up non-ByteString —
    // and idempotencyKey can be a user-controlled value, so validate
    // it the same way.
    const headers = new Headers({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    })
    if (args.idempotencyKey) {
      const idem = args.idempotencyKey.trim()
      if (/^[\x21-\x7e]+$/.test(idem)) headers.set('Idempotency-Key', idem)
      // else: silently drop — better to send without idempotency than
      // to fail the whole call on a malformed key.
    }

    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '<no body>')
      console.error(`[send-email] Resend ${res.status}:`, errText.slice(0, 300))
      return { ok: false, status: res.status, error: errText.slice(0, 200) }
    }

    const data = await res.json().catch(() => ({}))
    return { ok: true, id: data?.id, status: 200 }
  } catch (err) {
    const msg = (err as Error)?.message || String(err)
    console.error('[send-email] fetch failed:', msg)
    return { ok: false, status: 500, error: msg.slice(0, 200) }
  }
}

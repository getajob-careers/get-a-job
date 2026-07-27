// email-dispatch.ts — the ONLY place an automation email is either logged
// (dry-run) or sent. Centralizes the hard dry-run safety so no caller can send
// by accident.
//
// DRY-RUN ABSOLUTE (this arc): a real send requires THREE independent conditions
// to all be true. Nothing this arc ships sets EMAIL_SEND_ENABLED or passes
// dryRun=false (the cron is disabled; callers default dryRun=true), so the send
// branch is UNREACHABLE in the shipped state. It exists only so Eli can enable
// sending AFTER reviewing dry-run samples — a config flip, not a code change.

import { sendEmail } from "./send-email.ts";

export type EmailType = "job_digest" | "reengagement";

// Internal / test recipients — never send here even if sending is later enabled.
// Mirrors the scrubbed-usage real_users email exclusion (defense in depth: the
// segment queries already exclude these, this is a second gate at the send edge).
// cwsctstest / pod1cws are two non-plus-addressed QA accounts that slipped the
// plus-addressed patterns above; matched by narrow exact-ish local-part fragments
// (NOT bare "test"/"cws", which would false-positive real users).
const INTERNAL_EMAIL_RE =
  /(elienglard|isaacselig|yishailieser|@getajob|\+demo|\+test|\+audit|\+cwsreview|cwsctstest|pod1cws)/i;
export const isInternalEmail = (email: string): boolean =>
  INTERNAL_EMAIL_RE.test(String(email ?? ""));

export interface EmailMessage {
  userId: string | null;
  emailType: EmailType;
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  meta?: Record<string, unknown>;
}

export interface DispatchResult {
  dryRun: boolean;
  sent: boolean;
  loggedId?: string;
  error?: string;
}

export async function dispatchEmail(
  svc: any,
  msg: EmailMessage,
  opts: { dryRun: boolean },
): Promise<DispatchResult> {
  const wouldSendToRealUser = opts.dryRun === false && !isInternalEmail(msg.to);
  const sendEnabled =
    wouldSendToRealUser &&
    String(Deno.env.get("EMAIL_SEND_ENABLED") ?? "").toLowerCase() === "true";

  if (!sendEnabled) {
    // Dry-run (or a blocked send): log the fully rendered email, never send.
    const { data, error } = await svc
      .from("email_dry_run_log")
      .insert({
        user_id: msg.userId,
        email_type: msg.emailType,
        to_email: msg.to,
        subject: msg.subject,
        html_body: msg.html,
        text_body: msg.text,
        meta: { ...(msg.meta ?? {}), dry_run: true, would_send: wouldSendToRealUser },
      })
      .select("id")
      .single();
    if (error) console.error("[email-dispatch] dry-run log insert failed:", error.message);
    return { dryRun: true, sent: false, loggedId: data?.id, error: error?.message };
  }

  // Eli-enabled real send (unreachable in shipped state — see header).
  const res = await sendEmail({
    to: msg.to,
    from: msg.from,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    replyTo: msg.replyTo,
    idempotencyKey: `${msg.emailType}:${msg.userId}:${new Date().toISOString().slice(0, 10)}`,
  });
  return { dryRun: false, sent: res.ok, error: res.ok ? undefined : res.error };
}

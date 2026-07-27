// send-redesign-announcement - one-off announcement to onboarded users that the
// platform has a fully redesigned experience (confirmed email, onboarding
// COMPLETE, not unsubscribed, not internal). DRY-RUN by default: renders + logs
// to email_dry_run_log, never sends. Fired manually on Eli's go, not scheduled.
//
// Auth: service-role bearer only (isServiceRoleCaller). No user JWT path.

import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveEligibleRecipients } from "../_shared/email-eligibility.ts";
import { renderRedesignAnnouncementEmail } from "../_shared/email-templates.ts";
import { dispatchEmail } from "../_shared/email-dispatch.ts";
import {
  EMAIL_FROM,
  EMAIL_REPLY_TO,
  appBaseUrl,
  unsubscribeUrl,
  isServiceRoleCaller,
  resolveDryRun,
} from "../_shared/email-config.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (!isServiceRoleCaller(req)) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = resolveDryRun(body);
    const limit = Number.isFinite(body?.limit) ? Math.max(0, Math.floor(body.limit)) : Infinity;

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const recipients = await resolveEligibleRecipients(svc, "redesign_announcement");
    const app = appBaseUrl();

    let logged = 0;
    let sent = 0;
    const errors: string[] = [];
    let processed = 0;
    for (const r of recipients) {
      if (processed >= limit) break;
      processed++;

      // Ensure a prefs row + a real unsubscribe token (keeps an existing token).
      await svc
        .from("email_preferences")
        .upsert({ user_id: r.userId }, { onConflict: "user_id", ignoreDuplicates: true });
      const { data: pref } = await svc
        .from("email_preferences")
        .select("unsubscribe_token")
        .eq("user_id", r.userId)
        .single();
      const token = pref?.unsubscribe_token;
      if (!token) {
        errors.push(`no token for ${r.userId}`);
        continue;
      }

      const { subject, html, text } = renderRedesignAnnouncementEmail({
        fullName: r.fullName,
        unsubscribeUrl: unsubscribeUrl(token),
        appUrl: app,
      });

      const res = await dispatchEmail(
        svc,
        {
          userId: r.userId,
          emailType: "redesign_announcement",
          to: r.email,
          from: EMAIL_FROM,
          subject,
          text,
          html,
          replyTo: EMAIL_REPLY_TO,
          meta: { segment: "redesign_announcement" },
        },
        { dryRun },
      );
      if (res.dryRun) logged++;
      else if (res.sent) sent++;
      if (res.error) errors.push(res.error);
    }

    return json({
      ok: true,
      segment: "redesign_announcement",
      dry_run: dryRun,
      eligible: recipients.length,
      processed,
      logged,
      sent,
      errors: errors.slice(0, 10),
    });
  } catch (e) {
    console.error("send-redesign-announcement error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});

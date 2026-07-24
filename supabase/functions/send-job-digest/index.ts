// send-job-digest — RENDER + LOG only. Selection moved to the GitHub Actions
// digest script (scripts/send-job-digest.ts), which runs the REAL client scorer
// (src/lib/scoreJobFit.js via selectDigestJobs) with the live scoring_v2 stack —
// something this Deno edge function cannot import. This function no longer
// scores: it receives per-user pre-selected top-5 jobs (already above the GOOD
// bar, already sorted) plus each recipient's real score/band, renders the digest
// email, and logs it to email_dry_run_log. DRY-RUN by default; the dispatch
// triple-guard (email-dispatch.ts) is untouched, so a real send stays HELD.
//
// Request body (from the Actions script, service-role bearer):
//   {
//     dry_run?: boolean,                      // default true (resolveDryRun)
//     selections: [
//       { user_id, email, full_name,
//         jobs: [ { job_id, title, company, location, url, score, band } ] }
//     ]
//   }
//
// Auth: service-role bearer only (isServiceRoleCaller). The per-user 2-day
// cadence and the NEW-jobs window are enforced in the script (it owns selection);
// this function only bumps last_job_digest_at on a real send.

import { createClient } from "npm:@supabase/supabase-js@2";
import { renderJobDigestEmail, type DigestJob } from "../_shared/email-templates.ts";
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

interface SelectionJob {
  job_id?: string;
  title?: string;
  company?: string;
  location?: string;
  url?: string;
  score?: number;
  band?: string;
}
interface Selection {
  user_id: string;
  email: string;
  full_name?: string | null;
  jobs: SelectionJob[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (!isServiceRoleCaller(req)) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = resolveDryRun(body);
    const selections: Selection[] = Array.isArray(body?.selections) ? body.selections : [];
    const nowMs = Date.now();

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const app = appBaseUrl();
    let logged = 0;
    let sent = 0;
    let skippedEmpty = 0;
    let skippedUnsubscribed = 0;
    let processed = 0;
    const errors: string[] = [];

    for (const sel of selections) {
      processed++;
      const jobs = Array.isArray(sel?.jobs) ? sel.jobs : [];
      if (!sel?.user_id || !sel?.email || jobs.length === 0) {
        skippedEmpty++;
        continue;
      }

      // Ensure a prefs row + unsubscribe token; also re-check unsubscribed as a
      // second gate (the script filters unsubscribed users, this is defense in
      // depth so a script bug can never mail an opted-out user once sending is on).
      await svc
        .from("email_preferences")
        .upsert({ user_id: sel.user_id }, { onConflict: "user_id", ignoreDuplicates: true });
      const { data: pref } = await svc
        .from("email_preferences")
        .select("unsubscribe_token, unsubscribed_at")
        .eq("user_id", sel.user_id)
        .single();
      if (pref?.unsubscribed_at) {
        skippedUnsubscribed++;
        continue;
      }
      const token = pref?.unsubscribe_token;
      if (!token) {
        errors.push(`no token for ${sel.user_id}`);
        continue;
      }

      const digestJobs: DigestJob[] = jobs.map((j) => ({
        title: String(j.title ?? ""),
        company: String(j.company ?? ""),
        location: String(j.location ?? ""),
        url: String(j.url ?? app),
        band: String(j.band ?? ""),
        scorePct: Math.round((typeof j.score === "number" ? j.score : 0) * 100),
      }));

      const { subject, html, text } = renderJobDigestEmail({
        fullName: sel.full_name ?? null,
        jobs: digestJobs,
        unsubscribeUrl: unsubscribeUrl(token),
        appUrl: app,
      });

      const res = await dispatchEmail(
        svc,
        {
          userId: sel.user_id,
          emailType: "job_digest",
          to: sel.email,
          from: EMAIL_FROM,
          subject,
          text,
          html,
          replyTo: EMAIL_REPLY_TO,
          meta: {
            segment: "job_digest",
            scorer: "scoreJobFit",
            job_ids: jobs.map((j) => j.job_id),
            scores: jobs.map((j) => j.score),
          },
        },
        { dryRun },
      );
      if (res.dryRun) logged++;
      else if (res.sent) sent++;
      if (res.error) errors.push(res.error);

      // Bump the per-user window ONLY on a real send (never in dry-run), so
      // repeated dry-runs are inert and a real cadence advances the window.
      if (!res.dryRun && res.sent) {
        await svc
          .from("email_preferences")
          .update({
            last_job_digest_at: new Date(nowMs).toISOString(),
            updated_at: new Date(nowMs).toISOString(),
          })
          .eq("user_id", sel.user_id);
      }
    }

    return json({
      ok: true,
      segment: "job_digest",
      dry_run: dryRun,
      scorer: "scoreJobFit",
      selections_received: selections.length,
      processed,
      logged,
      sent,
      skipped_empty: skippedEmpty,
      skipped_unsubscribed: skippedUnsubscribed,
      errors: errors.slice(0, 10),
    });
  } catch (e) {
    console.error("send-job-digest error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});

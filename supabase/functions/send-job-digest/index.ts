// send-job-digest — per eligible user (confirmed email, onboarding complete, not
// unsubscribed, digest enabled, not internal): the top 5 NEW jobs since that
// user's last digest, above the GOOD-tier bar (attainability >= 0.42), ranked
// desc. Skips a user entirely when they have no match above the bar — never pads
// a thin digest. DRY-RUN by default: renders + logs to email_dry_run_log, never
// sends. Runs every 2 days via a (shipped-DISABLED) GH Actions cron.
//
// Scoring: server-side approximation of scoreJobFit's attainability_score
// (_shared/attainability-lite.ts) — the client scorer isn't importable
// server-side. Same weights + GOOD bar; see that file's header for the declared
// divergence. Eli validates the sampled top-5 before any send is enabled.
//
// Auth: service-role bearer only. NEW-job window per user = last_job_digest_at,
// falling back to now()-14d for a first digest. is_agency jobs are excluded.

import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveEligibleRecipients } from "../_shared/email-eligibility.ts";
import { renderJobDigestEmail, type DigestJob } from "../_shared/email-templates.ts";
import { dispatchEmail } from "../_shared/email-dispatch.ts";
import { scoreAttainabilityLite, GOOD_TIER_BAR } from "../_shared/attainability-lite.ts";
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

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_DIGEST_LOOKBACK_DAYS = 14;
const MIN_DIGEST_GAP_DAYS = 2; // per-user cadence: skip if last digest < 2 days ago
const TOP_N = 5;
const CANDIDATE_CAP = 1500; // most-recent new jobs loaded; logged in meta if hit.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (!isServiceRoleCaller(req)) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = resolveDryRun(body);
    const limit = Number.isFinite(body?.limit) ? Math.max(0, Math.floor(body.limit)) : Infinity;
    const nowMs = Date.now();
    const globalCutoffIso = new Date(nowMs - FIRST_DIGEST_LOOKBACK_DAYS * DAY_MS).toISOString();

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const recipients = await resolveEligibleRecipients(svc, "job_digest");
    if (recipients.length === 0) return json({ ok: true, segment: "job_digest", dry_run: dryRun, eligible: 0, sent_or_logged: 0, skipped_no_matches: 0 });
    const ids = recipients.map((r) => r.userId);

    // Scoring profile fields for all recipients (one query).
    const { data: profiles } = await svc
      .from("profiles")
      .select("id, skills_canonical, qualification_level, education_level")
      .in("id", ids);
    const profById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    // prefs (token + last_job_digest_at) for all recipients (one query).
    const { data: prefs } = await svc
      .from("email_preferences")
      .select("user_id, unsubscribe_token, last_job_digest_at")
      .in("user_id", ids);
    const prefByUser = new Map((prefs ?? []).map((r: any) => [r.user_id, r]));

    // Candidate NEW jobs since the widest window (per-user window applied in memory).
    const { data: jobsRaw } = await svc
      .from("jobs")
      .select(
        "id, title, company_name, location_city, location_raw, apply_url, first_seen_at, is_active, is_agency, req_skills_must_have, req_skills_core, req_years_min, req_seniority, seniority, req_education_levels",
      )
      .eq("is_active", true)
      .eq("is_agency", false)
      .gte("first_seen_at", globalCutoffIso)
      .order("first_seen_at", { ascending: false })
      .limit(CANDIDATE_CAP);
    const candidates = jobsRaw ?? [];
    const candidateCapHit = candidates.length >= CANDIDATE_CAP;

    const app = appBaseUrl();
    let logged = 0;
    let sent = 0;
    let skippedNoMatches = 0;
    let skippedNotDue = 0;
    let processed = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      if (processed >= limit) break;
      processed++;

      // Ensure a prefs row + token (first digest mints one).
      let pref: any = prefByUser.get(r.userId);
      if (!pref?.unsubscribe_token) {
        await svc
          .from("email_preferences")
          .upsert({ user_id: r.userId }, { onConflict: "user_id", ignoreDuplicates: true });
        const { data } = await svc
          .from("email_preferences")
          .select("unsubscribe_token, last_job_digest_at")
          .eq("user_id", r.userId)
          .single();
        pref = data;
      }
      const token = pref?.unsubscribe_token;
      if (!token) {
        errors.push(`no token for ${r.userId}`);
        continue;
      }

      // Per-user cadence gate: every 2 days. The cron runs daily; this skips
      // users digested < 2 days ago. Inert in dry-run (last_job_digest_at only
      // bumps on a real send), so dry-run samples are never gated.
      if (
        pref?.last_job_digest_at &&
        nowMs - Date.parse(String(pref.last_job_digest_at)) < MIN_DIGEST_GAP_DAYS * DAY_MS
      ) {
        skippedNotDue++;
        continue;
      }

      const profile = profById.get(r.userId) ?? {};
      const windowIso: string = pref?.last_job_digest_at ?? globalCutoffIso;

      // Per-user: new since their window, scored, GOOD-tier bar, top N.
      const scored = candidates
        .filter((j: any) => String(j.first_seen_at) > windowIso)
        .map((j: any) => ({ j, s: scoreAttainabilityLite(profile, j) }))
        .filter((x) => x.s.score >= GOOD_TIER_BAR)
        .sort((a, b) => b.s.score - a.s.score)
        .slice(0, TOP_N);

      if (scored.length === 0) {
        skippedNoMatches++; // never pad a thin digest
        continue;
      }

      const jobs: DigestJob[] = scored.map(({ j, s }) => ({
        title: String(j.title ?? ""),
        company: String(j.company_name ?? ""),
        location: String(j.location_city ?? j.location_raw ?? ""),
        url: String(j.apply_url ?? app),
        band: s.band,
        scorePct: Math.round(s.score * 100),
      }));

      const { subject, html, text } = renderJobDigestEmail({
        fullName: r.fullName,
        jobs,
        unsubscribeUrl: unsubscribeUrl(token),
        appUrl: app,
      });

      const res = await dispatchEmail(
        svc,
        {
          userId: r.userId,
          emailType: "job_digest",
          to: r.email,
          from: EMAIL_FROM,
          subject,
          text,
          html,
          replyTo: EMAIL_REPLY_TO,
          meta: {
            segment: "job_digest",
            window_since: windowIso,
            bar: GOOD_TIER_BAR,
            job_ids: scored.map(({ j }) => j.id),
            scores: scored.map(({ s }) => s.score),
            candidate_cap_hit: candidateCapHit,
          },
        },
        { dryRun },
      );
      if (res.dryRun) logged++;
      else if (res.sent) sent++;
      if (res.error) errors.push(res.error);

      // Bump the per-user window ONLY on a real send (never in dry-run), so
      // repeated dry-runs render the same window and a real cadence advances it.
      const reallySent = !res.dryRun && res.sent;
      if (reallySent) {
        await svc
          .from("email_preferences")
          .update({ last_job_digest_at: new Date(nowMs).toISOString(), updated_at: new Date(nowMs).toISOString() })
          .eq("user_id", r.userId);
      }
    }

    return json({
      ok: true,
      segment: "job_digest",
      dry_run: dryRun,
      bar: GOOD_TIER_BAR,
      eligible: recipients.length,
      processed,
      logged,
      sent,
      skipped_no_matches: skippedNoMatches,
      skipped_not_due: skippedNotDue,
      candidate_pool: candidates.length,
      candidate_cap_hit: candidateCapHit,
      errors: errors.slice(0, 10),
    });
  } catch (e) {
    console.error("send-job-digest error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});

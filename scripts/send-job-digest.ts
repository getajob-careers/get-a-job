// send-job-digest.ts — cron/selection entrypoint for the job-match digest.
//
// This is where the digest is SCORED. Unlike the Deno edge function, this Node
// runner can import the REAL client scorer (src/lib/scoreJobFit.js via
// selectDigestJobs) and run the exact live scoring_v2 stack (confidence shrink +
// must-have + direction). It resolves eligible recipients, gathers each user's
// profile / experiences / education + the candidate NEW jobs, picks the top-5
// above the GOOD bar sorted by the live rank key, then hands the chosen jobs +
// real scores to the send-job-digest edge function, which only renders + logs.
//
// (Replaces the retired server-side attainability-lite proxy, which scored every
// under-specified job ~1.0 and surfaced the least-extracted jobs to everyone.)
//
// DRY-RUN by default; a real send requires EMAIL_REAL_SEND=true from the workflow
// (the scheduled daily fire; manual dispatch stays dry-run) AND EMAIL_SEND_ENABLED
// set to "true" in the edge-function env.
//
// Run: npx tsx scripts/send-job-digest.ts   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)

import { createClient } from "@supabase/supabase-js";
import {
  selectTopJobsForUser,
  GOOD_TIER_BAR,
} from "../src/lib/selectDigestJobs.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const svc = createClient(url, key);

// EMAIL_REAL_SEND is set by the workflow: true on the scheduled daily fire, false
// on a manual dispatch. dry_run is its inverse. Even dry_run false only sends when
// EMAIL_SEND_ENABLED=true in the edge-function env.
const realSend =
  String(process.env.EMAIL_REAL_SEND ?? "").toLowerCase() === "true";

// Real-user scrub (mirrors _shared/email-eligibility.ts + the scrubbed-usage CTE).
const INTERNAL_EMAIL_RE =
  /(elienglard|isaacselig|yishailieser|@getajob|\+demo|\+test|\+audit|\+cwsreview)/i;
const NOMS_UUID = "90bcf097-77f2-437f-9210-42755ba4d143";

const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_DIGEST_LOOKBACK_DAYS = 14;
const MIN_DIGEST_GAP_DAYS = 2;
const TOP_N = 5;
const CANDIDATE_CAP = 1500;

async function listConfirmedRealUsers(): Promise<Map<string, string>> {
  const byId = new Map<string, string>();
  let page = 1;
  const perPage = 200;
  for (let guard = 0; guard < 50; guard++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[digest] listUsers failed:", error.message);
      break;
    }
    const users = data?.users ?? [];
    for (const u of users) {
      const email = String(u?.email ?? "");
      if (!email) continue;
      if (!u?.email_confirmed_at) continue;
      if ((u as any)?.deleted_at) continue;
      if (u.id === NOMS_UUID) continue;
      if (INTERNAL_EMAIL_RE.test(email)) continue;
      byId.set(u.id, email);
    }
    if (users.length < perPage) break;
    page++;
  }
  return byId;
}

function firstName(full: unknown): string | null {
  const n = String(full ?? "").trim();
  return n || null;
}

async function main() {
  const nowMs = Date.now();
  const globalCutoffIso = new Date(
    nowMs - FIRST_DIGEST_LOOKBACK_DAYS * DAY_MS,
  ).toISOString();

  const emailById = await listConfirmedRealUsers();
  const ids = [...emailById.keys()];
  if (ids.length === 0) {
    console.log("[send-job-digest]", JSON.stringify({ ok: true, eligible: 0 }));
    return;
  }

  // Profiles (eligibility + scorer inputs).
  const { data: profiles } = await svc
    .from("profiles")
    .select(
      "id, full_name, onboarding_complete, skills_canonical, primary_domain, qualification_level",
    )
    .in("id", ids);
  const profById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  // Preferences (unsubscribe / enabled / window).
  const { data: prefs } = await svc
    .from("email_preferences")
    .select("user_id, unsubscribed_at, job_digest_enabled, last_job_digest_at")
    .in("user_id", ids);
  const prefByUser = new Map((prefs ?? []).map((r: any) => [r.user_id, r]));

  // Experiences + education for the real scorer (years / level / relevance axes).
  const { data: exps } = await svc
    .from("experiences")
    .select(
      "user_id, type, title, company, responsibilities, start_date, end_date, is_current, managed_people",
    )
    .in("user_id", ids);
  const expsByUser = new Map<string, any[]>();
  for (const e of exps ?? []) {
    const arr = expsByUser.get(e.user_id) ?? [];
    arr.push(e);
    expsByUser.set(e.user_id, arr);
  }
  // The scorer's education axis reads `degree_level`; the table stores it as
  // `degree_type`. Alias so the input shape matches what the live feed passes.
  const { data: edus } = await svc
    .from("education")
    .select(
      "user_id, education_level, degree_level:degree_type, is_current, display_order",
    )
    .in("user_id", ids);
  const eduByUser = new Map<string, any[]>();
  for (const e of edus ?? []) {
    const arr = eduByUser.get(e.user_id) ?? [];
    arr.push(e);
    eduByUser.set(e.user_id, arr);
  }

  // Candidate NEW jobs since the widest window (per-user window applied below).
  // Select every field the real scorer reads.
  const { data: jobsRaw } = await svc
    .from("jobs")
    .select(
      "id, title, company_name, location_city, location_raw, apply_url, first_seen_at, function_family, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, extraction_confidence, skill_coverage_ratio",
    )
    .eq("is_active", true)
    .eq("is_agency", false)
    .gte("first_seen_at", globalCutoffIso)
    .order("first_seen_at", { ascending: false })
    .limit(CANDIDATE_CAP);
  const candidates = jobsRaw ?? [];
  const candidateCapHit = candidates.length >= CANDIDATE_CAP;

  const selections: any[] = [];
  const allScores: number[] = [];
  let eligible = 0;
  let skippedNotDue = 0;
  let skippedNoMatches = 0;

  for (const userId of ids) {
    const prof: any = profById.get(userId);
    const pref: any = prefByUser.get(userId);
    // Eligibility: onboarding complete, not unsubscribed, digest enabled.
    if (prof?.onboarding_complete !== true) continue;
    if (pref?.unsubscribed_at) continue;
    if (pref && pref.job_digest_enabled === false) continue;
    eligible++;

    // Per-user cadence: skip if digested < 2 days ago.
    if (
      pref?.last_job_digest_at &&
      nowMs - Date.parse(String(pref.last_job_digest_at)) <
        MIN_DIGEST_GAP_DAYS * DAY_MS
    ) {
      skippedNotDue++;
      continue;
    }

    const windowIso: string = pref?.last_job_digest_at ?? globalCutoffIso;
    const fresh = candidates.filter(
      (j: any) => String(j.first_seen_at) > windowIso,
    );

    const userInput = {
      profile: {
        skills_canonical: prof?.skills_canonical ?? [],
        primary_domain: prof?.primary_domain ?? null,
        qualification_level: prof?.qualification_level ?? null,
      },
      experiences: expsByUser.get(userId) ?? [],
      educations: eduByUser.get(userId) ?? [],
    };

    const top = selectTopJobsForUser(userInput, fresh, { topN: TOP_N });
    if (top.length === 0) {
      skippedNoMatches++;
      continue;
    }

    for (const t of top) allScores.push(t.attainability_score);
    selections.push({
      user_id: userId,
      email: emailById.get(userId),
      full_name: firstName(prof?.full_name),
      jobs: top.map((t) => ({
        job_id: t.job.id,
        title: t.job.title ?? "",
        company: t.job.company_name ?? "",
        location: t.job.location_city ?? t.job.location_raw ?? "",
        url: t.job.apply_url ?? "",
        score: t.attainability_score,
        band: t.attainability_band,
      })),
    });
  }

  // Score distribution (min / median / max) — the metric Eli asked for.
  const dist = (() => {
    if (allScores.length === 0)
      return { n: 0, min: null, median: null, max: null };
    const s = [...allScores].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    return {
      n: s.length,
      min: s[0],
      median: Math.round(median * 1000) / 1000,
      max: s[s.length - 1],
    };
  })();

  // Hand the pre-selected jobs to the edge function (render + log only).
  const { data, error } = await svc.functions.invoke("send-job-digest", {
    body: { dry_run: !realSend, selections },
  });
  if (error) {
    console.error("[send-job-digest] invoke failed:", error.message);
    process.exit(1);
  }

  console.log(
    "[send-job-digest]",
    JSON.stringify({
      ok: true,
      bar: GOOD_TIER_BAR,
      eligible,
      selected_users: selections.length,
      skipped_not_due: skippedNotDue,
      skipped_no_matches: skippedNoMatches,
      candidate_pool: candidates.length,
      candidate_cap_hit: candidateCapHit,
      score_distribution: dist,
      edge: data,
    }),
  );
}

await main();

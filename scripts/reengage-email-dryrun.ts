// scripts/reengage-email-dryrun.ts
//
// Reengagement email — DRY-RUN by default; sends only with an explicit
// confirm phrase (CONFIRM=SEND-REENGAGE-2026-06). Same safety shape as
// scripts/delete-demo-seeds.mjs (dry-run default → confirm phrase → throttled,
// idempotent run).
//
// Audience (confirmed, non-internal): internal excluded via the shared
// INTERNAL_USER_IDS allowlist AND the email LIKE '%+%' convention. Each user
// is routed to EXACTLY ONE segment, in priority order:
//   1. PRACTICUM        — has company_targets: top-3 matched companies.
//   2. JOB_MATCHES      — onboarded (career_roles) + >=3 job matches.
//   3. NEVER_ONBOARDED  — confirmed, no career_roles ("shortened onboarding").
//   4. REACTIVATION     — onboarded but <3 job matches.
//
// CONTRACT (do not break): the matched-jobs block reuses the EXACT post-#314
// path — search_jobs_by_role_titles with the user's track-1 titles + their
// LOADED seniority allow-list (allowedSenioritiesForLevel ∘ inferExperienceLevel,
// imported) + p_work_types; honest remaining count from the 4-arg count RPC
// with the SAME params. Count DISPLAY is banded ("50+" above 50). The
// practicum block reuses company_targets ordered by match_score (the exact
// data Internship.jsx renders). Improvement claims are a fixed VERIFIED set
// (no LinkedIn/outreach — that generator is still flagged bad).
//
// RUN:  SUPABASE_SERVICE_ROLE_KEY=... [RESEND_API_KEY=... TEST_PREVIEW_EMAIL=...] npx tsx scripts/reengage-email-dryrun.ts
//   real send:  CONFIRM=SEND-REENGAGE-2026-06 RESEND_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/reengage-email-dryrun.ts

import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  inferExperienceLevel,
  allowedSenioritiesForLevel,
} from "@/lib/experienceLevel";
import { INTERNAL_USER_IDS } from "@/lib/internalUsers";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ilmqmodklutztuybsvwd.supabase.co";
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TEST_PREVIEW_EMAIL = process.env.TEST_PREVIEW_EMAIL;
const CONFIRM = process.env.CONFIRM;

const CONFIRM_PHRASE = "SEND-REENGAGE-2026-06";
const CAMPAIGN = "reengage-2026-06";
const FROM = "Get A Job <noreply@getajob.careers>";
const REPLY_TO = "eli@getajob.careers";
const CAREER_URL = "https://getajob.careers/Career";
const INTERNSHIP_URL = "https://getajob.careers/Internship";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
// Only account with populated company_targets — used to RENDER the practicum
// preview (no eligible user has targets yet; see the dry-run flag).
const PRACTICUM_PREVIEW_USER = "4b243f3a-5035-474e-a89d-aff13fe06cc2";

const MAX_TRACK_ROLES = 8;
const THRESHOLD = 0.3;
const TOP_N = 3;
const SEND_GAP_MS = 600;

if (!SRK) {
  console.error("ERROR: set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(SUPABASE_URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const INTERNAL = new Set(INTERNAL_USER_IDS);

type Segment = "practicum" | "job_matches" | "never_onboarded" | "reactivation";
interface Job {
  title: string;
  company_name: string;
  seniority: string;
  apply_url: string;
}
interface Company {
  name: string;
  match_score: number | null;
  why_fit: string;
  pitched_role: string | null;
}
interface Recipient {
  user_id: string;
  email: string;
  firstName: string;
  segment: Segment;
  experienceLevel?: string;
  jobs?: Job[];
  honestN?: number;
  companies?: Company[];
}

function firstNameOf(fullName: string | null | undefined): string {
  const n = String(fullName || "")
    .trim()
    .split(/\s+/)[0];
  return n || "there";
}
function bandCount(n: number): string {
  return n > 50 ? "50+" : String(n);
}
function bandFit(score: number | null): string {
  if (score == null) return "Match";
  if (score >= 80) return "Strong fit";
  if (score >= 65) return "Good fit";
  return "Fit";
}

async function listAllUsers() {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(`listUsers: ${error.message}`);
  return data.users;
}
async function fetchByUser(table: string, ids: string[]) {
  const { data, error } = await admin
    .from(table)
    .select("*")
    .in("user_id", ids);
  if (error) throw new Error(`${table}: ${error.message}`);
  const map = new Map<string, any[]>();
  for (const row of data || []) {
    if (!map.has(row.user_id)) map.set(row.user_id, []);
    map.get(row.user_id)!.push(row);
  }
  return map;
}
async function companyTargetsFor(ids: string[]) {
  // Mirrors Internship.jsx: company_targets joined to companies, ordered by
  // match_score DESC. We don't reimplement the matching — we read it.
  const { data, error } = await admin
    .from("company_targets")
    .select(
      "user_id, match_score, match_rationale, pitched_role, companies(name)",
    )
    .in("user_id", ids)
    .order("match_score", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`company_targets: ${error.message}`);
  const map = new Map<string, Company[]>();
  for (const row of (data as any[]) || []) {
    const c: Company = {
      name: row.companies?.name || "—",
      match_score: row.match_score,
      why_fit: String(row.match_rationale || ""),
      pitched_role: row.pitched_role || null,
    };
    if (!map.has(row.user_id)) map.set(row.user_id, []);
    map.get(row.user_id)!.push(c);
  }
  return map;
}
async function matchedJobs(
  titles: string[],
  seniorityFilter: string[],
  workTypes: string[],
) {
  const { data, error } = await admin
    .rpc("search_jobs_by_role_titles", {
      p_role_titles: titles,
      p_limit: TOP_N,
      p_offset: 0,
      p_similarity_threshold: THRESHOLD,
      p_max_seniority: seniorityFilter,
      p_work_types: workTypes.length > 0 ? workTypes : null,
    })
    .select("title, company_name, seniority, apply_url");
  if (error) throw new Error(`search rpc: ${error.message}`);
  return (data || []) as Job[];
}
async function honestCount(
  titles: string[],
  seniorityFilter: string[],
  workTypes: string[],
) {
  const { data, error } = await admin.rpc("count_active_jobs_by_role_titles", {
    p_role_titles: titles,
    p_similarity_threshold: THRESHOLD,
    p_max_seniority: seniorityFilter,
    p_work_types: workTypes.length > 0 ? workTypes : null,
  });
  if (error) throw new Error(`count rpc: ${error.message}`);
  const n = Array.isArray(data) ? data[0] : data;
  return typeof n === "number" ? n : 0;
}

// ─── HTML (mobile-first, cream palette) ──────────────────────────────────
function esc(s: string) {
  return String(s || "").replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}
const SHELL = (
  inner: string,
) => `<!doctype html><html><body style="margin:0;padding:0;background:#faf6ef;">
<div style="max-width:480px;margin:0 auto;padding:24px 18px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2722;">
${inner}
<p style="font-size:11px;color:#9a9286;margin-top:28px;line-height:1.5;">You're getting this because you signed up for Get A Job. <a href="https://getajob.careers" style="color:#9a9286;">getajob.careers</a></p>
</div></body></html>`;
const BTN = (href: string, label: string) =>
  `<div style="text-align:center;margin-top:18px;"><a href="${href}" style="display:inline-block;background:#ff6b57;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:999px;padding:12px 26px;">${label}</a></div>`;
const KICKER = (t: string) =>
  `<div style="font-size:13px;font-weight:700;color:#ff6b57;letter-spacing:.04em;text-transform:uppercase;">${t}</div>`;
const H1 = (t: string) =>
  `<h1 style="font-size:22px;font-weight:800;margin:8px 0 4px;line-height:1.2;">${t}</h1>`;

// Improvement claims — VERIFIED only. NO LinkedIn/outreach/posts claim (that
// generator is still flagged bad; claiming it would be false).
const UPGRADES_HTML = `
<div style="background:#ffffff;border:1px solid #ece3d3;border-radius:12px;padding:14px 16px;margin:16px 0;">
  <div style="font-size:12px;font-weight:700;color:#2b2722;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">What's new</div>
  <ul style="margin:0;padding-left:18px;font-size:13px;color:#6b6358;line-height:1.7;">
    <li>Thousands of live Israeli-market jobs, refreshed nightly</li>
    <li>Shortened onboarding — done in a few minutes</li>
    <li>Your AI coach now sees the page you're on and answers from your real list</li>
    <li>CV generation upgraded to a stronger AI model</li>
    <li>Every tracked job links back to its original posting</li>
  </ul>
</div>`;
const UPGRADES_TEXT =
  "What's new:\n- Thousands of live Israeli-market jobs, refreshed nightly\n- Shortened onboarding — done in a few minutes\n- Your AI coach now sees the page you're on and answers from your real list\n- CV generation upgraded to a stronger AI model\n- Every tracked job links back to its original posting";

const SENIORITY_LABEL: Record<string, string> = {
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  director: "Director",
  executive: "Executive",
};
function jobCard(j: Job) {
  const sen = SENIORITY_LABEL[j.seniority] || j.seniority || "";
  return `<a href="${esc(j.apply_url)}" style="display:block;text-decoration:none;background:#ffffff;border:1px solid #ece3d3;border-radius:12px;padding:14px 16px;margin:10px 0;">
  <div style="font-size:15px;font-weight:700;color:#2b2722;line-height:1.3;">${esc(j.title)}</div>
  <div style="font-size:13px;color:#6b6358;margin-top:4px;">${esc(j.company_name)}${sen ? ` &middot; ${esc(sen)}` : ""}</div>
  <div style="font-size:12.5px;color:#ff6b57;font-weight:600;margin-top:8px;">View job &rarr;</div>
</a>`;
}
function companyCard(c: Company) {
  const why = c.why_fit
    ? esc(
        c.why_fit.length > 130
          ? c.why_fit.slice(0, 127).trimEnd() + "…"
          : c.why_fit,
      )
    : "";
  return `<div style="background:#ffffff;border:1px solid #ece3d3;border-radius:12px;padding:14px 16px;margin:10px 0;">
  <div style="display:flex;justify-content:space-between;align-items:baseline;">
    <div style="font-size:15px;font-weight:700;color:#2b2722;">${esc(c.name)}</div>
    <div style="font-size:11.5px;font-weight:700;color:#ff6b57;text-transform:uppercase;letter-spacing:.03em;">${esc(bandFit(c.match_score))}</div>
  </div>
  ${c.pitched_role ? `<div style="font-size:12.5px;color:#9a9286;margin-top:2px;">${esc(c.pitched_role)}</div>` : ""}
  ${why ? `<div style="font-size:13px;color:#6b6358;margin-top:6px;line-height:1.5;">${why}</div>` : ""}
</div>`;
}

function practicumHtml(firstName: string, companies: Company[]) {
  return SHELL(`${KICKER("Your practicum matches")}
${H1(`${esc(firstName)}, your matched companies are ready`)}
<p style="font-size:14px;color:#6b6358;margin:0 0 8px;line-height:1.5;">We matched you to companies for your practicum — hand-picked to your background and goal. Here are your top ${companies.length}.</p>
${companies.map(companyCard).join("")}
${BTN(INTERNSHIP_URL, "See your matched companies")}`);
}
function jobMatchesHtml(firstName: string, jobs: Job[], honestN: number) {
  const countLine =
    honestN > jobs.length
      ? `<p style="font-size:13px;color:#9a9286;margin:2px 0 0;line-height:1.4;">${bandCount(honestN)} live matches this week</p>`
      : "";
  return SHELL(`${KICKER("This week's matches")}
${H1(`${esc(firstName)}, ${jobs.length} jobs matched to you`)}
<p style="font-size:14px;color:#6b6358;margin:0 0 2px;line-height:1.5;">Hand-picked from your tracks and tuned to your level.</p>
${countLine}
${jobs.map(jobCard).join("")}
${BTN(CAREER_URL, "See all your matches")}`);
}
function neverOnboardedHtml(firstName: string) {
  return SHELL(`${KICKER("Pick up where you left off")}
${H1(`${esc(firstName)}, we found jobs for you`)}
<p style="font-size:14px;color:#6b6358;margin:0 0 8px;line-height:1.5;">We've shortened onboarding — it now takes just a few minutes. Finish it and you'll see live roles from the Israeli market, matched to your background and your goal.</p>
${UPGRADES_HTML}
${BTN(CAREER_URL, "Finish in a few minutes")}`);
}
function reactivationHtml(firstName: string) {
  return SHELL(`${KICKER("Your matches are waiting")}
${H1(`${esc(firstName)}, your job matches are waiting`)}
<p style="font-size:14px;color:#6b6358;margin:0 0 8px;line-height:1.5;">A lot has improved since you last visited. Come back and see what's matched to you now.</p>
${UPGRADES_HTML}
${BTN(CAREER_URL, "Open your matches")}`);
}

function subjectFor(r: Recipient) {
  switch (r.segment) {
    case "practicum":
      return `${r.firstName}, your matched companies are ready`;
    case "job_matches":
      return `${r.firstName}, ${r.jobs!.length} jobs matched to you this week`;
    case "never_onboarded":
      return `${r.firstName}, we found jobs for you — finish in a few minutes`;
    case "reactivation":
      return `${r.firstName}, your job matches are waiting`;
  }
}
function htmlFor(r: Recipient) {
  switch (r.segment) {
    case "practicum":
      return practicumHtml(r.firstName, r.companies!);
    case "job_matches":
      return jobMatchesHtml(r.firstName, r.jobs!, r.honestN!);
    case "never_onboarded":
      return neverOnboardedHtml(r.firstName);
    case "reactivation":
      return reactivationHtml(r.firstName);
  }
}
function plainText(r: Recipient) {
  switch (r.segment) {
    case "practicum": {
      const lines = (r.companies || [])
        .map(
          (c) =>
            `• ${c.name} (${bandFit(c.match_score)})${c.pitched_role ? " — " + c.pitched_role : ""}`,
        )
        .join("\n");
      return `${r.firstName}, your matched companies are ready:\n\n${lines}\n\nSee your matched companies: ${INTERNSHIP_URL}`;
    }
    case "job_matches": {
      const lines = (r.jobs || [])
        .map(
          (j) =>
            `• ${j.title} — ${j.company_name} (${SENIORITY_LABEL[j.seniority] || j.seniority})\n  ${j.apply_url}`,
        )
        .join("\n");
      const band =
        r.honestN! > r.jobs!.length
          ? `${bandCount(r.honestN!)} live matches this week. `
          : "";
      return `${r.firstName}, ${r.jobs!.length} jobs matched to you this week:\n\n${lines}\n\n${band}See all your matches: ${CAREER_URL}`;
    }
    case "never_onboarded":
      return `${r.firstName}, we found jobs for you. We've shortened onboarding — finish in a few minutes to see live roles matched to you.\n\n${UPGRADES_TEXT}\n\nFinish: ${CAREER_URL}`;
    case "reactivation":
      return `${r.firstName}, your job matches are waiting. A lot has improved since you last visited.\n\n${UPGRADES_TEXT}\n\nOpen your matches: ${CAREER_URL}`;
  }
}

async function resendSend(
  to: string,
  subject: string,
  html: string,
  text: string,
  idempotencyKey?: string,
) {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY missing" };
  const headers = new Headers({
    Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
    "Content-Type": "application/json",
  });
  if (idempotencyKey && /^[\x21-\x7e]+$/.test(idempotencyKey))
    headers.set("Idempotency-Key", idempotencyKey);
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
      text,
      reply_to: REPLY_TO,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok)
    return {
      ok: false,
      error: (await res.text().catch(() => "")).slice(0, 200),
      status: res.status,
    };
  const data = await res.json().catch(() => ({}) as any);
  return { ok: true, id: data?.id };
}

async function main() {
  const confirmed = CONFIRM === CONFIRM_PHRASE;

  const users = await listAllUsers();
  const eligible = users.filter(
    (u) =>
      u.email &&
      u.email_confirmed_at &&
      !u.email.includes("+") &&
      !INTERNAL.has(u.id),
  );
  const ids = eligible.map((u) => u.id);
  const [rolesMap, expMap, eduMap, ctMap] = await Promise.all([
    fetchByUser("career_roles", ids),
    fetchByUser("experiences", ids),
    fetchByUser("education", ids),
    companyTargetsFor(ids),
  ]);
  const profById = new Map<string, any>();
  {
    const { data } = await admin.from("profiles").select("*").in("id", ids);
    for (const p of data || []) profById.set(p.id, p);
  }

  const recipients: Recipient[] = [];
  for (const u of eligible) {
    const prof = profById.get(u.id) || {};
    const firstName = firstNameOf(prof.full_name);
    const base = { user_id: u.id, email: u.email!, firstName };

    // 1. PRACTICUM — has company_targets (highest precedence).
    const companies = ctMap.get(u.id) || [];
    if (companies.length > 0) {
      recipients.push({
        ...base,
        segment: "practicum",
        companies: companies.slice(0, TOP_N),
      });
      continue;
    }
    // 3. NEVER_ONBOARDED — confirmed but NO career_roles at all (any track).
    // (Having only non-track_1 roles still means they onboarded → reactivation.)
    const allRoles = rolesMap.get(u.id) || [];
    if (allRoles.length === 0) {
      recipients.push({ ...base, segment: "never_onboarded" });
      continue;
    }
    const experienceLevel = inferExperienceLevel(
      expMap.get(u.id) || [],
      eduMap.get(u.id) || [],
    );
    const roles = allRoles.filter((r: any) => r.track === "track_1" && r.title);
    roles.sort((a: any, b: any) => (b.match_score ?? 0) - (a.match_score ?? 0));
    const titles = roles.slice(0, MAX_TRACK_ROLES).map((r: any) => r.title);
    if (titles.length === 0) {
      // Onboarded but no track-1 titles → can't surface 3 jobs → reactivation.
      recipients.push({ ...base, segment: "reactivation", experienceLevel });
      continue;
    }
    const seniorityFilter = allowedSenioritiesForLevel(experienceLevel);
    const workTypes = Array.isArray(prof.work_type) ? prof.work_type : [];
    const [jobs, honestN] = await Promise.all([
      matchedJobs(titles, seniorityFilter, workTypes),
      honestCount(titles, seniorityFilter, workTypes),
    ]);
    if (jobs.length >= TOP_N) {
      // 2. JOB_MATCHES.
      recipients.push({
        ...base,
        segment: "job_matches",
        experienceLevel,
        jobs,
        honestN,
      });
    } else {
      // 4. REACTIVATION — onboarded but <3 matches.
      recipients.push({ ...base, segment: "reactivation", experienceLevel });
    }
  }

  const bySeg = (s: Segment) => recipients.filter((r) => r.segment === s);
  const segs: Segment[] = [
    "practicum",
    "job_matches",
    "never_onboarded",
    "reactivation",
  ];

  console.error(
    "╭─ REENGAGEMENT EMAIL — " +
      (confirmed ? "LIVE SEND" : "DRY RUN") +
      " ─────────────",
  );
  console.error(`│ eligible (confirmed, non-internal): ${eligible.length}`);
  for (const s of segs) console.error(`│   ${s.padEnd(16)} ${bySeg(s).length}`);
  console.error("│");
  // a couple sample users per segment
  for (const s of segs) {
    const rs = bySeg(s);
    console.error(`│ ── ${s} (${rs.length}) ──`);
    for (const r of rs.slice(0, 2)) {
      if (s === "job_matches") {
        console.error(
          `│  [${r.email}] ${r.firstName}/${r.experienceLevel}, honest=${r.honestN} → "${bandCount(r.honestN!)}"`,
        );
        for (const j of r.jobs!)
          console.error(
            `│      • ${j.title} — ${j.company_name} [${j.seniority}]`,
          );
      } else if (s === "practicum") {
        console.error(`│  [${r.email}] ${r.firstName}`);
        for (const c of r.companies!)
          console.error(
            `│      • ${c.name} (${bandFit(c.match_score)})${c.pitched_role ? " — " + c.pitched_role : ""}`,
          );
      } else {
        console.error(`│  [${r.email}] ${r.firstName}`);
      }
    }
  }
  console.error("╰──────────────────────────────────────────────────────────");

  if (bySeg("practicum").length === 0) {
    console.error(
      "\n⚠ PRACTICUM routes 0 eligible users — NO eligible user has company_targets.",
    );
    console.error(
      "  (Only elienglard34 [internal] + a +test seed have them.) The 4 practicum-flagged",
    );
    console.error(
      "  users [practicum_path set] have EMPTY company_targets — generate them first to send.",
    );
  }

  if (!confirmed) {
    // 4 previews — one per segment. Practicum is rendered from the only
    // account with data (illustrative), since no eligible user has targets.
    const sampleForPreview: Record<Segment, Recipient | null> = {
      practicum: bySeg("practicum")[0] || null,
      job_matches: bySeg("job_matches")[0] || null,
      never_onboarded: bySeg("never_onboarded")[0] || null,
      reactivation: bySeg("reactivation")[0] || null,
    };
    if (!sampleForPreview.practicum) {
      const { data } = await admin
        .from("company_targets")
        .select("match_score, match_rationale, pitched_role, companies(name)")
        .eq("user_id", PRACTICUM_PREVIEW_USER)
        .order("match_score", { ascending: false, nullsFirst: false })
        .limit(TOP_N);
      const companies: Company[] = ((data as any[]) || []).map((row) => ({
        name: row.companies?.name || "—",
        match_score: row.match_score,
        why_fit: String(row.match_rationale || ""),
        pitched_role: row.pitched_role || null,
      }));
      if (companies.length) {
        sampleForPreview.practicum = {
          user_id: PRACTICUM_PREVIEW_USER,
          email: "(illustrative — no eligible practicum user yet)",
          firstName: "Eli",
          segment: "practicum",
          companies,
        };
      }
    }
    console.error("");
    for (const s of segs) {
      const r = sampleForPreview[s];
      if (!r) {
        console.error(`Preview ${s}: (no sample available)`);
        continue;
      }
      const path = `/tmp/reengage-preview-${s}.html`;
      writeFileSync(path, htmlFor(r));
      console.error(`Preview ${s} (${r.email}) → ${path}`);
      if (TEST_PREVIEW_EMAIL && RESEND_API_KEY) {
        const res = await resendSend(
          TEST_PREVIEW_EMAIL,
          `[PREVIEW ${s}] ` + subjectFor(r),
          htmlFor(r),
          plainText(r),
        );
        console.error(
          `   emailed → ${TEST_PREVIEW_EMAIL}: ${res.ok ? "sent " + res.id : "FAILED " + res.error}`,
        );
      }
    }
    if (!RESEND_API_KEY)
      console.error(
        "\n(no RESEND_API_KEY — wrote HTML files only; open them locally)",
      );
    console.error(
      `\nDRY RUN — no recipient emails sent. To send for real:\n  CONFIRM=${CONFIRM_PHRASE} ... npx tsx scripts/reengage-email-dryrun.ts`,
    );
    process.exit(0);
  }

  // ── live send ──
  console.error("\n→ SENDING…");
  let ok = 0,
    fail = 0;
  for (const r of recipients) {
    const res = await resendSend(
      r.email,
      subjectFor(r),
      htmlFor(r),
      plainText(r),
      `${CAMPAIGN}:${r.user_id}`,
    );
    if (res.ok) {
      ok++;
      console.error(`  ✓ [${r.segment}] ${r.email} ${res.id || ""}`);
    } else {
      fail++;
      console.error(`  ✗ [${r.segment}] ${r.email}: ${res.error}`);
    }
    await new Promise((res2) => setTimeout(res2, SEND_GAP_MS));
  }
  console.error(
    `\nDone: ${ok} sent, ${fail} failed (idempotencyKey ${CAMPAIGN}:<user_id>).`,
  );
}

main().catch((e) => {
  console.error("FATAL:", e?.message || e);
  process.exit(1);
});

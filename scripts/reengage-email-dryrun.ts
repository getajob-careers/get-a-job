// scripts/reengage-email-dryrun.ts
//
// Reengagement email — DRY-RUN by default; sends only with an explicit
// confirm phrase. Same safety shape as scripts/delete-demo-seeds.mjs
// (dry-run default → explicit CONFIRM phrase → throttled, idempotent run).
//
// Audience (confirmed, non-internal): internal excluded via the shared
// INTERNAL_USER_IDS allowlist AND the email LIKE '%+%' convention.
//   Segment A — has career_roles: personalized, top 3 matched jobs.
//   Segment B — no career_roles / never onboarded: generic re-activation.
//
// CRITICAL: the matched-jobs block reuses the EXACT post-#314 path —
// search_jobs_by_role_titles with the user's track-1 titles + their LOADED
// seniority allow-list (allowedSenioritiesForLevel ∘ inferExperienceLevel,
// the same frontend logic, imported) + p_work_types; and the honest
// remaining count comes from the NEW count RPC with the SAME params (NOT the
// unfiltered universe). <3 matches → fall back to Segment B copy, never an
// empty or padded list.
//
// RUN (zsh, from repo root):
//   # dry run (default) — prints per-recipient plan + sends 2 HTML previews:
//   SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
//   RESEND_API_KEY="$RESEND_API_KEY" TEST_PREVIEW_EMAIL="eli@getajob.careers" \
//     npx tsx scripts/reengage-email-dryrun.ts
//   # real send (after Eli confirms):
//   CONFIRM=SEND-REENGAGE-2026-06 SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
//   RESEND_API_KEY="$RESEND_API_KEY" npx tsx scripts/reengage-email-dryrun.ts

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
const RESEND_ENDPOINT = "https://api.resend.com/emails";

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

interface Job {
  title: string;
  company_name: string;
  seniority: string;
  apply_url: string;
}
interface Recipient {
  user_id: string;
  email: string;
  firstName: string;
  segment: "A" | "B";
  experienceLevel?: string;
  jobs?: Job[];
  honestN?: number;
  remaining?: number;
}

function firstNameOf(fullName: string | null | undefined): string {
  const n = String(fullName || "")
    .trim()
    .split(/\s+/)[0];
  return n || "there";
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
    const k = row.user_id;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
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
const SHELL = (
  inner: string,
) => `<!doctype html><html><body style="margin:0;padding:0;background:#faf6ef;">
<div style="max-width:480px;margin:0 auto;padding:24px 18px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2722;">
${inner}
<p style="font-size:11px;color:#9a9286;margin-top:28px;line-height:1.5;">You're getting this because you signed up for Get A Job. <a href="https://getajob.careers" style="color:#9a9286;">getajob.careers</a></p>
</div></body></html>`;

function esc(s: string) {
  return String(s || "").replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}
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

// Banded count — "50+" above 50, exact below; NEVER a raw 3-digit "+888"
// (reads as spam, undercuts the hand-picked feel). The honest count is still
// computed (post-filter); only the DISPLAY is banded.
function bandCount(n: number): string {
  return n > 50 ? "50+" : String(n);
}

function segmentAHtml(firstName: string, jobs: Job[], honestN: number) {
  const cards = jobs.map(jobCard).join("");
  const countLine =
    honestN > jobs.length
      ? `<p style="font-size:13px;color:#9a9286;margin:2px 0 0;line-height:1.4;">${bandCount(honestN)} live matches this week</p>`
      : "";
  return SHELL(`
<div style="font-size:13px;font-weight:700;color:#ff6b57;letter-spacing:.04em;text-transform:uppercase;">This week's matches</div>
<h1 style="font-size:22px;font-weight:800;margin:8px 0 4px;line-height:1.2;">${esc(firstName)}, ${jobs.length} jobs matched to you</h1>
<p style="font-size:14px;color:#6b6358;margin:0 0 2px;line-height:1.5;">Hand-picked from your tracks and tuned to your level.</p>
${countLine}
${cards}
<div style="text-align:center;margin-top:18px;">
  <a href="${CAREER_URL}" style="display:inline-block;background:#ff6b57;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:999px;padding:12px 26px;">See all your matches</a>
</div>`);
}

function segmentBHtml(firstName: string) {
  return SHELL(`
<div style="font-size:13px;font-weight:700;color:#ff6b57;letter-spacing:.04em;text-transform:uppercase;">Pick up where you left off</div>
<h1 style="font-size:22px;font-weight:800;margin:8px 0 4px;line-height:1.2;">${esc(firstName)}, your job matches are waiting</h1>
<p style="font-size:14px;color:#6b6358;margin:0 0 16px;line-height:1.5;">You're one step away. Finish your career analysis and we'll match you to live roles in the Israeli market — tuned to your background and your goal.</p>
<div style="text-align:center;margin-top:6px;">
  <a href="${CAREER_URL}" style="display:inline-block;background:#ff6b57;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:999px;padding:12px 26px;">Build my matches</a>
</div>`);
}

function plainText(r: Recipient) {
  if (r.segment === "A") {
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
  return `${r.firstName}, your job matches are waiting. Finish your career analysis to see live roles tuned to you: ${CAREER_URL}`;
}

function subjectFor(r: Recipient) {
  return r.segment === "A"
    ? `${r.firstName}, ${r.jobs!.length} jobs matched to you this week`
    : `${r.firstName}, your job matches are waiting`;
}
function htmlFor(r: Recipient) {
  return r.segment === "A"
    ? segmentAHtml(r.firstName, r.jobs!, r.honestN!)
    : segmentBHtml(r.firstName);
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

  // ── audience ──
  const users = await listAllUsers();
  const eligible = users.filter(
    (u) =>
      u.email &&
      u.email_confirmed_at &&
      !u.email.includes("+") &&
      !INTERNAL.has(u.id),
  );
  const ids = eligible.map((u) => u.id);
  const [rolesMap, expMap, eduMap] = await Promise.all([
    fetchByUser("career_roles", ids),
    fetchByUser("experiences", ids),
    fetchByUser("education", ids),
  ]);
  // profiles are keyed by `id` (== user id), not `user_id`.
  const profById = new Map<string, any>();
  {
    const { data } = await admin.from("profiles").select("*").in("id", ids);
    for (const p of data || []) profById.set(p.id, p);
  }

  const recipients: Recipient[] = [];
  for (const u of eligible) {
    const prof = profById.get(u.id) || {};
    const firstName = firstNameOf(prof.full_name);
    const roles = (rolesMap.get(u.id) || []).filter(
      (r: any) => r.track === "track_1" && r.title,
    );
    roles.sort((a: any, b: any) => (b.match_score ?? 0) - (a.match_score ?? 0));
    const titles = roles.slice(0, MAX_TRACK_ROLES).map((r: any) => r.title);

    if (titles.length === 0) {
      recipients.push({
        user_id: u.id,
        email: u.email!,
        firstName,
        segment: "B",
      });
      continue;
    }
    const experiences = expMap.get(u.id) || [];
    const educations = eduMap.get(u.id) || [];
    const experienceLevel = inferExperienceLevel(experiences, educations);
    const seniorityFilter = allowedSenioritiesForLevel(experienceLevel); // track-1: no track_3 bypass
    const workTypes = Array.isArray(prof.work_type) ? prof.work_type : [];

    const [jobs, honestN] = await Promise.all([
      matchedJobs(titles, seniorityFilter, workTypes),
      honestCount(titles, seniorityFilter, workTypes),
    ]);

    if (jobs.length < TOP_N) {
      // Fallback: never an empty/padded list — send the Segment B copy.
      recipients.push({
        user_id: u.id,
        email: u.email!,
        firstName,
        segment: "B",
        experienceLevel,
      });
    } else {
      recipients.push({
        user_id: u.id,
        email: u.email!,
        firstName,
        segment: "A",
        experienceLevel,
        jobs,
        honestN,
        remaining: Math.max(0, honestN - jobs.length),
      });
    }
  }

  const segA = recipients.filter((r) => r.segment === "A");
  const segB = recipients.filter((r) => r.segment === "B");

  // ── dry-run report ──
  console.error(
    "╭─ REENGAGEMENT EMAIL — " +
      (confirmed ? "LIVE SEND" : "DRY RUN") +
      " ──────────────────",
  );
  console.error(`│ eligible (confirmed, non-internal): ${eligible.length}`);
  console.error(
    `│ Segment A (top-3 jobs): ${segA.length}   Segment B (re-activation): ${segB.length}`,
  );
  console.error("│");
  for (const r of segA) {
    console.error(
      `│ [A] ${r.email}  (${r.firstName}, level=${r.experienceLevel}, honest=${r.honestN} → email shows "${bandCount(r.honestN!)}")`,
    );
    for (const j of r.jobs!)
      console.error(
        `│       • ${j.title} — ${j.company_name} [${j.seniority}]  ${j.apply_url}`,
      );
  }
  console.error("│");
  for (const r of segB) console.error(`│ [B] ${r.email}  (${r.firstName})`);
  console.error("╰──────────────────────────────────────────────────────────");

  if (!confirmed) {
    // 2 rendered previews (one per segment). Always write them to disk so
    // they're viewable without Resend; ALSO email them to the test address
    // when RESEND_API_KEY + TEST_PREVIEW_EMAIL are set.
    const a = segA[0],
      b = segB[0];
    const previews: Array<{ tag: string; r: Recipient }> = [];
    if (a) previews.push({ tag: "A", r: a });
    if (b) previews.push({ tag: "B", r: b });
    console.error("");
    for (const { tag, r } of previews) {
      const path = `/tmp/reengage-preview-${tag}.html`;
      writeFileSync(path, htmlFor(r));
      console.error(`Preview ${tag} (${r.email}) → ${path}`);
      if (TEST_PREVIEW_EMAIL && RESEND_API_KEY) {
        const res = await resendSend(
          TEST_PREVIEW_EMAIL,
          `[PREVIEW ${tag}] ` + subjectFor(r),
          htmlFor(r),
          plainText(r),
        );
        console.error(
          `   emailed → ${TEST_PREVIEW_EMAIL}: ${res.ok ? "sent " + res.id : "FAILED " + res.error}`,
        );
      }
    }
    if (!RESEND_API_KEY) {
      console.error(
        "\n(no RESEND_API_KEY — wrote HTML files only; set RESEND_API_KEY + TEST_PREVIEW_EMAIL to email the previews)",
      );
    }
    console.error(
      `\nDRY RUN — no recipient emails sent. To send for real:\n  CONFIRM=${CONFIRM_PHRASE} ... npx tsx scripts/reengage-email-dryrun.ts`,
    );
    process.exit(0);
  }

  // ── live send (gentle throttle + per-recipient idempotency) ──
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

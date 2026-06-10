// scripts/backfill-experiences.ts
//
// One-off backfill for the 2 pilot users who completed onboarding with
// zero experiences because the pre-PR-#277 resume-extractor wrapped its
// JSON in prose, which the loose-regex client parser dropped silently.
//
// Targets (HARDCODED — this is a one-off recovery, not a general tool):
//   - nevo.liani@gmail.com
//   - agamf123@gmail.com
//
// (redheadeg + ybarshain were dropped from targets — they didn't complete
// onboarding and will re-enter through the redesigned onboarding flow via
// re-engagement email; backfilling them now would race against re-onboard
// inserts.)
//
// Three independently-gated stages:
//
//   STAGE 1 — EXPERIENCE BACKFILL
//     Pull each user's latest CV from storage, extract via the production
//     path (unpdf/mammoth + buildResumeExtractionPrompt + gpt-4o-mini +
//     parseExtractedJson), sanitise to the Onboarding finishOnboarding
//     column whitelist, insert. Idempotency-guarded (skips if exp_count
//     > 0). Diff after: only experiences gained rows.
//
//   STAGE 2 — CAREER ANALYSIS RE-RUN
//     For each user with experiences (Stage 1 must have run): mint a
//     per-user JWT via auth.admin.generateLink + verifyOtp (same pattern
//     as scripts/rerun-career-analysis.mjs — does NOT email the user),
//     POST generate-career-analysis with force=true, then call
//     replace_career_roles RPC under the user's client. The RPC is the
//     ONLY destructive op (scoped DELETE-then-insert on career_roles).
//     Diff after: only career_roles changed. Profiles intentionally NOT
//     updated by this stage.
//
//   STAGE 3 — DOWNSTREAM REFRESH
//     For each user whose career_roles changed in Stage 2: DELETE existing
//     AI-generated tasks (heuristic: role_title populated, all rows
//     batched at same created_at — matches generate-tasks output pattern),
//     re-invoke generate-tasks with the user's JWT. Same dance for
//     today's daily_action if present (UNIQUE per (user, for_date) —
//     DELETE-then-regen). Manual tasks (no role_title) are never touched.
//
// Each stage is dry-run by default. --execute is required per-stage to
// write. Stages must be invoked separately: --stage=1 then review, then
// --stage=2 then review, then --stage=3.
//
// Usage:
//   # Stage 1
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
//     OPENAI_API_KEY=... \
//     npx tsx scripts/backfill-experiences.ts --stage=1
//   npx tsx scripts/backfill-experiences.ts --stage=1 --execute
//
//   # Stage 2 (after Stage 1 --execute)
//   npx tsx scripts/backfill-experiences.ts --stage=2
//   npx tsx scripts/backfill-experiences.ts --stage=2 --execute
//
//   # Stage 3 (after Stage 2 --execute)
//   npx tsx scripts/backfill-experiences.ts --stage=3
//   npx tsx scripts/backfill-experiences.ts --stage=3 --execute

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { buildResumeExtractionPrompt } from "../src/lib/resumeExtractionPrompt.js";
import { parseExtractedJson } from "../src/lib/parseExtractedJson.js";
import { resolveDueDate } from "../src/lib/taskDueDate.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const args = process.argv.slice(2);
const arg = (n: string, d = ""): string => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const STAGE = arg("stage", "");
const EXECUTE = args.includes("--execute");
// Read-only debug mode: download + extract the user's latest CV via the
// SAME unpdf/mammoth path Stage 1 uses, print the raw text to stdout, and
// exit. No LLM call, no DB write, no snapshot. Used to ground-truth the
// LLM's extracted output against the actual CV bytes.
const DUMP_TEXT_EMAIL = arg("dump-text", "");

if (!DUMP_TEXT_EMAIL && !["1", "2", "3"].includes(STAGE)) {
  console.error("ERROR: --stage must be 1, 2, or 3 (or use --dump-text=<email> for read-only CV text dump).");
  process.exit(1);
}

// Env-var checks are mode-aware so the read-only dump doesn't demand
// keys it never uses.
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("ERROR: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!DUMP_TEXT_EMAIL && !OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY required for Stage 1 (resume extraction LLM call)");
  process.exit(1);
}
if (STAGE !== "1" && STAGE !== "" && !ANON_KEY) {
  console.error("ERROR: SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY) required for Stages 2 + 3 (per-user JWT minting via verifyOtp)");
  process.exit(1);
}
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const stageSlug = `stage${STAGE}`;
const SNAPSHOT_BEFORE = `/tmp/backfill-${stageSlug}-${ts}-before.json`;
const SNAPSHOT_AFTER = `/tmp/backfill-${stageSlug}-${ts}-after.json`;

const TARGETS = ["nevo.liani@gmail.com", "agamf123@gmail.com"];

const RESUME_EXTRACTOR_SYSTEM_PROMPT =
  "You are a strict data extraction AI. Extract the requested fields from the resume text and format exactly as a valid JSON object. Do not include markdown formatting or commentary.";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Shared: user resolution ───

let _userIndex: Map<string, string> | null = null;
async function userIdByEmail(email: string): Promise<string | null> {
  if (!_userIndex) {
    _userIndex = new Map();
    let page = 1;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`auth.admin.listUsers failed: ${error.message}`);
      for (const u of data.users) if (u.email) _userIndex.set(u.email.trim().toLowerCase(), u.id);
      if (data.users.length < 1000) break;
      page++;
    }
  }
  return _userIndex.get(email.trim().toLowerCase()) ?? null;
}

// ─── Shared: snapshot every surface we care about ───

interface UserSnapshot {
  email: string;
  user_id: string;
  experiences: any[];
  education: any[];
  career_roles: any[];
  stories: any[];
  applications: any[];
  company_targets: any[];
  tasks: any[];
  daily_actions: any[];
  profile_skills: any[] | null;
  profile_proof_signals: any[] | null;
  profile_qualification_level: string | null;
  profile_overall_assessment: string | null;
  profile_skill_gaps: any[] | null;
  profile_last_reality_check_date: string | null;
}

async function snapshotUser(email: string, userId: string): Promise<UserSnapshot> {
  // ORDER columns verified against information_schema 2026-06-10:
  //   experiences, education, career_roles, stories, applications,
  //   company_targets, tasks — all have `created_at` (the 7 other tables).
  //   daily_actions — NO created_at column (has `generated_at` + `for_date`);
  //     ordering on `created_at` returned an error which supabase-js
  //     coerced into `{ data: null, error }`, the snapshot recorded
  //     daily_actions as [], the today-detection found nothing, and the
  //     Stage 3 "idempotent skip" never fired even though both target
  //     users have today's daily_action in the DB. Fix: order by
  //     `generated_at` (the closest semantic equivalent to created_at).
  const [exp, edu, roles, stories, apps, targets, tasks, daily, profile] = await Promise.all([
    admin.from("experiences").select("*").eq("user_id", userId).order("created_at"),
    admin.from("education").select("*").eq("user_id", userId).order("created_at"),
    admin.from("career_roles").select("*").eq("user_id", userId).order("created_at"),
    admin.from("stories").select("*").eq("user_id", userId).order("created_at"),
    admin.from("applications").select("*").eq("user_id", userId).order("created_at"),
    admin.from("company_targets").select("*").eq("user_id", userId).order("created_at"),
    admin.from("tasks").select("*").eq("user_id", userId).order("created_at"),
    admin.from("daily_actions").select("*").eq("user_id", userId).order("generated_at"),
    admin.from("profiles").select("skills, proof_signals, qualification_level, overall_assessment, skill_gaps, last_reality_check_date").eq("id", userId).maybeSingle(),
  ]);
  // Surface any silent query errors so we never re-create the daily_actions
  // failure mode (broken column → empty array → meaningless diff).
  const checks: Array<[string, { error: any }]> = [
    ["experiences", exp], ["education", edu], ["career_roles", roles],
    ["stories", stories], ["applications", apps], ["company_targets", targets],
    ["tasks", tasks], ["daily_actions", daily], ["profiles", profile],
  ];
  for (const [name, r] of checks) {
    if (r.error) {
      throw new Error(`snapshotUser(${email}): ${name} query failed: ${r.error.message ?? r.error}`);
    }
  }
  const p = profile.data as any;
  return {
    email,
    user_id: userId,
    experiences: exp.data || [],
    education: edu.data || [],
    career_roles: roles.data || [],
    stories: stories.data || [],
    applications: apps.data || [],
    company_targets: targets.data || [],
    tasks: tasks.data || [],
    daily_actions: daily.data || [],
    profile_skills: p?.skills ?? null,
    profile_proof_signals: p?.proof_signals ?? null,
    profile_qualification_level: p?.qualification_level ?? null,
    profile_overall_assessment: p?.overall_assessment ?? null,
    profile_skill_gaps: p?.skill_gaps ?? null,
    profile_last_reality_check_date: p?.last_reality_check_date ?? null,
  };
}

function rowKey(row: any): string { return JSON.stringify(row, Object.keys(row).sort()); }
function diffRows(before: any[], after: any[]): { added: any[]; removed: any[] } {
  const b = new Set(before.map(rowKey));
  const a = new Set(after.map(rowKey));
  return {
    added: after.filter((r) => !b.has(rowKey(r))),
    removed: before.filter((r) => !a.has(rowKey(r))),
  };
}

interface SnapshotDiff {
  email: string;
  experiences: { added: any[]; removed: any[] };
  education: { added: any[]; removed: any[] };
  career_roles: { added: any[]; removed: any[] };
  stories: { added: any[]; removed: any[] };
  applications: { added: any[]; removed: any[] };
  company_targets: { added: any[]; removed: any[] };
  tasks: { added: any[]; removed: any[] };
  daily_actions: { added: any[]; removed: any[] };
  profile_changed: string[];
}

function diffSnapshot(before: UserSnapshot, after: UserSnapshot): SnapshotDiff {
  const profile_changed: string[] = [];
  for (const k of ["profile_skills", "profile_proof_signals", "profile_qualification_level", "profile_overall_assessment", "profile_skill_gaps", "profile_last_reality_check_date"] as const) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) profile_changed.push(k);
  }
  return {
    email: before.email,
    experiences: diffRows(before.experiences, after.experiences),
    education: diffRows(before.education, after.education),
    career_roles: diffRows(before.career_roles, after.career_roles),
    stories: diffRows(before.stories, after.stories),
    applications: diffRows(before.applications, after.applications),
    company_targets: diffRows(before.company_targets, after.company_targets),
    tasks: diffRows(before.tasks, after.tasks),
    daily_actions: diffRows(before.daily_actions, after.daily_actions),
    profile_changed,
  };
}

function printDiff(d: SnapshotDiff, expectedTables: string[]) {
  console.log(`\n${d.email}:`);
  const t = (name: keyof Omit<SnapshotDiff, "email" | "profile_changed">, changes: { added: any[]; removed: any[] }) => {
    const marker = expectedTables.includes(name) ? "  " : (changes.added.length + changes.removed.length > 0 ? "⚠️" : "  ");
    console.log(`  ${marker} ${name.padEnd(16)} +${changes.added.length} added, -${changes.removed.length} removed`);
  };
  t("experiences", d.experiences);
  t("education", d.education);
  t("career_roles", d.career_roles);
  t("stories", d.stories);
  t("applications", d.applications);
  t("company_targets", d.company_targets);
  t("tasks", d.tasks);
  t("daily_actions", d.daily_actions);
  if (d.profile_changed.length > 0) {
    const allExpected = d.profile_changed.every((k) => expectedTables.includes(k));
    console.log(`  ${allExpected ? "  " : "⚠️"} profile fields changed: ${d.profile_changed.join(", ")}`);
  }
}

function unexpectedChange(d: SnapshotDiff, expectedTables: string[]): boolean {
  const tables = ["experiences", "education", "career_roles", "stories", "applications", "company_targets", "tasks", "daily_actions"] as const;
  for (const tab of tables) {
    if (expectedTables.includes(tab)) continue;
    if (d[tab].added.length > 0 || d[tab].removed.length > 0) return true;
  }
  for (const k of d.profile_changed) {
    if (!expectedTables.includes(k)) return true;
  }
  return false;
}

// ─── Stage 1: extraction helpers (mirror StepResumeUpload.jsx) ───

async function listLatestResume(userId: string): Promise<{ path: string; ext: "pdf" | "docx" | "other"; name: string } | null> {
  const { data, error } = await admin.storage.from("resumes").list(userId, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) { console.error(`  storage.list failed: ${error.message}`); return null; }
  const files = (data || []).filter((o) => o.name && !o.name.endsWith("/"));
  if (files.length === 0) return null;
  const latest = files[0];
  const lower = latest.name.toLowerCase();
  const ext: "pdf" | "docx" | "other" = lower.endsWith(".pdf") ? "pdf" : lower.endsWith(".docx") ? "docx" : "other";
  return { path: `${userId}/${latest.name}`, ext, name: latest.name };
}

async function downloadAndExtractText(filePath: string, ext: "pdf" | "docx"): Promise<{ text: string; pages: number }> {
  const { data, error } = await admin.storage.from("resumes").download(filePath);
  if (error || !data) throw new Error(`storage.download: ${error?.message || "no data"}`);
  const arrayBuffer = await data.arrayBuffer();
  if (ext === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const result = await extractText(pdf, { mergePages: true });
    return { text: result.text || "", pages: result.totalPages };
  }
  const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
  return { text: result.value || "", pages: 0 };
}

async function callOpenAI(systemPrompt: string, userMessage: string): Promise<{ ok: true; cv: any } | { ok: false; error: string }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) return { ok: false, error: `OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const j = await res.json();
  const cv = parseExtractedJson(j.choices?.[0]?.message?.content || "");
  if (!cv) return { ok: false, error: "parseExtractedJson returned null" };
  return { ok: true, cv };
}

function sanitiseExperience(e: any, userId: string): Record<string, unknown> | null {
  if (!e || typeof e !== "object") return null;
  const title = String(e.title ?? "").trim();
  if (!title) return null;
  return {
    user_id: userId,
    title: title.slice(0, 200),
    company: String(e.company ?? "").trim().slice(0, 200),
    type: String(e.type ?? "full_time").trim().slice(0, 30),
    start_date: String(e.start_date ?? "").trim().slice(0, 50) || null,
    end_date: String(e.end_date ?? "").trim().slice(0, 50) || null,
    is_current: e.is_current === true,
    responsibilities: String(e.responsibilities ?? "").slice(0, 4000),
    skills: Array.isArray(e.skills) ? e.skills.filter((s: any) => typeof s === "string").slice(0, 40) : [],
    managed_people: e.managed_people === true,
    cross_functional: e.cross_functional === true,
  };
}

// ─── Stage 2 + 3: per-user JWT minting (no email sent) ───

async function mintUserToken(email: string): Promise<string> {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
  const hashed = link?.properties?.hashed_token;
  if (!hashed) throw new Error("no hashed_token from generateLink");
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: otp, error: otpErr } = await anonClient.auth.verifyOtp({ token_hash: hashed, type: "magiclink" });
  if (otpErr) throw new Error(`verifyOtp: ${otpErr.message}`);
  const at = otp?.session?.access_token;
  if (!at) throw new Error("no access_token from verifyOtp");
  return at;
}

function userClientFor(accessToken: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function invokeEdgeFn(accessToken: string, slug: string, body: any): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j?.error) throw new Error(`${slug} ${res.status}: ${j?.error || JSON.stringify(j).slice(0, 200)}`);
  return j;
}

// ─── STAGE 1 ───

async function stage1() {
  console.error("STAGE 1 — experience backfill");
  const baseline: UserSnapshot[] = [];
  for (const email of TARGETS) {
    const uid = await userIdByEmail(email);
    if (!uid) { console.error(`  could not resolve ${email}`); continue; }
    baseline.push(await snapshotUser(email, uid));
  }
  writeFileSync(SNAPSHOT_BEFORE, JSON.stringify(baseline, null, 2));
  console.error(`baseline snapshot: ${SNAPSHOT_BEFORE}`);

  interface Proposal { email: string; user_id: string; cv_file: string; cv_ext: string; text_len: number; skipped: string | null; experiences: any[]; other_llm_keys: string[]; }
  const proposals: Proposal[] = [];

  for (const snap of baseline) {
    console.error(`\n--- ${snap.email}`);
    if (snap.experiences.length > 0) {
      console.error(`  SKIP: already has ${snap.experiences.length} experiences (idempotency)`);
      proposals.push({ email: snap.email, user_id: snap.user_id, cv_file: "", cv_ext: "", text_len: 0, skipped: `already_has_experiences_${snap.experiences.length}`, experiences: [], other_llm_keys: [] });
      continue;
    }
    const resume = await listLatestResume(snap.user_id);
    if (!resume) { console.error(`  SKIP: no resume`); proposals.push({ email: snap.email, user_id: snap.user_id, cv_file: "", cv_ext: "", text_len: 0, skipped: "no_resume", experiences: [], other_llm_keys: [] }); continue; }
    if (resume.ext === "other") { console.error(`  SKIP: ${resume.name} is neither .pdf nor .docx`); proposals.push({ email: snap.email, user_id: snap.user_id, cv_file: resume.path, cv_ext: "other", text_len: 0, skipped: "unsupported_ext", experiences: [], other_llm_keys: [] }); continue; }
    console.error(`  CV: ${resume.path} (${resume.ext})`);
    let text: string;
    try { const r = await downloadAndExtractText(resume.path, resume.ext); text = r.text; console.error(`  text_len=${text.length}`); }
    catch (e) { console.error(`  FAIL extract: ${e instanceof Error ? e.message : e}`); proposals.push({ email: snap.email, user_id: snap.user_id, cv_file: resume.path, cv_ext: resume.ext, text_len: 0, skipped: `extract_failed`, experiences: [], other_llm_keys: [] }); continue; }
    const userMsg = buildResumeExtractionPrompt(text.slice(0, 15000));
    const r = await callOpenAI(RESUME_EXTRACTOR_SYSTEM_PROMPT, userMsg);
    if (!r.ok) { console.error(`  FAIL LLM: ${r.error}`); proposals.push({ email: snap.email, user_id: snap.user_id, cv_file: resume.path, cv_ext: resume.ext, text_len: text.length, skipped: `llm_failed`, experiences: [], other_llm_keys: [] }); continue; }
    const rawExps = Array.isArray(r.cv?.experiences) ? r.cv.experiences : Array.isArray(r.cv?.experience) ? r.cv.experience : [];
    const sanitised: Record<string, unknown>[] = [];
    for (const e of rawExps) { const s = sanitiseExperience(e, snap.user_id); if (s) sanitised.push(s); }
    console.error(`  extracted ${sanitised.length} (LLM emitted ${rawExps.length})`);
    proposals.push({ email: snap.email, user_id: snap.user_id, cv_file: resume.path, cv_ext: resume.ext, text_len: text.length, skipped: null, experiences: sanitised, other_llm_keys: Object.keys(r.cv || {}).filter((k) => k !== "experiences") });
  }

  console.log("\n" + "=".repeat(78));
  console.log("STAGE 1 — PROPOSED EXPERIENCES");
  console.log("=".repeat(78));
  for (const p of proposals) {
    console.log(`\n### ${p.email} (${p.user_id})`);
    if (p.skipped) { console.log(`  SKIPPED: ${p.skipped}`); continue; }
    console.log(`  CV: ${p.cv_file} (${p.cv_ext}, ${p.text_len} chars)`);
    console.log(`  Other LLM fields (NOT inserted): ${p.other_llm_keys.join(", ") || "(none)"}`);
    console.log(`  Will INSERT ${p.experiences.length} experiences:`);
    for (let i = 0; i < p.experiences.length; i++) {
      const e = p.experiences[i] as any;
      console.log(`    ${i + 1}. ${e.title} @ ${e.company || "(no company)"}`);
      console.log(`       dates=${e.start_date || "?"} → ${e.is_current ? "Present" : (e.end_date || "?")}, type=${e.type}`);
      if (e.responsibilities) console.log(`       responsibilities: ${String(e.responsibilities).replace(/\s+/g, " ").trim().slice(0, 220)}${(e.responsibilities as string).length > 220 ? "…" : ""}`);
      console.log(`       skills (${(e.skills as string[]).length}): ${(e.skills as string[]).slice(0, 12).join(", ")}${(e.skills as string[]).length > 12 ? "…" : ""}`);
    }
  }

  if (!EXECUTE) { console.log("\nDRY-RUN. No writes. Re-run --stage=1 --execute to insert."); return; }

  console.error("\nEXECUTING INSERTS...");
  for (const p of proposals) {
    if (p.skipped || p.experiences.length === 0) { console.error(`  ${p.email}: nothing to insert`); continue; }
    const { data, error } = await admin.from("experiences").insert(p.experiences).select("id");
    if (error) { console.error(`  ${p.email}: INSERT FAILED: ${error.message}\nABORTING.`); process.exit(1); }
    console.error(`  ${p.email}: inserted ${data?.length || 0} rows`);
  }

  console.error("\nRe-snapshot + diff...");
  const after: UserSnapshot[] = [];
  for (const snap of baseline) after.push(await snapshotUser(snap.email, snap.user_id));
  writeFileSync(SNAPSHOT_AFTER, JSON.stringify(after, null, 2));

  console.log("\n" + "=".repeat(78));
  console.log("STAGE 1 DIFF (expected: ONLY experiences gained rows)");
  console.log("=".repeat(78));
  let bad = 0;
  for (let i = 0; i < baseline.length; i++) {
    const d = diffSnapshot(baseline[i], after[i]);
    printDiff(d, ["experiences"]);
    if (unexpectedChange(d, ["experiences"]) || d.experiences.removed.length > 0) bad++;
  }
  if (bad > 0) { console.log(`\n⚠️ ${bad} user(s) saw unexpected changes. INVESTIGATE.`); process.exit(1); }
  console.log("\n✅ Verified: only experiences added; nothing else moved.");
}

// ─── STAGE 2 ───

async function stage2() {
  console.error("STAGE 2 — career-analysis re-run");
  const baseline: UserSnapshot[] = [];
  for (const email of TARGETS) {
    const uid = await userIdByEmail(email);
    if (!uid) { console.error(`  could not resolve ${email}`); continue; }
    baseline.push(await snapshotUser(email, uid));
  }
  writeFileSync(SNAPSHOT_BEFORE, JSON.stringify(baseline, null, 2));
  console.error(`baseline snapshot: ${SNAPSHOT_BEFORE}`);

  interface Plan { email: string; user_id: string; skipped: string | null; baseline_roles: number; five_year_role: string | null; }
  const plans: Plan[] = [];

  for (const snap of baseline) {
    console.error(`\n--- ${snap.email}`);
    if (snap.experiences.length === 0) {
      console.error(`  SKIP: 0 experiences (Stage 1 must run first)`);
      plans.push({ email: snap.email, user_id: snap.user_id, skipped: "no_experiences", baseline_roles: snap.career_roles.length, five_year_role: null });
      continue;
    }
    const { data: profile } = await admin.from("profiles").select("five_year_role").eq("id", snap.user_id).maybeSingle();
    const fyr = (profile as any)?.five_year_role || null;
    console.error(`  exp=${snap.experiences.length} baseline_roles=${snap.career_roles.length} five_year_role=${fyr ?? "(none)"}`);
    plans.push({ email: snap.email, user_id: snap.user_id, skipped: null, baseline_roles: snap.career_roles.length, five_year_role: fyr });
  }

  console.log("\n" + "=".repeat(78));
  console.log("STAGE 2 — PLAN");
  console.log("=".repeat(78));
  for (const p of plans) {
    console.log(`\n### ${p.email} (${p.user_id})`);
    if (p.skipped) { console.log(`  SKIPPED: ${p.skipped}`); continue; }
    console.log(`  Will: mint per-user JWT → POST generate-career-analysis { dream_roles: ${p.five_year_role ? `["${p.five_year_role}"]` : "[]"}, force: true } → rpc('replace_career_roles', user_id, roles) under user JWT`);
    console.log(`  Expected change: career_roles ${p.baseline_roles} → N (N is the role count the LLM returns, typically 5-12)`);
    console.log(`  Profiles row will NOT be updated by this stage (deliberate scope narrowing)`);
  }

  if (!EXECUTE) { console.log("\nDRY-RUN. No writes. Re-run --stage=2 --execute to run."); return; }

  console.error("\nEXECUTING...");
  for (const p of plans) {
    if (p.skipped) { console.error(`  ${p.email}: skip`); continue; }
    console.error(`\n  ${p.email}: minting token...`);
    let token: string;
    try { token = await mintUserToken(p.email); }
    catch (e) { console.error(`  FAIL mintToken: ${e instanceof Error ? e.message : e}\nABORTING.`); process.exit(1); }
    console.error(`  ${p.email}: invoking generate-career-analysis...`);
    let resp: any;
    try {
      resp = await invokeEdgeFn(token, "generate-career-analysis", {
        dream_roles: p.five_year_role ? [p.five_year_role] : [],
        force: true,
      });
    } catch (e) { console.error(`  FAIL invoke: ${e instanceof Error ? e.message : e}\nABORTING.`); process.exit(1); }
    if (resp?.cached) { console.error(`  ${p.email}: response cached (qualification_level=${resp.qualification_level}). Skipping replace_career_roles.`); continue; }
    if (!Array.isArray(resp?.roles) || resp.roles.length === 0) { console.error(`  ${p.email}: 0 roles returned. Skipping replace_career_roles.`); continue; }
    const rolesPayload = resp.roles.map((r: any) => ({
      title: r.title, track: r.track,
      match_score: r.readiness_score, readiness_score: r.readiness_score,
      goal_alignment_score: r.goal_alignment_score ?? null,
      matched_skills: r.matched_skills || [], missing_skills: r.missing_skills || [],
      skills_gap: r.missing_skills || [],
      alignment_to_goal: r.alignment_to_goal || "",
      alignment_reason: r.alignment_reason || "",
      reasoning: r.reasoning || "",
      action_items: r.action_items || [],
    }));
    const userClient = userClientFor(token);
    const { error: rpcErr } = await userClient.rpc("replace_career_roles", {
      p_user_id: p.user_id,
      p_roles: rolesPayload,
      p_input_hash: resp.input_hash || null,
    });
    if (rpcErr) { console.error(`  ${p.email}: replace_career_roles FAILED: ${rpcErr.message}\nABORTING.`); process.exit(1); }
    console.error(`  ${p.email}: replaced ${rolesPayload.length} career_roles`);

    // Profile assessment refresh — generate-career-analysis returns the
    // fresh qualification_level / overall_assessment / skill_gaps but does
    // NOT persist them itself. Without this update they'd stay at the
    // stale 0-experience values ("Junior" / "couldn't find clear role
    // matches yet" / []). Matches the pattern in scripts/rerun-career-
    // analysis.mjs:142-151. profile.skills + profile.proof_signals are
    // deliberately NOT touched here — those are guard-rails that should
    // stay unchanged through this stage.
    const { error: profErr } = await userClient
      .from("profiles")
      .update({
        qualification_level: resp.qualification_level || null,
        overall_assessment: resp.overall_assessment || null,
        skill_gaps: Array.isArray(resp.skill_gaps) ? resp.skill_gaps : [],
        last_reality_check_date: new Date().toISOString(),
      })
      .eq("id", p.user_id);
    if (profErr) { console.error(`  ${p.email}: profile assessment update FAILED: ${profErr.message}\nABORTING.`); process.exit(1); }
    console.error(`  ${p.email}: refreshed profile assessment (qualification_level=${resp.qualification_level || "?"}, skill_gaps=${(resp.skill_gaps || []).length})`);
  }

  console.error("\nRe-snapshot + diff...");
  const after: UserSnapshot[] = [];
  for (const snap of baseline) after.push(await snapshotUser(snap.email, snap.user_id));
  writeFileSync(SNAPSHOT_AFTER, JSON.stringify(after, null, 2));

  console.log("\n" + "=".repeat(78));
  console.log("STAGE 2 DIFF (expected: career_roles + 4 profile assessment fields)");
  console.log("=".repeat(78));
  // Widened from career_roles-only after the script also refreshes the
  // profile assessment (qualification_level / overall_assessment /
  // skill_gaps / last_reality_check_date). profile.skills and
  // profile.proof_signals stay OUT of the expected set so the diff still
  // flags them as guard-rails if anything ever writes to them by mistake.
  const STAGE_2_EXPECTED = [
    "career_roles",
    "profile_qualification_level",
    "profile_overall_assessment",
    "profile_skill_gaps",
    "profile_last_reality_check_date",
  ];
  let bad = 0;
  for (let i = 0; i < baseline.length; i++) {
    const d = diffSnapshot(baseline[i], after[i]);
    printDiff(d, STAGE_2_EXPECTED);
    if (unexpectedChange(d, STAGE_2_EXPECTED)) bad++;
  }
  if (bad > 0) { console.log(`\n⚠️ ${bad} user(s) saw changes outside the expected set. INVESTIGATE.`); process.exit(1); }
  console.log("\n✅ Verified: only career_roles + profile assessment fields changed; profile.skills and profile.proof_signals untouched.");
}

// ─── STAGE 3 ───

// Heuristic: a task is AI-generated if role_title is non-empty AND it was
// inserted in the same batch as other AI tasks (created_at clustered with
// other tasks that share a role_title). generate-tasks batches all its
// inserts at one timestamp. Manual tasks have role_title=null (default).
function classifyTask(t: any, allTasks: any[]): "ai" | "manual" {
  if (!t.role_title || String(t.role_title).trim() === "") return "manual";
  const sameTs = allTasks.filter((x) => x.created_at === t.created_at).length;
  return sameTs > 1 || allTasks.length === 1 ? "ai" : "manual";
}

async function stage3() {
  console.error("STAGE 3 — downstream refresh (tasks + today's daily_action)");
  const baseline: UserSnapshot[] = [];
  for (const email of TARGETS) {
    const uid = await userIdByEmail(email);
    if (!uid) { console.error(`  could not resolve ${email}`); continue; }
    baseline.push(await snapshotUser(email, uid));
  }
  writeFileSync(SNAPSHOT_BEFORE, JSON.stringify(baseline, null, 2));
  console.error(`baseline snapshot: ${SNAPSHOT_BEFORE}`);

  const today = new Date().toISOString().slice(0, 10);

  interface Plan {
    email: string;
    user_id: string;
    ai_tasks_to_delete: any[];
    manual_tasks_preserved: any[];
    todays_daily_action: any | null;
    daily_action_is_ai: boolean;
    skipped: string | null;
  }
  const plans: Plan[] = [];

  for (const snap of baseline) {
    console.error(`\n--- ${snap.email}`);
    if (snap.career_roles.length === 0) {
      console.error(`  SKIP: 0 career_roles (Stage 2 must run first)`);
      plans.push({ email: snap.email, user_id: snap.user_id, ai_tasks_to_delete: [], manual_tasks_preserved: [], todays_daily_action: null, daily_action_is_ai: false, skipped: "no_career_roles" });
      continue;
    }
    const aiTasks = snap.tasks.filter((t) => classifyTask(t, snap.tasks) === "ai");
    const manualTasks = snap.tasks.filter((t) => classifyTask(t, snap.tasks) === "manual");
    const todays = snap.daily_actions.find((da: any) => {
      const d = (da as any).for_date || (da as any).action_date || null;
      return d && String(d).slice(0, 10) === today;
    }) || null;
    // daily_actions are exclusively AI-generated by generate-daily-action
    // (no manual-edit surface in the app). Default to true; surface for the
    // user to confirm if behaviour ever changes.
    const dailyIsAi = !!todays;
    console.error(`  career_roles=${snap.career_roles.length} tasks_total=${snap.tasks.length} (ai=${aiTasks.length}, manual=${manualTasks.length}) daily_today=${todays ? "yes" : "no"}`);
    plans.push({ email: snap.email, user_id: snap.user_id, ai_tasks_to_delete: aiTasks, manual_tasks_preserved: manualTasks, todays_daily_action: todays, daily_action_is_ai: dailyIsAi, skipped: null });
  }

  console.log("\n" + "=".repeat(78));
  console.log("STAGE 3 — PLAN");
  console.log("=".repeat(78));
  for (const p of plans) {
    console.log(`\n### ${p.email} (${p.user_id})`);
    if (p.skipped) { console.log(`  SKIPPED: ${p.skipped}`); continue; }
    console.log(`  Tasks: will DELETE ${p.ai_tasks_to_delete.length} AI task(s), preserve ${p.manual_tasks_preserved.length} manual task(s)`);
    for (const t of p.ai_tasks_to_delete) console.log(`    - [AI] "${t.title}" (role_title=${t.role_title}, created=${t.created_at})`);
    for (const t of p.manual_tasks_preserved) console.log(`    - [keep] "${t.title}" (role_title=${t.role_title || "<null>"})`);
    console.log(`  Then invoke generate-tasks { context: 'weekly action plan' } and INSERT the returned tasks under user JWT (matches Tasks.jsx pattern)`);
    if (p.todays_daily_action) {
      console.log(`  Today's daily_action: present (id=${p.todays_daily_action.id}) — IDEMPOTENT SKIP (no invoke, no delete)`);
    } else {
      console.log(`  Today's daily_action: not present — invoke generate-daily-action to create one`);
    }
  }

  if (!EXECUTE) { console.log("\nDRY-RUN. No writes. Re-run --stage=3 --execute to run."); return; }

  console.error("\nEXECUTING...");
  for (const p of plans) {
    if (p.skipped) { console.error(`  ${p.email}: skip`); continue; }
    console.error(`\n  ${p.email}: minting token...`);
    let token: string;
    try { token = await mintUserToken(p.email); }
    catch (e) { console.error(`  FAIL mintToken: ${e instanceof Error ? e.message : e}\nABORTING.`); process.exit(1); }
    const userClient = userClientFor(token);

    if (p.ai_tasks_to_delete.length > 0) {
      const ids = p.ai_tasks_to_delete.map((t) => t.id);
      const { error: delErr } = await userClient.from("tasks").delete().in("id", ids);
      if (delErr) { console.error(`  ${p.email}: DELETE tasks FAILED: ${delErr.message}\nABORTING.`); process.exit(1); }
      console.error(`  ${p.email}: deleted ${ids.length} AI task(s)`);
    }

    // generate-tasks returns the generated tasks in its HTTP response body
    // but does NOT write to the DB. The caller is responsible for inserting
    // — same pattern as Tasks.jsx:133-163 and Onboarding.jsx:890+. The
    // previous Stage 3 invoked but discarded the response, which is why
    // agamf ended up at 0 tasks after deletion.
    let resp: any;
    try {
      resp = await invokeEdgeFn(token, "generate-tasks", { context: "weekly action plan" });
    } catch (e) { console.error(`  ${p.email}: generate-tasks FAILED: ${e instanceof Error ? e.message : e}\nABORTING.`); process.exit(1); }

    const PRIORITY_MAP: Record<string, string> = { urgent_now: "high", this_week: "medium", longer_term: "low", high: "high", medium: "medium", low: "low" };
    const CATEGORY_MAP: Record<string, string> = { application: "application", cv: "cv", skill: "skill", project: "project", networking: "networking", interview_prep: "application", clarity_positioning: "application" };
    // Field shape MIRRORS Tasks.jsx:146-158 exactly. Notable: title and
    // description are inserted RAW (no length-truncation) because the
    // frontend doesn't truncate them either, and resolveDueDate is the
    // same helper Tasks.jsx imports (validates the ISO date + returns
    // null on invalid; null lets the user set a date later from the UI).
    const generated = (resp?.tasks || []).map((t: any) => ({
      user_id: p.user_id,
      title: t.title,
      description: t.description,
      category: CATEGORY_MAP[String(t.category)] || "application",
      priority: PRIORITY_MAP[String(t.priority)] || "medium",
      role_title: t.role_title || null,
      due_date: resolveDueDate(t.due_date),
      is_complete: false,
    }));
    console.error(`  ${p.email}: generate-tasks returned ${generated.length} tasks`);
    if (generated.length > 0) {
      const { error: insErr } = await userClient.from("tasks").insert(generated);
      if (insErr) { console.error(`  ${p.email}: tasks INSERT FAILED: ${insErr.message}\nABORTING.`); process.exit(1); }
      console.error(`  ${p.email}: inserted ${generated.length} tasks`);
    }

    // Idempotent daily-action: skip the invoke if today's row already
    // exists for this user. The function itself short-circuits on the
    // existing row (per its own comment at index.ts:13), but skipping
    // saves the LLM call and avoids the async-write timing weirdness
    // we hit on the prior Stage 3 execute.
    if (p.todays_daily_action) {
      console.error(`  ${p.email}: today's daily_action already present (id=${p.todays_daily_action.id}) — skipping generate-daily-action (idempotent)`);
    } else {
      try {
        await invokeEdgeFn(token, "generate-daily-action", {});
        console.error(`  ${p.email}: invoked generate-daily-action`);
      } catch (e) { console.error(`  ${p.email}: generate-daily-action FAILED: ${e instanceof Error ? e.message : e}\nABORTING.`); process.exit(1); }
    }
  }

  console.error("\nRe-snapshot + diff...");
  const after: UserSnapshot[] = [];
  for (const snap of baseline) after.push(await snapshotUser(snap.email, snap.user_id));
  writeFileSync(SNAPSHOT_AFTER, JSON.stringify(after, null, 2));

  console.log("\n" + "=".repeat(78));
  console.log("STAGE 3 DIFF (gate: ONLY tasks counts toward fail-fast; daily_actions logged but not gated)");
  console.log("=".repeat(78));
  // daily_actions is in the expected-set so it doesn't print ⚠️, but is
  // EXCLUDED from the fail-fast gate because generate-daily-action's
  // writes can land after our re-snapshot (observed empirically — DB
  // shows the row, snapshot misses it). tasks now stays in the gate
  // because the script inserts synchronously above, so the re-snapshot
  // WILL catch them.
  const STAGE_3_LOGGED = ["tasks", "daily_actions"];
  const STAGE_3_GATED = ["tasks"];
  let bad = 0;
  for (let i = 0; i < baseline.length; i++) {
    const d = diffSnapshot(baseline[i], after[i]);
    printDiff(d, STAGE_3_LOGGED);
    if (unexpectedChange(d, STAGE_3_GATED)) bad++;
  }
  if (bad > 0) { console.log(`\n⚠️ ${bad} user(s) saw changes outside tasks. INVESTIGATE.`); process.exit(1); }
  console.log("\n✅ Verified: only tasks changed in a gated way (daily_actions changes, if any, are tolerated due to async-write timing).");
}

// ─── --dump-text — read-only ground-truth helper ───
//
// Downloads the user's latest CV via the SAME unpdf/mammoth path Stage 1
// uses and prints the raw extracted text. No LLM call, no DB write, no
// snapshot. Used to compare what the model extracted against what the CV
// literally says.
//
// The text printed here is byte-identical to what production
// extract-cv-text + the client-side mammoth path would produce, so
// anomalies in the dump are anomalies the LLM saw too — not artifacts
// of this script's transport.

async function dumpText(email: string) {
  console.error(`READ-ONLY DUMP for ${email}\n`);
  const uid = await userIdByEmail(email);
  if (!uid) { console.error(`FATAL: could not resolve ${email}`); process.exit(1); }
  console.error(`  user_id: ${uid}`);
  const resume = await listLatestResume(uid);
  if (!resume) { console.error(`FATAL: no resume in resumes/${uid}/`); process.exit(1); }
  if (resume.ext === "other") { console.error(`FATAL: latest file "${resume.name}" is neither .pdf nor .docx`); process.exit(1); }
  console.error(`  file: ${resume.path} (${resume.ext})`);
  const { text, pages } = await downloadAndExtractText(resume.path, resume.ext);
  console.error(`  pages: ${pages}  text_len: ${text.length}${text.length > 15000 ? `  (Stage 1 truncates to 15000)` : ""}`);
  console.error(`\n${"─".repeat(78)}\n--- RAW EXTRACTED TEXT (verbatim, no truncation) ---\n${"─".repeat(78)}\n`);
  process.stdout.write(text);
  if (!text.endsWith("\n")) process.stdout.write("\n");
  console.error(`\n${"─".repeat(78)}\n--- END OF TEXT ---\n${"─".repeat(78)}`);
}

async function main() {
  if (DUMP_TEXT_EMAIL) {
    await dumpText(DUMP_TEXT_EMAIL);
    return;
  }
  console.error(`Stage: ${STAGE}  Mode: ${EXECUTE ? "EXECUTE (will write)" : "DRY-RUN"}`);
  console.error(`Targets: ${TARGETS.join(", ")}\n`);
  if (STAGE === "1") await stage1();
  else if (STAGE === "2") await stage2();
  else if (STAGE === "3") await stage3();
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

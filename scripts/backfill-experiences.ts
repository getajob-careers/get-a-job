// scripts/backfill-experiences.ts
//
// One-off backfill for 4 pilot users (nevo.liani, agamf123, redheadeg,
// ybarshain) who completed onboarding with zero experiences because the
// pre-PR-#277 resume-extractor wrapped its JSON in prose, which the
// loose-regex client parser dropped silently. The fix is live (gpt-4o-mini
// + response_format json_object + parseExtractedJson). This script re-runs
// extraction for those 4 users against their already-uploaded CVs and
// inserts the missing experiences.
//
// Hard scope guarantees:
//   1. Only ever touches the four hardcoded TARGET emails. The list is
//      intentionally not a flag — this is not a general-purpose tool.
//   2. Skips any target whose experiences count is already > 0
//      (idempotent — second run of --execute is a no-op).
//   3. Only writes to the `experiences` table, using the same column
//      whitelist as Onboarding.jsx finishOnboarding (avoids PGRST204).
//   4. Default mode is DRY-RUN. --execute is required to write.
//   5. Snapshots before AND after (when executing) so we can prove the
//      ONLY tables that changed are experiences for the target users.
//
// Extraction mirrors the post-#277 production path EXACTLY:
//   - unpdf for .pdf, mammoth.extractRawText for .docx (matches
//     StepResumeUpload.jsx; legacy .doc rejected)
//   - Truncate to 15,000 chars (same 15k cap production uses)
//   - buildResumeExtractionPrompt imported from src/lib (single source
//     of truth — same prompt the LLM gets in production)
//   - gpt-4o-mini, temperature 0.2, response_format json_object (matches
//     the routing layer's resume-extractor route)
//   - parseExtractedJson imported from src/lib (same 4-pass parser that
//     replaced the loose regex)
//
// Usage:
//   # Dry-run (default) — prints proposed experiences per user, writes nothing
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... \
//     npx tsx scripts/backfill-experiences.ts
//
//   # Real insert — only after reviewing the dry-run output
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... \
//     npx tsx scripts/backfill-experiences.ts --execute
//
// Cost: 4 users × 1 call × gpt-4o-mini = ~$0.005 total.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { buildResumeExtractionPrompt } from "../src/lib/resumeExtractionPrompt.js";
import { parseExtractedJson } from "../src/lib/parseExtractedJson.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE || !OPENAI_API_KEY) {
  console.error("ERROR: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const SNAPSHOT_BEFORE = `/tmp/backfill-snapshot-${ts}-before.json`;
const SNAPSHOT_AFTER = `/tmp/backfill-snapshot-${ts}-after.json`;
const PROPOSAL_PATH = `/tmp/backfill-proposal-${ts}.json`;

// Hardcoded — this script is intentionally targeted, not parameterised.
const TARGETS = [
  "nevo.liani@gmail.com",
  "agamf123@gmail.com",
  "redheadeg@gmail.com",
  "ybarshain@gmail.com",
];

// Mirrors ai-chat/index.ts:508 verbatim.
const RESUME_EXTRACTOR_SYSTEM_PROMPT =
  "You are a strict data extraction AI. Extract the requested fields from the resume text and format exactly as a valid JSON object. Do not include markdown formatting or commentary.";

const MODEL = "gpt-4o-mini";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// ─── User resolution (admin.listUsers — auth schema not exposed by PostgREST) ───

let _userIndex: Map<string, string> | null = null;
async function userIdByEmail(email: string): Promise<string | null> {
  if (!_userIndex) {
    _userIndex = new Map();
    let page = 1;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`auth.admin.listUsers failed: ${error.message}`);
      for (const u of data.users) {
        if (u.email) _userIndex.set(u.email.trim().toLowerCase(), u.id);
      }
      if (data.users.length < 1000) break;
      page++;
    }
  }
  return _userIndex.get(email.trim().toLowerCase()) ?? null;
}

// ─── Resume download + text extraction (mirrors StepResumeUpload.jsx) ───

async function listLatestResume(userId: string): Promise<{ path: string; ext: "pdf" | "docx" | "other"; name: string } | null> {
  const { data, error } = await supabase.storage.from("resumes").list(userId, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) {
    console.error(`  storage.list failed for ${userId}: ${error.message}`);
    return null;
  }
  const files = (data || []).filter((o) => o.name && !o.name.endsWith("/"));
  if (files.length === 0) return null;
  const latest = files[0];
  const lower = latest.name.toLowerCase();
  const ext: "pdf" | "docx" | "other" = lower.endsWith(".pdf") ? "pdf" : lower.endsWith(".docx") ? "docx" : "other";
  return { path: `${userId}/${latest.name}`, ext, name: latest.name };
}

async function downloadAndExtractText(filePath: string, ext: "pdf" | "docx"): Promise<{ text: string; pages: number }> {
  const { data, error } = await supabase.storage.from("resumes").download(filePath);
  if (error || !data) throw new Error(`storage.download failed: ${error?.message || "no data"}`);
  const arrayBuffer = await data.arrayBuffer();
  if (ext === "pdf") {
    const bytes = new Uint8Array(arrayBuffer);
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    return { text: result.text || "", pages: result.totalPages };
  }
  const buffer = Buffer.from(arrayBuffer);
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value || "", pages: 0 };
}

// ─── OpenAI call (mirrors the deployed routing layer for resume-extractor) ───

async function callOpenAI(systemPrompt: string, userMessage: string): Promise<{ ok: true; cv: any } | { ok: false; error: string }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: `OpenAI ${res.status}: ${t.slice(0, 200)}` };
  }
  const j = await res.json();
  const raw: string = j.choices?.[0]?.message?.content || "";
  const cv = parseExtractedJson(raw);
  if (!cv) return { ok: false, error: `parseExtractedJson returned null. raw head: ${raw.slice(0, 150)}` };
  return { ok: true, cv };
}

// ─── Sanitisation — exact column whitelist from Onboarding.jsx finishOnboarding ───

function sanitiseExperience(e: any, userId: string): Record<string, unknown> | null {
  if (!e || typeof e !== "object") return null;
  const title = String(e.title ?? "").trim();
  if (!title) return null; // skip rows the LLM emitted with no title
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

// ─── Snapshot — every table the user expects to verify against ───

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
  profile_skills: any[] | null;
  profile_proof_signals: any[] | null;
}

async function snapshotUser(email: string, userId: string): Promise<UserSnapshot> {
  const [exp, edu, roles, stories, apps, targets, tasks, profile] = await Promise.all([
    supabase.from("experiences").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("education").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("career_roles").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("stories").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("applications").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("company_targets").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("tasks").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("profiles").select("skills, proof_signals").eq("id", userId).maybeSingle(),
  ]);
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
    profile_skills: (profile.data as any)?.skills ?? null,
    profile_proof_signals: (profile.data as any)?.proof_signals ?? null,
  };
}

// ─── Diff — for the post-execute verification step ───

function rowKey(row: any): string {
  return JSON.stringify(row, Object.keys(row).sort());
}
function diffRows(before: any[], after: any[]): { added: any[]; removed: any[]; unchanged: number } {
  const b = new Set(before.map(rowKey));
  const a = new Set(after.map(rowKey));
  const added = after.filter((r) => !b.has(rowKey(r)));
  const removed = before.filter((r) => !a.has(rowKey(r)));
  return { added, removed, unchanged: before.length - removed.length };
}

function diffSnapshot(before: UserSnapshot, after: UserSnapshot) {
  return {
    email: before.email,
    experiences: diffRows(before.experiences, after.experiences),
    education: diffRows(before.education, after.education),
    career_roles: diffRows(before.career_roles, after.career_roles),
    stories: diffRows(before.stories, after.stories),
    applications: diffRows(before.applications, after.applications),
    company_targets: diffRows(before.company_targets, after.company_targets),
    tasks: diffRows(before.tasks, after.tasks),
    profile_skills_changed: JSON.stringify(before.profile_skills) !== JSON.stringify(after.profile_skills),
    profile_proof_signals_changed: JSON.stringify(before.profile_proof_signals) !== JSON.stringify(after.profile_proof_signals),
  };
}

// ─── Main ───

interface ProposalEntry {
  email: string;
  user_id: string;
  cv_file: string;
  cv_ext: string;
  text_len: number;
  skipped_reason: string | null;
  proposed_experiences: Array<Record<string, unknown>>;
  llm_raw_keys: string[];
}

async function main() {
  console.error(`Mode: ${EXECUTE ? "EXECUTE (will INSERT)" : "DRY-RUN (no writes)"}`);
  console.error(`Targets: ${TARGETS.join(", ")}`);
  console.error("");

  // Phase 1 — baseline snapshot of all 4 users.
  console.error("Phase 1: baseline snapshot...");
  const baseline: UserSnapshot[] = [];
  for (const email of TARGETS) {
    const uid = await userIdByEmail(email);
    if (!uid) { console.error(`  could not resolve ${email}`); continue; }
    baseline.push(await snapshotUser(email, uid));
  }
  writeFileSync(SNAPSHOT_BEFORE, JSON.stringify(baseline, null, 2));
  console.error(`  wrote ${SNAPSHOT_BEFORE} (${baseline.length} users)`);
  console.error("");

  // Phase 2 — extract for each user (idempotency guard fires here).
  console.error("Phase 2: extract proposed experiences...");
  const proposals: ProposalEntry[] = [];
  for (const snap of baseline) {
    console.error(`\n=== ${snap.email} ===`);
    if (snap.experiences.length > 0) {
      console.error(`  SKIP: already has ${snap.experiences.length} experiences (idempotency guard)`);
      proposals.push({
        email: snap.email,
        user_id: snap.user_id,
        cv_file: "",
        cv_ext: "",
        text_len: 0,
        skipped_reason: `already_has_experiences (${snap.experiences.length})`,
        proposed_experiences: [],
        llm_raw_keys: [],
      });
      continue;
    }
    const resume = await listLatestResume(snap.user_id);
    if (!resume) {
      console.error(`  SKIP: no resume in resumes/${snap.user_id}/`);
      proposals.push({
        email: snap.email,
        user_id: snap.user_id,
        cv_file: "",
        cv_ext: "",
        text_len: 0,
        skipped_reason: "no_resume_in_storage",
        proposed_experiences: [],
        llm_raw_keys: [],
      });
      continue;
    }
    if (resume.ext === "other") {
      console.error(`  SKIP: latest file "${resume.name}" is neither .pdf nor .docx`);
      proposals.push({
        email: snap.email,
        user_id: snap.user_id,
        cv_file: resume.path,
        cv_ext: resume.ext,
        text_len: 0,
        skipped_reason: "unsupported_file_type",
        proposed_experiences: [],
        llm_raw_keys: [],
      });
      continue;
    }
    console.error(`  CV: ${resume.path} (${resume.ext})`);
    let text = "";
    try {
      const r = await downloadAndExtractText(resume.path, resume.ext);
      text = r.text;
      console.error(`  text_len=${text.length}${text.length > 15000 ? " (will truncate to 15000)" : ""}`);
    } catch (e) {
      console.error(`  FAIL: extract text: ${e instanceof Error ? e.message : e}`);
      proposals.push({
        email: snap.email,
        user_id: snap.user_id,
        cv_file: resume.path,
        cv_ext: resume.ext,
        text_len: 0,
        skipped_reason: `extract_text_failed: ${e instanceof Error ? e.message : String(e)}`,
        proposed_experiences: [],
        llm_raw_keys: [],
      });
      continue;
    }
    const truncated = text.slice(0, 15000);
    const userMessage = buildResumeExtractionPrompt(truncated);
    console.error(`  calling ${MODEL}...`);
    const r = await callOpenAI(RESUME_EXTRACTOR_SYSTEM_PROMPT, userMessage);
    if (!r.ok) {
      console.error(`  FAIL: LLM call: ${r.error}`);
      proposals.push({
        email: snap.email,
        user_id: snap.user_id,
        cv_file: resume.path,
        cv_ext: resume.ext,
        text_len: text.length,
        skipped_reason: `llm_call_failed: ${r.error}`,
        proposed_experiences: [],
        llm_raw_keys: [],
      });
      continue;
    }
    const cv = r.cv;
    const rawExps = Array.isArray(cv?.experiences) ? cv.experiences : Array.isArray(cv?.experience) ? cv.experience : [];
    const sanitised: Array<Record<string, unknown>> = [];
    for (const e of rawExps) {
      const s = sanitiseExperience(e, snap.user_id);
      if (s) sanitised.push(s);
    }
    console.error(`  extracted ${sanitised.length} experiences (LLM emitted ${rawExps.length}, ${rawExps.length - sanitised.length} dropped for missing title)`);
    proposals.push({
      email: snap.email,
      user_id: snap.user_id,
      cv_file: resume.path,
      cv_ext: resume.ext,
      text_len: text.length,
      skipped_reason: null,
      proposed_experiences: sanitised,
      llm_raw_keys: Object.keys(cv || {}),
    });
  }
  writeFileSync(PROPOSAL_PATH, JSON.stringify(proposals, null, 2));
  console.error(`\nwrote ${PROPOSAL_PATH}`);

  // Phase 3 — print proposals.
  console.error("\n" + "=".repeat(78));
  console.error("PROPOSED EXPERIENCES (per user)");
  console.error("=".repeat(78));
  for (const p of proposals) {
    console.log("");
    console.log(`### ${p.email} (${p.user_id})`);
    if (p.skipped_reason) {
      console.log(`  SKIPPED: ${p.skipped_reason}`);
      continue;
    }
    console.log(`  CV: ${p.cv_file} (${p.cv_ext}, ${p.text_len} chars)`);
    console.log(`  Other LLM-emitted top-level fields (for context, NOT inserted): ${p.llm_raw_keys.filter((k) => k !== "experiences").join(", ") || "(none)"}`);
    console.log(`  Will INSERT ${p.proposed_experiences.length} experiences:`);
    for (let i = 0; i < p.proposed_experiences.length; i++) {
      const e = p.proposed_experiences[i] as any;
      console.log(`    ${i + 1}. ${e.title} @ ${e.company || "(no company)"}`);
      console.log(`       dates=${e.start_date || "?"} → ${e.is_current ? "Present" : (e.end_date || "?")}, type=${e.type}`);
      if (e.responsibilities) {
        const r = String(e.responsibilities).replace(/\s+/g, " ").trim();
        console.log(`       responsibilities: ${r.slice(0, 220)}${r.length > 220 ? "…" : ""}`);
      }
      console.log(`       skills (${(e.skills as string[]).length}): ${(e.skills as string[]).slice(0, 12).join(", ")}${(e.skills as string[]).length > 12 ? "…" : ""}`);
    }
  }

  // Phase 4 — execute (only if --execute).
  if (!EXECUTE) {
    console.log("");
    console.log("=".repeat(78));
    console.log("DRY-RUN COMPLETE. No writes. Re-run with --execute to insert.");
    console.log("=".repeat(78));
    return;
  }

  console.error("\n" + "=".repeat(78));
  console.error("EXECUTING INSERTS");
  console.error("=".repeat(78));
  for (const p of proposals) {
    if (p.skipped_reason || p.proposed_experiences.length === 0) {
      console.error(`  ${p.email}: nothing to insert (${p.skipped_reason || "0 proposed"})`);
      continue;
    }
    const { data, error } = await supabase
      .from("experiences")
      .insert(p.proposed_experiences)
      .select("id");
    if (error) {
      console.error(`  ${p.email}: INSERT FAILED: ${error.message}`);
      console.error("  ABORTING further inserts to preserve audit cleanliness");
      process.exit(1);
    }
    console.error(`  ${p.email}: inserted ${data?.length || 0} rows`);
  }

  // Phase 5 — re-snapshot + diff verification.
  console.error("\nPhase 5: re-snapshot + diff verification...");
  const after: UserSnapshot[] = [];
  for (const snap of baseline) {
    after.push(await snapshotUser(snap.email, snap.user_id));
  }
  writeFileSync(SNAPSHOT_AFTER, JSON.stringify(after, null, 2));
  console.error(`  wrote ${SNAPSHOT_AFTER}`);

  console.log("");
  console.log("=".repeat(78));
  console.log("POST-EXECUTE DIFF (must show: only experiences changed)");
  console.log("=".repeat(78));
  let unexpectedChanges = 0;
  for (let i = 0; i < baseline.length; i++) {
    const d = diffSnapshot(baseline[i], after[i]);
    console.log(`\n${d.email}:`);
    console.log(`  experiences:     +${d.experiences.added.length} added, -${d.experiences.removed.length} removed`);
    console.log(`  education:       +${d.education.added.length} added, -${d.education.removed.length} removed`);
    console.log(`  career_roles:    +${d.career_roles.added.length} added, -${d.career_roles.removed.length} removed`);
    console.log(`  stories:         +${d.stories.added.length} added, -${d.stories.removed.length} removed`);
    console.log(`  applications:    +${d.applications.added.length} added, -${d.applications.removed.length} removed`);
    console.log(`  company_targets: +${d.company_targets.added.length} added, -${d.company_targets.removed.length} removed`);
    console.log(`  tasks:           +${d.tasks.added.length} added, -${d.tasks.removed.length} removed`);
    console.log(`  profile.skills changed:        ${d.profile_skills_changed}`);
    console.log(`  profile.proof_signals changed: ${d.profile_proof_signals_changed}`);
    const offendingCounts = (
      d.education.added.length + d.education.removed.length +
      d.career_roles.added.length + d.career_roles.removed.length +
      d.stories.added.length + d.stories.removed.length +
      d.applications.added.length + d.applications.removed.length +
      d.company_targets.added.length + d.company_targets.removed.length +
      d.tasks.added.length + d.tasks.removed.length +
      (d.profile_skills_changed ? 1 : 0) +
      (d.profile_proof_signals_changed ? 1 : 0) +
      d.experiences.removed.length
    );
    if (offendingCounts > 0) unexpectedChanges++;
  }
  console.log("");
  if (unexpectedChanges > 0) {
    console.log(`⚠️ ${unexpectedChanges} user(s) saw changes outside experiences. INVESTIGATE.`);
    process.exit(1);
  }
  console.log(`✅ Verified: only experiences rows added; education/career_roles/stories/applications/company_targets/tasks/profile unchanged across all targets.`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

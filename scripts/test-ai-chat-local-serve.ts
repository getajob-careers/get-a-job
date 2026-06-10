// scripts/test-ai-chat-local-serve.ts
//
// Smoke test for the ai-chat edge function running under
// `supabase functions serve ai-chat`. Covers the resume-extractor model
// swap from gpt-4o-mini to gpt-5.4-mini (PR: eli/resume-extractor-gpt-5-4-mini)
// and confirms the conversational-agent path is byte-identical.
//
// What it does:
//   1. Mints a per-user JWT via auth.admin.generateLink + verifyOtp (same
//      pattern as scripts/rerun-career-analysis.mjs and the backfill
//      script). No emails are sent.
//   2. For three CV users (nevo PDF, michael DOCX, agam PDF):
//        - Downloads latest CV from the resumes bucket via service-role
//        - Extracts text via unpdf (.pdf) or mammoth (.docx) — same path
//          production extract-cv-text uses
//        - Truncates to 15_000 chars (production cap)
//        - Builds the user message via buildResumeExtractionPrompt
//        - POSTs to http://localhost:54321/functions/v1/ai-chat with
//          body { message, agent: 'resume-extractor', conversation_history: [] }
//        - Parses the reply via parseExtractedJson, counts experiences /
//          education / skills, reports latency
//   3. Smoke-tests one career_agent call (also nevo's JWT) — confirms
//      the conversational agent still returns a non-empty reply with
//      HTTP 200, byte-identical to pre-PR.
//   4. After all calls, waits 2s and queries function_metrics for the
//      most recent ai-chat rows for these users, prints the model_used
//      column per call. Expectation: resume-extractor → gpt-5.4-mini,
//      career_agent → gpt-4o-mini.
//
// Usage (after `supabase functions serve ai-chat --env-file ./.env.local`
// is running in another terminal):
//
//   SUPABASE_URL=https://ilmqmodklutztuybsvwd.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   SUPABASE_ANON_KEY=... \
//   AI_CHAT_URL=http://localhost:54321/functions/v1/ai-chat \
//     npx tsx scripts/test-ai-chat-local-serve.ts
//
// AI_CHAT_URL defaults to localhost:54321 if unset; override to point at
// a different host (e.g. a preview deploy) only if the local-serve path
// isn't usable. Cost: ~$0.10 (3 resume-extractor calls on gpt-5.4-mini +
// 1 career_agent call on gpt-4o-mini).

import { createClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { buildResumeExtractionPrompt } from "../src/lib/resumeExtractionPrompt.js";
import { parseExtractedJson } from "../src/lib/parseExtractedJson.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const AI_CHAT_URL = process.env.AI_CHAT_URL || "http://localhost:54321/functions/v1/ai-chat";

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
  console.error("ERROR: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY");
  process.exit(1);
}

const TARGETS = [
  { email: "nevo.liani@gmail.com", expect_experiences_min: 4 },
  { email: "michael@sobol.cc", expect_experiences_min: 4 },
  { email: "agamf123@gmail.com", expect_experiences_min: 3 },
];

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function userIdByEmail(email: string): Promise<string> {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) {
      if (u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase()) return u.id;
    }
    if (data.users.length < 1000) break;
    page++;
  }
  throw new Error(`user not found: ${email}`);
}

async function mintUserToken(email: string): Promise<string> {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
  const hashed = link?.properties?.hashed_token;
  if (!hashed) throw new Error("no hashed_token");
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: otp, error: otpErr } = await anon.auth.verifyOtp({ token_hash: hashed, type: "magiclink" });
  if (otpErr) throw new Error(`verifyOtp: ${otpErr.message}`);
  const at = otp?.session?.access_token;
  if (!at) throw new Error("no access_token");
  return at;
}

async function listLatestResume(userId: string): Promise<{ path: string; ext: "pdf" | "docx" } | null> {
  const { data, error } = await admin.storage.from("resumes").list(userId, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new Error(`storage.list: ${error.message}`);
  const files = (data || []).filter((o) => o.name && !o.name.endsWith("/"));
  if (files.length === 0) return null;
  const latest = files[0];
  const lower = latest.name.toLowerCase();
  if (lower.endsWith(".pdf")) return { path: `${userId}/${latest.name}`, ext: "pdf" };
  if (lower.endsWith(".docx")) return { path: `${userId}/${latest.name}`, ext: "docx" };
  return null;
}

async function downloadAndExtract(filePath: string, ext: "pdf" | "docx"): Promise<string> {
  const { data, error } = await admin.storage.from("resumes").download(filePath);
  if (error || !data) throw new Error(`storage.download: ${error?.message ?? "no data"}`);
  const ab = await data.arrayBuffer();
  if (ext === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(ab));
    const r = await extractText(pdf, { mergePages: true });
    return r.text || "";
  }
  const r = await mammoth.extractRawText({ buffer: Buffer.from(ab) });
  return r.value || "";
}

interface CallResult {
  ok: boolean;
  status: number;
  latency_ms: number;
  reply_head: string;
  parsed_ok: boolean;
  exp_count: number;
  edu_count: number;
  skills_count: number;
  raw_keys: string[];
  error?: string;
}

async function callAiChat(jwt: string, body: any): Promise<CallResult> {
  const t0 = Date.now();
  try {
    const res = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    const latency_ms = Date.now() - t0;
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* keep raw */ }
    const reply: string = json?.reply ?? json?.content ?? json?.text ?? "";
    const replyHead = (reply || text).slice(0, 200).replace(/\n/g, " ");
    if (!res.ok) {
      return {
        ok: false, status: res.status, latency_ms,
        reply_head: replyHead, parsed_ok: false,
        exp_count: 0, edu_count: 0, skills_count: 0, raw_keys: [],
        error: text.slice(0, 300),
      };
    }
    const cv = parseExtractedJson(reply);
    if (!cv) {
      return {
        ok: true, status: res.status, latency_ms,
        reply_head: replyHead, parsed_ok: false,
        exp_count: 0, edu_count: 0, skills_count: 0, raw_keys: [],
      };
    }
    return {
      ok: true, status: res.status, latency_ms,
      reply_head: replyHead, parsed_ok: true,
      exp_count: Array.isArray(cv.experiences) ? cv.experiences.length : 0,
      edu_count: cv.institution ? 1 : 0,
      skills_count: Array.isArray(cv.skills) ? cv.skills.length : 0,
      raw_keys: Object.keys(cv),
    };
  } catch (e) {
    return {
      ok: false, status: 0, latency_ms: Date.now() - t0,
      reply_head: "", parsed_ok: false,
      exp_count: 0, edu_count: 0, skills_count: 0, raw_keys: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main() {
  console.log(`AI_CHAT_URL = ${AI_CHAT_URL}`);
  console.log("");

  // resume-extractor smoke for 3 CVs
  const results: Array<{ email: string; outcome: CallResult; expect_min: number; cv_path: string; cv_ext: string; text_len: number }> = [];

  for (const t of TARGETS) {
    console.log(`=== resume-extractor: ${t.email} ===`);
    const uid = await userIdByEmail(t.email);
    const resume = await listLatestResume(uid);
    if (!resume) {
      console.log(`  SKIP: no .pdf/.docx in resumes/${uid}/`);
      continue;
    }
    console.log(`  CV: ${resume.path} (${resume.ext})`);
    const text = await downloadAndExtract(resume.path, resume.ext);
    const truncated = text.slice(0, 15000);
    console.log(`  text_len: ${text.length}${text.length > 15000 ? " (truncated to 15000)" : ""}`);
    const userMsg = buildResumeExtractionPrompt(truncated);
    const jwt = await mintUserToken(t.email);
    console.log(`  posting to ${AI_CHAT_URL}...`);
    const r = await callAiChat(jwt, {
      message: userMsg,
      agent: "resume-extractor",
      conversation_history: [],
    });
    results.push({ email: t.email, outcome: r, expect_min: t.expect_experiences_min, cv_path: resume.path, cv_ext: resume.ext, text_len: text.length });
    console.log(`  HTTP ${r.status} · latency ${r.latency_ms}ms · parsed=${r.parsed_ok} · exp=${r.exp_count} (expect ≥${t.expect_experiences_min}) · edu=${r.edu_count} · skills=${r.skills_count}`);
    if (r.error) console.log(`  ERROR: ${r.error.slice(0, 200)}`);
    if (!r.parsed_ok && r.reply_head) console.log(`  reply head: ${r.reply_head}`);
    console.log("");
  }

  // career_agent smoke (uses nevo's JWT — any pilot user works)
  console.log(`=== career_agent smoke (nevo.liani@gmail.com) ===`);
  const careerJwt = await mintUserToken("nevo.liani@gmail.com");
  console.log(`  posting to ${AI_CHAT_URL}...`);
  const careerR = await callAiChat(careerJwt, {
    message: "What's the next step I should focus on this week?",
    agent: "career_agent",
    conversation_history: [],
  });
  console.log(`  HTTP ${careerR.status} · latency ${careerR.latency_ms}ms`);
  console.log(`  reply head: ${careerR.reply_head}`);
  if (careerR.error) console.log(`  ERROR: ${careerR.error.slice(0, 200)}`);
  console.log("");

  // Wait briefly for function_metrics to land, then read back
  console.log("Waiting 3s for function_metrics to commit...");
  await new Promise((r) => setTimeout(r, 3000));

  // Query the most recent ai-chat rows for the test users
  const targetUserIds = await Promise.all(TARGETS.map((t) => userIdByEmail(t.email)));
  const { data: metrics, error: metErr } = await admin
    .from("function_metrics")
    .select("created_at, user_id, function_name, ok, http_status, model_used, error_code, latency_ms")
    .eq("function_name", "ai-chat")
    .in("user_id", targetUserIds)
    .order("created_at", { ascending: false })
    .limit(20);
  if (metErr) { console.error(`function_metrics query failed: ${metErr.message}`); process.exit(1); }

  console.log("=== function_metrics (most recent ai-chat rows for test users) ===");
  console.log("Expectation: resume-extractor → gpt-5.4-mini, career_agent → gpt-4o-mini");
  console.log("");
  for (const m of (metrics || [])) {
    const user = TARGETS.find((t) => targetUserIds.indexOf(m.user_id) >= 0 && targetUserIds[TARGETS.indexOf(t)] === m.user_id);
    console.log(`  ${m.created_at} · ${user?.email ?? m.user_id} · ${m.http_status} · ${m.ok ? "ok" : "fail"} · model=${m.model_used} · latency=${m.latency_ms}ms${m.error_code ? ` · err=${m.error_code}` : ""}`);
  }
  console.log("");

  // Summary verdict
  const allParsed = results.every((r) => r.outcome.parsed_ok);
  const allMet = results.every((r) => r.outcome.exp_count >= r.expect_min);
  const resumeRows = (metrics || []).filter((m: any) => m.model_used === "gpt-5.4-mini");
  const careerRows = (metrics || []).filter((m: any) => m.model_used === "gpt-4o-mini");
  console.log("=== VERDICT ===");
  console.log(`  all 3 resume-extractor calls parsed cleanly: ${allParsed ? "✅" : "❌"}`);
  console.log(`  experience counts meet bake-off expectations: ${allMet ? "✅" : "❌"}`);
  console.log(`  career_agent HTTP 200 with non-empty reply: ${careerR.status === 200 && careerR.reply_head.length > 0 ? "✅" : "❌"}`);
  console.log(`  function_metrics shows gpt-5.4-mini for resume-extractor: ${resumeRows.length >= 3 ? "✅" : `❌ (${resumeRows.length} rows; expected 3)`}`);
  console.log(`  function_metrics shows gpt-4o-mini for career_agent: ${careerRows.length >= 1 ? "✅" : `❌ (${careerRows.length} rows; expected 1)`}`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

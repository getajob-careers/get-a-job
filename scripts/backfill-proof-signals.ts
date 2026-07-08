// One-off backfill: re-run proof-signal extraction for profiles whose
// proof_signals came back empty while extract-proof-signals was dead
// (boot-crashed 2026-06-10 -> 2026-07-08, fixed in #538).
//
// HELD / dry-run by default. It does NOT mint per-user JWTs; it runs
// server-side with the service-role key and REPLICATES the edge
// function's extraction (same shared prompt + route + openai helper as
// supabase/functions/extract-proof-signals/index.ts) so results match
// production exactly. Text is re-derived from each user's stored resume
// file via unpdf (PDF) or mammoth (.docx) — the same two extractors
// onboarding uses (extract-cv-text/unpdf server-side; mammoth client-side)
// — because cv_text is never persisted (the client passes it transiently).
//
//   Dry run (default, writes nothing):
//     SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... \
//       deno run --allow-env --allow-net scripts/backfill-proof-signals.ts
//   Execute (writes profiles.proof_signals/primary_domain/adjacent_fields):
//     ... deno run --allow-env --allow-net scripts/backfill-proof-signals.ts --execute
//
// Scope: profiles created on/after BREAK_DATE with empty proof_signals AND
// a resume file in the `resumes` bucket. Idempotent — skips any profile
// that already has non-empty proof_signals, so a re-run is safe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@1.6.2";
import * as mammoth from "https://esm.sh/mammoth@1.12.0";
import { routeFor } from "../supabase/functions/_shared/model-routing.ts";
import { openaiChatCompletionWithRetry } from "../supabase/functions/_shared/openai-chat.ts";
import {
  SYSTEM_PROMPT,
  USER_MESSAGE_PREFIX,
} from "../supabase/functions/_shared/proof-signals-prompt.ts";

const BREAK_DATE = "2026-06-10"; // first day extract-proof-signals was dead
const EXECUTE = Deno.args.includes("--execute");
const ROUTE = routeFor("proof-signals");
const NONREASONING_MAX_TOKENS = 4000;

// Mirror the edge function's validation (index.ts:157-163) exactly.
const VALID_STRENGTHS = new Set(["strong", "medium", "weak", "very_weak"]);
const VALID_SOURCES = new Set([
  "experience",
  "cv_bullet",
  "project",
  "certification",
  "declared_skill",
]);

const url = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const openaiKey = Deno.env.get("OPENAI_API_KEY");
if (!url || !serviceKey || !openaiKey) {
  console.error(
    "Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY all required.",
  );
  Deno.exit(1);
}
const supabase = createClient(url, serviceKey);

function isEmptyProof(v: unknown): boolean {
  return v == null || (Array.isArray(v) && v.length === 0);
}

async function resumeToText(
  userId: string,
): Promise<{ path: string | null; text: string }> {
  const { data: files, error } = await supabase.storage
    .from("resumes")
    .list(userId, { limit: 20 });
  if (error || !files || files.length === 0) return { path: null, text: "" };
  // Newest first; the onboarding upload writes a single object per user.
  const file = files.sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  )[0];
  const path = `${userId}/${file.name}`;
  const { data: blob, error: dlErr } = await supabase.storage
    .from("resumes")
    .download(path);
  if (dlErr || !blob) return { path, text: "" };
  const ab = await blob.arrayBuffer();
  try {
    if (/\.docx$/i.test(file.name)) {
      // DOCX: the same extractor onboarding uses client-side
      // (StepResumeUpload.jsx -> mammoth.extractRawText).
      const { value } = await mammoth.extractRawText({ arrayBuffer: ab });
      return { path, text: (value || "").trim() };
    }
    const pdf = await getDocumentProxy(new Uint8Array(ab));
    const { text } = await extractText(pdf, { mergePages: true });
    return { path, text: (text || "").trim() };
  } catch {
    // unreadable / unsupported (e.g. scanned PDF with no text layer — no OCR)
    return { path, text: "" };
  }
}

async function extractProofSignals(cvText: string): Promise<any | null> {
  const payload: Record<string, unknown> = {
    model: ROUTE.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${USER_MESSAGE_PREFIX}${cvText.slice(0, 15000)}`,
      },
    ],
    temperature: ROUTE.temperature ?? 0.2,
  };
  if (ROUTE.response_format) payload.response_format = ROUTE.response_format;
  if (ROUTE.reasoning_effort) {
    payload.max_completion_tokens =
      ROUTE.max_completion_tokens ?? NONREASONING_MAX_TOKENS;
    payload.reasoning_effort = ROUTE.reasoning_effort;
  } else {
    payload.max_tokens = NONREASONING_MAX_TOKENS;
  }

  const res = await openaiChatCompletionWithRetry(
    payload,
    openaiKey!,
    {
      traceName: "backfill-proof-signals",
      metadata: { cv_text_length: cvText.length },
    },
    { signal: AbortSignal.timeout(45000) },
  );
  if (!res.ok) {
    console.error(
      `  openai ${res.status}: ${(await res.text()).slice(0, 200)}`,
    );
    return null;
  }
  const completion = await res.json();
  let result: any;
  try {
    result = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
  } catch {
    return null;
  }
  if (!Array.isArray(result.proof_signals)) return null;
  result.proof_signals = (result.proof_signals as any[]).filter(
    (s) =>
      typeof s.proof_signal === "string" &&
      s.proof_signal.trim() &&
      VALID_STRENGTHS.has(s.strength) &&
      VALID_SOURCES.has(s.source),
  );
  return result;
}

// created_at lives in auth.users, not profiles — page the admin API to
// build the set of users created on/after the break date, then intersect
// with empty-proof profiles. This keeps the run scoped to the outage
// window (pre-6/10 uploaders already have signals — the fn worked then).
const createdSince = new Set<string>();
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage: 1000,
  });
  if (error) {
    console.error("listUsers:", error.message);
    Deno.exit(1);
  }
  for (const u of data.users) {
    if (u.created_at && u.created_at >= BREAK_DATE) createdSince.add(u.id);
  }
  if (data.users.length < 1000) break;
}

const { data: profs, error: qErr } = await supabase
  .from("profiles")
  .select("id, proof_signals")
  .or("proof_signals.is.null,proof_signals.eq.[]");
if (qErr) {
  console.error("Query error:", qErr.message);
  Deno.exit(1);
}
const targets = (profs ?? []).filter((p) => createdSince.has(p.id));

console.log(
  `\n=== backfill-proof-signals (${EXECUTE ? "EXECUTE" : "DRY RUN"}) — route=${ROUTE.model} ===\n`,
);
let processed = 0,
  wrote = 0,
  skipped = 0,
  noFile = 0,
  failed = 0;

for (const p of targets ?? []) {
  if (!isEmptyProof(p.proof_signals)) {
    skipped++;
    continue;
  }
  processed++;
  const short = String(p.id).slice(0, 8);
  const { path, text } = await resumeToText(p.id);
  if (!path || !text) {
    noFile++;
    console.log(
      `  ${short}  file=${path ? "found" : "MISSING"} text=0  -> SKIP (no source)`,
    );
    continue;
  }
  const result = await extractProofSignals(text);
  if (!result) {
    failed++;
    console.log(`  ${short}  textLen=${text.length}  -> extraction FAILED`);
    continue;
  }
  const n = result.proof_signals.length;
  const dom = result.primary_domain ?? null;
  console.log(
    `  ${short}  textLen=${text.length}  signals=${n}  domain=${dom}${EXECUTE ? "  -> WRITING" : "  (dry-run)"}`,
  );
  if (EXECUTE) {
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        proof_signals: result.proof_signals,
        primary_domain: result.primary_domain ?? null,
        adjacent_fields: result.adjacent_fields ?? [],
      })
      .eq("id", p.id)
      .or("proof_signals.is.null,proof_signals.eq.[]"); // re-guard: only if still empty
    if (upErr) {
      failed++;
      console.error(`    write failed: ${upErr.message}`);
    } else {
      wrote++;
    }
  }
}

console.log(
  `\n=== summary: processed=${processed} ${EXECUTE ? `wrote=${wrote}` : "(dry-run, no writes)"} no_source=${noFile} failed=${failed} already_populated_skipped=${skipped} ===`,
);

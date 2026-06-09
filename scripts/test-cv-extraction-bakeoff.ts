// scripts/test-cv-extraction-bakeoff.ts
//
// Multi-model bake-off for the CV STRUCTURING step in onboarding.
//
// What this measures (NOT the same as the authoring bake-off):
//   - This evaluates `ai-chat` agent="resume-extractor", which turns raw CV
//     text into structured experiences/education/skills/projects/certs.
//   - Production model is gpt-4o-mini (hardcoded in ai-chat/index.ts:15).
//   - Production prompt is buildResumeExtractionPrompt() in
//     src/lib/resumeExtractionPrompt.js — imported HERE verbatim as the
//     single source of truth so the diff measures *only* model variance.
//
// What this does NOT touch:
//   - The production edge function. No deploy.
//   - The DB. Read-only against storage + auth.users.
//   - extract-cv-text. We mirror it locally via the same unpdf code path.
//
// Pipeline per user:
//   1. Resolve user_id by email via supabase.auth.admin.listUsers()
//   2. List storage objects under resumes/{user_id}/, pick most recent PDF
//   3. Download bytes via service-role; unpdf -> text (same code as the
//      extract-cv-text edge function); truncate to 15_000 chars
//   4. Build prompt via buildResumeExtractionPrompt(text) [imported]
//   5. For each model: callModel(slug, system_prompt, user_message). The
//      system prompt mirrors ai-chat resume-extractor (one-sentence) so
//      the user-message-driven prompt acts on a clean slate.
//   6. Parse JSON, score against the source text + anti-hallucination
//      checks, store per-cell result.
//
// Controls (direct OpenAI):
//   - gpt-4o-mini (production baseline — comparison hangs on this)
//   - gpt-4o      (proof-signals already uses this; "what if we upgrade?")
//
// Bake-off (via OpenRouter):
//   - openai/gpt-5.5
//   - anthropic/claude-opus-4.8
//   - anthropic/claude-sonnet-4.6  (resolver falls back to ~anthropic/
//                                   claude-sonnet-latest — see resolver
//                                   logic below)
//   - google/gemini-3.5-flash
//
// max_tokens handling:
//   - gpt-4o + gpt-4o-mini: max_tokens only (sending both causes the
//     "Setting 'max_tokens' and 'max_completion_tokens' at the same
//     time is not supported" error we hit in the authoring bake-off).
//   - OpenRouter non-reasoning: max_tokens only.
//   - OpenRouter reasoning (gpt-5.x, o-series, *-thinking): max_completion
//     _tokens + reasoning_effort=low. Hidden reasoning tokens count
//     against the cap so we raise the cap to 16000.
//
// Usage (smoke — single user across all models):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   OPENAI_API_KEY=... OPENROUTER_API_KEY=... \
//     npx tsx scripts/test-cv-extraction-bakeoff.ts \
//       --emails=michael@sobol.cc --out=/tmp/cv-extraction-smoke.md
//
// Usage (full sweep, 20 pilot users, two detail dumps):
//   npx tsx scripts/test-cv-extraction-bakeoff.ts \
//     --invite-codes=GETAJOBPILOT,INTERNSHIPGETAJOB \
//     --limit=20 \
//     --detail-users=nevo.liani@gmail.com,michael@sobol.cc \
//     --out=/tmp/cv-extraction-bakeoff.md
//
// Cost (rough): 20 users × 6 models = 120 calls.
//   - gpt-4o-mini ($0.15/$0.60 per M): ~$0.001 each = $0.02
//   - gpt-4o ($2.5/$10): ~$0.02 each = $0.40
//   - gpt-5.5 ($5/$30) reasoning at 16k cap: ~$0.30 each = $6.00 (largest)
//   - claude-opus-4.8 ($5/$25): ~$0.05 each = $1.00
//   - claude-sonnet-latest (~$3/$15): ~$0.03 each = $0.60
//   - gemini-3.5-flash ($1.5/$9): ~$0.02 each = $0.40
//   Total: ~$8.50 worst case. Single-user smoke: ~$0.42.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import { buildResumeExtractionPrompt } from "../src/lib/resumeExtractionPrompt.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE || !OPENAI_API_KEY || !OPENROUTER_API_KEY) {
  console.error("ERROR: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY");
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (n: string, d = ""): string =>
  args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;

const EMAILS_ARG = arg("emails", "");
const INVITE_CODES = arg("invite-codes", "GETAJOBPILOT,INTERNSHIPGETAJOB")
  .split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = Number(arg("limit", "20"));
const DETAIL_USERS = arg("detail-users", "nevo.liani@gmail.com,michael@sobol.cc")
  .split(",").map((s) => s.trim()).filter(Boolean);
const OUT = arg("out", "/tmp/cv-extraction-bakeoff.md");

const DEFAULT_MODELS = [
  "openai/gpt-5.5",
  "anthropic/claude-opus-4.8",
  "anthropic/claude-sonnet-4.6",
  "google/gemini-3.5-flash",
].join(",");
const REQUESTED_MODELS = arg("models", DEFAULT_MODELS)
  .split(",").map((s) => s.trim()).filter(Boolean);
let MODELS: string[] = [];
const SKIPPED_MODELS: string[] = [];

const DIRECT_OPENAI_CONTROLS = ["gpt-4o-mini", "gpt-4o"];

const REASONING_MODEL_PATTERNS = [
  /^openai\/gpt-5(\.|$)/i,
  /^openai\/o[1-9](\.|-|$)/i,
  /-thinking$/i,
];
const isReasoningModel = (slug: string) => REASONING_MODEL_PATTERNS.some((rx) => rx.test(slug));

const PRICING_FALLBACK: Record<string, { in_per_m: number; out_per_m: number }> = {
  "gpt-4o-mini": { in_per_m: 0.15, out_per_m: 0.6 },
  "gpt-4o": { in_per_m: 2.5, out_per_m: 10 },
  "openai/gpt-5.5": { in_per_m: 5, out_per_m: 30 },
  "anthropic/claude-opus-4.8": { in_per_m: 5, out_per_m: 25 },
  "anthropic/claude-sonnet-4.6": { in_per_m: 3, out_per_m: 15 },
  "~anthropic/claude-sonnet-latest": { in_per_m: 3, out_per_m: 15 },
  "google/gemini-3.5-flash": { in_per_m: 1.5, out_per_m: 9 },
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// ─── Latin-1 safe headers (from authoring bake-off — empirically required by
// fetch() for OpenRouter X-Title attribution string) ───

function latin1SafeHeader(s: string): string {
  return s
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2026]/g, "...")
    .replace(/[^\x00-\xff]/g, "");
}
function assertLatin1Headers(h: Record<string, string>): Record<string, string> {
  for (const [k, v] of Object.entries(h)) {
    for (let i = 0; i < v.length; i++) {
      if (v.charCodeAt(i) > 0xff) {
        throw new Error(`header "${k}" non-Latin-1 at index ${i}: U+${v.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0")}`);
      }
    }
  }
  return h;
}

// ─── User resolution via admin API (auth schema not exposed by PostgREST) ───

let _userIndex: Map<string, string> | null = null;
async function buildUserIndex(): Promise<void> {
  if (_userIndex) return;
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
async function userIdByEmail(email: string): Promise<string | null> {
  await buildUserIndex();
  return _userIndex!.get(email.trim().toLowerCase()) ?? null;
}

// ─── Catalog + slug resolver (carry-over from authoring bake-off) ───

let _orPricing: Map<string, { in_per_m: number; out_per_m: number }> | null = null;
let _orCatalog: string[] = [];

async function loadOpenRouterCatalog(): Promise<void> {
  if (_orPricing) return;
  _orPricing = new Map();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.warn(`  OpenRouter /models returned ${res.status} — using fallback pricing`);
      return;
    }
    const j = await res.json();
    for (const m of j.data || []) {
      if (!m.id) continue;
      _orCatalog.push(m.id);
      const p = m.pricing;
      if (p?.prompt && p?.completion) {
        _orPricing.set(m.id, {
          in_per_m: parseFloat(p.prompt) * 1e6,
          out_per_m: parseFloat(p.completion) * 1e6,
        });
      }
    }
    _orCatalog.sort();
    console.error(`  loaded ${_orCatalog.length} OpenRouter models (${_orPricing.size} priced)`);
  } catch (e) {
    console.warn(`  catalog fetch failed: ${e instanceof Error ? e.message : e}`);
  }
}

function priceFor(slug: string): { in_per_m: number; out_per_m: number } {
  if (_orPricing?.has(slug)) return _orPricing.get(slug)!;
  return PRICING_FALLBACK[slug] ?? { in_per_m: 0, out_per_m: 0 };
}

function resolveModelSlug(
  requested: string,
  catalog: string[],
): { resolved: string; via: string } | { error: string; suggestions: string[] } {
  if (catalog.length === 0) return { resolved: requested, via: "no-catalog" };
  if (catalog.includes(requested)) return { resolved: requested, via: "exact" };
  const lower = requested.toLowerCase();
  for (const id of catalog) if (id.toLowerCase() === lower) return { resolved: id, via: "case-insensitive" };
  const stripped = requested.replace(/-\d{8}$/, "");
  if (stripped !== requested && catalog.includes(stripped)) return { resolved: stripped, via: "stripped-date" };
  const prefix = stripped !== requested ? stripped : requested;
  const prefixMatches = catalog.filter((id) => id.startsWith(prefix));
  if (prefixMatches.length >= 1) {
    prefixMatches.sort((a, b) => a.length - b.length);
    return { resolved: prefixMatches[0], via: prefixMatches.length === 1 ? "prefix" : "prefix-shortest" };
  }
  // Special-case: sonnet-4.x requests fall back to the "latest" router alias when
  // no concrete sonnet-4 slug exists yet. The user explicitly wanted Sonnet
  // in the bake-off; latest-alias resolution preserves the intent.
  if (/anthropic\/claude-sonnet-4/i.test(requested)) {
    const aliasMatch = catalog.find((id) => /sonnet-latest$/i.test(id));
    if (aliasMatch) return { resolved: aliasMatch, via: "sonnet-latest-alias" };
  }
  const tokens = requested.toLowerCase().split(/[/\-.]/).filter((t) => t.length > 1);
  const scored: Array<{ id: string; score: number }> = [];
  for (const id of catalog) {
    const idLower = id.toLowerCase();
    let score = 0;
    for (const t of tokens) if (idLower.includes(t)) score++;
    if (score > 0) scored.push({ id, score });
  }
  scored.sort((a, b) => b.score - a.score || a.id.length - b.id.length);
  return { error: "not_found", suggestions: scored.slice(0, 5).map((s) => s.id) };
}

function resolveRequestedModels(): void {
  for (const requested of REQUESTED_MODELS) {
    const r = resolveModelSlug(requested, _orCatalog);
    if ("resolved" in r) {
      if (r.resolved !== requested) console.error(`  slug resolved: "${requested}" → "${r.resolved}" (${r.via})`);
      else console.error(`  slug verified: "${requested}"`);
      MODELS.push(r.resolved);
    } else {
      const sugg = r.suggestions.length > 0 ? `\n      closest: ${r.suggestions.join(", ")}` : "";
      console.error(`  slug NOT in catalog, skipping: "${requested}"${sugg}`);
      SKIPPED_MODELS.push(`${requested} → not in OpenRouter catalog. Closest: ${r.suggestions.join(", ") || "(none)"}`);
    }
  }
}

// ─── PDF download + text extraction (mirrors extract-cv-text/index.ts) ───

async function listLatestPdf(userId: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("resumes").list(userId, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) {
    console.error(`  storage.list failed for ${userId}: ${error.message}`);
    return null;
  }
  const pdfs = (data || []).filter((o) => /\.pdf$/i.test(o.name));
  if (pdfs.length === 0) return null;
  return `${userId}/${pdfs[0].name}`;
}

async function downloadAndExtractText(filePath: string): Promise<{ text: string; pages: number }> {
  const { data, error } = await supabase.storage.from("resumes").download(filePath);
  if (error || !data) throw new Error(`storage.download failed: ${error?.message || "no data"}`);
  const bytes = new Uint8Array(await data.arrayBuffer());
  const pdf = await getDocumentProxy(bytes);
  const result = await extractText(pdf, { mergePages: true });
  return { text: result.text || "", pages: result.totalPages };
}

// ─── Model invocation ───

interface CallResult {
  cv: any;
  raw: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  cost_usd: number;
  finish_reason: string;
  ok: boolean;
  error?: string;
}

async function callModel(modelSlug: string, systemPrompt: string, userContent: string): Promise<CallResult> {
  const t0 = Date.now();
  const isDirectOpenAI = DIRECT_OPENAI_CONTROLS.includes(modelSlug);
  const url = isDirectOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const key = isDirectOpenAI ? OPENAI_API_KEY : OPENROUTER_API_KEY;
  const reasoning = isReasoningModel(modelSlug);
  // Cap heuristics:
  //   - Direct gpt-4o / gpt-4o-mini: 4096 (CV extraction can produce ~3k tokens
  //     of nested JSON for a rich resume; 4k gives headroom without hitting
  //     either model's hard ceiling).
  //   - OpenRouter non-reasoning: 8000.
  //   - OpenRouter reasoning: 16000 + reasoning_effort=low.
  const completionCap = isDirectOpenAI ? 4096 : reasoning ? 16000 : 8000;

  const body: any = {
    model: modelSlug,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  };
  // CRITICAL: do NOT send both max_tokens and max_completion_tokens for the
  // direct-OpenAI path — gpt-4o/-mini reject the combination with
  // "Setting 'max_tokens' and 'max_completion_tokens' at the same time is
  // not supported". Reasoning models on OpenRouter want max_completion_tokens.
  if (isDirectOpenAI) {
    body.max_tokens = completionCap;
  } else if (reasoning) {
    body.max_completion_tokens = completionCap;
    body.reasoning = { effort: "low" };
    body.reasoning_effort = "low";
  } else {
    body.max_tokens = completionCap;
  }

  try {
    const headers = assertLatin1Headers({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(isDirectOpenAI ? {} : {
        "HTTP-Referer": latin1SafeHeader("https://getajob.careers"),
        "X-Title": latin1SafeHeader("Get A Job - CV extraction bake-off"),
      }),
    });
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) {
      const t = await res.text();
      return {
        cv: {}, raw: "",
        tokens_in: 0, tokens_out: 0, latency_ms,
        cost_usd: 0, finish_reason: "", ok: false,
        error: `HTTP ${res.status}: ${t.slice(0, 220)}`,
      };
    }
    const j = await res.json();
    const raw: string = j.choices?.[0]?.message?.content || "";
    const finish_reason: string = j.choices?.[0]?.finish_reason || "";
    const tokens_in = j.usage?.prompt_tokens ?? 0;
    const tokens_out = j.usage?.completion_tokens ?? 0;
    const reasoning_tokens = j.usage?.completion_tokens_details?.reasoning_tokens
      ?? j.usage?.reasoning_tokens ?? 0;
    const p = priceFor(modelSlug);
    const cost_usd = (tokens_in / 1e6) * p.in_per_m + (tokens_out / 1e6) * p.out_per_m;

    const tryParse = (s: string): any => {
      try { return JSON.parse(s); } catch { return null; }
    };
    let parsed = tryParse(raw);
    if (!parsed) {
      const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/i);
      if (fenced) parsed = tryParse(fenced[1]);
    }
    if (!parsed) {
      const brace = raw.match(/\{[\s\S]*\}/);
      if (brace) parsed = tryParse(brace[0]);
    }
    if (!parsed) {
      const truncated = finish_reason === "length" || tokens_out >= completionCap - 50;
      const empty = raw.trim().length === 0;
      const label = empty
        ? `empty_output finish_reason=${finish_reason} reasoning_tokens=${reasoning_tokens} visible=${tokens_out}`
        : truncated
          ? `truncated finish_reason=${finish_reason} reasoning_tokens=${reasoning_tokens} visible=${tokens_out}`
          : `bad_json finish_reason=${finish_reason}: ${raw.slice(0, 150)}`;
      return { cv: {}, raw, tokens_in, tokens_out, latency_ms, cost_usd, finish_reason, ok: false, error: label };
    }

    if (finish_reason === "length") {
      return {
        cv: parsed, raw,
        tokens_in, tokens_out, latency_ms, cost_usd, finish_reason,
        ok: false,
        error: `truncated_but_parsed visible=${tokens_out} cap=${completionCap}`,
      };
    }
    return { cv: parsed, raw, tokens_in, tokens_out, latency_ms, cost_usd, finish_reason, ok: true };
  } catch (e) {
    return {
      cv: {}, raw: "",
      tokens_in: 0, tokens_out: 0, latency_ms: Date.now() - t0,
      cost_usd: 0, finish_reason: "", ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ─── Scoring ───

const VALID_EDUCATION_LEVELS = new Set([
  "high_school", "associate", "bachelors", "masters", "phd", "bootcamp", "self_taught",
]);
const MILITARY_TRIGGERS = /\b(idf|israel\s?defense\s?forces|nahal|nachal|golani|givati|paratroopers?|sayeret|unit\s?8200|8200|combat\s?soldier|reserve\s?service|מילואים|צה[״"']?ל|שירות\s?צבאי)\b/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/;

interface Scoring {
  experiences_count: number;
  pct_with_responsibilities: number; // 0..100
  pct_with_skills: number;           // 0..100
  skills_verbatim_pct: number;       // 0..100
  military_classified_correctly: boolean | "n/a";
  education_level_valid: boolean | "n/a";
  phone_extracted: boolean | "n/a";
  json_parse_ok: boolean;
}

function scoreExtraction(cv: any, sourceText: string, parsedOk: boolean): Scoring {
  const exps = Array.isArray(cv?.experiences) ? cv.experiences : [];
  const expCount = exps.length;
  const withResp = exps.filter((e: any) => String(e?.responsibilities ?? "").trim().length > 0).length;
  const withSkills = exps.filter((e: any) => Array.isArray(e?.skills) && e.skills.length >= 3).length;

  const lowerSrc = sourceText.toLowerCase();
  let totalSkills = 0;
  let verbatim = 0;
  const allSkills: string[] = [];
  for (const e of exps) if (Array.isArray(e?.skills)) for (const s of e.skills) if (typeof s === "string") allSkills.push(s);
  if (Array.isArray(cv?.skills)) for (const s of cv.skills) if (typeof s === "string") allSkills.push(s);
  for (const s of allSkills) {
    totalSkills++;
    if (lowerSrc.includes(s.trim().toLowerCase())) verbatim++;
  }

  const srcHasMilitary = MILITARY_TRIGGERS.test(sourceText);
  let militaryOK: boolean | "n/a" = "n/a";
  if (srcHasMilitary) {
    militaryOK = exps.some((e: any) => String(e?.type ?? "").toLowerCase() === "military");
  }

  const lvl = String(cv?.education_level ?? "").trim().toLowerCase();
  const eduValid: boolean | "n/a" = lvl ? VALID_EDUCATION_LEVELS.has(lvl) : "n/a";

  const srcHasPhone = PHONE_RE.test(sourceText);
  let phoneOK: boolean | "n/a" = "n/a";
  if (srcHasPhone) {
    phoneOK = !!String(cv?.phone_number ?? "").trim();
  }

  return {
    experiences_count: expCount,
    pct_with_responsibilities: expCount === 0 ? 0 : Math.round((withResp / expCount) * 100),
    pct_with_skills: expCount === 0 ? 0 : Math.round((withSkills / expCount) * 100),
    skills_verbatim_pct: totalSkills === 0 ? 100 : Math.round((verbatim / totalSkills) * 100),
    military_classified_correctly: militaryOK,
    education_level_valid: eduValid,
    phone_extracted: phoneOK,
    json_parse_ok: parsedOk,
  };
}

// ─── Per-user pipeline ───

// Mirror of the ai-chat resume-extractor system prompt (ai-chat/index.ts:508).
const RESUME_EXTRACTOR_SYSTEM_PROMPT =
  "You are a strict data extraction AI. Extract the requested fields from the resume text and format exactly as a valid JSON object. Do not include markdown formatting or commentary.";

interface UserCell {
  scoring: Scoring;
  latency_ms: number;
  cost_usd: number;
  cv: any;
  ok: boolean;
  error?: string;
}

interface UserReport {
  email: string;
  user_id: string;
  pdf_path: string;
  pdf_pages: number;
  source_text_len: number;
  source_text: string;
  cells: Record<string, UserCell>;
}

async function runOneUser(email: string): Promise<UserReport | null> {
  console.error(`\n=== ${email} ===`);
  const userId = await userIdByEmail(email);
  if (!userId) {
    console.error(`  could not resolve email`);
    return null;
  }
  const pdfPath = await listLatestPdf(userId);
  if (!pdfPath) {
    console.error(`  no PDF in resumes/${userId}/`);
    return null;
  }
  let text: string, pages: number;
  try {
    const r = await downloadAndExtractText(pdfPath);
    text = r.text; pages = r.pages;
  } catch (e) {
    console.error(`  extract failed: ${e instanceof Error ? e.message : e}`);
    return null;
  }
  if (!text.trim()) {
    console.error(`  empty text (likely image-only PDF) — skipping`);
    return null;
  }
  const truncated = text.length > 15000;
  const sourceText = text.slice(0, 15000);
  console.error(`  PDF=${pdfPath} pages=${pages} text_len=${text.length}${truncated ? " (truncated to 15000)" : ""}`);
  const userMessage = buildResumeExtractionPrompt(sourceText);

  const cells: Record<string, UserCell> = {};
  const allModels = [...DIRECT_OPENAI_CONTROLS, ...MODELS];
  for (const slug of allModels) {
    console.error(`  → ${slug}…`);
    const r = await callModel(slug, RESUME_EXTRACTOR_SYSTEM_PROMPT, userMessage);
    const sc = scoreExtraction(r.cv, sourceText, r.ok);
    cells[slug] = {
      scoring: sc,
      latency_ms: r.latency_ms,
      cost_usd: r.cost_usd,
      cv: r.cv,
      ok: r.ok,
      error: r.error,
    };
  }

  return {
    email,
    user_id: userId,
    pdf_path: pdfPath,
    pdf_pages: pages,
    source_text_len: text.length,
    source_text: sourceText,
    cells,
  };
}

// ─── Email selection ───

async function pickEmails(): Promise<string[]> {
  if (EMAILS_ARG) {
    return EMAILS_ARG.split(",").map((s) => s.trim()).filter(Boolean);
  }
  // Default: pilot users via invite_code filter
  const { data, error } = await supabase
    .from("profiles")
    .select("id, invite_code")
    .in("invite_code", INVITE_CODES);
  if (error) throw new Error(`profiles query failed: ${error.message}`);
  await buildUserIndex();
  const byId = new Map<string, string>();
  for (const [email, uid] of _userIndex!.entries()) byId.set(uid, email);
  const emails: string[] = [];
  for (const row of (data || [])) {
    const email = byId.get((row as any).id);
    if (email) emails.push(email);
  }
  return emails.slice(0, LIMIT);
}

// ─── Markdown report ───

function renderMarkdown(reports: UserReport[]): string {
  const lines: string[] = [];
  lines.push("# CV extraction — multi-model bake-off");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("Measures the `ai-chat` agent=`resume-extractor` step that turns raw CV text into structured experiences/education/skills.");
  lines.push("Production model is `gpt-4o-mini` (ai-chat/index.ts:15). Prompt is `buildResumeExtractionPrompt()` from `src/lib/resumeExtractionPrompt.js` — imported into this harness verbatim so the diff measures *only* model variance.");
  lines.push("");
  lines.push(`**Controls (direct OpenAI):** ${DIRECT_OPENAI_CONTROLS.map((s) => "`" + s + "`").join(", ")}`);
  lines.push(`**Bake-off (via OpenRouter):**`);
  for (const slug of MODELS) lines.push(`- \`${slug}\``);
  if (SKIPPED_MODELS.length > 0) {
    lines.push("");
    lines.push("**Skipped (slug not in OpenRouter catalog):**");
    for (const s of SKIPPED_MODELS) lines.push(`- ${s}`);
  }
  lines.push("");

  // Per-model aggregate.
  const allModels = [...DIRECT_OPENAI_CONTROLS, ...MODELS];
  lines.push("## Per-model summary (averages across users)");
  lines.push("");
  lines.push("| Model | Users | Exp avg | % w/ resp | % w/ skills | Skills verbatim % | Mil OK | Edu OK | Phone OK | Parse OK | Lat p50 | Cost $ | Fails |");
  lines.push("|---|---:|---:|---:|---:|---:|---|---|---|---|---:|---:|---:|");
  for (const slug of allModels) {
    const cells: UserCell[] = [];
    for (const r of reports) if (r.cells[slug]) cells.push(r.cells[slug]);
    const okCells = cells.filter((c) => c.ok);
    const fails = cells.length - okCells.length;
    const avg = (xs: number[]) => xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const ratio = (cells: UserCell[], key: "military_classified_correctly" | "education_level_valid" | "phone_extracted") => {
      const applicable = cells.filter((c) => c.scoring[key] !== "n/a");
      if (applicable.length === 0) return "n/a";
      const correct = applicable.filter((c) => c.scoring[key] === true).length;
      return `${correct}/${applicable.length}`;
    };
    const lats = cells.map((c) => c.latency_ms).sort((a, b) => a - b);
    const p50 = lats.length === 0 ? 0 : lats[Math.floor(lats.length / 2)];
    lines.push(
      `| \`${slug}\` | ${cells.length} | ${avg(okCells.map((c) => c.scoring.experiences_count))} | ${avg(okCells.map((c) => c.scoring.pct_with_responsibilities))} | ${avg(okCells.map((c) => c.scoring.pct_with_skills))} | ${avg(okCells.map((c) => c.scoring.skills_verbatim_pct))} | ${ratio(okCells, "military_classified_correctly")} | ${ratio(okCells, "education_level_valid")} | ${ratio(okCells, "phone_extracted")} | ${okCells.length}/${cells.length} | ${p50} | ${sum(cells.map((c) => c.cost_usd)).toFixed(4)} | ${fails} |`
    );
  }
  lines.push("");

  // Per-user breakdown.
  for (const r of reports) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${r.email}`);
    lines.push(`PDF: \`${r.pdf_path}\` · ${r.pdf_pages} pages · source text ${r.source_text_len} chars${r.source_text_len > 15000 ? " (truncated to 15000)" : ""}.`);
    lines.push("");
    lines.push("| Model | Exp | %Resp | %Skill | Verb% | Mil | Edu | Phone | Lat (ms) | $ | Status |");
    lines.push("|---|---:|---:|---:|---:|---|---|---|---:|---:|---|");
    for (const slug of allModels) {
      const c = r.cells[slug];
      if (!c) { lines.push(`| \`${slug}\` | — | — | — | — | — | — | — | — | — | not run |`); continue; }
      const s = c.scoring;
      const fmtTri = (v: boolean | "n/a") => v === "n/a" ? "—" : v ? "✓" : "✗";
      const status = c.ok ? "ok" : `**FAIL**: ${(c.error || "").slice(0, 60)}`;
      lines.push(`| \`${slug}\` | ${s.experiences_count} | ${s.pct_with_responsibilities}% | ${s.pct_with_skills}% | ${s.skills_verbatim_pct}% | ${fmtTri(s.military_classified_correctly)} | ${fmtTri(s.education_level_valid)} | ${fmtTri(s.phone_extracted)} | ${c.latency_ms} | $${c.cost_usd.toFixed(4)} | ${status} |`);
    }
    lines.push("");
  }

  // Detail dumps.
  for (const detailEmail of DETAIL_USERS) {
    const detail = reports.find((r) => r.email === detailEmail);
    if (!detail) continue;
    lines.push("---");
    lines.push("");
    lines.push(`## Detail dump — ${detailEmail}`);
    lines.push("");
    lines.push("### Source CV text (first 4000 chars, what was passed to every model)");
    lines.push("");
    lines.push("```");
    lines.push(detail.source_text.slice(0, 4000));
    lines.push("```");
    lines.push("");
    for (const slug of allModels) {
      const c = detail.cells[slug];
      lines.push(`### ${slug}`);
      lines.push("");
      if (!c) { lines.push("_(not run)_\n"); continue; }
      if (!c.ok) { lines.push(`_(failed: ${c.error})_\n`); continue; }
      lines.push(`Experiences extracted: **${c.scoring.experiences_count}** · skills verbatim: **${c.scoring.skills_verbatim_pct}%**`);
      lines.push("");
      const exps = c.cv?.experiences || [];
      if (exps.length === 0) {
        lines.push("_No experiences extracted._");
        lines.push("");
      } else {
        for (const e of exps) {
          const dates = `${e.start_date || "?"} – ${e.is_current ? "Present" : (e.end_date || "?")}`;
          lines.push(`**${e.title || "(no title)"}** @ ${e.company || "(no company)"} _(${dates}, type=${e.type || "?"})_`);
          if (e.responsibilities) {
            lines.push("");
            lines.push("> " + String(e.responsibilities).replace(/\n/g, "\n> ").slice(0, 800));
          }
          if (Array.isArray(e.skills) && e.skills.length > 0) {
            lines.push("");
            lines.push(`Skills: ${e.skills.slice(0, 12).join(", ")}`);
          }
          lines.push("");
        }
      }
      const eduFields = [
        `institution: ${c.cv?.institution || "(none)"}`,
        `degree: ${c.cv?.degree || "(none)"}`,
        `field_of_study: ${c.cv?.field_of_study || "(none)"}`,
        `education_level: ${c.cv?.education_level || "(none)"}`,
        `education_dates: ${c.cv?.education_dates || "(none)"}`,
      ];
      lines.push(`**Education:** ${eduFields.join(" · ")}`);
      lines.push("");
      const flatSkills = Array.isArray(c.cv?.skills) ? c.cv.skills : [];
      lines.push(`**Top-level skills (${flatSkills.length}):** ${flatSkills.slice(0, 30).join(", ")}${flatSkills.length > 30 ? "…" : ""}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── Main ───

async function main() {
  console.error("Loading OpenRouter catalog…");
  await loadOpenRouterCatalog();
  console.error("Resolving requested model slugs against catalog…");
  resolveRequestedModels();
  console.error("Building user index…");
  await buildUserIndex();
  const emails = await pickEmails();
  console.error(`Running ${emails.length} users × ${DIRECT_OPENAI_CONTROLS.length + MODELS.length} models = ${emails.length * (DIRECT_OPENAI_CONTROLS.length + MODELS.length)} calls.`);

  const reports: UserReport[] = [];
  for (const email of emails) {
    try {
      const r = await runOneUser(email);
      if (r) reports.push(r);
    } catch (e) {
      console.error(`  FATAL ${email}: ${e instanceof Error ? e.message : e}`);
    }
  }

  const md = renderMarkdown(reports);
  writeFileSync(OUT, md);
  console.error(`\nWrote ${OUT} (${reports.length} users compared).`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

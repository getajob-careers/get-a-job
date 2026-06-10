// scripts/test-proof-signals-bakeoff.ts
//
// Multi-model bake-off for the PROOF-SIGNALS extraction step in onboarding.
//
// Production today (extract-proof-signals/index.ts:21):
//   - Model: gpt-4o, temperature 0.2, max_tokens 4000, response_format json_object
//   - System prompt: dynamically built from 3 libraries (proof_signal,
//     skill, extraction_logic). Now lives in
//     supabase/functions/_shared/proof-signals-prompt.ts so this harness
//     can import the EXACT production string (single source of truth —
//     refactor preserves production byte-for-byte).
//
// What this harness measures:
//   - Per model: the faithfulness composite (geometric mean of five
//     fabrication heuristics) + completeness + cost + latency.
//   - Decision rule (per the run spec):
//       1. Hard gate: supporting_evidence_verbatim_pct ≥ gpt-4o baseline
//       2. Composite gate: faithfulness ≥ gpt-4o baseline
//       3. Among passers: minimize cost
//       4. Tie-break: latency
//
// Five fabrication heuristics (each scored 0..1, all reported per model):
//   1. supporting_evidence_verbatim_pct  — share of supporting_evidence
//      strings that appear verbatim (normalised) in the source CV. THE
//      hard gate; a wrong substring check mis-scores the whole comparison.
//   2. mapped_skills_valid_pct           — share of mapped_skills entries
//      that exist in the 595-entry skill_library.
//   3. proof_signal_id_valid_pct         — share of `proof_signal` values
//      that exist in the 125-entry proof_signal_library.
//   4. domain_valid_pct                  — share of primary_domain +
//      adjacent_fields references that come from the canonical 11-domain
//      set (domain_detection.primary_domain_rules keys).
//   5. inflated_strength_rate (penalty)  — share of signals marked
//      `strong` with confidence ≥ 0.9 whose supporting_evidence contains
//      weak-action verbs (assisted/helped/supported/etc.). Sub-metric is
//      (1 - rate), higher is better.
//
// Composite faithfulness = geometric mean of {H1, H2, H3, H4, (1 - H5)}.
// Geometric (not arithmetic) so ANY single axis at 0 drags the composite
// to 0 — a model can't paper over fabricated supporting_evidence with
// strong skill-ID coverage.
//
// Pilot fixtures: live users via invite_code filter (GETAJOBPILOT +
// INTERNSHIPGETAJOB), no --limit cap, same shape as
// test-cv-extraction-bakeoff.ts (CV text only — extract-proof-signals
// reads nothing else from the DB).
//
// Usage (smoke against a single user):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   OPENAI_API_KEY=... OPENROUTER_API_KEY=... \
//     npx tsx scripts/test-proof-signals-bakeoff.ts \
//       --emails=michael@sobol.cc --out=/tmp/proof-signals-smoke.md
//
// Usage (full pilot sweep):
//   npx tsx scripts/test-proof-signals-bakeoff.ts \
//     --invite-codes=GETAJOBPILOT,INTERNSHIPGETAJOB \
//     --detail-users=nevo.liani@gmail.com,michael@sobol.cc \
//     --out=/tmp/proof-signals-bakeoff.md
//
//   To include agam in detail dumps, append their email to --detail-users.
//
// --reasoning-effort flag: defaults to "none" for gpt-5.x candidates,
// matching the resume-extractor production stance (latency-first). Pass
// --reasoning-effort=low|medium|high|xhigh for a follow-up quality run
// if "none" doesn't clear the baseline.
//
// Cost estimate (5 models × ~all 100 pilot users with resumes):
//   - gpt-4o:                ~$0.038/call → ~$3.80
//   - gpt-4o-mini:           ~$0.002/call → ~$0.20
//   - gpt-5.4-mini (none):   ~$0.012/call → ~$1.20
//   - gpt-5.5 (none):        ~$0.085/call → ~$8.50
//   - claude-haiku-4.5:      ~$0.015/call → ~$1.50
//   Total worst case: ~$15.20 across ~100 users.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import {
  SYSTEM_PROMPT,
  USER_MESSAGE_PREFIX,
  VALID_SIGNAL_IDS,
  VALID_SKILL_IDS,
  VALID_DOMAINS,
} from "../supabase/functions/_shared/proof-signals-prompt.ts";

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
const DETAIL_USERS = arg("detail-users", "nevo.liani@gmail.com,michael@sobol.cc")
  .split(",").map((s) => s.trim()).filter(Boolean);
const OUT = arg("out", "/tmp/proof-signals-bakeoff.md");

// reasoning_effort default matches production resume-extractor (latency-
// first). Override for follow-up high-effort runs via the CLI.
const VALID_REASONING_EFFORTS = new Set(["none", "low", "medium", "high", "xhigh"]);
const REASONING_EFFORT = (() => {
  const v = arg("reasoning-effort", "none").toLowerCase();
  if (!VALID_REASONING_EFFORTS.has(v)) {
    console.error(`ERROR: --reasoning-effort=${v} not in {none, low, medium, high, xhigh}`);
    process.exit(1);
  }
  return v;
})();

// Candidate list per run spec:
//   Direct OpenAI: gpt-4o (baseline), gpt-4o-mini, gpt-5.4-mini, gpt-5.5
//   OpenRouter: anthropic/claude-haiku-4.5
const DIRECT_OPENAI_CONTROLS = ["gpt-4o", "gpt-4o-mini", "gpt-5.4-mini", "gpt-5.5"];

const DEFAULT_MODELS = ["anthropic/claude-haiku-4.5"].join(",");
const REQUESTED_MODELS = arg("models", DEFAULT_MODELS)
  .split(",").map((s) => s.trim()).filter(Boolean);
let MODELS: string[] = [];
const SKIPPED_MODELS: string[] = [];

// Matches both bare OpenAI slugs (direct-OpenAI controls) AND OpenRouter-
// prefixed ones — same pattern + rationale as test-cv-extraction-bakeoff.ts.
const REASONING_MODEL_PATTERNS = [
  /^(openai\/)?gpt-5(\.|$)/i,
  /^(openai\/)?o[1-9](\.|-|$)/i,
  /-thinking$/i,
];
const isReasoningModel = (slug: string) => REASONING_MODEL_PATTERNS.some((rx) => rx.test(slug));

// gpt-4o family rates from OpenAI, gpt-5.x estimates from public pricing.
// claude-haiku-4.5 estimate — the live OpenRouter catalog overrides this
// for any OR-routed cell, so the fallback only fires if catalog is down.
const PRICING_FALLBACK: Record<string, { in_per_m: number; out_per_m: number }> = {
  "gpt-4o": { in_per_m: 2.5, out_per_m: 10 },
  "gpt-4o-mini": { in_per_m: 0.15, out_per_m: 0.6 },
  "gpt-5.4-mini": { in_per_m: 0.25, out_per_m: 2 },
  "gpt-5.5": { in_per_m: 5, out_per_m: 30 },
  "openai/gpt-5.5": { in_per_m: 5, out_per_m: 30 },
  "anthropic/claude-haiku-4.5": { in_per_m: 1, out_per_m: 5 },
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// ─── Latin-1 safe headers (carry-over) ───

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

// ─── User resolution + OpenRouter catalog (carry-over) ───

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

// ─── Resume download + text extraction (mirrors production) ───

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
  const ext: "pdf" | "docx" | "other" = lower.endsWith(".pdf")
    ? "pdf"
    : lower.endsWith(".docx")
      ? "docx"
      : "other";
  return { path: `${userId}/${latest.name}`, ext, name: latest.name };
}

async function downloadAndExtractText(
  filePath: string,
  ext: "pdf" | "docx" | "other",
): Promise<{ text: string; pages: number }> {
  if (ext === "other") {
    throw new Error(`unsupported file type for ${filePath} — only .pdf and .docx are handled`);
  }
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

// ─── Model invocation ───

interface CallResult {
  parsed: any;
  raw: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  cost_usd: number;
  finish_reason: string;
  ok: boolean;
  error?: string;
}

async function callModel(modelSlug: string): Promise<CallResult> {
  const t0 = Date.now();
  const isDirectOpenAI = DIRECT_OPENAI_CONTROLS.includes(modelSlug);
  const url = isDirectOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const key = isDirectOpenAI ? OPENAI_API_KEY : OPENROUTER_API_KEY;
  const reasoning = isReasoningModel(modelSlug);
  // Cap heuristics — proof-signals output is smaller than CV extraction
  // (compact signal objects, no nested experiences). Production uses 4000
  // for gpt-4o (extract-proof-signals/index.ts:165); we mirror.
  //   - Direct OpenAI non-reasoning (gpt-4o, gpt-4o-mini): 4000 (prod-parity)
  //   - Direct OpenAI reasoning (gpt-5.4-mini, gpt-5.5): 16000 — hidden
  //     reasoning tokens count even at effort=none, so we need headroom.
  //   - OpenRouter non-reasoning (Haiku): 4000.
  //   - OpenRouter reasoning: 16000.
  const completionCap = reasoning ? 16000 : 4000;

  return callModelWithCV(modelSlug, isDirectOpenAI, url, key!, reasoning, completionCap, t0);
}

// Split out so the source CV text is closed over via the caller (we set
// it on a module-level per-user variable below). Keeping the body
// separate also makes the reasoning/non-reasoning branching easier to
// read.
let _currentCV = "";
async function callModelWithCV(
  modelSlug: string,
  isDirectOpenAI: boolean,
  url: string,
  key: string,
  reasoning: boolean,
  completionCap: number,
  t0: number,
): Promise<CallResult> {
  const body: any = {
    model: modelSlug,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${USER_MESSAGE_PREFIX}${_currentCV}` },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  };
  if (reasoning) {
    body.max_completion_tokens = completionCap;
    body.reasoning_effort = REASONING_EFFORT;
    if (!isDirectOpenAI) body.reasoning = { effort: REASONING_EFFORT };
  } else {
    body.max_tokens = completionCap;
  }

  try {
    const headers = assertLatin1Headers({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(isDirectOpenAI ? {} : {
        "HTTP-Referer": latin1SafeHeader("https://getajob.careers"),
        "X-Title": latin1SafeHeader("Get A Job - proof-signals bake-off"),
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
        parsed: {}, raw: "",
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
      return { parsed: {}, raw, tokens_in, tokens_out, latency_ms, cost_usd, finish_reason, ok: false, error: label };
    }

    if (finish_reason === "length") {
      return {
        parsed, raw,
        tokens_in, tokens_out, latency_ms, cost_usd, finish_reason,
        ok: false,
        error: `truncated_but_parsed visible=${tokens_out} cap=${completionCap}`,
      };
    }
    return { parsed, raw, tokens_in, tokens_out, latency_ms, cost_usd, finish_reason, ok: true };
  } catch (e) {
    return {
      parsed: {}, raw: "",
      tokens_in: 0, tokens_out: 0, latency_ms: Date.now() - t0,
      cost_usd: 0, finish_reason: "", ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ─── Fabrication heuristics ───

// Normalisation for the verbatim substring check. Lowercases, collapses
// any whitespace run (newlines included — PDF text extraction often
// splits a quoted phrase across lines), and folds smart-quote / dash
// variants to their ASCII equivalents so text-extractor artifacts
// don't trip the check on legitimate verbatim quotes.
function normalizeForVerbatim(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

// Weak-verb regex for the inflated-strength heuristic. Word-boundary
// anchored so "unassisted" doesn't falsely trigger "assisted". Case-
// insensitive because supporting_evidence may include capitalised
// sentence starters.
const WEAK_VERBS = ["assisted", "helped", "supported", "participated", "contributed", "shadowed", "observed"];
const WEAK_VERB_RE = new RegExp(`\\b(${WEAK_VERBS.join("|")})\\b`, "i");

interface Faithfulness {
  // Per-signal counts (denominators)
  signals_count: number;
  signals_with_evidence: number;
  signals_marked_strong_high_conf: number;
  // Per-entry counts (denominators for H1 + H2)
  total_evidence_entries: number;
  total_mapped_skill_entries: number;
  total_domain_references: number;
  // Numerators
  verbatim_evidence_entries: number;
  valid_skill_id_entries: number;
  valid_signal_ids: number;
  valid_domain_references: number;
  inflated_signals: number;
  // Computed ratios (each ∈ [0, 1])
  h1_supporting_evidence_verbatim: number;
  h2_mapped_skills_valid: number;
  h3_proof_signal_id_valid: number;
  h4_domain_valid: number;
  h5_inflated_strength_rate: number;
  // Composite
  faithfulness_composite: number;
}

// H1 — supporting_evidence verbatim check.
//
// Counting unit: per-entry, with a per-signal floor — a signal that
// produces ZERO non-empty supporting_evidence entries counts as one
// verbatim miss (den +1, num +0). Rationale: proof_signals is the
// primary CV-bullet grounding source for generate-tailored-cv; an
// unsupported signal cannot serve that role. Letting empty-evidence
// signals score neutrally (excluded from denominator) would let a
// model that emits 20 unsupported strong claims tie a model that
// emits 5 well-quoted ones.
//
// Normalization: see normalizeForVerbatim above. The CV is normalized
// ONCE per user (in scoreFaithfulness), not per entry, because the
// source text never changes within a user's row.
function h1Verbatim(signals: any[], normalizedCV: string): { num: number; den: number } {
  let den = 0;
  let num = 0;
  for (const s of signals) {
    const evidence = Array.isArray(s?.supporting_evidence) ? s.supporting_evidence : [];
    let entriesScored = 0;
    for (const ev of evidence) {
      if (typeof ev !== "string" || !ev.trim()) continue;
      den++;
      entriesScored++;
      if (normalizedCV.includes(normalizeForVerbatim(ev))) num++;
    }
    // Per-signal floor: a signal with zero non-empty supporting_evidence
    // entries scores as one miss against this axis. den +1, num stays.
    if (entriesScored === 0) {
      den++;
    }
  }
  return { num, den };
}

// H2 — mapped_skills validity.
//
// Counting unit: per-entry. Every skill ID claim is either in the 595-
// entry skill_library or it's a hallucination. Signals with empty
// mapped_skills contribute 0 to the denominator.
function h2SkillIds(signals: any[]): { num: number; den: number } {
  let den = 0;
  let num = 0;
  for (const s of signals) {
    const skills = Array.isArray(s?.mapped_skills) ? s.mapped_skills : [];
    for (const sk of skills) {
      if (typeof sk !== "string" || !sk.trim()) continue;
      den++;
      if (VALID_SKILL_IDS.has(sk.trim())) num++;
    }
  }
  return { num, den };
}

// H3 — proof_signal ID validity.
//
// Counting unit: per-signal. Each signal's `proof_signal` field is either
// in the 125-entry proof_signal_library or it's an invented ID.
function h3SignalIds(signals: any[]): { num: number; den: number } {
  let den = 0;
  let num = 0;
  for (const s of signals) {
    if (typeof s?.proof_signal !== "string" || !s.proof_signal.trim()) continue;
    den++;
    if (VALID_SIGNAL_IDS.has(s.proof_signal.trim())) num++;
  }
  return { num, den };
}

// H4 — domain validity.
//
// Counting unit: per-reference. Every primary_domain mention (signal-
// level AND top-level) plus every adjacent_fields entry. Canonical set is
// the 11-domain primary_domain_rules keyset from extraction_logic.
function h4Domains(signals: any[], topPrimary: unknown, topAdjacent: unknown): { num: number; den: number } {
  let den = 0;
  let num = 0;
  const check = (v: unknown) => {
    if (typeof v !== "string" || !v.trim()) return;
    den++;
    if (VALID_DOMAINS.has(v.trim())) num++;
  };
  for (const s of signals) {
    check(s?.primary_domain);
    const adj = Array.isArray(s?.adjacent_fields) ? s.adjacent_fields : [];
    for (const a of adj) check(a);
  }
  check(topPrimary);
  const topAdj = Array.isArray(topAdjacent) ? topAdjacent : [];
  for (const a of topAdj) check(a);
  return { num, den };
}

// H5 — inflated strength penalty.
//
// Definition: a signal marked `strong` with confidence_score >= 0.9 is
// "inflated" if its supporting_evidence (joined) contains any weak-action
// verb from WEAK_VERBS. Rate = inflated / total_signals (NOT / strong-
// only) so a model that marks everything strong AND backs every claim
// with weak verbs scores the same as a model that marks half strong but
// inflates all of those — both are problems.
//
// Sub-metric for the composite: 1 - rate (higher = less inflation).
// Signals with empty supporting_evidence don't trigger the inflation
// flag here — they fail H1 instead (no verifiable text).
function h5Inflated(signals: any[]): { inflated: number; total: number } {
  let inflated = 0;
  for (const s of signals) {
    if (s?.strength !== "strong") continue;
    if (typeof s?.confidence_score !== "number" || s.confidence_score < 0.9) continue;
    const evidence = Array.isArray(s?.supporting_evidence) ? s.supporting_evidence.join(" ") : "";
    if (WEAK_VERB_RE.test(evidence)) inflated++;
  }
  return { inflated, total: signals.length };
}

function safeRatio(num: number, den: number, fallback: number): number {
  if (den === 0) return fallback;
  return num / den;
}

// Composite faithfulness = geometric mean of {H1, H2, H3, H4, (1 - H5)}.
// Each component is in [0, 1]. Geometric (not arithmetic) so a single
// axis at 0 drags the composite to 0 — a model can't paper over
// fabricated supporting_evidence with high coverage on other axes.
function geometricMean(values: number[]): number {
  if (values.length === 0) return 0;
  let product = 1;
  for (const v of values) {
    const clamped = Math.max(0, Math.min(1, v));
    product *= clamped;
  }
  return Math.pow(product, 1 / values.length);
}

function scoreFaithfulness(parsed: any, sourceText: string): Faithfulness {
  const signals = Array.isArray(parsed?.proof_signals) ? parsed.proof_signals : [];
  const normalizedCV = normalizeForVerbatim(sourceText);

  const h1 = h1Verbatim(signals, normalizedCV);
  const h2 = h2SkillIds(signals);
  const h3 = h3SignalIds(signals);
  const h4 = h4Domains(signals, parsed?.primary_domain, parsed?.adjacent_fields);
  const h5 = h5Inflated(signals);

  // If the model produced zero signals (or zero claims of a given type),
  // we score that axis as 0 — not 1. A model producing nothing has not
  // demonstrated faithfulness; it's failed the task.
  const h1Ratio = safeRatio(h1.num, h1.den, 0);
  const h2Ratio = safeRatio(h2.num, h2.den, 0);
  const h3Ratio = safeRatio(h3.num, h3.den, 0);
  const h4Ratio = safeRatio(h4.num, h4.den, 0);
  const h5Rate = safeRatio(h5.inflated, h5.total, 0);

  const signalsWithEvidence = signals.filter(
    (s: any) => Array.isArray(s?.supporting_evidence) && s.supporting_evidence.some(
      (e: any) => typeof e === "string" && e.trim().length > 0,
    ),
  ).length;
  const signalsMarkedStrongHighConf = signals.filter(
    (s: any) => s?.strength === "strong" && typeof s?.confidence_score === "number" && s.confidence_score >= 0.9,
  ).length;

  return {
    signals_count: signals.length,
    signals_with_evidence: signalsWithEvidence,
    signals_marked_strong_high_conf: signalsMarkedStrongHighConf,
    total_evidence_entries: h1.den,
    total_mapped_skill_entries: h2.den,
    total_domain_references: h4.den,
    verbatim_evidence_entries: h1.num,
    valid_skill_id_entries: h2.num,
    valid_signal_ids: h3.num,
    valid_domain_references: h4.num,
    inflated_signals: h5.inflated,
    h1_supporting_evidence_verbatim: h1Ratio,
    h2_mapped_skills_valid: h2Ratio,
    h3_proof_signal_id_valid: h3Ratio,
    h4_domain_valid: h4Ratio,
    h5_inflated_strength_rate: h5Rate,
    faithfulness_composite: geometricMean([h1Ratio, h2Ratio, h3Ratio, h4Ratio, 1 - h5Rate]),
  };
}

// ─── Completeness (secondary signals) ───

interface Completeness {
  signals_count: number;
  avg_confidence: number;
  primary_domain_detected: boolean;
  adjacent_fields_count: number;
}

function scoreCompleteness(parsed: any): Completeness {
  const signals = Array.isArray(parsed?.proof_signals) ? parsed.proof_signals : [];
  const confidences = signals
    .map((s: any) => (typeof s?.confidence_score === "number" ? s.confidence_score : null))
    .filter((c: any) => c !== null) as number[];
  const avg = confidences.length === 0
    ? 0
    : confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const topAdjacent = Array.isArray(parsed?.adjacent_fields) ? parsed.adjacent_fields : [];
  return {
    signals_count: signals.length,
    avg_confidence: avg,
    primary_domain_detected: typeof parsed?.primary_domain === "string" && parsed.primary_domain.trim().length > 0,
    adjacent_fields_count: topAdjacent.length,
  };
}

// ─── Per-user pipeline ───

interface UserCell {
  faithfulness: Faithfulness;
  completeness: Completeness;
  latency_ms: number;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  parsed: any;
  ok: boolean;
  error?: string;
}

interface UserReport {
  email: string;
  user_id: string;
  file_path: string;
  file_ext: "pdf" | "docx";
  file_pages: number;
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
  const resume = await listLatestResume(userId);
  if (!resume) {
    console.error(`  no resume file in resumes/${userId}/`);
    return null;
  }
  if (resume.ext === "other") {
    console.error(`  latest file in resumes/${userId}/ is "${resume.name}" — neither .pdf nor .docx, skipping`);
    return null;
  }
  let text: string, pages: number;
  try {
    const r = await downloadAndExtractText(resume.path, resume.ext);
    text = r.text; pages = r.pages;
  } catch (e) {
    console.error(`  extract failed: ${e instanceof Error ? e.message : e}`);
    return null;
  }
  if (!text.trim()) {
    console.error(`  empty text (likely image-only PDF or empty docx) — skipping`);
    return null;
  }
  const truncated = text.length > 15000;
  const sourceText = text.slice(0, 15000);
  const pagesStr = resume.ext === "pdf" ? ` pages=${pages}` : "";
  console.error(`  file=${resume.path} (${resume.ext})${pagesStr} text_len=${text.length}${truncated ? " (truncated to 15000)" : ""}`);

  _currentCV = sourceText;
  const cells: Record<string, UserCell> = {};
  const allModels = [...DIRECT_OPENAI_CONTROLS, ...MODELS];
  for (const slug of allModels) {
    console.error(`  → ${slug}…`);
    const r = await callModel(slug);
    cells[slug] = {
      faithfulness: scoreFaithfulness(r.parsed, sourceText),
      completeness: scoreCompleteness(r.parsed),
      latency_ms: r.latency_ms,
      cost_usd: r.cost_usd,
      tokens_in: r.tokens_in,
      tokens_out: r.tokens_out,
      parsed: r.parsed,
      ok: r.ok,
      error: r.error,
    };
  }

  return {
    email,
    user_id: userId,
    file_path: resume.path,
    file_ext: resume.ext,
    file_pages: pages,
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
  // No --limit cap per run spec: full pilot set.
  return emails;
}

// ─── Markdown report ───

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmt3 = (v: number) => v.toFixed(3);

function renderMarkdown(reports: UserReport[]): string {
  const lines: string[] = [];
  lines.push("# Proof-signals — multi-model bake-off");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Reasoning effort (gpt-5.x cells): \`${REASONING_EFFORT}\``);
  lines.push("");
  lines.push("Measures `extract-proof-signals` (production: `gpt-4o`). System prompt + user-message prefix imported byte-for-byte from `supabase/functions/_shared/proof-signals-prompt.ts` so the diff measures only model variance.");
  lines.push("");
  lines.push("**Faithfulness composite** = geometric mean of the five fabrication heuristics:");
  lines.push("- H1 supporting_evidence verbatim % (the hard gate)");
  lines.push("- H2 mapped_skills validity %");
  lines.push("- H3 proof_signal ID validity %");
  lines.push("- H4 domain validity %");
  lines.push("- (1 - H5) inflated-strength rate");
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

  const allModels = [...DIRECT_OPENAI_CONTROLS, ...MODELS];
  const sumCost = (cells: UserCell[]) => cells.reduce((a, c) => a + c.cost_usd, 0);
  const p50Lat = (cells: UserCell[]) => {
    const arr = cells.map((c) => c.latency_ms).sort((a, b) => a - b);
    return arr.length === 0 ? 0 : arr[Math.floor(arr.length / 2)];
  };
  const avg = (xs: number[]) => xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

  lines.push("## Per-model summary (averages across users)");
  lines.push("");
  lines.push("Decision rule: clear `Verbatim %` baseline AND `Faith` baseline (both columns for `gpt-4o`); among passers minimize cost, tie-break on `Lat p50`.");
  lines.push("");
  lines.push("| Model | Users | Sig avg | Verb % | Skill % | SigID % | Dom % | NonInfl % | **Faith** | Conf avg | Lat p50 | Cost $ | Fails |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const slug of allModels) {
    const cells: UserCell[] = [];
    for (const r of reports) if (r.cells[slug]) cells.push(r.cells[slug]);
    const okCells = cells.filter((c) => c.ok);
    const fails = cells.length - okCells.length;
    const f = okCells.map((c) => c.faithfulness);
    const c = okCells.map((c) => c.completeness);
    lines.push(
      `| \`${slug}\` | ${cells.length} | ${avg(f.map((x) => x.signals_count)).toFixed(1)} | ${fmtPct(avg(f.map((x) => x.h1_supporting_evidence_verbatim)))} | ${fmtPct(avg(f.map((x) => x.h2_mapped_skills_valid)))} | ${fmtPct(avg(f.map((x) => x.h3_proof_signal_id_valid)))} | ${fmtPct(avg(f.map((x) => x.h4_domain_valid)))} | ${fmtPct(1 - avg(f.map((x) => x.h5_inflated_strength_rate)))} | **${fmt3(avg(f.map((x) => x.faithfulness_composite)))}** | ${fmt3(avg(c.map((x) => x.avg_confidence)))} | ${p50Lat(cells)} | ${sumCost(cells).toFixed(4)} | ${fails} |`,
    );
  }
  lines.push("");

  for (const r of reports) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${r.email}`);
    const pagesStr = r.file_ext === "pdf" ? ` · ${r.file_pages} pages` : "";
    lines.push(`File: \`${r.file_path}\` (${r.file_ext})${pagesStr} · source text ${r.source_text_len} chars${r.source_text_len > 15000 ? " (truncated to 15000)" : ""}.`);
    lines.push("");
    lines.push("| Model | Sig | Verb % | Skill % | SigID % | Dom % | NonInfl % | Faith | Lat (ms) | $ | Status |");
    lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
    for (const slug of allModels) {
      const c = r.cells[slug];
      if (!c) { lines.push(`| \`${slug}\` | — | — | — | — | — | — | — | — | — | not run |`); continue; }
      const f = c.faithfulness;
      const status = c.ok ? "ok" : `**FAIL**: ${(c.error || "").slice(0, 60)}`;
      lines.push(`| \`${slug}\` | ${f.signals_count} | ${fmtPct(f.h1_supporting_evidence_verbatim)} | ${fmtPct(f.h2_mapped_skills_valid)} | ${fmtPct(f.h3_proof_signal_id_valid)} | ${fmtPct(f.h4_domain_valid)} | ${fmtPct(1 - f.h5_inflated_strength_rate)} | ${fmt3(f.faithfulness_composite)} | ${c.latency_ms} | $${c.cost_usd.toFixed(4)} | ${status} |`);
    }
    lines.push("");
  }

  for (const detailEmail of DETAIL_USERS) {
    const detail = reports.find((r) => r.email === detailEmail);
    if (!detail) continue;
    lines.push("---");
    lines.push("");
    lines.push(`## Detail dump — ${detailEmail}`);
    lines.push("");
    lines.push("### Source CV text (first 4000 chars, passed verbatim to every model)");
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
      const f = c.faithfulness;
      lines.push(`Signals: **${f.signals_count}** · Verbatim: **${fmtPct(f.h1_supporting_evidence_verbatim)}** · Faith composite: **${fmt3(f.faithfulness_composite)}**`);
      lines.push(`Top-level primary_domain: \`${c.parsed?.primary_domain || "(none)"}\` · adjacent: ${(c.parsed?.adjacent_fields || []).join(", ") || "(none)"}`);
      lines.push("");
      const signals = (c.parsed?.proof_signals || []).slice(0, 6);
      if (signals.length === 0) {
        lines.push("_No signals extracted._\n");
        continue;
      }
      for (const s of signals) {
        const ev = Array.isArray(s?.supporting_evidence) ? s.supporting_evidence.slice(0, 2).join(" | ") : "";
        const skills = Array.isArray(s?.mapped_skills) ? s.mapped_skills.slice(0, 4).join(", ") : "";
        lines.push(`- **${s?.proof_signal || "(no id)"}** _(${s?.strength}, conf=${s?.confidence_score}, src=${s?.source}, domain=${s?.primary_domain || "?"})_`);
        if (skills) lines.push(`  - skills: ${skills}`);
        if (ev) lines.push(`  - evidence: ${ev}`);
      }
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

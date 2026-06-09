// scripts/test-cv-authoring-diff.ts
//
// Multi-model bake-off harness for Option A CV authoring (responsibilities-as-primary,
// bullet-per-line cap, numeric carry-through, sparse-profile fallback).
//
// Two transport paths:
//   - Direct OpenAI (api.openai.com)    — used ONLY for the gpt-4o controls
//     so the two baselines reproduce production exactly. Auth: OPENAI_API_KEY.
//   - OpenRouter (openrouter.ai/api/v1) — used for every cross-model run.
//     Auth: OPENROUTER_API_KEY.
//
// What runs:
//   - Control 1: gpt-4o + OLD prompt (current production behaviour)
//   - Control 2: gpt-4o + NEW prompt (Option A)
//   - Bake-off: every model in --models, NEW prompt only
//
// Default --models set (looked up against OpenRouter catalog 2026-06-09):
//   openai/gpt-5.5-20260423            ($5 / $30 per M tokens)
//   anthropic/claude-opus-4.8-20260528 ($5 / $25)
//   google/gemini-3.5-flash-20260519   ($1.50 / $9)
//   x-ai/grok-4.3-20260430             (~$1.25 / $2.50, 4.20 pricing inherited)
//
// claude-sonnet-4.6 is NOT in the OpenRouter catalog as of 2026-06-09 —
// skipped per "note and skip rather than guess" instruction (will appear in
// the report's preamble).
//
// Per-model output:
//   - total bullet count across all professional experiences
//   - numeric carry-through X/Y per user (X = source numbers reproduced)
//   - latency (ms per call)
//   - cost in USD (input + output tokens × pricing table)
//
// Plus a "Gavibook full bullets" section that prints the entire authored
// CV professional_experiences section for every model side-by-side. This
// is the writing-quality read, not just counts.
//
// Usage:
//   SUPABASE_URL=https://ilmqmodklutztuybsvwd.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   OPENAI_API_KEY=...        # for gpt-4o controls only
//   OPENROUTER_API_KEY=...    # for every other model
//     npx tsx scripts/test-cv-authoring-diff.ts \
//       --emails=michael@sobol.cc,gavibook@gmail.com,nevo.liani@gmail.com \
//       --out=/tmp/cv-bakeoff.md
//
// Cost (rough):
//   - 2 gpt-4o controls × 3 users  = 6 calls × ~$0.05 = $0.30
//   - 4 bake-off models × 3 users  = 12 calls, dominated by GPT-5.5
//     ($5/$30 → ~$0.10 each → $0.30) and Opus 4.8 ($5/$25 → ~$0.10 → $0.30).
//     Gemini Flash + Grok are minor (~$0.05 + $0.02 total).
//   - Total run: ~$1.00 give or take 30%.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

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
const EMAILS = arg("emails", "michael@sobol.cc,gavibook@gmail.com,nevo.liani@gmail.com")
  .split(",").map((s) => s.trim()).filter(Boolean);
const OUT = arg("out", "/tmp/cv-bakeoff.md");
const TARGET_ROLE = arg("role", "Customer Success Specialist");
const DETAIL_USER = arg("detail-user", "gavibook@gmail.com");

// Bake-off requests use the simple (un-dated) slug form so the runtime
// resolver can find the catalog entry no matter what date suffix the
// catalog currently exposes. Slug strings here are *requests*, not the
// final resolved IDs — see resolveModelSlug() below.
// claude-sonnet-4.6 is included so the resolver can pick it up if/when
// it lands in the catalog; if not, it'll be skipped with closest-matches
// suggestions.
const DEFAULT_MODELS = [
  "openai/gpt-5.5",
  "anthropic/claude-opus-4.8",
  "anthropic/claude-sonnet-4.6",
  "google/gemini-3.5-flash",
  "x-ai/grok-4.3",
].join(",");
const REQUESTED_MODELS = arg("models", DEFAULT_MODELS).split(",").map((s) => s.trim()).filter(Boolean);
let MODELS: string[] = []; // filled by resolveRequestedModels() at startup
const SKIPPED_MODELS: string[] = [];

// Reasoning-model allowlist — these consume hidden reasoning tokens before
// emitting visible JSON, so they need a much larger completion budget and
// (when supported) the OpenRouter `reasoning: { effort }` knob to keep the
// visible-token share usable.
const REASONING_MODEL_PATTERNS = [
  /^openai\/gpt-5(\.|$)/i,         // gpt-5, gpt-5.4, gpt-5.5, gpt-5.5-pro, etc.
  /^openai\/o[1-9](\.|-|$)/i,      // o1, o3, etc.
  /-thinking$/i,                   // anthropic/claude-*-thinking
];
const isReasoningModel = (slug: string) => REASONING_MODEL_PATTERNS.some((rx) => rx.test(slug));

// Hardcoded pricing fallback ($/1M input, $/1M output). The runtime catalog
// query at startup is the primary source; fallback only fires for slugs the
// /models endpoint doesn't price (rare).
const PRICING_FALLBACK: Record<string, { in_per_m: number; out_per_m: number }> = {
  "gpt-4o": { in_per_m: 2.5, out_per_m: 10 },
  "openai/gpt-5.5": { in_per_m: 5, out_per_m: 30 },
  "anthropic/claude-opus-4.8": { in_per_m: 5, out_per_m: 25 },
  "google/gemini-3.5-flash": { in_per_m: 1.5, out_per_m: 9 },
  "x-ai/grok-4.3": { in_per_m: 1.25, out_per_m: 2.5 },
};

const GPT4O_CONTROL = "gpt-4o";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// ─── Prompt fragments — identical to the prior single-diff harness so the
// model comparison is purely about model behaviour, not prompt variance. ───

const TRUTHFULNESS_CORE = `TRUTHFULNESS — these override all other rules:
- NEVER invent metrics, numbers, percentages, durations, team sizes, dollar amounts, dates, company names, or tools that aren't EXPLICITLY in the user's source data.
- NEVER add skills, tools, certifications, or experiences the user doesn't have in the source.
- Use EXACT job titles and company names from the source.`;

const VOICE_CORE = `WRITING VOICE:
- Action verbs that picture a real action ("Built", "Migrated", "Negotiated", "Reduced") — not category verbs ("leveraged", "drove growth").
- 14-22 words per bullet. No filler.
- Numbers belong in bullets when they exist in the source data. Round numbers that look invented are worse than no numbers.`;

const OLD_BULLET_POLICY = `BULLET POLICY (current production behaviour):
- Professional experiences: 2-4 bullets per role. Pick the number based on richness of the source: a role with one short responsibility line gets 2 bullets; a role with multiple stories + named tools + measured outcomes gets 4.
- Hard ceiling: 5 bullets per experience.
- SOURCE PRECEDENCE: when stories[] contains a story whose experience_label matches an experience AND a JD requirement, PREFER the story's result + metrics + tools_used over the experience's freeform responsibilities text. Otherwise use the responsibilities text.
- VERBATIM METRICS (stories only): every entry from a matched story's metrics[] array must appear in a bullet WORD-FOR-WORD. Numbers in responsibilities text may be rephrased.`;

const NEW_BULLET_POLICY = `BULLET POLICY (Option A):
- Professional experiences: ONE bullet per distinct responsibility line in the source, capped at 6. If the user wrote 5 responsibility lines, emit 5 bullets — do not compress to 3. If 1 short line, emit 1-2 bullets (split a compound responsibility if needed; do not invent). Faithfulness over compression. Drop the LEAST JD-relevant line only if you hit the 6-bullet ceiling.
- SOURCE PRECEDENCE — RESPONSIBILITIES FIRST: experience.responsibilities is the PRIMARY source. Stories are OPTIONAL ENRICHMENT — they may contribute a metric or named tool the responsibility omits, but never replace a responsibility line. Source ranking: responsibilities > proof_signals (enrichment) > stories (enrichment).
- VERBATIM METRICS (responsibilities AND stories): every number in the responsibilities text — counts, percentages, currency, durations, team sizes, volumes — MUST appear in a bullet for that experience. Rephrasing applies to verbs and structure, NOT to the numbers themselves. If a single bullet can't carry all numbers, distribute across multiple bullets for the same experience.
- SPARSE-PROFILE FALLBACK: when professional_experiences[] is empty or contains only a short single entry, the About Me must anchor on education + draw 2-3 specific claims from proof_signals. Render up to 4 academic_projects per education entry (cap rises from 2 to 4). Surface every project. Skills section carries the relevance signal.`;

const buildSystemPrompt = (policyBlock: string) => `You are writing a tailored resume for a candidate applying to "${TARGET_ROLE}".

${TRUTHFULNESS_CORE}

${VOICE_CORE}

${policyBlock}

Return JSON only, exactly this shape:
{
  "about_me": "string — 2-4 sentences grounded in USER DATA",
  "professional_experiences": [
    { "title": "string", "company": "string", "dates": "string", "bullets": ["string", ...] }
  ],
  "academic_projects": [
    { "name": "string", "description": "string" }
  ],
  "projects": [
    { "name": "string", "bullets": ["string", ...] }
  ],
  "skills": ["string", ...]
}`;

// ─── User loading (auth.admin.listUsers based — see prior fix) ───

interface UserContext {
  email: string;
  full_name: string;
  profile_summary: string;
  professional_experiences: Array<{
    title: string;
    company: string;
    dates: string;
    responsibilities: string;
    skills: string[];
  }>;
  projects: Array<{ name: string; description: string; skills: string[] }>;
  education: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    academic_projects: string[];
  }>;
  proof_signals: any[];
  skills: string[];
}

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

async function loadUser(email: string): Promise<UserContext | null> {
  const userId = await userIdByEmail(email);
  if (!userId) {
    console.error(`  could not resolve ${email}: not found in auth.users`);
    return null;
  }

  const [pRes, eRes, prRes, edRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("experiences").select("*").eq("user_id", userId),
    supabase.from("projects").select("*").eq("user_id", userId),
    supabase.from("education").select("*").eq("user_id", userId).order("display_order", { ascending: true }),
  ]);

  const p = pRes.data as any;
  if (!p) return null;

  const fmtDates = (e: any): string => {
    const s = String(e?.start_date ?? "").slice(0, 20);
    const en = e?.is_current ? "Present" : String(e?.end_date ?? "").slice(0, 20);
    if (!s && !en) return "";
    return `${s}${en ? ` – ${en}` : ""}`;
  };

  return {
    email,
    full_name: p.full_name ?? "",
    profile_summary: p.summary ?? "",
    professional_experiences: (eRes.data || []).map((e: any) => ({
      title: String(e.title || "").slice(0, 100),
      company: String(e.company || "").slice(0, 100),
      dates: fmtDates(e),
      responsibilities: String(e.responsibilities || "").slice(0, 4000),
      skills: Array.isArray(e.skills) ? e.skills.slice(0, 40).map((s: any) => String(s).slice(0, 60)) : [],
    })),
    projects: (prRes.data || []).map((pr: any) => ({
      name: String(pr.name || "").slice(0, 100),
      description: String(pr.description || "").slice(0, 500),
      skills: Array.isArray(pr.skills) ? pr.skills.slice(0, 20).map((s: any) => String(s).slice(0, 60)) : [],
    })),
    education: (edRes.data || []).map((e: any) => ({
      institution: String(e.institution || "").slice(0, 200),
      degree: String(e.degree_type || "").slice(0, 100),
      field_of_study: String(e.field_of_study || "").slice(0, 100),
      academic_projects: Array.isArray(e.academic_projects)
        ? e.academic_projects.slice(0, 10).map((x: any) => String(x).slice(0, 200))
        : [],
    })),
    proof_signals: Array.isArray(p.proof_signals) ? p.proof_signals.slice(0, 20) : [],
    skills: Array.isArray(p.skills) ? p.skills.slice(0, 50).map((s: any) => String(s).slice(0, 60)) : [],
  };
}

// ─── Pricing — fetch the OpenRouter /models endpoint once at startup so we
// don't drift from the catalog. Falls back to the hardcoded table above
// when a slug isn't present in the live response. ───

let _orPricing: Map<string, { in_per_m: number; out_per_m: number }> | null = null;
let _orCatalog: string[] | null = null; // every catalog id, sorted, kept for resolver suggestions

async function loadOpenRouterCatalog(): Promise<void> {
  if (_orPricing && _orCatalog) return;
  _orPricing = new Map();
  _orCatalog = [];
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.warn(`  OpenRouter /models returned ${res.status} — falling back to hardcoded pricing, no slug resolution available`);
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
    console.warn(`  OpenRouter catalog fetch failed (${e instanceof Error ? e.message : e}) — fallback table will be used, no slug resolution available`);
  }
}

function priceFor(slug: string): { in_per_m: number; out_per_m: number } {
  if (_orPricing?.has(slug)) return _orPricing.get(slug)!;
  return PRICING_FALLBACK[slug] ?? { in_per_m: 0, out_per_m: 0 };
}

// Resolve a user-supplied slug request against the live catalog. Returns
// either { resolved, via } or { error, suggestions }.
//   - "exact"           — the request matches a catalog id verbatim
//   - "case-insensitive"— case-only difference (rare)
//   - "stripped-date"   — request had a "-YYYYMMDD" suffix the catalog dropped
//   - "prefix-shortest" — request is a prefix of one or more catalog ids;
//                         pick the shortest (which is typically the base
//                         family slug, not a "-fast" / "-thinking" variant)
function resolveModelSlug(
  requested: string,
  catalog: string[],
): { resolved: string; via: string } | { error: string; suggestions: string[] } {
  if (catalog.length === 0) {
    // No catalog loaded — accept the requested slug verbatim and hope for the best.
    return { resolved: requested, via: "no-catalog" };
  }
  // Exact match
  if (catalog.includes(requested)) return { resolved: requested, via: "exact" };
  // Case-insensitive
  const lower = requested.toLowerCase();
  for (const id of catalog) {
    if (id.toLowerCase() === lower) return { resolved: id, via: "case-insensitive" };
  }
  // Strip a trailing -YYYYMMDD that the catalog might no longer carry
  const stripped = requested.replace(/-\d{8}$/, "");
  if (stripped !== requested && catalog.includes(stripped)) {
    return { resolved: stripped, via: "stripped-date" };
  }
  // Prefix match — pick the shortest (base family without -fast / -thinking / etc.)
  const prefix = stripped !== requested ? stripped : requested;
  const prefixMatches = catalog.filter((id) => id.startsWith(prefix));
  if (prefixMatches.length >= 1) {
    prefixMatches.sort((a, b) => a.length - b.length);
    return { resolved: prefixMatches[0], via: prefixMatches.length === 1 ? "prefix" : "prefix-shortest" };
  }
  // Fall back to token-overlap suggestions
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
    const r = resolveModelSlug(requested, _orCatalog || []);
    if ("resolved" in r) {
      if (r.resolved !== requested) {
        console.error(`  slug resolved: "${requested}" → "${r.resolved}" (${r.via})`);
      } else {
        console.error(`  slug verified: "${requested}" (exact match in catalog)`);
      }
      MODELS.push(r.resolved);
    } else {
      const sugg = r.suggestions.length > 0 ? `\n      closest: ${r.suggestions.join(", ")}` : " (no close matches found)";
      console.error(`  slug NOT in catalog, skipping: "${requested}"${sugg}`);
      SKIPPED_MODELS.push(`${requested} — not in OpenRouter catalog. Closest: ${r.suggestions.join(", ") || "(none)"}`);
    }
  }
}

// ─── Model invocation — direct OpenAI for gpt-4o; OpenRouter for everything else ───

interface CallResult {
  cv: any;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  cost_usd: number;
  ok: boolean;
  error?: string;
}

// Headers must be Latin-1 (ByteString) per the Fetch spec — Node's fetch
// throws "Cannot convert argument to a ByteString" if any header value
// contains code points > 0xFF. UTF-8 punctuation (em dash U+2014, en dash
// U+2013, smart quotes, ellipsis) commonly sneaks in via app-attribution
// strings (X-Title, etc). The request BODY can still be UTF-8 — only
// header values need this treatment.
function latin1SafeHeader(s: string): string {
  return s
    .replace(/[\u2013\u2014\u2015]/g, "-")  // en/em dash, horizontal bar
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")  // smart single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')  // smart double quotes
    .replace(/[\u2026]/g, "...")            // horizontal ellipsis
    .replace(/[^\x00-\xff]/g, "");          // strip any remaining non-Latin-1
}
function assertLatin1Headers(h: Record<string, string>): Record<string, string> {
  for (const [k, v] of Object.entries(h)) {
    for (let i = 0; i < v.length; i++) {
      if (v.charCodeAt(i) > 0xff) {
        throw new Error(`header "${k}" contains non-Latin-1 char U+${v.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0")} at index ${i}: "${v.slice(Math.max(0, i - 8), i + 8)}"`);
      }
    }
  }
  return h;
}

async function callModel(modelSlug: string, systemPrompt: string, userContent: string): Promise<CallResult> {
  const t0 = Date.now();
  const isDirectOpenAI = modelSlug === GPT4O_CONTROL;
  const url = isDirectOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const key = isDirectOpenAI ? OPENAI_API_KEY : OPENROUTER_API_KEY;

  // Some Anthropic and Google models on OpenRouter don't honour
  // response_format=json_object strictly; we ask for it anyway and parse
  // defensively (strip ```json fences, extract first {...} block).
  //
  // Completion budget:
  //   - gpt-4o controls: 2200 is fine (production CV gen uses similar)
  //   - OpenRouter non-reasoning models: 8000 (defends against Gemini-style
  //     mid-stream truncation we saw in the first bake-off run)
  //   - OpenRouter reasoning models (gpt-5.x, o-series, *-thinking):
  //     16000 + reasoning.effort=low. Hidden reasoning tokens count against
  //     max_completion_tokens, and gpt-5.5 ate the entire 2200 budget on
  //     thought before emitting a single visible token in the first run.
  const reasoning = isReasoningModel(modelSlug);
  const completionCap = isDirectOpenAI ? 2200 : reasoning ? 16000 : 8000;
  const body: any = {
    model: modelSlug,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.3,
    // Send BOTH parameter names: max_tokens (legacy, what gpt-4o expects)
    // and max_completion_tokens (current, what gpt-5.x reasoning models
    // expect). OpenRouter normalises whichever the upstream model uses.
    max_tokens: completionCap,
    max_completion_tokens: completionCap,
    response_format: { type: "json_object" },
  };
  if (reasoning && !isDirectOpenAI) {
    // OpenRouter-supported knob to cap hidden thinking on reasoning models.
    // "low" keeps a usable share of completionCap for visible output.
    // Also send the flat OpenAI name for redundancy — if either side accepts
    // it, the hidden thinking gets bounded.
    body.reasoning = { effort: "low" };
    body.reasoning_effort = "low";
  }

  try {
    const headers = assertLatin1Headers({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(isDirectOpenAI ? {} : {
        // OpenRouter optional headers for traffic attribution.
        // All values run through latin1SafeHeader so future edits can't
        // re-introduce U+2014 / smart quotes / etc. The previous run
        // hit U+2014 in X-Title and failed at fetch() construction
        // before reaching the network.
        "HTTP-Referer": latin1SafeHeader("https://getajob.careers"),
        "X-Title": latin1SafeHeader("Get A Job - CV bake-off eval"),
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
        cv: {},
        tokens_in: 0,
        tokens_out: 0,
        latency_ms,
        cost_usd: 0,
        ok: false,
        error: `HTTP ${res.status}: ${t.slice(0, 200)}`,
      };
    }
    const j = await res.json();
    const raw: string = j.choices?.[0]?.message?.content || "";
    const finish_reason: string = j.choices?.[0]?.finish_reason || "";
    const tokens_in = j.usage?.prompt_tokens ?? 0;
    const tokens_out = j.usage?.completion_tokens ?? 0;
    // For reasoning models OpenRouter surfaces a separate "reasoning_tokens"
    // count nested under usage.completion_tokens_details. Track it so a
    // gpt-5.5 cell that emits zero visible tokens can be diagnosed.
    const reasoning_tokens = j.usage?.completion_tokens_details?.reasoning_tokens
      ?? j.usage?.reasoning_tokens
      ?? 0;
    const p = priceFor(modelSlug);
    const cost_usd = (tokens_in / 1e6) * p.in_per_m + (tokens_out / 1e6) * p.out_per_m;

    // Defensive JSON parse: strip markdown fences, then extract the first
    // balanced {...} block. If the response was TRUNCATED (finish_reason
    // == "length"), label it distinctly so the bake-off table shows
    // "truncated" not "bad_json" — the fix is to raise completionCap,
    // not to chase model formatting bugs.
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
      // Distinguish "ran out of completion budget" from "model emitted
      // un-parseable JSON". When finish_reason==length we know the JSON
      // was cut, even if balanced-brace extraction succeeded earlier we
      // still want to flag it because content beyond the truncation point
      // is lost (e.g., later experiences missing).
      const truncated = finish_reason === "length" || tokens_out >= completionCap - 50;
      const empty = raw.trim().length === 0;
      const label = empty
        ? `empty_output finish_reason=${finish_reason} reasoning_tokens=${reasoning_tokens} visible_tokens=${tokens_out}`
        : truncated
          ? `truncated finish_reason=${finish_reason} reasoning_tokens=${reasoning_tokens} visible_tokens=${tokens_out}`
          : `bad_json finish_reason=${finish_reason}: ${raw.slice(0, 150)}`;
      return { cv: {}, tokens_in, tokens_out, latency_ms, cost_usd, ok: false, error: label };
    }

    // Even when parse succeeded, surface a soft warning if truncation
    // happened — the parsed object may be missing trailing fields.
    if (finish_reason === "length") {
      return {
        cv: parsed,
        tokens_in,
        tokens_out,
        latency_ms,
        cost_usd,
        ok: false,
        error: `truncated_but_parsed finish_reason=length visible_tokens=${tokens_out} cap=${completionCap}`,
      };
    }

    return { cv: parsed, tokens_in, tokens_out, latency_ms, cost_usd, ok: true };
  } catch (e) {
    return {
      cv: {},
      tokens_in: 0,
      tokens_out: 0,
      latency_ms: Date.now() - t0,
      cost_usd: 0,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function formatUserPayload(u: UserContext): string {
  return JSON.stringify({
    target_role: TARGET_ROLE,
    candidate: { full_name: u.full_name, summary: u.profile_summary, skills: u.skills },
    professional_experiences: u.professional_experiences,
    education: u.education,
    projects: u.projects,
    proof_signals: u.proof_signals,
    stories: [],
  }, null, 2);
}

function countNumbersInText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(
    /\b\d+(?:[\.,]\d+)?\s*%|\$\s*\d+(?:[\.,]\d+)?\s*[MmKkBb]?|\b\d+\s*(?:k|K|M|B|m)\b|\b\d+(?:[\.,]\d+)?\s*(?:years?|months?|weeks?|days?|hours?|quarters?|Q[1-4]|FY|people|employees|team\s*members?|customers?|users?|students?|accounts?|projects?|deals?|leads?|interviews?|hires?|countries|cities|stores|stakeholders?)\b/gi
  ) || [];
  return Array.from(new Set(matches.map((m) => m.trim())));
}

function bulletsContainNumber(bullets: string[], num: string): boolean {
  const blob = bullets.join(" \n ").toLowerCase();
  return blob.includes(num.toLowerCase());
}

// ─── Per-user × per-cell summary ───

interface CellSummary {
  total_bullets: number;
  numbers_found: number;
  numbers_total: number;
  latency_ms: number;
  cost_usd: number;
  cv: any;
  ok: boolean;
  error?: string;
}

interface UserReport {
  email: string;
  full_name: string;
  source: {
    exp_count: number;
    project_count: number;
    proof_signal_count: number;
    education_count: number;
    source_numbers: Record<string, string[]>;
  };
  cells: Record<string, CellSummary>; // key = label e.g. "gpt-4o (OLD)", "openai/gpt-5.5-… (NEW)"
}

function summariseCell(cv: any, sourceNumbers: Record<string, string[]>): { total_bullets: number; numbers_found: number; numbers_total: number } {
  let total_bullets = 0;
  let numbers_found = 0;
  let numbers_total = 0;
  for (const exp of (cv?.professional_experiences ?? [])) {
    const key = `${exp.title} @ ${exp.company}`;
    total_bullets += Array.isArray(exp.bullets) ? exp.bullets.length : 0;
    const need = sourceNumbers[key] || [];
    for (const n of need) {
      numbers_total++;
      if (bulletsContainNumber(exp.bullets || [], n)) numbers_found++;
    }
  }
  return { total_bullets, numbers_found, numbers_total };
}

async function reportOneUser(email: string): Promise<UserReport | null> {
  console.error(`\n=== ${email} ===`);
  const u = await loadUser(email);
  if (!u) return null;
  console.error(`  ${u.full_name}: ${u.professional_experiences.length} exp / ${u.projects.length} projects / ${u.proof_signals.length} proof_signals / ${u.education.length} edu`);

  const userPayload = formatUserPayload(u);
  const sourceNumbers: Record<string, string[]> = {};
  for (const exp of u.professional_experiences) {
    const key = `${exp.title} @ ${exp.company}`;
    const nums = countNumbersInText(exp.responsibilities);
    if (nums.length > 0) sourceNumbers[key] = nums;
  }

  const cells: Record<string, CellSummary> = {};

  // Two gpt-4o controls (direct OpenAI).
  for (const [label, policy] of [
    [`${GPT4O_CONTROL} (OLD ctrl)`, OLD_BULLET_POLICY],
    [`${GPT4O_CONTROL} (NEW ctrl)`, NEW_BULLET_POLICY],
  ] as const) {
    console.error(`  → ${label}…`);
    const r = await callModel(GPT4O_CONTROL, buildSystemPrompt(policy), userPayload);
    const s = summariseCell(r.cv, sourceNumbers);
    cells[label] = { ...s, latency_ms: r.latency_ms, cost_usd: r.cost_usd, cv: r.cv, ok: r.ok, error: r.error };
  }

  // Bake-off models on NEW prompt only.
  for (const slug of MODELS) {
    const label = `${slug} (NEW)`;
    console.error(`  → ${label}…`);
    const r = await callModel(slug, buildSystemPrompt(NEW_BULLET_POLICY), userPayload);
    const s = summariseCell(r.cv, sourceNumbers);
    cells[label] = { ...s, latency_ms: r.latency_ms, cost_usd: r.cost_usd, cv: r.cv, ok: r.ok, error: r.error };
  }

  return {
    email,
    full_name: u.full_name,
    source: {
      exp_count: u.professional_experiences.length,
      project_count: u.projects.length,
      proof_signal_count: u.proof_signals.length,
      education_count: u.education.length,
      source_numbers: sourceNumbers,
    },
    cells,
  };
}

function renderMarkdown(reports: UserReport[]): string {
  const lines: string[] = [];
  lines.push("# CV authoring — multi-model bake-off");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Target role: "${TARGET_ROLE}"`);
  lines.push("");
  lines.push("**Controls (direct OpenAI):** gpt-4o on OLD prompt + gpt-4o on NEW prompt.");
  lines.push(`**Bake-off (via OpenRouter, NEW prompt only — slugs verified live against catalog):**`);
  for (const slug of MODELS) lines.push(`- \`${slug}\``);
  if (SKIPPED_MODELS.length > 0) {
    lines.push("");
    lines.push("**Skipped (slug not in OpenRouter catalog at run time):**");
    for (const s of SKIPPED_MODELS) lines.push(`- ${s}`);
  }
  lines.push("");

  // Per-model summary across ALL users.
  lines.push("## Per-model summary (totals across all users)");
  lines.push("");
  const labels = Array.from(new Set(reports.flatMap((r) => Object.keys(r.cells))));
  lines.push("| Model / prompt | Total bullets | Numbers carried | Latency p50 (ms) | Cost ($) | Failures |");
  lines.push("|---|---:|---|---:|---:|---:|");
  for (const label of labels) {
    let totalBullets = 0;
    let nFound = 0;
    let nTotal = 0;
    let totalCost = 0;
    const latencies: number[] = [];
    let failures = 0;
    for (const r of reports) {
      const c = r.cells[label];
      if (!c) continue;
      if (!c.ok) {
        failures++;
        continue;
      }
      totalBullets += c.total_bullets;
      nFound += c.numbers_found;
      nTotal += c.numbers_total;
      totalCost += c.cost_usd;
      latencies.push(c.latency_ms);
    }
    latencies.sort((a, b) => a - b);
    const p50 = latencies.length === 0 ? "—" : String(latencies[Math.floor(latencies.length / 2)]);
    lines.push(`| \`${label}\` | ${totalBullets} | ${nFound}/${nTotal} | ${p50} | $${totalCost.toFixed(4)} | ${failures} |`);
  }
  lines.push("");

  // Per-user table.
  for (const r of reports) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${r.full_name} — ${r.email}`);
    lines.push(`Source: ${r.source.exp_count} experiences, ${r.source.project_count} projects, ${r.source.proof_signal_count} proof_signals, ${r.source.education_count} education entries.`);
    lines.push("");
    if (Object.keys(r.source.source_numbers).length > 0) {
      lines.push("**Numbers present in source responsibilities (the carry-through target):**");
      lines.push("");
      for (const [key, nums] of Object.entries(r.source.source_numbers)) {
        lines.push(`- ${key}: ${nums.join(" · ")}`);
      }
      lines.push("");
    } else {
      lines.push("_No numeric values detected in source responsibilities (or no professional experiences)._");
      lines.push("");
    }

    lines.push("| Model / prompt | Bullets | Numbers carried | Latency (ms) | Cost ($) | Status |");
    lines.push("|---|---:|---|---:|---:|---|");
    for (const label of labels) {
      const c = r.cells[label];
      if (!c) { lines.push(`| \`${label}\` | — | — | — | — | not run |`); continue; }
      const status = c.ok ? "ok" : `**FAIL**: ${(c.error || "").slice(0, 60)}`;
      const numStr = c.numbers_total > 0 ? `${c.numbers_found}/${c.numbers_total}` : "—";
      lines.push(`| \`${label}\` | ${c.total_bullets} | ${numStr} | ${c.latency_ms} | $${c.cost_usd.toFixed(4)} | ${status} |`);
    }
    lines.push("");
  }

  // Full bullets dump for the detail user across every model.
  const detail = reports.find((r) => r.email === DETAIL_USER);
  if (detail) {
    lines.push("---");
    lines.push("");
    lines.push(`## Full authored bullets — ${detail.full_name} (${detail.email})`);
    lines.push("");
    lines.push("Side-by-side writing quality across every model. Same input, same NEW prompt (except the two gpt-4o controls which use OLD and NEW).");
    lines.push("");
    for (const label of labels) {
      const c = detail.cells[label];
      lines.push(`### ${label}`);
      lines.push("");
      if (!c) { lines.push("_(not run)_"); lines.push(""); continue; }
      if (!c.ok) { lines.push(`_(failed: ${c.error})_`); lines.push(""); continue; }
      const about = String(c.cv?.about_me || "").trim();
      if (about) {
        lines.push(`**About Me:** ${about}`);
        lines.push("");
      }
      const exps = c.cv?.professional_experiences || [];
      for (const exp of exps) {
        lines.push(`**${exp.title} @ ${exp.company}** _(${exp.dates || ""})_`);
        lines.push("");
        for (const b of (exp.bullets || [])) lines.push(`- ${b}`);
        lines.push("");
      }
      const aps = c.cv?.academic_projects || [];
      if (aps.length > 0) {
        lines.push(`**Academic projects:**`);
        for (const ap of aps) lines.push(`- ${ap.name || ""} — ${ap.description || ""}`);
        lines.push("");
      }
      const prjs = c.cv?.projects || [];
      if (prjs.length > 0) {
        lines.push(`**Projects:**`);
        for (const prj of prjs) {
          lines.push(`- ${prj.name || ""}`);
          for (const b of (prj.bullets || [])) lines.push(`  - ${b}`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

async function main() {
  console.error("Loading OpenRouter catalog…");
  await loadOpenRouterCatalog();
  console.error("Resolving requested model slugs against catalog…");
  resolveRequestedModels();
  if (MODELS.length === 0) {
    console.error("  no models resolved — running gpt-4o controls only.");
  }
  const reports: UserReport[] = [];
  for (const email of EMAILS) {
    try {
      const r = await reportOneUser(email);
      if (r) reports.push(r);
    } catch (e) {
      console.error(`  FATAL for ${email}:`, e instanceof Error ? e.message : e);
    }
  }
  const md = renderMarkdown(reports);
  writeFileSync(OUT, md);
  console.error(`\nWrote ${OUT} (${reports.length} users × ${MODELS.length + 2} cells each).`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

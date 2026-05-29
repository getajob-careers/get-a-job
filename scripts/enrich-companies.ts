// scripts/enrich-companies.ts
//
// Internship redesign PR3 — web-research enrichment pass.
//
// Fills the 6 rich fields (description, founded_year, stage,
// employee_count_range, hq_city, hq_country) for companies whose
// enriched_at IS NULL — currently the 428 source='registry' imports.
// Each filled fact comes with a source URL stored in
// companies.enrichment_sources (added by 20260529_companies_enrichment_provenance.sql).
//
// Anti-fabrication rules (non-negotiable):
//   1. Every fact MUST come from a web_search-cited source URL.
//   2. Snippet must mention the company name OR its stored domain (same-
//      name-confusion guard; see snippetMatchesCompany).
//   3. Stage values must be in ALLOWED_STAGES, size values in ALLOWED_SIZES,
//      else NULL. founded_year must be 1850-currentYear.
//   4. NULL-only fill — never overwrite existing curated values.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... \
//     npx tsx scripts/enrich-companies.ts --dry-run --limit=20
//   npx tsx scripts/enrich-companies.ts --only=<uuid1>,<uuid2>
//   npx tsx scripts/enrich-companies.ts                              # live full run
//
// Flags:
//   --dry-run         Do NOT write to DB; still hits OpenAI; writes review file.
//   --limit=N         Deterministic-random spread of N rows (fnv1a(id) order).
//                     Stable across reruns — same rows surface every time.
//   --include=id1,id2 Force-include these UUIDs alongside the random spread.
//                     Useful for forcing obscure spot-checks into the sample.
//   --only=id1,id2    Process ONLY these company UUIDs (overrides --limit
//                     and --include). For single-row repair runs.
//   --filter=registry|all  Target set. Default 'registry'. 'all' = every
//                          row missing enriched_at.
//   --model=NAME      Override default model (gpt-4o-mini).
//   --concurrency=N   Worker pool size. Default 5.
//
// Cost-cap: hard exit if running cost > $50 (rough estimate). Belt-and-
// braces against runaway loops.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";

import {
  snippetMatchesCompany,
  validateFoundedYear,
  validateStage,
  validateString,
  validateUrl,
  isCredibleFor,
  extractJsonObject,
  sizeBucketForCount,
  hasTicker,
} from "./lib/enrichmentValidation.js";

// ─── config ──────────────────────────────────────────────────────────

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_CONCURRENCY = 5;
const COST_CAP_USD = 50;
const REVIEW_SAMPLE_SIZE = 20;
// Per-call cost estimates (USD, approximate; used only for the cost-cap
// safety, not for billing accuracy):
const PER_CALL_COST: Record<string, number> = {
  "gpt-4o-mini": 0.02,
  "gpt-4o":      0.06,
};

const FIELDS = ["description", "founded_year", "stage", "employee_count_range", "hq_city", "hq_country"] as const;
type FieldName = (typeof FIELDS)[number];
const SNIPPET_FIELDS = new Set<FieldName>(["description", "stage"]);

function scriptDir() { return fileURLToPath(new URL(".", import.meta.url)); }
function reviewPath() {
  return join(scriptDir(), "..", "tasks", "companies-enrichment-review.md");
}

// ─── prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a research assistant filling a company-info database. ANTI-FABRICATION IS THE LOAD-BEARING RULE.

For each company, use the web_search tool to find specific facts. Output VALID JSON with exactly this shape:

{
  "description": { "value": "<≤350-char one-paragraph description OR null>", "source_url": "<url OR null>", "source_snippet": "<≤200-char excerpt from the source that supports this OR null>" },
  "founded_year": { "value": <integer year OR null>, "source_url": "<url OR null>", "source_snippet": null },
  "stage": { "value": "<one of: Seed | Series A | Series B | Series C | Growth | Public OR null>", "source_url": "<url OR null>", "source_snippet": "<≤200-char excerpt OR null>" },
  "employee_count_range": { "value": <integer headcount stated by the source, OR null>, "source_url": "<url OR null>", "source_snippet": "<≤200-char excerpt containing the headcount number OR null>" },
  "hq_city": { "value": "<single city name OR null>", "source_url": "<url OR null>", "source_snippet": null },
  "hq_country": { "value": "<country name in English OR null>", "source_url": "<url OR null>", "source_snippet": null }
}

CRITICAL RULES:
- If a fact is not stated by a credible source, set value=null AND source_url=null. Do NOT guess.
- Every source_url MUST be a real URL returned by your web search. Never invent URLs.
- source_snippet must contain text that mentions the company name OR its domain — this is verified post-hoc; if it doesn't, the fact will be dropped.
- For 'stage': "Public" REQUIRES an explicit exchange:ticker string in one of your snippets (e.g. "NASDAQ: AFRM", "NYSE: NET", "TASE: BEZQ"). If you can't surface a ticker, the company is not Public — use "Growth" for late-stage private with $50M+ raised, or the appropriate Series letter for earlier rounds. Subsidiaries of public parents are NOT themselves public — judge the entity at the stored domain.
- For 'employee_count_range': return the raw integer headcount stated by the source (e.g. 78000 for "around 78,000 people"). The bucket is computed in post-processing — do NOT return a bucket string. If no source states a specific headcount number (only "200+" or "Mid-size"), leave value=null.
- For 'hq_city' / 'hq_country': use the company's PRIMARY HQ. If listed dual ("Tel Aviv / New York"), pick the one most often cited as HQ; if genuinely 50/50, prefer the one matching the company's origin.
- Prefer credible sources: Crunchbase, Pitchbook, Wikipedia, the company's own about/careers page, established business press (TechCrunch, Reuters, Bloomberg, CTech, Globes, Times of Israel). Avoid SEO aggregators and unverified directories.
- Output ONLY the JSON object. No markdown, no commentary.`;

function userPrompt(company: { name: string; domain: string | null; industry: string | null; origin: string | null }): string {
  return `Research this company and return the JSON object per the system prompt.

Company name: ${company.name}
Stored domain: ${company.domain ?? "(unknown)"}
Industry hint: ${company.industry ?? "(unknown)"}
Origin classification: ${company.origin ?? "(unknown)"}

The stored domain is the SOURCE OF TRUTH for which company this is. If your web search surfaces a same-named but different company (different domain, different country, different industry), do NOT use those sources — set value=null for the affected fields.`;
}

// ─── concurrency ─────────────────────────────────────────────────────

async function runWithConcurrency<T, R>(
  limit: number, items: T[], fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      try { results[idx] = { status: "fulfilled", value: await fn(items[idx]) }; }
      catch (err) { results[idx] = { status: "rejected", reason: err }; }
    }
  });
  await Promise.all(workers);
  return results;
}

// ─── types ───────────────────────────────────────────────────────────

interface CompanyRow {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  origin: string | null;
  description: string | null;
  founded_year: number | null;
  stage: string | null;
  employee_count_range: string | null;
  hq_city: string | null;
  hq_country: string | null;
  enriched_at: string | null;
}

interface FactRaw {
  value: unknown;
  source_url: unknown;
  source_snippet: unknown;
}

interface FactClean {
  value: string | number;
  source_url: string;
  source_snippet: string | null;
  credible: boolean;
}

interface EnrichResult {
  company_id: string;
  company_name: string;
  company_domain: string | null;
  status: "ok" | "no_facts" | "openai_error" | "parse_error";
  filled: FieldName[];
  rejected: { field: FieldName; reason: string }[];
  not_credible_fields: FieldName[];
  patch: Partial<Record<FieldName, string | number>>;
  sources: Record<string, { url: string; snippet?: string }>;
  error?: string;
  elapsed_ms: number;
  raw_json?: string;
}

// ─── validators ──────────────────────────────────────────────────────

function validateFact(
  field: FieldName, raw: FactRaw, company: CompanyRow,
  ctx: { tickerInResponse: boolean },
): { ok: true; clean: FactClean } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "fact_missing" };
  const url = validateUrl(raw.source_url);
  if (!url) return { ok: false, reason: "no_url" };

  let value: string | number | null;
  switch (field) {
    case "description":          value = validateString(raw.value, 350); break;
    case "founded_year":         value = validateFoundedYear(raw.value); break;
    case "stage":
      value = validateStage(raw.value);
      // Round-3 fix 2: stage='Public' requires an explicit exchange:ticker
      // somewhere in the response. Kills xAI/BDO/Pelephone/Tara/DeepMind
      // hallucinated-Public errors without affecting genuinely-traded
      // companies (Affirm/Pinterest/Okta have NASDAQ:* in their snippets).
      if (value === "Public" && !ctx.tickerInResponse) {
        return { ok: false, reason: "public_without_ticker" };
      }
      break;
    case "employee_count_range":
      // Round-3 fix 1: prompt now asks for the raw integer headcount.
      // We map deterministically to bucket — mini's bucket-judgment
      // step is what got Continental wrong by 3 orders of magnitude.
      value = sizeBucketForCount(raw.value);
      break;
    case "hq_city":              value = validateString(raw.value, 80); break;
    case "hq_country":           value = validateString(raw.value, 60); break;
  }
  if (value == null) return { ok: false, reason: "value_invalid" };

  const snippet = typeof raw.source_snippet === "string" ? raw.source_snippet.trim() : "";

  // Fix A (PR3 dry-run round 2): the snippet-must-mention-company guard
  // only runs for `description` (our entity anchor — 200+ chars of context
  // should always restate the company name) and `stage` (event-style
  // snippets like "raised Series C" benefit from grounding). For the 4
  // atomic fields the snippet is usually too short to also restate the
  // company name (mini honestly cites "Founded in 2018" excerpts), and
  // the same-name-confusion protection is left to the prompt-level rule
  // + the host-equals-stored-domain credibility signal.
  if (SNIPPET_FIELDS.has(field)) {
    if (!snippet) return { ok: false, reason: "snippet_required_missing" };
    if (!snippetMatchesCompany(snippet, company.name, company.domain)) {
      return { ok: false, reason: "snippet_does_not_mention_company" };
    }
  }
  // No snippet check for founded_year/employee_count_range/hq_city/hq_country.
  // Save whatever snippet mini returned for the audit display, but don't
  // gate on it.
  return {
    ok: true,
    clean: {
      value, source_url: url,
      source_snippet: snippet ? snippet.slice(0, 200) : null,
      credible: isCredibleFor(url, company.domain),
    },
  };
}

// ─── per-company processing ──────────────────────────────────────────

async function enrichOne(
  openai: OpenAI, model: string, company: CompanyRow,
): Promise<EnrichResult> {
  const t0 = Date.now();
  const base: EnrichResult = {
    company_id: company.id, company_name: company.name, company_domain: company.domain,
    status: "ok", filled: [], rejected: [], not_credible_fields: [],
    patch: {}, sources: {}, elapsed_ms: 0,
  };

  let response;
  try {
    response = await openai.responses.create({
      model,
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(company) },
      ],
    });
  } catch (err) {
    // Round-2 diagnostic: when the SDK throws (APIConnectionError, 401,
    // 429, 5xx, etc.) its default .message is just "Connection error."
    // which doesn't tell us whether it's network, auth, rate limit, or
    // a malformed-request rejection. Pull every available field off the
    // SDK error object so the next dry-run actually tells us what's
    // wrong without needing a third re-run.
    const e = err as Error & {
      status?: number; code?: string; type?: string; param?: string;
      request_id?: string; headers?: Record<string, string>;
      cause?: unknown;
    };
    const cause = e.cause;
    const causeStr = cause instanceof Error
      ? `${cause.name}: ${cause.message}${(cause as Error & { code?: string }).code ? ` [${(cause as Error & { code?: string }).code}]` : ""}`
      : cause != null ? String(cause) : null;
    const detail = [
      e.constructor?.name ?? "Error",
      e.message || "(no message)",
      e.status ? `status=${e.status}` : null,
      e.code ? `code=${e.code}` : null,
      e.type ? `type=${e.type}` : null,
      e.request_id ? `req=${e.request_id}` : null,
      causeStr ? `cause={${causeStr}}` : null,
    ].filter(Boolean).join(" · ");
    return { ...base, status: "openai_error", error: detail, elapsed_ms: Date.now() - t0 };
  }

  // The Responses API returns response.output_text (string) for plain
  // text + response.output (structured array). For our purpose the
  // assistant message text is the JSON we want.
  let raw_json = "";
  try {
    raw_json = (response as { output_text?: string }).output_text ?? "";
    if (!raw_json) {
      const output = (response as { output?: Array<{ content?: Array<{ text?: string }> }> }).output;
      const textBits = output?.flatMap((o) => (o.content ?? []).map((c) => c.text ?? ""));
      raw_json = (textBits ?? []).join("");
    }
  } catch {
    raw_json = "";
  }

  // Fix B (PR3 dry-run round 2): web_search auto-prepends a stock-quote
  // widget for any company with a ticker (Accenture, Adobe, Affirm,
  // Akamai all hit this). Strip everything before the first '{' and
  // after the last '}' before JSON.parse. Also handles ``` fences and
  // any other commentary mini may have prepended/appended.
  const candidate = extractJsonObject(raw_json);
  if (!candidate) {
    return { ...base, status: "parse_error", error: "no_json_braces_found", raw_json, elapsed_ms: Date.now() - t0 };
  }

  let parsed: Record<string, FactRaw>;
  try { parsed = JSON.parse(candidate); }
  catch (err) {
    return { ...base, status: "parse_error", error: (err as Error).message, raw_json, elapsed_ms: Date.now() - t0 };
  }

  // Scan every snippet in the response ONCE for an exchange:ticker
  // pattern. The result is reused for each field's validateFact call
  // (the stage check needs it, others ignore it). Detecting in a
  // pre-pass is cheaper + more robust than scanning per-field.
  const allSnippets: string[] = [];
  for (const f of FIELDS) {
    const fact = parsed[f];
    if (fact && typeof (fact as { source_snippet?: unknown }).source_snippet === "string") {
      allSnippets.push((fact as { source_snippet: string }).source_snippet);
    }
  }
  const ctx = { tickerInResponse: hasTicker(allSnippets) };

  for (const field of FIELDS) {
    const fact = parsed[field];
    // Don't overwrite curated values — NULL-only fill rule.
    if ((company as Record<string, unknown>)[field] != null) continue;
    if (!fact || (fact.value == null && fact.source_url == null)) continue; // genuine null

    const res = validateFact(field, fact, company, ctx);
    if (res.ok) {
      base.patch[field] = res.clean.value;
      base.sources[field] = res.clean.source_snippet
        ? { url: res.clean.source_url, snippet: res.clean.source_snippet }
        : { url: res.clean.source_url };
      base.filled.push(field);
      if (!res.clean.credible) base.not_credible_fields.push(field);
    } else {
      base.rejected.push({ field, reason: res.reason });
    }
  }

  if (base.filled.length === 0) base.status = "no_facts";
  base.elapsed_ms = Date.now() - t0;
  base.raw_json = raw_json;
  return base;
}

// ─── DB helpers ──────────────────────────────────────────────────────

/**
 * Deterministic 32-bit hash of a string. Used so re-runs sample the
 * same rows + ordering — reviewable spot-checks shouldn't change
 * between runs unless the underlying set does.
 */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

async function loadTargets(
  supabase: SupabaseClient,
  opts: { filter: string; limit: number | null; only: string[] | null; include: string[] | null },
): Promise<CompanyRow[]> {
  // --only short-circuit: exact set, no random spread.
  if (opts.only && opts.only.length > 0) {
    const { data, error } = await supabase.from("companies")
      .select("id,name,domain,industry,origin,description,founded_year,stage,employee_count_range,hq_city,hq_country,enriched_at")
      .in("id", opts.only);
    if (error) throw new Error(`failed to load targets: ${error.message}`);
    return (data ?? []) as CompanyRow[];
  }

  // Default: pull every candidate (enriched_at IS NULL, source-filtered),
  // then take a deterministic-random spread client-side if --limit is set.
  // No SQL ORDER BY random() — random per-call would defeat the
  // sample-stability goal.
  let q = supabase.from("companies")
    .select("id,name,domain,industry,origin,description,founded_year,stage,employee_count_range,hq_city,hq_country,enriched_at")
    .is("enriched_at", null);
  if (opts.filter === "registry") q = q.eq("source", "registry");
  const { data, error } = await q;
  if (error) throw new Error(`failed to load targets: ${error.message}`);
  let rows = (data ?? []) as CompanyRow[];

  if (opts.limit && rows.length > opts.limit) {
    // Sort by fnv1a(id) so the same rows surface every run, but with a
    // uniform spread across the alphabet (Fix D — round 1's
    // alphabetical-first slice meant Magenta + Y.H. Dimri never appeared).
    rows = [...rows]
      .sort((a, b) => fnv1a(a.id) - fnv1a(b.id))
      .slice(0, opts.limit);
  }

  // --include: append force-included rows (e.g. obscure spot-checks)
  // regardless of the random slice. De-dupe by id.
  if (opts.include && opts.include.length > 0) {
    const haveIds = new Set(rows.map((r) => r.id));
    const missing = opts.include.filter((id) => !haveIds.has(id));
    if (missing.length > 0) {
      const { data: extra } = await supabase.from("companies")
        .select("id,name,domain,industry,origin,description,founded_year,stage,employee_count_range,hq_city,hq_country,enriched_at")
        .in("id", missing);
      rows = [...rows, ...((extra ?? []) as CompanyRow[])];
    }
  }
  return rows;
}

async function persistResult(supabase: SupabaseClient, model: string, result: EnrichResult): Promise<string | null> {
  const update: Record<string, unknown> = {
    ...result.patch,
    enriched_at: new Date().toISOString(),
    enrichment_sources: Object.keys(result.sources).length > 0 ? result.sources : null,
    enrichment_model: model,
  };
  const { error } = await supabase.from("companies").update(update).eq("id", result.company_id);
  return error ? error.message : null;
}

// ─── review file ─────────────────────────────────────────────────────

function pickReviewSample(results: EnrichResult[], n: number, mustInclude: Set<string>): EnrichResult[] {
  // If the whole run fits in the sample (e.g. dry-runs with --limit=20),
  // show everything — round-2 hid Y.H. Dimri because 21 > 20.
  if (results.length <= n) {
    return [...results].sort((a, b) => a.company_name.localeCompare(b.company_name));
  }

  // Force-included UUIDs (e.g. --include obscure spot-checks) always
  // appear regardless of the random stride.
  const forced = results.filter((r) => mustInclude.has(r.company_id));
  // Flagged rows next — non-credible sources or rejected facts get
  // audit priority (per E7).
  const flagged = results.filter(
    (r) => !forced.includes(r) && (r.not_credible_fields.length > 0 || r.rejected.length > 0),
  );
  const others = results.filter((r) => !forced.includes(r) && !flagged.includes(r));
  const sortedOthers = [...others].sort((a, b) => a.company_name.localeCompare(b.company_name));

  const remaining = Math.max(0, n - forced.length - flagged.length);
  const stride = Math.max(1, Math.floor(sortedOthers.length / Math.max(1, remaining)));
  const sampled: EnrichResult[] = [];
  for (let i = 0; i < sortedOthers.length && sampled.length < remaining; i += stride) {
    sampled.push(sortedOthers[i]);
  }
  return [...forced, ...flagged, ...sampled];
}

function renderReview(results: EnrichResult[], sample: EnrichResult[], summary: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push("# Company enrichment review");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total rows processed: ${summary.total}`);
  lines.push("");
  lines.push("## Run summary");
  lines.push("");
  lines.push("```");
  for (const [k, v] of Object.entries(summary)) lines.push(`${k.padEnd(28)}: ${v}`);
  lines.push("```");
  lines.push("");
  lines.push("## Spot-check sample");
  lines.push("");
  lines.push(`This file is for human spot-checking BEFORE authorizing a live run on the full target set. Every fact below was filled by the enrichment pass; review each source URL. **Rows with non-credible sources or rejected facts are listed first** (per the audit rule for low-credibility sources).`);
  lines.push("");

  for (const r of sample) {
    const flags: string[] = [];
    if (r.not_credible_fields.length > 0) flags.push(`⚠️ NON-CREDIBLE on: ${r.not_credible_fields.join(", ")}`);
    if (r.rejected.length > 0) flags.push(`⛔ REJECTED: ${r.rejected.map((x) => `${x.field}=${x.reason}`).join(", ")}`);
    if (r.status === "no_facts") flags.push("∅ no facts found");
    lines.push(`### ${r.company_name} (${r.company_domain ?? "no-domain"})`);
    if (flags.length > 0) lines.push("");
    if (flags.length > 0) lines.push(flags.map((f) => `- ${f}`).join("\n"));
    lines.push("");
    lines.push(`status: \`${r.status}\` · filled: ${r.filled.length}/6 · elapsed: ${r.elapsed_ms}ms`);
    lines.push("");
    if (r.filled.length === 0) {
      lines.push(`_(no facts filled)_`);
    } else {
      for (const f of r.filled) {
        const src = r.sources[f];
        const credible = !r.not_credible_fields.includes(f);
        const credIcon = credible ? "✓" : "⚠";
        lines.push(`- **${f}** = \`${JSON.stringify(r.patch[f])}\``);
        lines.push(`  - ${credIcon} ${src.url}`);
        if (src.snippet) lines.push(`  - _"${src.snippet}"_`);
      }
    }
    if (r.rejected.length > 0) {
      lines.push("");
      lines.push(`Rejected fields:`);
      for (const rej of r.rejected) lines.push(`- ${rej.field} → ${rej.reason}`);
    }
    if (r.status === "parse_error" || r.status === "openai_error") {
      lines.push("");
      lines.push(`Error: ${r.error}`);
      if (r.raw_json) lines.push("Raw output (truncated):"), lines.push("```"), lines.push(r.raw_json.slice(0, 500)), lines.push("```");
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

// ─── main ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const has = (f: string) => args.includes(f);
  const opt = (prefix: string) => {
    const a = args.find((x) => x.startsWith(prefix));
    return a ? a.slice(prefix.length) : null;
  };
  return {
    dryRun: has("--dry-run"),
    limit: opt("--limit=") ? parseInt(opt("--limit=") as string, 10) : null,
    only: opt("--only=") ? (opt("--only=") as string).split(",").map((x) => x.trim()).filter(Boolean) : null,
    include: opt("--include=") ? (opt("--include=") as string).split(",").map((x) => x.trim()).filter(Boolean) : null,
    filter: opt("--filter=") ?? "registry",
    model: opt("--model=") ?? DEFAULT_MODEL,
    concurrency: opt("--concurrency=") ? parseInt(opt("--concurrency=") as string, 10) : DEFAULT_CONCURRENCY,
  };
}

async function main() {
  const opts = parseArgs();
  const startedAt = Date.now();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!supabaseUrl || !serviceKey || !openaiKey) {
    console.error("FATAL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY required.");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const openai = new OpenAI({ apiKey: openaiKey });

  const targets = await loadTargets(supabase, opts);
  console.log(`Targets: ${targets.length} (filter=${opts.filter}, limit=${opts.limit ?? "—"}, only=${opts.only?.length ?? 0}, include=${opts.include?.length ?? 0})`);
  console.log(`Model: ${opts.model} · concurrency: ${opts.concurrency} · ${opts.dryRun ? "DRY RUN (no DB writes)" : "LIVE"}`);

  const perCallEst = PER_CALL_COST[opts.model] ?? 0.03;
  const estTotal = (targets.length * perCallEst).toFixed(2);
  console.log(`Estimated cost: ~$${estTotal} (rough)`);
  if (targets.length * perCallEst > COST_CAP_USD) {
    console.error(`FATAL: estimated cost $${estTotal} exceeds cap $${COST_CAP_USD}. Reduce --limit.`);
    process.exit(1);
  }

  if (targets.length === 0) {
    console.log("Nothing to enrich. Exiting.");
    return;
  }

  console.log("\nResearching...");
  const settled = await runWithConcurrency(opts.concurrency, targets, (c) => enrichOne(openai, opts.model, c));
  const results: EnrichResult[] = settled.map((r, i) =>
    r.status === "fulfilled" ? r.value : {
      company_id: targets[i].id, company_name: targets[i].name, company_domain: targets[i].domain,
      status: "openai_error", filled: [], rejected: [], not_credible_fields: [],
      patch: {}, sources: {}, error: String((r as PromiseRejectedResult).reason), elapsed_ms: 0,
    },
  );

  // Per-row writes (skipped in dry-run)
  let writeOk = 0; let writeErr = 0;
  if (!opts.dryRun) {
    for (const r of results) {
      if (r.status !== "ok") continue;
      const err = await persistResult(supabase, opts.model, r);
      if (err) { console.error(`UPDATE failed for ${r.company_name}: ${err}`); writeErr++; }
      else writeOk++;
    }
  }

  // Summary
  const fieldCounts: Record<string, number> = Object.fromEntries(FIELDS.map((f) => [f, 0]));
  let fullyFilled = 0, partial = 0, noFacts = 0, errors = 0;
  let notCredibleRows = 0, rejectedFactsTotal = 0;
  for (const r of results) {
    if (r.status === "openai_error" || r.status === "parse_error") { errors++; continue; }
    if (r.filled.length === 6) fullyFilled++;
    else if (r.filled.length > 0) partial++;
    else noFacts++;
    for (const f of r.filled) fieldCounts[f]++;
    if (r.not_credible_fields.length > 0) notCredibleRows++;
    rejectedFactsTotal += r.rejected.length;
  }
  const summary = {
    total:                 results.length,
    fully_enriched_6_of_6: fullyFilled,
    partially_enriched:    partial,
    no_facts_found:        noFacts,
    errors:                errors,
    rows_w_noncredible_src: notCredibleRows,
    rejected_facts_total:  rejectedFactsTotal,
    desc_filled:           fieldCounts.description,
    year_filled:           fieldCounts.founded_year,
    stage_filled:          fieldCounts.stage,
    size_filled:           fieldCounts.employee_count_range,
    city_filled:           fieldCounts.hq_city,
    country_filled:        fieldCounts.hq_country,
    writes_ok:             opts.dryRun ? "(dry-run)" : writeOk,
    writes_failed:         opts.dryRun ? "(dry-run)" : writeErr,
    wall_seconds:          ((Date.now() - startedAt) / 1000).toFixed(1),
    model:                 opts.model,
  };

  console.log("\n" + "=".repeat(72));
  console.log("ENRICHMENT SUMMARY");
  console.log("=".repeat(72));
  for (const [k, v] of Object.entries(summary)) console.log(`${k.padEnd(28)}: ${v}`);

  // Review file (always written). --include + --only UUIDs are force-
  // displayed so spot-checks can't be squeezed out of the sample.
  const mustInclude = new Set([...(opts.only ?? []), ...(opts.include ?? [])]);
  const sample = pickReviewSample(results, REVIEW_SAMPLE_SIZE, mustInclude);
  const path = reviewPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderReview(results, sample, summary as Record<string, unknown>), "utf8");
  console.log(`\nReview file: ${path} (${sample.length} entries)`);
}

const isMain = process.argv[1] && process.argv[1].endsWith("enrich-companies.ts");
if (isMain) {
  main().catch((err) => { console.error("UNHANDLED:", err); process.exit(1); });
}

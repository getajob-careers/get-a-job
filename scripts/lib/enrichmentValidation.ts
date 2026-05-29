// Pure validators for the enrichment pass. Imported by both
// scripts/enrich-companies.ts and the unit tests. No I/O, no OpenAI.

export const ALLOWED_STAGES = [
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Growth",
  "Public",
] as const;

// Exactly the strings the existing DB uses + the size-bucket overlap
// matcher (src/components/internship/browse/sizeBuckets.js) recognises.
// Anything outside this list → NULL with a logged warning. Don't invent
// new vocabulary.
export const ALLOWED_SIZES = [
  "1-50",
  "50-100",
  "50-200",
  "100-200",
  "200-500",
  "500-1000",
  "1000-5000",
  "5000+",
] as const;

// Domains we treat as "credible" for the steer-toward-credible-sources
// heuristic. Not an allowlist — facts cited only on a non-credible
// source still save, but the row gets flagged in the review file.
//
// PR3 dry-run round 2: expanded generously after the first run flagged
// 13/20 rows because Forbes, CB Insights, growjo, the company's own
// about page etc. were missing. Plus a separate rule in `isCredibleFor`:
// if the source URL host equals the company's stored domain, that's
// the most credible source of all — self-described on their own site.
// The flag should now only fire on the genuine long-tail of sketchy
// aggregators (craft.co, employbl.com, leadiq, etc.).
export const CREDIBLE_HOSTS = new Set([
  // Curated data sources
  "crunchbase.com",
  "pitchbook.com",
  "sec.gov",
  "wikipedia.org",
  "en.wikipedia.org",
  // Major business press
  "forbes.com",
  "fortune.com",
  "bloomberg.com",
  "reuters.com",
  "wsj.com",
  "ft.com",
  "businessinsider.com",
  "cnbc.com",
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "axios.com",
  "fastcompany.com",
  // Specialist business databases (not curated like Crunchbase but acceptable)
  "cbinsights.com",
  "growjo.com",
  "themuse.com",
  "builtin.com",
  "builtinnyc.com",
  "builtinsf.com",
  "owler.com",
  "dnb.com",
  "duns100.co.il",
  "marketscreener.com",
  "stockanalysis.com",
  "stockanalysis.org",
  // Israel-specific business press + startup directories
  "calcalistech.com",
  "calcalist.co.il",
  "ctech.tech",
  "globes.co.il",
  "en.globes.co.il",
  "ynetnews.com",
  "ynet.co.il",
  "jpost.com",
  "timesofisrael.com",
  "nocamels.com",
  "geektime.com",
  "geektime.co.il",
  "finder.startupnationcentral.org",
  "startupnationcentral.org",
  "fiercebiotech.com",
  "fiercehealthcare.com",
  // Verticals: medical / pharma / defense
  "medtechinnovator.com",
  "thedefensepost.com",
  "israeldefense.co.il",
  "biospace.com",
  // Professional profiles (last resort — facts here are user-submitted but
  // still verifiable)
  "linkedin.com",
]);

// ─── normalizers ─────────────────────────────────────────────────────

/** lowercase + strip www. + strip trailing slash */
export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  if (s.startsWith("http://")) s = s.slice(7);
  if (s.startsWith("https://")) s = s.slice(8);
  if (s.startsWith("www.")) s = s.slice(4);
  s = s.split("/")[0];
  return s || null;
}

/** Extract the host from a URL, lowercased + www-stripped. Returns null on parse failure. */
export function hostFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** The "domain root" for matching — e.g. 'crunchbase.com/foo' → 'crunchbase.com'. */
export function rootDomain(host: string | null): string | null {
  if (!host) return null;
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  // crude: take last 2 parts. Misses co.il etc — handled by .includes() at
  // the call site, which is the safer check anyway.
  return parts.slice(-2).join(".");
}

// ─── E1 guard: same-name-confusion defense ───────────────────────────
//
// If the script asks mini "research Cohere", it might surface either
// cohere.com (Israeli-presence AI startup) or cohere-comms.com (the
// communication platform). Defense: drop any fact whose snippet doesn't
// mention either the stored company name OR the stored domain root.
// This is cheap, deterministic, and catches the obvious cross-company
// contamination. Returns true if the snippet validates.

export function snippetMatchesCompany(
  snippet: string | null | undefined,
  companyName: string,
  companyDomain: string | null,
): boolean {
  if (!snippet || typeof snippet !== "string") return false;
  const hay = snippet.toLowerCase();
  const needle = companyName.toLowerCase().trim();
  if (needle && hay.includes(needle)) return true;
  const nd = normalizeDomain(companyDomain);
  if (nd) {
    // Match either the full normalized domain OR the "root" segment
    // (e.g. 'cohere' from 'cohere.com'). Root-only match keeps recall
    // high for Crunchbase pages that may say "Cohere is …" without
    // citing the URL.
    if (hay.includes(nd)) return true;
    const root = nd.split(".")[0];
    if (root && root.length >= 3 && hay.includes(root)) return true;
  }
  return false;
}

// ─── value validators ────────────────────────────────────────────────

export function validateFoundedYear(v: unknown): number | null {
  if (typeof v !== "number") return null;
  const y = Math.floor(v);
  if (!Number.isFinite(y)) return null;
  // Sanity: 1850-current. Anything outside is hallucinated.
  const thisYear = new Date().getUTCFullYear();
  if (y < 1850 || y > thisYear) return null;
  return y;
}

export function validateStage(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return (ALLOWED_STAGES as readonly string[]).includes(trimmed) ? trimmed : null;
}

export function validateSize(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return (ALLOWED_SIZES as readonly string[]).includes(trimmed) ? trimmed : null;
}

export function validateString(v: unknown, maxLen = 400): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLen);
}

export function validateUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** True if the host (or any subdomain) is in CREDIBLE_HOSTS. */
export function isCredibleHost(url: string | null): boolean {
  const host = hostFromUrl(url);
  if (!host) return false;
  if (CREDIBLE_HOSTS.has(host)) return true;
  // 'en.wikipedia.org' / 'es.wikipedia.org' / 'mobile.reuters.com' etc.
  for (const cred of CREDIBLE_HOSTS) {
    if (host.endsWith("." + cred)) return true;
  }
  return false;
}

/**
 * Credibility check that ALSO accepts the company's own domain as
 * credible — a company describing itself on its own about page is the
 * most authoritative source for description / hq / founded year. Use
 * this from validateFact; isCredibleHost remains the static-host check.
 */
export function isCredibleFor(url: string | null, companyDomain: string | null): boolean {
  if (isCredibleHost(url)) return true;
  const host = hostFromUrl(url);
  const stored = normalizeDomain(companyDomain);
  if (!host || !stored) return false;
  // Exact host match OR host ends with '.<stored>' to catch
  // 'careers.acme.com' / 'about.acme.com'. Stored is already normalized
  // (no www, no protocol).
  if (host === stored) return true;
  if (host.endsWith("." + stored)) return true;
  return false;
}

/**
 * Pull a parseable JSON object out of free-form LLM output. Handles
 * three shapes seen in the wild:
 *   1. clean JSON
 *   2. JSON wrapped in ```json ... ``` fences
 *   3. JSON followed by trailing markdown commentary that itself
 *      contains '{' or '}' chars (the Hypernative round-2 failure mode)
 *
 * Round 2 used `text.slice(first, lastIndexOf('}') + 1)`. That grabbed
 * trailing chatter when the LLM's commentary contained another '}',
 * which then choked JSON.parse with "Unexpected non-whitespace
 * character after JSON". Round 3 fix: walk backward through every
 * candidate '}' from the end, try to parse `text[first..i+1]`, and
 * return the first slice that parses. The longest valid prefix wins.
 *
 * Returns null if no parseable substring is found.
 */
export function extractJsonObject(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  const text = fenced ? fenced[1] : raw;
  const first = text.indexOf("{");
  if (first < 0) return null;
  for (let i = text.length - 1; i >= first; i--) {
    if (text[i] !== "}") continue;
    const candidate = text.slice(first, i + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // keep walking back to the next '}'
    }
  }
  return null;
}

// ─── Round-3 fix 1 (SIZE): deterministic bucket mapping ──────────────
//
// Round 2 let mini pick the bucket string from the allowed vocab.
// Result: Continental got "50-100" despite the cited source literally
// reading "around 78,000 people" — mini extracts the right NUMBER but
// fails the bucket-mapping step. Solution: ask for an integer headcount
// in the prompt, map to bucket in code. Determinism by construction.

/**
 * Map a raw employee count to one of the canonical DB size buckets.
 * Returns null for negative / NaN / non-numeric inputs.
 *
 * Buckets are non-overlapping inside this function — we pick the
 * canonical bucket containing the number. The 8 existing DB strings
 * include some historical dual ranges (50-100 vs 50-200, 100-200);
 * picking the tighter one keeps the data consistent across reruns.
 *
 * Boundary semantics: '50-100' covers 50..100 inclusive; '100-200'
 * covers 101..200; etc. (Tighter than typical "50-100 = 50-99". DB
 * already uses overlapping strings; tight semantics here is what gives
 * us a deterministic function.)
 */
export function sizeBucketForCount(n: unknown): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 1) return null;
  const c = Math.floor(n);
  if (c <= 50) return "1-50";
  if (c <= 100) return "50-100";
  if (c <= 200) return "100-200";
  if (c <= 500) return "200-500";
  if (c <= 1000) return "500-1000";
  if (c <= 5000) return "1000-5000";
  return "5000+";
}

// ─── Round-3 fix 2 (STAGE): ticker-required Public check ─────────────
//
// Round 2 had mini calling Pelephone, Tara, BDO Israel, xAI, and
// DeepMind "Public" — all of which are private or subsidiaries of
// public parents. Fix: stage='Public' is only allowed if an actual
// stock-exchange ticker is mentioned somewhere in the response. No
// ticker → reject Public → NULL.
//
// Detector is conservative: looks for explicit exchange-prefixed
// tickers (NASDAQ:FOO, NYSE: BAR, (TASE: BAZ), etc.). False negatives
// are acceptable — they manifest as NULL rather than fabrication.

const TICKER_REGEX = new RegExp(
  // exchange code + separator + 1-6 uppercase ticker chars
  "\\b(NASDAQ|NYSE|TASE|LSE|FSE|FRA|TSX|TSXV|ASX|HKG|TYO|SHE|SSE|SHA|AMEX|OTCMKTS|OTC|BATS|NYSEARCA|NYSEMKT|NYSEAMERICAN|EURONEXT|XETRA)" +
  "\\s*[:.\\s]\\s*([A-Z][A-Z0-9.\\-]{0,5})\\b",
  "i",
);

/**
 * True iff any of the supplied snippets contains an explicit
 * exchange:ticker pattern. Pass every snippet from a single
 * response (description, stage, etc.) — mini may put the ticker in
 * any of them.
 */
export function hasTicker(snippets: Array<string | null | undefined>): boolean {
  for (const s of snippets) {
    if (typeof s !== "string" || !s) continue;
    if (TICKER_REGEX.test(s)) return true;
  }
  return false;
}

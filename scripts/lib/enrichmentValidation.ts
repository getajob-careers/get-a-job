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
export const CREDIBLE_HOSTS = new Set([
  "crunchbase.com",
  "pitchbook.com",
  "sec.gov",
  "wikipedia.org",
  "en.wikipedia.org",
  "calcalistech.com",
  "calcalist.co.il",
  "en.globes.co.il",
  "globes.co.il",
  "techcrunch.com",
  "reuters.com",
  "bloomberg.com",
  "jpost.com",
  "ynetnews.com",
  "ynet.co.il",
  "timesofisrael.com",
  "finder.startupnationcentral.org",
  "startupnationcentral.org",
  "fiercebiotech.com",
  "nocamels.com",
  "ctech.tech",
  "linkedin.com",
  "duns100.co.il",
  "dnb.com",
  "marketscreener.com",
  "stockanalysis.com",
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

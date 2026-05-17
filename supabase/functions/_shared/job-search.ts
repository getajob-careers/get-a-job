// Shared helpers for the two job-search edge functions:
//   - generate-top-picks  (Tier 1 multi-role fetch + heuristic select + LLM score)
//   - browse-jobs         (Tier N multi-role fetch + pagination, no scoring)
//
// Extracted from the old generate-job-suggestions function during the
// 2026-05-17 two-section rebuild. Stays in /_shared/ because both new
// functions need: the same API clients (Active Jobs DB + JSearch), the
// same role-title normalization (canonicalize → strip seniority), and
// the same country detection (substring match on profile.location).

import { roleLibrary } from "./libraries/00_role_library.ts";

// ───── Country detection ────────────────────────────────────────────────

// Map a free-text location string to an ISO country code. JSearch defaults
// to US when no country is given — wrong for non-US users. The new code
// uses the same map but adds a "country name" lookup for Active Jobs DB's
// location_filter (which wants names like "Israel", not codes).
const COUNTRY_RULES: Array<{ match: RegExp; code: string; name: string }> = [
  { match: /israel/i,                          code: "il", name: "Israel" },
  { match: /united kingdom|\buk\b/i,           code: "gb", name: "United Kingdom" },
  { match: /germany/i,                         code: "de", name: "Germany" },
  { match: /france/i,                          code: "fr", name: "France" },
  { match: /netherlands/i,                     code: "nl", name: "Netherlands" },
  { match: /spain/i,                           code: "es", name: "Spain" },
  { match: /canada/i,                          code: "ca", name: "Canada" },
  { match: /australia/i,                       code: "au", name: "Australia" },
  { match: /india/i,                           code: "in", name: "India" },
  { match: /ireland/i,                         code: "ie", name: "Ireland" },
  { match: /singapore/i,                       code: "sg", name: "Singapore" },
];

export function locationToCountryCode(loc: string | null | undefined): string {
  const s = String(loc ?? "");
  for (const r of COUNTRY_RULES) if (r.match.test(s)) return r.code;
  return "us";
}

export function locationToCountryName(loc: string | null | undefined): string {
  const s = String(loc ?? "");
  for (const r of COUNTRY_RULES) if (r.match.test(s)) return r.name;
  return "United States";
}

// ───── Role title normalization ────────────────────────────────────────

const ROLE_TITLE_STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "with",
  "at", "by", "from", "as", "is", "role",
]);

function titleTokens(s: string): string[] {
  return (s || "").toLowerCase().match(/[a-z][a-z-]{2,}/g) || [];
}

// Resolve a typed role like "Product Mgr" or "Cust Success" to a library
// canonical title via Jaccard-over-tokens with 5-char stem folding.
// Threshold 0.30 — below that, return input unchanged.
export function canonicalizeRoleTitle(raw: string): string {
  const input = String(raw || "").trim();
  if (!input) return input;
  const goalTokens = titleTokens(input).filter((t) => !ROLE_TITLE_STOPWORDS.has(t));
  if (goalTokens.length === 0) return input;

  const stemMatch = (a: string, b: string): boolean => {
    if (a === b) return true;
    const minLen = Math.min(a.length, b.length);
    return minLen >= 5 && a.slice(0, 5) === b.slice(0, 5);
  };

  let best: { title: string; score: number; stdHit: boolean } | null = null;
  const tryTitle = (title: string, isStd: boolean) => {
    const tTokens = titleTokens(title).filter((t) => !ROLE_TITLE_STOPWORDS.has(t));
    if (tTokens.length === 0) return;
    let overlap = 0;
    const used = new Set<number>();
    for (const gt of goalTokens) {
      for (let i = 0; i < tTokens.length; i++) {
        if (used.has(i)) continue;
        if (stemMatch(gt, tTokens[i])) { overlap++; used.add(i); break; }
      }
    }
    const denom = goalTokens.length + tTokens.length - overlap;
    const score = denom > 0 ? overlap / denom : 0;
    if (score > 0 && (!best || score > best.score ||
        (score === best.score && isStd && !best.stdHit))) {
      best = { title, score, stdHit: isStd };
    }
  };

  for (const r of (roleLibrary as any).roles) {
    if (r.standardized_title) tryTitle(String(r.standardized_title), true);
    for (const alt of r.alternate_titles || []) {
      const a = String(alt);
      if (a.length >= 5) tryTitle(a, false);
    }
  }
  return best && best.score >= 0.30 ? best.title : input;
}

// Active Jobs DB's title_filter is strict phrase match. "Associate Product
// Manager" matches only jobs literally titled that way. Strip the leading
// seniority modifier so the broader role family matches.
export function stripSeniority(t: string): string {
  return t
    .replace(/^\s*(senior|junior|associate|lead|principal|staff|head\s+of)\s+/i, "")
    .trim();
}

// ───── RAPIDAPI_KEY sanitization ───────────────────────────────────────

// Three classes of paste artifact have bitten this integration:
//   1. trailing apostrophe (`a1b7…c0b6'` → 51-char header → 403)
//   2. surrounding quotes from clipboard managers (`"a1b7…"`)
//   3. invisible non-printable bytes (BOM, ZWSP, stray tab/newline) that
//      pass an "is non-empty?" check but blow up fetch() with
//      "headers of RequestInit is not a valid ByteString"
// Strip-then-trim: remove any byte outside printable ASCII, then strip
// wrapping whitespace + quotes. Cleaned value is the legitimate key.
export function sanitizeKey(v: string | undefined): string {
  return (v || "")
    .replace(/[^\x20-\x7e]/g, "")
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "");
}

// ───── Job URL filtering ───────────────────────────────────────────────

// JSearch's global remote tier returns real company info but anonymised
// "https://example.com/job/<id>" placeholder URLs that 404 on click.
// Filter these before downstream processing.
export function isUsableJobUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0) return false;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (u.hostname === "example.com" || u.hostname.endsWith(".example.com")) return false;
    return true;
  } catch {
    return false;
  }
}

// ───── Active Jobs DB client ───────────────────────────────────────────

export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  job_url: string;
  salary_min: number | null;
  salary_max: number | null;
  is_remote: boolean;
  seniority: string | null;
  date_posted: string | null;
  source: string;
}

export function mapActiveJobsDb(job: any): NormalizedJob {
  const loc =
    (Array.isArray(job?.locations_derived) && job.locations_derived.length
      ? job.locations_derived[0]
      : Array.isArray(job?.cities_derived) && job.cities_derived.length
        ? job.cities_derived[0]
        : "") as string;
  return {
    id: String(job?.id ?? ""),
    title: job?.title || "",
    company: job?.organization || "",
    description: job?.description_text || "",
    location: loc,
    job_url: job?.url || "",
    salary_min: job?.salary_raw?.value?.minValue ?? null,
    salary_max: job?.salary_raw?.value?.maxValue ?? null,
    is_remote: Boolean(job?.remote_derived),
    seniority: null,
    date_posted: job?.date_posted || null,
    source: job?.source || "active-jobs-db",
  };
}

export interface ActiveJobsDbParams {
  titleFilter: string;       // already stripSeniority'd and canonicalized
  locationFilter: string;    // country name, e.g. "Israel"
  limit?: number;            // default 20
  offset?: number;           // default 0
  apiKey: string;            // sanitized RAPIDAPI_KEY
  timeoutMs?: number;        // default 12000
}

export async function fetchActiveJobsDb(p: ActiveJobsDbParams): Promise<any[]> {
  if (!p.apiKey) return [];
  const qs = new URLSearchParams({
    limit: String(p.limit ?? 20),
    offset: String(p.offset ?? 0),
    title_filter: `"${p.titleFilter}"`,
    location_filter: `"${p.locationFilter}"`,
    description_type: "text",
    agency: "false",
  });
  const url = `https://active-jobs-db.p.rapidapi.com/active-ats-7d?${qs.toString()}`;
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": "active-jobs-db.p.rapidapi.com",
        "x-rapidapi-key": p.apiKey,
      },
      signal: AbortSignal.timeout(p.timeoutMs ?? 12000),
    });
    if (!res.ok) {
      console.warn(
        `[job-search] active-jobs-db ${res.status} for title="${p.titleFilter}" loc="${p.locationFilter}"`,
      );
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(
      `[job-search] active-jobs-db fetch error for title="${p.titleFilter}":`,
      (err as Error).message,
    );
    return [];
  }
}

// ───── JSearch client ──────────────────────────────────────────────────

export function mapJSearchJob(job: any): NormalizedJob {
  return {
    id: job.job_id,
    title: job.job_title,
    company: job.employer_name,
    description: job.job_description,
    location: `${job.job_city || ""}, ${job.job_state || ""}`.replace(/^, | , $/g, "").trim(),
    job_url: job.job_apply_link,
    salary_min: job.job_min_salary,
    salary_max: job.job_max_salary,
    is_remote: Boolean(job.job_is_remote),
    seniority: null,
    date_posted: job.job_posted_at_datetime_utc || null,
    source: "jsearch",
  };
}

export async function fetchJSearch(
  query: string,
  countryCode: string | undefined,
  apiKey: string,
  timeoutMs = 10000,
): Promise<any[]> {
  if (!apiKey) return [];
  const base = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1`;
  const url = countryCode ? `${base}&country=${countryCode}` : base;
  try {
    const res = await fetch(url, {
      headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`[job-search] jsearch ${res.status} for query="${query}" country="${countryCode ?? "global"}"`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.error(`[job-search] jsearch fetch error for query="${query}":`, (err as Error).message);
    return [];
  }
}

// ───── Multi-role parallel fetch ───────────────────────────────────────

export interface FetchTierJobsParams {
  roleTitles: string[];        // from career_roles, capped by caller
  countryCode: string;         // 'il' | 'us' | ...
  countryName: string;         // 'Israel' | 'United States' | ...
  apiKey: string;
  limit?: number;
  offset?: number;
}

export interface FetchTierJobsResult {
  jobs: NormalizedJob[];
  source: "active-jobs-db" | "jsearch" | "empty";
}

// Parallel fan-out across all input role titles, dedupe by (company+title)
// for cross-role cases (e.g. "Product Manager" and "Senior Product Manager"
// returning overlapping postings after stripSeniority). For IL, JSearch is
// killed entirely — Active Jobs DB returns 100% IL jobs and the JSearch
// fallback was the source of the "remote/Dallas/Lebanon" noise. For non-IL,
// JSearch fires as a fallback when Active Jobs DB returns nothing.
export async function fetchTierJobs(p: FetchTierJobsParams): Promise<FetchTierJobsResult> {
  const titles = p.roleTitles
    .map((t) => stripSeniority(canonicalizeRoleTitle(t)))
    .filter((t) => t.length > 0);
  if (titles.length === 0) return { jobs: [], source: "empty" };

  // Active Jobs DB — fire all role queries in parallel.
  const ajResults = await Promise.all(
    titles.map((titleFilter) =>
      fetchActiveJobsDb({
        titleFilter,
        locationFilter: p.countryName,
        limit: p.limit ?? 20,
        offset: p.offset ?? 0,
        apiKey: p.apiKey,
      }),
    ),
  );
  const ajMapped = ajResults
    .flat()
    .map(mapActiveJobsDb)
    .filter((j) => isUsableJobUrl(j.job_url));

  // Dedupe by (company|title) — same posting can surface from multiple
  // role queries (e.g. "Product Manager" and "Product Operations Manager"
  // both hitting "Product Operations Manager at Wix").
  const dedupedAj = dedupeByKey(ajMapped, (j) => `${j.company}|${j.title}`);

  if (dedupedAj.length > 0) {
    return { jobs: dedupedAj, source: "active-jobs-db" };
  }

  // IL never falls through to JSearch — kill switch (it returns 0 or
  // remote-only noise for country=il). For non-IL, JSearch is the fallback.
  if (p.countryCode === "il") return { jobs: [], source: "empty" };

  // JSearch fallback. Fire one query per title with country code filter.
  const jsResults = await Promise.all(
    titles.map((title) => fetchJSearch(title, p.countryCode, p.apiKey)),
  );
  const jsMapped = jsResults
    .flat()
    .map(mapJSearchJob)
    .filter((j) => isUsableJobUrl(j.job_url));
  const dedupedJs = dedupeByKey(jsMapped, (j) => `${j.company}|${j.title}`);

  if (dedupedJs.length > 0) return { jobs: dedupedJs, source: "jsearch" };
  return { jobs: [], source: "empty" };
}

function dedupeByKey<T>(items: T[], key: (it: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

// ───── Heuristic selection for Top Picks ───────────────────────────────

// Per-country major-city preference list. Used only as a tie-breaker
// signal in the heuristic selector — jobs in a "major" city for the
// user's country rank above jobs in smaller towns. Outside IL/US/UK we
// skip the city signal entirely (sparse data, would over-penalize valid
// jobs in markets we don't know well).
const MAJOR_CITIES: Record<string, string[]> = {
  il: ["tel aviv", "herzliya", "ramat gan", "jerusalem", "haifa"],
  us: ["new york", "san francisco", "boston", "seattle", "austin", "los angeles", "chicago", "denver"],
  gb: ["london", "manchester", "edinburgh", "bristol", "cambridge"],
};

const SENIORITY_RANK: Record<string, number> = {
  entry: 0, mid: 1, senior: 2, lead: 3, director: 4, executive: 5,
};

export type JobSeniority = "entry" | "mid" | "senior" | "lead" | "director" | "executive";

export function detectJobSeniority(title: string): JobSeniority {
  const t = String(title || "").toLowerCase();
  if (/\b(vp\b|chief\b|cto\b|ceo\b|cmo\b|cpo\b|cfo\b|head\s+of)/.test(t)) return "executive";
  if (/\b(director|head)\b/.test(t)) return "director";
  if (/\b(principal|staff|lead|manager\s+of)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|associate|intern|entry|graduate|trainee)\b/.test(t)) return "entry";
  return "mid";
}

export type UserLevel = "early_career" | "mid_career" | "senior_career";

export interface HeuristicSelectParams {
  jobs: NormalizedJob[];
  userLevel: UserLevel;
  countryCode: string;
  limit?: number;             // default 8
  maxPerEmployer?: number;    // default 2
}

// Score each job 0-100 across three signals, sort, dedupe-by-employer-cap,
// take top N. Order: jobs the user is plausibly hireable for, in cities
// where they probably want to work, with employer diversity.
export function selectTopPicks(p: HeuristicSelectParams): NormalizedJob[] {
  const limit = p.limit ?? 8;
  const maxPerEmployer = p.maxPerEmployer ?? 2;
  const userRank = p.userLevel === "early_career" ? 0 : p.userLevel === "mid_career" ? 1 : 2;
  const cities = MAJOR_CITIES[p.countryCode] ?? null;

  const scored = p.jobs.map((j) => {
    const jobRank = SENIORITY_RANK[detectJobSeniority(j.title)] ?? 1;
    const gap = jobRank - userRank;
    // Strong preference for within-1-rank-of-user. Hard penalty 2+ ranks above.
    const seniorityScore = gap <= 1 ? 50 : gap === 2 ? 20 : gap >= 3 ? 5 : 35;

    let cityScore = 25;
    if (cities) {
      const locLower = (j.location || "").toLowerCase();
      const idx = cities.findIndex((c) => locLower.includes(c));
      cityScore = idx === -1 ? 10 : 50 - idx * 5;
    }

    // Recency mild bias — prefer last 7 days
    let recencyScore = 10;
    if (j.date_posted) {
      const ageMs = Date.now() - new Date(j.date_posted).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays <= 7) recencyScore = 25;
      else if (ageDays <= 30) recencyScore = 15;
    }

    return { job: j, score: seniorityScore + cityScore + recencyScore };
  });

  scored.sort((a, b) => b.score - a.score);

  const out: NormalizedJob[] = [];
  const perEmployer = new Map<string, number>();
  for (const { job } of scored) {
    const emp = (job.company || "").toLowerCase();
    const used = perEmployer.get(emp) ?? 0;
    if (used >= maxPerEmployer) continue;
    out.push(job);
    perEmployer.set(emp, used + 1);
    if (out.length >= limit) break;
  }
  return out;
}

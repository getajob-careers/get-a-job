// ATS fetchers — one per platform. Each returns a list of `RawJob`s
// independent of location filter / classification (that happens
// downstream in normalize.ts callers).
//
// Five ATSs covered, per the spec:
//   - greenhouse:      GET, single call
//   - lever:           GET, single call
//   - ashby:           GET with ?includeCompensation=true (NOT POST — that
//                       was the bug the diagnostic surfaced)
//   - workday:         POST with searchText:"Israel", paginated
//   - smartrecruiters: GET with country=il, paginated
//
// Comeet and Recruitee are intentionally omitted for v1 (Decision #9 +
// the deferred Comeet slug-discovery work).

import { XMLParser } from "fast-xml-parser";
import type { CompanyEntry, RawJob } from "./normalize.js";

const USER_AGENT = "GetAJob-RefreshJobs/1.0 (https://getajob.example)";
const DEFAULT_TIMEOUT_MS = 25_000;
const WORKDAY_MAX_PAGES = 25;       // 25 × 20 = 500 IL-matching jobs ceiling per tenant
const SR_MAX_PAGES = 10;            // 10 × 100 = 1000 IL jobs ceiling per company

// ───── HTTP helpers ──────────────────────────────────────────────────

async function httpGetJson<T>(url: string, timeout = DEFAULT_TIMEOUT_MS): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function httpPostJson<T>(url: string, body: unknown, timeout = DEFAULT_TIMEOUT_MS): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ───── Greenhouse ────────────────────────────────────────────────────

export async function fetchGreenhouse(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.slug) return [];
  const url = `https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs?content=true`;
  const data = await httpGetJson<{ jobs?: any[] }>(url);
  const jobs = data.jobs ?? [];
  return jobs.map((j) => ({
    external_id:      String(j.id),
    title:            j.title ?? "",
    description_html: j.content ?? null,
    location_raw:     (j.location?.name as string) ?? null,
    // Greenhouse doesn't expose structured country; rely on string match.
    structured_country: null,
    apply_url:        j.absolute_url ?? "",
    date_posted:      j.updated_at ?? null,
    salary_min:       null,
    salary_max:       null,
    salary_currency:  null,
    is_remote:        /remote/i.test(j.location?.name ?? ""),
    raw_payload:      j,
  }));
}

// ───── IAI (Israel Aerospace Industries) — custom WordPress theme ───
//
// IAI's careers site (jobs.iai.co.il) was originally pitched in the
// Hunter/Niloosoft investigation but live-probing showed it's actually
// a custom WordPress + Vue theme ("tyco-wp"). The earlier Hunter URL
// (jobs.hunterhrms.com/IAI.co.il/) is wrong / dead. Real adapter:
//
//   GET https://jobs.iai.co.il/wp-content/themes/tyco-wp/assets/json/jobs.json
//
// Returns a JSON array of ~470 active jobs (no pagination, no auth).
// Per-job schema uses compact 2-letter keys:
//
//   id  — internal numeric ID (stable dedup key)
//   cd  — job code (used in detail URLs: ?p=jobs&jobCode={cd})
//   tl  — title (Hebrew prose, often with English brackets/codes)
//   dc  — description (full Hebrew prose, median 1,159 chars, max 3,525)
//   ct  — city (Hebrew name)
//   tp  — employment type (Hebrew label)
//   jc  — job category (Hebrew label)
//   oc, pr — taxonomy ID arrays (unused)
//   ht  — "hot job" flag (unused)
//   sn  — "senior" flag (we let the v4 extractor decide from prose)
//
// Salary, posted date, and years-of-experience fields are NOT exposed
// — they live inside `dc` prose if at all, which the v4 extractor will
// surface. Per-job apply URL: `https://jobs.iai.co.il/?p=jobs&jobCode={cd}`.
//
// IAI is Hebrew-only. The v4 extractor's jd_language='he' classification
// fires correctly on these JDs (verified in the May 2026 backfill).
// This adapter unlocks ~470 IL jobs in one shot — biggest single-source
// addition since the original Greenhouse scrape.
export async function fetchIai(_c: CompanyEntry): Promise<RawJob[]> {
  // Single endpoint — the registry entry's slug is ignored. We hardcode
  // the URL because the JSON path is unique to IAI's WordPress theme
  // and wouldn't generalize even if other companies licensed the same
  // theme (different cachebuster, different relative paths).
  const url = "https://jobs.iai.co.il/wp-content/themes/tyco-wp/assets/json/jobs.json";
  const data = await httpGetJson<any[]>(url);
  if (!Array.isArray(data)) {
    console.warn("[iai] unexpected response shape — expected array");
    return [];
  }
  return data.map((j) => {
    const code = j.cd || j.id;
    return {
      external_id:      String(j.id ?? code),
      title:            (j.tl ?? "").toString(),
      description_html: typeof j.dc === "string" && j.dc.trim().length > 0
                          ? j.dc
                          : null,
      // Location string from the Hebrew city field. The classifier's
      // Hebrew-city map handles the major IL cities (Tel Aviv, Herzliya,
      // Ramat Gan, Be'er Yaakov, etc.); rare cities fall through to the
      // /israel/i regex catch-all.
      location_raw:     (j.ct ?? "").toString() || null,
      // IAI is exclusively Israel — every job here is IL by construction.
      // Pre-tag so the classifier short-circuits.
      structured_country: "IL",
      apply_url:        `https://jobs.iai.co.il/?p=jobs&jobCode=${encodeURIComponent(code)}`,
      // No posted date in the JSON; the v4 extractor's "stale" heuristic
      // falls back to first-seen-at when date_posted is null.
      date_posted:      null,
      salary_min:       null,
      salary_max:       null,
      salary_currency:  null,
      is_remote:        false,  // IAI is defense/aerospace; remote is rare and not exposed in the feed
      raw_payload:      j,
    };
  });
}

// ───── Jooble ────────────────────────────────────────────────────────
//
// Jooble is a multi-source job-search API that legally re-aggregates
// listings from Drushim, AllJobs, LinkedIn, company career sites, etc.
// We use it as a LEGAL front door to ~87k IL listings without scraping
// any single ToS-protected source ourselves.
//
//   POST https://jooble.org/api/{API_KEY}
//   Body: { keywords, location: "Israel", page, ResultOnPage }
//
// Snippet is TRUNCATED (~150-250 chars) — extractor will flag
// extraction_confidence < 0.4 and the deterministic scorer downweights
// these rows automatically.

const JOOBLE_KEYWORDS = "engineer OR developer OR manager OR analyst OR designer OR product OR data OR sales OR marketing OR operations";
const JOOBLE_MAX_PAGES = 20;        // 20 × 50 = 1000 jobs max per refresh
const JOOBLE_RESULTS_PER_PAGE = 50;

export async function fetchJooble(_c: CompanyEntry): Promise<RawJob[]> {
  const apiKey = (globalThis as any).process?.env?.JOOBLE_API_KEY;
  if (!apiKey) {
    console.warn("[jooble] JOOBLE_API_KEY not set — skipping (no jobs returned)");
    return [];
  }
  const endpoint = `https://jooble.org/api/${apiKey}`;
  const allJobs: RawJob[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= JOOBLE_MAX_PAGES; page++) {
    const body = {
      keywords: JOOBLE_KEYWORDS,
      location: "Israel",
      page: String(page),
      ResultOnPage: String(JOOBLE_RESULTS_PER_PAGE),
    };
    let resp: { totalCount?: number; jobs?: any[] };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (!res.ok) {
        console.warn(`[jooble] HTTP ${res.status} on page ${page}, stopping`);
        break;
      }
      resp = await res.json();
    } catch (err: any) {
      console.warn(`[jooble] page ${page} failed: ${err?.message || err}`);
      break;
    }
    const pageJobs = resp.jobs ?? [];
    if (pageJobs.length === 0) break;

    for (const j of pageJobs) {
      const id = String(j.id ?? "");
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);
      allJobs.push({
        external_id:      `jooble:${id}`,
        title:            j.title ?? "",
        description_html: typeof j.snippet === "string" && j.snippet.trim().length > 0
                            ? j.snippet
                            : null,
        location_raw:     j.location ?? null,
        structured_country: "IL",
        apply_url:        j.link ?? "",
        date_posted:      j.updated ?? null,
        salary_min:       null,
        salary_max:       null,
        salary_currency:  null,
        is_remote:        /remote/i.test(j.location ?? ""),
        raw_payload:      j,
      });
    }
    if (pageJobs.length < JOOBLE_RESULTS_PER_PAGE) break;
  }
  console.log(`[jooble] fetched ${allJobs.length} jobs across pages`);
  return allJobs;
}

// ───── Workable ──────────────────────────────────────────────────────
//
// Workable powers career pages at `apply.workable.com/{slug}`. The widget
// API is public + unauthenticated — same endpoint that backs every
// Workable customer's embedded job list.
//
//   GET https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true
//
// The `?details=true` flag includes the full prose `description` inline
// (without it, we'd need a per-job detail roundtrip). Returns active
// postings only — no need to filter by state. Per-job fields are flat
// (`city`/`state`/`country` are top-level, NOT nested under a `location`
// object), and the stable ID is `shortcode`, not `id` (there is no `id`).
//
// Volume reality (probed 2026-05-24): of 5 seeded IL slugs (83North,
// Comunix, Incredibuild, Powtoon, YouLeap) only Powtoon has any active
// postings (6, all London — 0 IL). Most Workable accounts are dormant
// or migrated away. Adapter ships for infra value + future expansion;
// downstream filtering will drop the 0-IL companies via the standard
// is_il=false path.
export async function fetchWorkable(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.slug) return [];
  const url = `https://apply.workable.com/api/v1/widget/accounts/${c.slug}?details=true`;
  const data = await httpGetJson<{ jobs?: any[] }>(url);
  const jobs = data.jobs ?? [];
  return jobs.map((j) => {
    // Build a Greenhouse-style "City, State, Country" location string from
    // the flat fields. Used by the downstream classifier when there's no
    // structured country code (Workable returns country NAME, not code).
    const locParts = [j.city, j.state, j.country].filter((p) => p && p !== "");
    const locStr = locParts.length > 0 ? locParts.join(", ") : null;
    // Country is a full name (e.g. "Israel", "United Kingdom"). The IL
    // classifier downstream does a /israel/i substring check, so passing
    // the name through as structured_country lets us short-circuit the
    // expensive city-map lookup for IL postings.
    const country = (j.country || "").trim();
    const structured_country = country
      ? (/^(israel|il)$/i.test(country) ? "IL" : country)
      : null;
    return {
      external_id:      String(j.shortcode ?? j.code ?? ""),
      title:            j.title ?? "",
      description_html: typeof j.description === "string" && j.description.trim().length > 0
                          ? j.description
                          : null,
      location_raw:     locStr,
      structured_country,
      apply_url:        j.application_url ?? j.url ?? j.shortlink ?? "",
      // published_on is the more meaningful "live for candidates" date;
      // created_at is when the draft was first authored.
      date_posted:      j.published_on ?? j.created_at ?? null,
      // The widget response doesn't expose salary fields. Leaving null —
      // the v4 extractor will pull salary from prose when present.
      salary_min:       null,
      salary_max:       null,
      salary_currency:  null,
      is_remote:        j.telecommuting === true || /remote/i.test(locStr ?? ""),
      raw_payload:      j,
    };
  });
}

// ───── Lever ─────────────────────────────────────────────────────────

export async function fetchLever(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.slug) return [];
  const url = `https://api.lever.co/v0/postings/${c.slug}?mode=json`;
  const data = await httpGetJson<any[]>(url);
  return data.map((j) => {
    const cats = j.categories ?? {};
    const location = cats.location ?? null;
    return {
      external_id:      String(j.id),
      title:            j.text ?? "",
      description_html: j.descriptionPlain ?? j.description ?? null,
      location_raw:     location,
      structured_country: null,
      apply_url:        j.hostedUrl ?? j.applyUrl ?? "",
      date_posted:      j.createdAt ? new Date(j.createdAt).toISOString() : null,
      salary_min:       j.salaryRange?.min ?? null,
      salary_max:       j.salaryRange?.max ?? null,
      salary_currency:  j.salaryRange?.currency ?? null,
      is_remote:        cats.commitment === "Remote" || /remote/i.test(location ?? ""),
      raw_payload:      j,
    };
  });
}

// ───── Ashby ─────────────────────────────────────────────────────────

export async function fetchAshby(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.slug) return [];
  const url = `https://api.ashbyhq.com/posting-api/job-board/${c.slug}?includeCompensation=true`;
  const data = await httpGetJson<{ jobs?: any[] }>(url);
  const jobs = data.jobs ?? [];
  return jobs.map((j) => {
    // Ashby exposes a primary location + secondaryLocations array; we
    // concatenate so the IL classifier sees all of them.
    const primary = j.location ?? "";
    const secondary = Array.isArray(j.secondaryLocations)
      ? j.secondaryLocations.map((s: any) => s?.location).filter(Boolean).join(" | ")
      : "";
    const locationRaw = [primary, secondary].filter(Boolean).join(" | ") || null;
    return {
      external_id:      String(j.id),
      title:            j.title ?? "",
      description_html: j.descriptionHtml ?? j.descriptionPlain ?? null,
      location_raw:     locationRaw,
      structured_country: null,
      apply_url:        j.jobUrl ?? j.applyUrl ?? "",
      date_posted:      j.publishedAt ?? null,
      salary_min:       j.compensation?.compensationTierSummary?.minValue ?? null,
      salary_max:       j.compensation?.compensationTierSummary?.maxValue ?? null,
      salary_currency:  j.compensation?.compensationTierSummary?.currencyCode ?? null,
      is_remote:        Boolean(j.isRemote) || /remote/i.test(locationRaw ?? ""),
      raw_payload:      j,
    };
  });
}

// ───── Workday ───────────────────────────────────────────────────────

/**
 * Workday tenants are massive (NVIDIA: 5000+ jobs globally) — we MUST use
 * `searchText` to narrow server-side rather than paginating the whole
 * tenant.
 *
 * Multi-query fix (round 2): the single `searchText: "Israel"` query
 * misses multi-location postings whose `locationsText` collapses to
 * "2 Locations" (or similar). NVIDIA's IL listings were almost entirely
 * in that bucket — `searchText: "Tel Aviv"` surfaces them with clean
 * "Israel, Tel Aviv" strings. Fix: run 3 queries per tenant, dedup by
 * externalPath, return the union. ~3x request count per tenant but
 * recall jumps from ~3 IL jobs to ~258 for NVIDIA.
 */
// Workday uses server-side `searchText` to narrow before pagination.
// A job tagged ONLY with a city not in this list would be invisible to us.
// Expanded from the original 3 to cover every IL city with non-trivial
// tech employer presence — surfaces jobs at NVIDIA Ra'anana, Intel Haifa,
// Mobileye Jerusalem, Annapurna AWS Yokneam, etc. that the original 3-term
// query missed.
const WORKDAY_SEARCH_TERMS = [
  "Israel",
  "Tel Aviv",
  "Herzliya",
  "Ra'anana",
  "Petah Tikva",
  "Haifa",
  "Be'er Sheva",
  "Netanya",
  "Yokneam",
  "Jerusalem",
  "Ramat Gan",
] as const;

// Workday returns `postedOn` as either an ISO timestamp (rare) or a
// relative human string like "Posted 3 Days Ago" / "Posted 30+ Days Ago"
// / "Posted Today" / "Posted Yesterday". Postgres `timestamp with time
// zone` rejects the relative form and that nukes the whole UPSERT batch.
// Parse to ISO; return null for anything ambiguous — losing freshness
// for one row is far cheaper than dropping the whole company.
export function parseWorkdayDate(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const startOfTodayUtc = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  };
  const daysAgoIso = (n: number) => {
    const d = startOfTodayUtc();
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString();
  };

  if (/^Posted\s+Today$/i.test(s)) return startOfTodayUtc().toISOString();
  if (/^Posted\s+Yesterday$/i.test(s)) return daysAgoIso(1);
  const m = s.match(/^Posted\s+(\d+)\+?\s+Days?\s+Ago$/i);
  if (m) return daysAgoIso(parseInt(m[1], 10));

  // Fall through: some tenants do return real ISO timestamps.
  const parsed = Date.parse(s);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export async function fetchWorkday(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.slug) return [];
  // Slug shape: "<tenant>.wdN.myworkdayjobs.com/<site>"
  const parts = c.slug.split("/");
  if (parts.length < 2) return [];
  const host = parts[0];
  const site = parts.slice(1).join("/");
  const tenant = host.split(".")[0];
  const url = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;

  // De-dup across the 3 search terms by externalPath (or title+location
  // for jobs missing externalPath).
  const seen = new Set<string>();
  const collected: RawJob[] = [];
  const limit = 20;

  for (const searchText of WORKDAY_SEARCH_TERMS) {
    let reportedTotal: number | null = null;
    let pagesFetched = 0;
    for (let page = 0; page < WORKDAY_MAX_PAGES; page++) {
      const offset = page * limit;
      let data: any;
      try {
        data = await httpPostJson<any>(url, {
          appliedFacets: {},
          limit,
          offset,
          searchText,
        });
      } catch (err) {
        // Some tenants 4xx specific offsets; treat as end-of-stream
        // for THIS search term and try the next one.
        break;
      }
      const postings: any[] = data?.jobPostings ?? [];
      // Workday returns the server-side total in `total` on every response.
      // Capture it on the first page — if total > our cap (WORKDAY_MAX_PAGES
      // × limit = 500), we're silently truncating and need to know.
      if (page === 0 && typeof data?.total === "number") {
        reportedTotal = data.total;
      }
      pagesFetched++;
      if (postings.length === 0) break;
      for (const p of postings) {
        const externalPath = String(p.externalPath ?? p.bulletFields?.[0] ?? "");
        const dedupKey = externalPath
          || `${String(p.title ?? "")}|${String(p.locationsText ?? "")}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const applyUrl = externalPath
          ? `https://${host}/${site}${externalPath.startsWith("/") ? externalPath : `/${externalPath}`}`
          : `https://${host}/${site}`;
        collected.push({
          external_id:      dedupKey,
          title:            p.title ?? "",
          // Workday list endpoint doesn't include descriptions. Fetching
          // per job would 20x the request count — skipped in v1.
          description_html: null,
          location_raw:     p.locationsText ?? null,
          structured_country: null,
          apply_url:        applyUrl,
          date_posted:      parseWorkdayDate(p.postedOn),
          salary_min:       null,
          salary_max:       null,
          salary_currency:  null,
          is_remote:        /remote/i.test(p.locationsText ?? ""),
          raw_payload:      p,
        });
      }
      if (postings.length < limit) break;
    }
    // Truncation alert: if Workday reported more jobs than we could fetch
    // within WORKDAY_MAX_PAGES, log loudly so ops can raise the cap or
    // narrow the search per tenant. Surface includes tenant + search term
    // + reported total vs fetched count.
    const cap = WORKDAY_MAX_PAGES * limit;
    if (reportedTotal != null && reportedTotal > cap) {
      console.warn(
        `[workday] TRUNCATED — tenant=${tenant} searchText="${searchText}" total=${reportedTotal} fetched_pages=${pagesFetched} cap=${cap}. Raise WORKDAY_MAX_PAGES or add a narrower searchText.`,
      );
    }
  }
  return collected;
}

// ───── Workday detail (per-job description) ──────────────────────────

// Detail-fetch timeout tighter than the 25s list-call default — a single
// JD detail is small. 8s is the "hung tenant" guard the brief asked for:
// if a tenant's detail endpoint stalls we want the call to abort fast
// and the job to land with description_html=null, not eat the 18-min
// workflow budget. Per-call AbortController is built into httpGetJson.
const DETAIL_TIMEOUT_MS = 8_000;

/**
 * Fetch a single Workday job's description via the CXS detail endpoint.
 *
 * Args:
 *   slug         — "<host>/<site>" from companies_il.json (same parse
 *                  the list fetcher does).
 *   externalPath — the path returned in the list payload's
 *                  `externalPath` field (already extracted by
 *                  fetchWorkday into RawJob.external_id and
 *                  RawJob.raw_payload.externalPath).
 *
 * Returns: the raw HTML description string, or null on any failure
 * (network error, HTTP non-200, timeout, missing field). Never throws.
 *
 * URL shape: `https://{host}/wday/cxs/{tenant}/{site}/job{externalPath}`
 * — same base as the list endpoint, with `/job` singular and the
 * externalPath appended. externalPath is canonically `/job/...` so the
 * concatenation yields `/job/job/...` which Workday accepts. (The
 * helper handles both leading-slash and not.)
 *
 * Response shape: `{ jobPostingInfo: { jobDescription: "...html...",
 * description: "...", ... } }`. Tolerant of both field names.
 */
export async function fetchWorkdayDetail(
  slug: string,
  externalPath: string,
): Promise<string | null> {
  if (!slug || !externalPath) return null;
  const parts = slug.split("/");
  if (parts.length < 2) return null;
  const host = parts[0];
  const site = parts.slice(1).join("/");
  const tenant = host.split(".")[0];
  const pathSegment = externalPath.startsWith("/") ? externalPath : `/${externalPath}`;
  const url = `https://${host}/wday/cxs/${tenant}/${site}/job${pathSegment}`;
  try {
    const data = await httpGetJson<any>(url, DETAIL_TIMEOUT_MS);
    const info = data?.jobPostingInfo ?? {};
    const html = info.jobDescription ?? info.description ?? null;
    return typeof html === "string" && html.length > 0 ? html : null;
  } catch {
    return null;
  }
}

// ───── SmartRecruiters detail (per-job description) ──────────────────

/**
 * Fetch a single SmartRecruiters job's description via the v1 detail
 * endpoint. Used when the list response's
 * `jobAd.sections.jobDescription.text` is null (~100% of the 6
 * SR-null rows on 2026-06-03).
 *
 * URL: `https://api.smartrecruiters.com/v1/companies/{slug}/postings/{id}`
 * Response: `{ jobAd: { sections: { jobDescription: { text: "..." } } } }`
 *
 * Same null-on-failure contract as fetchWorkdayDetail. 8s timeout.
 */
export async function fetchSmartRecruitersDetail(
  slug: string,
  id: string,
): Promise<string | null> {
  if (!slug || !id) return null;
  const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings/${id}`;
  try {
    const data = await httpGetJson<any>(url, DETAIL_TIMEOUT_MS);
    const text = data?.jobAd?.sections?.jobDescription?.text ?? null;
    return typeof text === "string" && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

// ───── Enrichment orchestrator ───────────────────────────────────────

// Per-tenant parallelism for detail calls. The list fetcher is already
// the dominant request load (75 calls/tenant via search-term × pages).
// Detail adds ~20-30 calls/tenant for IL rows — concurrency 4 keeps
// added wall time under ~10s/tenant without hitting per-tenant rate
// limits that the public CXS API enforces inconsistently.
const DETAIL_CONCURRENCY = 4;

async function pMap<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

/**
 * Populate `description_html` in-place on RawJob rows that have a null
 * description and an extractable detail-fetch key. Only acts on
 * Workday and SmartRecruiters (the only sources observed with
 * 100%-null descriptions per the 2026-06-03 DB audit).
 *
 * Called from refresh-jobs.ts AFTER the IL filter, so we never
 * detail-fetch jobs that would have been dropped anyway. Mutates each
 * row's description_html. Silent on individual failures (the row
 * keeps null → extraction skips it server-side via the jd_too_short
 * guard, same as today). Logs a per-tenant warning when >50% of
 * detail calls fail so an outage surfaces in ops logs.
 *
 * Idempotent: rows with non-null description_html are skipped.
 */
export async function enrichDescriptions(
  ats: string,
  companySlug: string | null | undefined,
  rows: RawJob[],
): Promise<void> {
  if (ats !== "workday" && ats !== "smartrecruiters") return;
  if (!companySlug) return;
  const targets = rows.filter((r) => !r.description_html);
  if (targets.length === 0) return;

  let failures = 0;
  await pMap(targets, DETAIL_CONCURRENCY, async (r) => {
    let html: string | null = null;
    if (ats === "workday") {
      const externalPath =
        (r.raw_payload as any)?.externalPath ?? r.external_id ?? "";
      html = await fetchWorkdayDetail(companySlug, externalPath);
    } else if (ats === "smartrecruiters") {
      html = await fetchSmartRecruitersDetail(companySlug, r.external_id);
    }
    if (html) {
      r.description_html = html;
    } else {
      failures++;
    }
  });

  if (targets.length >= 4 && failures / targets.length > 0.5) {
    console.warn(
      `[${ats} detail] ${failures}/${targets.length} detail fetches failed for slug=${companySlug} — tenant may be down or rate-limiting. Affected rows land with description_html=null (silent degradation; extraction will skip server-side).`,
    );
  }
}

// ───── SmartRecruiters ───────────────────────────────────────────────

/**
 * SmartRecruiters exposes a structured country filter — preferable to
 * scanning the whole company. Paginated via offset/limit.
 */
export async function fetchSmartRecruiters(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.slug) return [];
  const collected: RawJob[] = [];
  const limit = 100;
  for (let page = 0; page < SR_MAX_PAGES; page++) {
    const offset = page * limit;
    const url = `https://api.smartrecruiters.com/v1/companies/${c.slug}/postings?country=il&limit=${limit}&offset=${offset}`;
    let data: any;
    try {
      data = await httpGetJson<any>(url);
    } catch (err) {
      break;
    }
    const content: any[] = data?.content ?? [];
    if (content.length === 0) break;
    for (const p of content) {
      const loc = p.location ?? {};
      const locParts = [loc.city, loc.region, loc.country].filter(Boolean);
      collected.push({
        external_id:      String(p.id),
        title:            p.name ?? "",
        // SR list endpoint sometimes includes jobAd.sections.jobDescription.
        // When it doesn't, description stays null (same tradeoff as Workday).
        description_html: p?.jobAd?.sections?.jobDescription?.text ?? null,
        location_raw:     locParts.join(", ") || null,
        // SR DOES expose the country structurally — pass it through.
        structured_country: loc.country ?? null,
        apply_url:        p.applyUrl ?? p.ref ?? "",
        date_posted:      p.releasedDate ?? null,
        salary_min:       p.typeOfEmployment?.salary?.from ?? null,
        salary_max:       p.typeOfEmployment?.salary?.to ?? null,
        salary_currency:  p.typeOfEmployment?.salary?.currency ?? null,
        is_remote:        loc.remote === true || /remote/i.test(locParts.join(" ")),
        raw_payload:      p,
      });
    }
    if (content.length < limit) break;
  }
  return collected;
}

// ───── Comeet ────────────────────────────────────────────────────────

/**
 * Comeet is an Israeli ATS with strong IL adoption. The public Careers
 * API requires BOTH a `company_uid` AND a per-company `token` — both are
 * embedded in the careers page HTML (in `comeetvar` script blocks for
 * WP plugin sites, or `COMEET.init({...})` calls for JS-widget sites).
 *
 * Because the token is per-company and not derivable, the registry
 * stores the full ready-to-fetch URL in `api_url`. This fetcher reads
 * that directly rather than building from a slug.
 *
 * Response shape: array of positions. Each position has:
 *   - uid:           external job ID
 *   - name:          title
 *   - location:      structured { country, city, state, name, is_remote }
 *   - time_updated:  ISO timestamp — used as date_posted
 *   - details:       array of { name, value, order } HTML sections — we
 *                    concatenate with H3 headings to produce a single
 *                    description_html blob
 *   - url_active_page / url_comeet_hosted_page / url_recruit_hosted_page:
 *                    apply URLs (any one may be populated, often null;
 *                    fall back to the company's careers_url)
 */
export async function fetchComeet(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.api_url) return [];
  const data = await httpGetJson<any>(c.api_url);
  if (!Array.isArray(data)) return [];
  return data.map((p) => {
    const loc = p.location || {};
    const country = (loc.country || "").toUpperCase();
    const locName = loc.name
      || [loc.city, loc.state, loc.country].filter(Boolean).join(", ")
      || null;
    // Concatenate all `details` sections (e.g. "Description", "About this
    // role", "Requirements") into one HTML blob with H3 headings between.
    const descParts = Array.isArray(p.details)
      ? p.details
          .filter((d: any) => d && d.value)
          .map((d: any) => `<h3>${d.name || ""}</h3>\n${d.value}`)
          .join("\n")
      : "";
    return {
      external_id:        String(p.uid || ""),
      title:              p.name || "",
      description_html:   descParts || null,
      location_raw:       locName,
      structured_country: country || null,
      apply_url:          p.url_active_page
                          || p.url_comeet_hosted_page
                          || p.url_recruit_hosted_page
                          || c.careers_url
                          || "",
      date_posted:        p.time_updated || null,
      salary_min:         null,
      salary_max:         null,
      salary_currency:    null,
      is_remote:          Boolean(loc.is_remote),
      raw_payload:        p,
    };
  });
}

// ───── SAP SuccessFactors ────────────────────────────────────────────

/**
 * SuccessFactors exposes a public RSS feed at `<careers-domain>/sitemal.xml`
 * (note SAP's typo — it is `sitemal`, not `sitemap`). The feed is the
 * mechanism SAP customers enable to push job listings to Indeed /
 * LinkedIn / Glassdoor; it carries no auth, no key, no rate-limit, and
 * the schema is RSS 2.0 with the Google Jobs namespace
 * (`xmlns:g="http://base.google.com/ns/1.0"`). SAP documents it in
 * KB 2428902 ("XML Feed for Posted Jobs"). 12-hour SF-side TTL — plenty
 * fresh for nightly cron.
 *
 * The registry stores the careers domain in `slug` (e.g. `careers.teva`)
 * for human-readability and the full URL in `api_url`.
 */
const SF_XML_PARSER = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false, // keep IDs/dates as strings — caller decides parsing
  trimValues: true,
});

export function parseSuccessFactorsRss(xml: string): Array<{
  external_id: string;
  title: string;
  description_html: string | null;
  location_raw: string | null;
  apply_url: string;
  date_posted: string | null;
  job_function: string | null;
}> {
  const parsed: any = SF_XML_PARSER.parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel) return [];
  const items = channel.item;
  const arr = Array.isArray(items) ? items : items ? [items] : [];

  return arr.map((it: any) => {
    // `g:id` is the RMK ID (stable, present on every item). `guid` is the
    // RSS standard fallback when an SF tenant has the namespace stripped.
    const externalId = String(it["g:id"] ?? it.guid ?? "");
    return {
      external_id:      externalId,
      title:            typeof it.title === "string" ? it.title : "",
      description_html: typeof it.description === "string" ? it.description : null,
      location_raw:     typeof it["g:location"] === "string" ? it["g:location"] : null,
      apply_url:        typeof it.link === "string" ? it.link : "",
      // RSS `pubDate` is the standard; SF doesn't always include it, but
      // `g:expiration_date` is consistently present so we don't lose freshness.
      date_posted:      (typeof it.pubDate === "string" && it.pubDate)
                          || (typeof it["g:expiration_date"] === "string" && it["g:expiration_date"])
                          || null,
      job_function:     typeof it["g:job_function"] === "string" ? it["g:job_function"] : null,
    };
  });
}

export async function fetchSuccessFactors(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.api_url) return [];
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), DEFAULT_TIMEOUT_MS);
  let xmlText: string;
  try {
    const res = await fetch(c.api_url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml, text/xml" },
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${c.api_url}`);
    // Shared-infra (career2.successfactors.eu) silently 200s with an HTML
    // error page when the company_id is wrong. Validate content-type.
    const ct = res.headers.get("content-type") || "";
    if (!/xml/i.test(ct)) {
      throw new Error(`expected XML, got Content-Type "${ct}" on ${c.api_url}`);
    }
    xmlText = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const items = parseSuccessFactorsRss(xmlText);
  return items.map((it) => ({
    external_id:        it.external_id,
    title:              it.title,
    description_html:   it.description_html,
    location_raw:       it.location_raw,
    structured_country: null, // location_raw carries "Israel" or ", IL"
    apply_url:          it.apply_url,
    date_posted:        it.date_posted,
    salary_min:         null,
    salary_max:         null,
    salary_currency:    null,
    is_remote:          /remote/i.test(it.location_raw ?? ""),
    raw_payload:        it,
  }));
}

// ───── Dispatch table ────────────────────────────────────────────────

export const FETCHERS: Record<string, (c: CompanyEntry) => Promise<RawJob[]>> = {
  greenhouse:      fetchGreenhouse,
  lever:           fetchLever,
  ashby:           fetchAshby,
  workday:         fetchWorkday,
  smartrecruiters: fetchSmartRecruiters,
  comeet:          fetchComeet,
  successfactors:  fetchSuccessFactors,
  workable:        fetchWorkable,
  iai:             fetchIai,
  jooble:          fetchJooble,
};

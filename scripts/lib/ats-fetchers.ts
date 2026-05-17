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
 * `searchText: "Israel"` to narrow server-side rather than paginating the
 * whole tenant and filtering client-side. See diagnostic from earlier:
 * unfiltered first page rarely contained any IL jobs.
 */
export async function fetchWorkday(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.slug) return [];
  // Slug shape: "<tenant>.wdN.myworkdayjobs.com/<site>"
  const parts = c.slug.split("/");
  if (parts.length < 2) return [];
  const host = parts[0];
  const site = parts.slice(1).join("/");
  const tenant = host.split(".")[0];
  const url = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;

  const collected: RawJob[] = [];
  const limit = 20;
  for (let page = 0; page < WORKDAY_MAX_PAGES; page++) {
    const offset = page * limit;
    let data: any;
    try {
      data = await httpPostJson<any>(url, {
        appliedFacets: {},
        limit,
        offset,
        searchText: "Israel",
      });
    } catch (err) {
      // Some tenants 4xx specific offsets; treat as end-of-stream.
      break;
    }
    const postings: any[] = data?.jobPostings ?? [];
    if (postings.length === 0) break;
    for (const p of postings) {
      const externalPath = String(p.externalPath ?? p.bulletFields?.[0] ?? "");
      const applyUrl = externalPath
        ? `https://${host}/${site}${externalPath.startsWith("/") ? externalPath : `/${externalPath}`}`
        : `https://${host}/${site}`;
      collected.push({
        external_id:      externalPath || String(p.title ?? "") + "|" + String(p.locationsText ?? ""),
        title:            p.title ?? "",
        // Workday list endpoint doesn't include descriptions. Fetching per
        // job would 20x the request count — skipped in v1. Description
        // field will be null for Workday jobs. Frontend handles this.
        description_html: null,
        location_raw:     p.locationsText ?? null,
        structured_country: null,
        apply_url:        applyUrl,
        date_posted:      p.postedOn ?? null,
        salary_min:       null,
        salary_max:       null,
        salary_currency:  null,
        is_remote:        /remote/i.test(p.locationsText ?? ""),
        raw_payload:      p,
      });
    }
    if (postings.length < limit) break;
  }
  return collected;
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

// ───── Dispatch table ────────────────────────────────────────────────

export const FETCHERS: Record<string, (c: CompanyEntry) => Promise<RawJob[]>> = {
  greenhouse:      fetchGreenhouse,
  lever:           fetchLever,
  ashby:           fetchAshby,
  workday:         fetchWorkday,
  smartrecruiters: fetchSmartRecruiters,
};

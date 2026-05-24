// scripts/discover-ats-companies.ts
//
// ATS discovery via careers-page crawl. For each company in the registry
// with ats="unknown" and a non-null careers_url, fetches the page HTML
// and regex-matches embedded ATS URLs (Greenhouse / Lever / Ashby /
// Workable). Then validates each discovered slug by hitting the ATS API
// and counting actual IL jobs.
//
// Replaces the earlier brute-force slug-guessing approach which produced
// 3 hits / 260 candidates / 0 IL jobs (mostly slug collisions with
// unrelated US companies).
//
// EMITS TO A DRAFT FILE. Does not mutate companies_il.json — Eli
// promotes hits manually per the review-each pattern.
//
// Usage:
//   npx tsx scripts/discover-ats-companies.ts
//
// Output:
//   scripts/discover-ats-companies-draft.json
//
// Cost: ~150 careers-page fetches + ~30-80 ATS validation calls = ~250
// HTTP total. With 10-way concurrency runs in ~1-2 min.

import { readFileSync, writeFileSync } from "node:fs";

const REGISTRY_PATH = "supabase/functions/_shared/libraries/companies_il.json";
const OUTPUT_PATH = "scripts/discover-ats-companies-draft.json";
const REQUEST_TIMEOUT_MS = 15_000;
const CONCURRENCY = 10;
const USER_AGENT = "Mozilla/5.0 (compatible; GetAJob-Discovery/1.0; +https://getajob.example)";

// IL location matcher
const IL_LOCATION_RE = /israel|tel aviv|haifa|jerusalem|herzliya|ra'?anana|petah tikva|netanya|be'?er sheva|yokneam|ramat gan|modi'?in|holon|kfar saba|rehovot|ישראל|תל אביב|חיפה|ירושלים|הרצליה|רעננה|פתח תקווה/i;

// ───── HTML-embedded ATS URL patterns ───────────────────────────────
//
// Each ATS exposes its slug via predictable URL shapes that companies
// embed in their careers page. Patterns cover both the public-facing
// board URLs AND the embedded JS widget URLs that some sites use.
//
// Captured group 1 = the slug.
const ATS_URL_PATTERNS: Record<string, RegExp[]> = {
  greenhouse: [
    /boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/gi,
    /boards\.eu\.greenhouse\.io\/([a-z0-9_-]+)/gi,
    /job-boards\.greenhouse\.io\/([a-z0-9_-]+)/gi,
    /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/gi,
  ],
  lever: [
    /jobs\.lever\.co\/([a-z0-9_-]+)/gi,
    /api\.lever\.co\/v0\/postings\/([a-z0-9_-]+)/gi,
  ],
  ashby: [
    /jobs\.ashbyhq\.com\/([a-z0-9._-]+)/gi,
    /api\.ashbyhq\.com\/posting-api\/job-board\/([a-z0-9._-]+)/gi,
  ],
  workable: [
    /apply\.workable\.com\/([a-z0-9_-]+)/gi,
    /([a-z0-9_-]+)\.workable\.com/gi,
  ],
};

function extractSlugsFromHtml(html: string): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const [ats, patterns] of Object.entries(ATS_URL_PATTERNS)) {
    out[ats] = new Set<string>();
    for (const re of patterns) {
      for (const m of html.matchAll(re)) {
        const slug = m[1].toLowerCase().trim();
        // Reject obvious garbage: stop-words / generic-looking that match
        // any company's page (e.g., a CDN URL parameter).
        if (slug.length >= 2 && slug.length <= 60 && !/^(api|www|jobs|careers|widget|embed|assets|images|css|js|favicon)$/.test(slug)) {
          out[ats].add(slug);
        }
      }
    }
  }
  return out;
}

// ───── ATS validation probes ────────────────────────────────────────

const ATS_VALIDATORS: Record<string, (slug: string) => string> = {
  greenhouse: (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`,
  lever:      (slug) => `https://api.lever.co/v0/postings/${slug}?mode=json`,
  ashby:      (slug) => `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`,
  workable:   (slug) => `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`,
};

interface Validation {
  jobs_total: number;
  il_jobs: number;
  sample_locations: string[];
}

async function validate(ats: string, slug: string): Promise<Validation | null> {
  const url = ATS_VALIDATORS[ats](slug);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch { return null; }
  if (!res.ok) return null;

  let data: any;
  try { data = await res.json(); } catch { return null; }

  let jobs: any[] = [];
  if (ats === "greenhouse") jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  else if (ats === "lever") jobs = Array.isArray(data) ? data : [];
  else if (ats === "ashby") jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  else if (ats === "workable") jobs = Array.isArray(data?.jobs) ? data.jobs : [];

  let ilCount = 0;
  const sampleLocs: string[] = [];
  for (const j of jobs.slice(0, 100)) {
    let loc = "";
    if (ats === "greenhouse") loc = String(j?.location?.name ?? "");
    else if (ats === "lever") loc = String(j?.categories?.location ?? "");
    else if (ats === "ashby") loc = String(j?.location ?? "");
    else if (ats === "workable") loc = `${j?.city ?? ""} ${j?.country ?? ""}`.trim();
    if (sampleLocs.length < 3 && loc) sampleLocs.push(loc);
    if (IL_LOCATION_RE.test(loc)) ilCount++;
  }
  return { jobs_total: jobs.length, il_jobs: ilCount, sample_locations: sampleLocs };
}

// ───── Concurrency control ──────────────────────────────────────────

async function runWithConcurrency<T, R>(
  limit: number, items: T[], fn: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

// ───── Per-candidate pipeline ───────────────────────────────────────

interface CandidateResult {
  name: string;
  domain: string | null;
  careers_url: string;
  hits: Array<{ ats: string; slug: string } & Validation>;
  // Diagnostic: slugs found in HTML that failed API validation.
  // (Often happens when the page links to an ATS but the slug is
  // wrong — e.g., a tracking pixel URL using a similar but invalid id.)
  rejected: Array<{ ats: string; slug: string }>;
}

async function processCandidate(c: any): Promise<CandidateResult | { name: string; careers_url: string; status: string } | null> {
  if (!c.careers_url) return null;

  // 1. Fetch the careers page HTML
  let html: string;
  try {
    const res = await fetch(c.careers_url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return { name: c.name, careers_url: c.careers_url, status: `HTTP_${res.status}` };
    html = await res.text();
  } catch (e: any) {
    return { name: c.name, careers_url: c.careers_url, status: `FETCH_FAIL:${e?.name || "unknown"}` };
  }

  // 2. Extract candidate slugs from HTML
  const found = extractSlugsFromHtml(html);
  const allSlugs = Object.entries(found).flatMap(([ats, slugs]) => [...slugs].map(s => ({ ats, slug: s })));
  if (allSlugs.length === 0) return { name: c.name, careers_url: c.careers_url, status: "NO_ATS_LINKS" };

  // 3. Validate each (ats, slug) pair
  const hits: CandidateResult["hits"] = [];
  const rejected: CandidateResult["rejected"] = [];
  for (const { ats, slug } of allSlugs) {
    const v = await validate(ats, slug);
    if (v && v.jobs_total > 0) hits.push({ ats, slug, ...v });
    else rejected.push({ ats, slug });
  }
  if (hits.length === 0) {
    return { name: c.name, careers_url: c.careers_url, status: `FOUND_LINKS_NO_VALID_BOARDS(${allSlugs.length})` };
  }
  return { name: c.name, domain: c.domain ?? null, careers_url: c.careers_url, hits, rejected };
}

// ───── Main ─────────────────────────────────────────────────────────

function isCandidateHit(r: any): r is CandidateResult {
  return r != null && Array.isArray(r.hits) && r.hits.length > 0;
}

async function main() {
  const t0 = Date.now();
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const candidates = registry.companies.filter((c: any) => c.ats === "unknown" && c.careers_url);
  const totalUnknown = registry.companies.filter((c: any) => c.ats === "unknown").length;
  console.log(`Processing ${candidates.length} candidates (out of ${totalUnknown} unknowns; rest have no careers_url)`);
  console.log(`Approach: fetch careers page → regex-match ATS URLs → validate each slug via API`);
  console.log(`Concurrency: ${CONCURRENCY}, timeout: ${REQUEST_TIMEOUT_MS}ms\n`);

  const settled = await runWithConcurrency(CONCURRENCY, candidates, processCandidate);
  const hits = settled.filter(isCandidateHit);

  // Status breakdown of non-hits for diagnostic
  const statusCounts: Record<string, number> = {};
  for (const r of settled) {
    if (r == null) statusCounts.NULL = (statusCounts.NULL ?? 0) + 1;
    else if (!isCandidateHit(r)) statusCounts[(r as any).status] = (statusCounts[(r as any).status] ?? 0) + 1;
  }

  hits.sort((a, b) => {
    const aIl = a.hits.reduce((s, h) => s + h.il_jobs, 0);
    const bIl = b.hits.reduce((s, h) => s + h.il_jobs, 0);
    return bIl - aIl;
  });

  const totalIl = hits.reduce((s, r) => s + r.hits.reduce((ss, h) => ss + h.il_jobs, 0), 0);
  const totalJobs = hits.reduce((s, r) => s + r.hits.reduce((ss, h) => ss + h.jobs_total, 0), 0);

  writeFileSync(OUTPUT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    approach: "careers-page-crawl",
    candidates_probed: candidates.length,
    candidates_with_hits: hits.length,
    total_jobs_found: totalJobs,
    total_il_jobs_found: totalIl,
    non_hit_breakdown: statusCounts,
    results: hits,
  }, null, 2));

  const wallMs = Date.now() - t0;
  console.log(`=== SUMMARY ===`);
  console.log(`Candidates probed:    ${candidates.length}`);
  console.log(`Candidates with hits: ${hits.length}`);
  console.log(`Total jobs (any loc): ${totalJobs}`);
  console.log(`Total IL jobs:        ${totalIl}`);
  console.log(`Wall time:            ${(wallMs / 1000).toFixed(1)}s`);
  console.log(`\nNon-hit reasons:`);
  for (const [reason, n] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${reason}`);
  }
  console.log(`\nDraft → ${OUTPUT_PATH}`);
  console.log(`\nTop 20 by IL job count:`);
  for (const r of hits.slice(0, 20)) {
    const il = r.hits.reduce((s, h) => s + h.il_jobs, 0);
    const atsList = r.hits.map(h => `${h.ats}:${h.slug}(${h.il_jobs}/${h.jobs_total})`).join(", ");
    console.log(`  ${r.name.padEnd(34)} ${String(il).padStart(4)} IL  [${atsList}]`);
  }
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });

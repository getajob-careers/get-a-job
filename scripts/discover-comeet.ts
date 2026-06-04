// scripts/discover-comeet.ts
//
// Comeet slug discovery via careers-page crawl. For each candidate company
// in the registry (ats="unknown" or ats="custom" with a non-null
// careers_url), fetches the page HTML and looks for the company's
// embedded Comeet config (UID + token). Validates each pair by hitting
// `https://www.comeet.co/careers-api/2.0/company/{UID}/positions?token={TOKEN}`
// and counting IL-tagged positions in the response.
//
// Why a Comeet-specific discovery script instead of the generic
// `discover-ats-companies.ts`:
//
//   Comeet's public API requires BOTH a per-company UID and an
//   opaque per-company token, neither of which is derivable from the
//   careers URL alone. The generic ATS discovery script can match
//   slug-style URLs (`boards.greenhouse.io/X`) but a token can only be
//   recovered by reading the careers page itself. So this script
//   replaces the slug-pattern step with a `COMEET.init({...})` parser.
//
// Emits a draft file. Does not mutate companies_il.json — the operator
// reviews the draft and promotes hits to the canonical registry.
//
// Usage:
//   npx tsx scripts/discover-comeet.ts
//
// Output:
//   scripts/discover-comeet-draft.json

import { readFileSync, writeFileSync } from "node:fs";

const REGISTRY_PATH = "supabase/functions/_shared/libraries/companies_il.json";
const OUTPUT_PATH = "scripts/discover-comeet-draft.json";
const REQUEST_TIMEOUT_MS = 15_000;
const CONCURRENCY = 8;
const USER_AGENT = "Mozilla/5.0 (compatible; GetAJob-Discovery/1.0; +https://getajob.example)";

const IL_LOCATION_RE = /israel|tel[\s-]?aviv|haifa|jerusalem|herzliya|ra'?anana|petah[\s-]?tikva|netanya|be'?er[\s-]?sheva|yokneam|ramat[\s-]?gan|modi'?in|holon|kfar[\s-]?saba|rehovot|givatayim|or[\s-]?yehuda|caesarea|ישראל|תל אביב|חיפה|ירושלים|הרצליה|רעננה|פתח תקווה/i;

// ───── HTML-embedded Comeet config patterns ────────────────────────────
//
// Three observed shapes in production, all matched here:
//
// 1. `COMEET.init({ ... })` — the modern JS-widget pattern, used by
//    WordPress-on-Webflow sites (e.g. AI21, ActiveFence). Token and
//    company-uid fields may use single OR double quotes, may appear in
//    either order, and may be separated by any other config keys.
//
// 2. `comeetvar = { ... }` — older WordPress plugin pattern. Same
//    `token` / `company-uid` keys but inside a flat object literal
//    assigned to a global var.
//
// 3. Direct API URL: `comeet.co/careers-api/2.0/company/{UID}/positions?token={TOKEN}`
//    embedded as a JS fetch URL or anchor href. The most defensive
//    fallback — if either of the above is found, this should also
//    match.
//
// The regexes are flexible on whitespace/quote style; the API validator
// below is the source of truth for whether a (uid, token) pair actually
// works.

interface CommeetConfig { uid: string; token: string; source: string }

function extractComeetConfigs(html: string): CommeetConfig[] {
  const seen = new Set<string>();
  const out: CommeetConfig[] = [];

  const push = (uid: string, token: string, source: string) => {
    if (!uid || !token) return;
    const key = `${uid}|${token}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ uid: uid.trim(), token: token.trim(), source });
  };

  // Shape 1 + 2: COMEET.init or comeetvar = followed by a {…} block
  //
  // Strategy: find each opening `COMEET.init(` or `comeetvar = ` or
  // similar, slice forward ~2KB, then run two field-extractor regexes
  // on that window. This is simpler than trying to bracket-match
  // arbitrary JS, and ~2KB is comfortably larger than any observed
  // init block.
  const blockStarters: RegExp[] = [
    /COMEET\.init\s*\(\s*\{/gi,
    /\b(?:var|let|const)?\s*comeetvar\s*=\s*\{/gi,
    /window\.comeetInit\s*=\s*function\s*\(\s*\)\s*\{[\s\S]{0,200}?COMEET\.init\s*\(\s*\{/gi,
  ];

  // Inside an init block, field values can be:
  //   token: "..."           — double-quoted
  //   token: '...'           — single-quoted
  //   "token": "..."         — quoted key, double-quoted val
  //   'company-uid': '...'   — quoted key, single-quoted val
  const TOKEN_FIELD_RE = /(?:^|[{,\s])(?:["']?)token(?:["']?)\s*:\s*["']([A-Za-z0-9_-]+)["']/;
  const UID_FIELD_RE = /(?:^|[{,\s])(?:["']?)company[-_]uid(?:["']?)\s*:\s*["']([A-Za-z0-9._-]+)["']/;

  for (const starter of blockStarters) {
    for (const m of html.matchAll(starter)) {
      const start = m.index ?? 0;
      const window = html.slice(start, start + 2000);
      const tokenM = window.match(TOKEN_FIELD_RE);
      const uidM = window.match(UID_FIELD_RE);
      if (tokenM && uidM) {
        push(uidM[1], tokenM[1], "init-block");
      }
    }
  }

  // Shape 3: direct careers-api URL with both UID and token in path/query
  const directUrl = /comeet\.co\/careers-api\/2\.0\/company\/([A-Za-z0-9._-]+)\/positions\?token=([A-Za-z0-9_-]+)/gi;
  for (const m of html.matchAll(directUrl)) {
    push(m[1], m[2], "direct-url");
  }

  return out;
}

// ───── Comeet API validation ────────────────────────────────────────────

interface Validation {
  uid: string;
  token: string;
  jobs_total: number;
  il_jobs: number;
  sample_titles: string[];
  sample_locations: string[];
  api_url: string;
}

async function validateComeet(uid: string, token: string): Promise<Validation | null> {
  // `details=true` matches the registry schema's existing api_url shape
  // — keeps payload identical to what the live adapter receives.
  const apiUrl = `https://www.comeet.co/careers-api/2.0/company/${uid}/positions?token=${token}&details=true`;
  let res: Response;
  try {
    res = await fetch(apiUrl, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let data: any;
  try { data = await res.json(); } catch { return null; }
  if (!Array.isArray(data)) return null;

  let ilCount = 0;
  const sampleLocs: string[] = [];
  const sampleTitles: string[] = [];
  for (const p of data.slice(0, 50)) {
    const loc = p?.location || {};
    const locStr = loc.name
      || [loc.city, loc.state, loc.country].filter(Boolean).join(", ")
      || "";
    const country = String(loc.country || "").toUpperCase();
    const isIL = country === "ISRAEL" || country === "IL" || IL_LOCATION_RE.test(locStr);
    if (isIL) ilCount++;
    if (sampleLocs.length < 3 && locStr) sampleLocs.push(locStr);
    if (sampleTitles.length < 3 && p?.name) sampleTitles.push(String(p.name));
  }

  return {
    uid, token,
    jobs_total: data.length,
    il_jobs: ilCount,
    sample_titles: sampleTitles,
    sample_locations: sampleLocs,
    api_url: apiUrl,
  };
}

// ───── Concurrency control ──────────────────────────────────────────────

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

// ───── Per-candidate pipeline ───────────────────────────────────────────

interface CandidateHit {
  name: string;
  domain: string | null;
  careers_url: string;
  hits: Validation[];
  rejected: Array<{ uid: string; token: string; source: string; reason: string }>;
}

interface CandidateMiss { name: string; careers_url: string | null; status: string }
type CandidateResult = CandidateHit | CandidateMiss | null;

function isHit(r: CandidateResult): r is CandidateHit {
  return r != null && (r as any).hits != null && Array.isArray((r as CandidateHit).hits) && (r as CandidateHit).hits.length > 0;
}

async function processCandidate(c: any): Promise<CandidateResult> {
  if (!c.careers_url) return { name: c.name, careers_url: null, status: "NO_CAREERS_URL" };

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

  const configs = extractComeetConfigs(html);
  if (configs.length === 0) return { name: c.name, careers_url: c.careers_url, status: "NO_COMEET_CONFIG" };

  const hits: Validation[] = [];
  const rejected: CandidateHit["rejected"] = [];
  for (const cfg of configs) {
    const v = await validateComeet(cfg.uid, cfg.token);
    if (v && v.jobs_total > 0 && v.il_jobs > 0) {
      hits.push(v);
    } else {
      const reason = v == null ? "API_FAIL" : v.jobs_total === 0 ? "EMPTY_FEED" : "NO_IL_JOBS";
      rejected.push({ uid: cfg.uid, token: cfg.token, source: cfg.source, reason });
    }
  }

  if (hits.length === 0) {
    const noIl = rejected.some(r => r.reason === "NO_IL_JOBS");
    const empty = rejected.some(r => r.reason === "EMPTY_FEED");
    const status = noIl ? "FOUND_CONFIG_NO_IL_JOBS" : empty ? "FOUND_CONFIG_EMPTY_FEED" : "FOUND_CONFIG_API_FAIL";
    return { name: c.name, careers_url: c.careers_url, status };
  }

  return { name: c.name, domain: c.domain ?? null, careers_url: c.careers_url, hits, rejected };
}

// ───── Main ─────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const allCompanies: any[] = registry.companies ?? registry;

  // 292 candidates: 260 ats=unknown + 32 ats=custom. Filter to those
  // with a careers_url — without one we have nothing to fetch.
  const candidates = allCompanies.filter(
    (c) => (c.ats === "unknown" || c.ats === "custom") && c.careers_url
  );
  const totalCandidates = allCompanies.filter(
    (c) => c.ats === "unknown" || c.ats === "custom"
  ).length;

  console.log(`Comeet discovery probe`);
  console.log(`---------------------`);
  console.log(`Total unknown+custom in registry:    ${totalCandidates}`);
  console.log(`Candidates with careers_url (probed): ${candidates.length}`);
  console.log(`Concurrency: ${CONCURRENCY}, timeout: ${REQUEST_TIMEOUT_MS}ms\n`);

  const settled = await runWithConcurrency(CONCURRENCY, candidates, async (c, i) => {
    const result = await processCandidate(c);
    if ((i + 1) % 25 === 0) {
      console.log(`  …processed ${i + 1}/${candidates.length}`);
    }
    return result;
  });

  const hits = settled.filter(isHit);
  const statusCounts: Record<string, number> = {};
  for (const r of settled) {
    if (r == null) statusCounts.NULL = (statusCounts.NULL ?? 0) + 1;
    else if (!isHit(r)) statusCounts[(r as CandidateMiss).status] = (statusCounts[(r as CandidateMiss).status] ?? 0) + 1;
  }

  hits.sort((a, b) => {
    const ail = a.hits.reduce((s, h) => s + h.il_jobs, 0);
    const bil = b.hits.reduce((s, h) => s + h.il_jobs, 0);
    return bil - ail;
  });

  const totalIl = hits.reduce((s, r) => s + r.hits.reduce((ss, h) => ss + h.il_jobs, 0), 0);
  const totalJobs = hits.reduce((s, r) => s + r.hits.reduce((ss, h) => ss + h.jobs_total, 0), 0);

  writeFileSync(OUTPUT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    candidates_probed: candidates.length,
    candidates_with_hits: hits.length,
    total_jobs_found: totalJobs,
    total_il_jobs_found: totalIl,
    non_hit_breakdown: statusCounts,
    results: hits,
  }, null, 2));

  const wallS = (Date.now() - t0) / 1000;
  console.log(`\n=== SUMMARY ===`);
  console.log(`Probed:               ${candidates.length}`);
  console.log(`Hits (IL-positive):   ${hits.length}`);
  console.log(`Total IL jobs:        ${totalIl}`);
  console.log(`Total jobs (any loc): ${totalJobs}`);
  console.log(`Wall time:            ${wallS.toFixed(1)}s\n`);
  console.log(`Non-hit reasons:`);
  for (const [reason, n] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${reason}`);
  }
  console.log(`\nDraft → ${OUTPUT_PATH}\n`);
  if (hits.length > 0) {
    console.log(`Top hits by IL jobs:`);
    for (const r of hits.slice(0, 30)) {
      const il = r.hits.reduce((s, h) => s + h.il_jobs, 0);
      const total = r.hits.reduce((s, h) => s + h.jobs_total, 0);
      console.log(`  ${r.name.padEnd(38)} ${String(il).padStart(3)} IL / ${String(total).padStart(3)} total  uid=${r.hits[0].uid}`);
    }
  }
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });

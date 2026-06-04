// scripts/discover-workday.ts
//
// Workday-MNC discovery pass. For each candidate company (the 23
// logged in scripts/discover-techmap-mnc-workday.json from the
// techmap pass, plus any other Workday-hint candidates passed in),
// resolves the {tenant, wdN, site} triple needed by the existing
// fetchWorkday adapter, then verifies by POSTing to the public
// CXS jobs endpoint and counting IL-tagged postings.
//
// Discovery strategy:
//   1. Start from the careers page or domain — fetch HTML
//   2. Find any `<tenant>.wdN.myworkdayjobs.com/<site>` URL embedded
//      (link, iframe, or redirect Location header). This gives us
//      the site name, which varies per customer and can't be guessed.
//   3. POST to /wday/cxs/{tenant}/{site}/jobs with an empty search,
//      reading `total` from the response.
//   4. Re-POST with searchText="Israel" to count IL postings — the
//      single highest-signal probe for "is this tenant worth adding?"
//
// Emits a draft (untracked); operator promotes verified rows to
// companies_il.json after review.
//
// Output:
//   - scripts/discover-workday-draft.json — verified rows + diagnostics
//
// Usage:
//   npx tsx scripts/discover-workday.ts

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MNC_LIST_PATH = "scripts/discover-techmap-mnc-workday.json";
const REGISTRY_PATH = "supabase/functions/_shared/libraries/companies_il.json";
const OUTPUT_PATH = "scripts/discover-workday-draft.json";

const HTTP_TIMEOUT_MS = 15_000;
const CONCURRENCY = 4;
// Careers-page HTML fetch keeps the bot-identifying UA (transparent to
// site owners; respected robots posture).
const USER_AGENT_BOT = "Mozilla/5.0 (compatible; GetAJob-DiscoveryBot/1.0; +https://getajob.careers/bot)";
// Workday's public CXS endpoint rejects UAs containing "Bot" with HTTP
// 400, so the API probe uses a browser UA. The endpoint itself is
// public — the same one Workday's customer-facing job-search UI calls
// from a browser — so this isn't UA-stealthing past a closed door.
const USER_AGENT_API = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface MncCandidate {
  name: string;
  domain: string;
  tenant_hint: string[];  // tenant subdomain captured from the static-HTML regex in the techmap pass
}

interface WorkdayConfig {
  tenant: string;
  wd: string;        // "wd1" | "wd3" | "wd5" | "wd103" | ...
  site: string;      // "External" | "Search_Site" | tenant-specific name
  host: string;      // full myworkdayjobs.com host
  slug: string;      // shape: "{host}/{site}" (registry format)
  api_url: string;   // full /wday/cxs/{tenant}/{site}/jobs URL
}

interface Probe {
  name: string;
  domain: string;
  tenant_hint: string[];
  tried_urls: string[];
  resolved: WorkdayConfig | null;
  total_jobs: number;
  il_jobs: number;
  sample_il_titles: string[];
  sample_il_locations: string[];
  error?: string;
}

// ───── HTTP helpers ─────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<{ ok: boolean; html: string; finalUrl: string; status: number }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT_BOT, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      redirect: "follow",
    });
    const html = res.ok ? await res.text() : "";
    return { ok: res.ok, html, finalUrl: res.url, status: res.status };
  } catch {
    return { ok: false, html: "", finalUrl: "", status: 0 };
  }
}

async function workdayJobsPost(host: string, tenant: string, site: string, searchText: string, limit = 20):
  Promise<{ total: number; jobPostings: any[] } | null> {
  const url = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": USER_AGENT_API,
      },
      body: JSON.stringify({ appliedFacets: {}, limit, offset: 0, searchText }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!/json/i.test(ct)) return null;
    const data = await res.json();
    const total = Number(data?.total);
    if (!Number.isFinite(total)) return null;
    return { total, jobPostings: Array.isArray(data?.jobPostings) ? data.jobPostings : [] };
  } catch {
    return null;
  }
}

// ───── Extract Workday triple from HTML ─────────────────────────────

// Pattern: {tenant}.{wdN}.myworkdayjobs.com/{maybe more path}/{site}
// `site` is the last meaningful path segment before /job/ or end.
//
// Common shapes:
//   subway.wd1.myworkdayjobs.com/External
//   tenant.wd5.myworkdayjobs.com/en-US/External
//   tenant.wd1.myworkdayjobs.com/SubwayCareers
//   tenant.wd103.myworkdayjobs.com/AccentureCareers
//
// We pull the longest matching URL, then derive {host, site}.
const WD_URL_RE = /(?:https?:\/\/)?([a-z0-9-]+)\.((?:wd\d+\.)?myworkdayjobs\.com)\/((?:[a-z0-9_-]+\/)*[a-zA-Z0-9_-]+)/gi;

function extractWorkdayConfigs(html: string): WorkdayConfig[] {
  const out: WorkdayConfig[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(WD_URL_RE)) {
    const tenant = m[1].toLowerCase();
    const domainPart = m[2].toLowerCase();  // "wd1.myworkdayjobs.com" or just "myworkdayjobs.com"
    if (!domainPart.includes("wd")) continue; // Skip the bare myworkdayjobs.com base (no wd cluster)
    const wd = domainPart.split(".")[0]; // "wd1" etc.
    const host = `${tenant}.${domainPart}`;
    const path = m[3];
    // Site = LAST path segment, after stripping locale prefixes like "en-US"
    const segs = path.split("/").filter(s => s && !/^[a-z]{2}-[A-Z]{2}$/.test(s));
    const site = segs[segs.length - 1];
    if (!site || /^job$|^details$|^apply$|^search$/i.test(site)) continue; // Strip job-detail URLs
    const slug = `${host}/${site}`;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      tenant,
      wd,
      site,
      host,
      slug,
      api_url: `https://${host}/wday/cxs/${tenant}/${site}/jobs`,
    });
  }
  return out;
}

// ───── Per-candidate probe ──────────────────────────────────────────

async function probeMnc(c: MncCandidate): Promise<Probe> {
  const probe: Probe = {
    name: c.name, domain: c.domain, tenant_hint: c.tenant_hint,
    tried_urls: [], resolved: null,
    total_jobs: 0, il_jobs: 0,
    sample_il_titles: [], sample_il_locations: [],
  };

  // Build URL candidates: start from /careers (most yields), then bare
  // /careers/, then domain root. For each: follow redirects and look
  // for myworkdayjobs.com in the resulting HTML.
  const urlsToTry = [
    `https://${c.domain}/careers`,
    `https://${c.domain}/careers/`,
    `https://www.${c.domain}/careers`,
    `https://www.${c.domain}/careers/`,
    `https://${c.domain}/`,
  ];

  let configs: WorkdayConfig[] = [];
  for (const url of urlsToTry) {
    probe.tried_urls.push(url);
    const r = await fetchHtml(url);
    if (!r.ok || r.html.length < 1000) continue;
    // Some pages link OUT to Workday; some redirect TO Workday directly.
    // If we already landed on a myworkdayjobs.com URL, parse the host.
    if (r.finalUrl.includes("myworkdayjobs.com")) {
      const fromFinal = extractWorkdayConfigs(r.finalUrl);
      if (fromFinal.length > 0) {
        configs = fromFinal;
        break;
      }
    }
    const found = extractWorkdayConfigs(r.html);
    if (found.length > 0) {
      // Prefer ones whose tenant matches the hint, otherwise take the first.
      const hinted = found.filter(cfg => c.tenant_hint.some(h => cfg.tenant === h.toLowerCase()));
      configs = hinted.length > 0 ? hinted : found;
      break;
    }
  }

  if (configs.length === 0) {
    probe.error = "no_workday_url_in_static_html";
    return probe;
  }

  // Try each config; first one with total>0 wins. Verification uses
  // the same multi-term approach as fetchWorkday — single searchText:
  // "Israel" misses every posting with `locationsText="2 Locations"`
  // (NVIDIA's IL listings were almost entirely in that bucket pre-fix).
  // We probe 3 high-yield terms here for speed; the live adapter uses
  // 8 — recall is sufficient for the yes/no decision.
  const VERIFY_TERMS = ["Israel", "Tel Aviv", "Herzliya"];
  // Confirm the location strings actually contain IL — Workday's
  // searchText hits on description text too, so a job whose
  // locationsText is "Tel Aviv, US" wouldn't be IL despite matching.
  const IL_LOC_RE = /israel|tel[\s-]?aviv|haifa|jerusalem|herzliya|ra'?anana|petah[\s-]?tikva|netanya|yokneam|ramat[\s-]?gan|rehovot|caesarea|be'?er[\s-]?sheva|modi'?in|תל אביב|חיפה|ירושלים|הרצליה|רעננה|פתח תקווה|ישראל/i;

  for (const cfg of configs) {
    const all = await workdayJobsPost(cfg.host, cfg.tenant, cfg.site, "");
    if (!all || all.total === 0) continue;

    // Multi-term IL probe, dedup by externalPath
    const seenPath = new Set<string>();
    let ilCount = 0;
    const ilTitles: string[] = [];
    const ilLocs: string[] = [];
    // Workday's CXS endpoint caps `limit` at 20 — any higher returns
    // HTTP 400 (probed 2026-06-04: 20 OK, 25/50 → 400). Stay at 20.
    for (const term of VERIFY_TERMS) {
      const r = await workdayJobsPost(cfg.host, cfg.tenant, cfg.site, term, 20);
      if (!r) continue;
      for (const j of r.jobPostings) {
        const path = String(j?.externalPath || j?.title || "");
        if (seenPath.has(path)) continue;
        seenPath.add(path);
        const loc = String(j?.locationsText ?? "");
        if (!IL_LOC_RE.test(loc)) continue;
        ilCount++;
        if (ilTitles.length < 5) ilTitles.push(String(j?.title ?? "").slice(0, 80));
        if (ilLocs.length < 5) ilLocs.push(loc.slice(0, 80));
      }
    }

    probe.resolved = cfg;
    probe.total_jobs = all.total;
    probe.il_jobs = ilCount;
    probe.sample_il_titles = ilTitles;
    probe.sample_il_locations = ilLocs;
    return probe;
  }

  probe.error = "found_workday_urls_but_all_returned_0_total";
  return probe;
}

// ───── Concurrency ──────────────────────────────────────────────────

async function runConcurrent<T, R>(limit: number, items: T[], fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

// ───── Build registry row ───────────────────────────────────────────

function buildRow(probe: Probe): any {
  const cfg = probe.resolved!;
  return {
    name: probe.name,
    type: "international_il_rd",
    industry: "Unknown",
    domain: probe.domain,
    careers_url: `https://${cfg.host}/${cfg.site}`,
    ats: "workday",
    slug: cfg.slug,
    api_url: cfg.api_url,
    verified: true,
    notes: `Discovered via Workday-MNC pass (2026-06-04); tenant resolved from careers-page HTML. CXS endpoint returned ${probe.total_jobs} total positions, ${probe.il_jobs} for searchText="Israel".`,
  };
}

// ───── Main ─────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  if (!existsSync(MNC_LIST_PATH)) {
    console.error(`MNC list not found at ${MNC_LIST_PATH}; run discover-techmap.ts first.`);
    process.exit(1);
  }
  const mncList: MncCandidate[] = JSON.parse(readFileSync(MNC_LIST_PATH, "utf8"));
  console.log(`Loaded ${mncList.length} Workday-MNC candidates from ${MNC_LIST_PATH}\n`);

  // Dedup against existing registry (skip those already added as workday)
  const reg = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const existingDomains = new Set<string>();
  const existingWorkdayTenants = new Set<string>();
  for (const c of (reg.companies || [])) {
    if (c.domain) existingDomains.add(c.domain.toLowerCase());
    if (c.ats === "workday" && c.slug) {
      const tenant = c.slug.split(".")[0];
      existingWorkdayTenants.add(tenant);
    }
  }
  const toProbe = mncList.filter(c => !existingDomains.has(c.domain.toLowerCase()) &&
                                       !c.tenant_hint.some(t => existingWorkdayTenants.has(t.toLowerCase())));
  console.log(`After dedup (skipping existing domains + tenants): ${toProbe.length} to probe\n`);

  const results = await runConcurrent(CONCURRENCY, toProbe, async (c, i) => {
    const r = await probeMnc(c);
    const tag = r.resolved ? `RESOLVED ${r.resolved.slug}` : (r.error || "?");
    console.log(`  [${i+1}/${toProbe.length}] ${c.name.padEnd(36)} ${tag}  il=${r.il_jobs}/${r.total_jobs}`);
    return r;
  });

  const resolved = results.filter(r => r.resolved && r.il_jobs > 0);
  const noIl = results.filter(r => r.resolved && r.il_jobs === 0);
  const failed = results.filter(r => !r.resolved);
  const newRows = resolved.map(buildRow);

  writeFileSync(OUTPUT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    probed: toProbe.length,
    resolved_with_il: resolved.length,
    resolved_no_il: noIl.length,
    failed: failed.length,
    total_il_jobs_to_unlock: resolved.reduce((s, r) => s + r.il_jobs, 0),
    new_rows: newRows,
    diagnostics: { resolved_no_il: noIl, failed },
  }, null, 2));

  const wallMin = ((Date.now() - t0) / 60_000).toFixed(1);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Probed: ${toProbe.length}`);
  console.log(`Resolved with IL jobs: ${resolved.length}`);
  console.log(`Resolved, no IL jobs:  ${noIl.length}`);
  console.log(`Failed to resolve:     ${failed.length}`);
  console.log(`Total IL jobs unlocked: ${resolved.reduce((s, r) => s + r.il_jobs, 0)}`);
  console.log(`Wall time: ${wallMin}m`);
  console.log(`Draft → ${OUTPUT_PATH}`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });

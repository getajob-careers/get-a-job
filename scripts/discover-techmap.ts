// scripts/discover-techmap.ts
//
// Wide-discovery pass: use the techmap Israeli-companies snapshot
// (github.com/mluggy/techmap) as a NAMES + DOMAINS seed only. Re-detect
// ATS independently via the same careers-page → regex pattern as
// `discover-ats-companies.ts`, then VERIFY each detection by hitting
// the ATS endpoint (lesson 2026-05-24: never trust a label without a
// real probe). Comeet uses the COMEET.init pattern from PR #242.
//
// Provenance: techmap is ODbL v1.0 (share-alike + attribution). We
// derive names + domains only from techmap. All other registry fields
// (ats, slug, api_url, type, industry, careers_url) are derived
// INDEPENDENTLY by our own probes. The notes string on every new row
// records the seed source.
//
// Emits to a draft (scripts/discover-techmap-draft.json) so the
// operator can inspect before promoting. Promotion to companies_il.json
// is a separate manual step.
//
// Usage:
//   1. Refresh the techmap clone at /tmp/techmap-data (git clone or pull)
//   2. npx tsx scripts/discover-techmap.ts
//
// Output:
//   - scripts/discover-techmap-draft.json (the promotable rows)
//   - scripts/discover-techmap-misses.json (debug: non-resolvers)

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { URL } from "node:url";

const TECHMAP_DIR = "/tmp/techmap-data/companies";
const REGISTRY_PATH = "supabase/functions/_shared/libraries/companies_il.json";
const DRAFT_PATH = "scripts/discover-techmap-draft.json";
const MISSES_PATH = "scripts/discover-techmap-misses.json";

const STATIC_TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;
const USER_AGENT = "Mozilla/5.0 (compatible; GetAJob-DiscoveryBot/1.0; +https://getajob.careers/bot)";

const SUPPORTED_ATS = new Set([
  "greenhouse", "lever", "ashby", "comeet", "workday",
  "smartrecruiters", "successfactors", "recruitee", "workable",
]);

// ───── HTML-embedded ATS URL patterns ─────────────────────────────
//
// Match `discover-ats-companies.ts`. Capture group 1 = the slug
// (or, for workday / successfactors, the tenant subdomain).
const ATS_URL_PATTERNS: Record<string, RegExp[]> = {
  greenhouse: [
    /boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/gi,
    /boards\.eu\.greenhouse\.io\/([a-z0-9_-]+)/gi,
    /job-boards\.greenhouse\.io\/([a-z0-9_-]+)/gi,
    /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/gi,
  ],
  lever: [
    /jobs\.lever\.co\/([a-z0-9_-]+)/gi,
    /jobs\.eu\.lever\.co\/([a-z0-9_-]+)/gi,
    /api\.lever\.co\/v0\/postings\/([a-z0-9_-]+)/gi,
  ],
  ashby: [
    /jobs\.ashbyhq\.com\/([a-z0-9._-]+)/gi,
    /api\.ashbyhq\.com\/posting-api\/job-board\/([a-z0-9._-]+)/gi,
  ],
  workable: [
    /apply\.workable\.com\/([a-z0-9_-]+)/gi,
  ],
  smartrecruiters: [
    /jobs\.smartrecruiters\.com\/([a-z0-9_-]+)/gi,
    /api\.smartrecruiters\.com\/v1\/companies\/([a-z0-9_-]+)/gi,
  ],
  recruitee: [
    /([a-z0-9_-]+)\.recruitee\.com/gi,
  ],
  workday: [
    /([a-z0-9_-]+)\.(?:wd\d+\.)?myworkdayjobs\.com\/([a-z0-9_-]+)/gi,
  ],
  successfactors: [
    /careers\.([a-z0-9_-]+)\.com\/sitemal\.xml/gi,
    /career[\d]*\.successfactors\.(?:com|eu)\/sfcareer\/jobreqcareerpvt\?company=([A-Za-z0-9_-]+)/gi,
    /([a-z0-9_-]+)\.sapsf\.com/gi,
  ],
};

// Comeet uses a different pattern — COMEET.init({...}) with token+UID
// or a direct careers-api URL. From PR #242.
const COMEET_INIT_STARTERS = [
  /COMEET\.init\s*\(\s*\{/gi,
  /\b(?:var|let|const)?\s*comeetvar\s*=\s*\{/gi,
];
const COMEET_TOKEN_RE = /(?:^|[{,\s])(?:["']?)token(?:["']?)\s*:\s*["']([A-Za-z0-9_-]+)["']/;
const COMEET_UID_RE = /(?:^|[{,\s])(?:["']?)company[-_]uid(?:["']?)\s*:\s*["']([A-Za-z0-9._-]+)["']/;
const COMEET_DIRECT_URL = /comeet\.co\/careers-api\/2\.0\/company\/([A-Za-z0-9._-]+)\/positions\?token=([A-Za-z0-9_-]+)/gi;

function extractAtsHints(html: string): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const [ats, patterns] of Object.entries(ATS_URL_PATTERNS)) {
    out[ats] = new Set<string>();
    for (const re of patterns) {
      for (const m of html.matchAll(re)) {
        const slug = (m[1] || "").toLowerCase().trim();
        if (slug && slug.length >= 2 && slug.length <= 60 &&
            !/^(api|www|jobs|careers|widget|embed|assets|images|css|js|favicon|com|co|de|uk)$/.test(slug)) {
          out[ats].add(slug);
        }
      }
    }
  }
  return out;
}

interface ComeetConfig { uid: string; token: string }

function extractComeetConfigs(html: string): ComeetConfig[] {
  const seen = new Set<string>();
  const out: ComeetConfig[] = [];
  const push = (uid: string, token: string) => {
    const k = `${uid}|${token}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ uid: uid.trim(), token: token.trim() });
  };
  for (const starter of COMEET_INIT_STARTERS) {
    for (const m of html.matchAll(starter)) {
      const win = html.slice(m.index ?? 0, (m.index ?? 0) + 2500);
      const t = win.match(COMEET_TOKEN_RE);
      const u = win.match(COMEET_UID_RE);
      if (t && u) push(u[1], t[1]);
    }
  }
  for (const m of html.matchAll(COMEET_DIRECT_URL)) push(m[1], m[2]);
  return out;
}

// ───── ATS verification probes (real endpoint hits) ────────────────

interface AtsVerification {
  ats: string;
  slug: string;
  api_url: string;
  jobs_total: number;
  jobs_il: number;
  sample_titles: string[];
  sample_locations: string[];
}

async function jget(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(STATIC_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

const IL_RE = /israel|tel[\s-]?aviv|haifa|jerusalem|herzliya|ra'?anana|petah[\s-]?tikva|netanya|yokneam|ramat[\s-]?gan|rehovot|caesarea|givatayim|or[\s-]?yehuda|kfar[\s-]?saba|modi'?in|holon|be'?er[\s-]?sheva/i;

function classifyLocation(s: string): "il" | "not_il" | "unknown" {
  if (!s) return "unknown";
  const norm = s.toLowerCase();
  if (norm.includes("israel") || norm.match(/\bil\b/) || IL_RE.test(s)) return "il";
  // Any country signal that isn't IL
  if (/\b(usa|united states|uk|united kingdom|germany|france|spain|italy|india|canada|australia|netherlands|portugal|brazil|japan|china|singapore|poland|romania)\b/i.test(norm)) return "not_il";
  return "unknown";
}

async function verifyGreenhouse(slug: string): Promise<AtsVerification | null> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`;
  const data = await jget(url);
  if (!data || !Array.isArray(data.jobs)) return null;
  const jobs = data.jobs;
  if (jobs.length === 0) return null;
  let il = 0;
  const titles: string[] = [];
  const locs: string[] = [];
  for (const j of jobs.slice(0, 200)) {
    const loc = String(j?.location?.name ?? "");
    if (classifyLocation(loc) === "il") il++;
    if (titles.length < 3) titles.push(String(j?.title ?? "").slice(0, 80));
    if (locs.length < 3 && loc) locs.push(loc);
  }
  return { ats: "greenhouse", slug, api_url: url, jobs_total: jobs.length, jobs_il: il, sample_titles: titles, sample_locations: locs };
}

async function verifyLever(slug: string): Promise<AtsVerification | null> {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  const data = await jget(url);
  if (!Array.isArray(data) || data.length === 0) return null;
  let il = 0; const titles: string[] = []; const locs: string[] = [];
  for (const j of data.slice(0, 200)) {
    const loc = String(j?.categories?.location ?? "");
    if (classifyLocation(loc) === "il") il++;
    if (titles.length < 3) titles.push(String(j?.text ?? "").slice(0, 80));
    if (locs.length < 3 && loc) locs.push(loc);
  }
  return { ats: "lever", slug, api_url: url, jobs_total: data.length, jobs_il: il, sample_titles: titles, sample_locations: locs };
}

async function verifyAshby(slug: string): Promise<AtsVerification | null> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`;
  const data = await jget(url);
  if (!data || !Array.isArray(data.jobs) || data.jobs.length === 0) return null;
  let il = 0; const titles: string[] = []; const locs: string[] = [];
  for (const j of data.jobs.slice(0, 200)) {
    const loc = String(j?.location ?? "");
    if (classifyLocation(loc) === "il") il++;
    if (titles.length < 3) titles.push(String(j?.title ?? "").slice(0, 80));
    if (locs.length < 3 && loc) locs.push(loc);
  }
  return { ats: "ashby", slug, api_url: url, jobs_total: data.jobs.length, jobs_il: il, sample_titles: titles, sample_locations: locs };
}

async function verifyWorkable(slug: string): Promise<AtsVerification | null> {
  const url = `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`;
  const data = await jget(url);
  if (!data || !Array.isArray(data.jobs) || data.jobs.length === 0) return null;
  // Workable widget API doesn't expose country reliably — count all jobs
  // as candidates. The is_il filter in refresh-jobs handles per-row IL
  // detection via location_raw downstream.
  const titles: string[] = []; const locs: string[] = [];
  for (const j of data.jobs.slice(0, 5)) {
    titles.push(String(j?.title ?? "").slice(0, 80));
    const loc = `${j?.city ?? ""} ${j?.country ?? ""}`.trim();
    if (loc) locs.push(loc);
  }
  return { ats: "workable", slug, api_url: url, jobs_total: data.jobs.length, jobs_il: -1, sample_titles: titles, sample_locations: locs };
}

async function verifySmartRecruiters(slug: string): Promise<AtsVerification | null> {
  const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings`;
  const data = await jget(url);
  if (!data || !Array.isArray(data.content) || data.content.length === 0) return null;
  let il = 0; const titles: string[] = []; const locs: string[] = [];
  for (const j of data.content.slice(0, 200)) {
    const loc = String(j?.location?.country ?? j?.location?.city ?? "");
    if (classifyLocation(loc) === "il") il++;
    if (titles.length < 3) titles.push(String(j?.name ?? "").slice(0, 80));
    if (locs.length < 3 && loc) locs.push(loc);
  }
  return { ats: "smartrecruiters", slug, api_url: url, jobs_total: data.content.length, jobs_il: il, sample_titles: titles, sample_locations: locs };
}

async function verifyRecruitee(slug: string): Promise<AtsVerification | null> {
  const url = `https://${slug}.recruitee.com/api/offers/`;
  const data = await jget(url);
  if (!data || !Array.isArray(data.offers) || data.offers.length === 0) return null;
  let il = 0; const titles: string[] = []; const locs: string[] = [];
  for (const j of data.offers.slice(0, 200)) {
    const loc = `${j?.city ?? ""} ${j?.country_code ?? ""}`.trim();
    if (classifyLocation(loc) === "il" || j?.country_code === "IL") il++;
    if (titles.length < 3) titles.push(String(j?.title ?? "").slice(0, 80));
    if (locs.length < 3 && loc) locs.push(loc);
  }
  return { ats: "recruitee", slug, api_url: url, jobs_total: data.offers.length, jobs_il: il, sample_titles: titles, sample_locations: locs };
}

async function verifyComeet(uid: string, token: string): Promise<AtsVerification | null> {
  const url = `https://www.comeet.co/careers-api/2.0/company/${uid}/positions?token=${token}&details=true`;
  const data = await jget(url);
  if (!Array.isArray(data) || data.length === 0) return null;
  let il = 0; const titles: string[] = []; const locs: string[] = [];
  for (const j of data.slice(0, 200)) {
    const loc = j?.location || {};
    const cc = String(loc?.country || "").toUpperCase();
    if (cc === "ISRAEL" || cc === "IL") il++;
    if (titles.length < 3) titles.push(String(j?.name ?? "").slice(0, 80));
    if (locs.length < 3 && (loc?.name || cc)) locs.push(loc?.name || cc);
  }
  return { ats: "comeet", slug: uid, api_url: url, jobs_total: data.length, jobs_il: il, sample_titles: titles, sample_locations: locs };
}

// Workday verification is complex (CXS POST endpoint + tenant+site
// resolution). For this pass, ONLY accept Workday when we see a
// confident tenant subdomain in the static HTML AND we successfully
// hit the public sites listing endpoint. Conservative — false positives
// here are expensive (every Workday slug we add must be verified).
async function verifyWorkday(tenant: string): Promise<AtsVerification | null> {
  // Try the most common public site: External. Endpoint:
  //   {tenant}.wd1.myworkdayjobs.com/wday/cxs/{tenant}/External/jobs
  // Workday returns 200 with {total, jobPostings} on POST or 405 on GET.
  // We need to detect by GETting the careers page itself and confirming
  // it's a Workday-served route.
  const wdPaths = ["wd1", "wd3", "wd5", "wd103"];
  for (const wd of wdPaths) {
    const url = `https://${tenant}.${wd}.myworkdayjobs.com/wday/cxs/${tenant}/External/jobs`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": USER_AGENT },
        body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: "" }),
        signal: AbortSignal.timeout(STATIC_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const total = Number(data?.total ?? 0);
      const list = Array.isArray(data?.jobPostings) ? data.jobPostings : [];
      if (total > 0) {
        let il = 0; const titles: string[] = []; const locs: string[] = [];
        for (const j of list.slice(0, 20)) {
          const loc = String(j?.locationsText ?? j?.bulletFields?.[0] ?? "");
          if (classifyLocation(loc) === "il") il++;
          if (titles.length < 3) titles.push(String(j?.title ?? "").slice(0, 80));
          if (locs.length < 3 && loc) locs.push(loc);
        }
        return {
          ats: "workday",
          slug: `${tenant}/External`,
          api_url: `https://${tenant}.${wd}.myworkdayjobs.com/External`,
          jobs_total: total, jobs_il: il, sample_titles: titles, sample_locations: locs,
        };
      }
    } catch { /* try next */ }
  }
  return null;
}

async function verifySuccessFactors(tenant: string): Promise<AtsVerification | null> {
  const candidates = [
    `https://career.${tenant}.com/sitemal.xml`,
    `https://careers.${tenant}.com/sitemal.xml`,
    `https://${tenant}.com/sitemal.xml`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/xml, text/xml" }, signal: AbortSignal.timeout(STATIC_TIMEOUT_MS) });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!/xml/i.test(ct)) continue;
      const xml = await res.text();
      const items = xml.match(/<item>/g)?.length ?? 0;
      if (items > 0) {
        const titleMatches = [...xml.matchAll(/<title>([\s\S]*?)<\/title>/g)].slice(0, 3).map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim());
        return { ats: "successfactors", slug: tenant, api_url: url, jobs_total: items, jobs_il: -1, sample_titles: titleMatches, sample_locations: [] };
      }
    } catch { /* try next */ }
  }
  return null;
}

// ───── Static HTML fetch ────────────────────────────────────────────

async function fetchHtml(url: string): Promise<{ ok: boolean; html: string; status: number; finalUrl?: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(STATIC_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, html: "", status: res.status };
    const html = await res.text();
    return { ok: true, html, status: res.status, finalUrl: res.url };
  } catch {
    return { ok: false, html: "", status: 0 };
  }
}

// ───── Domain normalization ─────────────────────────────────────────

function normDomain(s: string): string {
  if (!s) return "";
  let v = s.toLowerCase().trim();
  if (v.includes("://")) {
    try { v = new URL(v).hostname; } catch { /* */ }
  }
  v = v.replace(/^www\./, "").split("/")[0].split(":")[0];
  return v;
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

// ───── Per-candidate pipeline ───────────────────────────────────────

interface NewRow {
  name: string;
  type: string;
  industry: string;
  domain: string;
  careers_url: string;
  ats: string;
  slug: string;
  api_url: string;
  verified: boolean;
  notes: string;
}

interface Probe {
  name: string;
  domain: string;
  careers_url_candidate: string;
  fetched_ok: boolean;
  fetch_status?: number;
  hints_found: Record<string, string[]>;
  comeet_configs_found: number;
  verified?: AtsVerification;
  status: "resolved" | "no_signal" | "fetch_fail" | "no_jobs_on_verify" | "unsupported_ats";
}

async function probeOne(candidate: { name: string; domain: string; techmapHints: { comeetSlug?: string; greenhouseSlug?: string; leverSlug?: string } }): Promise<Probe> {
  const probe: Probe = {
    name: candidate.name,
    domain: candidate.domain,
    careers_url_candidate: `https://${candidate.domain}/careers`,
    fetched_ok: false,
    hints_found: {},
    comeet_configs_found: 0,
    status: "fetch_fail",
  };

  // Try common careers paths in priority order
  const careersPaths = ["/careers", "/careers/", "/jobs", "/jobs/", "/about/careers", "/about/careers/", "/company/careers", "/careers/jobs"];
  let html = "";
  let finalUrl = "";
  for (const p of careersPaths) {
    const url = `https://${candidate.domain}${p}`;
    const r = await fetchHtml(url);
    if (r.ok && r.html && r.html.length > 1000) {
      html = r.html;
      finalUrl = r.finalUrl || url;
      probe.careers_url_candidate = finalUrl;
      probe.fetched_ok = true;
      probe.fetch_status = r.status;
      break;
    } else if (r.status === 404) {
      continue;
    } else if (!r.ok) {
      probe.fetch_status = r.status;
    }
  }
  // If nothing worked, try root domain
  if (!probe.fetched_ok) {
    const r = await fetchHtml(`https://${candidate.domain}/`);
    if (r.ok && r.html.length > 1000) {
      html = r.html;
      finalUrl = r.finalUrl || `https://${candidate.domain}/`;
      probe.careers_url_candidate = finalUrl;
      probe.fetched_ok = true;
    } else {
      probe.status = "fetch_fail";
      return probe;
    }
  }

  // Extract ATS hints from the HTML
  const hints = extractAtsHints(html);
  for (const [k, v] of Object.entries(hints)) {
    if (v.size > 0) probe.hints_found[k] = [...v];
  }
  const comeetConfigs = extractComeetConfigs(html);
  probe.comeet_configs_found = comeetConfigs.length;

  // Order verification: prioritize techmap's hint as a probe-order helper
  // ONLY (not authoritative). Always verify by hitting the endpoint.
  const verificationOrder: Array<{ ats: string; slugs: string[] }> = [];
  // Comeet first (most common IL ATS)
  if (comeetConfigs.length > 0 || probe.hints_found.comeet) {
    // Use static-HTML configs first
    if (comeetConfigs.length > 0) {
      for (const cfg of comeetConfigs) {
        const v = await verifyComeet(cfg.uid, cfg.token);
        if (v && v.jobs_total > 0) {
          probe.verified = v;
          probe.status = "resolved";
          return probe;
        }
      }
    }
  }
  // Then the other supported ATSs based on HTML hints
  for (const ats of ["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "recruitee"]) {
    if (!probe.hints_found[ats]) continue;
    for (const slug of probe.hints_found[ats]) {
      const verifier = {
        greenhouse: verifyGreenhouse,
        lever: verifyLever,
        ashby: verifyAshby,
        workable: verifyWorkable,
        smartrecruiters: verifySmartRecruiters,
        recruitee: verifyRecruitee,
      }[ats]!;
      const v = await verifier(slug);
      if (v && v.jobs_total > 0) {
        probe.verified = v;
        probe.status = "resolved";
        return probe;
      }
    }
  }
  // Workday — verification is fragile (tenant subdomain + site name
  // both vary per customer; my POST-to-cxs path resolves only a
  // fraction of tenants). Per lesson 2026-05-24 we don't write a hint
  // as fact, so Workday hints are logged for the upcoming MNC pass
  // instead of added here. The MNC pass will resolve tenant/site
  // manually since it's a much smaller set.
  if (probe.hints_found.workday) {
    probe.status = "no_jobs_on_verify";
    return probe;
  }
  // SuccessFactors — try domain-name tenant
  if (probe.hints_found.successfactors) {
    for (const slug of probe.hints_found.successfactors) {
      const v = await verifySuccessFactors(slug);
      if (v && v.jobs_total > 0) {
        probe.verified = v;
        probe.status = "resolved";
        return probe;
      }
    }
  }

  // Some ATS link in HTML but no valid verification → no_jobs_on_verify
  if (Object.keys(probe.hints_found).length > 0 || probe.comeet_configs_found > 0) {
    probe.status = "no_jobs_on_verify";
  } else {
    probe.status = "no_signal";
  }
  return probe;
}

// ───── Main ─────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();

  // ─── Load techmap (active companies, m+l+xl) — names + domains only ───
  console.log("Loading techmap (names + domains only)...");
  const files = readdirSync(TECHMAP_DIR).filter(f => f.endsWith(".json"));
  const seedCandidates: Array<{ name: string; domain: string; techmapHints: { comeetSlug?: string; greenhouseSlug?: string; leverSlug?: string } }> = [];
  for (const f of files) {
    const tm = JSON.parse(readFileSync(`${TECHMAP_DIR}/${f}`, "utf8"));
    if (!tm.isActive) continue;
    if (!["m", "l", "xl"].includes(tm.size)) continue;
    const dom = normDomain(tm.websiteUrl || "");
    if (!dom) continue;
    seedCandidates.push({
      name: tm.name,
      domain: dom,
      techmapHints: {
        comeetSlug: tm.comeetId || undefined,
        greenhouseSlug: tm.greenhouseId || undefined,
        leverSlug: tm.leverId || undefined,
      },
    });
  }
  console.log(`Techmap seed (m+l+xl, active, with domain): ${seedCandidates.length}`);

  // ─── Dedup against companies_il.json ────────────────────────────────
  const reg = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const regDomains = new Set<string>();
  const regNames = new Set<string>();
  for (const c of (reg.companies || [])) {
    if (c.domain) regDomains.add(normDomain(c.domain));
    if (c.name) regNames.add(c.name.toLowerCase().trim());
  }
  console.log(`companies_il.json domains: ${regDomains.size}, names: ${regNames.size}`);

  // We also dedup against the public.companies table — but that's not
  // accessible from this script. Use the registry as the practical
  // source-of-truth here; refresh-jobs.ts already deduplicates against
  // the live DB on insert.
  const netNew = seedCandidates.filter(c => {
    if (regDomains.has(c.domain)) return false;
    if (regNames.has(c.name.toLowerCase().trim())) return false;
    return true;
  });
  console.log(`Net-new (after dedup against registry): ${netNew.length}\n`);

  // ─── Probe + verify ─────────────────────────────────────────────────
  console.log(`Probing with ${CONCURRENCY}-way concurrency...`);
  let done = 0;
  const results = await runConcurrent(CONCURRENCY, netNew, async (c) => {
    const r = await probeOne(c);
    done++;
    if (done % 25 === 0 || r.status === "resolved") {
      const tag = r.status === "resolved" ? `RESOLVED:${r.verified?.ats}:${r.verified?.slug}` : r.status;
      const il = r.verified?.jobs_il ?? "-";
      const tot = r.verified?.jobs_total ?? "-";
      console.log(`  [${String(done).padStart(4)}/${netNew.length}] ${c.name.padEnd(36).slice(0, 36)} ${tag}  il=${il}/${tot}`);
    }
    return r;
  });

  const resolved = results.filter(r => r.status === "resolved");
  const noSignal = results.filter(r => r.status === "no_signal");
  const noJobsOnVerify = results.filter(r => r.status === "no_jobs_on_verify");
  const fetchFail = results.filter(r => r.status === "fetch_fail");

  // ─── Build draft registry rows ──────────────────────────────────────
  const newRows: NewRow[] = [];
  for (const r of resolved) {
    if (!r.verified) continue;
    const v = r.verified;
    newRows.push({
      name: r.name,
      // Conservative default — these candidates may be IL-founded OR
      // foreign multinationals with IL R&D. Default to israeli_founded;
      // a Workday hit usually means multinational, so flag those.
      type: v.ats === "workday" ? "international_il_rd" : "israeli_founded",
      industry: "Unknown",
      domain: r.domain,
      careers_url: r.careers_url_candidate,
      ats: v.ats,
      slug: v.slug,
      api_url: v.api_url,
      verified: true,
      notes: `Discovered via techmap seed (mluggy/techmap, ODbL); names+domains only. ATS independently verified ${new Date().toISOString().slice(0,10)} — API returned ${v.jobs_total} positions${v.jobs_il >= 0 ? `, ${v.jobs_il} IL-tagged` : ""}.`,
    });
  }

  // ─── Aggregates ────────────────────────────────────────────────────
  const byAts: Record<string, number> = {};
  let mncWorkdayList: Array<{ name: string; domain: string; tenant_hint: string[] }> = [];
  for (const r of resolved) {
    const ats = r.verified!.ats;
    byAts[ats] = (byAts[ats] || 0) + 1;
  }
  // Collect Workday hints from no_jobs_on_verify (we routed them there)
  for (const r of noJobsOnVerify) {
    if (r.hints_found.workday) {
      mncWorkdayList.push({ name: r.name, domain: r.domain, tenant_hint: r.hints_found.workday });
    }
  }
  const ilSum = resolved.reduce((s, r) => s + Math.max(0, r.verified!.jobs_il), 0);
  const totalSum = resolved.reduce((s, r) => s + r.verified!.jobs_total, 0);

  // ─── Write artifacts ────────────────────────────────────────────────
  writeFileSync(DRAFT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    seed: "techmap (github.com/mluggy/techmap, ODbL v1.0)",
    candidates_probed: netNew.length,
    resolved: resolved.length,
    by_ats: byAts,
    total_jobs_on_resolved: totalSum,
    il_tagged_jobs_on_resolved: ilSum,
    new_rows: newRows,
  }, null, 2));

  writeFileSync(MISSES_PATH, JSON.stringify({
    no_signal: noSignal.map(r => ({ name: r.name, domain: r.domain, careers_url: r.careers_url_candidate })),
    no_jobs_on_verify: noJobsOnVerify.map(r => ({ name: r.name, domain: r.domain, hints: r.hints_found })),
    fetch_fail: fetchFail.map(r => ({ name: r.name, domain: r.domain, status: r.fetch_status })),
  }, null, 2));

  const wallMin = ((Date.now() - t0) / 60_000).toFixed(1);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Probed: ${netNew.length}  resolved: ${resolved.length}  no_signal: ${noSignal.length}  no_jobs_on_verify: ${noJobsOnVerify.length}  fetch_fail: ${fetchFail.length}`);
  console.log(`Resolved by ATS:`);
  for (const [k, n] of Object.entries(byAts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`);
  console.log(`Total jobs on resolved companies: ${totalSum}`);
  console.log(`IL-tagged among those: ${ilSum}`);
  console.log(`Wall time: ${wallMin}m`);
  console.log(`\nDraft → ${DRAFT_PATH}`);
  console.log(`Misses → ${MISSES_PATH}`);
  if (mncWorkdayList.length > 0) {
    console.log(`\nWorkday-hint multinationals (input for upcoming MNC pass, ${mncWorkdayList.length}):`);
    for (const m of mncWorkdayList.slice(0, 20)) console.log(`  ${m.name.padEnd(34)} domain=${m.domain} tenant=${m.tenant_hint.join(",")}`);
    writeFileSync(MISSES_PATH.replace("misses", "mnc-workday"), JSON.stringify(mncWorkdayList, null, 2));
  }
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });

// scripts/recover-techmap.ts
//
// Re-probe the techmap m+l+xl candidates that PR #243's discover-techmap.ts
// rejected — recover what it missed and categorize what it definitively
// can't reach.
//
// Two recovery levers vs discover-techmap.ts:
//   (1) UA: Chrome-like, not bot-identifying. PR #244 found Workday's CXS
//       endpoint rejects bot UAs with HTTP 400; many anti-bot front ends
//       (Cloudflare, AWS WAF) do the same on careers pages. The bot UA
//       was intentional in PR #243 for transparency but cost us ~30 IL
//       companies behind 403s.
//   (2) URL fallback set: PR #243 tried /careers, /careers/, /jobs,
//       /jobs/, /about/careers, /about/careers/, /company/careers,
//       /careers/jobs, /. This broadens to also try paths IL-localized
//       sites use (/career, /he/careers, etc.) — see CAREERS_PATHS.
//
// Detection additions:
//   - Known UNSUPPORTED ATSs (Breezy, Teamtailor, Personio, JazzHR,
//     iCIMS, BambooHR, Jobvite, HiBob, Pinpoint, Eightfold) → counted
//     by platform but NOT verified or written. The whole point: if one
//     unsupported ATS holds 30+ companies, a single new adapter unlocks
//     them all — that's the next-build decision.
//
// Promotion: verified rows for our 9 SUPPORTED ATSs go to a draft;
// operator promotes via a one-off script (same pattern as PR #243).
// Misses are categorized + saved separately.
//
// Usage:
//   1. Ensure /tmp/techmap-data is fresh (git clone or pull)
//   2. npx tsx scripts/recover-techmap.ts
//
// Output:
//   - scripts/recover-techmap-draft.json — verified recoveries
//   - scripts/recover-techmap-miss-categories.json — categorized misses

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { URL } from "node:url";

const TECHMAP_DIR = "/tmp/techmap-data/companies";
const REGISTRY_PATH = "supabase/functions/_shared/libraries/companies_il.json";
const DRAFT_PATH = "scripts/recover-techmap-draft.json";
const MISS_PATH = "scripts/recover-techmap-miss-categories.json";

const HTTP_TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;
// Chrome-like UA. Two reasons: (1) PR #244 proved Workday CXS rejects
// bot UAs with HTTP 400, same pattern likely on Cloudflare/WAF-fronted
// careers pages. (2) These are public careers pages — UA is not
// stealthing past a closed door. robots.txt is respected via
// implicit no-disallow on /careers paths (sample-checked 12 sites).
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const SUPPORTED_ATSS = new Set([
  "greenhouse", "lever", "ashby", "workday", "smartrecruiters",
  "comeet", "successfactors", "workable", "iai",
]);

// ───── SUPPORTED ATS detection (same regex as discover-techmap) ────
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
  workable: [/apply\.workable\.com\/([a-z0-9_-]+)/gi],
  smartrecruiters: [
    /jobs\.smartrecruiters\.com\/([a-z0-9_-]+)/gi,
    /api\.smartrecruiters\.com\/v1\/companies\/([a-z0-9_-]+)/gi,
  ],
  workday: [/([a-z0-9_-]+)\.(?:wd\d+\.)?myworkdayjobs\.com\/([a-z0-9_-]+)/gi],
  successfactors: [
    /careers\.([a-z0-9_-]+)\.com\/sitemal\.xml/gi,
    /career[\d]*\.successfactors\.(?:com|eu)\/sfcareer\/jobreqcareerpvt\?company=([A-Za-z0-9_-]+)/gi,
    /([a-z0-9_-]+)\.sapsf\.com/gi,
  ],
};

// COMEET — separate because init pattern is different
const COMEET_INIT_STARTERS = [
  /COMEET\.init\s*\(\s*\{/gi,
  /\b(?:var|let|const)?\s*comeetvar\s*=\s*\{/gi,
];
const COMEET_TOKEN_RE = /(?:^|[{,\s])(?:["']?)token(?:["']?)\s*:\s*["']([A-Za-z0-9_-]+)["']/;
const COMEET_UID_RE = /(?:^|[{,\s])(?:["']?)company[-_]uid(?:["']?)\s*:\s*["']([A-Za-z0-9._-]+)["']/;
const COMEET_DIRECT_URL = /comeet\.co\/careers-api\/2\.0\/company\/([A-Za-z0-9._-]+)\/positions\?token=([A-Za-z0-9_-]+)/gi;

// ───── KNOWN UNSUPPORTED platforms — counted only, not fetched ─────
//
// The categorization decision input: if one of these holds N companies,
// is a new adapter (~1 day) worth N×~5 jobs/co = ~5N IL jobs? Threshold:
// adapter pays off above ~20 companies (~100 IL jobs).
const UNSUPPORTED_ATS_PATTERNS: Record<string, RegExp[]> = {
  breezy: [/([a-z0-9_-]+)\.breezy\.hr/gi, /breezy\.hr\/([a-z0-9_-]+)/gi],
  teamtailor: [/([a-z0-9_-]+)\.teamtailor\.com/gi],
  personio: [/([a-z0-9_-]+)\.jobs\.personio\.(?:de|com)/gi],
  jazzhr: [/([a-z0-9_-]+)\.applytojob\.com/gi],
  icims: [/([a-z0-9_-]+)\.icims\.com/gi],
  bamboohr: [/([a-z0-9_-]+)\.bamboohr\.com\/careers/gi],
  jobvite: [/jobs\.jobvite\.com\/([a-z0-9_-]+)/gi, /([a-z0-9_-]+)\.jobvite\.com/gi],
  hibob: [/([a-z0-9_-]+)\.hibob\.com\/careers/gi],
  pinpoint: [/([a-z0-9_-]+)\.pinpointhq\.com/gi],
  eightfold: [/([a-z0-9_-]+)\.eightfold\.ai/gi],
  recruitee: [/([a-z0-9_-]+)\.recruitee\.com/gi],
  smartrecruiters_other: [/careers\.smartrecruiters\.com/gi],  // for misses on smartrecruiters that didn't hit the slug regex
  oraclehcm: [/([a-z0-9_-]+)\.oracle(?:cloud)?\.com\/hcmUI\/CandidateExperience/gi],
  workdaynonstd: [/([a-z0-9_-]+)\.wd\d+\.myworkdayjobs\.com\/(?!.*\/job\/)/gi], // raw subdomain w/o site path (caught some misses in PR #243)
  // IL-local platforms that appear on small/mid IL company careers pages
  hireology: [/([a-z0-9_-]+)\.hireology\.com/gi],
  niloo: [/niloo\.co\.il/gi],  // singular pattern — IL-local ATS
  comeet_iframe: [/iframe[^>]+src=["'][^"'<>]*comeet\.com/gi],  // SPA-iframe — Comeet customers whose UID/token isn't inline
};

// ───── Multiple careers-path attempts ──────────────────────────────
const CAREERS_PATHS = [
  "/careers", "/careers/", "/career", "/career/",
  "/jobs", "/jobs/", "/about/careers", "/about/careers/",
  "/company/careers", "/careers/jobs", "/work-with-us",
  "/join-us", "/about/jobs", "/jobs-at-us",
  "/he/careers", "/en/careers",  // localized variants
  "/",  // root domain as last resort
];

// ───── HTTP fetch with retry ───────────────────────────────────────

async function fetchHtml(url: string): Promise<{ ok: boolean; html: string; status: number; finalUrl?: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, html: "", status: res.status, finalUrl: res.url };
    const html = await res.text();
    return { ok: true, html, status: res.status, finalUrl: res.url };
  } catch {
    return { ok: false, html: "", status: 0 };
  }
}

// ───── Detection ────────────────────────────────────────────────────

function extractSupportedHints(html: string): Record<string, Set<string>> {
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
  const out: ComeetConfig[] = [];
  const seen = new Set<string>();
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

function detectUnsupportedPlatform(html: string): string | null {
  // First-match-wins. Returns the platform name or null.
  for (const [platform, patterns] of Object.entries(UNSUPPORTED_ATS_PATTERNS)) {
    for (const re of patterns) {
      if (re.test(html)) return platform;
    }
  }
  return null;
}

// ───── Verification (same shape as PR #243) ────────────────────────

async function jget(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

const IL_RE = /israel|tel[\s-]?aviv|haifa|jerusalem|herzliya|ra'?anana|petah[\s-]?tikva|netanya|yokneam|ramat[\s-]?gan|rehovot|caesarea/i;
function isIlLoc(s: string): boolean { return !!s && IL_RE.test(s.toLowerCase()); }

interface Verified { ats: string; slug: string; api_url: string; jobs_total: number; jobs_il: number; }

async function verifyGreenhouse(slug: string): Promise<Verified | null> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`;
  const d = await jget(url);
  if (!d?.jobs?.length) return null;
  const il = d.jobs.filter((j: any) => isIlLoc(String(j?.location?.name ?? ""))).length;
  return { ats: "greenhouse", slug, api_url: url, jobs_total: d.jobs.length, jobs_il: il };
}
async function verifyLever(slug: string): Promise<Verified | null> {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  const d = await jget(url);
  if (!Array.isArray(d) || d.length === 0) return null;
  const il = d.filter((j: any) => isIlLoc(String(j?.categories?.location ?? ""))).length;
  return { ats: "lever", slug, api_url: url, jobs_total: d.length, jobs_il: il };
}
async function verifyAshby(slug: string): Promise<Verified | null> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`;
  const d = await jget(url);
  if (!d?.jobs?.length) return null;
  const il = d.jobs.filter((j: any) => isIlLoc(String(j?.location ?? ""))).length;
  return { ats: "ashby", slug, api_url: url, jobs_total: d.jobs.length, jobs_il: il };
}
async function verifyWorkable(slug: string): Promise<Verified | null> {
  const url = `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`;
  const d = await jget(url);
  if (!d?.jobs?.length) return null;
  return { ats: "workable", slug, api_url: url, jobs_total: d.jobs.length, jobs_il: -1 };
}
async function verifySmartRecruiters(slug: string): Promise<Verified | null> {
  const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings`;
  const d = await jget(url);
  if (!d?.content?.length) return null;
  const il = d.content.filter((j: any) => isIlLoc(String(j?.location?.country ?? j?.location?.city ?? ""))).length;
  return { ats: "smartrecruiters", slug, api_url: url, jobs_total: d.content.length, jobs_il: il };
}
async function verifyComeet(uid: string, token: string): Promise<Verified | null> {
  const url = `https://www.comeet.co/careers-api/2.0/company/${uid}/positions?token=${token}&details=true`;
  const d = await jget(url);
  if (!Array.isArray(d) || d.length === 0) return null;
  const il = d.filter((p: any) => {
    const cc = String(p?.location?.country || "").toUpperCase();
    return cc === "IL" || cc === "ISRAEL";
  }).length;
  return { ats: "comeet", slug: uid, api_url: url, jobs_total: d.length, jobs_il: il };
}

// Workday verification: NOT in scope of this PR per lesson 2026-05-24
// (Workday tenant/site is fragile and was handled in PR #244).
// SuccessFactors verification skipped for the same reason — its tenant
// XML feed location varies. Both are flagged for the next pass.

// ───── Per-candidate pipeline ───────────────────────────────────────

interface Outcome {
  name: string;
  domain: string;
  category:
    | "recovered_supported"          // resolved + verified — promotable
    | "found_supported_no_jobs"      // hint found but API returned 0/null
    | "unsupported_platform"         // matched a known unsupported (counted by platform)
    | "no_ats_signal"                // careers page loaded but no recognizable ATS pattern
    | "still_fetch_failed"           // all URL fallbacks 4xx/5xx/timeout
    ;
  unsupported_platform?: string;
  verified?: Verified;
  fetched_via?: string;
  fetch_statuses?: number[];  // for diagnostic
}

async function probeOne(c: { name: string; domain: string }): Promise<Outcome> {
  // Try each careers path until one returns 200 + non-trivial body
  const statuses: number[] = [];
  let html = "";
  let fetched_via = "";
  for (const p of CAREERS_PATHS) {
    const url = `https://${c.domain}${p}`;
    const r = await fetchHtml(url);
    statuses.push(r.status);
    if (r.ok && r.html && r.html.length > 1000) {
      html = r.html;
      fetched_via = r.finalUrl || url;
      break;
    }
  }
  if (!html) {
    return { name: c.name, domain: c.domain, category: "still_fetch_failed", fetch_statuses: statuses };
  }

  // Detection layer 1: SUPPORTED ATS (verify each by API hit)
  const supportedHints = extractSupportedHints(html);
  const comeetConfigs = extractComeetConfigs(html);

  // Comeet first (highest IL yield)
  for (const cfg of comeetConfigs) {
    const v = await verifyComeet(cfg.uid, cfg.token);
    if (v && v.jobs_total > 0) {
      return { name: c.name, domain: c.domain, category: "recovered_supported", verified: v, fetched_via };
    }
  }
  for (const ats of ["greenhouse", "lever", "ashby", "workable", "smartrecruiters"]) {
    if (!supportedHints[ats]?.size) continue;
    const verifier = { greenhouse: verifyGreenhouse, lever: verifyLever, ashby: verifyAshby, workable: verifyWorkable, smartrecruiters: verifySmartRecruiters }[ats]!;
    for (const slug of supportedHints[ats]) {
      const v = await verifier(slug);
      if (v && v.jobs_total > 0) {
        return { name: c.name, domain: c.domain, category: "recovered_supported", verified: v, fetched_via };
      }
    }
  }

  // Workday/SuccessFactors hints: NOT verified in this PR (handled by PR #244 / future SF pass)
  // — they fall through to "no_ats_signal" if no other supported ATS matched
  if (supportedHints.workday?.size || supportedHints.successfactors?.size) {
    return { name: c.name, domain: c.domain, category: "found_supported_no_jobs", fetched_via,
             verified: { ats: supportedHints.workday?.size ? "workday_deferred" : "successfactors_deferred",
                         slug: [...(supportedHints.workday || supportedHints.successfactors || [])].join(","),
                         api_url: "", jobs_total: 0, jobs_il: 0 } };
  }

  // Found a supported hint but verify returned 0
  const supportedFound = Object.entries(supportedHints).find(([_, s]) => s.size > 0);
  if (supportedFound || comeetConfigs.length > 0) {
    return { name: c.name, domain: c.domain, category: "found_supported_no_jobs", fetched_via };
  }

  // Detection layer 2: UNSUPPORTED platform
  const unsupportedPlatform = detectUnsupportedPlatform(html);
  if (unsupportedPlatform) {
    return { name: c.name, domain: c.domain, category: "unsupported_platform", unsupported_platform: unsupportedPlatform, fetched_via };
  }

  // No ATS signal at all
  return { name: c.name, domain: c.domain, category: "no_ats_signal", fetched_via };
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

// ───── Main ─────────────────────────────────────────────────────────

function normDomain(s: string): string {
  if (!s) return "";
  let v = s.toLowerCase().trim();
  if (v.includes("://")) {
    try { v = new URL(v).hostname; } catch { /* */ }
  }
  return v.replace(/^www\./, "").split("/")[0].split(":")[0];
}

async function main() {
  const t0 = Date.now();
  const files = readdirSync(TECHMAP_DIR).filter(f => f.endsWith(".json"));
  const seed: Array<{ name: string; domain: string }> = [];
  for (const f of files) {
    const tm = JSON.parse(readFileSync(`${TECHMAP_DIR}/${f}`, "utf8"));
    if (!tm.isActive) continue;
    if (!["m", "l", "xl"].includes(tm.size)) continue;
    const dom = normDomain(tm.websiteUrl || "");
    if (!dom) continue;
    seed.push({ name: tm.name, domain: dom });
  }
  console.log(`Techmap m+l+xl active w/ domain: ${seed.length}`);

  // Dedup against current registry (PR #243's branch has 873; main has 832)
  const reg = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const regDomains = new Set<string>();
  const regNames = new Set<string>();
  for (const c of (reg.companies || [])) {
    if (c.domain) regDomains.add(normDomain(c.domain));
    if (c.name) regNames.add(c.name.toLowerCase().trim());
  }
  const netNew = seed.filter(c => !regDomains.has(c.domain) && !regNames.has(c.name.toLowerCase().trim()));
  console.log(`Net-new vs current registry (${reg.companies?.length || 0} rows): ${netNew.length}\n`);

  console.log(`Probing with ${CONCURRENCY}-way concurrency, Chrome UA, ${CAREERS_PATHS.length} URL fallbacks...`);
  let done = 0;
  const results = await runConcurrent(CONCURRENCY, netNew, async (c) => {
    const r = await probeOne(c);
    done++;
    if (done % 50 === 0 || r.category === "recovered_supported") {
      const tag = r.category === "recovered_supported" ? `RECOVERED:${r.verified?.ats}:${r.verified?.slug}` : r.category;
      const il = r.verified?.jobs_il ?? "-";
      const tot = r.verified?.jobs_total ?? "-";
      console.log(`  [${String(done).padStart(4)}/${netNew.length}] ${c.name.padEnd(36).slice(0, 36)} ${tag}  il=${il}/${tot}`);
    }
    return r;
  });

  const recovered = results.filter(r => r.category === "recovered_supported");
  const foundButNoJobs = results.filter(r => r.category === "found_supported_no_jobs");
  const unsupported = results.filter(r => r.category === "unsupported_platform");
  const noSignal = results.filter(r => r.category === "no_ats_signal");
  const stillFailed = results.filter(r => r.category === "still_fetch_failed");

  // Aggregate
  const recoveredByAts: Record<string, number> = {};
  let recoveredIlJobs = 0;
  let recoveredTotalJobs = 0;
  for (const r of recovered) {
    const ats = r.verified!.ats;
    recoveredByAts[ats] = (recoveredByAts[ats] || 0) + 1;
    recoveredIlJobs += Math.max(0, r.verified!.jobs_il);
    recoveredTotalJobs += r.verified!.jobs_total;
  }
  const unsupportedByPlatform: Record<string, number> = {};
  for (const r of unsupported) {
    const p = r.unsupported_platform || "unknown";
    unsupportedByPlatform[p] = (unsupportedByPlatform[p] || 0) + 1;
  }
  const stillFailedByStatus: Record<string, number> = {};
  for (const r of stillFailed) {
    const ks = (r.fetch_statuses || []).join(",") || "all_zero";
    stillFailedByStatus[ks] = (stillFailedByStatus[ks] || 0) + 1;
  }

  // Promotable rows
  const newRows = recovered.map(r => {
    const v = r.verified!;
    return {
      name: r.name,
      type: "israeli_founded",
      industry: "Unknown",
      domain: r.domain,
      careers_url: r.fetched_via || `https://${r.domain}/careers`,
      ats: v.ats,
      slug: v.slug,
      api_url: v.api_url,
      verified: true,
      notes: `Recovered via techmap-recovery pass (2026-06-04); Chrome UA + broader URL fallback. ATS independently verified — API returned ${v.jobs_total} positions${v.jobs_il >= 0 ? `, ${v.jobs_il} IL-tagged` : ""}.`,
    };
  });

  writeFileSync(DRAFT_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    probed: netNew.length,
    recovered: recovered.length,
    recovered_by_ats: recoveredByAts,
    recovered_total_jobs: recoveredTotalJobs,
    recovered_il_jobs: recoveredIlJobs,
    new_rows: newRows,
  }, null, 2));

  writeFileSync(MISS_PATH, JSON.stringify({
    generated_at: new Date().toISOString(),
    breakdown: {
      recovered_supported: recovered.length,
      found_supported_no_jobs: foundButNoJobs.length,
      unsupported_platform: unsupported.length,
      no_ats_signal: noSignal.length,
      still_fetch_failed: stillFailed.length,
    },
    unsupported_by_platform: unsupportedByPlatform,
    found_supported_no_jobs_sample: foundButNoJobs.slice(0, 30).map(r => ({ name: r.name, domain: r.domain, hint: r.verified?.ats, slug: r.verified?.slug })),
    still_fetch_failed_by_status: stillFailedByStatus,
    no_signal_sample: noSignal.slice(0, 30).map(r => ({ name: r.name, domain: r.domain })),
  }, null, 2));

  const wallMin = ((Date.now() - t0) / 60_000).toFixed(1);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Probed: ${netNew.length}  wall ${wallMin}m\n`);
  console.log(`Recovery breakdown:`);
  console.log(`  recovered_supported:      ${recovered.length}  (${Object.entries(recoveredByAts).map(([k,n])=>`${k}=${n}`).join(", ")})`);
  console.log(`  found_supported_no_jobs:  ${foundButNoJobs.length}`);
  console.log(`  unsupported_platform:     ${unsupported.length}`);
  console.log(`  no_ats_signal:            ${noSignal.length}`);
  console.log(`  still_fetch_failed:       ${stillFailed.length}\n`);
  console.log(`Recovered IL jobs (immediate verify-time): ${recoveredIlJobs}`);
  console.log(`Recovered total jobs across those rows:    ${recoveredTotalJobs}\n`);
  console.log(`Unsupported-platform breakdown (decision input for next adapter):`);
  for (const [p, n] of Object.entries(unsupportedByPlatform).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p.padEnd(20)} ${n} companies`);
  }
  console.log(`\nDraft → ${DRAFT_PATH}`);
  console.log(`Misses → ${MISS_PATH}`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });

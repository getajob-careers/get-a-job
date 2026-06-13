// scripts/discover-tech-xhr.ts
//
// B-pass measurement (2026-06-13). The A-pass (discover-r1 against the
// 86 tech seeds) returned 4.7% — but that's a static-HTML floor: it
// reads the raw HTML for ATS URL signatures and misses every SPA-
// embedded careers page that fetches jobs via XHR at runtime. This
// script measures the TRUE detection rate by opening each careers
// page in Chromium with `networkidle` waiting + capturing every XHR
// request — the ATS endpoint URL shows up in the network log even
// when the rendered HTML never includes it.
//
// METHODOLOGY NOTE (locked 2026-06-14, B-pass results) — for any
// future tech-population crawl, run BOTH discover-r1 (static HTML)
// AND this script (XHR capture) and union the hit set. The two passes
// detect different subsets:
//   - static catches iframe / script-tag embeds the XHR never re-fires
//     on initial load (e.g. Tapcheck, HUMAN Security, CopilotKit)
//   - XHR catches SPA careers pages where the ATS slug only appears in
//     fetch calls, never in raw HTML (Candivore, Prompt→SentinelOne,
//     and the bulk of modern React/Vue/Next.js careers shells)
// Neither dominates. Same politeness, same behavioral tripwire on both.
//
// Scope per Eli's brief: re-probe the 86 seeds, focus reporting on
// the 57 nothing_found bucket from the A-pass. Same politeness,
// same behavioral tripwire (any challenge / captcha / nonce → blocked,
// never solved).
//
// Promotion gate: this script's output is a measurement artifact only.
// It does NOT auto-mutate companies_il.json. Hits get promoted via a
// follow-up human-reviewed step, per the draft-file pattern.
//
// Output: scripts/discover-tech-xhr-draft.json
//
// Usage:
//
//   npx tsx scripts/discover-tech-xhr.ts
//   npx tsx scripts/discover-tech-xhr.ts --only-nothing-found   # 57 of 86
//
// Wall-time estimate: ~20-25 min at concurrency 2.

import { readFileSync, writeFileSync } from "node:fs";
import { chromium, type BrowserContext } from "playwright";

const SEEDS_PATH = "scripts/seeds/tech_seeds_netnew_crawlable.json";
const A_PASS_PATH = "scripts/discover-tech-draft.json";
const OUT_PATH = "scripts/discover-tech-xhr-draft.json";

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";
const NAV_TIMEOUT_MS = 25_000;
const NETWORK_IDLE_DWELL_MS = 6_000;     // sit on networkidle for this long
const CONCURRENCY = 2;
const POLITE_GAP_MS = 500;

// ───── ATS detection from XHR URLs ─────────────────────────────────
//
// One pattern per ATS family. Slug captured where possible. Same
// detectors as discover-r1.ts's HTML-based scanner — but here applied
// to the URLs of every request the page fires after load, not the
// HTML string. The static crawl missed these because the ATS URL was
// only present in JavaScript-emitted fetch calls, never in raw markup.

type AtsTag =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "smartrecruiters"
  | "successfactors"
  | "comeet"
  | "adamtotal"
  | "niloosoft_hunter"
  | "eightfold"
  | "phenom_people";

interface AtsDetection {
  ats: AtsTag;
  slug?: string;
  api_url?: string;
  evidence: string;
}

function detectFromUrl(url: string): AtsDetection | null {
  let m;
  if ((m = url.match(/boards-api\.greenhouse\.io\/v1\/boards\/([\w-]+)/i))) {
    return { ats: "greenhouse", slug: m[1], api_url: `https://boards-api.greenhouse.io/v1/boards/${m[1]}/jobs?content=true`, evidence: `xhr ${url.slice(0, 100)}` };
  }
  if ((m = url.match(/api\.lever\.co\/v0\/postings\/([\w-]+)/i))) {
    return { ats: "lever", slug: m[1], api_url: `https://api.lever.co/v0/postings/${m[1]}?mode=json`, evidence: `xhr ${url.slice(0, 100)}` };
  }
  if ((m = url.match(/api\.ashbyhq\.com\/posting-api\/job-board\/([\w-]+)/i))) {
    return { ats: "ashby", slug: m[1], api_url: `https://api.ashbyhq.com/posting-api/job-board/${m[1]}?includeCompensation=false`, evidence: `xhr ${url.slice(0, 100)}` };
  }
  if ((m = url.match(/([\w-]+)\.(wd\d+)\.myworkdayjobs\.com\/wday\/cxs\/[\w-]+\/([\w-]+)\/jobs/i))) {
    return { ats: "workday", slug: `${m[1]}.${m[2]}.myworkdayjobs.com/${m[3]}`, api_url: `https://${m[1]}.${m[2]}.myworkdayjobs.com/wday/cxs/${m[1]}/${m[3]}/jobs`, evidence: `xhr ${url.slice(0, 100)}` };
  }
  if ((m = url.match(/api\.smartrecruiters\.com\/v1\/companies\/([\w-]+)/i))) {
    return { ats: "smartrecruiters", slug: m[1], api_url: `https://api.smartrecruiters.com/v1/companies/${m[1]}/postings?country=il&limit=100`, evidence: `xhr ${url.slice(0, 100)}` };
  }
  if ((m = url.match(/comeet\.co\/careers-api\/2\.0\/company\/([\w.-]+)\/positions\?token=([\w-]+)/i))) {
    return { ats: "comeet", slug: m[1], api_url: `https://www.comeet.co/careers-api/2.0/company/${m[1]}/positions?token=${m[2]}&details=true`, evidence: `xhr COMEET uid=${m[1]}` };
  }
  if ((m = url.match(/career2?\.successfactors\.(?:com|eu)/i))) {
    return { ats: "successfactors", evidence: `xhr ${url.slice(0, 100)}` };
  }
  if ((m = url.match(/talent\.eightfold\.ai\/[a-z]+/i))) {
    return { ats: "eightfold", evidence: `xhr eightfold ${url.slice(0, 100)}` };
  }
  if ((m = url.match(/cdn\.phenompeople\.com|career\.phenompeople\.com|phenom\.com/i))) {
    return { ats: "phenom_people", evidence: `xhr phenom ${url.slice(0, 100)}` };
  }
  if ((m = url.match(/niloo-server\.herokuapp\.com\/actions-([\w-]+)-career/i))) {
    return { ats: "niloosoft_hunter", slug: m[1], api_url: url, evidence: `xhr niloosoft slug=${m[1]}` };
  }
  if ((m = url.match(/(?:career|railcareer)\.adamtotal\.co\.il\/[^?\s]*\?token=([\w-]+)/i))) {
    return { ats: "adamtotal", slug: m[1].slice(0, 8), api_url: url, evidence: `xhr adamtotal token=${m[1].slice(0, 8)}…` };
  }
  return null;
}

const CHALLENGE_MARKERS =
  /cf-challenge|cf_chl|challenge-platform|just a moment|attention required|g-recaptcha|hcaptcha|_abck|bm-verify|akamai-bot-manager|perfdrive\.com|datadome/i;
const CHALLENGE_HOSTS =
  /challenges\.cloudflare\.com|hcaptcha\.com|google\.com\/recaptcha|validate\.perfdrive\.com/i;

// ───── Per-seed probe ───────────────────────────────────────────────

interface SeedRow { company_name: string; domain: string; }

type Verdict =
  | "xhr_ats_detected"
  | "blocked"
  | "no_ats_xhr"
  | "navigation_failed";

interface Result {
  company_name: string;
  domain: string;
  a_pass_verdict: string;
  careers_url_probed: string | null;
  final_url: string | null;
  verdict: Verdict;
  ats_detected: AtsTag | null;
  slug: string | null;
  api_url: string | null;
  evidence: string | null;
  challenge_evidence: string | null;
  error: string | null;
  xhr_count: number;
  ats_relevant_hosts: string[];   // distinct hosts the page hit (debug aid)
}

function candidateUrls(domain: string): string[] {
  const d = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return [
    `https://www.${d}/careers`,
    `https://www.${d}/career`,
    `https://careers.${d}`,
    `https://${d}/careers`,
  ];
}

async function probeOne(context: BrowserContext, seed: SeedRow, aPassVerdict: string): Promise<Result> {
  const base: Result = {
    company_name: seed.company_name,
    domain: seed.domain,
    a_pass_verdict: aPassVerdict,
    careers_url_probed: null,
    final_url: null,
    verdict: "no_ats_xhr",
    ats_detected: null,
    slug: null,
    api_url: null,
    evidence: null,
    challenge_evidence: null,
    error: null,
    xhr_count: 0,
    ats_relevant_hosts: [],
  };

  const page = await context.newPage();
  const xhrUrls: string[] = [];
  let challengeEvidence: string | null = null;

  page.on("request", (req) => {
    const url = req.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    if (/\.(png|jpg|jpeg|gif|svg|webp|woff2?|ttf|css|ico|map)(\?|$)/i.test(url)) return;
    if (CHALLENGE_HOSTS.test(url)) challengeEvidence = challengeEvidence ?? `challenge-host XHR: ${url.slice(0, 80)}`;
    xhrUrls.push(url);
  });
  page.on("response", async (res) => {
    if (res.status() === 403 || res.status() === 503 || res.status() === 429) {
      try {
        const body = await res.text();
        if (CHALLENGE_MARKERS.test(body)) challengeEvidence = challengeEvidence ?? `${res.status()} body markers on ${res.url().slice(0, 80)}`;
      } catch { /* ignore */ }
    }
  });

  let lastError: string | null = null;
  let everLoaded = false;

  for (const url of candidateUrls(seed.domain)) {
    base.careers_url_probed = url;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
      everLoaded = true;
      base.final_url = page.url();
      break;
    } catch (e: any) {
      lastError = String(e?.message ?? e);
      // networkidle can time out on SPAs that keep polling — still try
      // to read the page if any content rendered.
      try {
        const html = await page.content();
        if (html && html.length > 500) {
          everLoaded = true;
          base.final_url = page.url();
          break;
        }
      } catch { /* ignore */ }
    }
  }

  // Even if we broke out early, sit for a dwell so deferred XHRs fire.
  if (everLoaded) {
    await new Promise((r) => setTimeout(r, NETWORK_IDLE_DWELL_MS));
  }

  // Final tripwire scan on rendered DOM.
  if (everLoaded && !challengeEvidence) {
    try {
      const html = await page.content();
      if (CHALLENGE_MARKERS.test(html)) {
        challengeEvidence = "rendered-DOM challenge markers";
      }
    } catch { /* ignore */ }
  }

  await page.close();

  base.xhr_count = xhrUrls.length;
  base.ats_relevant_hosts = Array.from(new Set(
    xhrUrls
      .filter((u) => /greenhouse|lever\.co|ashbyhq|myworkdayjobs|smartrecruiters|successfactors|comeet|adamtotal|niloo-server|eightfold|phenompeople/i.test(u))
      .map((u) => { try { return new URL(u).hostname; } catch { return u.slice(0, 50); } }),
  )).slice(0, 10);

  if (!everLoaded) {
    base.verdict = "navigation_failed";
    base.error = lastError;
    return base;
  }

  if (challengeEvidence) {
    base.verdict = "blocked";
    base.challenge_evidence = challengeEvidence;
    return base;
  }

  // Scan captured XHR URLs for ATS endpoints.
  for (const url of xhrUrls) {
    const det = detectFromUrl(url);
    if (det) {
      base.verdict = "xhr_ats_detected";
      base.ats_detected = det.ats;
      base.slug = det.slug ?? null;
      base.api_url = det.api_url ?? null;
      base.evidence = det.evidence;
      return base;
    }
  }

  base.verdict = "no_ats_xhr";
  return base;
}

// ───── Orchestrator ─────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const onlyNothingFound = args.includes("--only-nothing-found");

  const allSeeds = JSON.parse(readFileSync(SEEDS_PATH, "utf8")) as SeedRow[];
  const aPass = JSON.parse(readFileSync(A_PASS_PATH, "utf8"));
  const aByCompany = new Map<string, string>();
  for (const r of aPass.results) aByCompany.set(r.company_name, r.verdict);

  let seeds = allSeeds;
  if (onlyNothingFound) {
    seeds = seeds.filter((s) => aByCompany.get(s.company_name) === "nothing_found");
  }

  console.log(`B-pass — Playwright + networkidle + XHR capture`);
  console.log(`================================================`);
  console.log(`seeds: ${seeds.length}${onlyNothingFound ? " (filtered to A-pass nothing_found)" : " (all)"}`);
  console.log(`concurrency: ${CONCURRENCY}, networkidle dwell: ${NETWORK_IDLE_DWELL_MS}ms, nav timeout: ${NAV_TIMEOUT_MS}ms\n`);

  const t0 = Date.now();
  const browser = await chromium.launch({ headless: true });
  const results: Result[] = new Array(seeds.length);

  try {
    let cursor = 0;
    await Promise.all(Array.from({ length: CONCURRENCY }, async (_, workerId) => {
      const context = await browser.newContext({
        userAgent: REAL_BROWSER_UA,
        locale: "he-IL",
        viewport: { width: 1280, height: 800 },
      });
      try {
        while (cursor < seeds.length) {
          const idx = cursor++;
          const s = seeds[idx];
          const aV = aByCompany.get(s.company_name) ?? "unknown";
          const r = await probeOne(context, s, aV);
          results[idx] = r;
          const tag = r.verdict === "xhr_ats_detected"
            ? `✓ ${r.ats_detected}${r.slug ? ` (${r.slug})` : ""}`
            : r.verdict === "blocked"
              ? `⚠ blocked: ${r.challenge_evidence}`
              : r.verdict === "navigation_failed"
                ? `✗ nav_failed: ${r.error?.slice(0, 60) ?? "unknown"}`
                : `· no_ats_xhr (${r.xhr_count} xhrs)`;
          console.log(`[w${workerId}] ${String(idx + 1).padStart(3)}/${seeds.length}  ${s.company_name.padEnd(28)}  [A:${aV.padEnd(16)}]  ${tag}`);
          await new Promise((r) => setTimeout(r, POLITE_GAP_MS));
        }
      } finally {
        await context.close();
      }
    }));
  } finally {
    await browser.close();
  }

  // ───── Aggregate stats ──────────────────────────────────────────

  const byVerdict: Record<string, number> = {};
  const byAts: Record<string, number> = {};
  const byApassThenBverdict: Record<string, Record<string, number>> = {};
  for (const r of results) {
    byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;
    if (r.ats_detected) byAts[r.ats_detected] = (byAts[r.ats_detected] ?? 0) + 1;
    const ap = r.a_pass_verdict;
    if (!byApassThenBverdict[ap]) byApassThenBverdict[ap] = {};
    byApassThenBverdict[ap][r.verdict] = (byApassThenBverdict[ap][r.verdict] ?? 0) + 1;
  }

  const summary = {
    generated_at: new Date().toISOString(),
    seeds_file: SEEDS_PATH,
    a_pass_file: A_PASS_PATH,
    only_nothing_found: onlyNothingFound,
    seeds_probed: results.length,
    wall_seconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
    by_verdict: byVerdict,
    by_ats_detected: byAts,
    by_apass_then_bverdict: byApassThenBverdict,
    results,
  };
  writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2));

  console.log(`\n=== B-PASS SUMMARY ===`);
  console.log(`Wall time: ${summary.wall_seconds}s`);
  for (const [k, v] of Object.entries(byVerdict).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(3)}  ${k}`);
  }
  if (Object.keys(byAts).length > 0) {
    console.log(`\nXHR-detected ATS hits:`);
    for (const [k, v] of Object.entries(byAts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(v).padStart(3)}  ${k}`);
    }
  }
  console.log(`\nA→B transition matrix:`);
  for (const [a, m] of Object.entries(byApassThenBverdict).sort()) {
    console.log(`  A=${a}:`);
    for (const [b, v] of Object.entries(m).sort((a, b) => b[1] - a[1])) {
      console.log(`     B=${b.padEnd(22)} ${v}`);
    }
  }
  console.log(`\nDraft → ${OUT_PATH}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

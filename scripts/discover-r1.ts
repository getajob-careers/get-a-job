// scripts/discover-r1.ts
//
// R1 detection crawl. Reads scripts/seeds/r1_net_new_seeds_901.json,
// probes each seed's careers page, and detects ATS signatures in the
// HTML: Greenhouse / Lever / Ashby / Workday / SmartRecruiters /
// SuccessFactors, plus the two approved riders Comeet (COMEET.init or
// comeetvar config) and AdamTotal (adamtotal.co.il/?token= links).
//
// Polite by spec:
//   - Concurrency ≤ 4, 500ms polite pause between attempts per worker.
//   - Real-browser User-Agent header (established AdamTotal precedent).
//   - NO challenge / captcha / WAF solving. Any block signal classifies
//     the seed as `blocked` and moves on. Same behavioral tripwire as
//     the Niloosoft step (PR-N1).
//
// Output: scripts/discover-r1-draft.json — never auto-mutates
// companies_il.json. Promotion to the registry is a separate human
// review step per the draft-file pattern (lessons.md 2026-05-25).
//
// Modes:
//   --priority=high   (default) — runs only the 162 high-priority seeds.
//                      Eli's HOLD point: after this batch's stats are
//                      reported, the medium / low batches DO NOT auto-
//                      run. He decides whether the detection rate
//                      justifies continuing.
//   --priority=all    — runs the whole 901-row file. Only used after
//                      the HOLD decision.
//
// Usage:
//
//   npx tsx scripts/discover-r1.ts                  # 162 high-priority
//   npx tsx scripts/discover-r1.ts --priority=all   # full 901

import { readFileSync, writeFileSync } from "node:fs";

const DEFAULT_SEEDS_PATH = "scripts/seeds/r1_net_new_seeds_901.json";
const DEFAULT_OUT_PATH = "scripts/discover-r1-draft.json";

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 4;
const POLITE_GAP_MS = 500;

// ───── Seed shape (matches r1_net_new_seeds_901.json) ──────────────

// SeedRow is the R1 schema. Optional fields (sector, crawl_priority, etc.)
// let leaner seed files (e.g. the 2026-06-13 tech_seeds_netnew_crawlable
// shape with just company_name + domain) flow through without
// adaptation. Missing sector defaults to "unknown"; missing
// crawl_priority defaults to "high" so --priority=high still accepts
// the row.
interface SeedRow {
  company_name: string;
  domain: string;
  sector?: string;
  subsector?: string;
  country?: string;
  source_hint?: string;
  crawl_priority?: "high" | "medium" | "low";
  domain_confidence_1_10?: string;
  notes?: string;
  domain_status?: "known" | "known_or_candidate" | "guessed";
}

// ───── ATS detection signatures ────────────────────────────────────
//
// Each detector emits an `ats` tag, an optional `slug`, and an optional
// `api_url`. The slug and api_url are best-effort — they're useful
// hints for the human reviewer but NOT trusted as wireable values
// without manual verification (the draft-file → human-promotion
// pattern from lessons.md 2026-05-25).
//
// Detection order matters: rare/strong signatures (COMEET.init, the
// myworkdayjobs.com host) win over loose markers (a "smartrecruiters"
// substring in a press release).

type AtsTag =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "smartrecruiters"
  | "successfactors"
  | "comeet"
  | "adamtotal";

interface Detection {
  ats: AtsTag;
  slug?: string;
  api_url?: string;
  evidence: string; // short string for the draft file
}

function detectAts(html: string): Detection | null {
  // Greenhouse: boards.greenhouse.io/<slug> or boards-api.greenhouse.io/v1/boards/<slug>
  const gh = html.match(/(?:boards-api\.greenhouse\.io\/v1\/boards|boards\.greenhouse\.io)\/([\w-]+)/i);
  if (gh) {
    return {
      ats: "greenhouse",
      slug: gh[1],
      api_url: `https://boards-api.greenhouse.io/v1/boards/${gh[1]}/jobs?content=true`,
      evidence: `boards.greenhouse.io/${gh[1]}`,
    };
  }

  // Lever: jobs.lever.co/<slug>
  const lv = html.match(/jobs\.lever\.co\/([\w-]+)/i);
  if (lv) {
    return {
      ats: "lever",
      slug: lv[1],
      api_url: `https://api.lever.co/v0/postings/${lv[1]}?mode=json`,
      evidence: `jobs.lever.co/${lv[1]}`,
    };
  }

  // Ashby: jobs.ashbyhq.com/<slug>
  const ab = html.match(/jobs\.ashbyhq\.com\/([\w-]+)/i);
  if (ab) {
    return {
      ats: "ashby",
      slug: ab[1],
      api_url: `https://api.ashbyhq.com/posting-api/job-board/${ab[1]}?includeCompensation=false`,
      evidence: `jobs.ashbyhq.com/${ab[1]}`,
    };
  }

  // Workday: <tenant>.wdN.myworkdayjobs.com/[wday/cxs/<tenant>/]<site>
  const wd = html.match(/([\w-]+)\.(wd\d+)\.myworkdayjobs\.com\/([\w-]+)/i);
  if (wd) {
    const [, tenant, host, site] = wd;
    return {
      ats: "workday",
      slug: `${tenant}.${host}.myworkdayjobs.com/${site}`,
      api_url: `https://${tenant}.${host}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
      evidence: `${tenant}.${host}.myworkdayjobs.com/${site}`,
    };
  }

  // SmartRecruiters: careers.smartrecruiters.com/<slug> or api.smartrecruiters.com
  const sr = html.match(/(?:careers\.smartrecruiters\.com|smartrecruiters\.com\/sr-careers-public)\/([\w-]+)/i);
  if (sr) {
    return {
      ats: "smartrecruiters",
      slug: sr[1],
      api_url: `https://api.smartrecruiters.com/v1/companies/${sr[1]}/postings?country=il&limit=100`,
      evidence: `careers.smartrecruiters.com/${sr[1]}`,
    };
  }
  // Standalone SR detection — the slug isn't in the HTML but the
  // careersite reference exists.
  if (/api\.smartrecruiters\.com|careers\.smartrecruiters\.com/i.test(html)) {
    return { ats: "smartrecruiters", evidence: "smartrecruiters.com hostname present (slug TBD)" };
  }

  // SuccessFactors (legacy + RX patterns)
  if (/career2\.successfactors\.(?:eu|com)|jobsapi(?:-staging)?\.successfactors|sf-careersection|hrss\.sap\.com/i.test(html)) {
    return { ats: "successfactors", evidence: "successfactors.com/eu careersection markers" };
  }

  // Comeet: COMEET.init / comeetvar config, or direct careers-api URL
  if (/COMEET\.init\s*\(/i.test(html)
      || /\bcomeetvar\s*=\s*\{/i.test(html)
      || /comeet\.co\/careers-api\/2\.0\/company\//i.test(html)) {
    // Try to extract uid + token from the simplest init form. Don't be
    // strict — promotion is human-reviewed. A bare positive identifies
    // the company as a Comeet tenant.
    const uidM = html.match(/(?:["']?)company[-_]uid(?:["']?)\s*:\s*["']([A-Za-z0-9._-]+)["']/);
    const tokenM = html.match(/(?:["']?)token(?:["']?)\s*:\s*["']([A-Za-z0-9_-]+)["']/);
    const slug = uidM ? uidM[1] : undefined;
    const api_url = uidM && tokenM
      ? `https://www.comeet.co/careers-api/2.0/company/${uidM[1]}/positions?token=${tokenM[1]}&details=true`
      : undefined;
    return {
      ats: "comeet",
      slug,
      api_url,
      evidence: uidM && tokenM ? `COMEET.init uid=${uidM[1]}` : "COMEET.init or comeetvar present (uid/token TBD)",
    };
  }

  // AdamTotal: embedded careers iframe / link with ?token=<...>
  const at = html.match(/(?:career|railcareer)\.adamtotal\.co\.il\/[^"' >]*[?&]token=([A-Za-z0-9_-]+)/i);
  if (at) {
    return {
      ats: "adamtotal",
      slug: at[1].slice(0, 8), // not really a slug — kept short for the draft
      api_url: at[0].replace(/&amp;/g, "&"),
      evidence: `adamtotal.co.il/?token=${at[1].slice(0, 8)}…`,
    };
  }

  return null;
}

// ───── Challenge / block detection ─────────────────────────────────

const CHALLENGE_MARKERS =
  /cf-challenge|cf_chl|challenge-platform|just a moment|attention required|g-recaptcha|hcaptcha|_abck|bm-verify|akamai-bot-manager|perfdrive\.com|datadome/i;

function detectChallenge(status: number, html: string): string | null {
  if (status === 403 || status === 503) {
    if (CHALLENGE_MARKERS.test(html)) return `${status} body markers`;
    return `HTTP ${status}`;
  }
  if (CHALLENGE_MARKERS.test(html)) return "in-body challenge markers";
  return null;
}

// ───── Candidate careers URLs per domain ────────────────────────────
//
// Try a small, ordered set of common careers patterns. First clean
// 2xx HTML wins. Spec: ≤1 GET per pattern attempted; we cap at the
// list below so a probe never makes more than 6 HTTP requests per
// company (5 careers attempts + 1 trailing slash variant if helpful).

function candidateUrls(domain: string): string[] {
  const d = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return [
    `https://www.${d}/careers`,
    `https://www.${d}/career`,
    `https://careers.${d}`,
    `https://${d}/careers`,
    `https://${d}/career`,
  ];
}

// ───── HTTP helper ──────────────────────────────────────────────────

async function getWithTimeout(url: string): Promise<{ status: number; body: string; final_url: string } | { error: string }> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": REAL_BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.7,he;q=0.3",
      },
      signal: ctrl.signal,
    });
    const body = await res.text();
    return { status: res.status, body, final_url: res.url };
  } catch (e: any) {
    return { error: String(e?.name ?? e?.message ?? e) };
  } finally {
    clearTimeout(tid);
  }
}

// ───── Per-seed probe ───────────────────────────────────────────────

type Verdict =
  | "ats_detected"
  | "blocked"
  | "nothing_found"
  | "navigation_failed";

interface Result {
  company_name: string;
  domain: string;
  sector: string;
  crawl_priority: string;
  careers_url_probed: string | null;
  final_url: string | null;
  http_status: number | null;
  verdict: Verdict;
  ats_detected: AtsTag | null;
  slug: string | null;
  api_url: string | null;
  evidence: string | null;
  challenge_evidence: string | null;
  error: string | null;
  playwright_retry_attempted?: boolean;
  playwright_retry_outcome?: "recovered_to_ats_detected" | "recovered_to_nothing_found" | "recovered_to_blocked" | "still_failed";
}

async function probeOne(seed: SeedRow): Promise<Result> {
  const base: Result = {
    company_name: seed.company_name,
    domain: seed.domain,
    sector: seed.sector ?? "unknown",
    crawl_priority: seed.crawl_priority ?? "high",
    careers_url_probed: null,
    final_url: null,
    http_status: null,
    verdict: "nothing_found",
    ats_detected: null,
    slug: null,
    api_url: null,
    evidence: null,
    challenge_evidence: null,
    error: null,
  };

  let lastError: string | null = null;
  let everSawHtml = false;

  for (const url of candidateUrls(seed.domain)) {
    base.careers_url_probed = url;
    const r = await getWithTimeout(url);
    if ("error" in r) {
      lastError = r.error;
      // Polite pacing even between failed attempts on the same seed.
      await new Promise((res) => setTimeout(res, POLITE_GAP_MS));
      continue;
    }
    base.http_status = r.status;
    base.final_url = r.final_url;

    if (r.status >= 200 && r.status < 400 && r.body && r.body.length > 100) {
      everSawHtml = true;
      const challenge = detectChallenge(r.status, r.body);
      if (challenge) {
        base.verdict = "blocked";
        base.challenge_evidence = challenge;
        return base;
      }

      const ats = detectAts(r.body);
      if (ats) {
        base.verdict = "ats_detected";
        base.ats_detected = ats.ats;
        base.slug = ats.slug ?? null;
        base.api_url = ats.api_url ?? null;
        base.evidence = ats.evidence;
        return base;
      }

      // We found a usable HTML page but no ATS signature — record it
      // and stop probing further patterns to keep the budget polite.
      base.verdict = "nothing_found";
      return base;
    }
    if (r.status === 403 || r.status === 503) {
      const challenge = detectChallenge(r.status, r.body || "");
      if (challenge) {
        base.verdict = "blocked";
        base.challenge_evidence = challenge;
        return base;
      }
    }
    await new Promise((res) => setTimeout(res, POLITE_GAP_MS));
  }

  if (!everSawHtml) {
    base.verdict = "navigation_failed";
    base.error = lastError;
  }
  return base;
}

// ───── Orchestrator ─────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const argVal = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  const argFlag = (name: string) => args.includes(`--${name}`);

  const priorityArg = argVal("priority") || "high";
  const seedsPath = argVal("seeds") || DEFAULT_SEEDS_PATH;
  const outPath = argVal("out") || DEFAULT_OUT_PATH;
  const playwrightRetry = argFlag("playwright-retry-failed");

  const allowed: Record<string, true> = { high: true, all: true, medium: true, low: true };
  if (!allowed[priorityArg]) {
    console.error(`Unknown --priority value: ${priorityArg}. Use high | medium | low | all.`);
    process.exit(1);
  }

  const allSeeds = JSON.parse(readFileSync(seedsPath, "utf8")) as SeedRow[];
  const seeds = priorityArg === "all"
    ? allSeeds
    : allSeeds.filter((s) => (s.crawl_priority ?? "high") === priorityArg);

  console.log(`R1 detection crawl`);
  console.log(`==================`);
  console.log(`seeds file: ${seedsPath}`);
  console.log(`priority filter: ${priorityArg} → ${seeds.length} seeds`);
  console.log(`concurrency: ${CONCURRENCY}, polite gap: ${POLITE_GAP_MS}ms, timeout: ${TIMEOUT_MS}ms`);
  console.log(`playwright retry for nav_failed: ${playwrightRetry ? "ENABLED" : "disabled"}\n`);

  const t0 = Date.now();
  const results: Result[] = new Array(seeds.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async (_, workerId) => {
      while (cursor < seeds.length) {
        const idx = cursor++;
        const s = seeds[idx];
        const r = await probeOne(s);
        results[idx] = r;
        const tag = r.verdict === "ats_detected"
          ? `✓ ${r.ats_detected}${r.slug ? ` (${r.slug})` : ""}`
          : r.verdict === "blocked"
            ? `⚠ blocked: ${r.challenge_evidence}`
            : r.verdict === "navigation_failed"
              ? `✗ nav_failed: ${r.error ?? "unknown"}`
              : "· nothing_found";
        console.log(`[w${workerId}] ${String(idx + 1).padStart(3)}/${seeds.length}  ${s.company_name.padEnd(34)}  ${tag}`);
      }
    }),
  );

  // ───── Playwright retry on nav_failed rows ──────────────────────
  //
  // Added 2026-06-13 for the tech-population crawl: tech domains should
  // mostly resolve, so a TypeError from bare fetch is more likely a TLS/
  // SNI quirk than a real "no careers page" verdict. One additional
  // navigation attempt via headless Chromium (real-browser TLS stack,
  // wider cipher set) cleans up the measurement before classification.
  // Still polite — serial, 500ms gap, single attempt per seed. Same
  // tripwire detection as the HTTP pass; never bypasses a challenge.
  if (playwrightRetry) {
    const failed = results.filter((r) => r.verdict === "navigation_failed");
    if (failed.length > 0) {
      console.log(`\n=== Playwright retry pass (${failed.length} nav_failed seeds) ===`);
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: true });
      try {
        for (let i = 0; i < failed.length; i++) {
          const r = failed[i];
          r.playwright_retry_attempted = true;
          const context = await browser.newContext({
            userAgent: REAL_BROWSER_UA,
            locale: "he-IL",
            viewport: { width: 1280, height: 800 },
          });
          const page = await context.newPage();
          let html: string | null = null;
          let challengeFromResponse: string | null = null;
          page.on("response", (res) => {
            // Light tripwire on responses — we never solve a challenge.
            if (res.status() === 403 || res.status() === 503) {
              try {
                res.text().then((body) => {
                  if (CHALLENGE_MARKERS.test(body)) challengeFromResponse = `pw ${res.status()} body markers`;
                }).catch(() => { /* ignore */ });
              } catch { /* ignore */ }
            }
          });
          for (const url of candidateUrls(r.domain)) {
            r.careers_url_probed = url;
            try {
              const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
              if (resp) {
                r.http_status = resp.status();
                r.final_url = page.url();
              }
              html = await page.content();
              if (html && html.length > 100) break;
            } catch (e: any) {
              r.error = String(e?.message ?? e);
            }
          }
          await context.close();
          await new Promise((res) => setTimeout(res, POLITE_GAP_MS));

          if (!html || html.length < 100) {
            r.playwright_retry_outcome = "still_failed";
            console.log(`  [pw ${i + 1}/${failed.length}] ${r.company_name.padEnd(30)} still_failed`);
            continue;
          }

          if (challengeFromResponse || detectChallenge(r.http_status ?? 200, html)) {
            r.verdict = "blocked";
            r.challenge_evidence = challengeFromResponse ?? "in-body challenge markers (pw)";
            r.error = null;
            r.playwright_retry_outcome = "recovered_to_blocked";
            console.log(`  [pw ${i + 1}/${failed.length}] ${r.company_name.padEnd(30)} → blocked: ${r.challenge_evidence}`);
            continue;
          }

          const ats = detectAts(html);
          if (ats) {
            r.verdict = "ats_detected";
            r.ats_detected = ats.ats;
            r.slug = ats.slug ?? null;
            r.api_url = ats.api_url ?? null;
            r.evidence = ats.evidence;
            r.error = null;
            r.playwright_retry_outcome = "recovered_to_ats_detected";
            console.log(`  [pw ${i + 1}/${failed.length}] ${r.company_name.padEnd(30)} → ats_detected: ${ats.ats}${ats.slug ? ` (${ats.slug})` : ""}`);
            continue;
          }

          r.verdict = "nothing_found";
          r.error = null;
          r.playwright_retry_outcome = "recovered_to_nothing_found";
          console.log(`  [pw ${i + 1}/${failed.length}] ${r.company_name.padEnd(30)} → nothing_found`);
        }
      } finally {
        await browser.close();
      }
    }
  }

  // ───── Aggregate stats ──────────────────────────────────────────

  const byVerdict: Record<string, number> = {};
  const byAts: Record<string, number> = {};
  const bySectorAtsHit: Record<string, { detected: number; total: number }> = {};
  for (const r of results) {
    byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;
    if (r.ats_detected) byAts[r.ats_detected] = (byAts[r.ats_detected] ?? 0) + 1;
    if (!bySectorAtsHit[r.sector]) bySectorAtsHit[r.sector] = { detected: 0, total: 0 };
    bySectorAtsHit[r.sector].total++;
    if (r.verdict === "ats_detected") bySectorAtsHit[r.sector].detected++;
  }

  const summary = {
    generated_at: new Date().toISOString(),
    seeds_file: seedsPath,
    priority_filter: priorityArg,
    playwright_retry_failed: playwrightRetry,
    seeds_probed: results.length,
    wall_seconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
    by_verdict: byVerdict,
    by_ats_detected: byAts,
    by_sector_atsdetected: Object.fromEntries(
      Object.entries(bySectorAtsHit).map(([k, v]) => [
        k,
        {
          detected: v.detected,
          total: v.total,
          pct: v.total > 0 ? Number(((v.detected / v.total) * 100).toFixed(1)) : 0,
        },
      ]),
    ),
    results,
  };
  writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log(`\n=== SUMMARY ===`);
  console.log(`Wall time: ${summary.wall_seconds}s`);
  for (const [k, v] of Object.entries(byVerdict).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(3)}  ${k}`);
  }
  if (Object.keys(byAts).length > 0) {
    console.log(`\nATS hits:`);
    for (const [k, v] of Object.entries(byAts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(v).padStart(3)}  ${k}`);
    }
  }
  console.log(`\nDraft → ${outPath}`);
  console.log(`Next: review detection rate vs the spec hold point (162 high → decide on medium/low).`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

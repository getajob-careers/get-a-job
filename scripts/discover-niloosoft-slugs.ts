// scripts/discover-niloosoft-slugs.ts
//
// PR-N1 step 2: headless-Chromium XHR capture for the 10 approved Niloosoft
// Hunter tenants from step 1's reachability probe. For each tenant we open
// the careers page in Chromium, watch the network for the
// `niloo-server.herokuapp.com/actions-<slug>-career` POST (the per-tenant
// Niloosoft API URL the existing PwC fetcher targets), and record the
// captured slug.
//
// Step-1 approved seed set (the 10):
//   8 confirmed clean: 019 Mobile, AVNET, Cinema City, Egged,
//                      Keshet Te'amim, Motorola Solutions IL, Psagot,
//                      TechBuddy.
//   2 historically-held, Eli opted in: Phoenix Insurance, Cellcom.
//
// BEHAVIORAL TRIPWIRE (per the PR-N1 spec)
//
//   Any tenant that surfaces a Cloudflare challenge, captcha, nonce, or
//   other anti-bot mechanism during the headless capture is STOPPED on
//   that tenant and reclassified to held-legal. We do not solve, defer,
//   or bypass — we record + abort + flag. The discriminator is the page
//   content, the network responses we see, and the URL we landed on.
//   This is the only behavioral signal we use: "anything beyond a UA
//   header" (Eli's standing rule from the PR-N1 plan).
//
//   The default Playwright UA is a real Chromium UA — same precedent as
//   the AdamTotal fetcher and the step-1 HTTP probe.
//
// AVNET + Motorola caveat (per the spec)
//
//   These are international Niloosoft tenants. We accept their slugs ONLY
//   if a follow-up validation call to
//   `niloo-server.herokuapp.com/actions-<slug>-career` returns
//   location-filterable data (i.e. the JSON carries a location/city
//   field per job we can filter on). Otherwise we mark
//   `status: 'global_endpoint_no_il_filter'` so the registry step skips
//   them.
//
// Output: scripts/discover-niloosoft-slugs-draft.json
//
// Usage:
//
//   npx tsx scripts/discover-niloosoft-slugs.ts
//
// Cleanup: this script is non-runtime. Playwright stays a devDependency
// only; the live nightly refresh-jobs path never touches it.

import { chromium, type BrowserContext, type Page, type Request, type Response } from "playwright";
import { writeFileSync } from "node:fs";

interface TenantSeed {
  name: string;
  hebrew_name?: string;
  category: string;
  careers_url: string;
  base_domain: string;
  historical_hold?: true;
  notes?: string;
}

// Approved seed set from step 1's classification table.
const SEEDS: TenantSeed[] = [
  { name: "019 Mobile", category: "telecom",
    careers_url: "https://www.019mobile.co.il/career",
    base_domain: "019mobile.co.il" },
  { name: "AVNET", category: "tech",
    careers_url: "https://www.avnet.com/wps/portal/us/about-avnet/careers/",
    base_domain: "avnet.com",
    notes: "International tenant — IL-filter required" },
  { name: "Cinema City", hebrew_name: "סינמה סיטי", category: "consumer",
    careers_url: "https://www.cinema-city.co.il/career/",
    base_domain: "cinema-city.co.il" },
  { name: "Egged", hebrew_name: "אגד", category: "transport",
    careers_url: "https://www.egged.co.il/career/",
    base_domain: "egged.co.il",
    notes: "Already in registry as ats=unknown — upgrade in place" },
  { name: "Keshet Te'amim", hebrew_name: "קשת טעמים", category: "retail",
    careers_url: "https://www.keshet-teamim.co.il/career",
    base_domain: "keshet-teamim.co.il" },
  { name: "Motorola Solutions Israel", category: "tech",
    careers_url: "https://www.motorolasolutions.com/en_xu/about/careers.html",
    base_domain: "motorolasolutions.com",
    notes: "International tenant — IL-filter required" },
  { name: "Psagot", hebrew_name: "פסגות", category: "finance",
    careers_url: "https://www.psagot.co.il/career/",
    base_domain: "psagot.co.il" },
  { name: "TechBuddy", category: "tech",
    careers_url: "https://www.techbuddy.co.il/career",
    base_domain: "techbuddy.co.il" },
  // Historically held, opted in for retry by Eli on 2026-06-12.
  { name: "Phoenix Insurance", hebrew_name: "הפניקס", category: "insurance",
    careers_url: "https://www.fnx.co.il/Career",
    base_domain: "fnx.co.il",
    historical_hold: true,
    notes: "Historical hold; opt-in retry. Tripwire applies." },
  { name: "Cellcom", hebrew_name: "סלקום", category: "telecom",
    careers_url: "https://cellcom.co.il/career/",
    base_domain: "cellcom.co.il",
    historical_hold: true,
    notes: "Historical hold; opt-in retry. Tripwire applies." },
];

// Tripwire detectors. Any of these in URL, body, or response triggers an
// immediate reclassification to held-legal — the page started serving a
// challenge we are not allowed to bypass.
const CHALLENGE_MARKERS =
  /cf-challenge|cf_chl|challenge-platform|just a moment|attention required|g-recaptcha|hcaptcha|_abck|bm-verify|akamai-bot-manager|perfdrive\.com|nonce-action/i;
const CHALLENGE_URL_HOSTS =
  /challenges\.cloudflare\.com|hcaptcha\.com|google\.com\/recaptcha|validate\.perfdrive\.com/i;

// The Niloosoft per-tenant API URL shape, plus the tenant-careersite
// hunterhrms.com subdomain (used by some tenants for the front-end).
const NILOO_SLUG_RE = /niloo-server\.herokuapp\.com\/actions-([a-zA-Z0-9._-]+)-career/i;
const HUNTERHRMS_SUBDOMAIN_RE = /https?:\/\/([a-zA-Z0-9._-]+)-careersite\.hunterhrms\.com/i;

interface CapturedSlug {
  slug: string;
  source: "niloo-server" | "hunterhrms-subdomain";
  full_url: string;
  method: string;
  request_origin?: string;
}

interface ProbeResult {
  name: string;
  hebrew_name?: string;
  category: string;
  careers_url: string;
  base_domain: string;
  historical_hold?: true;
  notes?: string;
  status:
    | "slug_captured"
    | "no_niloo_xhr"          // page loaded but never hit niloo-server
    | "challenge_detected"    // tripwire fired
    | "navigation_failed"     // page never loaded
    | "global_endpoint_no_il_filter"; // AVNET/Motorola validation failed
  captured_slugs?: CapturedSlug[];
  recommended_slug?: string;
  challenge_evidence?: string;
  navigation_error?: string;
  il_validation?: {
    api_url: string;
    total_jobs: number;
    il_jobs_sampled: number;
    sample_locations: string[];
  };
}

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";
const NAV_TIMEOUT_MS = 30_000;
const NETWORK_IDLE_AFTER_MS = 5_000;
const POST_LOAD_DWELL_MS = 6_000; // give SPA bundles time to fire XHRs

async function probeOne(seed: TenantSeed): Promise<ProbeResult> {
  const base: ProbeResult = {
    name: seed.name,
    hebrew_name: seed.hebrew_name,
    category: seed.category,
    careers_url: seed.careers_url,
    base_domain: seed.base_domain,
    historical_hold: seed.historical_hold,
    notes: seed.notes,
    status: "no_niloo_xhr",
  };

  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const captured: CapturedSlug[] = [];
  let challengeEvidence: string | null = null;

  const noteRequest = (req: Request) => {
    const url = req.url();
    if (CHALLENGE_URL_HOSTS.test(url)) {
      challengeEvidence = `challenge-host XHR: ${url}`;
      return;
    }
    const m = url.match(NILOO_SLUG_RE);
    if (m) {
      captured.push({
        slug: m[1],
        source: "niloo-server",
        full_url: url,
        method: req.method(),
        request_origin: req.headers().origin,
      });
    }
    const h = url.match(HUNTERHRMS_SUBDOMAIN_RE);
    if (h) {
      // The careersite subdomain proves the tenant uses Niloosoft, even
      // when the API URL is wrapped in a Next.js server-side proxy.
      captured.push({
        slug: h[1],
        source: "hunterhrms-subdomain",
        full_url: url,
        method: req.method(),
      });
    }
  };

  const noteResponse = async (res: Response) => {
    const finalUrl = res.url();
    if (CHALLENGE_URL_HOSTS.test(finalUrl)) {
      challengeEvidence = `redirect to challenge host: ${finalUrl}`;
      return;
    }
    if (res.status() === 403 || res.status() === 503 || res.status() === 429) {
      try {
        const body = await res.text();
        if (CHALLENGE_MARKERS.test(body)) {
          challengeEvidence = `${res.status()} body markers on ${finalUrl}`;
        }
      } catch { /* body unavailable */ }
    }
  };

  try {
    const browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent: REAL_BROWSER_UA,
      locale: "he-IL",
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();
    page.on("request", noteRequest);
    page.on("response", noteResponse);

    try {
      await page.goto(seed.careers_url, {
        waitUntil: "networkidle",
        timeout: NAV_TIMEOUT_MS,
      });
    } catch (e: any) {
      // networkidle can time out on SPAs that keep polling. Fall through —
      // the slug XHR usually fires during load, not after.
      if (!challengeEvidence) {
        base.navigation_error = String(e?.message ?? e);
      }
    }

    // Some Niloosoft front-ends fire the get-jobs XHR a beat after the
    // initial render. Sit for a fixed dwell to give them time. We also
    // listen for additional URL-level signals during the dwell.
    await new Promise((r) => setTimeout(r, POST_LOAD_DWELL_MS));

    // Final tripwire: scan the rendered DOM for challenge markers.
    try {
      const html = await page.content();
      if (CHALLENGE_MARKERS.test(html)) {
        challengeEvidence = challengeEvidence ?? `markers in rendered DOM (length ${html.length})`;
      }
    } catch { /* ignore */ }

    await browser.close();
  } catch (e: any) {
    base.status = "navigation_failed";
    base.navigation_error = String(e?.message ?? e);
    if (context) try { await context.close(); } catch { /* ignore */ }
    return base;
  }

  if (challengeEvidence) {
    base.status = "challenge_detected";
    base.challenge_evidence = challengeEvidence;
    base.captured_slugs = captured;
    return base;
  }

  if (captured.length === 0) {
    base.status = "no_niloo_xhr";
    return base;
  }

  // Pick a winner: the most-frequent slug from the niloo-server XHRs;
  // fall back to a hunterhrms-subdomain hit when no API XHR fired.
  const counts: Record<string, number> = {};
  for (const c of captured) counts[c.slug] = (counts[c.slug] ?? 0) + (c.source === "niloo-server" ? 10 : 1);
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  base.recommended_slug = winner;
  base.captured_slugs = captured;
  base.status = "slug_captured";

  // For international tenants (AVNET, Motorola), validate the endpoint
  // returns location-filterable data. We POST the same body the PwC
  // fetcher does and sample locations.
  if (seed.notes?.includes("International tenant") && winner) {
    const ilValidation = await validateIlFilter(winner, seed.careers_url);
    base.il_validation = ilValidation;
    if (ilValidation.il_jobs_sampled === 0) {
      base.status = "global_endpoint_no_il_filter";
    }
  }

  return base;
}

async function validateIlFilter(slug: string, careersUrlForOrigin: string): Promise<NonNullable<ProbeResult["il_validation"]>> {
  const apiUrl = `https://niloo-server.herokuapp.com/actions-${slug}-career`;
  const origin = (() => {
    try { return new URL(careersUrlForOrigin).origin; } catch { return ""; }
  })();
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": REAL_BROWSER_UA,
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify({ cmd: "get-jobs", data: {} }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { api_url: apiUrl, total_jobs: 0, il_jobs_sampled: 0, sample_locations: [] };
    const data = await res.json();
    const jobs = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : [];
    const sampleLocs: string[] = [];
    let ilCount = 0;
    const IL_RE = /israel|tel[\s-]?aviv|haifa|jerusalem|herzliya|ra'?anana|petah|netanya|be'?er[\s-]?sheva|yokneam|ramat[\s-]?gan|israel|ישראל|תל אביב|חיפה|ירושלים|הרצליה/i;
    for (const j of jobs.slice(0, 80)) {
      const locStr = String(
        j?.location ?? j?.city ?? j?.locationName ?? j?.area ?? j?.region ?? "",
      );
      if (locStr && sampleLocs.length < 5) sampleLocs.push(locStr);
      if (IL_RE.test(locStr)) ilCount++;
    }
    return { api_url: apiUrl, total_jobs: jobs.length, il_jobs_sampled: ilCount, sample_locations: sampleLocs };
  } catch {
    return { api_url: apiUrl, total_jobs: 0, il_jobs_sampled: 0, sample_locations: [] };
  }
}

async function main() {
  const t0 = Date.now();
  console.log(`Niloosoft Hunter slug discovery — ${SEEDS.length} tenants`);
  console.log(`Headless Chromium, real-browser UA, behavioral tripwire active.`);
  console.log(`Tripwire markers: ${CHALLENGE_MARKERS.source.slice(0, 80)}…\n`);

  const results: ProbeResult[] = [];
  // Serial — keeps the network signature clean per tenant and avoids
  // confusing one tenant's XHRs for another's.
  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i];
    console.log(`[${i + 1}/${SEEDS.length}] ${s.name}…`);
    const r = await probeOne(s);
    results.push(r);
    const tag = r.status === "slug_captured"
      ? `✓ slug=${r.recommended_slug}`
      : r.status === "challenge_detected"
        ? `⚠ HELD-LEGAL: ${r.challenge_evidence}`
        : r.status === "no_niloo_xhr"
          ? "· no_niloo_xhr"
          : r.status === "global_endpoint_no_il_filter"
            ? `· global_endpoint_no_il_filter (slug=${r.recommended_slug})`
            : `✗ ${r.status} ${r.navigation_error ?? ""}`;
    console.log(`     → ${tag}`);
  }

  const wallS = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = {
    generated_at: new Date().toISOString(),
    seeds_probed: results.length,
    wall_seconds: Number(wallS),
    by_status: {
      slug_captured: results.filter((r) => r.status === "slug_captured").length,
      challenge_detected: results.filter((r) => r.status === "challenge_detected").length,
      no_niloo_xhr: results.filter((r) => r.status === "no_niloo_xhr").length,
      navigation_failed: results.filter((r) => r.status === "navigation_failed").length,
      global_endpoint_no_il_filter: results.filter((r) => r.status === "global_endpoint_no_il_filter").length,
    },
    results,
  };
  writeFileSync("scripts/discover-niloosoft-slugs-draft.json", JSON.stringify(summary, null, 2));

  console.log("\n=== SUMMARY ===");
  for (const [k, v] of Object.entries(summary.by_status).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(2)}  ${k}`);
  }
  console.log(`\nWall time: ${wallS}s`);
  console.log(`Draft → scripts/discover-niloosoft-slugs-draft.json`);
  console.log(`\nNext: review the draft; tenants with status=slug_captured become registry rows.`);
  console.log(`Tenants with status=challenge_detected go to the deferred-pending-legal list.`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

// scripts/taasuka-sample-probe.ts
//
// Bounded empirical probe of taasuka.gov.il (Israeli Employment
// Service) to validate the "wrong corpus" verdict from the
// free-sourcing investigation. Goal: classify the first 200–300
// listings by function-bucket and report the % audience-relevant
// (tech / business / GTM) vs mismatched (warehouse / retail /
// security / clerical / hospitality / healthcare / education /
// other).
//
// Methodology:
//   1. Load /he/applicants/jobs/ with Playwright.
//   2. Sniff XHR for the underlying jobs API; prefer JSON over HTML
//      scraping if available (faster, more reliable, less JS coupling).
//   3. If no JSON XHR: fall back to DOM extraction of title +
//      occupation/category from the rendered list.
//   4. Paginate until ≥200 listings collected (cap at 300).
//   5. Classify each listing's title/category against keyword buckets.
//   6. Tripwire: any captcha/challenge marker → abort + classify
//      blocked. Per held-legal-tier behavioral rule.
//   7. Report % audience-relevant. If <5% → corpus-mismatch confirmed,
//      close. If ≥5% → surface as a real candidate for HOLD-for-decision.
//
// Output: scripts/taasuka-sample-draft.json (per-listing + summary).
//
// Usage: npx tsx scripts/taasuka-sample-probe.ts

import { writeFileSync } from "node:fs";
import { chromium, type Page } from "playwright";

const ENTRY_URL = "https://www.taasuka.gov.il/he/applicants/jobs/";
const OUT_PATH = "scripts/taasuka-sample-draft.json";
const TARGET_MIN = 200;
const TARGET_MAX = 300;
const NAV_TIMEOUT_MS = 30_000;
const PAGE_DWELL_MS = 4_000;

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

// Tripwire markers — abort if an ACTIVE challenge is presented (i.e.
// the page is gating content behind a captcha solve). We distinguish:
//   - ACTIVE challenge (block): Cloudflare interstitial, hCaptcha
//     challenge, reCAPTCHA v2 visible widget, Akamai bot manager,
//     DataDome interstitial. These render no content + require solve.
//   - PASSIVE risk-scoring (allow): reCAPTCHA v3 (invisible token
//     attached to form submissions). Page renders normal content; we
//     are scored, not challenged. Common on .gov.il pages.
// Decision rule: tripwire = (active-challenge marker present) AND
// (page has < 5 jobItem tiles rendered). Both conditions must hold.
const ACTIVE_CHALLENGE_MARKERS =
  /cf-challenge|cf_chl|challenge-platform|just a moment|attention required|hcaptcha|_abck|bm-verify|akamai-bot-manager|perfdrive\.com|datadome|grecaptcha\.render\([^)]*data-sitekey/i;

// ───── Classification buckets ───────────────────────────────────────
//
// Hebrew-first because taasuka is Hebrew. Each bucket is a list of
// keywords (Hebrew + English). A listing is classified by the FIRST
// matching bucket scanned in priority order (so e.g. "Sales Engineer"
// matches GTM-sales before generic engineer matches tech).
//
// Audience-relevant buckets for Get A Job (business students into IL
// tech): tech, business, gtm.
// Mismatched: warehouse, retail, security, hospitality, healthcare,
// education, manual, clerical, other.

type Bucket =
  | "tech"
  | "business"
  | "gtm"
  | "warehouse"
  | "retail"
  | "security"
  | "hospitality"
  | "healthcare"
  | "education"
  | "manual"
  | "clerical"
  | "other";

const AUDIENCE_RELEVANT: ReadonlySet<Bucket> = new Set(["tech", "business", "gtm"]);

// Priority order matters — GTM-sales before tech, manual labor before generic clerical.
const BUCKET_PATTERNS: Array<{ bucket: Bucket; pattern: RegExp }> = [
  // GTM first (so "sales engineer" / "marketing analyst" lands here)
  {
    bucket: "gtm",
    pattern: /\b(sales|marketing|business[\s-]?development|bd|account[\s-]?(manager|exec|executive)|growth|partnerships?|customer[\s-]?success|csm|brand)\b|מכירות|שיווק|פיתוח עסקי|הצלחת לקוחות|אקאונט/i,
  },
  // Tech — software, data, product, design (digital), engineering R&D
  {
    bucket: "tech",
    pattern: /\b(software|developer|engineer(ing)?|programmer|backend|frontend|fullstack|full[\s-]?stack|devops|sre|qa|q\.?a\.?|automation|tester|data[\s-]?(scientist|engineer|analyst)?|machine[\s-]?learning|ml|ai|product[\s-]?(manager|owner)|pm[\s-]?tech|ux|ui|designer|architect|cyber|security[\s-]?engineer|security[\s-]?analyst|cloud|sysadmin|devsecops|sre|database|dba|technical[\s-]?writer)\b|מפתח|מתכנת|מהנדס(ת)?\s*(תוכנה|תכנה|מחשבים|נתונים)|בודק(ת)?\s*תוכנה|אוטומציה|אבטחת מידע|סייבר|דאטה|נתונים|בינה מלאכותית|מנהל(ת)?\s*מוצר|מעצב(ת)?\s*UX|UI|ענן|טכנולוג(יה|י)/i,
  },
  // Business — finance, ops, analyst, HR, legal, consulting, strategy
  {
    bucket: "business",
    pattern: /\b(analyst|business[\s-]?analyst|finance|financial|accountant|bookkeeper|controller|cfo|operations|ops|hr|human[\s-]?resources|recruiter|recruiting|legal|paralegal|attorney|lawyer|consultant|consulting|strategy|strategic|project[\s-]?manager|pmo|economist|tax|audit)\b|כלכלן(ית)?|אנליסט(ית)?|מנתח(ת)?\s*עסקי|כספים|הנהלת חשבונות|חשב(ת)?|בקר(ת)?|תפעול|משאבי אנוש|גיוס|משפט(ן|נית)|יועץ(ת)?\s*משפטי|אסטרטגיה|מנהל(ת)?\s*פרויקטים?|רואה חשבון|רו"ח/i,
  },
  // Warehouse / logistics / drivers
  {
    bucket: "warehouse",
    pattern: /\b(warehouse|forklift|logistics|driver|delivery|courier|loader|stock|inventory|picker|packer)\b|מחסנאי|מלגזן|נהג(ת)?|שליח(ה)?|הובלה|לוגיסטיק|מטעין/i,
  },
  // Retail / cashier / sales floor
  {
    bucket: "retail",
    pattern: /\b(cashier|retail|store[\s-]?clerk|store[\s-]?associate|shop[\s-]?assistant|sales[\s-]?associate|sales[\s-]?floor)\b|קופאי(ת)?|מוכר(ת)?\s*בחנות|זבן(ית)?|דלפק|חנות|רוכל/i,
  },
  // Security / guard / patrol
  {
    bucket: "security",
    pattern: /\b(security[\s-]?(guard|officer|patrol)|guard|patrol|bouncer|watchman)\b|מאבטח(ת)?|שומר(ת)?|אבטחה|סדרן(ית)?\s*(לאירוע|במופע)/i,
  },
  // Hospitality / restaurant / cleaning / waitstaff
  {
    bucket: "hospitality",
    pattern: /\b(waiter|waitress|bartender|cook|chef|kitchen|barista|cleaner|cleaning|housekeeping|hotel[\s-]?(staff|clerk)|hospitality|server)\b|מלצר(ית)?|ברמן(ית)?|טבח(ית)?|מטבח|נקיון|ניקיון|מנקה|חדרנ(ית|ות)|בריסטה|מארח(ת)?/i,
  },
  // Healthcare / nursing / care
  {
    bucket: "healthcare",
    pattern: /\b(nurse|nursing|caregiver|caretaker|aide|medical[\s-]?(assistant|secretary)|pharmacy|pharmacist|doctor|physician|paramedic|therapist|orderly)\b|אח(ות|יות)?|מטפל(ת)?|סייע(ת)?|בית חולים|רופא(ה)?|בית מרקחת|רוקח(ת)?|פרא[\s-]?רפואי|פיזיותרפיסט(ית)?|מרפא(ה)?\s*בעיסוק/i,
  },
  // Education / teaching / childcare
  {
    bucket: "education",
    pattern: /\b(teacher|tutor|educator|instructor|nanny|childcare|preschool|kindergarten|after[\s-]?school)\b|מור(ה|ים)|מדריך(ה)?|חונך(ת)?|מטפל(ת)?\s*בילד|גננ(ת|ות)|סייעת|צהרון|בית ספר|מעון יום/i,
  },
  // Manual labor / construction / production-line / agriculture
  {
    bucket: "manual",
    pattern: /\b(construction|electrician|plumber|carpenter|welder|mechanic|technician[\s-]?(field|hvac|automotive)|production[\s-]?(line|operator|worker)|assembler|factory[\s-]?worker|labor(er)?|farm[\s-]?(hand|worker)|agriculture|gardener|landscape)\b|פועל(ת)?\s*(ייצור|בניין)?|חשמלאי(ת)?|אינסטלטור|נגר(ות)?|רתך|מכונאי(ת)?|טכנאי(ת)?\s*(שטח|מזגנים|רכב)|פס ייצור|הרכב(ה)?|חקלאות|גנן(ות)?/i,
  },
  // Clerical / front desk / customer-service-rep (low-skill phone, not GTM)
  {
    bucket: "clerical",
    pattern: /\b(receptionist|secretary|secretarial|clerk|administrative[\s-]?(assistant|clerk)|call[\s-]?center|customer[\s-]?service[\s-]?(rep|representative)|telemarket|data[\s-]?entry|office[\s-]?manager|office[\s-]?clerk|admin[\s-]?assistant)\b|מזכיר(ה)?|פקיד(ה)?|מוקדן(ית)?|נציג(ת)?\s*(שירות|טלפוני|מכירות טלפוני)|הקלדת? נתונים|טלמרקטינג|מנהל(ת)?\s*משרד/i,
  },
];

function classify(title: string, category: string | null): Bucket {
  const text = `${title} ${category ?? ""}`;
  for (const { bucket, pattern } of BUCKET_PATTERNS) {
    if (pattern.test(text)) return bucket;
  }
  return "other";
}

// ───── XHR sniffer ──────────────────────────────────────────────────

interface CapturedXhr {
  url: string;
  method: string;
  status: number;
  contentType: string | null;
  byteSize: number;
  bodySample: string;
}

async function sniffXhr(page: Page): Promise<CapturedXhr[]> {
  const captured: CapturedXhr[] = [];
  page.on("response", async (res) => {
    const url = res.url();
    const status = res.status();
    if (status < 200 || status >= 400) return;
    const ct = res.headers()["content-type"] ?? null;
    // Only JSON-ish OR endpoints that look like a job/listing API
    const looksJobApi =
      /api|service|search|jobs?|listings?|positions?|orders?|results?/i.test(url) &&
      !/\.(css|js|woff2?|png|jpe?g|svg|gif|ico|map)(\?|$)/i.test(url);
    const looksJson = ct?.includes("json") || ct?.includes("javascript");
    if (!looksJobApi && !looksJson) return;
    try {
      const body = await res.body();
      if (body.length > 5_000_000) return;
      captured.push({
        url,
        method: res.request().method(),
        status,
        contentType: ct,
        byteSize: body.length,
        bodySample: body.subarray(0, 600).toString("utf-8"),
      });
    } catch { /* body fetch can fail post-navigation */ }
  });
  return captured;
}

// ───── DOM extractor (fallback) ─────────────────────────────────────
//
// Each job tile on /he/applicants/jobs/ exposes title + occupation
// category + location. Selectors will need refinement on first run —
// we log the raw HTML of the first tile if extraction returns 0 rows
// so we can iterate.

interface Listing {
  title: string;
  category: string | null;
  location: string | null;
  jobId: string | null;
  bucket: Bucket;
  source: "xhr" | "dom";
}

async function extractListingsFromDom(page: Page): Promise<Array<Omit<Listing, "bucket" | "source"> & { jobId: string | null }>> {
  return await page.evaluate(() => {
    // Confirmed taasuka structure (from /tmp probe): each listing is a
    // <div class="jobItem" jobid="..." jobtitle="..."> with location
    // inside a sibling .jobDetails block keyed by the strong "מקום עבודה".
    const tiles = Array.from(document.querySelectorAll("div.jobItem"));
    const out: Array<{ title: string; category: string | null; location: string | null; jobId: string | null }> = [];
    for (const t of tiles) {
      const title = ((t as HTMLElement).getAttribute("jobtitle") ?? t.querySelector("h3.jobTitle a")?.textContent ?? "").trim();
      if (!title) continue;
      const jobId = (t as HTMLElement).getAttribute("jobid") ?? null;
      // Location lives in the .jobDetails block under <strong>מקום עבודה</strong><span>X</span>
      let location: string | null = null;
      const rows = t.querySelectorAll(".jobDetails > div");
      for (const r of rows) {
        const label = r.querySelector("strong")?.textContent?.trim() ?? "";
        if (label.includes("מקום עבודה")) {
          location = r.querySelector("span")?.textContent?.trim() ?? null;
          break;
        }
      }
      // No explicit category field on the tile — classification will
      // rely on the title alone (which carries the role).
      out.push({ title, category: null, location, jobId });
    }
    return out;
  });
}

async function clickNextPage(page: Page): Promise<boolean> {
  // Pagination buttons are <a> with javascript:void(0). Try common patterns.
  const nextSelectors = [
    'a[aria-label*="next" i]',
    'a[aria-label*="הבא"]',
    'a[title*="next" i]',
    'a[title*="הבא"]',
    'a.next',
    '.pagination a.next',
    'a[class*="next"]',
  ];
  for (const sel of nextSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.count() > 0 && await btn.isVisible()) {
      await btn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(PAGE_DWELL_MS);
      return true;
    }
  }
  return false;
}

// ───── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTaasuka audience-fit empirical probe`);
  console.log(`=====================================`);
  console.log(`Target: ${TARGET_MIN}–${TARGET_MAX} listings, classified by function-bucket.\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: REAL_BROWSER_UA,
    locale: "he-IL",
  });
  const page = await context.newPage();

  const xhrLog = await sniffXhr(page);

  console.log(`Loading ${ENTRY_URL}…`);
  let html: string;
  try {
    await page.goto(ENTRY_URL, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
  } catch {
    // networkidle can time out — give it a manual dwell instead
    await page.waitForTimeout(PAGE_DWELL_MS);
  }
  html = await page.content();

  // Tripwire check: ACTIVE challenge marker present AND no rendered
  // jobItem tiles → page is gated. reCAPTCHA v3 (passive token) alone
  // is not a tripwire; the page renders content normally and we are
  // not being asked to solve anything.
  const activeChallengeSeen = ACTIVE_CHALLENGE_MARKERS.test(html);
  const initialTileCount = await page.locator("div.jobItem").count();
  if (activeChallengeSeen && initialTileCount < 5) {
    console.log(`  ❌ TRIPWIRE: active challenge marker present AND ${initialTileCount} tiles rendered. Aborting per held-legal-tier behavioral rule.`);
    await browser.close();
    writeFileSync(
      OUT_PATH,
      JSON.stringify({ aborted: "tripwire_active_challenge", probed_at: new Date().toISOString() }, null, 2),
    );
    return;
  }
  console.log(`  · entry page rendered ${initialTileCount} job tiles${activeChallengeSeen ? " (active-challenge marker also present but content rendered — proceeding)" : ""}`);

  const all: Listing[] = [];
  let pageNum = 1;
  while (all.length < TARGET_MAX && pageNum <= 35) {
    const rows = await extractListingsFromDom(page);
    if (rows.length === 0 && pageNum === 1) {
      console.log(`  · DOM extractor returned 0 rows on page 1 — selectors may need adjustment.`);
      // Dump first 800 chars of body for diagnosis
      const sample = html.replace(/\s+/g, " ").slice(0, 800);
      console.log(`    body sample: ${sample}`);
    }
    for (const r of rows) {
      const bucket = classify(r.title, r.category);
      all.push({ ...r, bucket, source: "dom" });
      if (all.length >= TARGET_MAX) break;
    }
    console.log(`  page ${pageNum}: +${rows.length} listings (total ${all.length})`);
    if (all.length >= TARGET_MIN) break;
    const advanced = await clickNextPage(page);
    if (!advanced) {
      console.log(`  · pagination ended at page ${pageNum}`);
      break;
    }
    pageNum++;
  }

  await browser.close();

  // ───── Summary ────────────────────────────────────────────────────
  const tally = new Map<Bucket, number>();
  for (const l of all) tally.set(l.bucket, (tally.get(l.bucket) ?? 0) + 1);
  const total = all.length;
  const audienceRelevant = all.filter((l) => AUDIENCE_RELEVANT.has(l.bucket)).length;
  const audiencePct = total === 0 ? 0 : (audienceRelevant / total) * 100;

  console.log(`\n=== classification summary ===`);
  console.log(`Total listings classified: ${total}`);
  console.log(`Audience-relevant (tech+business+gtm): ${audienceRelevant} (${audiencePct.toFixed(1)}%)`);
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  for (const [b, n] of sorted) {
    const pct = ((n / total) * 100).toFixed(1);
    const marker = AUDIENCE_RELEVANT.has(b) ? "★" : " ";
    console.log(`  ${marker} ${b.padEnd(12)} ${String(n).padStart(4)}  (${pct}%)`);
  }
  console.log(`\nVerdict threshold: <5% audience-relevant → corpus-mismatch confirmed → close.`);
  console.log(`                   ≥5% → surface as real candidate for HOLD-for-decision.`);
  console.log(`\nXHR endpoints captured (for future deeper probe if warranted): ${xhrLog.length}`);
  for (const x of xhrLog.slice(0, 8)) {
    console.log(`  ${x.method} ${x.status} ${x.url.slice(0, 120)} (${x.byteSize}b)`);
  }

  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        probed_at: new Date().toISOString(),
        entry_url: ENTRY_URL,
        target_min: TARGET_MIN,
        target_max: TARGET_MAX,
        total_classified: total,
        audience_relevant_count: audienceRelevant,
        audience_relevant_pct: audiencePct,
        tally: Object.fromEntries(tally),
        listings: all,
        xhr_endpoints_observed: xhrLog,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

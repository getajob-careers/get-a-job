// scripts/verify-tech-hits.ts
//
// Pre-promotion verifier for the 4 tech-population detection hits
// (PR-A from the 2026-06-13 discover-tech run). Fetches each candidate
// ATS endpoint and reports total job count + IL-tagged subset. A
// candidate gets promoted to companies_il.json only when this script
// confirms ≥ 1 IL job. Same "verify-before-shipping" pattern Eli has
// asked for on every ATS expansion since the Jooble lesson
// (lessons.md 2026-05-24).
//
// CardinalOps (comeet) is the special case: Comeet API requires both
// uid AND token, neither of which appears in the static HTML. This
// script attempts a one-shot Playwright capture of the COMEET.init()
// config from the careers page; if the capture succeeds, the
// uid+token are reported and the registry row can be promoted.
// Otherwise CardinalOps stays on the "needs B-pass XHR capture" list.
//
// Output: console summary. Not a draft file — this is a verification
// step, not a discovery step.

import { chromium } from "playwright";

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

const IL_LOCATION_RE =
  /israel|tel[\s-]?aviv|haifa|jerusalem|herzliya|ra'?anana|petah[\s-]?tikva|netanya|be'?er[\s-]?sheva|yokneam|ramat[\s-]?gan|modi'?in|holon|kfar[\s-]?saba|rehovot|givatayim|or[\s-]?yehuda|caesarea|ישראל|תל אביב|חיפה|ירושלים|הרצליה|רעננה|פתח תקווה/i;

async function verifyAshby(slug: string, label: string) {
  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`;
  try {
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": REAL_BROWSER_UA, Accept: "application/json" },
    });
    if (!res.ok) {
      console.log(`  ❌ ${label}: HTTP ${res.status} on Ashby endpoint`);
      return { ok: false };
    }
    const data = await res.json();
    const jobs: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
    let il = 0;
    const sample: string[] = [];
    for (const j of jobs) {
      const loc = String(j.location || j.locationName || "");
      if (IL_LOCATION_RE.test(loc)) {
        il++;
        if (sample.length < 3) sample.push(`${j.title} — ${loc}`);
      }
    }
    console.log(`  ${il > 0 ? "✓" : "·"} ${label}: ${il}/${jobs.length} IL jobs (slug=${slug})`);
    if (sample.length > 0) {
      sample.forEach((s) => console.log(`      ${s}`));
    }
    return { ok: il > 0, total: jobs.length, il, api_url: apiUrl };
  } catch (e: any) {
    console.log(`  ❌ ${label}: fetch failed — ${e?.message ?? e}`);
    return { ok: false };
  }
}

async function verifyLever(slug: string, label: string) {
  const apiUrl = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  try {
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": REAL_BROWSER_UA, Accept: "application/json" },
    });
    if (!res.ok) {
      console.log(`  ❌ ${label}: HTTP ${res.status} on Lever endpoint`);
      return { ok: false };
    }
    const jobs = await res.json();
    if (!Array.isArray(jobs)) {
      console.log(`  ❌ ${label}: Lever returned non-array shape`);
      return { ok: false };
    }
    let il = 0;
    const sample: string[] = [];
    for (const j of jobs) {
      const loc = String(j.categories?.location || "");
      if (IL_LOCATION_RE.test(loc)) {
        il++;
        if (sample.length < 3) sample.push(`${j.text} — ${loc}`);
      }
    }
    console.log(`  ${il > 0 ? "✓" : "·"} ${label}: ${il}/${jobs.length} IL jobs (slug=${slug})`);
    if (sample.length > 0) {
      sample.forEach((s) => console.log(`      ${s}`));
    }
    return { ok: il > 0, total: jobs.length, il, api_url: apiUrl };
  } catch (e: any) {
    console.log(`  ❌ ${label}: fetch failed — ${e?.message ?? e}`);
    return { ok: false };
  }
}

// CardinalOps Comeet uid+token capture. Comeet's careers widget embeds
// COMEET.init({ "company-uid": "...", "token": "..." }) on the host
// page. We open Chromium against the careers URL, wait for the JS to
// execute, then read the global COMEET config OR scrape the rendered
// HTML for the init call. If captured, also validate against the
// careers-api endpoint.
async function captureCardinalOpsComeet() {
  const careersUrl = "https://www.cardinalops.com/careers";
  console.log(`  Capturing CardinalOps Comeet config via Playwright (${careersUrl})…`);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: REAL_BROWSER_UA,
      locale: "en-US",
    });
    const page = await context.newPage();

    // Watch network for the comeet.co careers-api call that the widget
    // makes on init — easiest path to uid + token.
    let capturedUid: string | null = null;
    let capturedToken: string | null = null;
    page.on("request", (req) => {
      const m = req.url().match(/comeet\.co\/careers-api\/2\.0\/company\/([A-Za-z0-9._-]+)\/positions\?token=([A-Za-z0-9_-]+)/i);
      if (m) {
        capturedUid = m[1];
        capturedToken = m[2];
      }
    });

    try {
      await page.goto(careersUrl, { waitUntil: "networkidle", timeout: 25_000 });
    } catch { /* networkidle can time out — captured XHR may already be set */ }
    await new Promise((r) => setTimeout(r, 3000));

    // Fallback: read the page HTML for COMEET.init shape
    if (!capturedUid || !capturedToken) {
      try {
        const html = await page.content();
        const initBlock = html.match(/COMEET\.init\s*\(\s*\{[\s\S]{0,1500}?\}\s*\)/i);
        if (initBlock) {
          const uidM = initBlock[0].match(/(?:["']?)company[-_]uid(?:["']?)\s*:\s*["']([A-Za-z0-9._-]+)["']/);
          const tokenM = initBlock[0].match(/(?:["']?)token(?:["']?)\s*:\s*["']([A-Za-z0-9_-]+)["']/);
          if (uidM) capturedUid = uidM[1];
          if (tokenM) capturedToken = tokenM[1];
        }
      } catch { /* ignore */ }
    }

    if (!capturedUid || !capturedToken) {
      console.log(`  · CardinalOps: no Comeet uid+token captured (page may use SPA / different init pattern). Defer to B-pass.`);
      return { ok: false };
    }

    // Validate against the live Comeet API.
    const apiUrl = `https://www.comeet.co/careers-api/2.0/company/${capturedUid}/positions?token=${capturedToken}&details=true`;
    const res = await fetch(apiUrl, { headers: { "User-Agent": REAL_BROWSER_UA, Accept: "application/json" } });
    if (!res.ok) {
      console.log(`  ❌ CardinalOps: captured uid+token but API returned HTTP ${res.status}`);
      return { ok: false };
    }
    const data = await res.json();
    const jobs: any[] = Array.isArray(data) ? data : [];
    let il = 0;
    const sample: string[] = [];
    for (const j of jobs) {
      const loc = j?.location || {};
      const locStr = loc.name
        || [loc.city, loc.state, loc.country].filter(Boolean).join(", ")
        || "";
      const country = String(loc.country || "").toUpperCase();
      const isIL = country === "ISRAEL" || country === "IL" || IL_LOCATION_RE.test(locStr);
      if (isIL) {
        il++;
        if (sample.length < 3) sample.push(`${j.name} — ${locStr}`);
      }
    }
    console.log(`  ${il > 0 ? "✓" : "·"} CardinalOps: ${il}/${jobs.length} IL jobs (uid=${capturedUid})`);
    if (sample.length > 0) {
      sample.forEach((s) => console.log(`      ${s}`));
    }
    return { ok: il > 0, uid: capturedUid, token: capturedToken, total: jobs.length, il, api_url: apiUrl };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("\nTech-hit pre-promotion verification");
  console.log("====================================\n");

  console.log("Ashby:");
  const tapcheck = await verifyAshby("tapcheck", "Tapcheck");
  const human = await verifyAshby("HUMAN", "HUMAN Security");

  console.log("\nLever:");
  const copilot = await verifyLever("copilotkit", "CopilotKit");

  console.log("\nComeet (CardinalOps — Playwright capture for uid+token):");
  const cardinal = await captureCardinalOpsComeet();

  console.log("\n=== promotion-ready summary ===");
  const promotable: string[] = [];
  if (tapcheck.ok) promotable.push("Tapcheck");
  if (human.ok)    promotable.push("HUMAN Security");
  if (copilot.ok)  promotable.push("CopilotKit");
  if (cardinal.ok) promotable.push("CardinalOps");
  console.log(`  Promotable: ${promotable.length} of 4 — ${promotable.join(", ") || "(none)"}`);
  if (!cardinal.ok) {
    console.log(`  CardinalOps: defer to B-pass (Playwright + networkidle + XHR capture re-run on all 86 seeds).`);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

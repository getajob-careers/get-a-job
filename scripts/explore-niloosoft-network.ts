// Exploratory probe — for the 7 step-2 tenants that loaded cleanly but
// never fired the expected `niloo-server.herokuapp.com/actions-*-career`
// XHR, dump every XHR they DID fire. The goal is to find the actual
// careers-API URL pattern used by current Niloosoft Hunter tenants (the
// PwC endpoint comment in ats-fetchers.ts could be a stale Heroku
// pattern; the vendor may have moved).
//
// Output: scripts/explore-niloosoft-network-draft.json — for each tenant
// a list of every XHR (URL + method + status), grouped + deduped, so a
// reviewer can spot the careers-API call by inspection.

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const TENANTS = [
  { name: "AVNET",                careers_url: "https://www.avnet.com/wps/portal/us/about-avnet/careers/" },
  { name: "Egged",                careers_url: "https://www.egged.co.il/career/" },
  { name: "Keshet Te'amim",       careers_url: "https://www.keshet-teamim.co.il/career" },
  { name: "Motorola Solutions IL", careers_url: "https://www.motorolasolutions.com/en_xu/about/careers.html" },
  { name: "Psagot",                careers_url: "https://www.psagot.co.il/career/" },
  { name: "TechBuddy",             careers_url: "https://www.techbuddy.co.il/career" },
  { name: "Phoenix Insurance",     careers_url: "https://www.fnx.co.il/Career" },
];

const REAL_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

interface XHRRecord { method: string; url: string; status?: number; host: string; pathSnippet: string }

async function inspectOne(t: { name: string; careers_url: string }) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: REAL_UA, locale: "he-IL", viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const xhrs: XHRRecord[] = [];

  page.on("response", (res) => {
    const url = res.url();
    if (url.startsWith("data:")) return;
    try {
      const u = new URL(url);
      // Skip static asset noise
      if (/\.(png|jpg|jpeg|gif|svg|webp|woff2?|ttf|css|ico|map)(\?|$)/i.test(u.pathname)) return;
      xhrs.push({
        method: res.request().method(),
        url,
        status: res.status(),
        host: u.hostname,
        pathSnippet: u.pathname.slice(0, 80),
      });
    } catch { /* ignore */ }
  });

  try {
    await page.goto(t.careers_url, { waitUntil: "networkidle", timeout: 30000 });
  } catch { /* ignore */ }
  await new Promise((r) => setTimeout(r, 8000));

  await browser.close();

  // Highlight suspicious URLs: anything mentioning career/job/position/
  // vacancy or matching cross-domain non-CDN hosts.
  const suspicious = xhrs.filter((x) =>
    /career|jobs?|position|vacancy|recruit|hunter|niloo|graphql|api|action/i.test(x.url)
  );

  // Distinct hosts
  const distinctHosts = Array.from(new Set(xhrs.map((x) => x.host))).sort();

  return {
    name: t.name,
    careers_url: t.careers_url,
    total_xhrs: xhrs.length,
    distinct_hosts: distinctHosts,
    suspicious_xhrs: suspicious.slice(0, 60),
  };
}

async function main() {
  const results: any[] = [];
  for (let i = 0; i < TENANTS.length; i++) {
    const t = TENANTS[i];
    console.log(`[${i + 1}/${TENANTS.length}] ${t.name}…`);
    const r = await inspectOne(t);
    results.push(r);
    console.log(`     total XHRs: ${r.total_xhrs}, suspicious: ${r.suspicious_xhrs.length}`);
  }
  writeFileSync("scripts/explore-niloosoft-network-draft.json", JSON.stringify({
    generated_at: new Date().toISOString(),
    results,
  }, null, 2));
  console.log(`\nDraft → scripts/explore-niloosoft-network-draft.json`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

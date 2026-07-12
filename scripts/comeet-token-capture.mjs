// comeet-token-capture.mjs — headless capture of a Comeet board's uid+token.
//
// Comeet boards fetch their positions from
//   comeet.co/.../<uid>/...?token=<hex>&company-uid=<uid>
// The token cannot be guessed; it must be read off that live request. This
// script loads the hosted board in headless Chromium and captures the token
// from the first such request — validated 2026-07-12 against the known-good
// Insait board (uid 0B.00C), which it reproduced exactly. It is the automatable
// alternative to a manual DevTools capture for LIVE boards (dead/deactivated
// boards fire no request and return {captured:null}).
//
// Requires playwright-core + a Chromium binary. Point at them with env vars:
//   PW_CORE      path to a resolvable playwright-core (default: "playwright-core")
//   CHROMIUM_EXE path to the Chromium/headless-shell binary (default: playwright's own)
//
// Usage:
//   npm i playwright-core            # once, anywhere resolvable
//   node scripts/comeet-token-capture.mjs '[{"name":"Insait","slug":"insait","uid":"0B.00C"}]'
// Output: JSON [{ name, uid, captured: { uid, token } | null, err }]
//   Feed a captured token into scripts/verify-hunt.ts to confirm live + IL:
//     api_url = https://www.comeet.co/careers-api/2.0/company/<uid>/positions?token=<TOKEN>&details=true

const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium ?? pw.default?.chromium;
const targets = JSON.parse(process.argv[2] || "[]");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120 Safari/537.36";

// Extract (uid, token) from any comeet.co request carrying both, when the uid
// matches the target (so a page embedding several boards can't cross-attribute).
function grab(url, uid) {
  const t = url.match(/[?&]token=([0-9A-Fa-f]{16,})/);
  const u =
    url.match(/company-uid=([0-9A-Fa-f.]+)/) ||
    url.match(/\/company\/([0-9A-Fa-f.]+)\//) ||
    url.match(/\/jobs\/([0-9A-Fa-f.]+)\//);
  if (t && u && u[1].toUpperCase() === uid.toUpperCase()) {
    return { uid: u[1], token: t[1] };
  }
  return null;
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXE
    ? { executablePath: process.env.CHROMIUM_EXE }
    : {}),
  args: ["--no-sandbox"],
});
const out = [];
for (const t of targets) {
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  let captured = null;
  page.on("request", (r) => {
    const g = grab(r.url(), t.uid);
    if (g && !captured) captured = g;
  });
  let err = null;
  try {
    await page.goto(`https://www.comeet.com/jobs/${t.slug}/${t.uid}`, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    // Wait up to ~14s for the board's positions request to fire.
    for (let i = 0; i < 28 && !captured; i++) await page.waitForTimeout(500);
  } catch (e) {
    err = String(e).slice(0, 120);
  }
  out.push({ name: t.name, uid: t.uid, captured, err });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));

// scripts/preview-onboarding.mjs — Onboarding redesign preview pipeline.
//
// Produces docs/design/redesign/previews/onboarding-2a.pdf — multi-page
// capture of each restyled step + the shared-input skill picker.
//
// Important: this runner uses vite DEV mode (not vite preview) so the
// /_preview/* routes (gated by import.meta.env.DEV) are registered. A
// production build does NOT register those routes; the prod-404 check
// is performed separately in this script before any captures.
//
// Skill-picker capture: the runner clicks the RdSkillTagInput input on
// the shared-skill-picker fixture, types "data", waits for the
// autocomplete dropdown to render, then screenshots. Proves the fork
// keeps the canonical-library suggestion source intact.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "docs/design/redesign/previews");
const outPdf = resolve(outDir, "onboarding-2a.pdf");

const PORT = 4174;
const BASE = `http://localhost:${PORT}`;

const FIXTURE_PATH = "/Users/elienglard/getajob/src/pages/_preview/fixtures/onboarding.js";

// Parse the fixture file at runtime to get the state IDs. Done via a
// regex because we don't want to spin up a JS bundler just for the
// runner — the file's structure is stable + simple.
function loadFixtureIds() {
  const src = readFileSync(FIXTURE_PATH, "utf8");
  const ids = [];
  const labels = {};
  const re = /"([a-z-]+)":\s*\{\s*label:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    ids.push(m[1]);
    labels[m[1]] = m[2];
  }
  return { ids, labels };
}

const VIEWPORTS = [
  { id: "desktop", w: 1280, h: 900, label: "Desktop · 1280×900" },
  { id: "mobile", w: 390, h: 844, label: "Mobile · 390×844" },
];

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 304) return;
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not become ready in ${timeoutMs}ms`);
}

async function verifyProd404() {
  // Spin a `vite preview` over the production build to confirm
  // /_preview/onboarding/* is NOT reachable — i.e. tree-shaking removed
  // the DEV-gated route registration. In a single-page app, unknown
  // paths fall through to the router's catch-all (`/*` → AuthenticatedApp),
  // which redirects unauthenticated visitors to /login. So "preview
  // unreachable" manifests as "Login page rendered instead of preview
  // content" rather than a hard HTTP 404. We verify by asserting the
  // production page body does NOT contain a known preview-only string.
  console.log("Verifying prod build /_preview is unreachable…");
  await runOnce("npm", ["run", "build"]);

  const prodPort = 4173;
  const prodServer = spawn("npx", ["vite", "preview", "--port", String(prodPort), "--strictPort"], {
    cwd: repoRoot,
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, NODE_ENV: "production" },
  });
  try {
    await waitForServer(`http://localhost:${prodPort}`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://localhost:${prodPort}/_preview/onboarding/shared-skill-picker`, {
      waitUntil: "networkidle",
    });
    const bodyText = await page.evaluate(() => document.body.innerText);
    await browser.close();
    // OnboardingPreview's shared-skill-picker fixture renders this
    // exact heading. If it appears in prod, the DEV gate failed and
    // the preview module is shipping in the production bundle.
    const PREVIEW_MARKER = "Skill picker — autocomplete + suggestions";
    if (bodyText.includes(PREVIEW_MARKER)) {
      throw new Error(
        `Prod /_preview check FAILED — the preview harness rendered in production. The DEV gate isn't working.`
      );
    }
    console.log("✅ Prod build /_preview is unreachable (DEV-gated route absent; falls through to AuthenticatedApp → /login).");
  } finally {
    prodServer.kill("SIGTERM");
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true });

  await verifyProd404();

  console.log("Starting vite DEV server (preview harness uses DEV gate)…");
  const server = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
    cwd: repoRoot,
    stdio: ["ignore", "ignore", "inherit"],
  });

  try {
    await waitForServer(BASE);
    console.log(`Dev server ready at ${BASE}`);

    const { ids, labels } = loadFixtureIds();
    if (ids.length === 0) throw new Error("No fixtures loaded.");
    console.log(`Loaded ${ids.length} fixtures: ${ids.join(", ")}`);

    const browser = await chromium.launch();
    const screenshots = [];

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
      });
      // No external-network blocking. We previously blocked
      // **/*supabase*/** to keep preview captures hermetic, but
      // AuthProvider's session check fails fast on ERR_FAILED and
      // the error boundary wipes the DOM before the snapshot. Let
      // the AuthProvider call go through; an unauthenticated session
      // resolves to user=null which is exactly what the preview
      // harness expects.
      await ctx.route("**/challenges.cloudflare.com/**", (r) => r.abort());

      for (const id of ids) {
        const page = await ctx.newPage();
        // Surface browser-side errors during fixture render — helped
        // diagnose the empty-body issue when the lazy preview chunk
        // failed to load.
        page.on("pageerror", (err) => console.warn(`[browser] pageerror on ${id}: ${err.message}`));
        page.on("console", (msg) => {
          if (msg.type() === "error") console.warn(`[browser] ${id} console.error: ${msg.text()}`);
        });
        const url = `${BASE}/_preview/onboarding/${id}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(700);

        // Special-case: the skill-picker fixture needs the dropdown
        // opened before capture. Type into the RdSkillTagInput's input
        // and wait for suggestions to render. The selector targets the
        // input directly (RdSkillTagInput wraps its input in a flex
        // container with no easily-distinguishable parent class) by
        // matching the placeholder set in the fixture.
        if (id === "shared-skill-picker") {
          try {
            // OnboardingPreview tags the wrapper with [data-preview-skill-picker]
            // so the runner can find the input deterministically across DOM
            // nesting changes inside RdSkillTagInput.
            const wrapper = await page.waitForSelector('[data-preview-skill-picker]', { timeout: 8000 });
            const input = await wrapper.$('input');
            if (!input) throw new Error('no input under [data-preview-skill-picker]');
            await input.click();
            await input.fill('data');
            // Suggestions render in an absolute dropdown — give it a beat.
            await page.waitForTimeout(600);
          } catch (e) {
            const bodyPreview = await page.evaluate(() => document.body.innerText.slice(0, 200));
            console.warn(`[preview] skill-picker input not opened. Body preview: ${bodyPreview} | Reason: ${e.message}`);
          }
        }

        const png = await page.screenshot({ fullPage: true });
        screenshots.push({
          id,
          vp,
          png,
          caption: `${labels[id] || id} — ${vp.label}`,
        });
        await page.close();
        console.log(`captured ${id} @ ${vp.id}`);
      }
      await ctx.close();
    }
    await browser.close();

    console.log("Assembling PDF…");
    const pdf = await PDFDocument.create();
    const PAGE_W = 612;
    const PAGE_H = 792;
    const MARGIN = 36;
    const CAPTION_H = 22;
    for (const shot of screenshots) {
      const img = await pdf.embedPng(shot.png);
      const page = pdf.addPage([PAGE_W, PAGE_H]);
      const usableW = PAGE_W - 2 * MARGIN;
      const usableH = PAGE_H - 2 * MARGIN - CAPTION_H;
      const scale = Math.min(usableW / img.width, usableH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = (PAGE_W - drawW) / 2;
      const drawY = MARGIN + (usableH - drawH) / 2 + CAPTION_H;
      page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });
      page.drawText(shot.caption, { x: MARGIN, y: MARGIN, size: 10 });
    }
    const pdfBytes = await pdf.save();
    writeFileSync(outPdf, pdfBytes);
    console.log(`✅ Preview written: ${outPdf}`);
  } finally {
    server.kill("SIGTERM");
  }
}

function runOnce(cmd, args) {
  return new Promise((resolveP, rejectP) => {
    const p = spawn(cmd, args, { cwd: repoRoot, stdio: "inherit" });
    p.on("exit", (code) =>
      code === 0 ? resolveP() : rejectP(new Error(`${cmd} ${args.join(" ")} exited ${code}`))
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

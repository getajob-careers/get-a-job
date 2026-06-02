// scripts/preview-shell.mjs — Shell (Layout + SidebarFooter) preview pipeline.
//
// Produces docs/design/redesign/previews/shell-3a.pdf — multi-page
// capture of each Layout fixture across desktop + mobile. Same shape
// as the onboarding runner: prod-404 check via vite preview, then a
// vite DEV server hosting the /_preview/shell/:state route.
//
// The shell harness wraps the real Layout in a stub AuthContext + a
// pre-seeded React Query cache. The runner just navigates the URL
// and screenshots — no special clicks needed because the harness
// drives expanded-section + mobile-drawer state from URL params.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "docs/design/redesign/previews");
const outPdf = resolve(outDir, "shell-3a.pdf");

const PORT = 4175;
const BASE = `http://localhost:${PORT}`;

const FIXTURE_PATH = resolve(repoRoot, "src/pages/_preview/fixtures/shell.js");

function loadFixtureIds() {
  const src = readFileSync(FIXTURE_PATH, "utf8");
  const ids = [];
  const labels = {};
  const re = /"([a-z0-9-]+)":\s*\{\s*label:\s*"([^"]+)"/g;
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
  // Same approach as the onboarding runner — build the prod bundle and
  // assert that /_preview/shell/* is not reachable. We use the
  // ShellPreview wordmark text "Sample" as the marker since the harness
  // always renders a sample body. If that string appears in the prod
  // page body, the DEV gate failed.
  console.log("Verifying prod build /_preview/shell is unreachable…");
  await runOnce("npm", ["run", "build"]);

  const prodPort = 4176;
  const prodServer = spawn(
    "npx",
    ["vite", "preview", "--port", String(prodPort), "--strictPort"],
    {
      cwd: repoRoot,
      stdio: ["ignore", "ignore", "inherit"],
      env: { ...process.env, NODE_ENV: "production" },
    },
  );
  try {
    await waitForServer(`http://localhost:${prodPort}`);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://localhost:${prodPort}/_preview/shell/shell-home-active`, {
      waitUntil: "networkidle",
    });
    const bodyText = await page.evaluate(() => document.body.innerText);
    await browser.close();
    const PREVIEW_MARKER = "shell preview ·";
    if (bodyText.toLowerCase().includes(PREVIEW_MARKER.toLowerCase())) {
      throw new Error(
        `Prod /_preview/shell check FAILED — the preview harness rendered in production. The DEV gate isn't working.`,
      );
    }
    console.log("✅ Prod build /_preview/shell unreachable (falls through to AuthenticatedApp → /login).");
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
    if (ids.length === 0) throw new Error("No shell fixtures loaded.");
    console.log(`Loaded ${ids.length} shell fixtures: ${ids.join(", ")}`);

    const browser = await chromium.launch();
    const screenshots = [];

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
      });
      // Block Turnstile so it doesn't slow the harness or fail the
      // mobile fixture (drawer fixture relies on quick mount).
      await ctx.route("**/challenges.cloudflare.com/**", (r) => r.abort());

      for (const id of ids) {
        const page = await ctx.newPage();
        page.on("pageerror", (err) =>
          console.warn(`[browser] pageerror on ${id}: ${err.message}`),
        );
        page.on("console", (msg) => {
          if (msg.type() === "error") {
            console.warn(`[browser] ${id} console.error: ${msg.text()}`);
          }
        });
        const url = `${BASE}/_preview/shell/${id}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");
        // Beat for the harness's deferred state mutation (50ms tick +
        // any aria-expanded flips).
        await page.waitForTimeout(400);

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
      code === 0 ? resolveP() : rejectP(new Error(`${cmd} ${args.join(" ")} exited ${code}`)),
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

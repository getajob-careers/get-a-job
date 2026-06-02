// scripts/preview-linkedin.mjs — LinkedIn 3J-A preview pipeline.
//
// Same shape as the prior runners: build prod, boot vite preview,
// confirm /_preview/linkedin/* is unreachable in prod; then start vite
// DEV and screenshot each Profile-tab fixture across desktop + mobile.
// Output → docs/design/redesign/previews/linkedin-3ja.pdf.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "docs/design/redesign/previews");
const outPdf = resolve(outDir, "linkedin-3ja.pdf");

const PORT = 4197;
const BASE = `http://localhost:${PORT}`;

const FIXTURE_PATH = resolve(repoRoot, "src/pages/_preview/fixtures/linkedin.js");

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
  console.log("Verifying prod build /_preview/linkedin is unreachable…");
  await runOnce("npm", ["run", "build"]);

  const prodPort = 4198;
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
    await page.goto(`http://localhost:${prodPort}/_preview/linkedin/linkedin-profile-optimized`, {
      waitUntil: "networkidle",
    });
    const bodyText = await page.evaluate(() => document.body.innerText);
    await browser.close();
    const MARKERS = [
      "Build your presence — profile, posts, outreach.",
      "Profile optimizer",
      "Apply section by section",
    ];
    if (MARKERS.some((m) => bodyText.includes(m))) {
      throw new Error(
        "Prod /_preview/linkedin check FAILED — LinkedIn rendered in production. The DEV gate isn't working.",
      );
    }
    console.log("Prod build /_preview/linkedin unreachable (falls through to AuthenticatedApp -> /login).");
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
    if (ids.length === 0) throw new Error("No linkedin fixtures loaded.");
    console.log(`Loaded ${ids.length} linkedin fixtures: ${ids.join(", ")}`);

    const browser = await chromium.launch();
    const screenshots = [];

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
      });
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
        const url = `${BASE}/_preview/linkedin/${id}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");
        // Beat for the hydration fetch + post-mount DOM driver to fire
        // its two passes (toggle / refine-open / generate-click).
        await page.waitForTimeout(900);

        const png = await page.screenshot({ fullPage: true });
        screenshots.push({
          id,
          vp,
          png,
          caption: `${labels[id] || id} - ${vp.label}`,
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
      const safeCaption = shot.caption.replace(/[^\x20-\x7E]+/g, "").trim();
      page.drawText(safeCaption, { x: MARGIN, y: MARGIN, size: 10 });
    }
    const pdfBytes = await pdf.save();
    writeFileSync(outPdf, pdfBytes);
    console.log(`Preview written: ${outPdf}`);
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

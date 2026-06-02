// scripts/preview-resources.mjs — Resources (PR 3M) preview pipeline.
// Loads `resources-*` fixtures and writes
// docs/design/redesign/previews/resources-3m.pdf.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "docs/design/redesign/previews");
const outPdf = resolve(outDir, "resources-3m.pdf");

const PORT = 4199;
const BASE = `http://localhost:${PORT}`;

const FIXTURE_PATH = resolve(repoRoot, "src/pages/_preview/fixtures/resources.js");

function loadFixtureIds() {
  const src = readFileSync(FIXTURE_PATH, "utf8");
  const ids = [];
  const labels = {};
  const re = /"([a-z0-9-]+)":\s*\{\s*label:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (!m[1].startsWith("resources-")) continue;
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
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not become ready in ${timeoutMs}ms`);
}

async function verifyProd404() {
  console.log("Verifying prod build /_preview/resources is unreachable…");
  await runOnce("npm", ["run", "build"]);

  const prodPort = 4200;
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
    await page.goto(
      `http://localhost:${prodPort}/_preview/resources/resources-default`,
      { waitUntil: "networkidle" },
    );
    const bodyText = await page.evaluate(() => document.body.innerText);
    await browser.close();
    const MARKERS = [
      "Structured guides on how hiring actually works.",
      "LinkedIn Networking",
      "How to Read a Job Description",
    ];
    if (MARKERS.some((m) => bodyText.includes(m))) {
      throw new Error(
        "Prod /_preview/resources check FAILED — Resources rendered in production. The DEV gate isn't working.",
      );
    }
    console.log("Prod build /_preview/resources unreachable (falls through to AuthenticatedApp -> /login).");
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
    if (ids.length === 0) throw new Error("No resources-* fixtures loaded.");
    console.log(`Loaded ${ids.length} resources fixtures: ${ids.join(", ")}`);

    const browser = await chromium.launch();
    const screenshots = [];

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
      });

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
        const url = `${BASE}/_preview/resources/${id}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");
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

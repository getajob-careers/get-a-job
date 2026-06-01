// scripts/preview-login.mjs — Redesign preview pipeline for /login.
//
// Produces docs/design/redesign/previews/login.pdf with 8 screenshots
// (4 states × 2 viewports) so the redesign can be reviewed without
// running the app. See tasks/redesign.md rule #2.
//
// States captured:
//   1. signin   — /login
//   2. signup   — /login?mode=signup
//   3. forgot   — /login?mode=forgot
//   4. waitlist — /login?mode=signup&preview=waitlist
//      (preview hatch — Login.jsx initializes waitlistMode=true so the
//      design can be captured without hitting the live redeem_invite_code
//      RPC).
//
// Viewports:
//   - desktop: 1280×900
//   - mobile:  390×844
//
// Turnstile (Cloudflare) is blocked at the network layer so it doesn't
// render its iframe — the surrounding chrome captures cleanly.
//
// Usage: `node scripts/preview-login.mjs` (vite preview server is started
// internally on port 4173; killed at exit).

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "docs/design/redesign/previews");
const outPdf = resolve(outDir, "login.pdf");

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

const STATES = [
  { id: "signin", label: "Sign in", path: "/login" },
  { id: "signup", label: "Sign up", path: "/login?mode=signup" },
  { id: "forgot", label: "Forgot password", path: "/login?mode=forgot" },
  { id: "waitlist", label: "Inline waitlist", path: "/login?mode=signup&preview=waitlist" },
];
const VIEWPORTS = [
  { id: "desktop", w: 1280, h: 900, label: "Desktop · 1280×900" },
  { id: "mobile", w: 390, h: 844, label: "Mobile · 390×844" },
];

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server at ${url} did not become ready in ${timeoutMs}ms`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });

  // Build first so vite preview serves the production bundle.
  console.log("Building production bundle…");
  await runOnce("npm", ["run", "build"]);

  console.log("Starting vite preview…");
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    cwd: repoRoot,
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, NODE_ENV: "production" },
  });

  try {
    await waitForServer(BASE);
    console.log(`Server ready at ${BASE}`);

    const browser = await chromium.launch();
    const screenshots = [];

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 2,
      });
      // Block Cloudflare Turnstile so the iframe doesn't churn during
      // capture — we want the surrounding chrome.
      await ctx.route("**/challenges.cloudflare.com/**", (route) => route.abort());
      await ctx.route("**/cdn-cgi/challenge-platform/**", (route) => route.abort());

      for (const state of STATES) {
        const page = await ctx.newPage();
        await page.goto(`${BASE}${state.path}`, { waitUntil: "networkidle" });
        // Give Rokkitt a beat to swap in if the connection was slow.
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(400);
        const png = await page.screenshot({ fullPage: true });
        screenshots.push({
          state,
          vp,
          png,
          caption: `${state.label} — ${vp.label}`,
        });
        await page.close();
        console.log(`captured ${state.id} @ ${vp.id}`);
      }

      await ctx.close();
    }

    await browser.close();

    // Assemble PDF: one screenshot per page, scaled to fit Letter w/ a
    // muted caption strip. Use PDFDocument from pdf-lib.
    console.log("Assembling PDF…");
    const pdf = await PDFDocument.create();
    const PAGE_W = 612;   // US Letter pt
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
      page.drawText(shot.caption, {
        x: MARGIN,
        y: MARGIN,
        size: 10,
        color: undefined, // default black
      });
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

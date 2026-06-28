// scripts/cv-harness/harness.mjs — CV template verification harness.
//
//   node scripts/cv-harness/harness.mjs [templateId]   (default: modern)
//
// Defines "the downloaded PDF matches the on-screen studio preview" as a set of
// automated gates, so the renderer step (Step B+) is GATED, not eyeballed. For a
// template id it:
//   1. Playwright-screenshots a faithful .cv-doc preview at A4 width.
//   2. Renders the PDF via the REAL buildCvPdf (deno render-pdf.ts) + rasterizes
//      page 1 with `sips`.
//   3. Runs gates PDF-vs-spec (the spec = the studio template tokens, which the
//      preview also renders): accent color at the section-label, banner/top-band
//      layout, rule line present/absent, label casing, serif/sans font.
//   4. Emits a side-by-side PNG for the eyeball + an overall PASS/FAIL.
//
// PROOF OF DISCRIMINATION: run against TODAY's renderer (still the dark-banner,
// template id ignored) — the accent/layout/rule gates MUST FAIL for "modern",
// because the current PDF matches no clean-white template. That failing run is
// the proof the harness rejects wrong output before we build the renderer.

import { chromium } from "../../node_modules/playwright/index.mjs";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(HERE, "fixture.json"), "utf8"));

// ── Template specs derived from the REAL source of truth (cvTemplates.js, the
//    same module CVStudioView imports) — no hand-copy, so the harness can't
//    drift from the studio. The five kept templates per the rendering spec. ──
import { CV_TEMPLATES } from "../../src/components/cv-studio/cvTemplates.js";

const KEPT = ["modern", "editorial", "sharp", "executive", "refined"];
// Derive serif/sans from the CSS family stack ("sans-serif" contains "serif",
// so test sans-serif/monospace first).
const fontKind = (css) =>
  /sans-serif/.test(css)
    ? "sans"
    : /monospace/.test(css)
      ? "mono"
      : /serif/.test(css)
        ? "serif"
        : "sans";

const byId = Object.fromEntries(CV_TEMPLATES.map((t) => [t.id, t]));
const TEMPLATES = Object.fromEntries(
  KEPT.map((id) => {
    const t = byId[id];
    return [
      id,
      {
        accent: t.accent,
        rule: t.rule,
        labelCase: t.labelCase,
        font: fontKind(t.font),
      },
    ];
  }),
);
const FONT_CSS = Object.fromEntries(KEPT.map((id) => [id, byId[id].font]));

// ── colour helpers ──
const hexToRgb = (h) => {
  const c = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lightness = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const isBg = (px) => lightness(px) > 0.82; // white page / cream

// ── 1. preview screenshot (faithful .cv-doc; CSS mirrors CvStudioStyles) ──
function previewHtml(t) {
  const accent = TEMPLATES[t].accent;
  const ruleBg = TEMPLATES[t].rule
    ? `color-mix(in srgb, ${accent} 35%, transparent)`
    : "transparent";
  const exp = (e, org) =>
    `<div class="ent"><span class="t">${e.title}</span> · <span>${e[org] ?? ""}</span><span class="d">${e.dates}</span>
       <ul>${e.bullets.map((b) => `<li><span class="dot"></span>${b}</li>`).join("")}</ul></div>`;
  const section = (label, body) =>
    `<div class="sec"><span>${label}</span><span class="rule"></span></div>${body}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#eee}
    .cv-doc{width:720px;background:#fff;padding:44px 48px;font-family:${FONT_CSS[t]};color:#33312E;
      --accent:${accent};--ink:#1A1A1A;--muted:#8A8782}
    .name{font-size:28px;font-weight:700;color:var(--ink);line-height:1.1}
    .headline{font-size:14px;font-weight:600;color:var(--muted);margin-top:2px}
    .contact{font-size:12.5px;margin-top:8px;color:#33312E}
    .sec{display:flex;align-items:center;gap:12px;margin:22px 0 9px;font-size:11.5px;font-weight:700;
      letter-spacing:.11em;text-transform:${TEMPLATES[t].labelCase};color:var(--accent)}
    .rule{flex:1;height:1px;background:${ruleBg}}
    .ent{margin-bottom:10px;font-size:13px}
    .ent .t{font-weight:600;color:var(--ink)} .ent .d{float:right;color:var(--muted);font-size:12px}
    .ent ul{margin:4px 0 0;padding:0;list-style:none}
    .ent li{font-size:12.5px;line-height:1.5;color:#33312E;display:flex;gap:8px;align-items:flex-start;margin-top:2px}
    .dot{width:4px;height:4px;border-radius:50%;background:var(--accent);margin-top:7px;flex:none}
  </style></head><body><div class="cv-doc" id="doc">
    <div class="name">${fixture.header.name}</div>
    <div class="headline">${fixture.header.subtitle}</div>
    <div class="contact">${fixture.header.email} · ${fixture.header.linkedin} · ${fixture.header.location}</div>
    ${section("Summary", `<div class="contact">${fixture.summary}</div>`)}
    ${section("Education", fixture.education.map((e) => `<div class="ent"><span class="t">${e.institution}</span> · ${e.degree} in ${e.field_of_study}<span class="d">${e.dates}</span></div>`).join(""))}
    ${section("Experience", fixture.professional_experiences.map((e) => exp(e, "company")).join(""))}
    ${section("Military Service", fixture.military_experiences.map((e) => exp(e, "unit")).join(""))}
    ${section("Volunteering", fixture.volunteering_experiences.map((e) => exp(e, "organization")).join(""))}
    ${section("Skills", `<div class="contact">${fixture.skills.domain.concat(fixture.skills.tools, fixture.skills.technical).join(" · ")}</div>`)}
  </div></body></html>`;
}

async function shootPreview(t, out) {
  const browser = await chromium.launch();
  const page = await browser
    .newContext({ deviceScaleFactor: 1 })
    .then((c) => c.newPage());
  await page.setViewportSize({ width: 820, height: 1160 });
  await page.setContent(previewHtml(t), { waitUntil: "networkidle" });
  await page.locator("#doc").screenshot({ path: out });
  await browser.close();
}

// ── 2. PDF render (real buildCvPdf via deno) + rasterize via sips ──
function renderPdf(t, pdfOut) {
  execFileSync("deno", ["run", "-A", join(HERE, "render-pdf.ts"), t, pdfOut], {
    stdio: "pipe",
  });
}
function rasterize(pdf, png) {
  execFileSync("sips", ["-s", "format", "png", pdf, "--out", png], {
    stdio: "pipe",
  });
}

// ── pixel access ──
async function pixels(png) {
  const img = await loadImage(png);
  const cv = createCanvas(img.width, img.height);
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  return {
    w: img.width,
    h: img.height,
    at: (x, y) => {
      const i = (Math.round(y) * img.width + Math.round(x)) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    },
  };
}

// Cluster pdfjs per-character text items into heading lines, return their
// baseline coords (PDF pt, origin bottom-left) so we can sample the raster.
async function headingLines(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const rows = new Map();
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const x = it.transform[4],
      y = it.transform[5];
    const key = Math.round(y);
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push({ x, y, s: it.str, font: it.fontName });
  }
  const lines = [];
  for (const [, items] of rows) {
    items.sort((a, b) => a.x - b.x);
    lines.push({
      text: items
        .map((i) => i.s)
        .join("")
        .trim(),
      x: items[0].x,
      y: items[0].y,
      font: items[0].font,
    });
  }
  return { lines, pageW: vp.width, pageH: vp.height };
}

// Sample the actual rendered ink colour of a heading: scan a box around its
// first glyphs and average the DARKEST ~30% of the non-background pixels — the
// glyph cores. Averaging all non-bg pixels would blend in the anti-aliased
// fringe (which fades toward the white page) and lighten the reading; the cores
// are the true ink colour. Still discriminates (slate cores vs accent cores).
function sampleTextColor(px, scale, pageH, line) {
  const cx = line.x * scale;
  const cy = (pageH - line.y) * scale;
  const pts = [];
  for (let dx = 0; dx < 90 * scale; dx++) {
    for (let dy = -14 * scale; dy < 3 * scale; dy++) {
      const p = px.at(cx + dx, cy + dy);
      if (!isBg(p)) pts.push(p);
    }
  }
  if (!pts.length) return null;
  pts.sort((a, b) => lightness(a) - lightness(b));
  const core = pts.slice(0, Math.max(1, Math.floor(pts.length * 0.3)));
  const acc = core.reduce(
    (s2, p) => [s2[0] + p[0], s2[1] + p[1], s2[2] + p[2]],
    [0, 0, 0],
  );
  return acc.map((v) => v / core.length);
}

// ── 3. gates ──
async function runGates(t, previewPng, pdfPng, pdfPath) {
  const spec = TEMPLATES[t];
  const expAccent = hexToRgb(spec.accent);
  const px = await pixels(pdfPng);
  const { lines, pageW, pageH } = await headingLines(pdfPath);
  const scale = px.w / pageW;
  const findHeading = (token) =>
    lines.find((l) =>
      l.text
        .toUpperCase()
        .replace(/[^A-Z ]/g, "")
        .includes(token),
    );
  const eduHeading =
    findHeading("EDUCATION") ||
    findHeading("EXPERIENCE") ||
    findHeading("SKILLS");

  const gates = [];

  // (a) ACCENT — the section label must be the template accent colour.
  const labelColor = eduHeading
    ? sampleTextColor(px, scale, pageH, eduHeading)
    : null;
  const accentDist = labelColor ? dist(labelColor, expAccent) : Infinity;
  gates.push({
    gate: "accent",
    expected: spec.accent,
    actual: labelColor
      ? `rgb(${labelColor.map((v) => Math.round(v)).join(",")})`
      : "—",
    pass: accentDist < 48,
  });

  // (b) LAYOUT / BANNER — clean-white templates have a LIGHT top band (dark name
  //     on white). The retired dark-banner fills the top with slate.
  const topStrip = [];
  for (let x = px.w * 0.2; x < px.w * 0.8; x += 6)
    topStrip.push(px.at(x, 14 * scale));
  const topLight =
    topStrip.reduce((s, p) => s + lightness(p), 0) / topStrip.length;
  gates.push({
    gate: "layout(top band light, no banner)",
    expected: "light (>0.7)",
    actual: topLight.toFixed(2),
    pass: topLight > 0.7,
  });

  // (c) RULE — accent rule line to the RIGHT of the section label (the .cv-doc
  //     space the label doesn't occupy). Present iff the template specifies it.
  let ruleSeen = false;
  if (eduHeading) {
    const ry = (pageH - eduHeading.y) * scale - 5 * scale;
    let nonBg = 0,
      tot = 0;
    for (let x = px.w * 0.55; x < px.w * 0.9; x += 2) {
      tot++;
      if (!isBg(px.at(x, ry))) nonBg++;
    }
    ruleSeen = nonBg / tot > 0.5;
  }
  gates.push({
    gate: "rule line",
    expected: String(spec.rule),
    actual: String(ruleSeen),
    pass: ruleSeen === spec.rule,
  });

  // (d) CASING — the rendered heading text casing must match labelCase.
  const headingText = eduHeading?.text ?? "";
  const isUpper =
    headingText === headingText.toUpperCase() && /[A-Z]/.test(headingText);
  const caseOk = spec.labelCase === "uppercase" ? isUpper : !isUpper;
  gates.push({
    gate: "label casing",
    expected: spec.labelCase,
    actual: headingText ? (isUpper ? "uppercase" : "mixed") : "—",
    pass: caseOk,
  });

  // (e) FONT — serif vs sans. Subset-embedded font names are often opaque in
  //     pdfjs; best-effort by name, else indeterminate (not a discriminator for
  //     'modern' anyway — the accent/layout/rule gates carry the proof).
  const fontName = (eduHeading?.font || "").toLowerCase();
  let fontVerdict;
  if (/serif|times|georgia|garamond|tinos|gelasio/.test(fontName))
    fontVerdict = "serif";
  else if (/sans|arial|helvetica|arimo|inter/.test(fontName))
    fontVerdict = "sans";
  else fontVerdict = "indeterminate";
  gates.push({
    gate: "font (serif/sans)",
    expected: spec.font,
    actual: `${fontVerdict} [${eduHeading?.font ?? "?"}]`,
    pass: fontVerdict === "indeterminate" ? null : fontVerdict === spec.font,
  });

  return gates;
}

// ── side-by-side composite for the eyeball ──
async function sideBySide(previewPng, pdfPng, out) {
  const a = await loadImage(previewPng);
  const b = await loadImage(pdfPng);
  const h = Math.max(a.height, b.height);
  const pad = 24;
  const cv = createCanvas(a.width + b.width + pad * 3, h + 60);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#ddd";
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = "#000";
  ctx.font = "18px sans-serif";
  ctx.fillText("PREVIEW (spec)", pad, 28);
  ctx.fillText("PDF (buildCvPdf)", a.width + pad * 2, 28);
  ctx.drawImage(a, pad, 44);
  ctx.drawImage(b, a.width + pad * 2, 44);
  const { writeFileSync } = await import("node:fs");
  writeFileSync(out, cv.toBuffer("image/png"));
}

// ── main ──
const templateId = process.argv[2] || "modern";
if (!TEMPLATES[templateId]) {
  console.error(
    `unknown template "${templateId}"; one of: ${Object.keys(TEMPLATES).join(", ")}`,
  );
  process.exit(2);
}
const tmp = "/tmp";
const previewPng = `${tmp}/cv-harness-${templateId}-preview.png`;
const pdf = `${tmp}/cv-harness-${templateId}.pdf`;
const pdfPng = `${tmp}/cv-harness-${templateId}-pdf.png`;
const sideBy = `${tmp}/cv-harness-${templateId}-sidebyside.png`;

console.log(
  `\n=== CV template harness: "${templateId}" (vs TODAY's renderer) ===`,
);
await shootPreview(templateId, previewPng);
renderPdf(templateId, pdf);
rasterize(pdf, pdfPng);
const gates = await runGates(templateId, previewPng, pdfPng, pdf);
await sideBySide(previewPng, pdfPng, sideBy);

console.log(
  `\n gate                              expected         actual           result`,
);
console.log(` ${"-".repeat(74)}`);
let failed = 0;
for (const g of gates) {
  const res = g.pass === null ? "SKIP" : g.pass ? "PASS" : "FAIL";
  if (g.pass === false) failed++;
  console.log(
    ` ${g.gate.padEnd(33)}${String(g.expected).padEnd(17)}${String(g.actual).padEnd(17)}${res}`,
  );
}
const ok = failed === 0;
console.log(
  `\n ${ok ? "✅ MATCH" : `❌ ${failed} gate(s) FAILED`} — side-by-side: ${sideBy}`,
);
console.log(
  ` Verdict: PDF ${ok ? "matches" : "does NOT match"} the "${templateId}" preview.\n`,
);
process.exit(ok ? 0 : 1);

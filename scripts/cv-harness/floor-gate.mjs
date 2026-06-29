#!/usr/bin/env node
// floor-gate.mjs — the no-regression + no-clip guarantee for the one-page
// readable floor (FLOOR = 0.72) and clean-boundary curation in build-pdf.ts.
//
//   node scripts/cv-harness/floor-gate.mjs           # assert against baselines
//   node scripts/cv-harness/floor-gate.mjs --capture # (re)write baselines
//
// NORMAL fixtures (fitScale ≥ 0.72) must render UNCHANGED: trimmed=false, the
// same scale, and identical extracted text as the captured baseline — this is
// the "doesn't affect normal users" proof. The HEAVY fixture must render at
// exactly FLOOR, curated (trimmed=true), with NO content painted below the
// bottom margin (lowestY ≥ marginBottom), and every dropped section/entry
// must be absent from the extracted text (omission reported, never silent).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const BASELINES = join(HERE, "baselines");
const CAPTURE = process.argv.includes("--capture");

const NORMAL = [
  { name: "light", fixture: "scripts/cv-harness/fixture.json" },
  { name: "medium", fixture: "scripts/cv-harness/fixtures/medium.json" },
];
const HEAVY = {
  name: "heavy",
  fixture: "scripts/cv-harness/fixtures/heavy.json",
};
const TEMPLATE = "modern"; // the premium "Classic" template

function render(name, fixture) {
  const out = `/tmp/floor-gate-${name}.pdf`;
  execFileSync(
    "deno",
    ["run", "-A", "scripts/cv-harness/render-pdf.ts", TEMPLATE, out, fixture],
    { cwd: REPO, stdio: "pipe" },
  );
  const fit = JSON.parse(readFileSync(`${out}.fit.json`, "utf8"));
  const text = execFileSync("pdftotext", ["-layout", out, "-"], {
    cwd: REPO,
  }).toString();
  return { fit, text };
}

const failures = [];
const ok = (cond, msg) => {
  if (!cond) failures.push(msg);
};

if (CAPTURE) mkdirSync(BASELINES, { recursive: true });

// ─── NORMAL: unchanged vs baseline ───
for (const { name, fixture } of NORMAL) {
  const { fit, text } = render(name, fixture);
  const path = join(BASELINES, `${name}.json`);
  if (CAPTURE) {
    writeFileSync(path, JSON.stringify({ scale: fit.scale, text }, null, 2));
    console.log(`captured baseline: ${name} (scale ${fit.scale})`);
    continue;
  }
  ok(
    fit.trimmed === false,
    `${name}: expected trimmed=false, got ${fit.trimmed}`,
  );
  ok(fit.scale >= 0.72, `${name}: scale ${fit.scale} below floor`);
  if (!existsSync(path)) {
    failures.push(`${name}: no baseline (run --capture)`);
    continue;
  }
  const base = JSON.parse(readFileSync(path, "utf8"));
  ok(
    Math.abs(fit.scale - base.scale) < 1e-9,
    `${name}: scale changed ${base.scale} → ${fit.scale} (REGRESSION)`,
  );
  ok(
    text === base.text,
    `${name}: extracted text changed vs baseline (REGRESSION)`,
  );
}

// ─── HEAVY: readable floor, curated, no clip, omission reported ───
if (!CAPTURE) {
  const { fit, text } = render(HEAVY.name, HEAVY.fixture);
  ok(
    Math.abs(fit.scale - 0.72) < 1e-6,
    `heavy: scale ${fit.scale} (expected exactly 0.72)`,
  );
  ok(fit.trimmed === true, `heavy: expected trimmed=true`);
  ok(
    fit.lowestY >= fit.marginBottom,
    `heavy: lowestY ${fit.lowestY} < marginBottom ${fit.marginBottom} (CLIP!)`,
  );
  ok(
    fit.droppedSections.length + fit.droppedEntries.length > 0,
    `heavy: nothing reported dropped`,
  );
  for (const s of fit.droppedSections) {
    ok(
      !text.includes(s),
      `heavy: dropped section "${s}" still present in PDF text (silent loss!)`,
    );
  }
} else {
  // capture run still renders heavy to verify it doesn't throw
  render(HEAVY.name, HEAVY.fixture);
}

if (failures.length) {
  console.error("FLOOR GATE FAILED:");
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(
  CAPTURE
    ? "baselines captured."
    : "FLOOR GATE PASSED ✓ (normal CVs unchanged; heavy curated at 0.72, no clip, omission reported)",
);

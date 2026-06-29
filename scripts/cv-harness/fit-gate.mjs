#!/usr/bin/env node
// fit-gate.mjs — the density-first one-page guarantee.
//
//   node scripts/cv-harness/fit-gate.mjs
//
// The renderer must ALWAYS fit the whole CV on one page and NEVER cut content.
// For every fixture this asserts:
//   - fit has NO trimmed/dropped fields (content removal isn't a behavior),
//   - scale ≤ 1 and lowestY ≥ marginBottom (one page, no clip),
//   - COMPLETENESS: every probe token (role titles, institutions, orgs, the
//     oldest/last items) appears in the extracted PDF text — nothing dropped,
//   - light CVs render in the "comfortable" tier (airy look preserved).

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const TEMPLATE = "modern";

// Each case lists probe strings that MUST survive into the PDF (the things a cut
// would drop first: oldest roles, last education entry, trailing sections).
const CASES = [
  {
    name: "light",
    fixture: "scripts/cv-harness/fixture.json",
    expectFullScale: true, // light CV fits with no shrink — spacious comfortable look
    probes: ["Dana Cohen", "Data Analyst", "Tel Aviv University", "Mentor"],
  },
  {
    // Dense 6-role CV → dense tier, must stay complete (these are the items a
    // cut-first approach dropped first: oldest role, 2nd degree, last sections).
    name: "heavy",
    fixture: "scripts/cv-harness/fixtures/heavy.json",
    probes: [
      "Amdocs",
      "Junior Developer",
      "B.Sc.",
      "Datadog",
      "French",
      // Skills render BY GROUP with friendly labels (never the raw keys).
      "Core Competencies",
      "Technical",
      "Tools",
    ],
    forbid: ["domain:", "domain :"], // raw skill key must never show as a label
  },
  {
    // Extreme 10-role CV → keeps scaling down (dense hint), still complete.
    name: "monster",
    fixture: "scripts/cv-harness/fixtures/monster.json",
    expectDense: true,
    probes: ["VP Engineering 1", "Junior Developer 6", "Software Engineer 5"],
  },
];

function render(name, fixture) {
  const out = `/tmp/fit-gate-${name}.pdf`;
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

const fail = [];
for (const c of CASES) {
  const { fit, text } = render(c.name, c.fixture);
  // No cutting behavior may exist on the fit result, ever.
  for (const k of [
    "trimmed",
    "droppedSections",
    "droppedEntries",
    "droppedBulletCount",
  ]) {
    if (k in fit)
      fail.push(
        `${c.name}: fit unexpectedly has "${k}" (cutting must not exist)`,
      );
  }
  // One page, no clip.
  if (!(fit.scale <= 1.0001)) fail.push(`${c.name}: scale ${fit.scale} > 1`);
  if (!(fit.lowestY >= fit.marginBottom - 0.5))
    fail.push(`${c.name}: lowestY ${fit.lowestY} < marginBottom (clipped)`);
  // Completeness — nothing dropped.
  for (const p of c.probes) {
    if (!text.includes(p))
      fail.push(`${c.name}: probe "${p}" missing from PDF (content was cut!)`);
  }
  // Forbidden strings (e.g. raw skill keys leaking as labels).
  for (const p of c.forbid || []) {
    if (text.toLowerCase().includes(p))
      fail.push(`${c.name}: forbidden string "${p}" present in PDF`);
  }
  // Light CVs stay spacious (comfortable look — at or very near full scale).
  if (c.expectFullScale && !(fit.scale >= 0.95))
    fail.push(`${c.name}: expected ~full scale but got ${fit.scale}`);
  // Extreme CVs are allowed to scale below the hint point (proves no floor/cut).
  if (c.expectDense && !fit.dense)
    fail.push(
      `${c.name}: expected to scale below the dense-hint point but didn't`,
    );
}

if (fail.length) {
  console.error("FIT GATE FAILED:");
  for (const f of fail) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(
  "FIT GATE PASSED ✓ (every CV fits one page, complete, no cut, no clip; light stays comfortable)",
);

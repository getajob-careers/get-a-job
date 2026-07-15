#!/usr/bin/env node
// Type/radius scale guardrail (round 3, step 1). The canvas type + radius scales
// (src/pages/_preview/canvas/scale.css) are the ONLY legal values. This flags any
// raw text-[Npx] / rounded-[Npx] / rounded-{sm,md,lg,xl,2xl,3xl} left in the
// fixture-Home component tree so a regression can't creep back. rounded-full is
// allowed (it's the "full" step). Run: node scripts/check-scale.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = "src/pages/_preview";
const targets = [
  ...fs
    .readdirSync(path.join(ROOT, "canvas"))
    .filter((f) => f.endsWith(".jsx"))
    .map((f) => path.join(ROOT, "canvas", f)),
  path.join(ROOT, "Home3TabCvTab.jsx"),
  path.join(ROOT, "Home3TabPreview.jsx"),
];

// Off-scale patterns. rounded-full is intentionally NOT matched.
const RULES = [
  { re: /text-\[[0-9.]+px\]/g, msg: "raw text size — use rd-t-* (scale.css)" },
  { re: /rounded-\[[0-9.]+px\]/g, msg: "raw radius — use rd-r-* (scale.css)" },
  {
    re: /\brounded-(?:sm|md|lg|xl|2xl|3xl)\b/g,
    msg: "tailwind radius — use rd-r-* (scale.css)",
  },
];

let violations = 0;
for (const file of targets) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const { re, msg } of RULES) {
      for (const m of line.matchAll(re)) {
        violations++;
        console.error(`${file}:${i + 1}  ${m[0]}  — ${msg}`);
      }
    }
  });
}

if (violations) {
  console.error(
    `\n✗ ${violations} off-scale value(s). Snap them to the scale.`,
  );
  process.exit(1);
}
console.log("✓ scale check: all canvas type sizes + radii are on-scale.");

// WCAG AA audit for the canvas palette candidates (round 4 challenger round).
//
// Imports the REAL palette objects from src/pages/_preview/canvas/palette.js, so
// this can never drift from what actually ships — the measurement lesson from the
// scoring lane (a harness that re-declares its own copy of the thing under test
// is measuring itself). Run: node scripts/audit-palettes.mjs
//
// Enforces hard constraint b from palette.js: every band -dark clears AA
// (>=4.5:1) on BOTH --rd-bg-card and its own -tint. Also audits every text token
// on card + page, which is how Clay's marginal text-eyebrow-on-page (4.45:1) was
// found — that one predates this round and is reported, not silently fixed.
//
// Self-check: Yishai's worst BAND ratio must reproduce 5.45:1 (strong-dark on its
// own tint). If that assertion ever fails, distrust this script before you
// distrust the palette. (Was anchored on Clay's 5.48 before Yishai was crowned.)
import { PALETTES } from "../src/pages/_preview/canvas/palette.js";

const chan = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const BANDS = [
  ["good", "--rd-primary-dark", "--rd-primary-tint"],
  ["strong", "--rd-teal-dark", "--rd-teal-tint"],
  ["stretch", "--rd-golden-dark", "--rd-golden-tint"],
];
const TEXTS = [
  "--rd-text",
  "--rd-text-secondary",
  "--rd-text-tertiary",
  "--rd-text-eyebrow",
];
const AA = 4.5;

let failures = 0;
let anchorWorstBand = Infinity;

for (const [id, { label, tokens }] of Object.entries(PALETTES)) {
  const card = tokens["--rd-bg-card"];
  const page = tokens["--rd-bg-page"];
  const rows = [];

  if (Object.keys(tokens).length !== 24)
    throw new Error(
      `${label}: ${Object.keys(tokens).length} tokens, expected 23`,
    );

  for (const [band, dark, tint] of BANDS) {
    rows.push([`${band}-dark on card`, ratio(tokens[dark], card), true]);
    rows.push([
      `${band}-dark on own tint`,
      ratio(tokens[dark], tokens[tint]),
      true,
    ]);
  }
  for (const t of TEXTS) {
    rows.push([`${t.slice(5)} on card`, ratio(tokens[t], card), false]);
    rows.push([`${t.slice(5)} on page`, ratio(tokens[t], page), false]);
  }

  const bad = rows.filter(([, v]) => v < AA);
  const worst = rows.reduce((a, r) => (r[1] < a[1] ? r : a));
  if (id === "yishai")
    anchorWorstBand = Math.min(...rows.filter((r) => r[2]).map((r) => r[1]));

  console.log(`\n=== ${label} (${id}) ===`);
  for (const [lbl, v] of rows)
    console.log(
      `  ${v >= AA ? "OK  " : "FAIL"} ${lbl.padEnd(26)} ${v.toFixed(2)}:1`,
    );
  console.log(`  worst ${worst[1].toFixed(2)}:1 (${worst[0]})`);
  if (bad.length) {
    failures += bad.length;
    console.log(`  ${bad.length} BELOW AA: ${bad.map(([l]) => l).join(", ")}`);
  }
}

const drift = Math.abs(anchorWorstBand - 5.45);
console.log(
  `\nself-check: Yishai worst band ${anchorWorstBand.toFixed(2)}:1 vs 5.45 recorded ` +
    `=> ${drift < 0.01 ? "MATCH (contrast math trusted)" : "DRIFT - distrust this script"}`,
);
console.log(
  failures ? `\n${failures} check(s) below AA.` : "\nAll checks pass AA.",
);

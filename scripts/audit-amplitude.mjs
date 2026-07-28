// Amplitude AA + elevation audit for the LOCKED system (Yishai + MEDIUM). Checks
// text AA on the greige ground (page/soft/sidebar/eyebrow) and on the tinted card
// and coach tint; the mauve-forward surfaces (filled kanban header with a
// large-bold white label ≥3:1, the mauve wash with ink/mauve-dark text ≥4.5); and
// the elevation invariant (the tinted card stays lighter than the page, so
// paper-lift survives). Exit non-zero on any failure so it gates like the others.

import { PALETTES } from "../src/pages/_preview/canvas/palette.js";
import { MEDIUM } from "../src/pages/_preview/canvas/amplitude.js";

const AA = 4.5;
const LARGE = 3.0;

function lin(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function lum(hex) {
  const h = hex.replace("#", "");
  return (
    0.2126 * lin(parseInt(h.slice(0, 2), 16)) +
    0.7152 * lin(parseInt(h.slice(2, 4), 16)) +
    0.0722 * lin(parseInt(h.slice(4, 6), 16))
  );
}
function ratio(a, b) {
  const la = lum(a);
  const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

let failures = 0;
const line = (ok, label, val) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label.padEnd(36)} ${val}`);
};

console.log("=== Yishai · MEDIUM (locked) ===");
const base = PALETTES.yishai.tokens;
const merged = { ...base, ...MEDIUM };
const card = merged["--rd-bg-card"];
const page = merged["--rd-bg-page"];
const ink = merged["--rd-text"];
const sec = merged["--rd-text-secondary"];
const ter = merged["--rd-text-tertiary"];
const eyebrow = merged["--rd-text-eyebrow"];
const secDark = base["--rd-teal-dark"];

for (const [n, surf] of [
  ["page", page],
  ["soft", merged["--rd-bg-soft"]],
  ["sidebar", merged["--rd-bg-sidebar"]],
  ["card", card],
]) {
  line(
    ratio(ink, surf) >= AA,
    `ink on ${n}`,
    ratio(ink, surf).toFixed(2) + ":1",
  );
  line(
    ratio(ter, surf) >= AA,
    `tertiary on ${n}`,
    ratio(ter, surf).toFixed(2) + ":1",
  );
}
line(
  ratio(eyebrow, page) >= AA,
  "eyebrow on page",
  ratio(eyebrow, page).toFixed(2) + ":1",
);

const coach = MEDIUM["--rd-amp-coach-bg"];
line(
  ratio(sec, coach) >= AA,
  "text-secondary on coach tint",
  ratio(sec, coach).toFixed(2) + ":1",
);
line(
  ratio(ink, coach) >= AA,
  "ink on coach tint",
  ratio(ink, coach).toFixed(2) + ":1",
);

const hdr = MEDIUM["--rd-amp-kanban-header"];
const label = MEDIUM["--rd-amp-kanban-label"];
line(
  ratio(label, hdr) >= LARGE,
  "kanban label on mauve (large-bold ≥3)",
  ratio(label, hdr).toFixed(2) + ":1",
);

const wash = MEDIUM["--rd-amp-mauve-wash"];
line(
  ratio(ink, wash) >= AA,
  "ink on mauve wash",
  ratio(ink, wash).toFixed(2) + ":1",
);
line(
  ratio(secDark, wash) >= AA,
  "mauve-dark on mauve wash",
  ratio(secDark, wash).toFixed(2) + ":1",
);

const lift = lum(card) - lum(page);
line(lift > 0, "card lifted above page (L)", `Δ${lift.toFixed(3)}`);

console.log(
  failures === 0
    ? "\nLocked system passes AA + elevation.\n"
    : `\n${failures} check(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);

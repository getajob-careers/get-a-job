// Amplitude AA + elevation audit for THE FIELD FLIP: every finalist at MEDIUM,
// plus Yishai's subtle/bold ladder. For each case it checks text AA on the
// (possibly darkened) ground — page/soft/sidebar/eyebrow — and on the tinted card
// and coach tint; the secondary-accent-forward surfaces (filled kanban header
// with large-bold white label ≥3:1, secondary wash with ink/secondary-dark text
// ≥4.5); the Yishai bold CV band; and the elevation invariant (card lighter than
// its page, so paper-lift survives the tint + the restful ground).
//
// Exit non-zero on any failure so it can gate like audit-palettes.mjs.

import { PALETTES } from "../src/pages/_preview/canvas/palette.js";
import { amplitudeVars } from "../src/pages/_preview/canvas/amplitude.js";

const AA = 4.5;

function hexOf(v, base) {
  // Resolve a token value to a hex; var(--x) references fall back to `base`.
  if (typeof v === "string" && v.startsWith("#")) return v;
  return base;
}
function lin(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function lum(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function ratio(a, b) {
  const la = lum(a);
  const lb = lum(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

let failures = 0;
const line = (ok, label, val) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label.padEnd(34)} ${val}`);
};

// The field flip: every finalist at MEDIUM, plus Yishai's subtle/bold ladder.
const CASES = [
  ["clay", "medium"],
  ["yishai", "subtle"],
  ["yishai", "medium"],
  ["yishai", "bold"],
  ["heather", "medium"],
  ["moss", "medium"],
  ["pewter", "medium"],
];

for (const [pid, level] of CASES) {
  console.log(`\n=== ${pid} · ${level} ===`);
  const base = PALETTES[pid].tokens;
  const amp = amplitudeVars(pid, level);
  const merged = { ...base, ...amp };

  const card = merged["--rd-bg-card"];
  const page = merged["--rd-bg-page"];
  const soft = merged["--rd-bg-soft"];
  const sidebar = merged["--rd-bg-sidebar"];
  const ink = merged["--rd-text"];
  const sec = merged["--rd-text-secondary"];
  const ter = merged["--rd-text-tertiary"];
  const eyebrow = merged["--rd-text-eyebrow"];
  const secDark = base["--rd-teal-dark"];

  // (0) medium can darken the ground → re-check text on page/soft/sidebar/eyebrow.
  for (const [n, surf] of [
    ["page", page],
    ["soft", soft],
    ["sidebar", sidebar],
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

  // (a) body text on the tinted card
  line(
    ratio(ink, card) >= AA,
    "ink on card",
    ratio(ink, card).toFixed(2) + ":1",
  );
  line(
    ratio(sec, card) >= AA,
    "text-secondary on card",
    ratio(sec, card).toFixed(2) + ":1",
  );
  line(
    ratio(ter, card) >= AA,
    "text-tertiary on card",
    ratio(ter, card).toFixed(2) + ":1",
  );

  // (d) elevation invariant: card lighter than page (paper-lift survives the tint)
  const lift = lum(card) - lum(page);
  line(
    lift > 0,
    "card lifted above page (L)",
    `Δ${lift.toFixed(3)} (card ${lum(card).toFixed(3)} > page ${lum(page).toFixed(3)})`,
  );

  // (b) coach tint (medium+)
  if (amp["--rd-amp-coach-bg"]) {
    const coach = amp["--rd-amp-coach-bg"];
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
  }

  // (c) CV header band — text on the mauve tint band (ink name, dark headline).
  // (Was a dark ink slab with light-on-ink text; Eli killed the slab.)
  if (amp["--rd-amp-cvheader-bg"]) {
    const bg = amp["--rd-amp-cvheader-bg"];
    const headline = hexOf(amp["--rd-amp-cvheader-headline"], ink);
    line(
      ratio(ink, bg) >= AA,
      "cv-header name (ink) on band",
      ratio(ink, bg).toFixed(2) + ":1",
    );
    line(
      ratio(sec, bg) >= AA,
      "cv-header contact (sec) on band",
      ratio(sec, bg).toFixed(2) + ":1",
    );
    line(
      ratio(headline, bg) >= AA,
      "cv-header headline on band",
      ratio(headline, bg).toFixed(2) + ":1",
    );
  }

  // (e) MAUVE-FORWARD (STEP 1, no relaxation). Mauve as a FILL takes only white
  // LARGE-BOLD text → the 3:1 floor (the kanban label is bumped to 20px bold to
  // qualify). The mauve wash is a light surface → ink / mauve-dark text ≥ 4.5.
  const LARGE = 3.0;
  if (amp["--rd-amp-kanban-header"]) {
    const hdr = amp["--rd-amp-kanban-header"];
    const label = hexOf(amp["--rd-amp-kanban-label"], "#FFFFFF");
    line(
      ratio(label, hdr) >= LARGE,
      "kanban label on mauve (large-bold >=3)",
      ratio(label, hdr).toFixed(2) + ":1",
    );
  }
  if (amp["--rd-amp-mauve-wash"]) {
    const wash = amp["--rd-amp-mauve-wash"];
    line(
      ratio(ink, wash) >= AA,
      "ink on secondary wash",
      ratio(ink, wash).toFixed(2) + ":1",
    );
    line(
      ratio(secDark, wash) >= AA,
      "secondary-dark on wash",
      ratio(secDark, wash).toFixed(2) + ":1",
    );
  }
}

console.log(
  failures === 0
    ? "\nAll amplitude checks pass AA + elevation.\n"
    : `\n${failures} check(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);

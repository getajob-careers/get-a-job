// Amplitude AA + elevation audit. Runs BEFORE bold is judged (Eli's rule: add the
// light-text-on-ink check before bold exists). Verifies, for every Yishai
// amplitude level, that (a) body text still clears AA on the tinted card, (b) the
// coach tint holds AA for body text, (c) the BOLD CV header's light-on-ink text
// clears AA (the inverse direction the palette audit never checked), and (d) the
// elevation invariant holds: the tinted card stays LIGHTER than the page, so
// paper-lift survives the tint (the retune's whole point).
//
// Exit non-zero on any failure so it can gate like audit-palettes.mjs.

import { PALETTES } from "../src/pages/_preview/canvas/palette.js";
import {
  amplitudeVars,
  AMP_LEVELS,
} from "../src/pages/_preview/canvas/amplitude.js";

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

const base = PALETTES.yishai.tokens;
let failures = 0;
const line = (ok, label, val) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label.padEnd(34)} ${val}`);
};

for (const level of AMP_LEVELS) {
  console.log(`\n=== Yishai · ${level} ===`);
  const amp = amplitudeVars("yishai", level);
  const merged = { ...base, ...amp };

  const card = merged["--rd-bg-card"];
  const page = merged["--rd-bg-page"];
  const ink = merged["--rd-text"];
  const sec = merged["--rd-text-secondary"];
  const ter = merged["--rd-text-tertiary"];

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

  // (c) BOLD dark block — light-on-ink (the inverse direction)
  if (amp["--rd-amp-cvheader-bg"]) {
    const bg = amp["--rd-amp-cvheader-bg"];
    const fg = hexOf(amp["--rd-amp-cvheader-fg"], "#FFFFFF");
    const muted = hexOf(amp["--rd-amp-cvheader-muted"], fg);
    const accent = hexOf(amp["--rd-amp-cvheader-accent"], fg);
    line(
      ratio(fg, bg) >= AA,
      "cv-header fg on ink",
      ratio(fg, bg).toFixed(2) + ":1",
    );
    line(
      ratio(muted, bg) >= AA,
      "cv-header muted on ink",
      ratio(muted, bg).toFixed(2) + ":1",
    );
    line(
      ratio(accent, bg) >= AA,
      "cv-header accent on ink",
      ratio(accent, bg).toFixed(2) + ":1",
    );
  }
}

console.log(
  failures === 0
    ? "\nAll amplitude checks pass AA + elevation.\n"
    : `\n${failures} amplitude check(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);

// Palette candidates. CLAY is the round-3 adopted palette and remains the
// INCUMBENT + default: a challenger only replaces it if Eli picks it at the
// switcher (round 4). Clay = warm putty surface + grounded terracotta primary +
// one deep-teal cool accent — the vacant "warm, calm, capable" ground in the
// career category ("capable hands, not a corporate queue"), chosen from the
// research-led batch (docs/research/palette-market-scan-2026-07).
// Dusk (batch-1 winner) stays retired in _graveyard.js.
//
// Applied on mount to document.documentElement so portaled overlays (CV-gen
// theatre, job modal, kanban ghost, avatar menu) inherit; torn down on unmount.
// Includes the Depth structure's field tone + long shadow — Depth is the base.
//
// Invariants that must hold for EVERY candidate (see ring.js + BAND_META):
//   - hard constraint a: rings have a low-fill floor (ring.js) — palette-neutral
//     by construction, it's geometry not color, so no candidate can regress it.
//   - hard constraint b: every band -dark clears WCAG AA (>=4.5:1) on BOTH
//     --rd-bg-card and its own -tint. Clay is in-browser audited (worst 5.48:1);
//     the round-4 challengers are audited in scripts/audit-palettes.mjs, which
//     reproduces Clay's 5.48 exactly as its check on the contrast math.
//   - bands stay well separated on the wheel: strong / good+primary / stretch.
//   - the emotional requirements (market scan §4): low saturation, warm surface,
//     NO red for the rejection-adjacent bands, AA protected over "calm murk".

// Explicit .js (rather than the extensionless style used elsewhere in this dir):
// scripts/audit-palettes.mjs imports this module under bare node, which resolves
// per ESM spec and will not guess extensions. Vite resolves it identically, so
// the extension costs nothing and keeps the audit importing the REAL tokens.
import { toolVars } from "./toolColors.js";

// YISHAI — challenger round 5, from Yishai's mockup. Eli's four colors are used
// VERBATIM in the roles he named: brown #60483E = the ink, cream #F4EBDA = the
// page, blue #60617D = primary (every role coral had), mauve #9B7D8A = secondary.
// Evaluated as THE palette (full product candidate), not a landing skin.
//
// Two honest deviations from the four-color mock, both forced:
//
//   1. THE STRETCH BAND IS DERIVED (#9C7A46 ochre). The mock has two accents but
//      the product needs THREE separated bands (strong / good+primary / stretch).
//      Mauve was asked to cover "teal/golden's roles" — but teal IS strong and
//      golden IS stretch, so one color cannot take both without collapsing two
//      bands into one and breaking the wheel-separation invariant. The ochre is
//      pulled toward the mock's own brown so it stays in-family: hues land at
//      ~238° / ~337° / ~38°, well separated. This band is NOT in Yishai's mock.
//   2. MAUVE GETS A DARKER STEP FOR TEXT (Eli's ruling). #9B7D8A is 3.12:1 on the
//      cream — it fails the AA text floor and cannot carry "Good match" /
//      "Sweet spot" labels. It is kept VERBATIM as the band object/glaze/deco and
//      the drop-zone glow (it clears the 3:1 UI floor); --rd-teal-dark carries the
//      text. This is exactly what the -dark convention exists for.
//
// COST, stated plainly (the collision pattern above): the primary IS blue, so
// Tasks' slate would read as the primary's twin — Tasks moves to the mock's brown
// (see toolColors.js). And the LOGOTYPE material re-opens: a blue primary means
// the locked coral mark goes blue. That is the deliberate price if this wins.
export const YISHAI = {
  // GROUND LOCKED = GREIGE (Eli, 2026-07-17). The mock's cream #F4EBDA read yellow
  // at full-page scale (chroma 26) and clashed with the cool cards; greige is a
  // restful warm-gray work-surface that sits peacefully under the mauve/blue
  // family. The whole surface family moved with it (field/sidebar/soft/borders).
  "--rd-field": "#DCD9D0",
  "--rd-shadow":
    "0 22px 46px -14px rgba(72,70,62,0.22), 0 6px 16px rgba(72,70,62,0.10)",
  "--rd-bg-page": "#EBE8E1",
  "--rd-bg-card": "#FFFFFF",
  "--rd-bg-sidebar": "#E3E0D8",
  "--rd-bg-soft": "#E6E3DB",
  "--rd-border": "#DAD6CD",
  "--rd-border-subtle": "#E4E1D9",
  "--rd-border-hover": "#C8C4BA",
  "--rd-text": "#60483E",
  "--rd-text-secondary": "#6B5346",
  "--rd-text-tertiary": "#755C4E",
  "--rd-text-eyebrow": "#60617D",
  "--rd-coral": "#60617D",
  "--rd-coral-dark": "#4B4C63",
  "--rd-coral-tint": "#E4E4EC",
  "--rd-teal": "#9B7D8A",
  "--rd-teal-dark": "#6E5460",
  "--rd-teal-tint": "#EEE4E8",
  "--rd-golden": "#9C7A46",
  "--rd-golden-dark": "#6B4F24",
  "--rd-golden-tint": "#F1E7D2",
  "--rd-peach": "#D8A98C",
  // Logotype glaze highlight — lifted blue — the mark goes BLUE if this wins (the logotype re-open).
  "--rd-logo-hi": "#8A8BA8",
};

// YISHAI is THE palette (crowned 2026-07-17). Clay / Heather / Moss / Pewter are
// retired to _graveyard.js. PALETTES is kept as a one-entry map so the audit and
// any lingering consumer still resolve `yishai` by name.
export const PALETTES = {
  yishai: { label: "Yishai", tokens: YISHAI },
};
export const DEFAULT_PALETTE = "yishai";

const KEYS = Object.keys(YISHAI);

// Apply the palette to the document root; return a restore fn that clears every
// var on unmount. Only YISHAI remains, so `id` is effectively fixed.
export function applyPalette(id = DEFAULT_PALETTE) {
  if (typeof document === "undefined") return () => {};
  const tokens = (PALETTES[id] || PALETTES[DEFAULT_PALETTE]).tokens;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
  for (const [k, v] of Object.entries(toolVars(id)))
    root.style.setProperty(k, v);
  return () => {
    for (const k of KEYS) root.style.removeProperty(k);
    for (const k of Object.keys(toolVars(id))) root.style.removeProperty(k);
  };
}

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

export const CLAY = {
  // Depth field + long shadow (Depth is the always-on base structure).
  "--rd-field": "#E4DCCF",
  "--rd-shadow":
    "0 22px 46px -14px rgba(74,44,22,0.22), 0 6px 16px rgba(74,44,22,0.10)",
  // Surfaces — warm putty, pushed greyer than butter-cream.
  "--rd-bg-page": "#F1ECE3",
  "--rd-bg-card": "#FFFFFF",
  "--rd-bg-sidebar": "#E7E0D4",
  "--rd-bg-soft": "#ECE6DB",
  "--rd-border": "#E3DACB",
  "--rd-border-subtle": "#EAE2D5",
  "--rd-border-hover": "#D2C7B4",
  // Text — warm-dark ink (AA on card).
  "--rd-text": "#26211A",
  "--rd-text-secondary": "#5C5347",
  "--rd-text-tertiary": "#6A6153",
  // AA FIX (2026-07-17): was #7C6A46, which is 4.45:1 on --rd-bg-page — under the
  // 4.5 floor. Clay's earlier audit only checked BANDS on card/tint, so eyebrow
  // text on the page was never measured and the miss shipped into the adopted
  // palette; the round-5 audit's text-on-page check caught it. This is the
  // minimal same-hue darkening that clears the floor (4.58:1 on page, 5.39:1 on
  // card) — a 2% lightness step, visually indistinguishable. Fixing it HONOURS
  // the locked constraint ("AA protected over calm murk"); leaving it would not.
  "--rd-text-eyebrow": "#7A6845",
  // Primary + "good" band — grounded clay terracotta.
  "--rd-coral": "#A6552E",
  "--rd-coral-dark": "#8A4526",
  "--rd-coral-tint": "#F1E0D5",
  // "strong" band — deep muted teal (the one cool accent).
  "--rd-teal": "#2E7062",
  "--rd-teal-dark": "#1E5A4D",
  "--rd-teal-tint": "#D8EAE5",
  // "stretch" band — muted ochre-gold.
  "--rd-golden": "#BE8F2E",
  "--rd-golden-dark": "#77560C",
  "--rd-golden-tint": "#F4E7C6",
  "--rd-peach": "#D89A72",
  // Logotype glaze highlight — the current hardcoded mark highlight, verbatim: Clay renders identically.
  "--rd-logo-hi": "#EC6A47",
};

// HEATHER — challenger round 4, built from Eli's "73 PURPLE" swatch card. The
// circled heather #98808A IS --rd-coral verbatim (only the -dark carries text,
// so the primary object keeps the exact hue he was drawn to). Support = the same
// card's sage (strong), peach (stretch/peach), oyster+cream (surfaces).
// COST, stated plainly: the Chat tile's heather violet is surrendered to the
// global accent — Chat moves to the card's denim #61617C (see toolColors.js).
export const HEATHER = {
  "--rd-field": "#E2DADC",
  "--rd-shadow":
    "0 22px 46px -14px rgba(52,38,48,0.22), 0 6px 16px rgba(52,38,48,0.10)",
  "--rd-bg-page": "#F1EBEA",
  "--rd-bg-card": "#FFFFFF",
  "--rd-bg-sidebar": "#E7DFE0",
  "--rd-bg-soft": "#EDE6E5",
  "--rd-border": "#E3D9DA",
  "--rd-border-subtle": "#EAE2E2",
  "--rd-border-hover": "#D2C5C8",
  "--rd-text": "#272026",
  "--rd-text-secondary": "#5B5158",
  "--rd-text-tertiary": "#6A6068",
  "--rd-text-eyebrow": "#7A5F6E",
  "--rd-coral": "#98808A",
  "--rd-coral-dark": "#705B64",
  "--rd-coral-tint": "#EEE5E9",
  "--rd-teal": "#5C7F72",
  "--rd-teal-dark": "#4A665B",
  "--rd-teal-tint": "#DDE8E4",
  "--rd-golden": "#C08E5C",
  "--rd-golden-dark": "#815A32",
  "--rd-golden-tint": "#F4E7D5",
  "--rd-peach": "#E0B389",
  // Logotype glaze highlight — lifted heather.
  "--rd-logo-hi": "#B9A2AC",
};

// MOSS — the research's OTHER named fork that was never built: the market scan's
// open ground reads "one grounded earthen primary (clay/ochre OR deep muted
// green)". Round 3 took the clay branch and adopted it; the green branch has
// never been on screen. Deep olive-moss primary on an oat surface, with the
// deep cyan-teal kept as the single cool accent.
export const MOSS = {
  "--rd-field": "#DFDCCB",
  "--rd-shadow":
    "0 22px 46px -14px rgba(40,48,28,0.22), 0 6px 16px rgba(40,48,28,0.10)",
  "--rd-bg-page": "#F0EDE4",
  "--rd-bg-card": "#FFFFFF",
  "--rd-bg-sidebar": "#E5E2D5",
  "--rd-bg-soft": "#EBE8DC",
  "--rd-border": "#E1DDCC",
  "--rd-border-subtle": "#E8E5D6",
  "--rd-border-hover": "#CFCBB6",
  "--rd-text": "#22251C",
  "--rd-text-secondary": "#54594B",
  "--rd-text-tertiary": "#626856",
  "--rd-text-eyebrow": "#696F45",
  "--rd-coral": "#5A6B33",
  "--rd-coral-dark": "#566631",
  "--rd-coral-tint": "#E4E8D2",
  "--rd-teal": "#2F6A6E",
  "--rd-teal-dark": "#2E686C",
  "--rd-teal-tint": "#D6E8E9",
  "--rd-golden": "#B5852F",
  "--rd-golden-dark": "#7C5B20",
  "--rd-golden-tint": "#F3E6C6",
  "--rd-peach": "#D89A72",
  // Logotype glaze highlight — lifted moss.
  "--rd-logo-hi": "#7E9150",
};

// PEWTER — the Notion lever from the market scan ("brand recedes; the user's
// work is the color"). The primary is the swatch card's charcoal-navy #444751
// verbatim: chrome goes quiet and hue is spent ONLY where it means something
// (the bands). Tests whether "capable hands" survives without a warm primary —
// deliberately the most adversarial read on Clay's positioning.
// COST: the Tasks tile's slate is surrendered to the primary; Tasks moves to the
// card's brown (see toolColors.js).
export const PEWTER = {
  "--rd-field": "#DFDBD3",
  "--rd-shadow":
    "0 22px 46px -14px rgba(34,36,42,0.22), 0 6px 16px rgba(34,36,42,0.10)",
  "--rd-bg-page": "#F2EFEA",
  "--rd-bg-card": "#FFFFFF",
  "--rd-bg-sidebar": "#E6E3DD",
  "--rd-bg-soft": "#ECE9E3",
  "--rd-border": "#E2DED6",
  "--rd-border-subtle": "#E9E6E0",
  "--rd-border-hover": "#CFCAC0",
  "--rd-text": "#22242A",
  "--rd-text-secondary": "#525661",
  "--rd-text-tertiary": "#5F636E",
  "--rd-text-eyebrow": "#6B6F5C",
  "--rd-coral": "#444751",
  "--rd-coral-dark": "#444751",
  "--rd-coral-tint": "#E0E1E5",
  "--rd-teal": "#3E6B5C",
  "--rd-teal-dark": "#3C6859",
  "--rd-teal-tint": "#DBE8E3",
  "--rd-golden": "#A8763C",
  "--rd-golden-dark": "#7D582D",
  "--rd-golden-tint": "#F1E4CE",
  "--rd-peach": "#E0B389",
  // Logotype glaze highlight — lifted charcoal-navy.
  "--rd-logo-hi": "#6E7280",
};

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
  "--rd-field": "#E7DCC3",
  "--rd-shadow":
    "0 22px 46px -14px rgba(96,72,62,0.22), 0 6px 16px rgba(96,72,62,0.10)",
  "--rd-bg-page": "#F4EBDA",
  "--rd-bg-card": "#FFFFFF",
  "--rd-bg-sidebar": "#EBE0C8",
  "--rd-bg-soft": "#EFE6D2",
  "--rd-border": "#E3D8BF",
  "--rd-border-subtle": "#EBE2CD",
  "--rd-border-hover": "#CFC09F",
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

// The switcher field. Clay stays the incumbent and the default: a challenger
// only replaces it if Eli picks it at the switcher.
export const PALETTES = {
  clay: { label: "Clay", tokens: CLAY },
  yishai: { label: "Yishai", tokens: YISHAI },
  heather: { label: "Heather", tokens: HEATHER },
  moss: { label: "Moss", tokens: MOSS },
  pewter: { label: "Pewter", tokens: PEWTER },
};
export const DEFAULT_PALETTE = "clay";

const KEYS = Object.keys(CLAY);

// Apply a palette to the document root; return a restore fn that clears every
// var (back to the flat original tokens) on unmount. Every palette carries the
// identical 23 keys, so switching never leaves a stale var behind.
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

// Palette graveyard — retired exploration tokens kept for reference only. NOT
// imported anywhere; Clay (palette.js) is the adopted direction. Dusk was the
// batch-1 winner and the incumbent Clay had to beat — kept because it's the most
// likely place we'd look if Clay ever needs a cooler/more-distinctive sibling.
// Terra Verde, Ink & Honey, Harbor, and Slate were deleted; see git history
// (canvas/wave3-6, wave3-8) if any is ever wanted back.

// Dusk — berry-plum on warm greige (Glossier / Rhode). WCAG AA audited
// (worst 5.53:1 across bands). Same token shape as palette.js CLAY.
export const DUSK = {
  "--rd-field": "#DACFD1",
  "--rd-shadow":
    "0 22px 46px -14px rgba(46,30,40,0.22), 0 6px 16px rgba(46,30,40,0.10)",
  "--rd-bg-page": "#F1EBEC",
  "--rd-bg-card": "#FFFFFF",
  "--rd-bg-sidebar": "#E4DADC",
  "--rd-bg-soft": "#EBE3E3",
  "--rd-border": "#E2D6D8",
  "--rd-border-subtle": "#E9E0E1",
  "--rd-border-hover": "#D0C0C4",
  "--rd-text": "#2A2126",
  "--rd-text-secondary": "#5C515A",
  "--rd-text-tertiary": "#695E65",
  "--rd-text-eyebrow": "#7A5560",
  "--rd-coral": "#9B3A5A",
  "--rd-coral-dark": "#7E2E49",
  "--rd-coral-tint": "#F1DBE3",
  "--rd-teal": "#4A6B84",
  "--rd-teal-dark": "#35506A",
  "--rd-teal-tint": "#DCE4EC",
  "--rd-golden": "#BE8748",
  "--rd-golden-dark": "#795210",
  "--rd-golden-tint": "#F3E4C9",
  "--rd-peach": "#D493A0",
};


// ── Round-4/5 palette FINALISTS, retired when YISHAI was crowned (2026-07-17).
// Kept for reference; NOT imported. Same 24-key shape as the live YISHAI palette.

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

// ── Ground-texture explorations, retired when GRAIN@6x was crowned the permanent
// ground (2026-07-17). CanvasTexture pattern styles, kept for reference; NOT
// imported. Each was a `-z-10` field-layer overlay behind cards.
//
// gradient — a barely-there radial tonal wash (base opacity 0.5):
//   { background:
//       "radial-gradient(135% 95% at 50% -12%, rgba(255,255,255,1), rgba(255,255,255,0) 55%)" }
//
// dots — a micro ink-dot grid (base opacity 0.06):
//   { backgroundImage: "radial-gradient(rgba(96,72,62,1) 0.5px, transparent 0.6px)",
//     backgroundSize: "20px 20px" }

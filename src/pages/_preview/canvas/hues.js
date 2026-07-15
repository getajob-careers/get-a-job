// Hue exploration on the Depth structure (round 3 rev 2). Eli's consistent eye:
// cream + coral-orange IS Claude's signature; no field treatment fixes that, so
// the HUE FAMILY itself changes. Depth won structurally (layered field, lifted
// cards, off-canvas arcs) — it's now the always-on base; these three directions
// re-tint every --rd-* token on top of it, behind ?hue=a|b|c. Each stays
// warm/human, none is cream+orange.
//
//   a TERRA VERDE — warm sand/clay field, accent flips to a deep confident green
//                   (olive-forest, NOT Glassdoor mint): growth, grounded, zero
//                   AI-brand association.  Ref: Patagonia / Huel earthy olive.
//   b INK & HONEY — warmth moves orange→GOLD: charcoal-brown ink for text and
//                   structure, honey/amber accent, warm off-white field.
//                   Premium-editorial-warm.  Ref: Aesop / Kinfolk warm gold.
//   c DUSK        — warm through REDS-VIOLET: plum/burgundy accent on a warm-grey
//                   field, rose-tinted depth layers. Human and warm, a totally
//                   different temperature register.  Ref: Glossier / Rhode berry
//                   on warm greige.
//
// Semantics (BAND_META in jobCardDisplay): --rd-coral = PRIMARY accent AND the
// "good" band; --rd-teal = "strong" band; --rd-golden = "stretch" band. Each hue
// keeps those three well separated on the wheel so strong / good / stretch read
// instantly on the score rings. Score rings, the coral pill, and hover-fills all
// move to the new accent because they resolve through --rd-coral.
//
// Applied to document.documentElement (portaled overlays inherit); torn down on
// unmount. Default applies only DEPTH_BASE — the current cream+coral on the
// Depth structure — for side-by-side comparison.

// The Depth structure's own tokens — the deeper warm field the columns sit on
// and the long soft shadow that lifts the cards. Applied in EVERY state
// (including Default) so Depth is always the base; hues override both.
const DEPTH_SHADOW =
  "0 22px 46px -14px rgba(74,48,20,0.22), 0 6px 16px rgba(74,48,20,0.10)";

export const DEPTH_BASE = {
  "--rd-field": "#EAE1D2",
  "--rd-shadow": DEPTH_SHADOW,
};

export const HUES = {
  a: {
    name: "Terra Verde",
    reference: "Patagonia / Huel — earthy olive + clay",
    tokens: {
      "--rd-field": "#E3D5BE",
      "--rd-bg-page": "#F2EADE",
      "--rd-bg-card": "#FFFFFF",
      "--rd-bg-sidebar": "#E6DAC5",
      "--rd-bg-soft": "#ECE2D1",
      "--rd-border": "#E0D3BC",
      "--rd-border-subtle": "#E8DECC",
      "--rd-border-hover": "#CDBEA2",
      "--rd-text": "#23261B",
      "--rd-text-secondary": "#585746",
      "--rd-text-tertiary": "#67654F",
      "--rd-text-eyebrow": "#6C6A3E",
      // primary + "good" band — deep olive-forest green
      "--rd-coral": "#4F7A34",
      "--rd-coral-dark": "#3C6626",
      "--rd-coral-tint": "#E2EAD0",
      // "strong" band — cool deep teal (bluer green, distinct from the olive)
      "--rd-teal": "#1C6B6E",
      "--rd-teal-dark": "#0F5457",
      "--rd-teal-tint": "#D2E7E6",
      // "stretch" band — warm amber-clay
      "--rd-golden": "#BE8A2C",
      "--rd-golden-dark": "#75530A",
      "--rd-golden-tint": "#F4E6C2",
      "--rd-peach": "#D69B6E",
      "--rd-shadow":
        "0 22px 46px -14px rgba(52,55,22,0.22), 0 6px 16px rgba(52,55,22,0.10)",
    },
  },
  b: {
    name: "Ink & Honey",
    reference: "Aesop / Kinfolk — warm-gold editorial",
    tokens: {
      "--rd-field": "#E6DED1",
      "--rd-bg-page": "#F4F0E7",
      "--rd-bg-card": "#FFFFFF",
      "--rd-bg-sidebar": "#E8E1D3",
      "--rd-bg-soft": "#EEE8DB",
      "--rd-border": "#E4DBCA",
      "--rd-border-subtle": "#EBE4D5",
      "--rd-border-hover": "#D3C8B2",
      "--rd-text": "#2A241B",
      "--rd-text-secondary": "#5C5447",
      "--rd-text-tertiary": "#6A6254",
      "--rd-text-eyebrow": "#7A6533",
      // primary + "good" band — deep honey/amber
      "--rd-coral": "#BC7E14",
      "--rd-coral-dark": "#986410",
      "--rd-coral-tint": "#F6E7C2",
      // "strong" band — muted teal-green
      "--rd-teal": "#3E7A6A",
      "--rd-teal-dark": "#285F51",
      "--rd-teal-tint": "#D8ECE4",
      // "stretch" band — terracotta clay (kept clear of the honey primary)
      "--rd-golden": "#B5623A",
      "--rd-golden-dark": "#8A492A",
      "--rd-golden-tint": "#F6E0D2",
      "--rd-peach": "#D89A6A",
      "--rd-shadow":
        "0 22px 46px -14px rgba(42,32,16,0.24), 0 6px 16px rgba(42,32,16,0.12)",
    },
  },
  c: {
    name: "Dusk",
    reference: "Glossier / Rhode — berry-plum on warm greige",
    tokens: {
      "--rd-field": "#DACFD1",
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
      // primary + "good" band — berry-plum
      "--rd-coral": "#9B3A5A",
      "--rd-coral-dark": "#7E2E49",
      "--rd-coral-tint": "#F1DBE3",
      // "strong" band — dusty slate-blue (cool, distinct from the plum)
      "--rd-teal": "#4A6B84",
      "--rd-teal-dark": "#35506A",
      "--rd-teal-tint": "#DCE4EC",
      // "stretch" band — muted amber (adds warmth without collision)
      "--rd-golden": "#BE8748",
      "--rd-golden-dark": "#7C5410",
      "--rd-golden-tint": "#F3E4C9",
      "--rd-peach": "#D493A0",
      "--rd-shadow":
        "0 22px 46px -14px rgba(46,30,40,0.22), 0 6px 16px rgba(46,30,40,0.10)",
    },
  },
};

export const HUE_KEYS = Object.keys(HUES);

// Every var any state touches — used to hard-reset before (re)applying so no
// partial hue leaks between switches.
const ALL_KEYS = Object.keys(HUES.a.tokens);

// Apply DEPTH_BASE always, then overlay the chosen hue's full token set. Returns
// a restore fn that clears every touched var (back to the true flat original).
export function applyHue(key) {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  const clear = () => {
    for (const k of ALL_KEYS) root.style.removeProperty(k);
  };
  clear();
  for (const [k, v] of Object.entries(DEPTH_BASE)) root.style.setProperty(k, v);
  if (HUES[key]) {
    for (const [k, v] of Object.entries(HUES[key].tokens))
      root.style.setProperty(k, v);
  }
  return clear;
}

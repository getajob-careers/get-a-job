// Palette candidates on the Depth structure (round 3 rev 2, batch 2). Informed by
// market research (docs/research/palette-market-scan-2026-07): the career category
// over-indexes on corporate cool-blue (LinkedIn #0A66C2 / Indeed #003A9B /
// Simplify #12A1C0) on stark white; the warm-calm-capable intersection is
// essentially unowned (only WTTJ's cream #F6F3EF and Headspace's anxiety-warm
// orange live near it). Emotional brief for a stressed job seeker: LOW
// saturation (saturation drives arousal, not hue), a WARM surface (reads
// "someone's helping me", not "you're a ticket"), red reserved for TRUE errors,
// warm-dark ink for AA, one earned accent — restraint reads as "under control".
//
// Depth won structurally and is the always-on base (CanvasField). Each candidate
// re-tints every --rd-* token on top of it, behind ?hue=<key>. Default applies
// only DEPTH_BASE (current cream+coral) as the incumbent-of-record; Dusk (the
// prior batch's winner) stays in the lineup as the incumbent to beat.
//
// HARD CONSTRAINT b (fit-badge contrast floor): the fit score is the page's most
// important datum. BAND_META renders each band as accent-dark on accent-tint, so
// every band's *-dark MUST clear WCAG AA (>=4.5:1) on BOTH --rd-bg-card and its
// own *-tint. All values below are in-browser audited; the score-ring number
// resolves through the same band -dark (AA on the white card). See hard
// constraint a (low-fill rings) in ring.js.
//
// Semantics (BAND_META in jobCardDisplay): --rd-coral = PRIMARY accent + "good"
// band, --rd-teal = "strong" band, --rd-golden = "stretch" band. Each palette
// keeps those three well separated on the wheel so strong/good/stretch read
// instantly (the flaw that made Terra Verde read flat: all three too close).

const DEPTH_SHADOW =
  "0 22px 46px -14px rgba(74,48,20,0.22), 0 6px 16px rgba(74,48,20,0.10)";

export const DEPTH_BASE = {
  "--rd-field": "#EAE1D2",
  "--rd-shadow": DEPTH_SHADOW,
};

export const HUES = {
  clay: {
    name: "Clay",
    reference: "WTTJ warm cream + ceramic terracotta (Aesop/Muji earthen)",
    positioning:
      "Warm, grounded competence — capable hands, not a corporate queue.",
    tokens: {
      "--rd-field": "#E4DCCF",
      "--rd-bg-page": "#F1ECE3",
      "--rd-bg-card": "#FFFFFF",
      "--rd-bg-sidebar": "#E7E0D4",
      "--rd-bg-soft": "#ECE6DB",
      "--rd-border": "#E3DACB",
      "--rd-border-subtle": "#EAE2D5",
      "--rd-border-hover": "#D2C7B4",
      "--rd-text": "#26211A",
      "--rd-text-secondary": "#5C5347",
      "--rd-text-tertiary": "#6A6153",
      "--rd-text-eyebrow": "#7C6A46",
      // primary + "good" band — grounded clay terracotta (muted, browner than
      // Anthropic coral)
      "--rd-coral": "#A6552E",
      "--rd-coral-dark": "#8A4526",
      "--rd-coral-tint": "#F1E0D5",
      // "strong" band — deep muted teal (the one cool accent)
      "--rd-teal": "#2E7062",
      "--rd-teal-dark": "#1E5A4D",
      "--rd-teal-tint": "#D8EAE5",
      // "stretch" band — muted ochre-gold
      "--rd-golden": "#BE8F2E",
      "--rd-golden-dark": "#77560C",
      "--rd-golden-tint": "#F4E7C6",
      "--rd-peach": "#D89A72",
      "--rd-shadow":
        "0 22px 46px -14px rgba(74,44,22,0.22), 0 6px 16px rgba(74,44,22,0.10)",
    },
  },
  harbor: {
    name: "Harbor",
    reference: "Teal (tealhq) deep teal + warm-gold CTA, warmed onto oat",
    positioning: "Calm and competent — a steady hand on the tiller.",
    tokens: {
      "--rd-field": "#E3DCCD",
      "--rd-bg-page": "#F1EEE4",
      "--rd-bg-card": "#FFFFFF",
      "--rd-bg-sidebar": "#E5E0D2",
      "--rd-bg-soft": "#EBE6D9",
      "--rd-border": "#E2DBC9",
      "--rd-border-subtle": "#E9E3D4",
      "--rd-border-hover": "#D0C8B2",
      "--rd-text": "#1F2620",
      "--rd-text-secondary": "#4F5A50",
      "--rd-text-tertiary": "#5E685E",
      "--rd-text-eyebrow": "#6E6A44",
      // primary + "good" band — deep muted teal
      "--rd-coral": "#1E6B60",
      "--rd-coral-dark": "#145049",
      "--rd-coral-tint": "#D6E9E4",
      // "strong" band — warm gold lift (the Teal-hq CTA move)
      "--rd-teal": "#B6871C",
      "--rd-teal-dark": "#775308",
      "--rd-teal-tint": "#F4E7C2",
      // "stretch" band — muted clay
      "--rd-golden": "#B0663C",
      "--rd-golden-dark": "#89492A",
      "--rd-golden-tint": "#F3E0D4",
      "--rd-peach": "#E0A578",
      "--rd-shadow":
        "0 22px 46px -14px rgba(30,55,50,0.20), 0 6px 16px rgba(30,55,50,0.10)",
    },
  },
  slate: {
    name: "Slate",
    reference:
      "Linear restraint + a desaturated warm periwinkle (not corp blue)",
    positioning: "A clear head — calm, focused, quietly modern.",
    tokens: {
      "--rd-field": "#E1DDD5",
      "--rd-bg-page": "#EFEDE8",
      "--rd-bg-card": "#FFFFFF",
      "--rd-bg-sidebar": "#E5E2DA",
      "--rd-bg-soft": "#EAE7E0",
      "--rd-border": "#E2DDD3",
      "--rd-border-subtle": "#E9E4DB",
      "--rd-border-hover": "#D0CABD",
      "--rd-text": "#24232A",
      "--rd-text-secondary": "#54535F",
      "--rd-text-tertiary": "#63626D",
      "--rd-text-eyebrow": "#66627A",
      // primary + "good" band — dusty periwinkle-indigo (desaturated, warm-lean)
      "--rd-coral": "#565CA0",
      "--rd-coral-dark": "#454A85",
      "--rd-coral-tint": "#E5E5F2",
      // "strong" band — deep muted teal-green
      "--rd-teal": "#2E7060",
      "--rd-teal-dark": "#1E5A4C",
      "--rd-teal-tint": "#D8EAE4",
      // "stretch" band — muted amber
      "--rd-golden": "#B0862C",
      "--rd-golden-dark": "#74540A",
      "--rd-golden-tint": "#F3E6C4",
      "--rd-peach": "#C99AB0",
      "--rd-shadow":
        "0 22px 46px -14px rgba(40,38,55,0.20), 0 6px 16px rgba(40,38,55,0.10)",
    },
  },
  dusk: {
    name: "Dusk",
    reference: "Glossier / Rhode — berry-plum on warm greige (incumbent)",
    positioning: "Warm through reds-violet — the batch-1 winner, here to beat.",
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
      "--rd-shadow":
        "0 22px 46px -14px rgba(46,30,40,0.22), 0 6px 16px rgba(46,30,40,0.10)",
    },
  },
};

export const HUE_KEYS = Object.keys(HUES);

// Every var any state touches — used to hard-reset before (re)applying so no
// partial palette leaks between switches.
const ALL_KEYS = Object.keys(HUES.clay.tokens);

// Apply DEPTH_BASE always, then overlay the chosen palette's full token set.
// Returns a restore fn that clears every touched var (back to the flat original).
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

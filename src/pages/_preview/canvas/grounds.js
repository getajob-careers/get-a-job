// GROUND — the page-background family, a toggle layer over Yishai. The rung
// session picked MEDIUM amplitude but flagged the ground: Yishai's cream #F4EBDA
// reads YELLOW at full-page scale (chroma 26), eye-straining over a long session
// and clashing with the cool mauve/blue cards (worst on CV). The warm cream was a
// landing-hero colour, not a work-surface ground.
//
// This keeps the ENSEMBLE (blue primary, mauve secondary, brown ink, cool cards)
// and only swaps the surface family (page/field/soft/sidebar/borders). Three
// candidates, each de-yellowed and tuned so (1) chroma drops for eye-comfort,
// (2) every text token clears AA on the new page/soft/sidebar, and (3) the card
// stays LIGHTER than the page so paper-lift still reads (audit-grounds section of
// audit-amplitude.mjs gates all three). Yishai-only; `cream` is the current
// ground kept as the A/B reference.

export const GROUND_LEVELS = ["cream", "neutral", "greige", "mauve"];
export const GROUND_LABELS = {
  cream: "Cream (now)",
  neutral: "Neutral",
  greige: "Greige",
  mauve: "Mauve",
};
export const DEFAULT_GROUND = "cream";

// Each set overrides the surface family only. `cream` = {} → the Yishai palette's
// own (rejected) warm cream, for comparison.
const YISHAI_GROUNDS = {
  cream: {},
  // Warm cream with the yellow pulled out — still warm, calmer (chroma ~12).
  neutral: {
    "--rd-bg-page": "#EEEAE2",
    "--rd-field": "#E0DACE",
    "--rd-bg-sidebar": "#E6E0D5",
    "--rd-bg-soft": "#E9E4D9",
    "--rd-border": "#DED8CC",
    "--rd-border-subtle": "#E7E1D6",
    "--rd-border-hover": "#CBC3B4",
  },
  // Warm gray / greige — the most restful, lowest luminance, strongest lift.
  greige: {
    "--rd-bg-page": "#EBE8E1",
    "--rd-field": "#DCD9D0",
    "--rd-bg-sidebar": "#E3E0D8",
    "--rd-bg-soft": "#E6E3DB",
    "--rd-border": "#DAD6CD",
    "--rd-border-subtle": "#E4E1D9",
    "--rd-border-hover": "#C8C4BA",
  },
  // Barely-mauve off-white — the ground JOINS the cool family instead of fighting
  // it (chroma ~4, a whisper of the mauve secondary).
  mauve: {
    "--rd-bg-page": "#ECE8EB",
    "--rd-field": "#DDD7DC",
    "--rd-bg-sidebar": "#E4DEE3",
    "--rd-bg-soft": "#E7E2E6",
    "--rd-border": "#DCD5DB",
    "--rd-border-subtle": "#E5DFE4",
    "--rd-border-hover": "#CAC2C9",
  },
};

export const GROUND_KEYS = [
  ...new Set(Object.values(YISHAI_GROUNDS).flatMap((s) => Object.keys(s))),
];

export function groundVars(paletteId, groundId) {
  if (paletteId !== "yishai") return {};
  return YISHAI_GROUNDS[groundId] || {};
}

// Apply the ground over palette + amplitude; return a restore fn. These are all
// shared palette surface keys, so restore removes them and the palette layer's
// teardown / re-apply owns the originals (same contract as amplitude.js).
export function applyGround(paletteId, groundId) {
  if (typeof document === "undefined") return () => {};
  const vars = groundVars(paletteId, groundId);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  return () => {
    for (const k of Object.keys(vars)) root.style.removeProperty(k);
  };
}

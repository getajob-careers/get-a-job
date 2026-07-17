// COLOUR AMPLITUDE — a second token layer applied OVER the active palette that
// controls HOW MUCH of the product colour actually covers (area × chroma), not
// which hue. The round-5 flip failed because a full palette swap moved ~3% of
// pixels: --rd-bg-card was #FFFFFF byte-identical in every candidate and there
// was no dark surface, so the palette had nowhere large to live. Amplitude fixes
// WHERE colour lives. See docs/design/color-amplitude-proposal.md.
//
// SUBTLE is the FLOOR (Eli: the flip already ruled today's ~3% too plain; the
// ladder question is which rung, not whether). The rungs:
//   subtle — cards stop being pure white; section headers + card band-strips
//            carry the family. Target real-chroma ~8–12%.
//   medium — full card tint, the coach panel owns a tint, kanban column bodies
//            carry a band wash, richer fills. Target ~15–20%. (Likely winner.)
//   bold   — + the CV header becomes a DARK ink block (the DropSection analogue
//            that made Yishai's mock feel alive), page darkened + shadow deepened
//            to keep paper-lift, bands at full strength. Target ~25–30%.
//
// SCOPE: Yishai-only for now (Eli: pick the rung under one hue, then re-flip the
// full field at the chosen amplitude). amplitudeVars returns {} for any other
// palette, so Clay/Heather/Moss/Pewter render exactly as before and the later
// field re-flip starts clean.
//
// ELEVATION RETUNE (proposed, not silent — Eli's instruction). Paper-lift leans
// on the card being BRIGHTER than the page (a luminance lift) plus the soft
// shadow. Tinting the card lowers its luminance, shrinking that lift. Rather than
// let either weaken silently: at MEDIUM the card still clears the page and the
// shadow is deepened to carry more of the lift; at BOLD the page is darkened a
// step AND the shadow deepened, so the card stays lifted above the page even at
// the deepest tint. Recorded in canvas-tokens.md (elevation section).

export const AMP_LEVELS = ["subtle", "medium", "bold"];
export const AMP_LABELS = { subtle: "Subtle", medium: "Medium", bold: "Bold" };
// The floor: a bare ?palette=yishai load is judged at SUBTLE, not at the failed ~3%.
export const DEFAULT_AMP = "subtle";

// Yishai amplitude sets. Card tints are cool off-whites pulled toward the blue
// primary (#60617D): they carry real chroma while keeping high luminance, so the
// card stays lifted above the warm cream page. Values are AA-verified for body
// text (audit-palettes.mjs + the light-on-ink check) and chroma-verified against
// the level targets (scripts/profile-amplitude.mjs).
const YISHAI_AMP = {
  subtle: {
    "--rd-bg-card": "#F1F2FA", // faint cool tint (chroma ~9), L well above page
    // Section/panel headers carry the primary instead of quiet eyebrow-brown.
    "--rd-amp-section-fg": "var(--rd-coral)",
    // Card band-strip (a hairline of the row's band along the card edge).
    "--rd-amp-bandstrip": "0.28",
  },
  medium: {
    "--rd-bg-card": "#ECEDF7", // fuller tint (chroma ~11), still above page L
    // Deepen the lift as luminance-lift shrinks (retune, step 1).
    "--rd-shadow":
      "0 22px 46px -14px rgba(52,50,74,0.30), 0 6px 16px rgba(52,50,74,0.16)",
    "--rd-amp-section-fg": "var(--rd-coral)",
    "--rd-amp-bandstrip": "0.5",
    // The coach panel OWNS a tint (Eli: a tint at medium, never a dark reading
    // surface). Soft blue reading panel, AA for body text.
    "--rd-amp-coach-bg": "#ECEDF5",
    // Kanban column bodies carry a faint band wash instead of the flat page.
    "--rd-amp-kanban-body": "#EEEDF4",
  },
  bold: {
    "--rd-bg-card": "#E7E9F5", // deepest tint (chroma ~14)
    // Retune step 2: darken the page a step + deepen the shadow so the deepest
    // card still reads lifted above the page (card L > page L holds).
    "--rd-bg-page": "#EEE1C9",
    "--rd-field": "#E1D4B6",
    "--rd-shadow":
      "0 24px 50px -12px rgba(52,50,74,0.36), 0 8px 20px rgba(52,50,74,0.20)",
    "--rd-amp-section-fg": "var(--rd-coral)",
    "--rd-amp-bandstrip": "0.85",
    "--rd-amp-coach-bg": "#E7E9F3",
    "--rd-amp-kanban-body": "#E9E8F2",
    // THE dark block — the CV header becomes a deep ink surface with light text.
    // Contrast verified ≥ AA (light-on-ink audit): cream-on-ink 12.36:1.
    "--rd-amp-cvheader-bg": "#2F2723",
    "--rd-amp-cvheader-fg": "#F4EBDA",
    "--rd-amp-cvheader-muted": "#C9BBA6",
    "--rd-amp-cvheader-accent": "#B9A2AC", // mauve, readable on ink
  },
};

// All the keys any amplitude level can set — used so switching a level fully
// clears the previous level's keys (never leaves a stale override behind, same
// discipline as the palette layer's fixed key set).
export const AMP_KEYS = [
  ...new Set(Object.values(YISHAI_AMP).flatMap((set) => Object.keys(set))),
];

// The override tokens for (palette, level). Yishai-only for now; every other
// palette returns {} so it renders exactly as the palette layer left it.
export function amplitudeVars(paletteId, ampId) {
  if (paletteId !== "yishai") return {};
  return YISHAI_AMP[ampId] || YISHAI_AMP[DEFAULT_AMP];
}

// Apply amplitude over the already-applied palette; return a restore fn. The
// caller applies the palette FIRST, then this, and tears down in reverse. On
// restore, --rd-bg-card / --rd-bg-page / --rd-field / --rd-shadow are palette
// keys too, so we only REMOVE the amp-specific --rd-amp-* keys and let the
// palette restore (or re-apply) own the shared ones.
export function applyAmplitude(paletteId, ampId) {
  if (typeof document === "undefined") return () => {};
  const vars = amplitudeVars(paletteId, ampId);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  return () => {
    // Remove only the amp-private keys; shared palette keys are restored by the
    // palette layer's own teardown / re-apply.
    for (const k of AMP_KEYS) {
      if (k.startsWith("--rd-amp-")) root.style.removeProperty(k);
    }
  };
}

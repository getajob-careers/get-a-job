// Clay — the adopted palette (round 3, hue exploration FINAL). Chosen from the
// research-led batch (docs/research/palette-market-scan-2026-07) as the single
// direction: warm putty surface + grounded terracotta primary + one deep-teal
// cool accent — the vacant "warm, calm, capable" ground in the career category
// ("capable hands, not a corporate queue"). The switcher and the other
// candidates are retired; Dusk's tokens live in _graveyard.js for reference.
//
// Applied once on mount to document.documentElement so portaled overlays (CV-gen
// theatre, job modal, kanban ghost, avatar menu) inherit; torn down on unmount.
// Includes the Depth structure's field tone + long shadow — Depth is the base.
//
// Invariants that must hold (see ring.js + jobCardDisplay BAND_META):
//   - hard constraint a: rings have a low-fill floor (ring.js).
//   - hard constraint b: every band -dark clears WCAG AA (>=4.5:1) on BOTH
//     --rd-bg-card and its own -tint. Clay is in-browser audited (worst 5.48:1).
//   - bands stay well separated on the wheel: strong = deep teal, good/primary =
//     clay terracotta, stretch = ochre-gold.

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
  "--rd-text-eyebrow": "#7C6A46",
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
};

const KEYS = Object.keys(CLAY);

// Apply Clay to the document root; return a restore fn that clears every var
// (back to the flat original tokens) on unmount.
export function applyPalette() {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  for (const [k, v] of Object.entries(CLAY)) root.style.setProperty(k, v);
  return () => {
    for (const k of KEYS) root.style.removeProperty(k);
  };
}

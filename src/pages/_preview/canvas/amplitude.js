// COLOUR AMPLITUDE — LOCKED at MEDIUM (Eli crowned Yishai + medium, 2026-07-17).
// This was a ladder (subtle/medium/bold) explored across a five-palette field;
// medium won and Yishai won, so this collapses to the single always-on treatment.
// The subtle/bold rungs and the four other palettes' medium sets are retired (git
// history). It is applied over the YISHAI palette on mount — no param, no toggle.
//
// What MEDIUM does (the crowned look), and why each value is safe:
//   - TINTED CARD (#ECEDF7) — a cool tint toward the blue primary that carries
//     real chroma while staying LIGHTER than the greige page, so paper-lift holds
//     (the whole reason the ground is greige, not the old yellow cream).
//   - ELEVATION RETUNE — the shadow is deepened because tinting the card shrinks
//     the luminance-lift; the deepened shadow carries the rest (canvas-tokens.md).
//   - MAUVE-FORWARD (Eli: mauve as ITSELF, not a lavender-gray dilution) — vivid
//     mauve #9B7D8A on NON-TEXT surfaces (kanban header fill, washes, deco), where
//     only the 3:1 UI floor applies. As a fill it carries WHITE LARGE-BOLD labels
//     only (white-on-mauve 3.69:1 ≥ the 3:1 large-bold floor; the kanban label is
//     bumped to 20px in amplitude.css to qualify) — never small/body text.
//   - MAUVE WASH (#EFE4E8) — a light surface, so ink / mauve-dark text clears 4.5.
//   - COACH TINT — the coach panel owns a soft blue tint (never a dark reading
//     surface); SECTION HEADERS move to the primary; DECO picks up mauve.
// All AA + elevation gated by scripts/audit-amplitude.mjs.

export const MEDIUM = {
  "--rd-bg-card": "#ECEDF7",
  "--rd-shadow":
    "0 22px 46px -14px rgba(52,50,74,0.30), 0 6px 16px rgba(52,50,74,0.16)",
  "--rd-amp-section-fg": "var(--rd-coral)",
  "--rd-amp-bandstrip": "0.5",
  "--rd-amp-coach-bg": "#ECEDF5",
  "--rd-amp-mauve": "#9B7D8A",
  "--rd-amp-mauve-wash": "#E9DAE0",
  "--rd-amp-kanban-header": "#9B7D8A",
  "--rd-amp-kanban-label": "#FFFFFF",
  "--rd-amp-kanban-body": "#EFE4E8",
  "--rd-amp-deco": "#9B7D8A",
};

export const AMP_KEYS = Object.keys(MEDIUM);

// Apply the locked MEDIUM treatment over the already-applied palette; return a
// restore fn that removes exactly the keys it set. The caller applies the palette
// FIRST, then this; any shared palette key this overrode is restored by the
// palette layer's own re-apply / teardown.
export function applyAmplitude() {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  for (const [k, v] of Object.entries(MEDIUM)) root.style.setProperty(k, v);
  return () => {
    for (const k of AMP_KEYS) root.style.removeProperty(k);
  };
}

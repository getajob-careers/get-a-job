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
    // ── MAUVE-FORWARD (Eli: mauve as ITSELF, not a lavender-gray dilution) ──
    // Full-vividness mauve on NON-TEXT surfaces (STEP 1, no 4.5 relaxation): the
    // 3:1 UI floor is all that applies to fills/deco/glow/borders (mauve clears
    // it, 3.05–3.17 on the surfaces). Mauve as a fill takes only WHITE LARGE-BOLD
    // text (3.69:1 ≥ the 3:1 large-bold AA floor) — never small or body text.
    "--rd-amp-mauve": "#9B7D8A", // full vividness, fills/deco/glow/borders
    "--rd-amp-mauve-wash": "#E9DAE0", // light wash (chroma 15), ink text ≥ 4.5
    // The TRACKER carries the mauve: filled mauve column headers with white bold
    // labels; column bodies a mauve wash (was a blue-gray wash).
    "--rd-amp-kanban-header": "#9B7D8A",
    "--rd-amp-kanban-label": "#FFFFFF", // large-bold on mauve = 3.69:1, legal
    "--rd-amp-kanban-body": "#EFE4E8", // faint mauve wash, ink text ≥ 4.5
    // Background deco (CanvasField) picks up mauve instead of ochre/teal.
    "--rd-amp-deco": "#9B7D8A",
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
    "--rd-amp-mauve": "#9B7D8A",
    "--rd-amp-mauve-wash": "#E3CFD7", // deeper wash at bold (chroma 20), ink 5.68
    "--rd-amp-kanban-header": "#9B7D8A",
    "--rd-amp-kanban-label": "#FFFFFF",
    "--rd-amp-kanban-body": "#E9DAE0", // stronger mauve wash, ink ≥ 4.5
    "--rd-amp-deco": "#9B7D8A",
    // THE CV header (bold): NOT the dead black slab (Eli killed it). A bled-to-edge
    // MAUVE TINT BAND — light, purple, reads as brand, keeps ink text. Headline in
    // mauve-dark. Contrast AA-verified (audit-amplitude: ink 6.24, headline 5.02).
    "--rd-amp-cvheader-bg": "#E9DAE0",
    "--rd-amp-cvheader-headline": "#6E5460",
  },
};

// ── THE FINAL FIELD: MEDIUM for every palette ──────────────────────────────
// Eli picked MEDIUM as the rung; the flip now dresses ALL FIVE finalists in the
// same medium treatment so each is judged fairly, not just Yishai. Each palette's
// medium set is DERIVED by the same method (scripts derive it; values pasted):
//   - a RESTFUL GROUND per family — the page pulled toward its own field tone
//     (the Yishai-cream-was-a-hero-colour lesson, applied to every palette), which
//     also makes room for the tinted card to sit lifted above it;
//   - a TINTED CARD toward the palette's colour source (its primary; for Pewter,
//     whose primary is deliberately grey, toward its secondary);
//   - a SECONDARY-ACCENT-FORWARD pass = filled kanban headers in the palette's
//     secondary accent (Yishai's mauve headers, generalised) with white large-bold
//     labels, a secondary wash on column bodies, secondary deco;
//   - a coach tint + section headers on the primary.
// Every value is AA-gated (audit-amplitude.mjs iterates all five) and every card
// is verified lifted above its page. Token names keep the historical `mauve`
// prefix but hold each palette's own secondary. Logos are global already (the
// white chip is palette-independent), so every finalist shows them.
const MEDIUM_BY_PALETTE = {
  yishai: YISHAI_AMP.medium,
  clay: {
    "--rd-bg-page": "#ECE5DB",
    "--rd-field": "#D6CFC3",
    "--rd-bg-soft": "#F3EEE8",
    "--rd-bg-sidebar": "#EAE3D8",
    "--rd-text-eyebrow": "#9C502B",
    "--rd-bg-card": "#F7F0EC",
    "--rd-shadow":
      "0 22px 46px -14px rgba(74,44,22,0.30), 0 6px 16px rgba(74,44,22,0.16)",
    "--rd-amp-section-fg": "var(--rd-coral)",
    "--rd-amp-bandstrip": "0.5",
    "--rd-amp-coach-bg": "#E8EFEE",
    "--rd-amp-mauve": "#2E7062",
    "--rd-amp-mauve-wash": "#DBE7E4",
    "--rd-amp-kanban-header": "#2E7062",
    "--rd-amp-kanban-label": "#FFFFFF",
    "--rd-amp-kanban-body": "#DBE7E4",
    "--rd-amp-deco": "#2E7062",
  },
  heather: {
    "--rd-bg-page": "#EBE4E4",
    "--rd-field": "#D4CDCF",
    "--rd-bg-soft": "#F2EDED",
    "--rd-bg-sidebar": "#E9E2E2",
    "--rd-text-eyebrow": "#705F66",
    "--rd-bg-card": "#F1EDEF",
    "--rd-shadow":
      "0 22px 46px -14px rgba(52,38,48,0.30), 0 6px 16px rgba(52,38,48,0.16)",
    "--rd-amp-section-fg": "var(--rd-coral)",
    "--rd-amp-bandstrip": "0.5",
    "--rd-amp-coach-bg": "#EDF1EF",
    "--rd-amp-mauve": "#5C7F72",
    "--rd-amp-mauve-wash": "#E3E9E7",
    "--rd-amp-kanban-header": "#5C7F72",
    "--rd-amp-kanban-label": "#FFFFFF",
    "--rd-amp-kanban-body": "#E3E9E7",
    "--rd-amp-deco": "#5C7F72",
  },
  moss: {
    "--rd-bg-page": "#E9E6DA",
    "--rd-field": "#D2CFBF",
    "--rd-bg-soft": "#F1EFE7",
    "--rd-bg-sidebar": "#E7E4D6",
    "--rd-text-eyebrow": "#5A6B33",
    "--rd-bg-card": "#EAECE4",
    "--rd-shadow":
      "0 22px 46px -14px rgba(40,48,28,0.30), 0 6px 16px rgba(40,48,28,0.16)",
    "--rd-amp-section-fg": "var(--rd-coral)",
    "--rd-amp-bandstrip": "0.5",
    "--rd-amp-coach-bg": "#E8EFEF",
    "--rd-amp-mauve": "#2F6A6E",
    "--rd-amp-mauve-wash": "#DCE6E6",
    "--rd-amp-kanban-header": "#2F6A6E",
    "--rd-amp-kanban-label": "#FFFFFF",
    "--rd-amp-kanban-body": "#DCE6E6",
    "--rd-amp-deco": "#2F6A6E",
  },
  pewter: {
    "--rd-bg-page": "#EAE7E0",
    "--rd-field": "#D2CEC6",
    "--rd-bg-soft": "#F1EFEB",
    "--rd-bg-sidebar": "#E7E4DD",
    "--rd-text-eyebrow": "#444751",
    "--rd-bg-card": "#EEF2F0",
    "--rd-shadow":
      "0 22px 46px -14px rgba(34,36,42,0.30), 0 6px 16px rgba(34,36,42,0.16)",
    "--rd-amp-section-fg": "var(--rd-coral)",
    "--rd-amp-bandstrip": "0.5",
    "--rd-amp-coach-bg": "#EAEFED",
    "--rd-amp-mauve": "#3E6B5C",
    "--rd-amp-mauve-wash": "#DEE6E3",
    "--rd-amp-kanban-header": "#3E6B5C",
    "--rd-amp-kanban-label": "#FFFFFF",
    "--rd-amp-kanban-body": "#DEE6E3",
    "--rd-amp-deco": "#3E6B5C",
  },
};

// All the keys any amplitude level can set — used so switching a level fully
// clears the previous level's keys (never leaves a stale override behind).
export const AMP_KEYS = [
  ...new Set([
    ...Object.values(YISHAI_AMP).flatMap((s) => Object.keys(s)),
    ...Object.values(MEDIUM_BY_PALETTE).flatMap((s) => Object.keys(s)),
  ]),
];

// The override tokens for (palette, level). MEDIUM is defined for ALL five
// finalists (the field flip); subtle/bold remain Yishai-only (the rung is fixed
// at medium, so the others are never judged at subtle/bold). Unknown → {}.
export function amplitudeVars(paletteId, ampId) {
  if (ampId === "medium") return MEDIUM_BY_PALETTE[paletteId] || {};
  if (paletteId === "yishai") return YISHAI_AMP[ampId] || YISHAI_AMP.medium;
  return {};
}

// Apply amplitude over the already-applied palette; return a restore fn that
// removes exactly the keys it set. The caller applies the palette FIRST, then
// this, and tears down in reverse — so any shared palette key this overrode
// (page/field/soft/sidebar/card/shadow/eyebrow) is restored by the palette
// layer's own re-apply / teardown after this removes the override.
export function applyAmplitude(paletteId, ampId) {
  if (typeof document === "undefined") return () => {};
  const vars = amplitudeVars(paletteId, ampId);
  const root = document.documentElement;
  const keys = Object.keys(vars);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  return () => {
    for (const k of keys) root.style.removeProperty(k);
  };
}

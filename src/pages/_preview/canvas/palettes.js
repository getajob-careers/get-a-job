// Palette exploration for the design canvas (round 3, item 4). Three genuinely
// distinct colour directions applied as PURE TOKEN SWAPS — every --rd-* var is
// reassigned; structure, spacing, and motion are untouched. Activated by
// ?palette=a|b|c and applied to document.documentElement so portaled overlays
// (CV-gen theatre, job modal, kanban drag ghost, avatar menu) inherit too. The
// hook restores the default sheet on cleanup, so leaving the canvas — or
// dropping the param — returns to the live cream+coral tokens.
//
// Each direction is anchored in a real market position so the choice is about
// product identity, not taste:
//   a EDITORIAL   — paper white + ink + one saturated accent (Linear / Notion:
//                   "a professional instrument"). Accent = saturated indigo.
//   b DEEP        — rich warm-dark neutrals + a luminous accent (Perplexity /
//                   Raycast: "a modern AI product"). Accent = glowing coral,
//                   bands go luminous cyan / amber on near-black.
//   c FRESH-GREEN — light but chromatic, NOT cream — a confident emerald
//                   (growth / "you got this"), deliberately cooler and more
//                   saturated than Glassdoor #0CAA41 / Greenhouse's teal-green.
//
// Semantic note: --rd-coral is the PRIMARY accent role, --rd-teal the "strong
// match" band, --rd-golden the "stretch" band (see BAND_META in
// jobCardDisplay). Each palette keeps those three hues distinct so score rings
// and status bands never collapse. In the dark palette the *-tint vars become
// dark surfaces and the *-dark vars become the LIGHT foreground drawn on them
// (they also serve as button-hover) — the light-mode relationship inverts.

// The base sheet (mirrors src/index.css :root) — used to hard-reset every var
// on cleanup so we never leak a partial palette back onto the live tokens.
const BASE = {
  "--rd-bg-page": "#FAF6F0",
  "--rd-bg-card": "#FFFFFF",
  "--rd-bg-sidebar": "#EFE7DB",
  "--rd-bg-soft": "#F3ECE0",
  "--rd-border": "#F0E7D8",
  "--rd-border-subtle": "#EDE7DD",
  "--rd-border-hover": "#E0D6C4",
  "--rd-text": "#211D18",
  "--rd-text-secondary": "#6E675B",
  "--rd-text-tertiary": "#5E584E",
  "--rd-text-eyebrow": "#766445",
  "--rd-coral": "#D6421F",
  "--rd-coral-dark": "#B23A17",
  "--rd-coral-tint": "#FCE6DF",
  "--rd-teal": "#54B5A2",
  "--rd-teal-dark": "#2A6E5E",
  "--rd-teal-tint": "#DBEEE8",
  "--rd-golden": "#EFB23E",
  "--rd-golden-dark": "#7A5408",
  "--rd-golden-tint": "#FBEBC9",
  "--rd-peach": "#E79B7D",
  "--rd-shadow": "0 10px 28px rgba(40, 25, 10, 0.07)",
  // Coach-panel grain knobs (read by CanvasCoachDock; fall back to these).
  "--rd-grain-blend": "multiply",
  "--rd-grain-opacity": "0.05",
};

export const PALETTES = {
  a: {
    name: "Editorial",
    reference: "Linear / Notion — a professional instrument",
    tokens: {
      "--rd-bg-page": "#FBFBFD",
      "--rd-bg-card": "#FFFFFF",
      "--rd-bg-sidebar": "#F4F4F8",
      "--rd-bg-soft": "#F1F1F6",
      "--rd-border": "#E7E7EF",
      "--rd-border-subtle": "#EDEDF3",
      "--rd-border-hover": "#D5D5E0",
      "--rd-text": "#191922",
      "--rd-text-secondary": "#54545F",
      "--rd-text-tertiary": "#6A6A75",
      "--rd-text-eyebrow": "#6C6C82",
      // primary — saturated indigo
      "--rd-coral": "#5B54E8",
      "--rd-coral-dark": "#4740C4",
      "--rd-coral-tint": "#ECEBFC",
      // strong-match band — emerald (distinct from indigo primary)
      "--rd-teal": "#10B981",
      "--rd-teal-dark": "#047857",
      "--rd-teal-tint": "#D6F6E7",
      // stretch band — amber
      "--rd-golden": "#F59E0B",
      "--rd-golden-dark": "#B45309",
      "--rd-golden-tint": "#FEF1CE",
      "--rd-peach": "#EFA98C",
      "--rd-shadow":
        "0 1px 2px rgba(20,20,45,0.06), 0 8px 22px rgba(20,20,45,0.06)",
      "--rd-grain-blend": "multiply",
      "--rd-grain-opacity": "0.035",
    },
  },
  b: {
    name: "Deep + Luminous",
    reference: "Perplexity / Raycast — a modern AI product",
    tokens: {
      "--rd-bg-page": "#1A1712",
      "--rd-bg-card": "#232019",
      "--rd-bg-sidebar": "#14120D",
      "--rd-bg-soft": "#2A2720",
      "--rd-border": "#34302A",
      "--rd-border-subtle": "#2C2924",
      "--rd-border-hover": "#463F38",
      "--rd-text": "#F5F1E8",
      "--rd-text-secondary": "#BEB6A7",
      "--rd-text-tertiary": "#97907F",
      "--rd-text-eyebrow": "#B2A688",
      // primary — glowing coral (deep enough for white text; hover brighter)
      "--rd-coral": "#E85D3D",
      "--rd-coral-dark": "#FF7A5C",
      "--rd-coral-tint": "#38221B",
      // strong-match band — luminous cyan-teal
      "--rd-teal": "#2DD4BF",
      "--rd-teal-dark": "#5EEAD4",
      "--rd-teal-tint": "#123A34",
      // stretch band — luminous amber
      "--rd-golden": "#FBBF24",
      "--rd-golden-dark": "#FCD34D",
      "--rd-golden-tint": "#3A2E12",
      "--rd-peach": "#F0A98C",
      "--rd-shadow": "0 2px 8px rgba(0,0,0,0.5), 0 12px 30px rgba(0,0,0,0.42)",
      // grain lightens the dark surface (screen) so it reads as film, not mud
      "--rd-grain-blend": "screen",
      "--rd-grain-opacity": "0.06",
    },
  },
  c: {
    name: "Fresh Green",
    reference:
      "confident emerald — distinct from Glassdoor / Greenhouse greens",
    tokens: {
      "--rd-bg-page": "#F3FAF6",
      "--rd-bg-card": "#FFFFFF",
      "--rd-bg-sidebar": "#E4F2EA",
      "--rd-bg-soft": "#EAF5EF",
      "--rd-border": "#D8EBE1",
      "--rd-border-subtle": "#E2EFE8",
      "--rd-border-hover": "#C3DDCF",
      "--rd-text": "#12241C",
      "--rd-text-secondary": "#4A5C52",
      "--rd-text-tertiary": "#586A60",
      "--rd-text-eyebrow": "#4E6A59",
      // primary — confident emerald
      "--rd-coral": "#0EA46E",
      "--rd-coral-dark": "#0A7D54",
      "--rd-coral-tint": "#D6F2E4",
      // strong-match band — cooler blue-teal (distinct from emerald primary)
      "--rd-teal": "#0891B2",
      "--rd-teal-dark": "#0E7490",
      "--rd-teal-tint": "#CFF0F7",
      // stretch band — warm amber
      "--rd-golden": "#EAB308",
      "--rd-golden-dark": "#92700A",
      "--rd-golden-tint": "#FAF0CD",
      "--rd-peach": "#EE9E7B",
      "--rd-shadow":
        "0 1px 2px rgba(10,60,40,0.06), 0 8px 20px rgba(10,60,40,0.07)",
      "--rd-grain-blend": "multiply",
      "--rd-grain-opacity": "0.04",
    },
  },
};

export const PALETTE_KEYS = Object.keys(PALETTES);

// Apply a palette's tokens to the document root; return a restore fn that resets
// every var to BASE (never a stale partial). No-op for an unknown/absent key.
export function applyPalette(key) {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  const palette = PALETTES[key];
  const tokens = palette ? palette.tokens : BASE;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
  return () => {
    for (const k of Object.keys(BASE)) root.style.removeProperty(k);
  };
}

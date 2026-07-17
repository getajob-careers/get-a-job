import React from "react";

// Ground texture options — a REFINEMENT toggle (rip when Eli picks). The greige
// ground reads flat; these add subtle texture, felt more than seen. All three are
// pure CSS on the ground layer (no image asset), so they survive the port as a
// page-background treatment. Static (no motion), painted on the -z-10 field layer
// BEHIND cards — so they can't reduce card-vs-ground elevation or text AA (text
// sits on opaque cards; the eyebrow/labels on the ground are barely perturbed).
//
// NOTE: this only renders because the shell is a stacking context (`isolate` in
// Home3TabPreview). Without it the -z-10 layer escapes behind the opaque Layout
// <main> and is invisible — the bug this toggle first shipped with.
//
//   grain    — a faint paper/fibre noise (inline SVG feTurbulence).
//   gradient — a barely-there tonal wash, brighter high-centre → greige.
//   dots     — a micro ink-dot grid.
//
// Each option's visibility is one number: `base` opacity on the layer div (with
// the pattern itself at full internal alpha). The INTENSITY control multiplies it
// (1× / 3× / 6×) so Eli can find the "felt not seen" ceiling per direction instead
// of guessing at a blind opacity floor.

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// pattern = the full-alpha layer; base = its opacity at 1× intensity.
const TEXTURES = {
  none: null,
  grain: {
    base: 0.06,
    pattern: {
      backgroundImage: GRAIN_URL,
      backgroundRepeat: "repeat",
      mixBlendMode: "multiply",
    },
  },
  gradient: {
    base: 0.5,
    pattern: {
      background:
        "radial-gradient(135% 95% at 50% -12%, rgba(255,255,255,1), rgba(255,255,255,0) 55%)",
    },
  },
  dots: {
    base: 0.06,
    pattern: {
      backgroundImage:
        "radial-gradient(rgba(96,72,62,1) 0.5px, transparent 0.6px)",
      backgroundSize: "20px 20px",
    },
  },
};

export const TEXTURE_OPTIONS = ["none", "grain", "gradient", "dots"];
export const TEXTURE_INTENSITIES = [1, 3, 6];

export default function CanvasTexture({ texture = "none", intensity = 1 }) {
  const def = TEXTURES[texture];
  if (!def) return null;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 pointer-events-none"
      style={{ ...def.pattern, opacity: Math.min(1, def.base * intensity) }}
    />
  );
}

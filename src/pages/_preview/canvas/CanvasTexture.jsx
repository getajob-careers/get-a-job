import React from "react";

// Ground texture options — a REFINEMENT toggle (rip when Eli picks). The greige
// ground reads a touch flat at full-page scale; these add subtle texture, felt
// more than seen. All three are pure CSS on the ground layer (no image asset), so
// they survive the port as a page-background treatment. Static (no motion), very
// low contrast, painted BEHIND cards on the -z-10 field layer — so they can't
// reduce card-vs-ground elevation or text AA (text sits on opaque cards, or is
// the eyebrow/labels on the page, which these barely perturb).
//
//   grain    — a faint paper/fibre noise (inline SVG feTurbulence, low opacity).
//   gradient — a barely-there tonal wash, brighter high-centre → greige.
//   dots     — a micro ink-dot grid at very low opacity.

// SVG fractal-noise, grayscale; low opacity over greige reads as paper grain.
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const STYLES = {
  none: null,
  grain: {
    backgroundImage: GRAIN_URL,
    backgroundRepeat: "repeat",
    opacity: 0.05,
    mixBlendMode: "multiply",
  },
  gradient: {
    background:
      "radial-gradient(135% 95% at 50% -12%, rgba(255,255,255,0.6), rgba(255,255,255,0) 55%)",
  },
  dots: {
    backgroundImage:
      "radial-gradient(rgba(96,72,62,0.05) 0.5px, transparent 0.6px)",
    backgroundSize: "20px 20px",
  },
};

export default function CanvasTexture({ texture = "none" }) {
  const style = STYLES[texture];
  if (!style) return null;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 pointer-events-none"
      style={style}
    />
  );
}

export const TEXTURE_OPTIONS = ["none", "grain", "gradient", "dots"];

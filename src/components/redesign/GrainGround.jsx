import React from "react";

// GrainGround - the canonical LOCKED grain texture (SINGLE SOURCE OF TRUTH). A
// faint paper/fibre noise (inline SVG feTurbulence) multiplied over the ground,
// felt more than seen. Pure CSS (no image asset). Static. Painted on a `-z-10`
// layer BEHIND content, so it never touches text AA or card-vs-ground elevation.
// Final baked opacity 0.36. The canvas `_preview/canvas/CanvasTexture.jsx`
// re-exports THIS file, and both the canvas + the production Layout import it, so
// the grain cannot fork again (it did once, in Phase 0). It sits ON TOP of
// DepthField (rendered first) - the field tone + arcs are the base it composites
// on; grain alone over the bare page reads lighter and flatter (that was the bug).
//
// CRITICAL: this only paints when its nearest positioned ancestor is a STACKING
// CONTEXT (`isolate` on the Layout shell). Without it the `-z-10` layer escapes
// upward and paints behind the opaque page background - silently invisible.
// Verify visual changes by pixel-diff, not computed style. See the ground spec in
// docs/design/canvas-tokens.md.

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function GrainGround() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 pointer-events-none"
      style={{
        backgroundImage: GRAIN_URL,
        backgroundRepeat: "repeat",
        mixBlendMode: "multiply",
        opacity: 0.36,
      }}
    />
  );
}

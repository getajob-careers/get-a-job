import React from "react";

// GrainGround - the LOCKED ground texture (page-port Phase 0), promoted from the
// canvas `CanvasTexture` to production. A faint paper/fibre noise (inline SVG
// feTurbulence) multiplied over the greige ground, felt more than seen. Pure CSS
// (no image asset). Static. Painted on a `-z-10` layer BEHIND content, so it
// never touches text AA or card-vs-ground elevation. Final baked opacity 0.36.
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

import React from "react";

// Ground grain — LOCKED (Eli, 2026-07-17): the permanent ground texture. A faint
// paper/fibre noise (inline SVG feTurbulence) multiplied over the greige ground,
// felt more than seen. Pure CSS (no image asset), so it survives the port as a
// page-background treatment. Static, painted on the -z-10 field layer BEHIND
// cards — so it can't touch text AA or card-vs-ground elevation.
//
// The opacity is the FINAL baked value (was grain base 0.06 × the 6× intensity
// Eli picked = 0.36); no runtime math. Gradient + dots explorations are retired
// to _graveyard.js.
//
// CRITICAL: this only paints because the shell is a STACKING CONTEXT (`isolate`
// in Home3TabPreview). Without it the -z-10 layer escapes and paints behind the
// opaque Layout <main> and silently vanishes. See canvas-tokens.md (ground spec).

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function CanvasTexture() {
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

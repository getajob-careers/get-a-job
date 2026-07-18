import React from "react";

// GrainGround - the canonical ground TEXTURE (SINGLE SOURCE OF TRUTH). As of
// 2026-07-18 this is the mockup's DOT GRID, not grain: a subtle radial-gradient
// dot pattern in the border tone (--rd-border), 1.1px dots on a 26px grid - the
// exact texture the canonical handoff mockup paints on its content area (see
// docs/design/reference/app-handoff-mockup.html). The old feTurbulence grain
// retired to the graveyard: it was greying the cream (Eli's ruling). Painted on a
// transparent `-z-10` pointer-events-none layer over DepthField, so it never
// touches text AA or card-vs-ground elevation. Token-driven, so it re-tints.
//
// (File name kept as GrainGround for now so existing imports/re-exports resolve;
// a rename to DotGround is a follow-up cleanup. Verify visual changes by
// pixel-diff, not computed style. See the ground spec in canvas-tokens.md.)

const DOT_GRID =
  "radial-gradient(var(--rd-border, #E0D2B9) 1.1px, transparent 1.1px)";

export default function GrainGround() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 pointer-events-none"
      style={{
        backgroundImage: DOT_GRID,
        backgroundSize: "26px 26px",
      }}
    />
  );
}

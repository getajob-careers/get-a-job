import React from "react";

// GrainGround - the canonical ground TEXTURE layer (SINGLE SOURCE OF TRUTH),
// mounted flag-on in Layout + CanvasShell and re-exported as the preview's
// CanvasTexture. As of 2026-07-22 it renders the DIRECTIONAL WASH (Slice 1
// winner): a smooth, warm cream deepening along one diagonal, applied via the
// token-level `.rd-ground` class (`--rd-ground-wash`).
//
// History: dot grid (2026-07-18) -> retired. feTurbulence grain -> retired.
// PARTICULATE TEXTURE IS RETIRED AT THE CATEGORY LEVEL (dots + baked grain both
// read as a dirty screen; Eli 2026-07-22). The wash is the only ground treatment,
// and it beat a flat ground on Eli's eye. See canvas-tokens.md + the phase-2 plan.
//
// The wash is NORMAL-COMPOSITE (a plain alpha gradient, no mix-blend-mode), so it
// renders identically regardless of the -z-10 isolate stacking context - the
// blend cannot be occluded/altered the way a blend-mode layer could. Painted on a
// transparent `-z-10` pointer-events-none layer over DepthField's cream base, so
// it never touches text AA or card-vs-ground elevation. Fixed to the shell (not
// the scroll container), so it does not shimmer on scroll.
//
// (File name kept as GrainGround so existing imports/re-exports resolve; a rename
// to GroundWash is a follow-up cleanup. Verify visual changes by pixel-diff, not
// computed style. See the ground spec in canvas-tokens.md.)

export default function GrainGround() {
  return (
    <div
      aria-hidden="true"
      className="rd-ground absolute inset-0 -z-10 pointer-events-none"
    />
  );
}

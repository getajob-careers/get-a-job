import React from "react";

// DepthField - the canonical depth-field ground layer (SINGLE SOURCE OF TRUTH,
// 2026-07-18). A deeper field tone (--rd-field #DCD9D0) with oversized brand arcs
// bleeding off-canvas behind the content, rendered as an absolute, -z-10,
// pointer-events-none layer inside the isolate shell. Token-driven, so it re-tints
// with the palette.
//
// This is the base the grain composites on. Page-port Phase 0 originally shipped
// only the grain over the bare page (#EBE8E1), which made the real app ground read
// LIGHTER and flatter than the crowned canvas ground (#DCD9D0 + arcs). Both the
// canvas (`_preview/canvas/CanvasField.jsx` re-exports this) and the production
// Layout import THIS file, so the two grounds cannot drift again.
//
// Render ORDER matters: DepthField first, then GrainGround, so the grain (multiply)
// paints on top of the field tone + arcs - identical to the canvas stack.

export default function DepthField() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: "var(--rd-field, #DCD9D0)" }}
    >
      <svg
        className="absolute -right-[16%] -bottom-[26%] w-[64%] h-auto"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle
          cx="200"
          cy="200"
          r="182"
          stroke="var(--rd-coral)"
          strokeWidth="48"
          opacity="0.07"
        />
        <circle
          cx="200"
          cy="200"
          r="116"
          stroke="var(--rd-amp-deco, var(--rd-golden))"
          strokeWidth="30"
          opacity="0.06"
        />
      </svg>
      <svg
        className="absolute -left-[13%] -top-[20%] w-[40%] h-auto"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle
          cx="200"
          cy="200"
          r="152"
          stroke="var(--rd-teal)"
          strokeWidth="38"
          opacity="0.06"
        />
      </svg>
    </div>
  );
}

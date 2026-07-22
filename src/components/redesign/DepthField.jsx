import React from "react";

// DepthField - the canonical field ground layer (SINGLE SOURCE OF TRUTH). The
// cream base (--rd-field) with two large, heavily-blurred colour BLOBS bleeding
// off-canvas behind the content - the exact decorative treatment from the
// canonical handoff mockup (.blob-a accent + .blob-b mauve; see
// docs/design/reference/app-handoff-mockup.html). Rendered as an absolute, -z-10,
// pointer-events-none layer inside the isolate shell. Token-driven, so it
// re-tints with the palette.
//
// The DotGround dot grid composites on top of this (render ORDER: DepthField
// first, then DotGround). The previous greige arcs + the grain layer were retired
// here (2026-07-18) when Eli ruled the mockup colours canonical - the grain was
// greying the cream. See the ground spec + graveyard note in canvas-tokens.md.

export default function DepthField() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: "var(--rd-field, #F4EBDA)" }}
    >
      {/* .blob-a - accent wash, top-right */}
      <div
        className="absolute rounded-full"
        style={{
          width: 420,
          height: 420,
          top: -140,
          right: -120,
          background: "var(--rd-primary)",
          filter: "blur(130px)",
          opacity: 0.1,
        }}
      />
      {/* .blob-b - mauve wash, lower-left */}
      <div
        className="absolute rounded-full"
        style={{
          width: 340,
          height: 340,
          bottom: -100,
          left: "30%",
          background: "var(--rd-teal)",
          filter: "blur(120px)",
          opacity: 0.12,
        }}
      />
    </div>
  );
}

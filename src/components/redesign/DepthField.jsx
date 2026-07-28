import React from "react";

// DepthField - the canonical field BASE layer (SINGLE SOURCE OF TRUTH): the cream
// field tone (--rd-field) behind the content, an absolute -z-10 pointer-events-none
// layer inside the isolate shell. Token-driven, so it re-tints with the palette.
//
// The GroundWash layer (now the directional WASH, the Slice 1 winner) composites
// on top of this (render ORDER: DepthField base first, then the wash).
//
// The two large blurred colour BLOBS were RETIRED here (2026-07-22): as the round-3
// "warm mottle" variant they lost to the directional wash on Eli's eye (the accent
// blob's cool top-right corner was a contributing rejection factor). The ground is
// now cream + the directional wash only - no blobs, no particulate. Earlier the
// greige arcs + the feTurbulence grain were retired here (2026-07-18). See the
// ground spec + graveyard note in canvas-tokens.md.

export default function DepthField() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: "var(--rd-field, #F4EBDA)" }}
    />
  );
}

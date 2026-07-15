// Depth field (round 3 rev 2). Depth won structurally, so it's now the always-on
// base for the adopted palette (see palette.js). A deeper field tone with white
// cards lifted above it by the long shadow token, plus oversized brand arcs
// bleeding off-canvas behind the columns. Everything is token-driven — the field
// tone reads --rd-field and the arcs read the accent/band tokens — so it
// re-tints automatically when a hue swaps those vars.
//
// Reference: 02_outcrowd_banking_dashboard (docs/design/inspo) — layered
// soft-shadow depth. Rendered as an absolute, -z-10, pointer-events-none layer
// inside the shell (relative + overflow-hidden, so the arcs clip to the shell).
import React from "react";

export default function CanvasField() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: "var(--rd-field, #EAE1D2)" }}
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
          stroke="var(--rd-golden)"
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

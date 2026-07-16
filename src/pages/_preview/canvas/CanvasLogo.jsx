import React from "react";

// Get A Job wordmark — the "A" is a person working at an A-frame desk/laptop
// (the direction from Eli's mockup, hand-built as a real vector, not a trace).
// Two colorways: "clay" (terracotta accent + warm ink — the default, the blue
// fights our identity) and "blue" (the mockup reference). The letters are our
// display slab (Rokkitt); the mark is drawn here. Rendered in the canvas header.
//
// The mark reads as an A: two splayed legs (the desk frame + the A's diagonals),
// a crossbar (the desk surface), and a person hunched over a laptop between the
// legs, with a small typing spark.
function DeskPersonA({ accent, ink }) {
  return (
    <svg
      viewBox="0 0 46 50"
      width="0.94em"
      height="1em"
      fill="none"
      role="img"
      aria-label="A"
      style={{ overflow: "visible" }}
    >
      {/* A legs / desk frame */}
      <path
        d="M5 47 L20 17"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M41 47 L26 17"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* crossbar = the desk surface (and the A's bar) */}
      <path
        d="M12 33.5 L34 33.5"
        stroke={accent}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      {/* person: head + hunched back curling toward the laptop */}
      <circle cx="21.5" cy="9" r="5" fill={accent} />
      <path
        d="M21.5 14 C19 19.5 19.5 25.5 27 27"
        stroke={accent}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* laptop on the desk — open: base + angled screen (ink so it reads) */}
      <path
        d="M24.5 30.5 L33 32"
        stroke={ink}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M33 32 L31 25.5"
        stroke={ink}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CanvasLogo({ variant = "clay", size = 30 }) {
  const blue = variant === "blue";
  const ink = blue ? "#16245c" : "var(--rd-text)";
  const accent = blue ? "#2563eb" : "var(--rd-coral)";
  return (
    <span
      className="inline-flex items-end font-display font-extrabold select-none"
      style={{
        fontSize: size,
        color: ink,
        letterSpacing: "-0.015em",
        lineHeight: 1,
      }}
      aria-label="Get A Job"
    >
      <span>Get</span>
      <span
        className="mx-[0.06em] inline-flex items-end"
        style={{ height: "1em" }}
      >
        <DeskPersonA accent={accent} ink={ink} />
      </span>
      <span>Job</span>
    </span>
  );
}

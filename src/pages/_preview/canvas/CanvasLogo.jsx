import React from "react";

// Get A Job wordmark — the "A" is a person working at an A-frame desk/laptop.
// Two colorways (clay default / blue reference) and, per Eli's desktop pass, a
// SIZE SPLIT: the full desk-person story can't survive header size, so small
// uses a simplified A (clean letterform + a hint of a seated figure) and large
// surfaces use the full mark (stronger silhouette + a solid, legible laptop —
// the "working" anchor). CanvasLogo auto-picks by size; both are exported for the
// side-by-side lab (?logo=lab).

// Simplified A — a bold A crowned by a head + shoulders (hint of a person at the
// desk). Reads clean down to ~24px.
export function MarkSimple({ accent, w = "0.86em", h = "1em" }) {
  return (
    <svg
      viewBox="0 0 44 50"
      width={w}
      height={h}
      fill="none"
      role="img"
      aria-label="A"
      style={{ overflow: "visible" }}
    >
      <path
        d="M5 47 L20 16"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M39 47 L24 16"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M12 34 L32 34"
        stroke={accent}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M17 15 Q22 12.4 27 15"
        stroke={accent}
        strokeWidth="3.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="22" cy="8.5" r="5.4" fill={accent} />
    </svg>
  );
}

// Full mark internals — the A-frame desk, a sharpened hunched worker (head +
// back + a distinct arm), and a solid laptop (the "working" anchor). `chair`
// adds a seat + back-post so the figure sits instead of floating.
function FullInner({ accent, ink, chair }) {
  return (
    <>
      {/* A legs / desk frame */}
      <path
        d="M7 50 L23 18"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M49 50 L33 18"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* desk crossbar */}
      <path
        d="M15 36 L41 36"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* chair (variant): seat + back-post, grounding the sitter */}
      {chair && (
        <g
          stroke={accent}
          strokeWidth="3.6"
          strokeLinecap="round"
          opacity="0.82"
        >
          <path d="M13.5 33 L25 33" />
          <path d="M13.5 33 L13.5 20.5" />
        </g>
      )}
      {/* person: head + hunched back + a distinct arm reaching the laptop */}
      <circle cx="24" cy="12" r="5.4" fill={accent} />
      <path
        d="M24 17 C19 21 19 28 25.5 30"
        stroke={accent}
        strokeWidth="5.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24.6 22 L32.4 27"
        stroke={accent}
        strokeWidth="4.3"
        strokeLinecap="round"
      />
      {/* laptop (solid ink): base + angled screen */}
      <path d="M28.5 29 L40 31.6 L38.4 26 L26.9 23.4 Z" fill={ink} />
      <path d="M38.4 26 L36.8 18.4 L34.6 18.9 L36.2 26.5 Z" fill={ink} />
    </>
  );
}

// Full desk-person mark (sharpened, no chair). For ~48px+.
export function MarkFull({ accent, ink, w = "1.06em", h = "1em" }) {
  return (
    <svg
      viewBox="0 0 56 54"
      width={w}
      height={h}
      fill="none"
      role="img"
      aria-label="A"
      style={{ overflow: "visible" }}
    >
      <FullInner accent={accent} ink={ink} chair={false} />
    </svg>
  );
}

// Full mark with a chair — the seat grounds the "working at a desk" pose.
export function MarkFullChair({ accent, ink, w = "1.06em", h = "1em" }) {
  return (
    <svg
      viewBox="0 0 56 54"
      width={w}
      height={h}
      fill="none"
      role="img"
      aria-label="A"
      style={{ overflow: "visible" }}
    >
      <FullInner accent={accent} ink={ink} chair />
    </svg>
  );
}

export default function CanvasLogo({ variant = "clay", size = 30 }) {
  const blue = variant === "blue";
  const ink = blue ? "#16245c" : "var(--rd-text)";
  const accent = blue ? "#2563eb" : "var(--rd-coral)";
  // Split: header-scale gets the simplified A; larger surfaces get the full mark.
  const Mark =
    size <= 40 ? (
      <MarkSimple accent={accent} />
    ) : (
      <MarkFull accent={accent} ink={ink} />
    );
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
        {Mark}
      </span>
      <span>Job</span>
    </span>
  );
}

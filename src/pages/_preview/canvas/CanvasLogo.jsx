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

// Full mark — person hunched over a solid laptop at the A-desk. For ~48px+.
export function MarkFull({ accent, ink, w = "1.04em", h = "1em" }) {
  return (
    <svg
      viewBox="0 0 54 52"
      width={w}
      height={h}
      fill="none"
      role="img"
      aria-label="A"
      style={{ overflow: "visible" }}
    >
      {/* A legs / desk frame */}
      <path
        d="M6 49 L21.5 17"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M46 49 L30.5 17"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* desk crossbar */}
      <path
        d="M13 35 L39 35"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* person: head + connected hunched back/arm as one bold form */}
      <circle cx="22" cy="10" r="5.6" fill={accent} />
      <path
        d="M22 15.6 C16.5 19 16.5 26.5 24.5 29"
        stroke={accent}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* laptop (solid) — the "working" anchor: base on the desk + screen up */}
      <path d="M22 31.5 L36 34 L34.5 30 L20.5 27.5 Z" fill={ink} />
      <path d="M34.5 30 L33 21.5 L30.8 22 L32.3 30.5 Z" fill={ink} />
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

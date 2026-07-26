import React, { useId } from "react";

// Get A Job wordmark - the "A" is a person working at an A-frame desk/laptop.
// THE OFFICIAL MARK is the full chair figure (B). Per Eli's brand pass it is
// rendered in the toolkit-OBJECT material: a top-lit glaze (highlight → coral →
// coral-dark), a bevelled dimensional read, and a warm weight-shadow so the mark
// pops off the page as its own entity instead of a flat vector on the surface.
// The material scales with the mark (in-SVG gradient + feDropShadow in viewBox
// units), so header and hero share one treatment. SIZE SPLIT still holds: header
// scale uses the simplified A (the full figure can't survive ~30px), large
// surfaces use the official full mark. Blue (`?logo=blue`) is a flat reference.

// Shared material - a vertical top-lit glaze spanning the whole mark
// (userSpaceOnUse so every stroke reads from one light source, not per-shape) +
// a warm ground shadow. `top`/`bottom` frame the glaze to the mark's viewBox.
function LogoDefs({ id, top, bottom }) {
  return (
    <defs>
      <linearGradient
        id={`${id}-a`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1={top}
        x2="0"
        y2={bottom}
      >
        {/* Highlight is a TOKEN (--rd-logo-hi), not a hardcoded coral: the mark's
            glaze has to follow the palette, or a cool-primary candidate renders a
            coral logo on a blue product. Clay's value is the old #EC6A47
            verbatim, so Clay is pixel-identical. The #EC6A47 FALLBACK covers
            contexts rendered outside :root[data-next-design] (e.g. flag-off V1
            onboarding), where --rd-logo-hi is undefined and the stop would
            otherwise resolve to black. Flag-on is unchanged (the token wins). */}
        <stop offset="0%" stopColor="var(--rd-logo-hi, #EC6A47)" />
        <stop offset="42%" stopColor="var(--rd-primary)" />
        <stop offset="100%" stopColor="var(--rd-primary-dark)" />
      </linearGradient>
      <linearGradient
        id={`${id}-ink`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1={top}
        x2="0"
        y2={bottom}
      >
        <stop offset="0%" stopColor="#3A342B" />
        <stop offset="100%" stopColor="var(--rd-text)" />
      </linearGradient>
      <filter id={`${id}-lift`} x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow
          dx="0"
          dy="1.1"
          stdDeviation="1"
          floodColor="#4A2C16"
          floodOpacity="0.3"
        />
      </filter>
    </defs>
  );
}

// Full mark internals - the A-frame desk, a sharpened hunched worker (head +
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

// THE OFFICIAL MARK - full figure + chair, in the object material when
// `material` is set (the default for the Clay brand logo). ONE mark at every
// size (no size split): at header scale it reads as a warm dimensional mark
// rather than a legible scene, which is the intent.
export function MarkFullChair({
  accent,
  ink,
  material = false,
  w = "1.06em",
  h = "1em",
}) {
  const uid = useId().replace(/:/g, "");
  const stroke = material ? `url(#${uid}-a)` : accent;
  const solid = material ? `url(#${uid}-ink)` : ink;
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
      {material && <LogoDefs id={uid} top={6} bottom={50} />}
      <g filter={material ? `url(#${uid}-lift)` : undefined}>
        <FullInner accent={stroke} ink={solid} chair />
      </g>
    </svg>
  );
}

// THE OFFICIAL LOGOTYPE - LOCKED (Eli, 2026-07-17).
// Mark (locked, above) + "Get"/"Job" in Archivo 700 + the optical spacing below.
// Canonical record: docs/design/canvas-tokens.md. Archivo is loaded in index.html
// for the logotype ONLY - it is not a general display face.
//
// OPTICAL SPACING - asymmetric, tuned by eye at 28px, NOT metric.
// The gaps are deliberately unequal because the shapes are unequal:
//   left  (t -> mark): "t" is a full-height vertical stroke and the mark's left
//     leg splays toward it at the baseline, so the two nearly collide low down.
//     This side needs the LARGER gap.
//   right (mark -> J): the mark's right leg slopes AWAY going up, and Archivo's
//     cap J is a stem on the right with its upper-LEFT empty. Two voids compound
//     into one hole, so a metrically-equal gap reads much wider here. This side
//     needs the SMALLER gap (and it goes negative, because the mark's viewBox
//     carries ~0.08em of its own padding per side).
// Tune by eye at 28px against the header, never by matching numbers.
export const LOGOTYPE = {
  face: "'Archivo', system-ui, sans-serif",
  weight: 700,
  letterSpacing: "-0.02em",
  gapLeft: "0.05em",
  gapRight: "-0.05em",
};

export default function CanvasLogo({ variant = "clay", size = 30 }) {
  const blue = variant === "blue";
  const ink = blue ? "#16245c" : "var(--rd-text)";
  const accent = blue ? "#2563eb" : "var(--rd-primary)";
  // ONE mark, every size (no size split). Clay = the official brand mark in the
  // object material; blue stays a flat reference.
  const material = !blue;
  const Mark = <MarkFullChair accent={accent} ink={ink} material={material} />;
  return (
    <span
      className="inline-flex items-end select-none"
      style={{
        fontSize: size,
        color: ink,
        lineHeight: 1,
        fontFamily: LOGOTYPE.face,
        fontWeight: LOGOTYPE.weight,
        letterSpacing: LOGOTYPE.letterSpacing,
      }}
      aria-label="Get A Job"
    >
      <span>Get</span>
      <span
        className="inline-flex items-end"
        style={{
          height: "1em",
          marginLeft: LOGOTYPE.gapLeft,
          marginRight: LOGOTYPE.gapRight,
        }}
      >
        {Mark}
      </span>
      <span>Job</span>
    </span>
  );
}

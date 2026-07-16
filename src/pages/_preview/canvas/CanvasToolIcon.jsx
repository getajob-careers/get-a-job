import React from "react";

// Bespoke per-tool silhouettes (round 3, toolkit step B). Each tool gets its own
// recognizable shape + ONE hover motion beat, hand-rolled in SVG on the Clay
// palette (terracotta primary, teal accents). The morph is driven by CSS in
// toolkit.css off the tile's `.rd-tool:hover` (the tile is `group`); reduced
// motion shows the static silhouette. Coach leans chat/voice (a waveform that
// "speaks"); the rest morph per the approved proposal.
//
// Rendered at 28px inside the 40px tile slot. Fills use --rd-coral-tint so the
// icons keep the warm domed feel; strokes are --rd-coral with --rd-teal accents.

const C = "var(--rd-coral)";
const CT = "var(--rd-coral-tint)";
const T = "var(--rd-teal)";

function Coach() {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="22"
        height="15"
        rx="5"
        fill={CT}
        stroke={C}
        strokeWidth="1.6"
      />
      <path
        d="M8 18.5 L8 23 L13 18.5 Z"
        fill={CT}
        stroke={C}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <g className="ti-wave" stroke={C} strokeWidth="1.9" strokeLinecap="round">
        <line x1="10" y1="8.5" x2="10" y2="14.5" />
        <line x1="14" y1="7.5" x2="14" y2="15.5" />
        <line x1="18" y1="9.5" x2="18" y2="13.5" />
      </g>
    </svg>
  );
}

function Skills() {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
    >
      <polygon
        points="14,3.5 22,8.5 22,18.5 14,23.5 6,18.5 6,8.5"
        fill={CT}
        stroke={C}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <g className="ti-spokes" stroke={T} strokeWidth="1.2">
        <line x1="14" y1="14" x2="14" y2="8" />
        <line x1="14" y1="14" x2="19" y2="17" />
        <line x1="14" y1="14" x2="9" y2="17" />
      </g>
      <circle cx="14" cy="14" r="2.4" fill={C} />
      <g className="ti-sat" fill={T}>
        <circle cx="14" cy="8" r="1.7" />
        <circle cx="19" cy="17" r="1.7" />
        <circle cx="9" cy="17" r="1.7" />
      </g>
    </svg>
  );
}

function Profile() {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="6"
        width="22"
        height="16"
        rx="4"
        fill={CT}
        stroke={C}
        strokeWidth="1.6"
      />
      <circle
        cx="10"
        cy="12.5"
        r="2.6"
        fill="none"
        stroke={C}
        strokeWidth="1.5"
      />
      <path
        d="M6 18.5 a4 3.4 0 0 1 8 0"
        stroke={C}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="11.5"
        x2="22"
        y2="11.5"
        stroke={C}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="15.5"
        x2="21"
        y2="15.5"
        stroke={C}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        className="ti-ring"
        cx="10"
        cy="14"
        r="6.4"
        fill="none"
        stroke={T}
        strokeWidth="1.3"
      />
    </svg>
  );
}

function LinkedInMark() {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="20"
        height="20"
        rx="4.5"
        fill={CT}
        stroke={C}
        strokeWidth="1.6"
      />
      <circle cx="10" cy="9.5" r="1.3" fill={C} />
      <g
        className="ti-draw"
        stroke={C}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      >
        <line x1="10" y1="12.5" x2="10" y2="18.5" />
        <path d="M14 18.5 L14 15 a2.2 2.2 0 0 1 4.4 0 L18.4 18.5" />
      </g>
    </svg>
  );
}

function CvBank() {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        className="ti-fan"
        x="9"
        y="4"
        width="13"
        height="17"
        rx="2.5"
        fill="var(--rd-bg-card)"
        stroke={C}
        strokeWidth="1.5"
      />
      <rect
        x="6"
        y="6"
        width="13"
        height="17"
        rx="2.5"
        fill={CT}
        stroke={C}
        strokeWidth="1.6"
      />
      <line
        x1="9"
        y1="11"
        x2="16"
        y2="11"
        stroke={C}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="14.5"
        x2="16"
        y2="14.5"
        stroke={C}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="18"
        x2="13"
        y2="18"
        stroke={C}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StoryBank() {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 5 h13 a3 3 0 0 1 3 3 v14 a2 2 0 0 1 -2 2 h-14 a2 2 0 0 1 -2 -2 v-15 a2 2 0 0 1 2 -2 z"
        fill={CT}
        stroke={C}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line x1="6" y1="21.5" x2="19" y2="21.5" stroke={C} strokeWidth="1.4" />
      <rect
        className="ti-ribbon"
        x="15.5"
        y="5"
        width="3"
        height="7.5"
        fill={T}
      />
      <path
        className="ti-cover"
        d="M6 5 h5.5 v18 h-3.5 a2 2 0 0 1 -2 -2 z"
        fill={C}
        opacity="0.88"
      />
    </svg>
  );
}

function Tasks() {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="20"
        height="20"
        rx="4.5"
        fill={CT}
        stroke={C}
        strokeWidth="1.6"
      />
      <rect
        x="7.5"
        y="8"
        width="5"
        height="5"
        rx="1.4"
        fill="var(--rd-bg-card)"
        stroke={C}
        strokeWidth="1.4"
      />
      <path
        className="ti-check"
        d="M8.3 10.5 L9.8 12 L12.6 8.6"
        fill="none"
        stroke={T}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="15"
        y1="10.5"
        x2="21"
        y2="10.5"
        stroke={C}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="17.5"
        x2="21"
        y2="17.5"
        stroke={C}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="20.8"
        x2="18"
        y2="20.8"
        stroke={C}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICONS = {
  coach: Coach,
  skills: Skills,
  profile: Profile,
  linkedin: LinkedInMark,
  cvbank: CvBank,
  storybank: StoryBank,
  tasks: Tasks,
};

export default function CanvasToolIcon({ id }) {
  const Ico = ICONS[id];
  return Ico ? <Ico /> : null;
}

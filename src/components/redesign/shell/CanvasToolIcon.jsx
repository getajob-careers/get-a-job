import React, { useId } from "react";

// Bespoke per-tool OBJECTS (round 3, toolkit). Each tool is its own recognizable
// shape — the silhouette IS the object, not an icon inside a uniform card. Body
// shapes are filled with a top-lit gradient glaze (var(--to-hi) → var(--to-tint),
// set per tool by the tile) so the object reads dimensional; details/strokes use
// var(--to-ink). Mono per object — one glaze, one ink. Each keeps ONE hover
// motion beat (CSS in toolkit.css off the tile hover); reduced motion → static.
//
// Rendered at `size` (the object floats with a ground shadow from the tile, no
// card frame). Colors come from CSS vars so the same shapes serve every tool.

// FLAT treatment (Eli's carousel-restore, 2026-07-19): both stops are the flat
// tint, so the object reads as a flat coloured glyph rather than a soft-3D dome -
// coherent with the mockup's flat stat-cards / chips language. (Revert to a
// top-lit dome by setting the first stop back to var(--to-hi).)
function Defs({ id }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--to-tint)" />
        <stop offset="100%" stopColor="var(--to-tint)" />
      </linearGradient>
    </defs>
  );
}

function Coach({ g }) {
  return (
    <>
      <rect
        x="3"
        y="4"
        width="22"
        height="15"
        rx="5"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <path
        d="M8 18.5 L8 23 L13 18.5 Z"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <g
        className="ti-wave"
        stroke="var(--to-ink)"
        strokeWidth="1.9"
        strokeLinecap="round"
      >
        <line x1="10" y1="8.5" x2="10" y2="14.5" />
        <line x1="14" y1="7.5" x2="14" y2="15.5" />
        <line x1="18" y1="9.5" x2="18" y2="13.5" />
      </g>
    </>
  );
}

function Skills({ g }) {
  return (
    <>
      <polygon
        points="14,3.5 22,8.5 22,18.5 14,23.5 6,18.5 6,8.5"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <g
        className="ti-spokes"
        stroke="var(--to-ink)"
        strokeWidth="1.2"
        opacity="0.7"
      >
        <line x1="14" y1="14" x2="14" y2="8" />
        <line x1="14" y1="14" x2="19" y2="17" />
        <line x1="14" y1="14" x2="9" y2="17" />
      </g>
      <circle cx="14" cy="14" r="2.4" fill="var(--to-ink)" />
      <g className="ti-sat" fill="var(--to-ink)">
        <circle cx="14" cy="8" r="1.7" />
        <circle cx="19" cy="17" r="1.7" />
        <circle cx="9" cy="17" r="1.7" />
      </g>
    </>
  );
}

function Profile({ g }) {
  return (
    <>
      <rect
        x="3"
        y="6"
        width="22"
        height="16"
        rx="4"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <circle
        cx="10"
        cy="12.5"
        r="2.6"
        fill="none"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
      />
      <path
        d="M6 18.5 a4 3.4 0 0 1 8 0"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="11.5"
        x2="22"
        y2="11.5"
        stroke="var(--to-ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="15.5"
        x2="21"
        y2="15.5"
        stroke="var(--to-ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        className="ti-ring"
        cx="10"
        cy="14"
        r="6.4"
        fill="none"
        stroke="var(--to-ink)"
        strokeWidth="1.3"
      />
    </>
  );
}

function LinkedInMark({ g }) {
  return (
    <>
      <rect
        x="4"
        y="4"
        width="20"
        height="20"
        rx="4.5"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <circle cx="10" cy="9.5" r="1.3" fill="var(--to-ink)" />
      <g
        className="ti-draw"
        stroke="var(--to-ink)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      >
        <line x1="10" y1="12.5" x2="10" y2="18.5" />
        <path d="M14 18.5 L14 15 a2.2 2.2 0 0 1 4.4 0 L18.4 18.5" />
      </g>
    </>
  );
}

function CvBank({ g }) {
  return (
    <>
      <rect
        className="ti-fan"
        x="9"
        y="4"
        width="13"
        height="17"
        rx="2.5"
        fill="var(--to-hi)"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
      />
      <rect
        x="6"
        y="6"
        width="13"
        height="17"
        rx="2.5"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <line
        x1="9"
        y1="11"
        x2="16"
        y2="11"
        stroke="var(--to-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="14.5"
        x2="16"
        y2="14.5"
        stroke="var(--to-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="18"
        x2="13"
        y2="18"
        stroke="var(--to-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </>
  );
}

// Story bank = a rosette / award (your collected wins). Ribbon tails + a medal
// with a star; the star pops on hover ("achievement highlighted").
function StoryBank({ g }) {
  return (
    <>
      <path
        d="M9.5 14 L7.5 24 L11 21.5 L14 24 L17 21.5 L20.5 24 L18.5 14 Z"
        fill="var(--to-ink)"
        opacity="0.9"
      />
      <circle
        cx="14"
        cy="10.5"
        r="7"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <path
        className="ti-star"
        d="M14 6.2 L15.2 9 L18.2 9.2 L15.9 11.2 L16.7 14.1 L14 12.5 L11.3 14.1 L12.1 11.2 L9.8 9.2 L12.8 9 Z"
        fill="var(--to-ink)"
      />
    </>
  );
}

function Tasks({ g }) {
  return (
    <>
      <rect
        x="4"
        y="4"
        width="20"
        height="20"
        rx="4.5"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <rect
        x="7.5"
        y="8"
        width="5"
        height="5"
        rx="1.4"
        fill="var(--to-hi)"
        stroke="var(--to-ink)"
        strokeWidth="1.4"
      />
      <path
        className="ti-check"
        d="M8.3 10.5 L9.8 12 L12.6 8.6"
        fill="none"
        stroke="var(--to-ink)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="15"
        y1="10.5"
        x2="21"
        y2="10.5"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="17.5"
        x2="21"
        y2="17.5"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="20.8"
        x2="18"
        y2="20.8"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  );
}

// Chat = a DIALOGUE: two overlapping bubbles + typing dots. Deliberately not the
// coach's single-bubble-plus-waveform - two bubbles reads "conversation", one
// reads "voice/prompt". Back bubble sits lighter (a translucent --to-tint - the
// old hi=--card fill was invisible on the cream tile) so the front glazed bubble
// pops forward; the three dots ripple on hover ("typing").
function Chat({ g }) {
  return (
    <>
      {/* back bubble (the reply, upper-right) */}
      <path
        d="M12 3.5 h9 a3.5 3.5 0 0 1 3.5 3.5 v4 a3.5 3.5 0 0 1 -3.5 3.5 h-3 l-3 3 v-3 h0 a3.5 3.5 0 0 1 -3.5 -3.5 v-4 a3.5 3.5 0 0 1 3.5 -3.5 Z"
        fill="var(--to-tint)"
        fillOpacity="0.55"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* front bubble (yours, lower-left) with a tail */}
      <path
        d="M6 10.5 h9 a3.6 3.6 0 0 1 3.6 3.6 v3.4 a3.6 3.6 0 0 1 -3.6 3.6 h-5.5 l-3.5 3.2 v-3.2 a3.6 3.6 0 0 1 -3.6 -3.6 v-3.4 a3.6 3.6 0 0 1 3.6 -3.6 Z"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <g className="ti-chat" fill="var(--to-ink)">
        <circle cx="8.6" cy="15.8" r="1.15" />
        <circle cx="12" cy="15.8" r="1.15" />
        <circle cx="15.4" cy="15.8" r="1.15" />
      </g>
    </>
  );
}

// Career - a compass: the career hub's "where next" metaphor. Glaze body, ink
// needle, a warm-white centre dot to catch the light.
function Career({ g }) {
  return (
    <>
      <circle
        cx="14"
        cy="14"
        r="10.5"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <path
        className="ti-ring"
        d="M14 5.5 L16.6 14 L14 22.5 L11.4 14 Z"
        fill="var(--to-ink)"
        stroke="var(--to-ink)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="14" r="1.7" fill="var(--to-hi)" />
    </>
  );
}

// Home - the house/home-base object. Glaze pentagon body + ink arched doorway;
// the round attic window is the object's warm-white "light" that pops on hover
// ("someone's home"). Mono per object - one glaze, one ink.
function Home({ g }) {
  return (
    <>
      <path
        d="M14 3.6 L24 12.6 L24 24 L4 24 L4 12.6 Z"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M11 24 L11 18.6 a3 3 0 0 1 6 0 L17 24"
        fill="none"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        className="ti-home"
        cx="14"
        cy="9.6"
        r="1.8"
        fill="var(--to-hi)"
        stroke="var(--to-ink)"
        strokeWidth="1.2"
      />
    </>
  );
}

const SHAPES = {
  home: Home,
  career: Career,
  coach: Coach,
  chat: Chat,
  skills: Skills,
  profile: Profile,
  linkedin: LinkedInMark,
  cvbank: CvBank,
  storybank: StoryBank,
  tasks: Tasks,
};

export default function CanvasToolIcon({ id, size = 30 }) {
  const g = "tg" + useId().replace(/:/g, "");
  const Shape = SHAPES[id];
  if (!Shape) return null;
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className="cx-tool-obj"
    >
      <Defs id={g} />
      <Shape g={g} />
    </svg>
  );
}

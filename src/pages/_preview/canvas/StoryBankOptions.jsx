// Story-bank icon exploration (round 3). The book+ribbon didn't read as "your
// collected wins/stories," so here are three alternatives to pick from, rendered
// side by side at rail size in the locked sage glaze + shared material. Shown at
// ?story=lab (above the Browse grid); the winner replaces StoryBank in
// CanvasToolIcon and this file is removed.
import React, { useId } from "react";
import { TOOL_COLORS } from "./toolColors";

const SAGE = TOOL_COLORS.storybank;
const STAR =
  "M14 3.4 L15.9 8.1 L21 8.5 L17.1 11.8 L18.4 16.8 L14 14.1 L9.6 16.8 L10.9 11.8 L7 8.5 L12.1 8.1 Z";

function Defs({ id }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--to-hi)" />
        <stop offset="100%" stopColor="var(--to-tint)" />
      </linearGradient>
    </defs>
  );
}

// A — Rosette / medal: an award with ribbon tails = "wins."
function Rosette({ g }) {
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
        d="M14 6.2 L15.2 9 L18.2 9.2 L15.9 11.2 L16.7 14.1 L14 12.5 L11.3 14.1 L12.1 11.2 L9.8 9.2 L12.8 9 Z"
        fill="var(--to-ink)"
      />
    </>
  );
}

// B — Starred card stack: a collection whose top card is starred = "saved wins."
function StarStack({ g }) {
  return (
    <>
      <rect
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
        y="6.5"
        width="13"
        height="17"
        rx="2.5"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <path
        d="M12.5 9.2 L13.4 11 L15.4 11.2 L13.9 12.5 L14.4 14.5 L12.5 13.4 L10.6 14.5 L11.1 12.5 L9.6 11.2 L11.6 11 Z"
        fill="var(--to-ink)"
      />
      <line
        x1="9"
        y1="17.5"
        x2="16"
        y2="17.5"
        stroke="var(--to-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="20.5"
        x2="13.5"
        y2="20.5"
        stroke="var(--to-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </>
  );
}

// C — Quote card: a testimonial/story card = "your stories, in your words."
function QuoteCard({ g }) {
  return (
    <>
      <rect
        x="4"
        y="5"
        width="20"
        height="18"
        rx="4.5"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <text
        x="8.5"
        y="18.5"
        fontFamily="Georgia, serif"
        fontSize="17"
        fontWeight="700"
        fill="var(--to-ink)"
      >
        &ldquo;
      </text>
      <line
        x1="15"
        y1="16.5"
        x2="20.5"
        y2="16.5"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="19.5"
        x2="19"
        y2="19.5"
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  );
}

const OPTIONS = [
  { key: "A", name: "Rosette", note: "an award — 'wins'", Shape: Rosette },
  {
    key: "B",
    name: "Starred stack",
    note: "saved highlights",
    Shape: StarStack,
  },
  {
    key: "C",
    name: "Quote card",
    note: "your stories, in words",
    Shape: QuoteCard,
  },
];

function StoryObj({ Shape, size = 44 }) {
  const g = "sg" + useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <Defs id={g} />
      <Shape g={g} />
    </svg>
  );
}

export default function StoryBankOptions() {
  const vars = {
    "--to-hi": SAGE.hi,
    "--to-tint": SAGE.tint,
    "--to-ink": SAGE.ink,
  };
  return (
    <div className="rd-lift rd-r-lg p-5 mb-4" style={vars}>
      <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1">
        Story-bank icon
      </p>
      <h2 className="font-display font-bold rd-t-display-s text-rd-text mb-4">
        Pick a silhouette (keeps sage + material)
      </h2>
      <div className="flex items-start gap-8">
        {OPTIONS.map(({ key, name, note, Shape }) => (
          <div key={key} className="flex flex-col items-center gap-1.5">
            <span className="cx-tool-ico">
              <StoryObj Shape={Shape} />
            </span>
            <span className="font-display font-bold rd-t-body-m text-rd-text">
              {key} · {name}
            </span>
            <span className="rd-t-micro text-rd-text-tertiary">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Story-bank icon exploration (round 3). The book+ribbon didn't read as "your
// collected wins/stories," so here are three alternatives to pick from, rendered
// side by side at rail size in the locked sage glaze + shared material. Shown at
// ?story=lab (above the Browse grid); the winner replaces StoryBank in
// CanvasToolIcon and this file is removed.
import React, { useId } from "react";
import { TOOL_COLORS } from "./toolColors";

const SAGE = TOOL_COLORS.storybank;

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

// D — Brain: memory / where lived experiences live. (Honest risk noted in the
// report: a brain's folds can mush at ~28px, and it leans toward
// knowledge/cognition — Skill hub's territory.)
function Brain({ g }) {
  return (
    <>
      <path
        d="M13.4 5.4 C11.6 4.2 9 4.6 8 6.3 C6.1 6.3 4.7 8 5.3 9.8 C4.2 10.7 4.3 12.6 5.7 13.5 C5.5 15.4 7.1 17 9.1 16.7 C9.8 18 11.6 18.5 13.4 17.6 Z"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14.6 5.4 C16.4 4.2 19 4.6 20 6.3 C21.9 6.3 23.3 8 22.7 9.8 C23.8 10.7 23.7 12.6 22.3 13.5 C22.5 15.4 20.9 17 18.9 16.7 C18.2 18 16.4 18.5 14.6 17.6 Z"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line
        x1="14"
        y1="5"
        x2="14"
        y2="18"
        stroke="var(--to-ink)"
        strokeWidth="1.1"
        opacity="0.5"
      />
      <path
        d="M9.2 9 q2 0.6 1.4 2.6 M18.8 9 q-2 0.6 -1.4 2.6"
        stroke="var(--to-ink)"
        strokeWidth="1.1"
        fill="none"
        opacity="0.7"
        strokeLinecap="round"
      />
    </>
  );
}

// E — Memory jar: your bank of banked wins/moments (a jar of stars). Literal
// "bank of collected proof," distinct silhouette, survives small size.
function Jar({ g }) {
  return (
    <>
      <path
        d="M8 9.2 C8 8.2 8.6 7.6 9.6 7.6 L18.4 7.6 C19.4 7.6 20 8.2 20 9.2 L20 20 C20 21.4 18.9 22.5 17.5 22.5 L10.5 22.5 C9.1 22.5 8 21.4 8 20 Z"
        fill={`url(#${g})`}
        stroke="var(--to-ink)"
        strokeWidth="1.6"
      />
      <rect
        x="9"
        y="4.4"
        width="10"
        height="3.4"
        rx="1.5"
        fill="var(--to-ink)"
      />
      <g fill="var(--to-ink)">
        <path d="M11.6 12.6 L12.1 13.8 L13.4 13.9 L12.4 14.8 L12.7 16.1 L11.6 15.4 L10.5 16.1 L10.8 14.8 L9.8 13.9 L11.1 13.8 Z" />
        <circle cx="16" cy="13.6" r="1.1" />
        <circle cx="13.4" cy="18.4" r="1" />
        <circle cx="16.6" cy="18" r="1.3" />
      </g>
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
  { key: "D", name: "Brain", note: "where memories live", Shape: Brain },
  { key: "E", name: "Memory jar", note: "banked wins/moments", Shape: Jar },
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
      <div className="flex flex-wrap items-start gap-x-7 gap-y-4">
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

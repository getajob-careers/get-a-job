import React, { useId } from "react";

// Get A Job mascot — ROUND 1 (reference-board redraw, 2026-07-23).
//
// Round 0 was a thin-STROKE skeleton and read lifeless; the board's language is
// solid FILLED MASSES: oversized head + chunky torso + small limbs, a signature
// rounded rosy nose, a minimal face (brows + dot eyes + a simple mouth), a soft
// grain tooth INSIDE the figure, and a soft grounded shadow. This figure keeps
// the BRAND EQUITY of the logotype's "A" (a person hunched at an A-frame desk
// with a laptop — see CanvasLogo.jsx MarkFullChair) but redraws it in that
// board language, on the canvas palette (slate sweater = --rd-primary, mauve
// collar/mug = --rd-teal, warm-brown desk/laptop/hair = --rd-golden/--rd-text,
// warm skin = the new --rd-mascot-* tokens).
//
// SIZE SPLIT holds: the 30px header pictogram (CanvasLogo) is untouched; THIS is
// the hero / loader / ambient figure.
//
// MICRO-LIFE: parts are separable and individually addressable via `data-part`
// so an anime.js timeline can drive one without touching the rest — `figure`
// (breathing bob), `torso` (breath expand), `head` (weight-shift tilt), `eyes`
// (blink), `mugArm` (coffee sip), `screenGlow` (laptop light), `steam`. The
// micro-life LAYER (blinks + breathing + weight shifts + sip on long RANDOM
// cycles) is what round 0 lacked; it is driven by the consumer (see the sign-up
// ambient idle in MascotPreview) so the same static figure can be re-used across
// registers. reduced-motion consumers simply never start the timelines → this
// static pose is the honest end-state.
//
// GRAIN is the figure's own material and is the design-craft-blessed exception
// to the ground particulate-retirement (that rule governs the BACKGROUND). It is
// a subtle chalk tooth (low-opacity fractal noise) clipped to the body masses.
//
// R1 scope: this renders the BASE seated "at-desk" character (the working /
// sign-up / loader anchor). The wider pose vocabulary (read / review / present /
// celebrate / horizon / empty) is STORYBOARD-only this round (docs/design/
// mascot-motion-registers.md) — not yet redrawn in the mass language — so `pose`
// is accepted for forward-compat but every value renders the base scene for now.

function MascotDefs({ id }) {
  return (
    <defs>
      <linearGradient
        id={`${id}-sweater`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="116"
        x2="0"
        y2="198"
      >
        <stop offset="0%" stopColor="var(--rd-logo-hi, #8b8ca3)" />
        <stop offset="18%" stopColor="var(--rd-primary, #60617d)" />
        <stop offset="100%" stopColor="var(--rd-primary-dark, #4b4c66)" />
      </linearGradient>
      <linearGradient
        id={`${id}-skin`}
        gradientUnits="userSpaceOnUse"
        x1="72"
        y1="50"
        x2="140"
        y2="122"
      >
        <stop offset="0%" stopColor="var(--rd-mascot-skin-hi, #f0c39f)" />
        <stop offset="100%" stopColor="var(--rd-mascot-skin, #e8b48f)" />
      </linearGradient>
      <filter id={`${id}-lift`} x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow
          dx="0"
          dy="4"
          stdDeviation="4.5"
          floodColor="#4A2C16"
          floodOpacity="0.22"
        />
      </filter>
      <filter id={`${id}-soft`} x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      {/* chalk grain: fractal noise → warm-dark speckle */}
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.5"
          numOctaves="3"
          seed="11"
          stitchTiles="stitch"
          result="n"
        />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.13  0 0 0 0 0.09  0 0 0 0 0.06  0 0 0 1.1 -0.35"
        />
      </filter>
      {/* grain is clipped to the big body masses (head + torso + legs) */}
      <clipPath id={`${id}-grainclip`}>
        <ellipse cx="105" cy="87" rx="33" ry="34" />
        <path d="M72 116 C58 136 62 176 96 188 C130 198 158 182 154 148 C152 128 136 112 114 111 C98 110 82 106 72 116 Z" />
        <path d="M92 172 C86 190 88 202 98 204 C110 206 116 198 114 182 C113 172 100 166 92 172 Z" />
        <path d="M118 170 C114 190 118 204 130 204 C142 204 144 190 140 178 C137 168 124 164 118 170 Z" />
      </clipPath>
    </defs>
  );
}

export default function MascotFigure({
  pose = "signup", // forward-compat; R1 draws the base scene for every value
  material = true,
  size = 240,
  className = "",
  title = "Get A Job mascot",
}) {
  const uid = useId().replace(/:/g, "");
  const skin = material
    ? `url(#${uid}-skin)`
    : "var(--rd-mascot-skin, #e8b48f)";
  const sweater = material
    ? `url(#${uid}-sweater)`
    : "var(--rd-primary, #60617d)";
  const skinSh = "var(--rd-mascot-skin-sh, #d0996f)";
  const ink = "var(--rd-text, #3a2c22)";
  const brown = "var(--rd-golden, #60483e)";
  const brownDk = "var(--rd-golden-dark, #42302a)";
  const mauve = "var(--rd-teal, #9b7d8a)";
  const mauveDk = "var(--rd-teal-dark, #7b606d)";
  const slateDk = "var(--rd-primary-dark, #4b4c66)";

  return (
    <svg
      viewBox="0 0 240 250"
      width={size}
      height={(size * 250) / 240}
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      style={{ overflow: "visible" }}
    >
      {material && <MascotDefs id={uid} />}

      {/* ground */}
      <ellipse
        cx="116"
        cy="226"
        rx="82"
        ry="11"
        fill="#4A2C16"
        opacity="0.13"
      />
      <path
        d="M50 230 Q116 222 184 230"
        stroke="#4A2C16"
        strokeOpacity="0.1"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* chair */}
      <g
        stroke="var(--rd-primary, #60617d)"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.3"
        fill="none"
      >
        <path d="M58 178 L62 120" />
        <path d="M58 178 L110 184" />
        <path d="M68 184 L72 212" />
      </g>

      {/* A-frame desk + laptop (brand equity) */}
      <rect x="150" y="145" width="76" height="9" rx="3.5" fill={brown} />
      <path
        d="M164 154 L152 216"
        stroke={brown}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M212 154 L224 216"
        stroke={brown}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M160 188 L216 188"
        stroke={brownDk}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <g data-part="screenGlow">
        <ellipse
          cx="188"
          cy="128"
          rx="30"
          ry="20"
          fill="var(--rd-golden-tint, #fbebc9)"
          opacity="0.65"
          filter={material ? `url(#${uid}-soft)` : undefined}
        />
      </g>
      <path d="M166 145 L210 145 L214 136 L170 136 Z" fill={brownDk} />
      <path d="M210 145 L207 108 L184 113 L188 136 Z" fill={brown} />
      <path
        d="M184 113 L188 136"
        stroke="var(--rd-golden, #efb23e)"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* FIGURE — the breathing group */}
      <g data-part="figure" filter={material ? `url(#${uid}-lift)` : undefined}>
        {/* seated legs */}
        <path
          d="M92 172 C86 190 88 202 98 204 C110 206 116 198 114 182 C113 172 100 166 92 172 Z"
          fill={brown}
        />
        <path
          d="M118 170 C114 190 118 204 130 204 C142 204 144 190 140 178 C137 168 124 164 118 170 Z"
          fill={brownDk}
        />
        <ellipse cx="99" cy="208" rx="16" ry="7.5" fill={ink} />
        <ellipse cx="134" cy="208" rx="16" ry="7.5" fill={ink} />

        {/* far arm resting on belly */}
        <path
          d="M98 132 C86 140 84 156 96 166"
          stroke={sweater}
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="97" cy="166" r="8.5" fill={skin} />

        {/* torso */}
        <g data-part="torso">
          <path
            d="M72 116 C58 136 62 176 96 188 C130 198 158 182 154 148 C152 128 136 112 114 111 C98 110 82 106 72 116 Z"
            fill={sweater}
          />
          <path
            d="M72 116 C60 138 64 176 96 188 C106 191 116 190 122 186 C98 182 82 166 82 140 C82 130 76 120 72 116 Z"
            fill={slateDk}
            opacity="0.4"
          />
          {/* crew-neck collar */}
          <path
            d="M94 114 C102 124 120 124 128 114 C124 121 98 121 94 114 Z"
            fill={mauve}
          />
        </g>

        {/* MUG ARM — the coffee-sip part (pivot at the elbow ≈ 140,134) */}
        <g data-part="mugArm">
          <path
            d="M140 132 C150 142 152 156 150 166"
            stroke={sweater}
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />
          <g data-part="mug">
            <path
              d="M140 158 h18 a3 3 0 0 1 3 3 v9 a9 9 0 0 1 -24 0 v-9 a3 3 0 0 1 3 -3 Z"
              fill={mauve}
            />
            <path
              d="M161 161 a6 6 0 0 1 0 11"
              stroke={mauveDk}
              strokeWidth="3"
              fill="none"
            />
            <rect
              x="139"
              y="156"
              width="24"
              height="4.5"
              rx="2.2"
              fill="var(--rd-bg-card, #fffcf4)"
            />
            <circle cx="150" cy="170" r="8.5" fill={skinSh} />
          </g>
        </g>

        {/* neck */}
        <path
          d="M101 106 C101 114 116 114 115 105 C110 110 106 110 101 106 Z"
          fill={skinSh}
        />

        {/* HEAD — weight-shift + blink live here */}
        <g
          data-part="head"
          style={{ transformBox: "fill-box", transformOrigin: "50% 96%" }}
        >
          <ellipse cx="105" cy="87" rx="33" ry="34" fill={skin} />
          <ellipse cx="76" cy="93" rx="7" ry="9" fill={skinSh} />
          {/* hair — one clean crown mass */}
          <path
            d="M73 96 C66 60 92 45 108 47 C130 49 140 66 137 88 C132 79 123 74 114 74 C112 66 104 63 99 66 C92 71 82 76 78 88 C77 91 74 93 73 96 Z"
            fill={ink}
          />
          {/* nose — the signature */}
          <ellipse
            cx="137"
            cy="93"
            rx="8.5"
            ry="9.5"
            fill="var(--rd-mascot-nose, #dd875f)"
          />
          <ellipse
            cx="123"
            cy="99"
            rx="7"
            ry="4"
            fill="var(--rd-mascot-blush, #e0967a)"
            opacity="0.45"
          />
          {/* glasses */}
          <circle
            cx="123"
            cy="86"
            r="10.5"
            stroke={brownDk}
            strokeWidth="2.6"
            fill="#ffffff"
            fillOpacity="0.13"
          />
          <circle
            cx="102"
            cy="88"
            r="9.5"
            stroke={brownDk}
            strokeWidth="2.6"
            fill="#ffffff"
            fillOpacity="0.13"
          />
          <path d="M112 86 L113 88" stroke={brownDk} strokeWidth="2.6" />
          <path
            d="M92 88 L80 90"
            stroke={brownDk}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* eyes — blink target */}
          <g
            data-part="eyes"
            style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
          >
            <ellipse cx="123" cy="87" rx="2.8" ry="3.1" fill={ink} />
            <ellipse cx="103" cy="89" rx="2.6" ry="2.9" fill={ink} />
          </g>
          {/* brows */}
          <path
            d="M114 74 L131 73"
            stroke={ink}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <path
            d="M95 78 L110 76"
            stroke={ink}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* mouth */}
          <path
            d="M120 106 Q129 112 138 105"
            stroke="#5a4030"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </g>

      {/* grain — the figure's own material (blessed exception), clipped to the masses */}
      {material && (
        <g clipPath={`url(#${uid}-grainclip)`}>
          <rect
            x="55"
            y="45"
            width="120"
            height="175"
            filter={`url(#${uid}-grain)`}
            opacity="0.26"
          />
        </g>
      )}

      {/* steam over the mug (drifts in the idle) */}
      <path
        data-part="steam"
        d="M148 152 q-3 -5 0 -9 q3 -4 0 -8"
        stroke="var(--rd-bg-card, #fffcf4)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      />
    </svg>
  );
}

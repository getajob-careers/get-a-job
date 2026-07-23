import React, { useId } from "react";

// Hero-scale mascot — the "person working at a laptop" figure, refined from the
// header logo's MarkFullChair pictogram (CanvasLogo.jsx) into a legible scene.
// SIZE SPLIT holds: the 30px header pictogram is untouched; THIS is the
// hero/loader/ambient figure. Same brand language as the logo — round-cap
// strokes + the top-lit glaze material (--rd-logo-hi -> --rd-primary ->
// --rd-primary-dark) + a warm lift shadow — so the mark and the mascot read as
// one entity at any size.
//
// The figure is built from SEPARABLE, individually-addressable parts (each
// carries a `data-part`), so an anime.js timeline can drive one part without
// touching the rest: `figure` (whole-body bob), `forearm` (typing tick), `head`
// (lean/tilt), `screen` + `glow` (the laptop light). Consumers scope their
// query to a container ref, so several instances animate independently with no
// id collisions.
//
// `pose` swaps only the working arm + any held prop over the SHARED base
// (chair, torso, head, near arm, legs, desk) — that's what makes this one
// recurring CHARACTER across the journey rather than eight separate drawings.
// Poses are prototype sketches for Eli's vocabulary eye-pick, not final art.

// Material + filters, scaled to the 240x240 viewBox. `material=false` renders a
// flat accent (used for the tiny pose-grid sketches where the glaze is noise).
function MascotDefs({ id }) {
  return (
    <defs>
      <linearGradient
        id={`${id}-glaze`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="40"
        x2="0"
        y2="210"
      >
        <stop offset="0%" stopColor="var(--rd-logo-hi)" />
        <stop offset="42%" stopColor="var(--rd-primary)" />
        <stop offset="100%" stopColor="var(--rd-primary-dark)" />
      </linearGradient>
      <linearGradient
        id={`${id}-ink`}
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="90"
        x2="0"
        y2="150"
      >
        <stop offset="0%" stopColor="#3A342B" />
        <stop offset="100%" stopColor="var(--rd-text)" />
      </linearGradient>
      <filter id={`${id}-lift`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow
          dx="0"
          dy="3"
          stdDeviation="3.2"
          floodColor="#4A2C16"
          floodOpacity="0.26"
        />
      </filter>
      {/* Soft blur for the screen glow — a real light spill, not a hard shape. */}
      <filter id={`${id}-soft`} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </defs>
  );
}

// The working arm + optional held prop for a given pose. Elbow is the shared
// pivot at (150,120); the forearm rotates about it (transform-box: fill-box in
// the animated variants). `stroke`/`ink` carry the resolved material.
function PoseArm({ pose, stroke, ink }) {
  const arm = (d, extra = {}) => (
    <path
      d={d}
      stroke={stroke}
      strokeWidth="11"
      strokeLinecap="round"
      fill="none"
      {...extra}
    />
  );
  switch (pose) {
    case "read": // holds a page up, scanning it
      return (
        <>
          {arm("M124 104 L150 120")}
          <g data-part="forearm">
            {arm("M150 120 L150 92")}
            <rect
              x="132"
              y="60"
              width="34"
              height="44"
              rx="3"
              fill="var(--rd-bg-card)"
              stroke={stroke}
              strokeWidth="4"
            />
            <path
              d="M139 72 H159 M139 80 H159 M139 88 H153"
              stroke={stroke}
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.55"
            />
          </g>
        </>
      );
    case "review": // pen to a document on the desk
      return (
        <>
          {arm("M124 104 L150 120")}
          <g data-part="forearm">
            {arm("M150 120 L178 138")}
            <path
              d="M178 138 L188 128"
              stroke={ink}
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
        </>
      );
    case "present": // extended arm, pointing/gesturing at the highlighted UI
      return (
        <g data-part="forearm">
          {arm("M124 104 L182 100")}
          <circle cx="186" cy="99" r="5.4" fill={stroke} />
        </g>
      );
    case "celebrate": // both arms up (payoff)
      return (
        <>
          <g data-part="forearm">{arm("M124 104 L150 66")}</g>
          {arm("M112 108 L86 70")}
        </>
      );
    case "horizon": // hand shading eyes, looking up the path
      return <g data-part="forearm">{arm("M124 104 L150 92 L138 82")}</g>;
    case "empty": // holds a blank page, open-hand "let's add more"
      return (
        <>
          {arm("M124 104 L150 120")}
          <g data-part="forearm">
            {arm("M150 120 L172 128")}
            <rect
              x="168"
              y="112"
              width="30"
              height="38"
              rx="3"
              fill="var(--rd-bg-card)"
              stroke={stroke}
              strokeWidth="4"
            />
          </g>
        </>
      );
    case "working":
    case "loader":
    case "signup":
    default: // hand on the laptop deck (the working anchor)
      return (
        <>
          {arm("M124 104 L150 120")}
          <g data-part="forearm">{arm("M150 120 L176 132")}</g>
        </>
      );
  }
}

// The laptop + desk. Shown for laptop-anchored poses; hidden for poses whose
// scene is elsewhere (read/present/celebrate/horizon) so the figure reads clean.
function Desk({ id, ink, showLaptop }) {
  return (
    <>
      {/* desk surface + front leg */}
      <path
        d="M148 140 L236 140"
        stroke="var(--rd-border-hover)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M228 143 L228 204"
        stroke="var(--rd-border-hover)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {showLaptop && (
        <g data-part="screen">
          {/* screen glow — light spilling off the panel toward the face */}
          <ellipse
            data-part="glow"
            cx="165"
            cy="108"
            rx="26"
            ry="20"
            fill="var(--rd-golden-tint)"
            opacity="0.55"
            filter={`url(#${id}-soft)`}
          />
          {/* keyboard deck */}
          <path d="M152 130 L198 130 L204 139 L158 139 Z" fill={ink} />
          {/* screen back (faces the person; lit left rim) */}
          <path d="M198 130 L192 100 L183 102 L189 130 Z" fill={ink} />
          <path
            d="M183 102 L189 130"
            stroke="var(--rd-golden)"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      )}
    </>
  );
}

const LAPTOP_POSES = new Set(["working", "loader", "signup", "review"]);

export default function MascotFigure({
  pose = "working",
  material = true,
  size = 240,
  className = "",
  title = "Get A Job mascot",
}) {
  const uid = useId().replace(/:/g, "");
  const stroke = material ? `url(#${uid}-glaze)` : "var(--rd-primary)";
  const ink = material ? `url(#${uid}-ink)` : "var(--rd-text)";
  const showLaptop = LAPTOP_POSES.has(pose);
  // head tilt per pose — a few degrees reads as attention direction
  const headTilt =
    pose === "horizon"
      ? -10
      : pose === "celebrate"
        ? -6
        : pose === "read"
          ? -8
          : 0;

  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      style={{ overflow: "visible" }}
    >
      {material && <MascotDefs id={uid} />}

      {/* ground shadow — anchors the figure to the floor */}
      <ellipse
        cx="120"
        cy="214"
        rx="80"
        ry="11"
        fill="#4A2C16"
        opacity="0.13"
      />

      {/* chair — grounded, behind the figure */}
      <g
        stroke={stroke}
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.5"
        fill="none"
      >
        <path d="M62 158 L118 154" />
        <path d="M62 158 L56 104" />
        <path d="M56 104 L74 102" />
        <path d="M70 158 L66 206" />
        <path d="M112 155 L118 204" />
      </g>

      <g data-part="figure" filter={material ? `url(#${uid}-lift)` : undefined}>
        {/* desk + laptop sit under the working hand */}
        <Desk id={uid} ink={ink} showLaptop={showLaptop} />

        {/* legs — thigh + lower leg to the floor */}
        <path
          d="M104 150 L140 158"
          stroke={stroke}
          strokeWidth="15"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M140 158 L147 202"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M147 202 L163 202"
          stroke={stroke}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />

        {/* torso — the hunched back, hip to shoulder */}
        <path
          d="M104 150 C101 126 108 110 126 98"
          stroke={stroke}
          strokeWidth="17"
          strokeLinecap="round"
          fill="none"
        />

        {/* the working arm + prop (pose-specific) */}
        <PoseArm pose={pose} stroke={stroke} ink={ink} />

        {/* head — slight per-pose tilt about the neck */}
        <g
          data-part="head"
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            transform: `rotate(${headTilt}deg)`,
          }}
        >
          <circle cx="134" cy="84" r="15.5" fill={stroke} />
        </g>
      </g>
    </svg>
  );
}

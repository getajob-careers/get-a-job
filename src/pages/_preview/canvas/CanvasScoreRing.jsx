import React, { useEffect, useId, useRef, useState } from "react";
import { RING_TRACK_OPACITY, visibleFill } from "./ring";

// Score visual (round 3, FINAL — "sheen arc" locked). One confident arc with a
// soft luminosity gradient + round cap over a faint band-tint backing, the score
// number centered. Rich and quiet, premium not gamer-y, legible at ~46px. The
// tri-ring, the score-coin / beaded exploration variants, the lab route, and the
// on-page switcher were all removed once this direction won. Keeps the ring
// low-fill floor (ring.js) and badge AA (number + arc use the band -dark, AA on
// the card), and degrades under reduced motion (no draw-in). Hover/tap opens the
// 3-axis breakdown legend.

export function scoreAxes(scoreResult) {
  const attain = scoreResult?.attainability_score ?? 0;
  const matched = scoreResult?.signals?.matched_skills?.length ?? 0;
  const missing = scoreResult?.signals?.missing_core_skills?.length ?? 0;
  const skill = matched + missing > 0 ? matched / (matched + missing) : 0.65;
  return { skill, experience: attain, seniority: scoreResult?.fit_score ?? 0 };
}

export default function CanvasScoreRing({ scoreResult, bandMeta, size = 46 }) {
  const gid = "g" + useId().replace(/:/g, "");
  const [drawn, setDrawn] = useState(false);
  const [legend, setLegend] = useState(false);
  const enterTimer = useRef(null);
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 40);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => () => clearTimeout(enterTimer.current), []);

  const { skill, experience, seniority } = scoreAxes(scoreResult);
  const raw = scoreResult?.attainability_score ?? 0;
  // Low-fill floor (hard constraint a): a real score always draws a visible arc.
  const fill = visibleFill(raw, raw > 0);
  const color = bandMeta?.fg || "var(--rd-text)";
  const tint = bandMeta?.bg || "var(--rd-bg-soft)";
  const pct = Math.round(raw * 100);

  const arcStroke = 5;
  const cx = size / 2;
  const r = cx - arcStroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const shown = reduce || drawn;
  const offset = shown ? c * (1 - fill) : c;
  const arcStyle = reduce
    ? undefined
    : { transition: "stroke-dashoffset .7s cubic-bezier(.22,.61,.36,1)" };

  const openLegend = () => {
    clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(() => setLegend(true), 120);
  };
  const closeLegend = () => {
    clearTimeout(enterTimer.current);
    setLegend(false);
  };

  return (
    <span
      className="relative flex-shrink-0 inline-flex"
      onMouseEnter={openLegend}
      onMouseLeave={closeLegend}
      onClick={(e) => {
        e.stopPropagation();
        setLegend((x) => !x);
      }}
    >
      <svg width={size} height={size} role="img" aria-label={`Match ${pct}%`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Faint band-tint backing — depth behind the arc. */}
        <circle
          cx={cx}
          cy={cx}
          r={r - arcStroke / 2}
          fill={tint}
          opacity="0.35"
        />

        <g transform={`rotate(-90 ${cx} ${cx})`}>
          {/* Ghost track — ring shape reads at 0% fill. */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeOpacity={RING_TRACK_OPACITY}
            strokeWidth={arcStroke}
          />
          {/* The arc — luminosity gradient + round cap. */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={arcStroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={arcStyle}
          />
        </g>

        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          style={{
            fill: color,
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "Rokkitt, serif",
          }}
        >
          {pct}
        </text>
      </svg>

      {legend && (
        <div
          className="absolute top-full right-0 mt-1 z-30 w-[150px] rd-r-md rd-lift p-2 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1.5">
            Match breakdown
          </p>
          {[
            ["Skills", skill],
            ["Experience", experience],
            ["Seniority", seniority],
          ].map(([label, val]) => (
            <div key={label} className="mb-1.5 last:mb-0">
              <div className="flex items-center justify-between rd-t-micro mb-0.5">
                <span className="text-rd-text-secondary">{label}</span>
                <span className="font-mono text-rd-text-tertiary">
                  {Math.round(val * 100)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-rd-bg-soft overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(val * 100)}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

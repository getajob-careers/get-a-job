import React, { useEffect, useRef, useState } from "react";
import { RING_TRACK_OPACITY, visibleFill } from "./ring";

// Score visual (round 3, step 3): a SINGLE bold arc + ghost track + the score
// number. The old tri-ring and the plain badge fallback are both dead — three
// faint concentric arcs read as noise at this size and the axis meaning wasn't
// legible without the legend anyway. So the ring shows one confident arc (the
// attainability score) and the 3-axis breakdown (Skills / Experience /
// Seniority) lives in the hover/tap legend. Honors the low-fill floor (ring.js)
// and badge AA (the number + arc use the band's -dark, AA on the card).

export function scoreAxes(scoreResult) {
  const attain = scoreResult?.attainability_score ?? 0;
  const matched = scoreResult?.signals?.matched_skills?.length ?? 0;
  const missing = scoreResult?.signals?.missing_core_skills?.length ?? 0;
  const skill = matched + missing > 0 ? matched / (matched + missing) : 0.65;
  return { skill, experience: attain, seniority: scoreResult?.fit_score ?? 0 };
}

export default function CanvasScoreRing({ scoreResult, bandMeta, size = 46 }) {
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
  const pct = Math.round(raw * 100);

  const stroke = 4;
  const cx = size / 2;
  const r = cx - stroke / 2 - 1;
  const c = 2 * Math.PI * r;

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
        setLegend((v) => !v);
      }}
    >
      <svg width={size} height={size} role="img" aria-label={`Match ${pct}%`}>
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          {/* Ghost track — always visible so the ring shape reads at 0% fill. */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeOpacity={RING_TRACK_OPACITY}
            strokeWidth={stroke}
          />
          {/* One confident arc. */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={reduce || drawn ? c * (1 - fill) : c}
            style={
              reduce
                ? undefined
                : {
                    transition:
                      "stroke-dashoffset .7s cubic-bezier(.22,.61,.36,1)",
                  }
            }
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
          ].map(([label, v]) => (
            <div key={label} className="mb-1.5 last:mb-0">
              <div className="flex items-center justify-between rd-t-micro mb-0.5">
                <span className="text-rd-text-secondary">{label}</span>
                <span className="font-mono text-rd-text-tertiary">
                  {Math.round(v * 100)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-rd-bg-soft overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(v * 100)}%`,
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

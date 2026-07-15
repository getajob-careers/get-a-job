import React, { useEffect, useRef, useState } from "react";
import { RING_TRACK_OPACITY, visibleFill } from "./ring";

// Score visual (wave-2 feedback: ring won, now the default). A mini tri-ring:
// three concentric arcs = Skills / Experience / Seniority axes derived from the
// fixture scoreResult, in the BAND color at 3 opacities so the band still reads
// at a glance; score number centered; arcs draw in on entrance. Hover (or tap on
// touch) opens a small legend popover with the three labeled mini-bars so users
// see what's graded — the full breakdown stays for the future detail modal.
// The card renders the plain badge instead under prefers-reduced-motion.

export function scoreAxes(scoreResult) {
  const attain = scoreResult?.attainability_score ?? 0;
  const matched = scoreResult?.signals?.matched_skills?.length ?? 0;
  const missing = scoreResult?.signals?.missing_core_skills?.length ?? 0;
  const skill = matched + missing > 0 ? matched / (matched + missing) : 0.65;
  return { skill, experience: attain, seniority: scoreResult?.fit_score ?? 0 };
}

export default function CanvasScoreRing({ scoreResult, bandMeta, size = 44 }) {
  const [drawn, setDrawn] = useState(false);
  const [legend, setLegend] = useState(false);
  const enterTimer = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 40);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => () => clearTimeout(enterTimer.current), []);

  const { skill, experience, seniority } = scoreAxes(scoreResult);
  // Low-fill floor (hard constraint a): a non-zero axis always draws a visible
  // arc so a real score is never mistaken for empty on any palette/field.
  const axes = [skill, experience, seniority].map((v) => visibleFill(v, v > 0));
  const opac = [1, 0.55, 0.3];
  const color = bandMeta?.fg || "var(--rd-text)";
  const pct = Math.round((scoreResult?.attainability_score ?? 0) * 100);

  const stroke = 3;
  const gap = 2;
  const cx = size / 2;
  const radii = [0, 1, 2].map((k) => cx - stroke / 2 - k * (stroke + gap));

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
          {radii.map((r, k) => {
            const c = 2 * Math.PI * r;
            return (
              <g key={k}>
                <circle
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeOpacity={RING_TRACK_OPACITY}
                  strokeWidth={stroke}
                />
                <circle
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeOpacity={opac[k]}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={drawn ? c * (1 - axes[k]) : c}
                  style={{
                    transition:
                      "stroke-dashoffset .7s cubic-bezier(.22,.61,.36,1)",
                    transitionDelay: `${k * 90}ms`,
                  }}
                />
              </g>
            );
          })}
        </g>
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          style={{
            fill: color,
            fontSize: 12,
            fontWeight: 800,
            fontFamily: "Rokkitt, serif",
          }}
        >
          {pct}
        </text>
      </svg>

      {legend && (
        <div
          className="absolute top-full right-0 mt-1 z-30 w-[150px] rounded-lg border border-rd-border bg-rd-bg-card shadow-rd p-2 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[9px] uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1.5">
            Match breakdown
          </p>
          {[
            ["Skills", skill],
            ["Experience", experience],
            ["Seniority", seniority],
          ].map(([label, v]) => (
            <div key={label} className="mb-1.5 last:mb-0">
              <div className="flex items-center justify-between text-[10px] mb-0.5">
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

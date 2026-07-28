import React, { useEffect, useId, useRef, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { honestMatchLabelsEnabled } from "@/lib/flags";

// Flag-on job-card match visual, ported from the canvas "sheen arc": one arc with
// a luminosity gradient + round cap over a faint band-tint backing, the match %
// centered. Palette-locked - fg/bg are the band's OWN tokens (the same colours
// the flag-off text badge uses), so no new colours enter.
//
// Draw-in + centre count-up run only when `animate` (the caller caps this to the
// first rows); reduced-motion renders the final state instantly. When
// `interactive` (Batch C, once the peek is retired flag-on), hover/tap opens a
// 3-axis breakdown legend; clicks stopPropagation so the card's own click target
// is never hijacked.

const RING_TRACK_OPACITY = 0.22;
const MIN_ARC = 0.07; // a real score always draws a visible arc

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// 3-axis breakdown (0-1 each) from the score result. Skills = matched / (matched
// + missing); Experience = attainability; Seniority = fit_score.
export function scoreAxes(scoreResult) {
  const attain = scoreResult?.attainability_score ?? 0;
  const matched = scoreResult?.signals?.matched_skills?.length ?? 0;
  const missing = scoreResult?.signals?.missing_core_skills?.length ?? 0;
  const skill = matched + missing > 0 ? matched / (matched + missing) : 0.65;
  return { skill, experience: attain, seniority: scoreResult?.fit_score ?? 0 };
}

// The Skills / Experience / Seniority breakdown. Shared so the card's hover
// popover (below) and the modal's default-visible header show identical numbers
// + treatment. `color` fills the bars (the band's fg).
export function ScoreBreakdown({ scoreResult, color, className = "" }) {
  const axes = scoreAxes(scoreResult);
  const fill = color || "var(--rd-text)";
  return (
    <div className={className}>
      <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1.5">
        Match breakdown
      </p>
      {/* Display-only honesty relabel (honest_match_labels flag): the middle row
          shows attainability (the whole composite) and the last shows fit_score -
          neither is the "Experience" or "Seniority" axis. When the flag is on, the
          labels tell the truth. No values change - only the words. */}
      {(honestMatchLabelsEnabled()
        ? [
            ["Skills", axes.skill],
            ["Overall", axes.experience],
            ["Search fit", axes.seniority],
          ]
        : [
            ["Skills", axes.skill],
            ["Experience", axes.experience],
            ["Seniority", axes.seniority],
          ]
      ).map(([label, val]) => (
        <div key={label} className="mb-1.5 last:mb-0">
          <div className="flex items-center justify-between rd-t-micro mb-0.5">
            <span className="text-rd-text-secondary">{label}</span>
            <span className="font-mono text-rd-text-secondary">
              {Math.round(val * 100)}
            </span>
          </div>
          <div className="h-1 rounded-full bg-rd-bg-soft overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round(val * 100)}%`, background: fill }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ScoreRing({
  pct,
  fg,
  bg,
  animate = false,
  size = 42,
  interactive = false,
  scoreResult = null,
}) {
  const gid = "sr" + useId().replace(/:/g, "");
  const reduce = prefersReducedMotion();
  const willAnimate = animate && !reduce;
  const [drawn, setDrawn] = useState(!willAnimate);
  const [legend, setLegend] = useState(false);
  const enterTimer = useRef(null);

  useEffect(() => {
    if (!willAnimate) return undefined;
    const t = setTimeout(() => setDrawn(true), 40);
    return () => clearTimeout(t);
  }, [willAnimate]);
  useEffect(() => () => clearTimeout(enterTimer.current), []);

  const shown = useCountUp(pct, { enabled: animate });

  const stroke = 5;
  const cx = size / 2;
  const r = cx - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const fill = pct > 0 ? Math.max(MIN_ARC, pct / 100) : 0;
  const offset = drawn ? c * (1 - fill) : c;
  const color = fg || "var(--rd-text)";
  const tint = bg || "var(--rd-bg-soft)";

  const openLegend = () => {
    clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(() => setLegend(true), 120);
  };
  const closeLegend = () => {
    clearTimeout(enterTimer.current);
    setLegend(false);
  };
  const axes = interactive ? scoreAxes(scoreResult) : null;

  return (
    <span
      className={`relative flex-shrink-0 inline-flex ${interactive ? "cursor-pointer rounded-full rd-focus-ring" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-expanded={interactive ? legend : undefined}
      aria-label={
        interactive ? `Match ${pct}%, toggle score breakdown` : undefined
      }
      onMouseEnter={interactive ? openLegend : undefined}
      onMouseLeave={interactive ? closeLegend : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              setLegend((x) => !x);
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setLegend((x) => !x);
              }
            }
          : undefined
      }
    >
      <svg width={size} height={size} role="img" aria-label={`Match ${pct}%`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {/* Faint band-tint backing - depth behind the arc. */}
        <circle cx={cx} cy={cx} r={r - stroke / 2} fill={tint} opacity="0.35" />
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          {/* Ghost track - the ring shape reads at 0% fill. */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeOpacity={RING_TRACK_OPACITY}
            strokeWidth={stroke}
          />
          {/* The arc. */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
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
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "Rokkitt, serif",
          }}
        >
          {shown}
        </text>
      </svg>

      {interactive && legend && axes && (
        <div
          className="absolute top-full right-0 mt-1 z-30 w-[150px] rd-r-md rd-lift bg-rd-bg-card p-2 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <ScoreBreakdown scoreResult={scoreResult} color={color} />
        </div>
      )}
    </span>
  );
}

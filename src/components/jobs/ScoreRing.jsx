import React, { useEffect, useId, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";

// Flag-on job-card match visual, ported from the canvas "sheen arc": one arc with
// a luminosity gradient + round cap over a faint band-tint backing, the match %
// centered. Palette-locked - fg/bg are the band's OWN tokens (the same colours
// the flag-off text badge uses), so no new colours enter.
//
// Display-only ON PURPOSE: no hover legend / no onClick here (that 3-axis
// breakdown is a later batch), so the ring never competes with the card's click
// target or its dwell-peek. Draw-in + centre count-up run only when `animate`
// (the caller caps this to the first rows); reduced-motion renders the final
// state instantly (no draw-in, number shown immediately).

const RING_TRACK_OPACITY = 0.22;
const MIN_ARC = 0.07; // a real score always draws a visible arc

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function ScoreRing({ pct, fg, bg, animate = false, size = 42 }) {
  const gid = "sr" + useId().replace(/:/g, "");
  const reduce = prefersReducedMotion();
  const willAnimate = animate && !reduce;
  const [drawn, setDrawn] = useState(!willAnimate);

  useEffect(() => {
    if (!willAnimate) return undefined;
    const t = setTimeout(() => setDrawn(true), 40);
    return () => clearTimeout(t);
  }, [willAnimate]);

  const shown = useCountUp(pct, { enabled: animate });

  const stroke = 5;
  const cx = size / 2;
  const r = cx - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const fill = pct > 0 ? Math.max(MIN_ARC, pct / 100) : 0;
  const offset = drawn ? c * (1 - fill) : c;
  const color = fg || "var(--rd-text)";
  const tint = bg || "var(--rd-bg-soft)";

  return (
    <span className="relative flex-shrink-0 inline-flex">
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
    </span>
  );
}

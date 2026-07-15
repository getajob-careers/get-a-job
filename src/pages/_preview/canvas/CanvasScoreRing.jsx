import React, { useEffect, useState } from "react";

// Wave 2.5a — mini tri-ring score visual (hand-rolled SVG, no deps). Three
// concentric arcs = skill / experience / seniority axes derived from the fixture
// scoreResult, in the BAND color at 3 opacities so the band meaning still reads
// at a glance. Score number centered. Arcs draw in on entrance (stroke-dashoffset
// transition, staggered), replacing the count-up. The card renders the plain
// badge instead under prefers-reduced-motion.
export default function CanvasScoreRing({ scoreResult, bandMeta, size = 44 }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 40);
    return () => clearTimeout(t);
  }, []);

  const attain = scoreResult?.attainability_score ?? 0;
  const matched = scoreResult?.signals?.matched_skills?.length ?? 0;
  const missing = scoreResult?.signals?.missing_core_skills?.length ?? 0;
  const skill = matched + missing > 0 ? matched / (matched + missing) : 0.65;
  const axes = [skill, attain, scoreResult?.fit_score ?? 0]; // skill / experience / seniority
  const opac = [1, 0.55, 0.3];
  const color = bandMeta?.fg || "var(--rd-text)";
  const pct = Math.round(attain * 100);

  const stroke = 3;
  const gap = 2;
  const cx = size / 2;
  const radii = [0, 1, 2].map((k) => cx - stroke / 2 - k * (stroke + gap));

  return (
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
                strokeOpacity={0.12}
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
  );
}

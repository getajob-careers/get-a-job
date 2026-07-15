import React, { useEffect, useState } from "react";

// Wave 2.5b — single notched gauge score visual (hand-rolled SVG, no deps). A
// ~270° arc fills to the score around the centered number, band-colored, with
// tick "notches" and a soft backlit glow. Fill draws in on entrance. The card
// renders the plain badge instead under prefers-reduced-motion.
export default function CanvasScoreGauge({ scoreResult, bandMeta, size = 44 }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 40);
    return () => clearTimeout(t);
  }, []);

  const attain = scoreResult?.attainability_score ?? 0;
  const pct = Math.round(attain * 100);
  const color = bandMeta?.fg || "var(--rd-text)";

  const cx = size / 2;
  const stroke = 4;
  const r = cx - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const ARC = 0.75; // 270° of the circle is the gauge; 90° gap at the bottom
  const rot = 135; // rotate so the gap sits centered at the bottom
  const gid = React.useId ? React.useId() : "gg";

  // Tick notches every 45° across the 270° arc.
  const ticks = Array.from({ length: 7 }, (_, i) => {
    const a = ((rot + i * 45) * Math.PI) / 180;
    const ro = r + stroke / 2;
    const ri = r - stroke / 2;
    return {
      x1: cx + ro * Math.cos(a),
      y1: cx + ro * Math.sin(a),
      x2: cx + ri * Math.cos(a),
      y2: cx + ri * Math.sin(a),
    };
  });

  return (
    <svg width={size} height={size} role="img" aria-label={`Match ${pct}%`}>
      <defs>
        <filter id={`glow-${gid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <g transform={`rotate(${rot} ${cx} ${cx})`}>
        {/* track */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeOpacity={0.14}
          strokeWidth={stroke}
          strokeDasharray={`${ARC * c} ${(1 - ARC) * c}`}
        />
        {/* backlit glow */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeOpacity={0.4}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={drawn ? c * (1 - ARC * attain) : c}
          filter={`url(#glow-${gid})`}
          style={{
            transition: "stroke-dashoffset .8s cubic-bezier(.22,.61,.36,1)",
          }}
        />
        {/* fill */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={drawn ? c * (1 - ARC * attain) : c}
          style={{
            transition: "stroke-dashoffset .8s cubic-bezier(.22,.61,.36,1)",
          }}
        />
      </g>
      {/* notches */}
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke="var(--rd-bg-card)"
          strokeWidth="1.25"
        />
      ))}
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
        {pct}
      </text>
    </svg>
  );
}

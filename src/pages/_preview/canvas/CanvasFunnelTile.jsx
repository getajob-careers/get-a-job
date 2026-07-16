import React from "react";
import { RING_TRACK_OPACITY, visibleFill } from "./ring";

// Tracker funnel tile with the shared ring motif (wave-2 feedback #5). A small
// ring fills to value/total and animates (stroke-dashoffset transition) whenever
// the count changes — so moving a card visibly nudges the funnel. Same visual
// language as the score ring, not a copy of the CV moment.
export default function CanvasFunnelTile({
  label,
  value,
  total,
  accent = "var(--rd-coral)",
}) {
  // Low-fill floor (hard constraint a): a real count always draws a visible arc.
  const frac = visibleFill(total > 0 ? value / total : 0, value > 0);
  const size = 30;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex-1 flex items-center gap-2 rd-lift rd-r-md px-3 py-2">
      <svg
        width={size}
        height={size}
        className="-rotate-90 flex-shrink-0"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeOpacity={RING_TRACK_OPACITY}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{
            transition: "stroke-dashoffset .5s cubic-bezier(.22,.61,.36,1)",
          }}
        />
      </svg>
      <div className="min-w-0">
        <p className="font-display font-extrabold rd-t-body-l text-rd-text leading-none tabular-nums">
          {value}
        </p>
        <p className="rd-t-micro text-rd-text-secondary mt-0.5">{label}</p>
      </div>
    </div>
  );
}

import React, {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { RING_TRACK_OPACITY, visibleFill } from "./ring";
import { RING_VARIANT_KEYS, getRingVariant, subscribeRing } from "./ringStore";

// Score visual (round 3, step 3 refined). The tri-ring stays dead; the flat
// single arc was too plain. Three enriched directions to pick from, behind
// ?ring=a|b|c (a lab view at ?ring=lab renders them side by side). Brief: one
// glance says "this is the score and it matters," premium not gamer-y, legible
// at ~46px. All keep the ring low-fill floor (ring.js) and badge AA (number/arc
// use the band -dark, AA on card; the coin's number sits on band-tint, AA), and
// degrade gracefully under reduced motion (no draw-in, static end-bead).
//
//   a Sheen arc — one confident arc with a soft luminosity gradient + round cap
//                 over a faint tint backing. Rich, quiet, editorial.
//   b Score coin — the arc frames a filled band-tint disc the number sits on,
//                  so the number reads as a substantial "score coin."
//   c Beaded arc — a precise arc with a filled bead at its tip (Oura/dial feel),
//                  marking the value cleanly.

export function scoreAxes(scoreResult) {
  const attain = scoreResult?.attainability_score ?? 0;
  const matched = scoreResult?.signals?.matched_skills?.length ?? 0;
  const missing = scoreResult?.signals?.missing_core_skills?.length ?? 0;
  const skill = matched + missing > 0 ? matched / (matched + missing) : 0.65;
  return { skill, experience: attain, seniority: scoreResult?.fit_score ?? 0 };
}

export default function CanvasScoreRing({
  scoreResult,
  bandMeta,
  size = 46,
  variant,
}) {
  // Live variant from the shared store (pinned switcher / ?ring); an explicit
  // `variant` prop overrides it — the lab passes one per row.
  const storeVariant = useSyncExternalStore(
    subscribeRing,
    getRingVariant,
    () => "a",
  );
  const v = RING_VARIANT_KEYS.includes(variant) ? variant : storeVariant;
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

  const arcStroke = v === "a" ? 5 : 4;
  const cx = size / 2;
  const r = cx - arcStroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const shown = reduce || drawn;
  const offset = shown ? c * (1 - fill) : c;
  const arcStyle = reduce
    ? undefined
    : { transition: "stroke-dashoffset .7s cubic-bezier(.22,.61,.36,1)" };

  // Beaded-arc (c): tip position, from top (-90deg) clockwise by `fill`.
  const ang = -Math.PI / 2 + fill * 2 * Math.PI;
  const beadX = cx + r * Math.cos(ang);
  const beadY = cx + r * Math.sin(ang);
  const coinR = r - arcStroke / 2 - 2.5;

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
        {v === "a" && (
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.55" />
            </linearGradient>
          </defs>
        )}

        {/* b: filled band-tint coin behind the number. */}
        {v === "b" && <circle cx={cx} cy={cx} r={coinR} fill={tint} />}
        {/* a: faint tint backing for depth. */}
        {v === "a" && (
          <circle
            cx={cx}
            cy={cx}
            r={r - arcStroke / 2}
            fill={tint}
            opacity="0.35"
          />
        )}

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
          {/* The arc. */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={v === "a" ? `url(#${gid})` : color}
            strokeWidth={arcStroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={arcStyle}
          />
        </g>

        {/* c: bead at the arc tip. */}
        {v === "c" && (
          <circle
            cx={beadX}
            cy={beadY}
            r={3.25}
            fill={color}
            opacity={shown ? 1 : 0}
            style={reduce ? undefined : { transition: "opacity .3s ease .4s" }}
          />
        )}

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

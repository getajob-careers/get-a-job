import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// CV Excellence Arc S1 — the generation-wait experience.
//
// HONEST BY CONSTRUCTION (design-craft rule 9 + the Labor-Illusion research):
// the generation is a single blocking edge call with NO streaming (real
// per-section progress arrives in P7). So we show NO fabricated percentage.
// What IS honest: (1) a CV-shaped skeleton so the user sees the document taking
// shape, and (2) phase labels that name the REAL pipeline steps in order, plus
// an honest time expectation. The labels advance on a timer tuned to the known
// ~30-40s pipeline; they describe what the backend genuinely does, in order —
// they are not a completion meter and never claim "done".
//
// `phases` order mirrors generate-tailored-cv / refine-cv: extract JD → match
// experience → author/reword bullets → format. When `hasMaster` is false, the
// first-time master build (~40s) is prepended so the wait isn't a mystery.

const TAILOR_PHASES = [
  "Reading the role…",
  "Matching your experience to the job…",
  "Reframing your bullets for this role…",
  "Formatting your CV…",
];

const WITH_MASTER_BUILD = [
  "Building your master CV (one-time, ~40s)…",
  ...TAILOR_PHASES,
];

// Advance roughly every ~9s across the ~30-40s window (or wider with the
// one-time master build). Honest cadence, not a completion promise: the last
// label simply holds until the real result returns.
const STEP_MS = 9000;

export default function CvGenerationProgress({
  hasMaster = true,
  compact = false,
  className = "",
}) {
  const phases = hasMaster ? TAILOR_PHASES : WITH_MASTER_BUILD;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    const timers = [];
    for (let i = 1; i < phases.length; i++) {
      timers.push(setTimeout(() => setIdx(i), STEP_MS * i));
    }
    return () => timers.forEach(clearTimeout);
  }, [hasMaster]);

  const label = phases[Math.min(idx, phases.length - 1)];

  const bars = compact ? 3 : 5;

  return (
    <div
      className={["w-full", className].join(" ")}
      role="status"
      aria-live="polite"
      aria-label="Generating your CV"
    >
      {/* CV-shaped skeleton — header, then section rows forming */}
      <div
        className={[
          "rounded-[14px] border border-rd-border bg-rd-bg-card",
          compact ? "p-3.5" : "p-5",
        ].join(" ")}
      >
        <Skeleton className="h-4 w-1/3 bg-rd-bg-soft" />
        <Skeleton className="mt-2 h-2.5 w-1/4 bg-rd-bg-soft" />
        <div className={compact ? "mt-3 space-y-2" : "mt-4 space-y-2.5"}>
          {Array.from({ length: bars }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-2.5 bg-rd-bg-soft"
              style={{ width: `${92 - i * 9}%` }}
            />
          ))}
        </div>
      </div>

      {/* Honest phase label + time expectation. No percentage. */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-rd-primary animate-pulse"
          aria-hidden="true"
        />
        <p className="text-[12.5px] leading-snug text-rd-text-secondary">
          <span className="font-medium text-rd-text">{label}</span>{" "}
          <span className="text-rd-text-tertiary">· usually ~30–40s</span>
        </p>
      </div>
    </div>
  );
}

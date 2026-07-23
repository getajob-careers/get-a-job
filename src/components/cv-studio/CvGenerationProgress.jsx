// CV RED OQ4 - the honest generation-wait ring.
//
// HONEST BY CONSTRUCTION (design-craft rule 9): CV generation is a single
// blocking edge call with no client-visible streaming, so this NEVER fabricates
// a percentage OR timed "stages" that pretend to track the backend. The ring
// runs INDETERMINATE (a rotating partial arc = honest "working") and only fills
// for real once a { done, total, stage } contract is supplied. That emission is
// owned by the CV lane (its own edge-fn arc: generate-tailored-cv already writes
// cv_generation_progress; refine-cv's emission is queued there). When it lands,
// a caller passing `progress` makes this ring go determinate automatically - no
// change needed here. Until then the ring honestly spins.

// Measured p50/p90 from function_metrics (post-2026-07-21 parallel-LLM fix,
// which cut CV generation from ~38s). Static honest expectation only - NO
// countdown, NO fake remaining-time. If that measurement moves, update the range
// HERE (single source), and re-derive it from function_metrics, not by guess.
export const GENERATION_ETA = "This usually takes about 10-20 seconds";

// The honest progress ring. Determinate ONLY when a real { done, total }
// contract is present; otherwise a rotating partial arc (indeterminate).
function ProgressRing({ progress, size, stroke }) {
  const determinate = !!progress && progress.total > 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = determinate
    ? Math.min(1, Math.max(0, progress.done / progress.total))
    : 0;
  const center = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={determinate ? "" : "rd-ring-indeterminate"}
      aria-hidden="true"
    >
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="var(--rd-border)"
        strokeWidth={stroke}
      />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="var(--rd-primary)"
        strokeWidth={stroke}
        strokeLinecap="round"
        // Determinate: arc length = the real fraction. Indeterminate: a fixed
        // ~28% arc that the whole svg rotates - honest motion, never a % claim.
        strokeDasharray={circ}
        strokeDashoffset={determinate ? circ * (1 - pct) : circ * 0.72}
        transform={`rotate(-90 ${center} ${center})`}
        style={
          determinate
            ? { transition: "stroke-dashoffset 400ms ease" }
            : undefined
        }
      />
    </svg>
  );
}

export default function CvGenerationProgress({
  compact = false,
  // Optional { done, total, stage } contract. When present the ring fills for
  // real and `stage` names the step. Absent = honest indeterminate spin.
  progress = null,
  // Honest primary label supplied by the caller (e.g. "Tailoring your CV…").
  label = "",
  // Optional truthful secondary line (e.g. GENERATION_ETA). Never a countdown.
  hint = "",
  className = "",
}) {
  const displayLabel = label || progress?.stage || "Working on it…";

  // Compact = inline ring + label for a banner over an existing document (the
  // tailoring path). Keeps the doc visible; the ring supplies the honest motion.
  if (compact) {
    return (
      <div
        className={["flex items-center gap-2.5", className].join(" ")}
        role="status"
        aria-live="polite"
      >
        <ProgressRing progress={progress} size={18} stroke={2.5} />
        <div className="min-w-0 leading-snug">
          <span className="block text-sm text-rd-primary-dark">
            {displayLabel}
          </span>
          {hint && (
            <span className="block text-xs text-rd-primary-dark/70">
              {hint}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full = the ring standing alone as the generation-wait hero, with an honest
  // label and (optionally) the honest time expectation. No percentage, no stages.
  return (
    <div
      className={[
        "w-full flex flex-col items-center text-center",
        className,
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-label="Generating your CV"
    >
      <ProgressRing progress={progress} size={52} stroke={4} />
      <div className="mt-4">
        <p className="text-sm font-medium text-rd-text leading-snug">
          {displayLabel}
        </p>
        {hint && <p className="mt-1 text-xs text-rd-text-secondary">{hint}</p>}
      </div>
    </div>
  );
}

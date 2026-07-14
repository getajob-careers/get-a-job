import React, { useMemo } from "react";
import JobGridCard from "@/components/jobs/JobGridCard";
import { useCountUp } from "./useCountUp";

// Wraps the real (presentational) JobGridCard and ramps the DISPLAYED score
// 0 → target on card entrance (idea #2). We animate a copy of scoreResult, so
// the badge counts up while the band label + all parent sectioning keep the
// real values. No prod edit — the count-up lives entirely in the canvas.
export default function CanvasScoredCard({ job, scoreResult, onOpen }) {
  const p = useCountUp(1, 700); // entrance progress 0 → 1
  const animated = useMemo(
    () => ({
      ...scoreResult,
      fit_score: (scoreResult?.fit_score ?? 0) * p,
      attainability_score: (scoreResult?.attainability_score ?? 0) * p,
    }),
    [scoreResult, p],
  );
  // Open with the REAL scoreResult, never the mid-ramp animated copy.
  return (
    <JobGridCard
      job={job}
      scoreResult={animated}
      unified
      onOpen={() => onOpen?.(job, scoreResult)}
    />
  );
}

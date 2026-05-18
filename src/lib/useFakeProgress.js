import { useEffect, useRef, useState } from "react";

/**
 * Fake-but-smart progress percentage for the onboarding-tutorial setup bar.
 *
 * Honesty disclosure: this is NOT tied to the real background-task
 * completion percentage (we don't have one — the edge functions don't
 * stream progress). It's an elapsed-time curve that asymptotes to 95%
 * over the expected duration. When the caller flips `isComplete=true`,
 * it snaps to 100%.
 *
 * Curve: 1 - exp(-elapsed / expectedDurationMs * 3) — gives ~95% at
 * elapsed = expectedDurationMs (since 1 - e^-3 ≈ 0.95), continues
 * approaching 0.95 asymptotically beyond that. Feel: fast at the start,
 * slows in the middle, crawls near the end — matches the way users
 * read "this is taking a while" without breaking trust.
 *
 * @param {boolean} isComplete  flip to true to snap the percentage to 100
 * @param {number}  expectedDurationMs  reference time for the curve (default 60s)
 * @returns {number}  integer percent in [0, 100]
 */
export function useFakeProgress(isComplete, expectedDurationMs = 60000) {
  const [percent, setPercent] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (isComplete) {
      setPercent(100);
      return undefined;
    }
    const tick = () => {
      const elapsed = Date.now() - startedAt.current;
      const fraction = Math.min(0.95, 1 - Math.exp((-elapsed / expectedDurationMs) * 3));
      setPercent(Math.round(fraction * 100));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [isComplete, expectedDurationMs]);

  return percent;
}

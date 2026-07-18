import { useEffect, useState } from "react";

// Ramp a number 0 → target (ease-out cubic) after an optional start delay.
// Returns { value, done } — `done` is false while ramping (for a badge scale
// emphasis) and true once settled. Respects prefers-reduced-motion and an
// `enabled` gate (disabled → jump straight to target, done). rAF-driven, so it
// only animates in a focused tab (backgrounded tabs pause rAF).
export function useCountUp(
  target,
  { duration = 700, delay = 0, enabled = true } = {},
) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const skip = reduce || !enabled;
  const [value, setValue] = useState(skip ? target : 0);
  const [done, setDone] = useState(skip);

  useEffect(() => {
    if (skip) {
      setValue(target);
      setDone(true);
      return undefined;
    }
    setValue(0);
    setDone(false);
    let raf = 0;
    let startT = null;
    const tick = (t) => {
      if (startT == null) startT = t;
      const p = Math.min(1, (t - startT) / duration);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration, delay, skip]);

  return { value, done };
}

import { useEffect, useRef, useState } from "react";

// Ramps a number toward `target` with an ease-out cubic. Adopted from the canvas
// prototype (the idea-menu's #1 delight, previously unwired).
//
// Delta-aware on purpose: it animates from the PREVIOUS displayed value, not
// always from 0. So a first populate (0 -> 27) reads as a count-up, while a small
// later change (27 -> 28, e.g. a kanban drop moving one card) is just a gentle
// one-step tick - never a full 0 -> N replay. That is the binding performance
// rule for the funnel tiles.
//
// enabled:false OR prefers-reduced-motion -> returns `target` immediately (no
// animation, no rAF), so a flag-off / reduced-motion render shows the real number
// with zero motion and stays byte-identical.
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useCountUp(
  target,
  { duration = 700, delay = 0, enabled = true } = {},
) {
  const animate = enabled && !prefersReducedMotion();
  const [value, setValue] = useState(animate ? 0 : target);
  const fromRef = useRef(animate ? 0 : target);
  const rafRef = useRef(0);
  const timerRef = useRef(0);

  useEffect(() => {
    if (!animate || target === fromRef.current) {
      setValue(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const delta = target - from;
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + delta * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };
    timerRef.current = window.setTimeout(() => {
      rafRef.current = requestAnimationFrame(step);
    }, delay);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
  }, [target, animate, duration, delay]);

  return value;
}

export default useCountUp;

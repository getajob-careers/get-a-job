import { useEffect, useRef, useState } from "react";

// Ramp a number 0 → target on mount (ease-out cubic, ~fast). Respects
// prefers-reduced-motion like the cursor-magnet: reduced → jump to target, no
// animation. Used for the match-score count-up (idea #2). rAF-driven, so it
// only animates in a focused tab (backgrounded tabs pause rAF).
export function useCountUp(target, duration = 700) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [value, setValue] = useState(reduce ? target : 0);
  const startRef = useRef(null);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return undefined;
    }
    startRef.current = null;
    let raf = 0;
    const tick = (t) => {
      if (startRef.current == null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);

  return value;
}

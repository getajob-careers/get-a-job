import { useEffect, useRef } from "react";

// "Comes to you" cursor-magnet for the sidebar feature tiles.
//
// RECONSTRUCTION — not Yishai's verbatim code. His live landing carries only a
// dead CSS scaffold for this effect: `.lv-pchip { transform: translate(
// var(--px)*var(--mul,16px), var(--py)*var(--mul,16px)); transition: transform
// .35s cubic-bezier(.22,.61,.36,1) }` commented "parallax chips (mouse-reactive)".
// Verified against production (2026-07-14): the JS driver was never shipped —
// setProperty("--px") count 0 in the bundle, `.lv-pchip` is unrendered, and no
// element on the live page responds to synthetic pointer moves. So this rebuilds
// the driver the scaffold implies and keeps his exact easing + transform shape.
//
// What changed from his scaffold, tuned for a daily-use workspace (not a hero):
//   • amplitude 16px → 6px (AMPLITUDE below) — a lean, not a lunge.
//   • added a proximity falloff (RADIUS) so only tiles near the cursor lean in,
//     instead of a uniform global parallax — calmer for a tool you stare at.
//   • direction is toward-cursor (a magnet / "comes to you"), per the brief.
// Kept: the .35s cubic-bezier(.22,.61,.36,1) ease and the translate formula.
// rAF-throttled and disabled under prefers-reduced-motion.

const AMPLITUDE = 6; // px — max lean toward the cursor (his hero used 16)
const RADIUS = 240; // px — beyond this a tile is at rest

export function useCursorMagnet() {
  const containerRef = useRef(null);
  const tilesRef = useRef([]); // filled via registerTile
  const registerTile = (i) => (el) => {
    tilesRef.current[i] = el;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return undefined;

    let raf = 0;
    let mx = 0;
    let my = 0;
    let active = false;

    const apply = () => {
      raf = 0;
      for (const el of tilesRef.current) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2);
        const dy = my - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const strength = active ? Math.max(0, 1 - dist / RADIUS) : 0;
        const k = (AMPLITUDE * strength) / dist;
        el.style.transform = `translate(${(dx * k).toFixed(2)}px, ${(dy * k).toFixed(2)}px)`;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      active = true;
      schedule();
    };
    const onLeave = () => {
      active = false;
      schedule();
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { containerRef, registerTile };
}

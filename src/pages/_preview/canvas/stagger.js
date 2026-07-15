// Shared staggered-reveal utility (idea #3). One CSS keyframe, applied per list
// item with an incremental animation-delay so items fade + rise into place.
//
// CSS-animation based (not rAF): plays reliably and is GPU-composited; honors
// prefers-reduced-motion by disabling the animation (content shows immediately).
// Usage: spread reveal(index) onto any list item — <div {...reveal(i)}>.

let injected = false;
function ensureKeyframes() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const style = document.createElement("style");
  style.id = "cx-stagger-keyframes";
  style.textContent = `
@keyframes cxReveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.cx-reveal { animation: cxReveal .5s cubic-bezier(.22,.61,.36,1) both; }
@keyframes cxSettle { 0% { transform: scale(1); } 45% { transform: scale(1.05); } 100% { transform: scale(1); } }
.cx-settle { animation: cxSettle .36s cubic-bezier(.34,1.56,.64,1); }
@media (prefers-reduced-motion: reduce) { .cx-reveal, .cx-settle { animation: none !important; opacity: 1 !important; transform: none !important; } }`;
  document.head.appendChild(style);
}

// Returns { className, style } to spread onto a list item. `index` drives the
// stagger; `step` is the per-item delay in ms (default 40).
export function reveal(index, step = 40) {
  ensureKeyframes();
  return {
    className: "cx-reveal",
    style: { animationDelay: `${index * step}ms` },
  };
}

// Merge helper for items that already carry a className.
export function revealWith(index, className = "", step = 40) {
  const r = reveal(index, step);
  return { className: `${className} ${r.className}`.trim(), style: r.style };
}

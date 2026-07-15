// Score-visual variant from the URL (?score=ring|gauge). Anything else → the
// existing plain count-up badge, kept for side-by-side comparison. Reduced-motion
// is handled at the card (always falls back to the badge). Read once per render;
// Eli flips the URL to compare.
export function scoreVariant() {
  if (typeof window === "undefined") return "badge";
  const v = new URLSearchParams(window.location.search).get("score");
  return v === "ring" || v === "gauge" ? v : "badge";
}

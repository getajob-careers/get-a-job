import React from "react";

// Shared meta-chip primitive (audit #4). One component for the small scannable
// meta tags (work type, experience range, posted date) so they stop being
// inlined and drifting per surface. Quiet inset-tag look on the xs radius; text
// one step stronger than the old tertiary (secondary) so it's actually
// scannable. Band/score badges (rounded-full, band-colored) are a different
// thing and intentionally NOT this primitive.
export default function CanvasChip({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rd-r-xs bg-rd-bg-soft text-rd-text-secondary rd-t-micro font-medium px-1.5 py-0.5 ${className}`}
    >
      {children}
    </span>
  );
}

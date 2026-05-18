import React from "react";

/**
 * 2x2 grid teaching tier semantics through the two axes that define them:
 *   Y (rows):  on your career path (top) vs off (bottom)
 *   X (cols):  qualified now (right) vs not yet (left)
 *
 * Quadrants:
 *   Top-right   — Tier 1 (qualified + on path)    → emphasized (emerald)
 *   Top-left    — Tier 3 (on path, not yet ready) → amber
 *   Bottom-right — Tier 2 (qualified but off path) → muted neutral
 *   Bottom-left  — empty (not surfaced in feed)    → light gray
 *
 * Shared across the onboarding tutorial (slide 1) and the Career Roadmap
 * "Why these tiers" tab — extracted here to keep both surfaces in sync if
 * the framing ever changes.
 */
export default function TierQuadrantGrid() {
  return (
    <div className="w-full max-w-xs flex items-stretch gap-2 mt-4">
      <div className="flex items-center justify-center">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#525252] whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
          On your career path ↑
        </div>
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-2 gap-1.5">
          {/* Top-left: Tier 3 — on path, not yet qualified */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-left">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Tier 3</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Your next role</p>
          </div>
          {/* Top-right: Tier 1 — qualified + on path (emphasized) */}
          <div className="bg-emerald-100 border-2 border-emerald-500 rounded-lg p-2.5 text-left">
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Tier 1</p>
            <p className="text-[11px] text-emerald-900 mt-0.5">Your sweet spot</p>
          </div>
          {/* Bottom-left: not surfaced */}
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-2.5 text-left flex items-center">
            <p className="text-[10px] text-[#A3A3A3] italic">Not shown in feed</p>
          </div>
          {/* Bottom-right: Tier 2 — qualified but off path */}
          <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-2.5 text-left">
            <p className="text-[10px] font-bold text-[#525252] uppercase tracking-wider">Tier 2</p>
            <p className="text-[11px] text-[#737373] mt-0.5">A detour</p>
          </div>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#525252] text-center mt-1.5">
          Qualified now →
        </p>
      </div>
    </div>
  );
}

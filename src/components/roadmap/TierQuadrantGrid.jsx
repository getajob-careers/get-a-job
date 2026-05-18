import React from "react";

/**
 * 2x2 grid teaching tier semantics through the two axes that define them:
 *   Y (rows):  on your career path (top) vs off (bottom)
 *   X (cols):  qualified now (right) vs not yet (left)
 *
 * Quadrants:
 *   Top-right    — Tier 1 (qualified + on path)    → emphasized (emerald)
 *   Top-left     — Tier 3 (on path, not yet ready) → amber
 *   Bottom-right — Tier 2 (qualified, off path)    → muted neutral
 *   Bottom-left  — empty (not surfaced in feed)    → light gray
 *
 * Shared across the onboarding tutorial (slide 1) and the Career Roadmap
 * "Why these tiers" tab — single source of truth for the visual.
 *
 * Layout notes (refined in PR-A after Yishai testing):
 * - Y-axis label hugs the left edge of the grid (no gap-2 visual disconnect)
 * - Bottom-left "Not shown" matches the visual style of the other quadrants
 *   (bold uppercase tier-name slot + body line) so it doesn't read as an
 *   empty cell / placeholder bug
 * - X-axis label sits on a thin border line under the grid → arrow has
 *   something to point along
 */
export default function TierQuadrantGrid() {
  return (
    <div className="w-full max-w-xs flex items-stretch gap-1 mt-4">
      {/* Y-axis label — hugs the grid's left edge */}
      <div className="flex items-center justify-center pr-0.5">
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
          {/* Bottom-left: not surfaced — styled to MATCH other quadrants */}
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-2.5 text-left">
            <p className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-wider">Not shown</p>
            <p className="text-[11px] text-[#A3A3A3] mt-0.5">Filtered out</p>
          </div>
          {/* Bottom-right: Tier 2 — qualified but off path */}
          <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-2.5 text-left">
            <p className="text-[10px] font-bold text-[#525252] uppercase tracking-wider">Tier 2</p>
            <p className="text-[11px] text-[#737373] mt-0.5">A detour</p>
          </div>
        </div>
        {/* X-axis label sits on a thin border so the arrow has a line to
            point along — visually anchors it to the grid above */}
        <div className="border-t border-[#E5E5E5] mt-1.5 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#525252] text-center">
            Qualified now →
          </p>
        </div>
      </div>
    </div>
  );
}

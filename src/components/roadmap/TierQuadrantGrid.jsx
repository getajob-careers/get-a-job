import React from "react";
import { TIER_CONFIG } from "@/lib/tierConfig";

/**
 * 2x2 grid teaching tier semantics through the two axes that define them:
 *   Y (rows):  on your career path (top) vs off (bottom)
 *   X (cols):  qualified now (right) vs not yet (left)
 *
 * Quadrants:
 *   Top-right    — Tier 1 (qualified + on path)         → emerald, emphasized
 *   Top-left     — Tier 3 (on path, not yet qualified)  → amber
 *   Bottom-right — Tier 2 (qualified but off path)      → gray
 *   Bottom-left  — empty (not surfaced in feed)         → dashed neutral
 *
 * Pulls labels from @/lib/tierConfig so this surface and the Roadmap header
 * and RoleCard pills all read from the same source.
 */
export default function TierQuadrantGrid() {
  const t1 = TIER_CONFIG.tier_1;
  const t2 = TIER_CONFIG.tier_2;
  const t3 = TIER_CONFIG.tier_3;
  return (
    <div className="rm-quadrant">
      <div className="rm-quadrant-yaxis">On your career path ↑</div>
      <div>
        <div className="rm-quadrant-grid">
          {/* Top-left — Tier 3 (on path, not yet qualified) */}
          <div className="rm-quadrant-cell" data-tier={t3.color}>
            <p className="rm-quadrant-tag">Tier 3</p>
            <p className="rm-quadrant-label">{t3.name}</p>
          </div>
          {/* Top-right — Tier 1 (qualified + on path) — emphasized */}
          <div className="rm-quadrant-cell" data-tier={t1.color}>
            <p className="rm-quadrant-tag">Tier 1</p>
            <p className="rm-quadrant-label">{t1.name}</p>
          </div>
          {/* Bottom-left — empty (not surfaced in feed) */}
          <div className="rm-quadrant-cell" data-tier="empty">
            <p className="rm-quadrant-label">Not shown in feed</p>
          </div>
          {/* Bottom-right — Tier 2 (qualified but off path) */}
          <div className="rm-quadrant-cell" data-tier={t2.color}>
            <p className="rm-quadrant-tag">Tier 2</p>
            <p className="rm-quadrant-label">{t2.name}</p>
          </div>
        </div>
        <p className="rm-quadrant-xaxis">Qualified now →</p>
      </div>
    </div>
  );
}

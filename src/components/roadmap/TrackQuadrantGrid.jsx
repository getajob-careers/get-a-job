import React from "react";
import { TRACK_CONFIG } from "@/lib/trackConfig";

/**
 * 2x2 grid teaching track semantics through the two axes that define them:
 *   Y (rows):  on your career path (top) vs off (bottom)
 *   X (cols):  qualified now (right) vs not yet (left)
 *
 * Quadrants:
 *   Top-right    — Track 1 (qualified + on path)         → emerald, emphasized
 *   Top-left     — Track 3 (on path, not yet qualified)  → amber
 *   Bottom-right — Track 2 (qualified but off path)      → gray
 *   Bottom-left  — empty (not surfaced in feed)         → dashed neutral
 *
 * Pulls labels from @/lib/trackConfig so this surface and the Roadmap header
 * and RoleCard pills all read from the same source.
 */
export default function TrackQuadrantGrid() {
  const t1 = TRACK_CONFIG.track_1;
  const t2 = TRACK_CONFIG.track_2;
  const t3 = TRACK_CONFIG.track_3;
  return (
    <div className="rm-quadrant">
      <div className="rm-quadrant-yaxis">On your career path ↑</div>
      <div>
        <div className="rm-quadrant-grid">
          {/* Top-left — Track 3 (on path, not yet qualified) */}
          <div className="rm-quadrant-cell" data-track={t3.color}>
            <p className="rm-quadrant-tag">Track 3</p>
            <p className="rm-quadrant-label">{t3.name}</p>
          </div>
          {/* Top-right — Track 1 (qualified + on path) — emphasized */}
          <div className="rm-quadrant-cell" data-track={t1.color}>
            <p className="rm-quadrant-tag">Track 1</p>
            <p className="rm-quadrant-label">{t1.name}</p>
          </div>
          {/* Bottom-left — empty (not surfaced in feed) */}
          <div className="rm-quadrant-cell" data-track="empty">
            <p className="rm-quadrant-label">Not shown in feed</p>
          </div>
          {/* Bottom-right — Track 2 (qualified but off path) */}
          <div className="rm-quadrant-cell" data-track={t2.color}>
            <p className="rm-quadrant-tag">Track 2</p>
            <p className="rm-quadrant-label">{t2.name}</p>
          </div>
        </div>
        <p className="rm-quadrant-xaxis">Qualified now →</p>
      </div>
    </div>
  );
}

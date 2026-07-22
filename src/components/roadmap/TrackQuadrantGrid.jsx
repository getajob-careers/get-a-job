import React from "react";
import { TRACK_CONFIG } from "@/lib/trackConfig";

/**
 * 2x2 grid teaching track semantics through the two axes that define them:
 *   Y (rows):  on your career path (top) vs off (bottom)
 *   X (cols):  qualified now (left) vs not yet (right)
 *
 * Quadrants (post 2026-06-04 reorder — read left-to-right Track 1 → 3):
 *   Top-left     — Track 1 (qualified + on path)         → coral, emphasized
 *   Top-right    — Track 3 (on path, not yet qualified)  → golden
 *   Bottom-left  — Track 2 (qualified but off path)      → teal
 *   Bottom-right — "Not relevant to your career path"    → neutral (off-path + not-qualified, not surfaced in feed)
 *
 * PR 3C — clickable cells per the mockup. `onTrackClick(trackId)` is
 * invoked when the user taps a populated cell so the Roadmap can jump to
 * the corresponding tab. The off-path cell stays inert (no track to land
 * on). Cell tints read from `TRACK_CONFIG[*].rdColor` so this surface and
 * the Roadmap header / RoleCard all read from the same source.
 *
 * `counts` (optional) — `{ track_1: N, track_2: N, track_3: N }`. When
 * present, each populated cell shows "N roles ›". Mockup style; per the
 * 3C brief, no per-track job counts (no extra RPC).
 */
export default function TrackQuadrantGrid({ onTrackClick, counts }) {
  const t1 = TRACK_CONFIG.track_1;
  const t2 = TRACK_CONFIG.track_2;
  const t3 = TRACK_CONFIG.track_3;

  return (
    <div className="flex items-stretch gap-2 w-full max-w-[540px]">
      {/* Y-axis label — vertically rotated, hugging the grid */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        <span
          className="text-[10.5px] tracking-[0.04em] text-rd-text-secondary whitespace-nowrap"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          moves you toward your goal ↑
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-2 gap-2.5">
          <QuadrantCell
            track={t1}
            count={counts?.track_1}
            onClick={onTrackClick ? () => onTrackClick("track_1") : undefined}
            emphasized
          />
          <QuadrantCell
            track={t3}
            count={counts?.track_3}
            onClick={onTrackClick ? () => onTrackClick("track_3") : undefined}
          />
          <QuadrantCell
            track={t2}
            count={counts?.track_2}
            onClick={onTrackClick ? () => onTrackClick("track_2") : undefined}
          />
          <OffPathCell />
        </div>
        <div className="flex justify-between mt-2 text-[10.5px] tracking-[0.04em] text-rd-text-secondary">
          <span>← qualified now</span>
          <span>not yet qualified</span>
        </div>
      </div>
    </div>
  );
}

// Per-quadrant cell. Tint palette mirrors the home mockup
// (`docs/design/redesign/getajob_roadmap_tracks_quadrant.html`). Each
// track's rdColor maps to a {bg, badgeBg, title, body, count} style set
// so the cells inherit the warm-palette identity from one place.
const CELL_STYLES = {
  coral: {
    bg:      "var(--rd-primary-tint)",
    badgeBg: "var(--rd-primary)",
    title:   "#A8381A",
    body:    "#A8381A",
    count:   "var(--rd-primary-dark)",
  },
  teal: {
    bg:      "var(--rd-teal-tint)",
    badgeBg: "var(--rd-teal)",
    title:   "#216456",
    body:    "#216456",
    count:   "var(--rd-teal-dark)",
  },
  golden: {
    bg:      "var(--rd-golden-tint)",
    badgeBg: "var(--rd-golden)",
    title:   "#7A5408",
    body:    "#8A6516",
    count:   "var(--rd-golden-dark)",
  },
};

function QuadrantCell({ track, count, onClick, emphasized = false }) {
  const styles = CELL_STYLES[track.rdColor] || CELL_STYLES.coral;
  const interactive = typeof onClick === "function";
  const Element = interactive ? "button" : "div";
  return (
    <Element
      type={interactive ? "button" : undefined}
      onClick={onClick}
      aria-label={interactive ? `Jump to Track ${track.number}` : undefined}
      className={[
        "rounded-[14px] px-3.5 py-3 min-h-[112px] flex flex-col text-left",
        "transition-[transform,box-shadow] duration-150",
        interactive ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-rd" : "",
        emphasized ? "ring-1 ring-rd-primary/20" : "",
      ].join(" ")}
      style={{ background: styles.bg }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: styles.badgeBg }}
        >
          <span className="font-display font-extrabold text-[13px] text-white leading-none">
            {track.number}
          </span>
        </span>
        <span
          className="font-display font-bold text-[14px] leading-none"
          style={{ color: styles.title }}
        >
          Track {track.number}
        </span>
      </div>
      <p
        className="text-[11.5px] leading-[1.45] mt-2"
        style={{ color: styles.body }}
      >
        {QUADRANT_BODY[track.id]}
      </p>
      <div className="flex-1" />
      {typeof count === "number" && count > 0 && (
        <p
          className="text-[10.5px] font-display font-semibold mt-1"
          style={{ color: styles.count }}
        >
          {count} role{count === 1 ? "" : "s"} ›
        </p>
      )}
    </Element>
  );
}

function OffPathCell() {
  return (
    <div
      className="rounded-[14px] px-3.5 py-3 min-h-[112px] flex flex-col text-left"
      style={{ background: "var(--rd-bg-soft)" }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#C9C1B4" }}
        >
          <span className="font-display font-bold text-[14px] text-white leading-none">−</span>
        </span>
        <span className="font-display font-bold text-[14px] leading-none text-rd-text-tertiary">
          Not relevant to your career path
        </span>
      </div>
      <p className="text-[11.5px] leading-[1.45] text-rd-text-secondary mt-2">
        Off your path and not qualified. We don&apos;t surface these.
      </p>
    </div>
  );
}

// Short quadrant-cell copy. NOT the full TRACK_CONFIG.description — those
// are richer prose suited to the description list. The quadrant cell only
// has space for a one-liner that anchors the axes-meaning.
const QUADRANT_BODY = {
  track_1: "On your path and qualified now. The sweet spot - apply to these.",
  track_2: "Qualified now, but off your path. A doable detour - won't take you there.",
  track_3: "On your path, not yet qualified. Your goal roles - grow into them.",
};

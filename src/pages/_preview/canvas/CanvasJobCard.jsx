// PROD ORIGINAL: src/components/jobs/JobGridCard.jsx (canvas card; drops the
// hover-peek portal — wave-2 replaces hover with an action row — and owns the
// score badge so the count-up (idea #2) can be its own readable beat).
import React from "react";
import { deriveJobDisplay } from "@/lib/jobCardDisplay";
import { useCountUp } from "./useCountUp";
import AgencyBadge from "@/components/jobs/AgencyBadge";
import CanvasCardActions from "./CanvasCardActions";
import CanvasScoreRing from "./CanvasScoreRing";

// Count-up refinement (wave-1 fix): only the top few cards count (one clear beat
// beats ten invisible ones), the ramp starts AFTER the card's entrance reveal so
// it isn't masked by the fade, and the badge scales while ramping + settles on
// land. `index` is the card's position in its list.
const COUNTUP_TOP_N = 3;
const REVEAL_MS = 520; // matches the stagger reveal (.5s) + a small buffer
const STAGGER_MS = 40;

export default function CanvasJobCard({ job, scoreResult, onOpen, index = 0 }) {
  const d = deriveJobDisplay(job, scoreResult, { showAttainabilityBand: true });
  const countable =
    index < COUNTUP_TOP_N &&
    d.scored &&
    scoreResult?.attainability_score != null;
  const { value: attain, done } = useCountUp(
    scoreResult?.attainability_score ?? 0,
    {
      duration: 800,
      delay: index * STAGGER_MS + REVEAL_MS,
      enabled: countable,
    },
  );
  const attainPct = Math.round(attain * 100);

  // Wave 2.5: ?score=ring|gauge swaps the badge for a circular visual; reduced
  // motion always falls back to the plain badge; otherwise the ring is default.
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const variant = reduce ? "badge" : "ring";

  const open = () => onOpen?.(job, scoreResult);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="cx-card group cursor-pointer h-full flex flex-col bg-rd-bg-card border border-rd-border rd-r-md p-3 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-rd-border-hover hover:shadow-rd focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2"
    >
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span
          className="flex-shrink-0 inline-flex items-center justify-center w-[34px] h-[34px] rd-r-sm font-display font-bold rd-t-body-m bg-rd-bg-soft text-rd-text-secondary"
          aria-hidden="true"
        >
          {job.company_name?.[0] || "?"}
        </span>
        {d.scored && d.bandMeta && variant === "ring" && (
          <CanvasScoreRing scoreResult={scoreResult} bandMeta={d.bandMeta} />
        )}
        {d.scored && d.bandMeta && variant === "badge" && (
          <span
            className="flex-shrink-0 inline-flex items-baseline gap-1 font-display rounded-full px-2 py-0.5"
            style={{
              background: d.bandMeta.bg,
              color: d.bandMeta.fg,
              transform: done ? "scale(1)" : "scale(1.1)",
              transformOrigin: "right center",
              transition: "transform .3s cubic-bezier(.22,.61,.36,1)",
            }}
          >
            <span className="font-extrabold rd-t-micro">
              {d.bandMeta.label}
            </span>
            <span className="font-semibold rd-t-micro opacity-70">
              {attainPct}%
            </span>
          </span>
        )}
      </div>

      <h3 className="font-display font-bold rd-t-body-m leading-[1.18] text-rd-text line-clamp-2 break-words">
        {job.title}
      </h3>
      <p className="rd-t-micro text-rd-text-secondary mt-0.5 truncate">
        {[job.company_name, job.location_city || job.location_raw]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {job.is_agency && (
        <div className="mt-1">
          <AgencyBadge isAgency />
        </div>
      )}

      {d.chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {d.chips.map((c, i) => (
            <span
              key={i}
              className="rd-t-micro bg-rd-bg-soft text-rd-text-tertiary rd-r-xs px-1.5 py-0.5"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Actions live on approach now (idea #1) — skills moved to the detail
          modal to keep the card compact. */}
      <div className="mt-auto pt-1">
        <CanvasCardActions job={job} />
      </div>
    </div>
  );
}

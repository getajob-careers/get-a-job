// PROD ORIGINAL: src/components/jobs/JobGridCard.jsx (canvas card). Round-3 step
// 3: paper-lift elevation (step-2 language) + generous padding + real title/meta
// hierarchy from the type scale + the single-arc score ring. A restrained warm
// Spotlight cursor-glow follows the pointer — JOB-CARDS-ONLY per the scoping
// ruling in docs/design/canvas-tokens.md (nowhere else gets the glow). Hover
// actions slide in WITH the lift as one gesture (see CanvasCardActions).
import React from "react";
import { deriveJobDisplay } from "@/lib/jobCardDisplay";
import AgencyBadge from "@/components/jobs/AgencyBadge";
import CanvasCardActions from "./CanvasCardActions";
import CanvasChip from "./CanvasChip";
import CanvasScoreRing from "./CanvasScoreRing";

// Spotlight glow — injected once, scoped to .cx-card (job cards). A soft warm
// radial (Clay terracotta at low alpha) that tracks the cursor and fades in on
// hover. The glow layer clips to its own border-radius, so no overflow-hidden is
// needed on the card (which would clip the score-ring legend). Disabled under
// reduced motion.
let spotInjected = false;
function ensureSpotCss() {
  if (spotInjected || typeof document === "undefined") return;
  spotInjected = true;
  const s = document.createElement("style");
  s.id = "cx-jobcard-spot-css";
  s.textContent = `
.cx-spot { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .2s ease; background: radial-gradient(220px circle at var(--sx,50%) var(--sy,50%), rgba(166,85,46,0.10), transparent 62%); }
@media (hover:hover) and (pointer:fine){ .cx-card:hover .cx-spot { opacity:1; } }
@media (prefers-reduced-motion:reduce){ .cx-spot { display:none; } }`;
  document.head.appendChild(s);
}

export default function CanvasJobCard({ job, scoreResult, onOpen }) {
  ensureSpotCss();
  const d = deriveJobDisplay(job, scoreResult, { showAttainabilityBand: true });
  const open = () => onOpen?.(job, scoreResult);
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--sx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--sy", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onMouseMove={onMove}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="cx-card group relative cursor-pointer h-full flex flex-col rd-lift rd-lift-hover rd-r-md p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2"
    >
      <span className="cx-spot rd-r-md" aria-hidden="true" />

      <div className="relative flex items-start justify-between gap-2 mb-3">
        <span
          className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rd-r-sm font-display font-bold rd-t-display-s bg-rd-bg-soft text-rd-text-secondary"
          aria-hidden="true"
        >
          {job.company_name?.[0] || "?"}
        </span>
        {d.scored && d.bandMeta && (
          <CanvasScoreRing scoreResult={scoreResult} bandMeta={d.bandMeta} />
        )}
      </div>

      <h3 className="relative font-display font-bold rd-t-display-s text-rd-text line-clamp-2 break-words">
        {job.title}
      </h3>
      <p className="relative rd-t-micro text-rd-text-secondary mt-1 truncate">
        {[job.company_name, job.location_city || job.location_raw]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {job.is_agency && (
        <div className="relative mt-1.5">
          <AgencyBadge isAgency />
        </div>
      )}

      {d.chips.length > 0 && (
        <div className="relative flex flex-wrap gap-1 mt-2.5">
          {d.chips.map((c, i) => (
            <CanvasChip key={i}>{c}</CanvasChip>
          ))}
        </div>
      )}

      {/* Actions live on approach — they slide in with the lift. */}
      <div className="relative mt-auto pt-2.5">
        <CanvasCardActions job={job} />
      </div>
    </div>
  );
}

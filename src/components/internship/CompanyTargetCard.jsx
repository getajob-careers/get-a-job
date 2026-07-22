import React from "react";
import {
  bandForLlmScore,
  BAND_LABELS_SHORT,
} from "./browse/scoreHelpers";

// Single kanban card. Click anywhere opens CompanyTargetDrawer.
//
// PR5 collapsed the kanban UI to a single High/Med/Low band derived
// from the (then) combined fit + career_compound average. PR6 collapsed
// the underlying data model to a single match_score, so the card now
// reads target.match_score directly. No raw numbers shown anywhere.
// Pitched role chip stays — it's real per-company signal from the LLM.

const SOURCE_LABELS = {
  matched: "Matched",
  faculty_assigned: "Faculty",
  self_added: "Added by you",
};
const SOURCE_TONE = {
  matched:          "info",
  faculty_assigned: "warning",
  self_added:       "gray",
};

const BAND_TEXT_COLOR = {
  high: "text-rd-teal-dark",
  med:  "text-rd-golden-dark",
  low:  "text-rd-primary-dark",
  none: "text-rd-text-tertiary",
};

const SOURCE_BADGE_CLS = {
  info:    "bg-rd-teal-tint text-rd-teal-dark",
  warning: "bg-rd-golden-tint text-rd-golden-dark",
  gray:    "bg-rd-bg-soft text-rd-text-secondary",
};

export default function CompanyTargetCard({ target, onClick }) {
  const company = target.companies || {};
  const score = target.match_score;
  const band = bandForLlmScore(score);
  const showBand = target.source === "matched" && score != null;
  const sourceTone = SOURCE_TONE[target.source] || "gray";

  // role="button" on a div (not a native <button>) so @hello-pangea/dnd's
  // interactive-element-blocking guard doesn't refuse to start the drag.
  // Native <button> children of a Draggable swallow pointer-down before
  // the DnD lib registers the drag intent; div + role="button" keeps the
  // a11y semantics + click semantics while leaving DnD free to take over.
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="w-full text-left p-3.5 bg-rd-bg-card border border-rd-border rounded-[14px] cursor-pointer transition-colors hover:border-rd-border-hover hover:shadow-rd mb-2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-display font-bold text-rd-text leading-tight line-clamp-2">{company.name || "Unnamed company"}</p>
        {target.source && SOURCE_LABELS[target.source] && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-medium tracking-[0.04em] uppercase ${SOURCE_BADGE_CLS[sourceTone] || SOURCE_BADGE_CLS.gray}`}>
            {SOURCE_LABELS[target.source]}
          </span>
        )}
      </div>

      {company.sector && (
        <p className="text-[11.5px] text-rd-text-tertiary mt-1">
          {company.sector}{company.stage ? ` · ${company.stage}` : ""}
        </p>
      )}

      {showBand && (
        <div className="flex gap-3 mt-2 text-[11.5px]">
          <div>
            <span className="text-rd-text-tertiary">Match </span>
            <span className={`font-display font-bold ${BAND_TEXT_COLOR[band]}`}>
              {BAND_LABELS_SHORT[band]}
            </span>
          </div>
        </div>
      )}

      {target.pitched_role && (
        <p className="text-[11.5px] text-rd-text-secondary mt-2 italic line-clamp-2">{target.pitched_role}</p>
      )}
    </div>
  );
}

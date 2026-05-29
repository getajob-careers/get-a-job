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
  high: "text-[#1D7556]",
  med:  "text-[#6B4E0F]",
  low:  "text-[#C84F40]",
  none: "text-[#9C9DA1]",
};

export default function CompanyTargetCard({ target, onClick }) {
  const company = target.companies || {};
  const score = target.match_score;
  const band = bandForLlmScore(score);
  const showBand = target.source === "matched" && score != null;
  const sourceTone = SOURCE_TONE[target.source] || "gray";

  return (
    <button
      type="button"
      onClick={onClick}
      className="act-target-card mb-2"
    >
      <div className="act-target-card-row">
        <p className="act-target-card-title line-clamp-2">{company.name || "Unnamed company"}</p>
        {target.source && SOURCE_LABELS[target.source] && (
          <span className={`act-status-badge act-status-${sourceTone}`}>
            {SOURCE_LABELS[target.source]}
          </span>
        )}
      </div>

      {company.sector && (
        <p className="act-target-card-sub">
          {company.sector}{company.stage ? ` · ${company.stage}` : ""}
        </p>
      )}

      {showBand && (
        <div className="act-target-card-scores">
          <div>
            <span className="text-[#9C9DA1]">Match </span>
            <span className={`font-medium ${BAND_TEXT_COLOR[band]}`}>
              {BAND_LABELS_SHORT[band]}
            </span>
          </div>
        </div>
      )}

      {target.pitched_role && (
        <p className="act-target-card-pitch line-clamp-2">{target.pitched_role}</p>
      )}
    </button>
  );
}

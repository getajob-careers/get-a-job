import React from "react";
import { scoreBand } from "./constants";

// Single kanban card — compact: company name + source badge + dual
// scores. Click anywhere on the card opens the drawer for full detail.

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

export default function CompanyTargetCard({ target, onClick }) {
  const company = target.companies || {};
  const fit = scoreBand(target.fit_score);
  const compound = scoreBand(target.career_compound_score);
  const showScores = target.source === "matched" && target.fit_score != null;
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

      {showScores && (
        <div className="act-target-card-scores">
          <div>
            <span className="text-[#9C9DA1]">Fit </span>
            <span className={`font-medium ${fit.color}`}>{Math.round(target.fit_score)}</span>
          </div>
          <div>
            <span className="text-[#9C9DA1]">Compound </span>
            <span className={`font-medium ${compound.color}`}>{Math.round(target.career_compound_score)}</span>
          </div>
        </div>
      )}

      {target.pitched_role && (
        <p className="act-target-card-pitch line-clamp-2">{target.pitched_role}</p>
      )}
    </button>
  );
}

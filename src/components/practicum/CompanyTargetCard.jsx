import React from "react";
import { STATUS_ACCENTS, scoreBand } from "./constants";

// Single kanban card — compact: company name + source badge + dual
// scores. Click anywhere on the card opens the drawer for full detail.

const SOURCE_LABELS = {
  matched: "Matched",
  faculty_assigned: "Faculty",
  self_added: "Added by you",
};

export default function CompanyTargetCard({ target, onClick }) {
  const company = target.companies || {};
  const fit = scoreBand(target.fit_score);
  const compound = scoreBand(target.career_compound_score);
  const showScores = target.source === "matched" && target.fit_score != null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border border-[#E5E5E5] hover:border-[#0A0A0A] hover:shadow-sm transition-all p-3 mb-2"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold text-[#0A0A0A] line-clamp-2 leading-snug">{company.name || "Unnamed company"}</p>
        {target.source && SOURCE_LABELS[target.source] && (
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-medium rounded ${STATUS_ACCENTS[target.status] || "text-[#525252] bg-[#F5F5F5]"}`}>
            {SOURCE_LABELS[target.source]}
          </span>
        )}
      </div>

      {company.sector && (
        <p className="text-[11px] text-[#A3A3A3] mb-2">{company.sector}{company.stage ? ` · ${company.stage}` : ""}</p>
      )}

      {showScores && (
        <div className="flex items-center gap-3 text-[11px]">
          <div>
            <span className="text-[#A3A3A3]">Fit </span>
            <span className={`font-medium ${fit.color}`}>{Math.round(target.fit_score)}</span>
          </div>
          <div>
            <span className="text-[#A3A3A3]">Compound </span>
            <span className={`font-medium ${compound.color}`}>{Math.round(target.career_compound_score)}</span>
          </div>
        </div>
      )}

      {target.pitched_role && (
        <p className="text-[11px] text-[#525252] mt-2 line-clamp-2 italic">{target.pitched_role}</p>
      )}
    </button>
  );
}

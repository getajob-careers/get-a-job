import React from "react";
import { ORIGIN_FILTERS } from "./filterConfig";
import { scoreTier } from "@/lib/internshipRuleScore";

// Display-only browse card (PR2). Click is a no-op — the detail drawer
// arrives in PR3. Degrades cleanly on the 428 source='registry' rows
// that have NULL description/stage/size/sector: show only what exists,
// no placeholder text except for description.
//
// Score chip styling per spec D5: ≥70 coral solid, 40-69 warm-slate
// outline, <40 muted, null='—' dashed outline (no internship_profile).
// Suggested role chip is the student's own target (consistent across
// all cards on the page — pitch arrives in PR3).

const ORIGIN_LABEL_BY_ID = new Map(ORIGIN_FILTERS.map((o) => [o.id, o.label]));

function formatLocation(city, country) {
  if (city && country) return `${city}, ${country}`;
  return city || country || null;
}

function ScoreChip({ score }) {
  const tier = scoreTier(score);
  if (tier === "none") {
    return (
      <span className="brz-score brz-score-none" aria-label="No fit score (generate your pitch profile)">
        <span className="brz-score-label">Fit</span>
        —
      </span>
    );
  }
  const cls = tier === "strong" ? "brz-score brz-score-strong"
            : tier === "soft"   ? "brz-score brz-score-soft"
                                : "brz-score brz-score-weak";
  return (
    <span className={cls} aria-label={`Fit score ${Math.round(score)} of 100`}>
      <span className="brz-score-label">Fit</span>
      {Math.round(score)}
    </span>
  );
}

export default function CompanyBrowseCard({ company, score, suggestedRole }) {
  const originLabel = ORIGIN_LABEL_BY_ID.get(company.origin);
  const hasLiveJobs = company.verified === true && company.ats && company.ats !== "unknown";
  const sectorOrIndustry = company.sector || company.industry;
  const location = formatLocation(company.hq_city, company.hq_country);

  return (
    <article className="brz-card">
      <div className="brz-card-eyebrow">
        {originLabel && <span className="brz-card-origin">{originLabel}</span>}
        {hasLiveJobs && <span className="brz-card-live" aria-label="Has live job postings">Live jobs</span>}
      </div>
      <h3 className="brz-card-name">{company.name}</h3>
      <p className="brz-card-meta">
        {sectorOrIndustry && <span>{sectorOrIndustry}</span>}
        {company.employee_count_range && <span>{company.employee_count_range}</span>}
        {location && <span>{location}</span>}
      </p>
      {company.description ? (
        <p className="brz-card-desc">{company.description}</p>
      ) : (
        <p className="brz-card-desc brz-card-desc-empty">Profile details coming soon.</p>
      )}
      <div className="brz-card-footer">
        <ScoreChip score={score} />
        {suggestedRole && (
          <span className="brz-role" title={`Suggested role: ${suggestedRole}`}>
            {suggestedRole}
          </span>
        )}
      </div>
    </article>
  );
}

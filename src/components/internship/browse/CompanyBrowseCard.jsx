import React from "react";
import { ORIGIN_FILTERS } from "./filterConfig";
import { bandForRuleScore, BAND_LABELS_SHORT } from "./scoreHelpers";

// Browse card. Click opens CompanyDetailDrawer. Card is a <button> for
// accessibility; onClick goes up to the Panel which owns drawer state.
// Degrades cleanly on rows with NULL fields.
//
// PR5: chip shows a High/Med/Low BAND (no number). Score still
// computed internally for sorting; just not displayed. Role chip
// dropped — it was target_job_titles[0], identical on every card and
// added no per-company signal.

const ORIGIN_LABEL_BY_ID = new Map(ORIGIN_FILTERS.map((o) => [o.id, o.label]));

function formatLocation(city, country) {
  if (city && country) return `${city}, ${country}`;
  return city || country || null;
}

function ScoreChip({ score }) {
  const band = bandForRuleScore(score);
  const label = BAND_LABELS_SHORT[band];
  const cls =
    band === "high" ? "brz-score brz-score-strong" :
    band === "med"  ? "brz-score brz-score-soft" :
    band === "low"  ? "brz-score brz-score-weak" :
                      "brz-score brz-score-none";
  const aria =
    band === "none"
      ? "No match band (generate your pitch profile)"
      : `Match band: ${label}`;
  return (
    <span className={cls} aria-label={aria}>
      <span className="brz-score-label">Match</span>
      {label}
    </span>
  );
}

export default function CompanyBrowseCard({ company, score, onClick }) {
  const originLabel = ORIGIN_LABEL_BY_ID.get(company.origin);
  const hasLiveJobs = company.verified === true && company.ats && company.ats !== "unknown";
  const sectorOrIndustry = company.sector || company.industry;
  const location = formatLocation(company.hq_city, company.hq_country);

  return (
    <button
      type="button"
      onClick={() => onClick?.(company)}
      className="brz-card brz-card-clickable"
      aria-label={`Open ${company.name} details`}
    >
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
      </div>
    </button>
  );
}

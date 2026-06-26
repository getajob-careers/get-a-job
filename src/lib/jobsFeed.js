// Shared constants + helpers for the jobs feed, used by BOTH the legacy
// track-tab path (Jobs.jsx) and <UnifiedJobsFeed>. Extracted in PR1 so the
// two paths can't drift on the column projection, the page size, or the
// seniority logic. Pure — no React, no network.

// Page size for the title-union RPC fetch + the legacy track/keyword fetches.
export const BROWSE_PAGE_SIZE = 40;

// Per-track title cap (legacy track mode).
export const MAX_TRACK_ROLES = 8;

// Unified mode unions titles across all 3 tracks; cap at 3× the per-track cap.
export const UNIFIED_MAX_ROLES = MAX_TRACK_ROLES * 3;

// pg_trgm similarity threshold for the role-title search.
export const TRACK_SIMILARITY_THRESHOLD = 0.3;

// jobs.seniority values, in rank order.
export const ALL_SENIORITIES = [
  "entry",
  "mid",
  "senior",
  "lead",
  "director",
  "executive",
];

// The column projection every jobs fetch selects (track/keyword/unified).
// Kept in one place so the projections can't diverge.
export const JOBS_SELECT =
  "id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, description, industry, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, function_family, extraction_confidence, skill_coverage_ratio";

// Light projection — everything the grid card + scoreJobFit need, but WITHOUT
// the heavy `description` blob (fetched on demand by the detail modal, warmed
// by the card's hover-prefetch). Mirrors JOBS_SELECT minus `description`.
export const JOBS_SELECT_LIGHT =
  "id, ats_source, external_id, title, company_name, company_slug, location_city, location_raw, is_remote, seniority, years_experience_min, years_experience_max, date_posted, apply_url, industry, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, function_family, extraction_confidence, skill_coverage_ratio";

// Legacy track-mode seniority: track_3 bypasses to ALL (it's the growth
// track — roles the user isn't qualified for yet).
export function seniorityFilterFor(mode, track, allowedSeniorities) {
  if (mode === "track" && track === "track_3") return ALL_SENIORITIES;
  return allowedSeniorities;
}

// Unified-mode seniority: the user's level-default list PLUS one step up —
// surfaces stretch roles without showing VPs to early_career users.
export function stretchAwareSeniorityFor(allowedSeniorities) {
  if (!allowedSeniorities || allowedSeniorities.length === 0)
    return ALL_SENIORITIES;
  const highest = allowedSeniorities[allowedSeniorities.length - 1];
  const idx = ALL_SENIORITIES.indexOf(highest);
  if (idx === -1 || idx === ALL_SENIORITIES.length - 1)
    return allowedSeniorities;
  return [...allowedSeniorities, ALL_SENIORITIES[idx + 1]];
}

// Human-readable label for the seniority chip.
export function levelLabel(level) {
  if (level === "early_career") return "entry / mid";
  if (level === "mid_career") return "mid / senior";
  if (level === "senior_career") return "senior+";
  return "all levels";
}

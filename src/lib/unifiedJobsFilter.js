// Pure builders for the unified Jobs feed's user filters (seniority +
// work-type). Extracted from Jobs.jsx so the fetch-key + param-mapping
// contracts are unit-testable without rendering the page — mirrors
// careerJobsQuery.js.
//
// Both filters are SUPPLY-SIDE: they feed search_jobs_by_role_titles params
// and re-query, so a tight filter re-fetches ~40 rows UNDER the constraint
// instead of narrowing the already-gated page client-side (which would
// collapse the feed and break "Load more"). The fetch key below goes in the
// fetch effect's deps so a filter change re-fetches and resets offset to 0.

import { dedupeJobsById } from "./careerJobsQuery";

export { dedupeJobsById };

// Work-type toggle has exactly two honest states. The corpus carries only an
// is_remote boolean (no hybrid signal), and the RPC's p_work_types can only
// EXCLUDE remote jobs (on-site-only) — it can never exclude on-site jobs. So:
//   remote_ok    → p_work_types = null         (admit everything, incl remote)
//   onsite_only  → p_work_types = ["On-site"]  (RPC drops is_remote = TRUE)
export const WORK_TYPE_REMOTE_OK = "remote_ok";
export const WORK_TYPE_ONSITE_ONLY = "onsite_only";

const REMOTE_ADMITTING = new Set(["Remote", "Hybrid", "Flexible"]);

// Default toggle state from profile.work_type, chosen so the default
// reproduces today's feed: today the unified feed passes profile.work_type
// verbatim, and any remote-admitting token makes the RPC admit all jobs
// (≡ remote_ok). An on-site-only profile excludes remote (≡ onsite_only).
export function defaultWorkTypeMode(profileWorkType) {
  const wt = Array.isArray(profileWorkType) ? profileWorkType : [];
  const admitsRemote =
    wt.length === 0 || wt.some((w) => REMOTE_ADMITTING.has(w));
  return admitsRemote ? WORK_TYPE_REMOTE_OK : WORK_TYPE_ONSITE_ONLY;
}

export function workTypeModeToParam(mode) {
  return mode === WORK_TYPE_ONSITE_ONLY ? ["On-site"] : null;
}

// Effective seniority param: the user's selection, or the default
// stretch-aware set when nothing is selected — never let an all-off state
// blank the feed.
export function effectiveSeniorities(selected, defaults) {
  const sel = Array.isArray(selected) ? selected.filter(Boolean) : [];
  if (sel.length > 0) return sel;
  return Array.isArray(defaults) ? defaults : [];
}

export function toggleSeniority(current, value) {
  const base = Array.isArray(current) ? current : [];
  return base.includes(value)
    ? base.filter((v) => v !== value)
    : [...base, value];
}

// Fetch key — every value the unified fetch passes to the RPC. Goes in the
// fetch effect's deps so a filter change re-fetches (and the effect resets
// offset to 0). Mirrors careerJobsQueryKey; seniorities sorted so order-only
// noise doesn't bust it.
export function unifiedFeedKey({ userId, titles, seniorities, workTypeMode }) {
  return [
    "unified_jobs",
    userId || null,
    (Array.isArray(titles) ? titles : []).join("|"),
    (Array.isArray(seniorities) ? [...seniorities].sort() : []).join(","),
    workTypeMode || "",
  ];
}

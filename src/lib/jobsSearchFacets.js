// Pure builders for the Tab-2 "Search All Jobs" client-side faceting (PR B).
//
// Tab 2 fetches the whole active-IL corpus ONCE (light projection, no
// description), scores every job ONCE against the profile, then applies facets
// as CLIENT-SIDE filters over the cached scored array and re-sorts by fit —
// no re-fetch and no re-score on facet change. These pure helpers make the
// facet→predicate mappers, the facets key, and the rank reducer unit-testable
// without rendering. Mirrors careerJobsQuery.js / unifiedJobsFilter.js.
//
// Facet state shape (PR B wires seniority + work-type + track; family +
// location land in PR C):
//   { seniorities: string[]|null, workTypeMode: string|null, track: string|null }

import { dedupeJobsById } from "./careerJobsQuery";

export { dedupeJobsById };

// ── per-facet predicates ───────────────────────────────────────────────
// Seniority: empty/null = no filter (whole corpus). Otherwise job.seniority
// must be one of the selected values.
export function matchesSeniority(job, seniorities) {
  if (!Array.isArray(seniorities) || seniorities.length === 0) return true;
  return seniorities.includes(job?.seniority);
}

// Work-type: reuse #332 semantics as a client predicate. "onsite_only" drops
// remote jobs; "remote_ok" / null admit everything (including remote). The
// corpus has only an is_remote boolean (no hybrid signal), so these are the
// only two honest states.
export function matchesWorkType(job, workTypeMode) {
  if (workTypeMode === "onsite_only") return job?.is_remote !== true;
  return true;
}

// Track: scoreJobFit.track for THIS job against the profile (same value as the
// Tab-1 card stripe). null = no filter. Selecting a track scopes to
// roadmap-aligned jobs; an off-roadmap job whose computed track is null drops
// under a track selection (intended).
export function matchesTrack(score, track) {
  if (!track) return true;
  return score?.track === track;
}

// searchFacetsKey — a stable string that BUSTS when any facet changes (drives
// the ranked-memo recompute). AND-composition is implicit: every active facet
// must pass in the reducer below.
export function searchFacetsKey(facets) {
  const f = facets || {};
  return [
    "search_facets",
    (Array.isArray(f.seniorities) ? [...f.seniorities].sort() : []).join(","),
    f.workTypeMode || "",
    f.track || "",
  ].join("|");
}

// The reducer: filter the scored corpus by ALL active facets (AND), then sort
// best-fit-first by fit_score. fit_score is FAMILY-INCLUSIVE, so off-domain
// jobs sink in the no-facet view (the "best-fit-first, off-domain sinks"
// behavior we want) — attainability_score would float off-domain-but-gettable
// jobs to the top before any facet is applied. The card BADGE stays
// attainability (gettability); within a Function facet, family is constant so
// fit_score effectively ranks by gettability anyway. Input: scored =
// [{ job, score }]. Output: same shape, filtered + sorted. Pure — no re-score.
export function applyFacetsAndRank(scored, facets) {
  const f = facets || {};
  const filtered = (Array.isArray(scored) ? scored : []).filter(
    ({ job, score }) =>
      matchesSeniority(job, f.seniorities) &&
      matchesWorkType(job, f.workTypeMode) &&
      matchesTrack(score, f.track),
  );
  return filtered.sort(
    (a, b) => (b.score?.fit_score ?? 0) - (a.score?.fit_score ?? 0),
  );
}

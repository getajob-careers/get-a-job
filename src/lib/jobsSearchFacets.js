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

// Work-type: multi-select chips ["onsite", "remote"] (same idiom as
// seniority). "onsite" = is_remote false, "remote" = is_remote true.
// Both-or-neither selected = no filter (all jobs). No Hybrid: the corpus has
// only an is_remote boolean — no hybrid signal.
export function matchesWorkType(job, workTypes) {
  const wt = Array.isArray(workTypes) ? workTypes : [];
  const onsite = wt.includes("onsite");
  const remote = wt.includes("remote");
  if (onsite === remote) return true; // both or neither → all
  if (remote) return job?.is_remote === true;
  return job?.is_remote === false;
}

// Keyword: match-as-you-type over the cached corpus on title + company only
// (description is lazy-loaded, out of scope). Empty = no filter.
export function matchesKeyword(job, keyword) {
  const q = (keyword || "").trim().toLowerCase();
  if (!q) return true;
  const hay = `${job?.title || ""} ${job?.company_name || ""}`.toLowerCase();
  return hay.includes(q);
}

// Track: scoreJobFit.track for THIS job against the profile (same value as the
// Tab-1 card stripe). null = no filter. Selecting a track scopes to
// roadmap-aligned jobs; an off-roadmap job whose computed track is null drops
// under a track selection (intended).
export function matchesTrack(score, track) {
  if (!track) return true;
  return score?.track === track;
}

// Function/family (PR C): single-select over the existing function_family
// taxonomy. null = no filter; otherwise exact match. Null-family jobs drop
// under a selection (intended — the user picked a function).
export function matchesFamily(job, family) {
  if (!family) return true;
  return job?.function_family === family;
}

// Location regions (PR C). City values grouped into the regions the corrected
// whole-corpus counts supported. A region selection admits ONLY jobs whose
// location_city is in the group — NULL / unmapped location drops (the locked
// exclude decision: an unknown location can't satisfy "in this region";
// remote-seekers use the work-type facet). City strings must match the live
// jobs.location_city values exactly (apostrophes / casing included).
export const LOCATION_REGIONS = {
  tlv_center: {
    label: "Tel Aviv & Center",
    cities: [
      "Tel Aviv",
      "Tel Aviv District",
      "Central District",
      "Petah Tikva",
      "Herzliya",
      "Ramat Gan",
      "Rehovot",
      "Or Yehuda",
      "Yavne",
      "Bnei Brak",
      "Holon",
      "Givatayim",
      "Ramla",
      "Rishon LeZion",
      "Bat Yam",
      "Modi'in",
    ],
  },
  sharon: {
    label: "Sharon",
    cities: ["Ra'anana", "Kfar Saba", "Netanya", "Hod Hasharon", "Caesarea"],
  },
  haifa_north: {
    label: "Haifa & North",
    cities: ["Yokneam", "Haifa", "Northern District", "Nazareth"],
  },
  jerusalem: { label: "Jerusalem", cities: ["Jerusalem"] },
  south: {
    label: "South",
    cities: ["Southern District", "Be'er Sheva", "Ashdod", "Eilat", "Ashkelon"],
  },
};

// District-fallback tags — the ATS sometimes tags a job with an admin
// district instead of a city. They stay INSIDE the region buckets above, but
// are excluded from the selectable city list (not cities; confusing next to
// real ones).
export const LOCATION_DISTRICT_TAGS = new Set([
  "Tel Aviv District",
  "Central District",
  "Northern District",
  "Southern District",
]);

// matchesLocation accepts EITHER a region key (city-list membership) OR a raw
// city string (exact match). null/"" = no filter. NULL/unmapped job location
// drops under any selection (it can't satisfy "in this place").
export function matchesLocation(job, key) {
  if (!key) return true;
  const region = LOCATION_REGIONS[key];
  if (region) return region.cities.includes(job?.location_city);
  return job?.location_city === key; // standalone city
}

// Build the location-picker options from the ALREADY-CACHED corpus (no extra
// query): every real city (district tags + nulls excluded) with its live
// count, plus the region groups with their summed counts. Pure + testable.
export function buildLocationOptions(corpus) {
  // Count ALL location_city values (district tags included) so region sums are
  // accurate — the region filter admits district-tagged jobs.
  const counts = new Map();
  for (const j of Array.isArray(corpus) ? corpus : []) {
    const c = j?.location_city;
    if (!c) continue;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  // City options exclude the district tags (kept in regions, not offered solo).
  const cities = [...counts.entries()]
    .filter(([city]) => !LOCATION_DISTRICT_TAGS.has(city))
    .map(([city, count]) => ({ key: city, label: city, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const regions = Object.entries(LOCATION_REGIONS).map(([key, r]) => ({
    key,
    label: r.label,
    count: r.cities.reduce((sum, c) => sum + (counts.get(c) || 0), 0),
  }));
  return { cities, regions };
}

// searchFacetsKey — a stable string that BUSTS when any facet changes (drives
// the ranked-memo recompute). AND-composition is implicit: every active facet
// must pass in the reducer below.
export function searchFacetsKey(facets) {
  const f = facets || {};
  return [
    "search_facets",
    (Array.isArray(f.seniorities) ? [...f.seniorities].sort() : []).join(","),
    (Array.isArray(f.workTypes) ? [...f.workTypes].sort() : []).join(","),
    f.track || "",
    f.family || "",
    f.location || "",
    (f.keyword || "").trim().toLowerCase(),
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
// Fit-score bucket width for the flag-on attainability tie-break. Jobs whose
// fit_score falls in the same 0.005-wide bucket (0.5 fit-points, below any
// meaningful/display resolution) are ordered by attainability so the card ring
// reads monotonically where the eye catches it. Measured on real data (41
// profiles x full corpus): drops visible adjacent ring inversions 5.2% -> 0.8%
// while never reordering jobs more than 0.5 fit-points apart. See
// scripts/ring-vs-sort-inversions.ts.
export const FIT_TIE_EPS = 0.005;

// opts.tieBreakEps (flag-on only): bucket fit_score by that width, then order
// by attainability within a bucket. Omitted -> pure fit_score sort, so flag-off
// callers are byte-identical.
export function applyFacetsAndRank(scored, facets, opts = {}) {
  const f = facets || {};
  const filtered = (Array.isArray(scored) ? scored : []).filter(
    ({ job, score }) =>
      matchesKeyword(job, f.keyword) &&
      matchesSeniority(job, f.seniorities) &&
      matchesWorkType(job, f.workTypes) &&
      matchesTrack(score, f.track) &&
      matchesFamily(job, f.family) &&
      matchesLocation(job, f.location),
  );
  const eps = opts.tieBreakEps;
  if (!eps) {
    return filtered.sort(
      (a, b) => (b.score?.fit_score ?? 0) - (a.score?.fit_score ?? 0),
    );
  }
  return filtered.sort((a, b) => {
    const fa = a.score?.fit_score ?? 0;
    const fb = b.score?.fit_score ?? 0;
    const bucket = Math.round(fb / eps) - Math.round(fa / eps);
    if (bucket !== 0) return bucket;
    return (
      (b.score?.attainability_score ?? 0) - (a.score?.attainability_score ?? 0)
    );
  });
}

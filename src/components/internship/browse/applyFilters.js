// Pure filter+sort+search transform for the browse list. No React.
// Tested in applyFilters.test.js — keep these semantics explicit:
//
//   - Within a single axis: OR (selecting Seed AND Series A shows both)
//   - Across axes: AND
//   - When an axis has any active selection, companies missing the
//     underlying field (NULL) DROP OUT of the result (D6 contract).
//   - Search: case-insensitive substring against name + sector + industry.
//   - Sort: when any company has a numeric score, sort by score desc
//           (nullsLast). When no scores at all, sort alphabetically.

import { companyMatchesSizeBucket } from "./sizeBuckets";

export function applyFilters(companies, filters, search, scoresById) {
  const norm = (s) => (s || "").toLowerCase();
  const searchTokens = norm(search).split(/\s+/).filter(Boolean);
  const hasIndustry = filters.industry.size > 0;
  const hasStage = filters.stage.size > 0;
  const hasSize = filters.size.size > 0;
  const hasLocation = filters.location.size > 0;
  const hasOrigin = filters.origin.size > 0;

  const matched = companies.filter((c) => {
    if (hasIndustry) {
      if (!c.industry || !filters.industry.has(c.industry)) return false;
    }
    if (hasStage) {
      if (!c.stage || !filters.stage.has(c.stage)) return false;
    }
    if (hasSize) {
      if (!c.employee_count_range) return false;
      const any = Array.from(filters.size).some((b) =>
        companyMatchesSizeBucket(c.employee_count_range, b),
      );
      if (!any) return false;
    }
    if (hasLocation) {
      if (!c.hq_city) return false;
      const city = norm(c.hq_city);
      const any = Array.from(filters.location).some((loc) =>
        city.includes(norm(loc)),
      );
      if (!any) return false;
    }
    if (hasOrigin) {
      if (!c.origin || !filters.origin.has(c.origin)) return false;
    }
    if (searchTokens.length > 0) {
      const hay = [c.name, c.sector, c.industry].filter(Boolean).map(norm).join(" | ");
      for (const tok of searchTokens) if (!hay.includes(tok)) return false;
    }
    return true;
  });

  const anyScored = matched.some((c) => scoresById.get(c.id) != null);
  if (anyScored) {
    matched.sort((a, b) => {
      const sa = scoresById.get(a.id);
      const sb = scoresById.get(b.id);
      if (sa == null && sb == null) return (a.name || "").localeCompare(b.name || "");
      if (sa == null) return 1;
      if (sb == null) return -1;
      return sb - sa;
    });
  } else {
    matched.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }
  return matched;
}

/**
 * Faceted count helper. For each pill in `axisValues`, returns the
 * number of companies that would match the FULL filter set IF this
 * pill were the only selection on this axis (other axes stay as-is).
 *
 * That's the standard "click this pill → see N companies" semantic.
 * Cost is O(819 × pills) per filter change — fine for this size.
 *
 * `axis` is one of: 'industry' | 'stage' | 'size' | 'location' | 'origin'.
 * `axisValues` is the array of pill IDs in the axis (already known —
 * lives in filterConfig.js).
 */
export function facetCounts({ companies, filters, search, scoresById, axis, axisValues }) {
  const out = new Map();
  for (const v of axisValues) {
    const ghost = {
      industry: axis === "industry" ? new Set([v]) : filters.industry,
      stage:    axis === "stage"    ? new Set([v]) : filters.stage,
      size:     axis === "size"     ? new Set([v]) : filters.size,
      location: axis === "location" ? new Set([v]) : filters.location,
      origin:   axis === "origin"   ? new Set([v]) : filters.origin,
    };
    out.set(v, applyFilters(companies, ghost, search, scoresById).length);
  }
  return out;
}

// Pure helpers for the Add-my-own-company lookup-or-create flow.
//
// Extracted so the canonical-row-preference logic and the
// Postgres-duplicate-key detection are unit-testable without a Supabase
// client or QueryClient. AddOwnCompanyModal reuses these around its
// step-1 lookup and step-2 insert.
//
// Lookup runs against companies with: lower(name) = lower(trimmed), plus
// lower(domain) = lower(trimmed) when the user typed a domain. The DB
// query mirrors pickReusableCompany's preference order so it can LIMIT
// in SQL; this helper provides a defensive JS-side pick in case a
// caller fetches without the ORDER BY (or in tests).

// Source values present on the live companies table (2026-05-31 audit):
//   registry  — 428 rows, canonical (companies_il.json import)
//   research  — 391 rows, canonical (matcher-enrichment cycle)
//   manual    —   1 row, this modal's own writes
// Prefer registry > research > anything else so a self-added card
// inherits the enriched sector / stage / HQ metadata.
const SOURCE_PREFERENCE = ["registry", "research"];

function sourceRank(source) {
  const idx = SOURCE_PREFERENCE.indexOf(source);
  return idx === -1 ? SOURCE_PREFERENCE.length : idx;
}

/**
 * Given the candidate rows returned by the lookup, pick the one to reuse
 * (or null if no candidates). Defensive against multiple rows even if the
 * SQL already LIMITs — this is the single source of truth for the
 * preference ordering.
 *
 * Ordering: source preference first (registry > research > rest), then
 * oldest created_at as tiebreaker (the original row when duplicates have
 * accumulated, like the Guardio/guardio pair in prod).
 */
export function pickReusableCompany(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => {
    const ra = sourceRank(a?.source);
    const rb = sourceRank(b?.source);
    if (ra !== rb) return ra - rb;
    const ta = a?.created_at ? Date.parse(a.created_at) : Number.POSITIVE_INFINITY;
    const tb = b?.created_at ? Date.parse(b.created_at) : Number.POSITIVE_INFINITY;
    return ta - tb;
  });
  return sorted[0] || null;
}

/**
 * True when an error returned from Supabase is a Postgres unique-violation
 * (SQLSTATE 23505). PostgREST surfaces the code in error.code. We use
 * this to distinguish "already in your pipeline" from generic write
 * failures on the company_targets insert.
 */
export function isDuplicateKeyError(error) {
  if (!error) return false;
  if (error.code === "23505") return true;
  // Some error wrappers nest the original error.
  if (error.details?.code === "23505") return true;
  return false;
}

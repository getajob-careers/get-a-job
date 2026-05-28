// employee_count_range in the DB is messy: the 391 curated rows use
// strings like '50-100' / '50-200' / '1000-5000' (8 distinct overlapping
// values as of 2026-05-29), and the 428 registry imports have NULL.
//
// The browse-page filter normalizes any raw value into one of 5 clean
// filter buckets, so a student clicking "51-200" gets every company
// whose raw range PARTIALLY OVERLAPS that bucket — '50-100', '50-200',
// '100-200' all qualify. No DB change.
//
// `null` raw → null bucket (won't match any active filter).

export const SIZE_BUCKETS = [
  { id: "1-50",       label: "1–50",       lo: 1,    hi: 50 },
  { id: "51-200",     label: "51–200",     lo: 51,   hi: 200 },
  { id: "201-500",    label: "201–500",    lo: 201,  hi: 500 },
  { id: "501-1000",   label: "501–1,000",  lo: 501,  hi: 1000 },
  { id: "1000+",      label: "1,000+",     lo: 1001, hi: Infinity },
];

/**
 * Parse a raw employee_count_range string into a numeric [lo, hi] range,
 * or null if unparseable. Recognised forms:
 *   '1-50', '50-100', '5000+', '500+', '1000-5000', '1-50 employees'.
 */
function parseRawRange(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/,/g, "");
  // '5000+' → lo=5000, hi=Infinity
  const plus = trimmed.match(/^(\d+)\s*\+/);
  if (plus) {
    const lo = parseInt(plus[1], 10);
    return Number.isFinite(lo) ? [lo, Infinity] : null;
  }
  // '50-100', '50–100' (en dash)
  const range = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    const lo = parseInt(range[1], 10);
    const hi = parseInt(range[2], 10);
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi) {
      return [lo, hi];
    }
  }
  return null;
}

/**
 * Return the IDs of every bucket whose [lo, hi] OVERLAPS the company's
 * raw range. Overlap (not containment) so '50-200' tags both '1-50' and
 * '51-200' — matches student intuition when they click a bucket.
 */
export function bucketsForRaw(raw) {
  const parsed = parseRawRange(raw);
  if (!parsed) return [];
  const [lo, hi] = parsed;
  return SIZE_BUCKETS
    .filter((b) => b.lo <= hi && b.hi >= lo)
    .map((b) => b.id);
}

/**
 * True iff the company's raw range overlaps the given bucket id.
 * Convenience wrapper for the filter layer.
 */
export function companyMatchesSizeBucket(raw, bucketId) {
  if (!bucketId) return true;
  return bucketsForRaw(raw).includes(bucketId);
}

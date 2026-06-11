// Funnel buckets for the 4-stage pipeline strip (Home pipeline card + Career
// strip). Maps the 7-value applications.status enum onto the 4 stages a
// student thinks in. rejected / withdrawn are excluded from the funnel.
//
// Extracted from Home.jsx in PR-A1 so the Career strip consumes the same
// canonical mapping — single source of truth for what counts as "saved" /
// "applied" / "interview" / "offer".

export const FUNNEL_BUCKETS = [
  { key: "saved", label: "saved", statuses: ["interested", "preparing"] },
  { key: "applied", label: "applied", statuses: ["applied"] },
  { key: "interview", label: "interview", statuses: ["interviewing"] },
  { key: "offer", label: "offer", statuses: ["offer", "accepted"] },
];

export function funnelCountsFromApplications(applications) {
  const list = Array.isArray(applications) ? applications : [];
  const counts = {};
  for (const bucket of FUNNEL_BUCKETS) {
    counts[bucket.key] = list.filter((a) => bucket.statuses.includes(a.status)).length;
  }
  return counts;
}

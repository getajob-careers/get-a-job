// Filter taxonomy for the Browse panel. Pill IDs match raw DB values
// (case-sensitive) except where noted. Top-N values per axis come from
// the live distribution on 2026-05-29:
//   companies.industry      — Cybersecurity 117 → MarTech 15 (top 12)
//   companies.stage         — Growth 123, Series A 100, Series B 75,
//                             Public 44, Series C 39, Seed 10
//   companies.hq_city       — Tel Aviv 286 → Hod HaSharon 5 (top 8)
//   companies.origin        — israeli_founded / international_il_rd /
//                             israeli_subsidiary / aggregator (1 row,
//                             hidden from UI)
//
// Size buckets live in ./sizeBuckets.js — the 5 clean filter buckets
// that absorb the 8 messy DB strings.

export const INDUSTRY_FILTERS = [
  "Cybersecurity",
  "B2B SaaS",
  "FinTech",
  "DevTools",
  "AI/ML",
  "HR Tech",
  "InsurTech",
  "MarTech",
  "Semiconductors",
  "Enterprise Software",
  "HealthTech",
  "Gaming",
];

export const STAGE_FILTERS = [
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Growth",
  "Public",
];

// Substring-match filter — clicking 'Tel Aviv' matches any company
// whose hq_city CONTAINS 'Tel Aviv' (catches 'Tel Aviv / New York'
// dual-listings without bloating the pill list).
export const LOCATION_FILTERS = [
  "Tel Aviv",
  "Herzliya",
  "Petah Tikva",
  "Rehovot",
  "Ramat Gan",
  "Netanya",
  "Hod HaSharon",
  "Ra'anana",
];

// `id` is the raw DB value; `label` is what students see. Aggregator
// is excluded (single-row outlier, not useful as a browse axis).
export const ORIGIN_FILTERS = [
  { id: "israeli_founded",       label: "Founded in Israel" },
  { id: "international_il_rd",   label: "International R&D in Israel" },
  { id: "israeli_subsidiary",    label: "International subsidiary" },
];

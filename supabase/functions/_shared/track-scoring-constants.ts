// Single source of truth for the constants that drive Track 1/2/3 assignment.
//
// Before PR-E these values were duplicated (with drift) across three places:
//   - src/lib/scoreJobFit.js              (Jobs page)
//   - src/lib/scoreApplication.js         (Tracker + JobMatchChecker)
//   - generate-career-analysis/index.ts   (Career Roadmap)
//
// Specifically these had drifted:
//   - STAGE ceiling for early_career: Jobs=1 (strict, Entry_Mid only),
//     Roadmap=2 (permissive, Mid included). Roadmap was therefore showing
//     mid-level roles in Track 1 for students that Jobs would never show.
//   - Goal alignment thresholds: Jobs=0.70/0.80, Roadmap=0.60/0.70.
//     Roadmap was more generous about T1.
//
// All three surfaces now import these constants from this single file. The
// stricter (Jobs / scoreJobFit) values won — they're calibrated against
// real student data and they're what the user sees on the Browse page.
//
// Why Roadmap and Jobs can still show DIFFERENT scores for the same role:
//   - Roadmap scores user vs the canonical role-library archetype
//     ("the canonical PM requires X, Y, Z core skills")
//   - Jobs page scores user vs the specific JD's extracted requirements
//     ("this PM job at Company A also requires React + AWS")
//   The two are answering different questions:
//     Roadmap = "what career direction fits you?"
//     Jobs    = "which specific jobs can you apply to right now?"
//   The framing in the Roadmap UI makes this explicit so users don't read
//   the divergence as a bug.

export const SENIORITY_RANK: Record<string, number> = {
  Entry: 0,
  Entry_Mid: 1,
  Mid: 2,
  Mid_Senior: 3,
  Senior: 3,
  Lead: 4,
  Manager: 4,
  Principal: 4,
  Staff: 4,
  Director: 5,
  VP: 6,
};

// User-stage seniority ceiling for Track 1 ("can be hired NOW").
// Stricter values from scoreJobFit win: early-career students should not
// see Mid+ roles in Track 1 even if the skill math comes out high — those
// flow to Track 3 (Work Toward) instead.
export const STAGE_T1_CEILING: Record<string, number> = {
  early: 1,   // Entry + Entry_Mid only
  mid: 3,     // up to Mid_Senior
  senior: 6,  // unbounded
};

// Map between the long-form experience level naming (used by Roadmap +
// generate-career-analysis) and the compact form used in the front-end
// trackFromScores helper.
export const EXPERIENCE_LEVEL_TO_STAGE: Record<string, "early" | "mid" | "senior"> = {
  early_career: "early",
  mid_career: "mid",
  senior_career: "senior",
};

// Fit-only fallback thresholds (used when alignment is unknown).
// Match across all three surfaces — never drifted.
export const FIT_ONLY_THRESHOLDS = {
  t1: 0.55,
  t2: 0.40,
  t3: 0.25,
} as const;

// Pure fit-only track derivation. Moved here from src/lib/scoreApplication.js
// to break the scoreApplication ↔ scoreJobFit circular import. The cycle
// (scoreJobFit imports trackFromScore from scoreApplication; scoreApplication
// imports scoreJobFit) had been latent since PR-C/D. A new Vercel build
// surfaced it as a TDZ error ("Cannot access 'le' before initialization")
// — Rollup's module linearization changed bundle order. Centralizing the
// helper here lets both files import without depending on each other.
export function trackFromScore(score: number): "track_1" | "track_2" | "track_3" {
  if (score >= FIT_ONLY_THRESHOLDS.t1) return "track_1";
  if (score >= FIT_ONLY_THRESHOLDS.t2) return "track_2";
  if (score >= FIT_ONLY_THRESHOLDS.t3) return "track_3";
  return "track_3";
}

// Goal-aware Track thresholds. Stricter Jobs/scoreJobFit values win.
// T1: fit ≥ 0.50 AND alignment ≥ 0.70
//   OR fit ≥ 0.40 AND alignment ≥ 0.80
// T2: fit ≥ 0.50 (regardless of alignment)
// T3: fit ≥ 0.20 AND alignment ≥ 0.60
export const GOAL_TRACK_THRESHOLDS = {
  t1_min_fit_high_alignment: 0.50,
  t1_min_alignment_high_fit: 0.70,
  t1_min_fit_relaxed: 0.40,
  t1_min_alignment_relaxed: 0.80,
  t2_min_fit: 0.50,
  t3_min_fit: 0.20,
  t3_min_alignment: 0.60,
} as const;

// Profile primary_domain → role families the user counts as direct family
// experience. Identical across all surfaces today; centralized here so a
// future addition (e.g. new "growth" domain) lands everywhere.
//
// 2026-06-15 expansion (Jobs unified-list): 5 live primary_domain values
// observed in profiles were absent from this map — `data_analytics`,
// `business_operations`, `cybersecurity`, `software_engineering`,
// `project_management`, `ux_design`. For those users the
// computeFunctionFamilyAxis lookup returned `{score:0.5, match:false}`
// (the "no userFams" fallback), making the family signal effectively
// OFF — every job scored as off-family-but-neutral. That was the
// primary reason Ofri (data_analytics, 4 affected users total) saw
// off-domain Warehouse/HR jobs at the top of her feed alongside
// the 0.10 weighting issue. Adding these keys is co-primary with the
// FAMILY_ADJACENCY introduction; both ship in the same PR.
export const DOMAIN_TO_FAMILIES: Record<string, string[]> = {
  customer_success: ["Relationship_Growth", "Customer_Experience", "Onboarding_Implementation", "Support"],
  customer_experience: ["Customer_Experience", "Support", "Relationship_Growth"],
  support: ["Support", "Customer_Experience"],
  product: ["Product"],
  product_management: ["Product"],
  sales: ["Sales", "BD_Partnerships"],
  marketing: ["Marketing"],
  operations: ["Operations", "RevOps_BizOps"],
  business_operations: ["Operations", "RevOps_BizOps"],
  data: ["Data", "RevOps_BizOps"],
  data_analytics: ["Data", "RevOps_BizOps"],
  analytics: ["Data"],
  finance: ["Finance"],
  hr: ["HR_People", "Admin_GA"],
  people: ["HR_People"],
  engineering: ["Engineering", "Solutions_Engineering"],
  software_engineering: ["Engineering", "Solutions_Engineering"],
  cybersecurity: ["IT_Security"],
  design: ["Design_UX"],
  ux_design: ["Design_UX"],
  project_management: ["Operations"],
};

// Function-family ADJACENCY — used by the Jobs unified-list (PR #393) to
// gate feed membership beyond strict primary-family match. The relevance
// gate is: primary > adjacent > unknown (no family) > off (dropped).
// Adjacencies are semantic neighborhoods grounded in the canonical
// role_library taxonomy (role_family field; 24 families total). The
// principle: keep the path open from a user's primary domain to functions
// they could plausibly pivot into without re-training. We rely on the
// attainability score to RANK adjacent matches LOWER than primary ones
// (adjacency unlocks them; skill/years gaps in those families naturally
// sink them down the feed) — so the gate is permissive about WHICH jobs
// can appear, strict only about which families are entirely off-path.
export const FAMILY_ADJACENCY: Record<string, string[]> = {
  customer_success: ["Sales", "Operations"],
  customer_experience: ["Sales", "Operations"],
  support: ["Operations", "Solutions_Engineering"],
  product: ["Engineering", "Data", "Design_UX", "RevOps_BizOps"],
  product_management: ["Engineering", "Data", "Design_UX", "RevOps_BizOps"],
  sales: ["Customer_Experience", "Marketing", "Relationship_Growth"],
  marketing: ["Sales", "BD_Partnerships", "Data", "Customer_Experience"],
  operations: ["Finance", "Admin_GA", "Customer_Experience", "Support"],
  business_operations: ["Finance", "Admin_GA", "Customer_Experience", "Support"],
  data: ["Product", "Marketing", "AI_ML"],
  data_analytics: ["Product", "Marketing", "AI_ML"],
  analytics: ["Product", "Marketing", "AI_ML"],
  finance: ["Operations", "RevOps_BizOps", "Consulting"],
  hr: ["Admin_GA"],
  people: ["Admin_GA"],
  engineering: ["IT_Security", "AI_ML", "Data"],
  software_engineering: ["IT_Security", "AI_ML", "Data"],
  cybersecurity: ["Engineering", "Solutions_Engineering", "Operations"],
  design: ["Product", "Marketing"],
  ux_design: ["Product", "Marketing"],
  project_management: ["Product", "Engineering", "Consulting", "Finance"],
};

// ─── Early-career business widening (PR: jobs-early-career-gate) ──────────
// The strict primary+adjacent gate above leaves an EARLY-CAREER user with a
// thin feed: the IL corpus has few entry/mid roles in any one family, and a
// domain's adjacency is intentionally narrow. When user_level is
// early_career we let GTM + business-generalist families through the gate as
// relevance_match = "adjacent" (sort below primary; the band + feed
// sectioning frame them as stretch). Mid/senior keep the tight gate.
//
// Trigger is user_level ALONE -- NOT gated on primary_domain. The supply is
// title-bounded to the user's career_roles (search_jobs_by_role_titles), so
// a business family only surfaces when the roadmap already contains roles of
// that family -- a higher-fidelity signal than the single coarse
// primary_domain tag (which mislabels business-seekers as "data" for 2 of 3
// known pilot users). Leak test (2026-06-16): a purely-technical SWE roadmap
// pulled 1/40 business jobs (an "Engineering Project Manager" mis-familied
// as Operations) -- a trivial trigram collision, not a flood.
//
// Family set = GTM (Tier A) + business-generalist (Tier B: Finance,
// Consulting, HR_People). Admin_GA HELD OUT (clerical -- office/travel/
// workplace coordinators, per title review). Never widened in:
// Manufacturing_Operations, IT_Security, AI_ML, Solutions_Engineering,
// Research_Science, Legal_Compliance, Leadership, and the tech-craft
// families Engineering/Data/Design_UX (those stay visible only via the
// domains whose existing FAMILY_ADJACENCY already maps them).
export const EARLY_CAREER_BUSINESS_FAMILIES: string[] = [
  // Tier A -- GTM
  "Sales",
  "BD_Partnerships",
  "Marketing",
  "Operations",
  "RevOps_BizOps",
  "Customer_Experience",
  "Support",
  "Relationship_Growth",
  "Onboarding_Implementation",
  // Tier B -- business generalist
  "Finance",
  "Consulting",
  "HR_People",
  // Admin_GA intentionally omitted (held out -- clerical, per title review).
];

// Attainability band thresholds — calibrated 2026-06-15 against the gated
// distribution on prod data (elienglard34, ofriraichel, rpress13). The
// previous placeholders (0.65/0.45/0.30) left "strong" nearly empty
// (~2.7% for two of three users) because the gated mass clusters
// 0.45–0.60 — strong ≥ 0.65 was unreachable at today's skill density.
// The values below are a validated STARTING point, not a permanent lock —
// labels, not gates, so retuning is low-risk. Eyeball during the 24h
// ?flag=jobs_unified_list=1&debug=1 side-by-side and nudge if needed.
//
// strong  ≥ 0.55   clear match
// good    0.42–0.55 solid
// stretch 0.28–0.42 reach
// reach   < 0.28    surface only if user explicitly widens (today: no UI)
//
// FUTURE PASS REQUIRED: these bands are tuned against today's skill data,
// which is still thin — #394 (thin-JD skill-match clamp) and the canonical
// skill-recovery work aren't in yet. Once those land, attainability will
// spread (skill axis weighs 0.55 of the composite — the dominant lever),
// and these thresholds will likely need to slide upward again. Treat any
// "strong" share > 25% post-skill-recovery as a signal to recalibrate.
export const ATTAINABILITY_BAND_THRESHOLDS = {
  strong: 0.55,
  good: 0.42,
  stretch: 0.28,
} as const;

// Weights for the new ATTAINABILITY score — the existing scoreJobFit
// composite minus the 0.10 function_family weight, renormalized so the
// remaining axes sum to 1.0. Used by the Jobs unified-list (PR #393);
// the legacy fit_score weights in scoreJobFit.js stay byte-unchanged.
export const ATTAINABILITY_WEIGHTS = {
  skill: 0.55,
  years: 0.22,
  education: 0.115,
  seniority: 0.115,
} as const;

// Education degree-level rank for the strict-degree-requirement axis.
export const EDUCATION_RANK: Record<string, number> = {
  high_school: 0,
  associate: 1,
  bachelors: 2,
  masters: 3,
  phd: 4,
  bootcamp: 1,
  self_taught: 0,
};

// ───────────────────────────────────────────────────────────────────────
// Years-experience hard cap (PR-H, re-applied as PR-H.2 after the TDZ
// hotfix moved trackFromScore into this file).
//
// Recruiters auto-filter on years. A user with 1y experience applying to
// a 5y-required role doesn't survive the ATS regardless of skill match.
// scoreJobFit's years AXIS only docked ~0.12 from the composite (0.20
// weight × max swing), which couldn't overcome strong skill match
// elsewhere — 1y users were seeing 3-5y-required roles in Track 1.
//
// This cap mirrors the seniority ceiling pattern — additive, applied
// after trackFromScore, downgrade-only.
//
//   gap = req_years_min - user_years
//   gap ≤ 1   →  no cap (recoverable in cover letter)
//   gap == 2  →  cap Track 1 → Track 2 (stretch, not sweet spot)
//   gap ≥ 3   →  cap to Track 3 (recruiters will filter on years)
//
// Skipped when reqYearsMin is null (JD didn't specify) or userYears is
// null/undefined (can't compute the gap).
export function applyYearsCap(
  track: string,
  userYears: number | null | undefined,
  reqYearsMin: number | null | undefined,
): string {
  if (reqYearsMin == null || userYears == null) return track;
  const gap = reqYearsMin - userYears;
  if (gap >= 3) return "track_3";
  if (gap >= 2 && track === "track_1") return "track_2";
  return track;
}


// Phase 0 score-coverage gate. A role/job whose LLM-extracted skills resolve
// to library IDs below this fraction is "low coverage": our hand-curated
// library does not cover its domain, so the match score is built on a thin
// generic subset and is unreliable. The UI then shows an honest low-confidence
// state instead of a confident percentage. Validated against the live jobs
// corpus: out-of-domain roles (chemist, electrician, lab tech, pharma) sit at
// ~0.0 coverage while in-domain engineering roles sit at 0.8-1.0, so 0.4
// cleanly separates fake-high from genuine-high.
export const SKILL_COVERAGE_LOW_THRESHOLD = 0.4;

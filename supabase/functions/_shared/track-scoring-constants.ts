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
export const DOMAIN_TO_FAMILIES: Record<string, string[]> = {
  customer_success: ["Relationship_Growth", "Customer_Experience", "Onboarding_Implementation", "Support"],
  customer_experience: ["Customer_Experience", "Support", "Relationship_Growth"],
  support: ["Support", "Customer_Experience"],
  product: ["Product"],
  product_management: ["Product"],
  sales: ["Sales", "BD_Partnerships"],
  marketing: ["Marketing"],
  operations: ["Operations", "RevOps_BizOps"],
  data: ["Data", "RevOps_BizOps"],
  analytics: ["Data"],
  finance: ["Finance"],
  hr: ["HR_People", "Admin_GA"],
  people: ["HR_People"],
  engineering: ["Engineering", "Solutions_Engineering"],
  design: ["Design_UX"],
};

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
// Years-experience hard cap (PR-H).
//
// Recruiters auto-filter on years. A user with 1y experience applying to
// a 5y-required role doesn't get the LLM-skill-match benefit-of-the-doubt
// — their CV gets dropped before it's read. scoreJobFit's years AXIS only
// docked ~0.12 from the composite (0.20 weight × max swing), which couldn't
// overcome strong skill match. Result: 1y users seeing Mid+ roles in
// Track 1 even when they'd be auto-filtered.
//
// This cap mirrors the seniority ceiling pattern — additive, applied
// after trackFromScore, downgrade-only.
//
//   gap = req_years_min - user_years
//   gap ≤ 1   →  no cap (recoverable in cover letter)
//   gap == 2  →  cap to Track 2 (stretch, strong CV needed)
//   gap ≥ 3   →  cap to Track 3 (recruiters will filter on years)
//
// Skipped when reqYearsMin is null (JD didn't specify) or userYears is
// undefined (can't compute the gap).
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

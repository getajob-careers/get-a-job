// Deterministic profile-vs-job fit scoring.
//
// Pure function. No LLM, no network, no async. Called per-job on every
// Jobs page render via useMemo so the user sees a fit badge instantly on
// every card. The signal is the math of:
//   skill overlap × years overlap × education overlap × seniority match
// against the v4-extracted job requirement fields.
//
// Inputs:
//   profile      — { skills_canonical[], qualification_level?, primary_domain? }
//   experiences  — array of experience rows for years derivation
//   educations   — array of education rows for level/field check
//   job          — a jobs row with v4 fields (req_skills_core, req_years_min,
//                  req_education_*, req_seniority, function_family,
//                  extraction_confidence, etc.)
//
// Output:
//   {
//     fit_score: 0..1,                  // overall composite
//     track: "track_1"|"track_2"|"track_3"|null,
//     signals: {                        // raw per-axis details for the UI
//       skill_match_pct, matched_skills[], missing_core_skills[],
//       missing_nice_skills[], years_user, years_required_min,
//       years_status, education_match, seniority_match,
//       function_family_match, extraction_confidence,
//     },
//     reasoning: { strengths: string[], gaps: string[] },
//   }

import { totalYearsOfExperience, inferExperienceLevel } from "./experienceLevel";
// IMPORTANT: trackFromScore is imported from the shared .ts constants
// file, NOT from ./scoreApplication. scoreApplication imports scoreJobFit
// (PR-D), so the reverse direction created a circular module graph that
// Rollup linearized into a TDZ ("Cannot access 'le' before initialization"
// in production). Centralized in the .ts to keep the dependency graph
// linear: track-scoring-constants → scoreJobFit → scoreApplication.
import {
  SENIORITY_RANK,
  STAGE_T1_CEILING,
  DOMAIN_TO_FAMILIES,
  EDUCATION_RANK,
  EXPERIENCE_LEVEL_TO_STAGE,
  trackFromScore,
  applyYearsCap,
} from "../../supabase/functions/_shared/track-scoring-constants.ts";

// Component weights — sum to 1.0. Skill dominates because it's both the
// strongest signal and the one the extractor is most confident about.
const WEIGHTS = {
  skill: 0.50,
  years: 0.20,
  education: 0.10,
  seniority: 0.10,
  function_family: 0.10,
};

// IMPORTANT — historically these derived values lived at module top level:
//   const DOMAIN_TO_FAMILIES_SET = Object.fromEntries(Object.entries(DOMAIN_TO_FAMILIES)...);
//   const STAGE_CEILING_BY_LEVEL = { early_career: STAGE_T1_CEILING.early, ... };
// That triggered a production TDZ ("Cannot access 'le' before initialization"
// where `le` was the minified import of STAGE_T1_CEILING or DOMAIN_TO_FAMILIES).
// Rollup chunks scoreJobFit.js and track-scoring-constants.ts such that
// scoreJobFit's module-init reads the imported binding BEFORE the .ts
// module's `export const ...` runs — TDZ. Cached helpers below defer the
// derivation to first-call time, by which point all module bodies have
// finished evaluating and the imports are guaranteed to be initialized.
let __domainSetCache = null;
function getDomainFamiliesSet() {
  if (!__domainSetCache) {
    __domainSetCache = Object.fromEntries(
      Object.entries(DOMAIN_TO_FAMILIES).map(([k, v]) => [k, new Set(v)]),
    );
  }
  return __domainSetCache;
}

let __stageCeilingCache = null;
function getStageCeilingByLevel() {
  if (!__stageCeilingCache) {
    __stageCeilingCache = {
      early_career: STAGE_T1_CEILING.early,
      mid_career: STAGE_T1_CEILING.mid,
      senior_career: STAGE_T1_CEILING.senior,
    };
  }
  return __stageCeilingCache;
}

// ─── Skill axis ────────────────────────────────────────────────────────
function computeSkillAxis(userCanonical, job) {
  const core = Array.isArray(job?.req_skills_core) ? job.req_skills_core : [];
  const nice = Array.isArray(job?.req_skills_nice) ? job.req_skills_nice : [];
  const userSet = new Set(Array.isArray(userCanonical) ? userCanonical : []);

  // When the JD has no extracted skill requirements, we can't meaningfully
  // measure overlap. Neutral score (don't penalize) — these jobs lean on
  // other axes (years, family, seniority).
  if (core.length === 0 && nice.length === 0) {
    return {
      score: 0.5,
      matched_skills: [],
      missing_core_skills: [],
      missing_nice_skills: [],
      skill_match_pct: null,  // not applicable
    };
  }

  const matchedCore = core.filter((id) => userSet.has(id));
  const matchedNice = nice.filter((id) => userSet.has(id));
  const missingCore = core.filter((id) => !userSet.has(id));
  const missingNice = nice.filter((id) => !userSet.has(id));

  // Weighted average: core counts 2× more than nice.
  const coreRatio = core.length > 0 ? matchedCore.length / core.length : 1;
  const niceRatio = nice.length > 0 ? matchedNice.length / nice.length : null;
  let score;
  if (niceRatio === null) {
    score = coreRatio;
  } else {
    score = (coreRatio * 2 + niceRatio) / 3;
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    matched_skills: [...matchedCore, ...matchedNice],
    missing_core_skills: missingCore,
    missing_nice_skills: missingNice,
    skill_match_pct: core.length > 0 ? Math.round(coreRatio * 100) : Math.round((niceRatio ?? 0) * 100),
  };
}

// ─── Years axis ────────────────────────────────────────────────────────
function computeYearsAxis(userYears, job) {
  const reqMin = typeof job?.req_years_min === "number" ? job.req_years_min : null;
  const reqMax = typeof job?.req_years_max === "number" ? job.req_years_max : null;

  if (reqMin === null) {
    return { score: 0.5, status: "unspecified", user_years: userYears, required_min: null };
  }

  if (userYears >= reqMin) {
    // In range or above. Linear bonus for being closer to min (don't
    // over-reward 20-yr veterans for 2-yr-min jobs — they're overqualified).
    if (reqMax !== null && userYears > reqMax + 2) {
      return { score: 0.7, status: "above_max", user_years: userYears, required_min: reqMin };
    }
    return { score: 1.0, status: "in_range", user_years: userYears, required_min: reqMin };
  }

  // Below min — linear penalty, floor at 0.25 (we still score "1y vs 3y
  // required" higher than "0y vs 5y required").
  const gap = reqMin - userYears;
  const penaltyScore = Math.max(0.25, 1 - gap * 0.2);
  return { score: penaltyScore, status: "below", user_years: userYears, required_min: reqMin };
}

// ─── Education axis ────────────────────────────────────────────────────
// Per-spec: req_education_strict → heavy penalty (not hard exclusion).
// Equivalent-experience counts via qualification_level when not strict.
function computeEducationAxis(profile, educations, job) {
  const reqLevels = Array.isArray(job?.req_education_levels) ? job.req_education_levels : [];
  const reqStrict = job?.req_education_strict === true;

  if (reqLevels.length === 0) {
    return { score: 0.5, match: "unspecified" };
  }

  const userLevels = (Array.isArray(educations) ? educations : [])
    .map((e) => (e?.degree_level || "").toString().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
  const reqRanks = reqLevels.map((l) => EDUCATION_RANK[l] ?? 0);
  const userRanks = userLevels.map((l) => EDUCATION_RANK[l] ?? 0);
  const minReqRank = Math.min(...reqRanks);
  const userMaxRank = userRanks.length > 0 ? Math.max(...userRanks) : -1;

  if (userMaxRank >= minReqRank) {
    return { score: 1.0, match: "met" };
  }

  // No degree match. If strict → heavy penalty (0.30). Else equivalent
  // experience can offset (qualification_level === "equivalent_experience"
  // → soften to 0.65).
  if (reqStrict) {
    return { score: 0.30, match: "gap_strict" };
  }
  const qual = String(profile?.qualification_level || "").toLowerCase();
  if (qual.includes("equivalent")) {
    return { score: 0.65, match: "equivalent" };
  }
  return { score: 0.45, match: "gap_soft" };
}

// ─── Seniority axis ────────────────────────────────────────────────────
function computeSeniorityAxis(userLevel, job) {
  const reqSen = job?.req_seniority || null;
  if (!reqSen) return { score: 0.5, match: "unspecified" };

  const reqRank = SENIORITY_RANK[reqSen] ?? null;
  if (reqRank === null) return { score: 0.5, match: "unknown_value" };

  const ceiling = getStageCeilingByLevel()[userLevel] ?? Infinity;

  if (reqRank > ceiling) {
    // Above ceiling — not viable today.
    return { score: 0.25, match: "above_ceiling" };
  }
  if (reqRank === ceiling) {
    // Right at the top of what's plausible — partial credit.
    return { score: 0.85, match: "stretch" };
  }
  // Comfortably within range.
  return { score: 1.0, match: "in_range" };
}

// ─── Function family axis ─────────────────────────────────────────────
function computeFunctionFamilyAxis(profile, job) {
  const fam = job?.function_family || null;
  const domain = String(profile?.primary_domain || "").toLowerCase();
  if (!fam) return { score: 0.5, match: false };
  const userFams = getDomainFamiliesSet()[domain];
  if (!userFams) return { score: 0.5, match: false };
  return userFams.has(fam)
    ? { score: 1.0, match: true }
    : { score: 0.35, match: false };
}

// ─── Composer ──────────────────────────────────────────────────────────
export function scoreJobFit(input, job) {
  const { profile, experiences = [], educations = [] } = input || {};
  const userCanonical = profile?.skills_canonical || [];
  const userYears = totalYearsOfExperience(experiences);
  const userLevel = inferExperienceLevel(experiences, educations);

  const skill = computeSkillAxis(userCanonical, job);
  const years = computeYearsAxis(userYears, job);
  const education = computeEducationAxis(profile, educations, job);
  const seniority = computeSeniorityAxis(userLevel, job);
  const family = computeFunctionFamilyAxis(profile, job);

  // Weighted composite — components weighted per WEIGHTS table.
  let fit_score =
    skill.score * WEIGHTS.skill +
    years.score * WEIGHTS.years +
    education.score * WEIGHTS.education +
    seniority.score * WEIGHTS.seniority +
    family.score * WEIGHTS.function_family;

  // Extraction confidence modifier: when the JD extraction is sparse
  // (confidence < 0.4) the JD-derived requirements are unreliable —
  // soften the score 10% so the user isn't shown a confident "Track 1"
  // built on shaky data.
  const conf = typeof job?.extraction_confidence === "number" ? job.extraction_confidence : null;
  if (conf !== null && conf < 0.4) {
    fit_score = fit_score * 0.9;
  }

  fit_score = Math.max(0, Math.min(1, fit_score));

  // Seniority hard-cap to track_3 when the role is above stage ceiling —
  // even a 100% skill match on a Senior role isn't viable for a student.
  let track;
  if (seniority.match === "above_ceiling") {
    track = "track_3";
  } else {
    track = trackFromScore(fit_score);
  }

  // Years hard-cap (PR-H.2) — recruiters auto-filter on years. The years
  // axis only docks ~0.12 from fit_score (0.20 weight × max swing), so
  // we layer a hard track downgrade for big gaps. Mirrors the seniority
  // ceiling pattern. See applyYearsCap docstring for the rule.
  track = applyYearsCap(track, years.user_years, years.required_min);

  // Reasoning strings — short, actionable phrases the UI surfaces.
  const strengths = [];
  const gaps = [];
  if (skill.skill_match_pct !== null && skill.skill_match_pct >= 60) {
    strengths.push(`${skill.skill_match_pct}% skill match`);
  }
  if (skill.matched_skills.length >= 3) {
    strengths.push(`${skill.matched_skills.length} matching skills`);
  }
  if (years.status === "in_range") strengths.push("Experience matches");
  if (education.match === "met") strengths.push("Education met");
  if (family.match) strengths.push("On-domain role");

  if (skill.missing_core_skills.length > 0) {
    gaps.push(
      `Missing ${skill.missing_core_skills.length} core skill${skill.missing_core_skills.length > 1 ? "s" : ""}`,
    );
  }
  if (years.status === "below") {
    const gap = years.required_min - years.user_years;
    gaps.push(`${gap}y experience short`);
  }
  if (education.match === "gap_strict") gaps.push("Degree gap (strict)");
  if (seniority.match === "above_ceiling") gaps.push("Above your seniority");

  // Surface family match as goal_alignment_score so deterministic scoring
  // can populate the same field analyze-job-match used to fill (RoleCard /
  // Tracker UI bind to this). Semantics: "does this role advance the
  // user's intended direction?" — primary_domain ↔ function_family is our
  // deterministic proxy for that signal.
  //   match=true  → 1.0   strong alignment (in-domain role)
  //   match=false → 0.35  off-domain (job has a family, user's domain
  //                       doesn't map to it — same penalty value used in
  //                       the family axis of fit_score)
  //   unspecified → null  job has no extracted function_family OR user
  //                       has no primary_domain — UI hides the bar
  let goal_alignment_score = null;
  if (job?.function_family && getDomainFamiliesSet()[String(profile?.primary_domain || "").toLowerCase()]) {
    goal_alignment_score = family.match ? 1.0 : 0.35;
  }

  return {
    fit_score: Math.round(fit_score * 100) / 100,
    goal_alignment_score,
    track,
    signals: {
      skill_match_pct: skill.skill_match_pct,
      matched_skills: skill.matched_skills,
      missing_core_skills: skill.missing_core_skills,
      missing_nice_skills: skill.missing_nice_skills,
      years_user: years.user_years,
      years_required_min: years.required_min,
      years_status: years.status,
      education_match: education.match,
      seniority_match: seniority.match,
      function_family_match: family.match,
      extraction_confidence: conf,
      user_level: userLevel,
      user_stage: EXPERIENCE_LEVEL_TO_STAGE[userLevel] || null,
    },
    reasoning: { strengths, gaps },
  };
}

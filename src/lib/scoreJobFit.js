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

import {
  totalYearsOfExperience,
  inferExperienceLevel,
} from "./experienceLevel";
// IMPORTANT: trackFromScore is imported from the shared .ts constants
// file, NOT from ./scoreApplication. scoreApplication imports scoreJobFit
// (PR-D), so the reverse direction created a circular module graph that
// Rollup linearized into a TDZ ("Cannot access 'le' before initialization"
// in production). Centralized in the .ts to keep the dependency graph
// linear: track-scoring-constants → scoreJobFit → scoreApplication.
import {
  SENIORITY_RANK,
  STAGE_T1_CEILING,
  STAGE_T1_FLOOR,
  DOMAIN_TO_FAMILIES,
  FAMILY_ADJACENCY,
  EARLY_CAREER_BUSINESS_FAMILIES,
  ATTAINABILITY_WEIGHTS,
  ATTAINABILITY_BAND_THRESHOLDS,
  EDUCATION_RANK,
  EXPERIENCE_LEVEL_TO_STAGE,
  trackFromScore,
  applyYearsCap,
} from "../../supabase/functions/_shared/track-scoring-constants.ts";

// Component weights — sum to 1.0. Skill dominates because it's both the
// strongest signal and the one the extractor is most confident about.
const WEIGHTS = {
  skill: 0.5,
  years: 0.2,
  education: 0.1,
  seniority: 0.1,
  function_family: 0.1,
};

// ── Component 1: confidence-aware ranking (flag-gated, default off) ──────────
// The composite treats a match on ONE generic core skill against a 1-skill JD
// as a confident 1.0 skill axis = half the score. The 160-label baseline showed
// this is 49% of BAD top-picks (the "87% on lone analytical_thinking" cluster)
// and the ELI 87% ties. Confidence-aware ranking shrinks the score toward a
// neutral prior in proportion to how thin/generic/low-coverage the evidence is,
// so a thin-evidence high overlap can no longer outrank a match on several
// distinctive must-haves. Tunable; validated against the pinned labels, not by eye.
const CONF = {
  neutral: 0.5, // prior the score shrinks toward when confidence is low
  // sub-factor weights (sum to 1). Thinness + distinctiveness dominate the
  // single-generic-skill inflation; coverage is up-weighted because the BAD
  // cluster's signature (label baseline) is very low coverage (0.04-0.15).
  w_thinness: 0.35,
  w_distinctiveness: 0.35,
  w_coverage: 0.2,
  w_extraction: 0.1,
  // requirement-thinness factor by core-skill count (more cores = more signal)
  thinnessByCoreCount: { 0: 0.5, 1: 0.35, 2: 0.6, 3: 0.8 }, // >=4 -> 1.0
};

// Generic / transferable competencies. A match resting only on these is weak
// evidence of role fit vs a match on distinctive hard skills (sql, python,
// financial_modeling). Curated from the BAD-cluster review of the 160 labels.
const GENERIC_SKILLS = new Set([
  "analytical_thinking",
  "problem_solving",
  "critical_thinking",
  "communication",
  "customer_communication",
  "presentation_skills",
  "cross_functional_collaboration",
  "collaboration",
  "teamwork",
  "stakeholder_management",
  "project_management",
  "program_management",
  "organization",
  "attention_to_detail",
  "time_management",
  "leadership",
  "mentoring",
  "coaching",
  "adaptability",
  "emotional_intelligence",
  "interpersonal_skills",
  "work_ethic",
  "self_motivation",
  "creativity",
  "multitasking",
  "prioritization",
]);

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Confidence in [0,1] for a (user, job) match: high when the JD has several
// distinctive core requirements the user genuinely matches at good coverage;
// low when it rests on a thin/generic/low-coverage signal.
export function matchConfidence(skill, job, conf) {
  const coreN = Array.isArray(job?.req_skills_core)
    ? job.req_skills_core.length
    : 0;
  const thinness = coreN >= 4 ? 1 : (CONF.thinnessByCoreCount[coreN] ?? 0.6);
  const matchedCore = Array.isArray(skill?.matched_core_skills)
    ? skill.matched_core_skills
    : [];
  const distinctiveMatched = matchedCore.filter(
    (id) => !GENERIC_SKILLS.has(id),
  ).length;
  const distinctiveness =
    matchedCore.length === 0
      ? 0.55 // no core matched: low-ish (the overlap that drove the score is off-core)
      : distinctiveMatched >= 1
        ? 1.0
        : 0.3; // only-generic core matches are weak evidence
  const coverage =
    typeof job?.skill_coverage_ratio === "number"
      ? clamp01(job.skill_coverage_ratio)
      : 1;
  const extraction = typeof conf === "number" ? clamp01(conf) : 1;
  return clamp01(
    CONF.w_thinness * thinness +
      CONF.w_distinctiveness * distinctiveness +
      CONF.w_coverage * coverage +
      CONF.w_extraction * extraction,
  );
}

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

// Same deferred-derivation pattern as getDomainFamiliesSet — avoids the
// production TDZ risk that bit PR #109/116 when `const FOO = Object...`
// at module top read an import binding before its source module had
// finished evaluation. The cached helper runs at first call (post-render),
// by which point all module bodies have evaluated.
let __adjacencySetCache = null;
function getFamilyAdjacencySet() {
  if (!__adjacencySetCache) {
    __adjacencySetCache = Object.fromEntries(
      Object.entries(FAMILY_ADJACENCY).map(([k, v]) => [k, new Set(v)]),
    );
  }
  return __adjacencySetCache;
}

// Early-career business-widening family Set — same deferred-derivation
// pattern as getFamilyAdjacencySet (avoids the module-init TDZ that bit
// PR #109/116). Built once at first call, post-render.
let __businessFamiliesCache = null;
function getEarlyCareerBusinessFamiliesSet() {
  if (!__businessFamiliesCache) {
    __businessFamiliesCache = new Set(EARLY_CAREER_BUSINESS_FAMILIES);
  }
  return __businessFamiliesCache;
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

let __stageFloorCache = null;
function getStageFloorByLevel() {
  if (!__stageFloorCache) {
    __stageFloorCache = {
      early_career: STAGE_T1_FLOOR.early,
      mid_career: STAGE_T1_FLOOR.mid,
      senior_career: STAGE_T1_FLOOR.senior,
    };
  }
  return __stageFloorCache;
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
      skill_match_pct: null, // not applicable
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
    matched_core_skills: matchedCore, // for the confidence-aware distinctiveness check
    missing_core_skills: missingCore,
    missing_nice_skills: missingNice,
    skill_match_pct:
      core.length > 0
        ? Math.round(coreRatio * 100)
        : Math.round((niceRatio ?? 0) * 100),
  };
}

// ─── Years axis ────────────────────────────────────────────────────────
function computeYearsAxis(userYears, job) {
  const reqMin =
    typeof job?.req_years_min === "number" ? job.req_years_min : null;
  const reqMax =
    typeof job?.req_years_max === "number" ? job.req_years_max : null;

  if (reqMin === null) {
    return {
      score: 0.5,
      status: "unspecified",
      user_years: userYears,
      required_min: null,
    };
  }

  if (userYears >= reqMin) {
    // In range or above. Linear bonus for being closer to min (don't
    // over-reward 20-yr veterans for 2-yr-min jobs — they're overqualified).
    if (reqMax !== null && userYears > reqMax + 2) {
      return {
        score: 0.7,
        status: "above_max",
        user_years: userYears,
        required_min: reqMin,
      };
    }
    return {
      score: 1.0,
      status: "in_range",
      user_years: userYears,
      required_min: reqMin,
    };
  }

  // Below min — linear penalty, floor at 0.25 (we still score "1y vs 3y
  // required" higher than "0y vs 5y required").
  const gap = reqMin - userYears;
  const penaltyScore = Math.max(0.25, 1 - gap * 0.2);
  return {
    score: penaltyScore,
    status: "below",
    user_years: userYears,
    required_min: reqMin,
  };
}

// ─── Education axis ────────────────────────────────────────────────────
// Per-spec: req_education_strict → heavy penalty (not hard exclusion).
// Equivalent-experience counts via qualification_level when not strict.
function computeEducationAxis(profile, educations, job) {
  const reqLevels = Array.isArray(job?.req_education_levels)
    ? job.req_education_levels
    : [];
  const reqStrict = job?.req_education_strict === true;

  if (reqLevels.length === 0) {
    return { score: 0.5, match: "unspecified" };
  }

  const userLevels = (Array.isArray(educations) ? educations : [])
    .map((e) =>
      (e?.degree_level || "").toString().toLowerCase().replace(/\s+/g, "_"),
    )
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
    return { score: 0.3, match: "gap_strict" };
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
  const floor = getStageFloorByLevel()[userLevel] ?? -Infinity;

  if (reqRank > ceiling) {
    // Above ceiling — not viable today.
    return { score: 0.25, match: "above_ceiling" };
  }
  if (reqRank < floor) {
    // D1 (QA2): below floor — too junior for the user's stage (over-qualified).
    // Symmetric to above_ceiling. floor=0 for early_career, so this never fires
    // for students (their entry/intern jobs stay in range).
    return { score: 0.25, match: "below_floor" };
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
export function scoreJobFit(input, job, opts = {}) {
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

  const conf =
    typeof job?.extraction_confidence === "number"
      ? job.extraction_confidence
      : null;

  // Component 1 (confidence-aware ranking) lives on attainability_score — the
  // for-you-feed's canonical sort+display+band number (Option A) — NOT here.
  // fit_score is the Search-tab number and keeps only the legacy binary
  // softener. match_confidence is populated in the attainability block below
  // (stays null when the flag is off).
  let match_confidence = null;
  if (conf !== null && conf < 0.4) {
    // Extraction confidence modifier (legacy): sparse JD extraction is
    // unreliable, soften 10% so we don't show a confident match on shaky data.
    fit_score = fit_score * 0.9;
  }

  fit_score = Math.max(0, Math.min(1, fit_score));

  // Seniority hard-cap to track_3 when the role is above stage ceiling —
  // even a 100% skill match on a Senior role isn't viable for a student.
  // This branch stays stage-relative (any user, any rank > their ceiling).
  //
  // Seniority "stretch" routing — MID_CAREER ONLY. The role's req_seniority
  // sits at the user's STAGE_T1_CEILING. The seniority axis only weighs 10%
  // of the composite, so without a hard route a strong-skill / on-domain
  // stretch Senior role would land in track_1, contradicting Roadmap's
  // track_3 placement for the same title. Route by goal alignment:
  //   on-goal stretch  (function_family ↔ primary_domain)  → track_3
  //   off-goal / unknown                                   → track_2
  //
  // Scoped to mid_career to avoid gutting early_career's Track 1 sweet
  // spot: early ceiling = 1 (Entry + Entry_Mid), so a symmetric rule would
  // demote Entry_Mid roles for fresh-grads to T3/T2 — leaving only pure
  // Entry as plausible Track 1, which strips the pilot's core fresh-grad
  // cohort of the at-ceiling roles they CAN realistically get. early_career
  // is already protected by the existing above_ceiling branch (rank > 1).
  // senior_career stretch (VP) is so rare in the IL corpus it's not worth
  // a separate route — composite handles it.
  //
  // Unconditional within mid_career — does NOT gate on fit_score; recruiters
  // auto-filter on seniority signals regardless of skill strength. Lands
  // before applyYearsCap so a thin years gap can still downgrade further.
  let track;
  if (seniority.match === "above_ceiling") {
    track = "track_3";
  } else if (seniority.match === "stretch" && userLevel === "mid_career") {
    track = family.match === true ? "track_3" : "track_2";
  } else {
    track = trackFromScore(fit_score);
  }

  // Years hard-cap (PR-H.2) — recruiters auto-filter on years. The years
  // axis only docks ~0.12 from fit_score (0.20 weight × max swing), so
  // we layer a hard track downgrade for big gaps. Mirrors the seniority
  // ceiling pattern. See applyYearsCap docstring for the rule.
  track = applyYearsCap(track, years.user_years, years.required_min);

  // ─── ADDITIVE: relevance_match + attainability_score + attainability_band ─
  //
  // Read by the Jobs page when ?flag=jobs_unified_list=1 is set (PR #393).
  // EXISTING fit_score / track / signals / goal_alignment_score / reasoning
  // are byte-unchanged so Tracker, Home, Career, scoreApplication, and any
  // other consumer that reads the legacy contract stays unaffected.
  //
  // relevance_match GATES feed membership in the unified list:
  //   "primary"  → job.function_family ∈ DOMAIN_TO_FAMILIES[user.primary_domain]
  //   "adjacent" → job.function_family ∈ FAMILY_ADJACENCY[user.primary_domain]
  //   "unknown"  → job.function_family IS NULL (35% of jobs have no
  //                extracted family; surface them last rather than drop)
  //   "off"      → off-path family; DROPPED from the unified feed
  //
  // attainability_score = existing composite math MINUS the function_family
  // axis, with weights renormalized so the remaining 4 axes sum to 1.0.
  // ATTAINABILITY_WEIGHTS in track-scoring-constants.ts. The 10% removed
  // is now expressed via the relevance gate + per-card "on your goal path"
  // tag rather than blended into the rank-driving number.
  //
  // attainability_band labels the score for the per-card "how you stack
  // up" UI. Thresholds in ATTAINABILITY_BAND_THRESHOLDS are placeholders
  // to validate against the prod gated histogram before flipping default.
  const domain = String(profile?.primary_domain || "").toLowerCase();
  let relevance_match = "off";
  if (!job?.function_family) {
    relevance_match = "unknown";
  } else if (getDomainFamiliesSet()[domain]?.has(job.function_family)) {
    relevance_match = "primary";
  } else if (getFamilyAdjacencySet()[domain]?.has(job.function_family)) {
    relevance_match = "adjacent";
  } else if (
    // Early-career business widening (jobs-early-career-gate). GTM/business
    // roadmap roles (Sales, Support, Marketing, CS…) are real entry points
    // for early-career users but fall outside their narrow primary
    // adjacency; let them through as "adjacent" (sort below primary) so the
    // feed fills with relevant business roles instead of the thin
    // exact-domain slice. Triggered on early_career ALONE — the supply is
    // already title-bounded to the user's career_roles, so a business family
    // only appears when the roadmap contains roles of that family (a
    // higher-fidelity signal than the coarse primary_domain tag). Mid/senior
    // keep the tight gate; off-domain noise (Manufacturing/IT_Security/etc.)
    // is not in the family set, so it stays "off".
    userLevel === "early_career" &&
    getEarlyCareerBusinessFamiliesSet().has(job.function_family)
  ) {
    relevance_match = "adjacent";
  }

  let attainability_score =
    skill.score * ATTAINABILITY_WEIGHTS.skill +
    years.score * ATTAINABILITY_WEIGHTS.years +
    education.score * ATTAINABILITY_WEIGHTS.education +
    seniority.score * ATTAINABILITY_WEIGHTS.seniority;
  // Component 1: confidence-aware ranking (flag-gated), on the for-you-feed's
  // canonical score. When ON, shrink toward a neutral prior in proportion to
  // how thin/generic/low-coverage the evidence is — a graded successor to the
  // binary <0.4 softener, which it subsumes (extraction is one of its factors).
  // When OFF, the legacy binary softener runs and live behavior is byte-identical.
  if (opts.confidenceAware) {
    match_confidence = matchConfidence(skill, job, conf);
    attainability_score =
      CONF.neutral + (attainability_score - CONF.neutral) * match_confidence;
  } else if (conf !== null && conf < 0.4) {
    attainability_score = attainability_score * 0.9;
  }
  attainability_score = Math.max(0, Math.min(1, attainability_score));
  attainability_score = Math.round(attainability_score * 100) / 100;

  let attainability_band;
  if (attainability_score >= ATTAINABILITY_BAND_THRESHOLDS.strong)
    attainability_band = "strong";
  else if (attainability_score >= ATTAINABILITY_BAND_THRESHOLDS.good)
    attainability_band = "good";
  else if (attainability_score >= ATTAINABILITY_BAND_THRESHOLDS.stretch)
    attainability_band = "stretch";
  else attainability_band = "reach";

  // Above-ceiling soft gate (PR #393 follow-up). The seniority axis only
  // contributes 0.115 of the attainability score — a strong skill match on
  // a Senior role lands ~0.086 docked, not enough to sink it. The
  // stretch-aware RPC widening (level + 1 step up) is intentional, so we
  // keep these jobs IN the feed, but cap the BAND so they never get
  // labelled "strong" or "good". They surface as "stretch" — honestly
  // labelled, ranked below in-range alternatives via the band-sort UI.
  // Same failure pattern the family weight fix addressed; same fix
  // approach (gate on the categorical signal, don't lean on the weight).
  if (
    seniority.match === "above_ceiling" &&
    (attainability_band === "strong" || attainability_band === "good")
  ) {
    attainability_band = "stretch";
  }

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
  if (
    job?.function_family &&
    getDomainFamiliesSet()[String(profile?.primary_domain || "").toLowerCase()]
  ) {
    goal_alignment_score = family.match ? 1.0 : 0.35;
  }

  return {
    fit_score: Math.round(fit_score * 100) / 100,
    goal_alignment_score,
    track,
    // PR #393: additive fields for the Jobs unified-list. Consumers that
    // read only fit_score/track/signals are unaffected.
    relevance_match,
    attainability_score,
    attainability_band,
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
      // Phase 0: fraction of the JD's extracted skills that resolved to a
      // library ID. Low => our library does not cover this role's domain, so
      // the skill axis (and the composite) are unreliable. Passed through for
      // the display gate; the scoring math above is unchanged.
      skill_coverage_ratio:
        typeof job?.skill_coverage_ratio === "number"
          ? job.skill_coverage_ratio
          : null,
      match_confidence, // Component 1: null when flag off, else the [0,1] shrink factor
      user_level: userLevel,
      user_stage: EXPERIENCE_LEVEL_TO_STAGE[userLevel] || null,
    },
    reasoning: { strengths, gaps },
  };
}

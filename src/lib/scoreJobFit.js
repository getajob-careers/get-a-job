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

// ── Component 2a: must-have weighting (flag-gated, default off) ───────────────
// The legacy skill axis is a plain hit ratio (matchedCore / core.length), so a
// match on ONE core skill against a 1-core JD maxes the axis (=1.0) - even when
// that core is a generic competency (analytical_thinking). The 160-label
// baseline shows this is the single largest BAD driver: matched_core≤1 is ~59%
// BAD, a lone-generic core signature is 64% BAD (53% of all BADs), while a
// distinctive multi-core match is 30-41% GOOD. 2a reshapes the CORE portion of
// the skill axis so (a) missing must-haves costs more than the ratio implies,
// (b) a distinctive core counts more than a generic one, and (c) the axis does
// NOT saturate on a single thin match (absolute distinctive-evidence ramp).
// Acts ONLY on attainability_score (the for-you feed's canonical number) via a
// separate `score_musthave`; fit_score keeps the legacy hit ratio. Constants
// tuned against the pinned labels (harness), not by eye. See docs/eval.
const MUSTHAVE = {
  // A generic core counts this fraction of a distinctive core in the coverage
  // ratio (both numerator when matched and denominator as a requirement).
  genericWeight: 0.35,
  // Distinctive-evidence multiplier by count of DISTINCTIVE cores matched.
  // 0 distinctive matched -> hard floor (lone-generic / no-distinctive match,
  // the 64%-BAD signature); 1 -> mild guard; 2+ -> full credit so a match that
  // covers every core (incl. distinctive ones) is NOT penalized (coverageW
  // alone carries the missing-must-have penalty). Tuned on the 160 labels: a
  // steeper ramp sank a full-coverage GOOD (P09) with no BAD-in-top-5 payoff,
  // because the residual top-5 BADs are coreless (C1's shrink) or off-direction
  // (2b), not thin-distinctive - which 2a's core reshape cannot reach.
  evidenceByDistinctive: { 0: 0.15, 1: 0.85, 2: 1 },
};

// Distinctive-weighted core coverage × absolute distinctive-evidence.
// Returns [0,1]. coverageW = 1 only when every required core is matched (so a
// full match is never penalized - the asymmetry is that MISSES cost); the
// evidence ramp caps thin/generic matches so a lone generic core can't max it.
export function mustHaveCoreScore(core, userSet, params = MUSTHAVE) {
  let totalW = 0;
  let matchedW = 0;
  let distinctiveMatched = 0;
  for (const id of core) {
    const w = GENERIC_SKILLS.has(id) ? params.genericWeight : 1;
    totalW += w;
    if (userSet.has(id)) {
      matchedW += w;
      if (!GENERIC_SKILLS.has(id)) distinctiveMatched++;
    }
  }
  const coverageW = totalW > 0 ? matchedW / totalW : 0;
  const evidence =
    distinctiveMatched >= 3
      ? 1
      : (params.evidenceByDistinctive[distinctiveMatched] ?? 1);
  return clamp01(coverageW * evidence);
}

// ── Component 2b: direction-aware blend (flag-gated, default off) ─────────────
// attainability_score answers "can this person do the job mechanically" and by
// design (#393) EXCLUDES function_family, so the for-you sort is direction-blind:
// a high-attainability off-direction job outranks an on-direction one (Eli's
// live top: a Product-target user's Helfy PM sank below six adjacent
// CSM/SDR/Marketing roles). rank_score reintroduces direction into the SORT ONLY
// (not the displayed attainability badge - Option B keeps that pure): a soft
// multiplicative boost for on-direction (primary) roles. NOT hard tier-first
// (all-primary-above-all-adjacent was the pre-#585 "75% below 21%" failure) - a
// blend so a primary GOOD generally clears the adjacent block without burying a
// genuinely stronger adjacent match. w tuned on the 160 labels + the live ELI
// full-candidate Helfy test (docs/eval): w=0.25 lifts Helfy above the whole
// wrong-direction block while a weak (~55%) primary stays down.
const DIRECTION = { w: 0.25 };

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
// mhParams: when non-null (Component 2a flag on), also computes a reshaped
// `score_musthave` used by attainability_score. The legacy `score` is always
// returned unchanged so fit_score (the Search-tab number) stays flag-independent.
function computeSkillAxis(userCanonical, job, mhParams = null) {
  const core = Array.isArray(job?.req_skills_core) ? job.req_skills_core : [];
  const nice = Array.isArray(job?.req_skills_nice) ? job.req_skills_nice : [];
  const userSet = new Set(Array.isArray(userCanonical) ? userCanonical : []);

  // When the JD has no extracted skill requirements, we can't meaningfully
  // measure overlap. Neutral score (don't penalize) — these jobs lean on
  // other axes (years, family, seniority).
  if (core.length === 0 && nice.length === 0) {
    return {
      score: 0.5,
      score_musthave: null, // no requirements to reshape; leans on other axes
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

  // Component 2a: reshape the CORE portion (distinctive-weighted coverage that
  // does not saturate on a lone thin match), keep the same 2:1 core:nice blend.
  // Only cores are must-haves, so a coreless JD leaves score_musthave null and
  // attainability falls back to the legacy score.
  let score_musthave = null;
  if (mhParams && core.length > 0) {
    const coreScore = mustHaveCoreScore(core, userSet, mhParams);
    score_musthave = clamp01(
      niceRatio === null ? coreScore : (coreScore * 2 + niceRatio) / 3,
    );
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    score_musthave,
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

  // Component 2a (must-have weighting) flag. opts.mustHave may be `true` (use
  // the tuned MUSTHAVE defaults) or a params object (harness sweeps the curve).
  // Off => computeSkillAxis leaves score_musthave null and attainability is
  // byte-identical to the legacy path.
  const mhParams = opts.mustHave
    ? opts.mustHave === true
      ? MUSTHAVE
      : opts.mustHave
    : null;

  const skill = computeSkillAxis(userCanonical, job, mhParams);
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

  // Component 2a acts INSIDE attainability_score (the canonical for-you number):
  // when the flag is on, the reshaped must-have skill axis replaces the legacy
  // hit ratio here only. fit_score above keeps skill.score untouched.
  const attainSkill = skill.score_musthave ?? skill.score;
  let attainability_score =
    attainSkill * ATTAINABILITY_WEIGHTS.skill +
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

  // Component 2b: rank_score is the for-you feed SORT key. It equals
  // attainability_score with the flag off (sort byte-identical to legacy), and
  // applies the direction boost when on. opts.directionBlend may be `true` (use
  // DIRECTION.w) or a params object (harness sweeps w). The feed still SECTIONS
  // by attainability_band and DISPLAYS attainability_score - only the ordering
  // within/across the gated set consults direction (Option B).
  const directionW = opts.directionBlend
    ? opts.directionBlend === true
      ? DIRECTION.w
      : (opts.directionBlend.w ?? DIRECTION.w)
    : 0;
  const rank_score =
    Math.round(
      attainability_score *
        (1 + directionW * (relevance_match === "primary" ? 1 : 0)) *
        10000,
    ) / 10000;

  // Reasoning strings — short, actionable phrases the UI surfaces.
  const strengths = [];
  const gaps = [];
  // Skill-match chip. A bare "100% skill match" is dishonest on a thin-spec job
  // (1 listed skill the user happens to have reads as a perfect match). Honest-
  // labels flag (opts.honestLabels): show the matched-of-listed COUNT instead of
  // the percentage, so "1 of 1 listed skills" exposes the thin spec. Same >=60%
  // trigger, display copy only - no score/band/rank change. Flag off => byte-
  // identical percentage string.
  if (skill.skill_match_pct !== null && skill.skill_match_pct >= 60) {
    if (opts.honestLabels) {
      const listed =
        skill.matched_skills.length + skill.missing_core_skills.length;
      strengths.push(
        `${skill.matched_skills.length} of ${listed} listed skill${listed === 1 ? "" : "s"}`,
      );
    } else {
      strengths.push(`${skill.skill_match_pct}% skill match`);
    }
  }
  if (skill.matched_skills.length >= 3) {
    strengths.push(`${skill.matched_skills.length} matching skills`);
  }
  // "Experience matches" is field-blind: the years axis compares TOTAL years to
  // req_years_min with no family filter, so an off-goal-path role the user has zero
  // field experience in still earns this chip (the field-mismatch audit's "100%
  // experience match on a different profession"). Display-only honest-labels flag
  // (opts.honestLabels): only claim an experience match on the user's goal path
  // (relevance_match === "primary"). No score/band/rank changes - just this string.
  if (
    years.status === "in_range" &&
    (!opts.honestLabels || relevance_match === "primary")
  )
    strengths.push("Experience matches");
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
    rank_score,
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

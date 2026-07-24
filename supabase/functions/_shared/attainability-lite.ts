// attainability-lite.ts — a TRANSPARENT server-side approximation of the client
// scorer's `attainability_score` (src/lib/scoreJobFit.js), for the job-match
// digest ONLY. The real scorer is client-side (pulls the skill/role graph, domain
// relevance gating, confidence shrink, must-have reshaping) and is not importable
// server-side. This proxy reuses the SAME weights + band thresholds
// (_shared/track-scoring-constants.ts) over the job's already-extracted fields, so
// the digest ranks by the same axes and the same GOOD bar (0.42).
//
// KNOWN divergence from the client scorer (declared in the PR; validated by Eli
// against the dry-run samples before any send is enabled): no domain-family
// relevance gating, no confidence-aware shrink, no skill-graph adjacency — years
// is proxied from qualification_level (there is no profile years column). This is
// good enough to RANK and to apply a GOOD-tier bar for a dry-run digest; it is not
// claimed to be byte-identical to the for-you feed number.

import {
  ATTAINABILITY_WEIGHTS,
  ATTAINABILITY_BAND_THRESHOLDS,
} from "./track-scoring-constants.ts";

export interface ProfileForScore {
  skills_canonical?: unknown;
  qualification_level?: string | null;
  education_level?: string | null;
}

export interface JobForScore {
  req_skills_must_have?: unknown;
  req_skills_core?: unknown;
  req_years_min?: number | null;
  req_seniority?: string | null;
  seniority?: string | null;
  req_education_levels?: unknown;
}

const asIdSet = (v: unknown): Set<string> => {
  if (!Array.isArray(v)) return new Set();
  return new Set(v.map((x) => String(x).trim().toLowerCase()).filter(Boolean));
};

// Coarse ordinal ranks, case-insensitive, for education + seniority axes.
const SENIORITY_RANK: Record<string, number> = {
  intern: 0, entry: 1, junior: 1, associate: 1,
  mid: 2, intermediate: 2, "mid-level": 2,
  senior: 3, sr: 3,
  lead: 4, staff: 4, principal: 4,
  manager: 5, director: 5, head: 5, vp: 6, executive: 6,
};
const EDUCATION_RANK: Record<string, number> = {
  highschool: 1, "high school": 1, high_school: 1,
  associate: 2, diploma: 2,
  bachelor: 3, ba: 3, bsc: 3, "b.sc": 3, undergraduate: 3,
  master: 4, ma: 4, msc: 4, "m.sc": 4, mba: 4, graduate: 4,
  phd: 5, doctorate: 5, doctoral: 5,
};
// Years implied by the qualification bucket (no profile years column exists);
// mirrors the inferExperienceLevel thresholds (~3 / ~8 yr tiers).
const QUAL_YEARS: Record<string, number> = {
  intern: 0, entry: 1, junior: 1.5, associate: 1.5,
  mid: 4, intermediate: 4,
  senior: 8, lead: 10, staff: 10, principal: 12,
  manager: 10, director: 14,
};

const rank = (map: Record<string, number>, v: unknown): number | null => {
  const k = String(v ?? "").trim().toLowerCase();
  if (!k) return null;
  if (k in map) return map[k];
  // loose contains match (e.g. "Senior Software Engineer" seniority strings)
  for (const key of Object.keys(map)) if (k.includes(key)) return map[key];
  return null;
};

export interface AttainabilityResult {
  score: number; // 0..1, rounded to 2dp
  band: "strong" | "good" | "stretch" | "reach";
  skillCoverage: number;
}

export function scoreAttainabilityLite(
  profile: ProfileForScore,
  job: JobForScore,
): AttainabilityResult {
  const userSkills = asIdSet(profile.skills_canonical);

  // Skill axis (0.55): must-have coverage if the job has must-haves, else core.
  const reqSkills = ((): Set<string> => {
    const mh = asIdSet(job.req_skills_must_have);
    return mh.size > 0 ? mh : asIdSet(job.req_skills_core);
  })();
  let skillCoverage = 1; // no stated requirements → not a skill barrier
  if (reqSkills.size > 0) {
    let hit = 0;
    for (const s of reqSkills) if (userSkills.has(s)) hit++;
    skillCoverage = hit / reqSkills.size;
  }

  // Years axis (0.22): proxied user years (from qualification_level) vs req_years_min.
  const userYears = rank(QUAL_YEARS, profile.qualification_level) ?? 2;
  const reqYears = typeof job.req_years_min === "number" ? job.req_years_min : 0;
  const yearsAxis = reqYears > 0 ? Math.min(1, userYears / reqYears) : 1;

  // Education axis (0.115): user level >= any required level → 1, some req but
  // below → 0.5, no req → 1.
  const userEdu = rank(EDUCATION_RANK, profile.education_level);
  const reqEduRanks = (Array.isArray(job.req_education_levels) ? job.req_education_levels : [])
    .map((e) => rank(EDUCATION_RANK, e))
    .filter((n): n is number => n !== null);
  let eduAxis = 1;
  if (reqEduRanks.length > 0) {
    const need = Math.min(...reqEduRanks);
    eduAxis = userEdu !== null && userEdu >= need ? 1 : 0.5;
  }

  // Seniority axis (0.115): exact/over → 1, one step off → 0.6, else 0.2, no req → 0.7.
  const userSen = rank(SENIORITY_RANK, profile.qualification_level);
  const reqSen = rank(SENIORITY_RANK, job.req_seniority ?? job.seniority);
  let senAxis = 0.7;
  if (reqSen !== null) {
    if (userSen === null) senAxis = 0.5;
    else if (userSen >= reqSen) senAxis = 1;
    else senAxis = reqSen - userSen === 1 ? 0.6 : 0.2;
  }

  let score =
    skillCoverage * ATTAINABILITY_WEIGHTS.skill +
    yearsAxis * ATTAINABILITY_WEIGHTS.years +
    eduAxis * ATTAINABILITY_WEIGHTS.education +
    senAxis * ATTAINABILITY_WEIGHTS.seniority;
  score = Math.max(0, Math.min(1, score));
  score = Math.round(score * 100) / 100;

  let band: AttainabilityResult["band"];
  if (score >= ATTAINABILITY_BAND_THRESHOLDS.strong) band = "strong";
  else if (score >= ATTAINABILITY_BAND_THRESHOLDS.good) band = "good";
  else if (score >= ATTAINABILITY_BAND_THRESHOLDS.stretch) band = "stretch";
  else band = "reach";

  return { score, band, skillCoverage: Math.round(skillCoverage * 100) / 100 };
}

export const GOOD_TIER_BAR = ATTAINABILITY_BAND_THRESHOLDS.good; // 0.42

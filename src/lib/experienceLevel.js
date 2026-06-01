// Frontend mirror of inferExperienceLevel() from generate-career-analysis.
//
// ⚠️ DRIFT WARNING ⚠️
// This algorithm is duplicated in two places. Keep them in sync:
//   1. supabase/functions/generate-career-analysis/index.ts (Deno)
//   2. src/lib/experienceLevel.js                            (this file, Node/Vite)
//
// The drift test in src/test/experienceLevel.test.js asserts that a small
// fixture produces identical answers between the two implementations.
// If you change either side, update the other and bump that test.
//
// Long-term: collapse into a single Postgres RPC `derive_experience_level()`
// so both surfaces hit one source of truth. Out of scope for the current
// seniority-filter PR.

import { isCurrentlyStudent } from "@/lib/educationPolicy";

// Career-countable experience types. Military, volunteering, leadership
// (student clubs etc.), academic projects do NOT count toward seniority.
// Part-time IS counted as of 2026-05-27: the prior rationale ("students hold
// part-time school jobs that shouldn't push them out of early-career") was
// over-fitted — the seniority ceiling already prevents juniors from seeing
// Mid+ roles in Track 1, so years calc doesn't need to gatekeep too. Real
// users with target-domain part-time roles (e.g. a CSM-aspirant doing
// part-time CS work) were getting zero credit, dropping their fit_score
// composite enough to fail Track 1 on otherwise-qualifying jobs.
const CAREER_COUNTABLE_TYPES = new Set(["internship", "full_time", "freelance", "part_time", "founder"]);

// Narrower set used by inferQualificationLevel — internships are training,
// not qualifying career work (the "PR #60 line"). Volunteer / military /
// leadership stay out for the same reason. Founder is included: real work
// of any commitment counts toward qualification, with depth handled by
// duration rather than type-discount.
const QUAL_COUNTABLE_TYPES = new Set(["full_time", "part_time", "freelance", "founder"]);

// Pull a 4-digit year from a date string. Returns null when nothing matches.
function yearFromDate(s) {
  if (!s) return null;
  const m = String(s).match(/\b(19|20)\d{2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

// Reclassify experience type when the stored value is missing or wrong
// (legacy CV-extraction rows often stamp everything "full_time"). Same
// patterns as the Deno reinferType() — military / volunteer / internship
// / freelance / student-leadership detection by title + responsibilities.
export function reinferType(exp) {
  const stored = String(exp?.type ?? "").toLowerCase();
  const text = `${exp?.title || ""} ${exp?.company || ""} ${
    Array.isArray(exp?.responsibilities)
      ? exp.responsibilities.join(" ")
      : exp?.responsibilities || ""
  }`.toLowerCase();

  if (
    /\b(idf|nahal|givati|golani|paratroopers|sayeret|matkal|shaldag|duvdevan|kfir|unit 8200|\b8200\b|mamram|talpiot|israeli? defense forces|military service|army|idf reserves|soldier|officer training|bahad)\b/.test(
      text,
    )
  )
    return "military";
  if (/\b(volunteer|volunteering|pro bono|mentor(ed|ing)? at)\b/.test(text)) return "volunteer";
  if (/\b(intern|internship)\b/.test(text)) return "internship";
  if (/\b(freelance|freelancer|self-employed|contractor|consultant)\b/.test(text)) return "freelance";
  if (
    /\b(president|captain|chair|founder|co-founder|team lead(er)?)\b/.test(text) &&
    /\b(club|society|association|student|chapter)\b/.test(text)
  )
    return "leadership";
  // Real-company founders / self-employed (not student-club leadership,
  // which the check above catches first). Keeps "Founder of X" as
  // qual-countable instead of misclassifying it as full_time or leadership.
  if (/\b(founder|co-?founder|self-?employed|ceo)\b/.test(text)) return "founder";

  return stored || "full_time";
}

// Sum years of career-countable experience. Open-ended rows (is_current or
// "present" / "current" in end_date) count up to the current calendar year.
export function totalYearsOfExperience(experiences) {
  const now = new Date().getFullYear();
  let total = 0;
  for (const exp of experiences || []) {
    const t = reinferType(exp);
    if (!CAREER_COUNTABLE_TYPES.has(t)) continue;
    const start = yearFromDate(exp.start_date);
    if (start === null) continue;
    const endRaw = String(exp.end_date ?? "").toLowerCase();
    const isCurrent =
      exp.is_current || !endRaw || endRaw.includes("present") || endRaw.includes("current");
    const end = isCurrent ? now : yearFromDate(exp.end_date) ?? now;
    total += Math.max(0, end - start);
  }
  return total;
}

// Map raw experiences + education to the three-bucket experience level the
// rest of the platform reasons about.
//   early_career  — current student OR < 3 yrs career-countable experience
//   mid_career    — 3 ≤ years < 8
//   senior_career — years ≥ 8
//
// `educations` is the user's education table rows (Phase B layout). If
// you have profile rows shaped as `{education: [...]}` instead, pass
// profile.education.
export function inferExperienceLevel(experiences, educations) {
  const years = totalYearsOfExperience(experiences);
  const explicitStudent = isCurrentlyStudent(educations || []);
  if (explicitStudent || years < 3) return "early_career";
  if (years < 8) return "mid_career";
  return "senior_career";
}

// Qualification level (Junior / Mid-Level / Senior) — used by the
// career-analysis edge function for prompt context. DIFFERENT axis from
// inferExperienceLevel:
//   * inferExperienceLevel uses CAREER_COUNTABLE_TYPES (includes
//     internship) and gates the years-tier used for jobs.seniority
//     filtering. Has an isCurrentlyStudent shortcut.
//   * inferQualificationLevel uses QUAL_COUNTABLE_TYPES (excludes
//     internship; the "PR #60 line" — internships are training, not
//     qualifying career work). NO student shortcut on purpose: a
//     currently-enrolled student with 4 years of full_time work
//     should read as Mid-Level by duration.
//
// Thresholds (3 / 8 years) are intentionally identical to
// inferExperienceLevel so the two functions stay aligned at the
// year-range level — divergence comes from the countable-set difference.
//
// managed_people bumps the duration-derived level up exactly one tier
// (Junior→Mid-Level, Mid-Level→Senior, Senior stays), and only when the
// row that carries managed_people=true has ≥1 year of parseable
// duration. A 0-year managed row bumps nobody.
//
// Known limitation (not addressed this PR): per-row spans are summed
// naively, so two concurrent roles double-count. Depth/overlap will be
// addressed in a follow-up.
//
// ⚠️ DRIFT WARNING — duplicate logic lives in
// supabase/functions/generate-career-analysis/index.ts inferQualificationLevel().
// The drift test in src/test/experienceLevel.test.js covers both.
export function inferQualificationLevel(experiences) {
  const now = new Date().getFullYear();
  let years = 0;
  let hasManagedWithDuration = false;
  for (const exp of experiences || []) {
    const t = reinferType(exp);
    if (!QUAL_COUNTABLE_TYPES.has(t)) continue;
    const start = yearFromDate(exp.start_date);
    if (start === null) continue;
    const endRaw = String(exp.end_date ?? "").toLowerCase();
    const isCurrent =
      exp.is_current || !endRaw || endRaw.includes("present") || endRaw.includes("current");
    const end = isCurrent ? now : yearFromDate(exp.end_date) ?? now;
    const dur = Math.max(0, end - start);
    years += dur;
    if (exp.managed_people && dur >= 1) hasManagedWithDuration = true;
  }
  // Duration-derived base level.
  let base;
  if (years >= 8) base = "Senior";
  else if (years >= 3) base = "Mid-Level";
  else base = "Junior";
  // managed_people bumps exactly one tier (cap at Senior).
  if (hasManagedWithDuration) {
    if (base === "Junior") return "Mid-Level";
    if (base === "Mid-Level") return "Senior";
  }
  return base;
}

// Allowed jobs.seniority values per experienceLevel. Locked in 2026-05-20:
//   early_career  → entry, mid
//   mid_career    → mid, senior
//   senior_career → senior, lead, director, executive
//
// `staff` was specced but doesn't exist as a value in jobs.seniority —
// the field has six values (entry / mid / senior / lead / director /
// executive). Confirmed against live data 2026-05-20.
export function allowedSenioritiesForLevel(experienceLevel) {
  switch (experienceLevel) {
    case "early_career":
      return ["entry", "mid"];
    case "mid_career":
      return ["mid", "senior"];
    case "senior_career":
      return ["senior", "lead", "director", "executive"];
    default:
      // Defensive: unknown level → most permissive. Avoids breaking the
      // UI if a future ExperienceLevel value gets added without an entry
      // here.
      return ["entry", "mid", "senior", "lead", "director", "executive"];
  }
}

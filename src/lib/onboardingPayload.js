// Pure data + pure functions shared between Onboarding.jsx and the test
// suite. Lifted out of Onboarding.jsx so the logic can be tested directly
// instead of via a stale inline stub (audit finding U1).
//
// Anything imported here MUST stay React-free — no hooks, no JSX, no
// Supabase client. The test suite runs without those.

// Allowed experience types — mirrors the prompt's "EXPERIENCE TYPE
// CLASSIFICATION" rules in StepResumeUpload.jsx and the values written to
// experiences.type column.
export const ALLOWED_EXPERIENCE_TYPES = new Set([
  "internship", "full_time", "part_time", "freelance", "volunteer", "leadership", "military",
]);

// Guess an experience type from extractor hints + free-text keywords.
//
// Order matters here. We've seen the LLM affirmatively return wrong types
// (e.g. "Volunteer Educator & Mentor" classified as "part_time"). The
// solution is title-keyword OVERRIDES that fire BEFORE we trust the LLM's
// hint — title-only checks (not full text) keep false positives low while
// catching the common cases where the title itself signals the type.
//
// Military uses full-text matching because the signal often lives in the
// company name (e.g. "Nahal Brigade" / "IDF") rather than the title.
export function inferExperienceType(e) {
  const title = (e?.title || "").toLowerCase();
  const text = `${e?.title || ""} ${e?.company || ""} ${e?.description || ""} ${Array.isArray(e?.responsibilities) ? e.responsibilities.join(" ") : (e?.responsibilities || "")}`.toLowerCase();

  // Strong overrides — fire BEFORE trusting the LLM's hint.
  if (/\b(idf|nahal|givati|golani|paratroopers|sayeret|israeli? defense forces|military service|combat soldier|combat medic|officer training|unit 8200|mamram|talpiot|havatzalot)\b/.test(text)) {
    return "military";
  }
  if (/\bvolunteer\b/.test(title)) return "volunteer";
  if (/\b(intern|internship)\b/.test(title)) return "internship";
  if (/\b(freelance|freelancer|self-?employed)\b/.test(title)) return "freelance";

  // Trust the LLM's hint if it's a valid enum value.
  const hinted = String(e?.type || e?.employment_type || "").toLowerCase().replace(/\s|-/g, "_");
  if (ALLOWED_EXPERIENCE_TYPES.has(hinted)) return hinted;

  // Final fallback — weaker full-text keyword inference for cases the LLM
  // omitted a hint entirely.
  if (/\b(intern|internship)\b/.test(text)) return "internship";
  if (/\b(volunteer|volunteering|pro bono)\b/.test(text)) return "volunteer";
  if (/\b(freelance|freelancer|self-employed|contractor|consultant)\b/.test(text)) return "freelance";
  if (/\b(president|captain|head of club|founder|co-founder|team lead(er)?)\b/.test(text) && /\b(club|society|association|student|chapter)\b/.test(text)) return "leadership";
  if (/\b(part.time|parttime)\b/.test(text)) return "part_time";
  return "full_time";
}

// Initial shape for the React profile state during onboarding. Field defaults
// are deliberately the right TYPE for the corresponding DB column (text[] →
// [], jsonb → null/[], text → "", boolean → false). Auto-save sends the
// payload to Postgres; getting the type wrong here makes PostgREST reject the
// row update with "malformed array literal" or similar.
// Education fields previously lived here (degree, field_of_study,
// education_level, education_dates, secondary_education, gpa, honors,
// relevant_coursework, academic_projects, education_institution).
// Phase B (2026-05-14) moved them to the education table — see the
// `educations` state in Onboarding.jsx and the education tab in
// AddInformation.jsx. languages stays on profiles (person-level, not
// tied to a specific degree).
export const EMPTY_PROFILE = {
  full_name: "",
  phone_number: "",
  summary: "",
  linkedin_url: "",
  resume_url: "",
  languages: [],
  // skills is the single flat array — categories were dropped (Bug 3 fix).
  // The CV extractor and StepSkills both write directly here. The career
  // analysis edge function reads only this field; categories never had a
  // persistence target.
  skills: [],
  five_year_role: "",
  target_job_titles: [],
  target_industries: [],
  work_environment: [],
  open_to_lateral: false,
  open_to_outside_degree: false,
  location: "",
  work_type: [],
  employment_status: [],
  salary_expectation: "",
  available_start_date: "",
  biggest_challenge: [],
  job_search_efforts: "",
  role_clarity_score: null,
  cv_tailoring_strategy: "",
  linkedin_outreach_strategy: "",
  volunteering: [],
  proof_signals: [],
  primary_domain: null,
  adjacent_fields: [],
  // Practicum fields captured in StepPracticum (Wk 4). path is null when
  // user opts out; cohort is free-text and optional.
  practicum_path: null,
  practicum_cohort: "",
  // "How did you hear about us?" — captured in StepSurvey. Stored as a
  // single text value: canonical snake_case for predefined options
  // (e.g. "reichman_practicum"), or the user's free text for "Other".
  referral_source: "",
};

// Empty row used when initialising the educations state in a fresh
// onboarding session (no CV uploaded, no DB row yet). display_order=0
// marks it as the primary entry; is_current=true defaults to "still
// studying" which is the common case for our pilot audience.
export const EMPTY_EDUCATION_ROW = {
  id: undefined,           // set after first INSERT
  institution: "",
  education_level: "",
  degree_type: "",
  field_of_study: "",
  start_date: "",
  end_date: "",
  is_current: true,
  gpa: "",
  honors: [],
  relevant_coursework: [],
  academic_projects: [],
  location: "",
  display_order: 0,
};

// Whitelist + return only the fields that actually exist on the profiles DB
// table. Any field collected during onboarding that isn't a column (e.g.
// the six skill-category arrays, academic_projects, volunteering) MUST be
// excluded here — saveProgress otherwise hands them to PostgREST which
// rejects the whole row with a 400.
// Whitelist of fields that map to columns on the profiles table. Education
// fields have moved off profiles into their own table (Phase B, 2026-05-14)
// and are persisted through a separate education-table write path — they
// are intentionally NOT in this list.
import { resolveSkillList } from "./skillResolver";

export function cleanProfilePayload(data) {
  const {
    full_name, phone_number, location, linkedin_url, summary, skills, resume_url,
    languages,
    onboarding_step, onboarding_complete,
    skill_gaps, qualification_level, overall_assessment, last_reality_check_date,
    five_year_role, proof_signals, primary_domain, adjacent_fields,
    practicum_path, practicum_cohort,
    biggest_challenge, cv_tailoring_strategy, linkedin_outreach_strategy,
    role_clarity_score, job_search_efforts, referral_source,
    target_job_titles, target_industries, work_environment, work_type,
    employment_status, salary_expectation, available_start_date,
    open_to_lateral, open_to_outside_degree,
  } = data;
  // Resolve free-text skills to canonical skill_library IDs on every save.
  // Deterministic, no LLM. Feeds scoreJobFit (PR-C) and surfaces unresolved
  // phrases for alias-map growth via skills_unmapped.
  const { canonical: skills_canonical, unmapped: skills_unmapped } =
    resolveSkillList(Array.isArray(skills) ? skills : []);
  return {
    full_name, phone_number, location, linkedin_url, summary, skills, resume_url,
    skills_canonical, skills_unmapped,
    languages,
    onboarding_step, onboarding_complete,
    skill_gaps, qualification_level, overall_assessment, last_reality_check_date,
    five_year_role, proof_signals, primary_domain, adjacent_fields,
    practicum_path, practicum_cohort,
    biggest_challenge, cv_tailoring_strategy, linkedin_outreach_strategy,
    role_clarity_score, job_search_efforts, referral_source,
    target_job_titles, target_industries, work_environment, work_type,
    employment_status, salary_expectation, available_start_date,
    open_to_lateral, open_to_outside_degree,
  };
}

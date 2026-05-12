// Pure data + pure function shared between Onboarding.jsx and the test suite.
// Lifted out of Onboarding.jsx so the real cleanProfilePayload can be tested
// directly instead of via a stale inline stub (audit finding U1).
//
// Anything imported here MUST stay React-free — no hooks, no JSX, no Supabase
// client. The test suite runs without those.

// Initial shape for the React profile state during onboarding. Field defaults
// are deliberately the right TYPE for the corresponding DB column (text[] →
// [], jsonb → null/[], text → "", boolean → false). Auto-save sends the
// payload to Postgres; getting the type wrong here makes PostgREST reject the
// row update with "malformed array literal" or similar.
export const EMPTY_PROFILE = {
  full_name: "",
  phone_number: "",
  summary: "",
  linkedin_url: "",
  resume_url: "",
  degree: "",
  education_level: "",
  field_of_study: "",
  education_dates: "",
  secondary_education: null,
  languages: [],
  relevant_coursework: [],
  academic_projects: [],
  gpa: "",
  honors: [],
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
  // Education institution captured in StepEducation (added Wk 4). Drives
  // institution-aware copy in StepPracticum (Reichman vs generic framing).
  education_institution: "",
  // Practicum fields captured in StepPracticum (Wk 4). path is null when
  // user opts out; cohort is free-text and optional.
  practicum_path: null,
  practicum_cohort: "",
};

// Whitelist + return only the fields that actually exist on the profiles DB
// table. Any field collected during onboarding that isn't a column (e.g.
// the six skill-category arrays, academic_projects, volunteering) MUST be
// excluded here — saveProgress otherwise hands them to PostgREST which
// rejects the whole row with a 400.
export function cleanProfilePayload(data) {
  const {
    full_name, phone_number, location, linkedin_url, summary, skills,
    degree, field_of_study, education_level, gpa, honors, relevant_coursework, resume_url,
    // Extended education fields populated from CV extraction (N-O22→26)
    education_dates, secondary_education, languages, education_institution,
    onboarding_step, onboarding_complete,
    skill_gaps, qualification_level, overall_assessment, last_reality_check_date,
    five_year_role, proof_signals, primary_domain, adjacent_fields,
    // Practicum (Wk 4 — StepPracticum)
    practicum_path, practicum_cohort,
    // Survey fields (StepSurvey)
    biggest_challenge, cv_tailoring_strategy, linkedin_outreach_strategy,
    role_clarity_score, job_search_efforts,
    // Preference fields (StepCareerDirection + StepConstraints)
    target_job_titles, target_industries, work_environment, work_type,
    employment_status, salary_expectation, available_start_date,
    open_to_lateral, open_to_outside_degree,
  } = data;
  return {
    full_name, phone_number, location, linkedin_url, summary, skills,
    degree, field_of_study, education_level, gpa, honors, relevant_coursework, resume_url,
    education_dates, secondary_education, languages, education_institution,
    onboarding_step, onboarding_complete,
    skill_gaps, qualification_level, overall_assessment, last_reality_check_date,
    five_year_role, proof_signals, primary_domain, adjacent_fields,
    practicum_path, practicum_cohort,
    biggest_challenge, cv_tailoring_strategy, linkedin_outreach_strategy,
    role_clarity_score, job_search_efforts,
    target_job_titles, target_industries, work_environment, work_type,
    employment_status, salary_expectation, available_start_date,
    open_to_lateral, open_to_outside_degree,
  };
}

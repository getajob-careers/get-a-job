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
  "internship", "full_time", "part_time", "freelance", "volunteer", "leadership", "military", "founder",
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
  // Founder / self-employed override: fires BEFORE the freelance check so
  // "Founder" / "CEO" titles don't get caught by the broader self-employed
  // → freelance rule. Title-only to avoid matching "Co-founder of [student
  // club]", which the leadership branch handles further down.
  if (/\b(founder|co-?founder|ceo|self-?employed)\b/.test(title)) return "founder";
  if (/\b(freelance|freelancer)\b/.test(title)) return "freelance";

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
// Phase 1 capture trim (onboarding redesign): nine fields no longer
// collected in the onboarding UI. The DB columns stay — pre-trim users
// keep their values, post-onboarding profile editors (Profile.jsx) may
// still surface them — but the onboarding state shape stops carrying
// them so cleanProfilePayload can't accidentally clobber existing values
// with empty defaults on every per-step save.
//   - target_industries, work_environment, open_to_lateral,
//     open_to_outside_degree (Step 6 dead weight)
//   - available_start_date (Step 7 dead weight)
//   - linkedin_outreach_strategy, job_search_efforts, referral_source
//     (Step 8 trim to three load-bearing questions)
//   - practicum_cohort (Step 2 — practicum_path stays as the gate)
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
  location: "",
  work_type: [],
  employment_status: [],
  salary_expectation: "",
  biggest_challenge: [],
  role_clarity_score: null,
  cv_tailoring_strategy: "",
  volunteering: [],
  proof_signals: [],
  primary_domain: null,
  adjacent_fields: [],
  // Internship gate captured in StepInternship (Wk 4). practicum_cohort
  // was dropped from capture in Phase 1; only the path remains.
  practicum_path: null,
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
  // Per-education skills tagged in StepRoleSkills. Unified `skills` column —
  // same shape across all 4 entity tables. Aggregated into
  // profiles.skills_canonical at save time by cleanProfilePayload.
  skills: [],
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
import { aggregateProfileSkills } from "./skillAggregation";

// `experiences`, `educations`, `projects` are NOT columns on the profiles
// table — they live on their own tables. They're passed into
// cleanProfilePayload only to compute the union into skills_canonical;
// they get destructured off + dropped before returning. If you add more
// per-object skill sources later (certifications.skills_earned, etc.),
// thread them through here AND extend aggregateProfileSkills.
export function cleanProfilePayload(data) {
  const {
    full_name, phone_number, location, linkedin_url, summary, skills, resume_url,
    languages,
    onboarding_step, onboarding_complete,
    skill_gaps, qualification_level, overall_assessment, last_reality_check_date,
    five_year_role, proof_signals, primary_domain, adjacent_fields,
    practicum_path,
    biggest_challenge, cv_tailoring_strategy,
    role_clarity_score,
    target_job_titles, work_type,
    employment_status, salary_expectation,
    // Per-object skill sources — used for the union, not persisted on profiles.
    experiences, educations, projects,
  } = data;
  // Compute skills_canonical from the unified `skills` column on every
  // entity. The in-memory React state now uses `skills` directly (matches
  // the DB column) — no field-name translation needed.
  // resolveSkillList handles canonicalization. Deterministic, no LLM.
  const { canonical: skills_canonical, unmapped: skills_unmapped } =
    aggregateProfileSkills({
      profileSkills: Array.isArray(skills) ? skills : [],
      experiences: experiences || [],
      educations: educations || [],
      projects: projects || [],
    });
  return {
    full_name, phone_number, location, linkedin_url, summary, skills, resume_url,
    skills_canonical, skills_unmapped,
    languages,
    onboarding_step, onboarding_complete,
    skill_gaps, qualification_level, overall_assessment, last_reality_check_date,
    five_year_role, proof_signals, primary_domain, adjacent_fields,
    practicum_path,
    biggest_challenge, cv_tailoring_strategy,
    role_clarity_score,
    target_job_titles, work_type,
    employment_status, salary_expectation,
  };
}

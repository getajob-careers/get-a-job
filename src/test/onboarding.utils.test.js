import { describe, it, expect } from 'vitest';
import {
  EMPTY_PROFILE,
  EMPTY_EDUCATION_ROW,
  cleanProfilePayload,
  ALLOWED_EXPERIENCE_TYPES,
  inferExperienceType,
} from '@/lib/onboardingPayload';

// These tests now exercise the REAL cleanProfilePayload + EMPTY_PROFILE
// from src/lib/onboardingPayload.js (extracted from Onboarding.jsx as part
// of audit fix U1). The previous file held an inline stub copy that drifted
// out of sync with the production whitelist over many sessions; tests passed
// against the stub regardless of whether the real function regressed.

describe('EMPTY_PROFILE', () => {
  // Many DB columns are text[] / jsonb. Sending the wrong JS shape (e.g. ""
  // for a text[] column) makes PostgREST reject the entire row update with
  // "malformed array literal" — exactly the failure mode behind several
  // session-13 audit findings (work_environment, work_type, employment_status,
  // biggest_challenge).
  it('initialises every text[] DB column as an array', () => {
    expect(EMPTY_PROFILE.employment_status).toEqual([]);
    expect(EMPTY_PROFILE.biggest_challenge).toEqual([]);
    expect(EMPTY_PROFILE.work_environment).toEqual([]);
    expect(EMPTY_PROFILE.work_type).toEqual([]);
    expect(EMPTY_PROFILE.target_job_titles).toEqual([]);
    expect(EMPTY_PROFILE.target_industries).toEqual([]);
  });

  it('initialises jsonb columns with the correct default shape', () => {
    // arrays are valid jsonb
    expect(EMPTY_PROFILE.languages).toEqual([]);
    expect(EMPTY_PROFILE.proof_signals).toEqual([]);
    expect(EMPTY_PROFILE.adjacent_fields).toEqual([]);
  });

  it('initialises text columns as empty strings', () => {
    expect(EMPTY_PROFILE.full_name).toBe('');
    expect(EMPTY_PROFILE.phone_number).toBe('');
    expect(EMPTY_PROFILE.location).toBe('');
    expect(EMPTY_PROFILE.salary_expectation).toBe('');
    expect(EMPTY_PROFILE.cv_tailoring_strategy).toBe('');
    expect(EMPTY_PROFILE.linkedin_outreach_strategy).toBe('');
  });

  it('initialises boolean columns as false', () => {
    expect(EMPTY_PROFILE.open_to_lateral).toBe(false);
    expect(EMPTY_PROFILE.open_to_outside_degree).toBe(false);
  });

  it('initialises nullable scalar columns as null', () => {
    expect(EMPTY_PROFILE.role_clarity_score).toBeNull();
    expect(EMPTY_PROFILE.primary_domain).toBeNull();
  });

  it('keeps volunteering as an array (React state only, no DB column)', () => {
    expect(EMPTY_PROFILE.volunteering).toEqual([]);
  });

  it('does NOT carry education fields — those moved to the education table in Phase B', () => {
    expect(EMPTY_PROFILE).not.toHaveProperty('degree');
    expect(EMPTY_PROFILE).not.toHaveProperty('field_of_study');
    expect(EMPTY_PROFILE).not.toHaveProperty('education_level');
    expect(EMPTY_PROFILE).not.toHaveProperty('education_dates');
    expect(EMPTY_PROFILE).not.toHaveProperty('education_institution');
    expect(EMPTY_PROFILE).not.toHaveProperty('gpa');
    expect(EMPTY_PROFILE).not.toHaveProperty('honors');
    expect(EMPTY_PROFILE).not.toHaveProperty('relevant_coursework');
    expect(EMPTY_PROFILE).not.toHaveProperty('academic_projects');
    expect(EMPTY_PROFILE).not.toHaveProperty('secondary_education');
  });

  it('keeps languages on profiles — it is person-level, not tied to a degree', () => {
    expect(EMPTY_PROFILE.languages).toEqual([]);
  });

  it('does not carry the dropped Bug 3 skill-category arrays', () => {
    expect(EMPTY_PROFILE).not.toHaveProperty('hard_skills');
    expect(EMPTY_PROFILE).not.toHaveProperty('tools_software');
    expect(EMPTY_PROFILE).not.toHaveProperty('technical_skills');
    expect(EMPTY_PROFILE).not.toHaveProperty('analytical_skills');
    expect(EMPTY_PROFILE).not.toHaveProperty('communication_skills');
    expect(EMPTY_PROFILE).not.toHaveProperty('leadership_skills');
  });

  it('initialises skills as a single flat array (Bug 3 categories drop)', () => {
    expect(EMPTY_PROFILE.skills).toEqual([]);
  });
});

describe('EMPTY_EDUCATION_ROW', () => {
  it('has the right shape for inserting a new education row', () => {
    expect(EMPTY_EDUCATION_ROW.is_current).toBe(true);  // student default
    expect(EMPTY_EDUCATION_ROW.display_order).toBe(0);  // primary slot
    expect(EMPTY_EDUCATION_ROW.honors).toEqual([]);
    expect(EMPTY_EDUCATION_ROW.relevant_coursework).toEqual([]);
    expect(EMPTY_EDUCATION_ROW.academic_projects).toEqual([]);
    expect(EMPTY_EDUCATION_ROW.id).toBeUndefined();     // assigned on INSERT
  });
});

describe('cleanProfilePayload', () => {
  // Build a fully-populated input using EMPTY_PROFILE + a few overrides so
  // the test stays in lockstep with the schema. Adding a new field to
  // EMPTY_PROFILE no longer silently passes — if it should be persisted the
  // test below will catch the missing whitelist entry.
  const buildFullInput = (overrides = {}) => ({
    ...EMPTY_PROFILE,
    full_name: 'Isaac',
    five_year_role: 'CTO',
    skills: ['React', 'TypeScript'],
    onboarding_step: 4,
    onboarding_complete: false,
    ...overrides,
  });

  it('whitelists every column that maps to the profiles DB table', () => {
    const result = cleanProfilePayload(buildFullInput());

    // Identity + contact
    expect(result).toHaveProperty('full_name');
    expect(result).toHaveProperty('phone_number');
    expect(result).toHaveProperty('location');
    expect(result).toHaveProperty('linkedin_url');
    expect(result).toHaveProperty('summary');

    // Languages stays on profiles (person-level)
    expect(result).toHaveProperty('languages');

    // Combined skills + assessment
    expect(result).toHaveProperty('skills');
    expect(result).toHaveProperty('skill_gaps');
    expect(result).toHaveProperty('qualification_level');
    expect(result).toHaveProperty('overall_assessment');
    expect(result).toHaveProperty('last_reality_check_date');
    expect(result).toHaveProperty('proof_signals');
    expect(result).toHaveProperty('primary_domain');
    expect(result).toHaveProperty('adjacent_fields');

    // Career direction
    expect(result).toHaveProperty('five_year_role');
    expect(result).toHaveProperty('target_job_titles');
    expect(result).toHaveProperty('target_industries');
    expect(result).toHaveProperty('work_environment');
    expect(result).toHaveProperty('work_type');
    expect(result).toHaveProperty('employment_status');
    expect(result).toHaveProperty('salary_expectation');
    expect(result).toHaveProperty('available_start_date');
    expect(result).toHaveProperty('open_to_lateral');
    expect(result).toHaveProperty('open_to_outside_degree');

    // Survey
    expect(result).toHaveProperty('biggest_challenge');
    expect(result).toHaveProperty('cv_tailoring_strategy');
    expect(result).toHaveProperty('linkedin_outreach_strategy');
    expect(result).toHaveProperty('role_clarity_score');
    expect(result).toHaveProperty('job_search_efforts');

    // Onboarding flow control
    expect(result).toHaveProperty('onboarding_step');
    expect(result).toHaveProperty('onboarding_complete');
    expect(result).toHaveProperty('resume_url');
  });

  it('strips the React-only fields that have no profiles column', () => {
    const result = cleanProfilePayload({
      ...EMPTY_PROFILE,
      volunteering: [{ title: 'Mentor' }],
      hard_skills: ['Excel'],
      tools_software: ['Figma'],
      technical_skills: ['React'],
      analytical_skills: ['Forecasting'],
      communication_skills: ['Public Speaking'],
      leadership_skills: ['Mentoring'],
    });

    expect(result).not.toHaveProperty('volunteering');
    expect(result).not.toHaveProperty('hard_skills');
    expect(result).not.toHaveProperty('tools_software');
    expect(result).not.toHaveProperty('technical_skills');
    expect(result).not.toHaveProperty('analytical_skills');
    expect(result).not.toHaveProperty('communication_skills');
    expect(result).not.toHaveProperty('leadership_skills');
  });

  it('strips education fields — they now live in the education table (Phase B)', () => {
    // Even if a caller accidentally passes education fields (e.g. from
    // stale state during a partial deploy), cleanProfilePayload must NOT
    // forward them to PostgREST. The profiles flat columns still exist
    // for now (Phase C drops them later) but we no longer write to them.
    const result = cleanProfilePayload({
      ...EMPTY_PROFILE,
      degree: 'B.A.',
      field_of_study: 'Business Administration',
      education_level: 'bachelors',
      education_institution: 'Reichman University',
      education_dates: '2023 - Present',
      gpa: '3.7',
      honors: ['Dean\'s List'],
      relevant_coursework: ['Marketing 101'],
      academic_projects: ['Capstone'],
      secondary_education: { institution: 'Some HS' },
    });

    expect(result).not.toHaveProperty('degree');
    expect(result).not.toHaveProperty('field_of_study');
    expect(result).not.toHaveProperty('education_level');
    expect(result).not.toHaveProperty('education_institution');
    expect(result).not.toHaveProperty('education_dates');
    expect(result).not.toHaveProperty('gpa');
    expect(result).not.toHaveProperty('honors');
    expect(result).not.toHaveProperty('relevant_coursework');
    expect(result).not.toHaveProperty('academic_projects');
    expect(result).not.toHaveProperty('secondary_education');
  });

  it('preserves array fields without coercing them to strings', () => {
    // Regression guard: a previous workaround for the employment_status
    // text-vs-text[] mismatch coerced array → comma-joined string at the
    // payload boundary. After the proper text[] migration that workaround
    // was removed; this test ensures arrays make it through untouched.
    const input = {
      ...EMPTY_PROFILE,
      employment_status: ['student', 'looking_for_job'],
      biggest_challenge: ["I don't know which roles to target"],
      target_job_titles: ['Product Manager', 'Data Analyst'],
      target_industries: ['Fintech'],
      work_environment: ['Startup', 'Hybrid'],
      work_type: ['Remote'],
      honors: ["Dean's List"],
      languages: [{ language: 'English', proficiency: 'Native' }],
      relevant_coursework: ['Algorithms'],
      skills: ['React'],
      skill_gaps: ['Docker'],
    };
    const result = cleanProfilePayload(input);

    expect(Array.isArray(result.employment_status)).toBe(true);
    expect(result.employment_status).toEqual(['student', 'looking_for_job']);

    expect(Array.isArray(result.biggest_challenge)).toBe(true);
    expect(result.biggest_challenge).toEqual(["I don't know which roles to target"]);

    expect(Array.isArray(result.target_job_titles)).toBe(true);
    expect(Array.isArray(result.target_industries)).toBe(true);
    expect(Array.isArray(result.work_environment)).toBe(true);
    expect(Array.isArray(result.work_type)).toBe(true);
    expect(Array.isArray(result.languages)).toBe(true);
    expect(Array.isArray(result.skills)).toBe(true);
    expect(Array.isArray(result.skill_gaps)).toBe(true);
    // honors and relevant_coursework moved to the education table in Phase B
    expect(result).not.toHaveProperty('honors');
    expect(result).not.toHaveProperty('relevant_coursework');
  });

  it('preserves jsonb object shapes (languages — the only profile jsonb left after Phase B)', () => {
    const languages = [
      { language: 'English', proficiency: 'Native' },
      { language: 'Hebrew',  proficiency: 'Fluent' },
    ];
    const result = cleanProfilePayload({ ...EMPTY_PROFILE, languages });
    expect(result.languages).toEqual(languages);
  });

  it('preserves boolean and nullable scalar fields', () => {
    const result = cleanProfilePayload({
      ...EMPTY_PROFILE,
      open_to_lateral: true,
      open_to_outside_degree: true,
      role_clarity_score: 4,
      primary_domain: 'product',
    });
    expect(result.open_to_lateral).toBe(true);
    expect(result.open_to_outside_degree).toBe(true);
    expect(result.role_clarity_score).toBe(4);
    expect(result.primary_domain).toBe('product');
  });

  it('does not mutate the input object', () => {
    const input = { ...EMPTY_PROFILE, full_name: 'Isaac', hard_skills: ['Excel'] };
    const original = JSON.parse(JSON.stringify(input));
    cleanProfilePayload(input);
    expect(input).toEqual(original);
  });

  it('returns undefined for fields not present in the input rather than dropping the key', () => {
    // The fields are always present on the returned object (whitelist is
    // explicit). Missing-from-input values come back as undefined, which the
    // caller then strips with Object.keys(payload).forEach delete-undefined.
    const result = cleanProfilePayload({ full_name: 'Isaac' });
    expect(result.full_name).toBe('Isaac');
    expect(result).toHaveProperty('phone_number');
    expect(result.phone_number).toBeUndefined();
  });
});

describe('ALLOWED_EXPERIENCE_TYPES', () => {
  it('exposes the 8 enum values that match the prompt + experiences.type column', () => {
    expect(ALLOWED_EXPERIENCE_TYPES.size).toBe(8);
    for (const t of ['internship', 'full_time', 'part_time', 'freelance', 'volunteer', 'leadership', 'military', 'founder']) {
      expect(ALLOWED_EXPERIENCE_TYPES.has(t)).toBe(true);
    }
  });
});

describe('inferExperienceType — founder / self-employed override', () => {
  // Regression for the case where "Founder @ Get a Job" was classified as
  // freelance. Title-only override now wins, and fires BEFORE the broader
  // freelance check so "Founder" / "CEO" titles don't get caught by the
  // self-employed → freelance rule.
  it('classifies a real-company founder as "founder"', () => {
    expect(inferExperienceType({
      title: 'Founder',
      company: 'Get a Job',
      type: 'freelance',
    })).toBe('founder');
  });

  it('classifies CEO as "founder"', () => {
    expect(inferExperienceType({
      title: 'CEO',
      company: 'My Startup',
    })).toBe('founder');
  });

  it('classifies "Co-founder" with hyphen as "founder"', () => {
    expect(inferExperienceType({
      title: 'Co-founder',
      company: 'Acme',
    })).toBe('founder');
  });

  it('classifies "self-employed" title as "founder"', () => {
    expect(inferExperienceType({
      title: 'Self-employed Consultant',
      company: '',
    })).toBe('founder');
  });

  it('still routes student-club founders to leadership (text-fallback branch)', () => {
    // No title-only hit on "founder" here — title is "President" — so the
    // late-stage leadership check (founder + club/society/student/chapter)
    // wins. Guards against regressing student-club leadership detection.
    expect(inferExperienceType({
      title: 'President',
      company: 'Reichman Entrepreneurs Society',
      responsibilities: 'Co-founder of the student chapter',
    })).toBe('leadership');
  });
});

describe('inferExperienceType — title-keyword overrides (fire BEFORE LLM hint)', () => {
  // Regression for the bug Eli reported: "Volunteer Educator & Mentor" got
  // classified as part_time because the LLM affirmatively returned wrong
  // data and we trusted it. Title-only override now wins.
  it('overrides LLM "part_time" with "volunteer" when title contains "Volunteer"', () => {
    expect(inferExperienceType({
      title: 'Volunteer Educator & Mentor',
      company: 'Heseg Tzair',
      type: 'part_time',
    })).toBe('volunteer');
  });

  it('overrides LLM "full_time" with "internship" when title contains "Intern"', () => {
    expect(inferExperienceType({
      title: 'Marketing Intern',
      company: 'Acme Co',
      type: 'full_time',
    })).toBe('internship');
  });

  it('overrides LLM hint with "freelance" when title says "Freelance"', () => {
    expect(inferExperienceType({
      title: 'Freelance Designer',
      company: 'Self',
      type: 'full_time',
    })).toBe('freelance');
  });

  it('classifies military based on company name even when LLM says full_time', () => {
    expect(inferExperienceType({
      title: 'Combat Soldier',
      company: 'Nahal Brigade',
      type: 'full_time',
    })).toBe('military');
  });

  it('recognizes Israeli military unit names in responsibilities text', () => {
    expect(inferExperienceType({
      title: 'Intelligence Analyst',
      company: 'IDF',
      responsibilities: ['Served in Unit 8200'],
      type: 'full_time',
    })).toBe('military');
  });

  it('trusts the LLM hint when no title-override fires', () => {
    expect(inferExperienceType({
      title: 'Customer Success Specialist',
      company: 'Guardio',
      type: 'full_time',
    })).toBe('full_time');
  });

  it('falls back to full_time when no hint and no keyword matches', () => {
    expect(inferExperienceType({
      title: 'Analyst',
      company: 'Some Company',
    })).toBe('full_time');
  });

  it('falls back to text-keyword inference when the LLM omits a hint', () => {
    expect(inferExperienceType({
      title: 'Educator',
      company: 'Heseg Tzair',
      responsibilities: ['volunteer work tutoring at-risk youth'],
    })).toBe('volunteer');
  });
});

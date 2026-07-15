// Onboarding preview fixtures — per-step mock data feeding the
// /_preview/onboarding/<state> harness.
//
// Fixture IDs use a single dash-separated segment (React Router v6
// :state param matches a single URL segment).
//
// "shared-skill-picker" exists to prove the RdSkillTagInput fork keeps
// the autocomplete dropdown + suggestion source intact (the skill
// guarantee for PR 2A + 2B).
//
// "skills-with-chips" / "roleskills-prefilled" exist to prove
// RdSkillChipBank and the per-experience suggestions still render the
// same skill chips the user picks from today (the skill guarantee for
// PR 2B).

const SAMPLE_EXP_3 = [
  {
    title: "Customer Success Specialist – VIP Team",
    company: "Guardio",
    type: "part_time",
    start_date: "October 2025",
    end_date: "",
    is_current: true,
    responsibilities:
      "Provide high-touch, personalized technical and product support to VIP customers. Resolve complex user issues efficiently while maintaining strict service-level expectations.",
    managed_people: false,
    cross_functional: false,
    skills: ["Customer Success", "Customer Communication"],
  },
  {
    title: "Program Coordinator & Team Lead",
    company: "Heseg Tzair",
    type: "volunteer",
    start_date: "2025",
    end_date: "",
    is_current: true,
    responsibilities:
      "Lead and manage a team of five volunteers, responsible for weekly program execution.",
    managed_people: false,
    cross_functional: false,
    skills: [],
  },
  {
    title: "Combat Soldier",
    company: "Nahal Brigade",
    type: "military",
    start_date: "2020",
    end_date: "2022",
    is_current: false,
    responsibilities:
      "Supervised and trained teams of up to 30 soldiers in high-pressure environments.",
    managed_people: true,
    cross_functional: false,
    skills: ["Leadership"],
  },
];

const SAMPLE_EDU_1 = [
  {
    institution: "Reichman University",
    education_level: "bachelors",
    degree_type: "ba",
    field_of_study: "Business Administration",
    start_date: "September 2023",
    end_date: "",
    is_current: true,
    gpa: "85 / 100",
    skills: ["Financial Modeling"],
    relevant_coursework: [
      "Marketing Strategy",
      "Financial Accounting",
      "Statistics for Business",
    ],
    academic_projects: ["Capstone: Israeli D2C market analysis"],
  },
];

const SAMPLE_PROJ_1 = [
  {
    name: "Practicum: Renewals workflow audit",
    description:
      "Audited a SaaS scale-up's customer renewals process across 3 quarters; surfaced a 9% churn lift opportunity in the playbook layer.",
    url: "",
    skills: [],
  },
];

export const FIXTURES = {
  // ── StepResumeUpload (PR 2A) ─────────────────────────────────────
  "resume-empty": {
    label: "Step 0 · CV upload — empty",
    profileData: {
      full_name: "",
      employment_status: [],
      resume_url: null,
      linkedin_url: "",
    },
  },
  "resume-employment-selected": {
    label: "Step 0 · CV upload — employment status selected",
    profileData: {
      full_name: "",
      employment_status: ["student", "looking_for_job"],
      linkedin_url: "",
    },
  },

  // ── StepEducation (PR 2A) ────────────────────────────────────────
  "education-empty": {
    label: "Step 1 · Education — empty",
    profileData: { full_name: "" },
    educations: [
      {
        institution: "",
        education_level: "",
        degree_type: "",
        field_of_study: "",
        start_date: "",
        end_date: "",
        is_current: false,
        gpa: "",
        relevant_coursework: [],
        academic_projects: [],
      },
    ],
  },
  "education-prefilled": {
    label: "Step 1 · Education — pre-filled from CV",
    profileData: { full_name: "Eli Englard" },
    educations: SAMPLE_EDU_1,
  },

  // ── StepInternship (PR 2A) ───────────────────────────────────────
  "internship-empty": {
    label: "Step 2 · Internship — empty",
    profileData: { practicum_path: undefined, practicum_cohort: "" },
    educations: [],
  },
  "internship-faculty": {
    label: "Step 2 · Internship — faculty-assigned",
    profileData: {
      practicum_path: "faculty_assigned",
      practicum_cohort: "Spring 2026",
    },
    educations: [{ institution: "Reichman University" }],
  },
  "internship-self": {
    label: "Step 2 · Internship — self-sourced",
    profileData: { practicum_path: "self_sourced", practicum_cohort: "" },
    educations: [{ institution: "Reichman University" }],
  },
  "internship-none": {
    label: "Step 2 · Internship — not enrolled",
    profileData: { practicum_path: null, practicum_cohort: "" },
    educations: [{ institution: "Tel Aviv University" }],
  },

  // ── StepExperience (PR 2B) ───────────────────────────────────────
  "experience-empty": {
    label: "Step 3 · Experience — empty (add first entry)",
    profileData: {},
    experiences: [],
  },
  "experience-multi": {
    label: "Step 3 · Experience — 3 pre-filled entries",
    profileData: {},
    experiences: SAMPLE_EXP_3,
  },

  // ── StepRoleSkills (PR 2B) — proves chip bank + per-role suggestions
  "roleskills-prefilled": {
    label: "Step 4 · Role skills — first card expanded w/ RdSkillChipBank",
    profileData: {},
    experiences: SAMPLE_EXP_3,
    educations: SAMPLE_EDU_1,
    projects: SAMPLE_PROJ_1,
  },

  // ── StepSkills (PR 2B) — proves chip bank visible on the catch-all
  "skills-empty": {
    label: "Step 5 · Other skills — empty (chip bank visible)",
    profileData: { skills: [] },
  },
  "skills-with-chips": {
    label: "Step 5 · Other skills — chips selected",
    profileData: {
      skills: [
        "Python",
        "Excel",
        "Customer Communication",
        "Project Management",
      ],
    },
  },

  // ── StepCareerDirection (PR 2B) ─────────────────────────────────
  "direction-empty": {
    label: "Step 6 · Career direction — empty",
    profileData: {
      five_year_role: "",
      target_job_titles: [],
      target_industries: [],
      work_environment: [],
      open_to_lateral: false,
      open_to_outside_degree: false,
    },
  },
  "direction-prefilled": {
    label: "Step 6 · Career direction — pre-filled",
    profileData: {
      five_year_role: "Product Manager",
      target_job_titles: ["Associate Product Manager", "Product Analyst"],
      target_industries: ["B2B SaaS", "FinTech"],
      work_environment: ["Startup", "Scale-up"],
      open_to_lateral: true,
      open_to_outside_degree: false,
    },
  },

  // ── StepConstraints (PR 2C) ─────────────────────────────────────
  "constraints-empty": {
    label: "Step 7 · Constraints — empty",
    profileData: {
      location: "",
      available_start_date: "",
      work_type: [],
    },
  },
  "constraints-filled": {
    label: "Step 7 · Constraints — filled",
    profileData: {
      location: "Tel Aviv, Israel",
      available_start_date: "2026-09-01",
      work_type: ["Hybrid", "Remote"],
    },
  },

  // ── StepSurvey (PR 2C) — reality check, all 5 question groups ───
  "survey-empty": {
    label: "Step 8 · Reality check — empty",
    profileData: {
      biggest_challenge: [],
      cv_tailoring_strategy: null,
      linkedin_outreach_strategy: null,
      role_clarity_score: null,
      job_search_efforts: "",
      referral_source: null,
    },
  },
  "survey-filled": {
    label: "Step 8 · Reality check — answers across all 5 groups",
    profileData: {
      biggest_challenge: [
        "I don't know which roles to target",
        "I apply but get no responses",
      ],
      cv_tailoring_strategy: "sometimes",
      linkedin_outreach_strategy: "rarely",
      role_clarity_score: 3,
      job_search_efforts:
        "Applied to ~40 roles over 3 months, attended 2 career fairs, refreshed my LinkedIn header.",
      referral_source: "reichman_practicum",
    },
  },

  // ── OnboardingTutorial (PR 2C) — 4 render states ────────────────
  "tutorial-gate": {
    label: "Step 9 · Tutorial — returning-user skip gate",
    tutorial: { isReturningUser: true, setupComplete: false },
  },
  "tutorial-slide-1": {
    label: "Step 9 · Tutorial — slide 1 (Browse jobs)",
    tutorial: { isReturningUser: false, setupComplete: false },
  },
  "tutorial-slide-6": {
    label: "Step 9 · Tutorial — final slide (Chat agents)",
    tutorial: { isReturningUser: false, setupComplete: true },
  },
  "tutorial-completion": {
    label: "Step 9 · Tutorial — setup complete handoff",
    tutorial: { isReturningUser: true, setupComplete: true },
  },

  // ── Shared-inputs proof (autocomplete + chip bank) ──────────────
  "shared-skill-picker": {
    label: "Shared inputs · RdSkillTagInput — autocomplete open",
    profileData: {},
    educations: [],
  },
};

export const STATE_IDS = Object.keys(FIXTURES);

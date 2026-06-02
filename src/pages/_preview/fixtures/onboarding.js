// Onboarding preview fixtures — per-step mock data feeding the
// /_preview/onboarding/<step>/<state>? harness.
//
// Each fixture mirrors the contract the live step expects from
// Onboarding.jsx: { data / profileData / educations / etc }. NO real
// edge function or DB calls run in preview — the harness wraps each
// step in a parent that supplies onChange / onNext / onBack as no-ops.
//
// "skillPicker" fixture exists to prove the RdSkillTagInput fork keeps
// the autocomplete dropdown + suggestion source intact (user spec for
// PR 2A — preview must show skills to pick from).

export const FIXTURES = {
  // ── StepResumeUpload ─────────────────────────────────────────────
  // Internal stages (uploading / extracting / done / error) live in
  // useState inside StepResumeUpload and aren't externally settable —
  // capturing them would require preview-only props. Skipped in 2A;
  // the idle + employment-status-selected layout is the load-bearing
  // visual content for review.
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

  // ── StepEducation ────────────────────────────────────────────────
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
    educations: [
      {
        institution: "Reichman University",
        education_level: "bachelors",
        degree_type: "ba",
        field_of_study: "Business Administration",
        start_date: "September 2023",
        end_date: "",
        is_current: true,
        gpa: "85 / 100",
        relevant_coursework: [
          "Marketing Strategy",
          "Financial Accounting",
          "Statistics for Business",
          "Operations Management",
        ],
        academic_projects: [
          "Capstone: Israeli D2C market analysis",
          "Practicum: Renewals workflow audit at a SaaS scale-up",
        ],
      },
    ],
  },

  // ── StepInternship ───────────────────────────────────────────────
  "internship-empty": {
    label: "Step 2 · Internship — empty",
    profileData: { practicum_path: undefined, practicum_cohort: "" },
    educations: [],
  },
  "internship-faculty": {
    label: "Step 2 · Internship — faculty-assigned",
    profileData: { practicum_path: "faculty_assigned", practicum_cohort: "Spring 2026" },
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

  // ── Shared-inputs proof (skill autocomplete + suggestions) ───────
  // Mounts RdSkillTagInput with suggestionType="library_skills" so the
  // user sees the actual canonical-library suggestions in the dropdown.
  // The runner script types into the input + waits for the dropdown to
  // render before screenshotting.
  "shared-skill-picker": {
    label: "Shared inputs · RdSkillTagInput — autocomplete open",
    profileData: {},
    educations: [],
  },
};

export const STATE_IDS = Object.keys(FIXTURES);

// Shared mock/fixture data for the 3-tab homepage demo (Home3TabPreview.jsx
// and its tab content files). Visual-only - nothing here is wired to any
// real Supabase table, query, or generation flow. Extracted to one module
// so the CV tab's mock top-matches list and the Browse Jobs tab's mock job
// grid draw from the same fixture jobs instead of duplicating them.
//
// Track colors match the live app's real, canonical mapping - TRACK_CONFIG
// (src/lib/trackConfig.js): track_1/"Sweet spot" = coral, track_2/"Detour"
// = teal, track_3/"Growth" = golden. Career.jsx's real TRACK_BAND uses the
// same three. An earlier pass in this branch remapped these away from
// coral as a blanket "avoid coral" experiment; that wasn't a real decision
// and has been reverted so this demo's colors read identically to the
// live app instead of differently from it.

export const TRACK_NAMES = {
  track_1: "Sweet spot",
  track_2: "Detour",
  track_3: "Growth",
};

export const TRACK_STYLES = {
  track_1: {
    dot: "bg-rd-coral",
    tintBg: "bg-rd-coral-tint",
    ink: "text-rd-coral-dark",
    barFill: "bg-rd-coral",
    barTrack: "bg-rd-coral-tint",
  },
  track_2: {
    dot: "bg-rd-teal",
    tintBg: "bg-rd-teal-tint",
    ink: "text-rd-teal-dark",
    barFill: "bg-rd-teal",
    barTrack: "bg-rd-teal-tint",
  },
  track_3: {
    dot: "bg-rd-golden",
    tintBg: "bg-rd-golden-tint",
    ink: "text-rd-golden-dark",
    barFill: "bg-rd-golden",
    barTrack: "bg-rd-golden-tint",
  },
};

// ───── CV bank - dropdown options for the CV tab's Master CV selector ─────

export const MOCK_CV_MASTER = {
  name: "Noa Bar-Lev",
  title: "Business Administration Student · Aspiring Product Manager",
  contact:
    "noa.barlev.demo@gmail.com · linkedin.com/in/noa-barlev-demo · Tel Aviv, Israel",
  summary:
    "Third-year Business Administration student at Tel Aviv University with hands-on experience in operations coordination, data-driven process improvement, and cross-functional stakeholder communication. Currently coordinating vendor logistics and reporting workflows at a fast-growing fintech, with coursework in statistics, product strategy, and information systems supporting a long-term focus on Product Management.",
  experience: [
    {
      role: "Operations & Strategy Intern",
      company: "Payoneer",
      dates: "Mar 2025 - Present",
      bullets: [
        "Coordinate weekly vendor reporting across 3 regional teams, cutting reconciliation time by 20% through a standardized tracking template.",
        "Partner with the product team to document workflow gaps surfaced in customer support tickets, feeding 4 items directly into the quarterly roadmap review.",
        "Built a lightweight Looker dashboard tracking onboarding funnel drop-off, now referenced weekly by the growth team.",
      ],
    },
    {
      role: "Customer Success Coordinator",
      company: "Wolt",
      dates: "Jul 2023 - Feb 2025",
      bullets: [
        "Managed escalations for 40+ restaurant partners, maintaining a 94% satisfaction rating across resolved tickets.",
        "Trained 6 new team members on partner-facing tools and escalation protocol during a period of team doubling.",
        "Proposed a macro-based response workflow that reduced average handling time by 15%.",
      ],
    },
  ],
  education: [
    {
      school: "Tel Aviv University",
      degree: "B.A., Business Administration (Marketing Track)",
      dates: "Oct 2023 - Present",
    },
  ],
  skills: [
    "Process Improvement",
    "Stakeholder Management",
    "Data Analysis",
    "SQL (basic)",
    "Product Thinking",
    "Customer Escalation Management",
    "Vendor Coordination",
  ],
  tools: ["Excel", "Looker", "Notion", "Salesforce", "Figma (basic)"],
  languages: ["Hebrew", "English"],
};

export const MOCK_CV_TAILORED_WIX = {
  ...MOCK_CV_MASTER,
  title: "Business Administration Student · Product Manager Candidate",
  summary:
    "Product-minded Business Administration student tailoring vendor-operations and cross-functional coordination experience toward Wix's Product Management track. Emphasis below on roadmap input, funnel analysis, and stakeholder alignment - the parts of the Payoneer and Wolt roles most relevant to a PM interview loop.",
  skills: [
    "Product Thinking",
    "Cross-functional Collaboration",
    "Data Analysis",
    "Stakeholder Management",
    "Process Improvement",
    "SQL (basic)",
  ],
};

export const MOCK_CV_TAILORED_MONDAY = {
  ...MOCK_CV_MASTER,
  title: "Business Administration Student · GTM Manager Candidate",
  summary:
    "Business Administration student reframing operations and customer-facing experience for a GTM Manager track. Emphasis below on partner escalation management, workflow design, and the reporting cadence built at Payoneer - the throughlines most relevant to a go-to-market operations role.",
  skills: [
    "Vendor Coordination",
    "Customer Escalation Management",
    "Process Improvement",
    "Data Analysis",
    "Stakeholder Management",
  ],
};

export const CV_OPTIONS = [
  { id: "master", label: "Master CV", cv: MOCK_CV_MASTER },
  {
    id: "wix",
    label: "Tailored - Product Manager @ Wix",
    cv: MOCK_CV_TAILORED_WIX,
  },
  {
    id: "monday",
    label: "Tailored - GTM Manager @ monday.com",
    cv: MOCK_CV_TAILORED_MONDAY,
  },
];

// ───── Jobs - shared fixture list for both the CV tab's compact top
// matches and the Browse Jobs tab's larger grid. Shapes mirror what
// deriveJobDisplay (src/lib/jobCardDisplay.js) expects from a real `job`
// row + scoreJobFit result, so JobGridCard renders identically to the
// real thing. ─────

export const MOCK_JOBS = [
  {
    job: {
      id: "mock-job-1",
      title: "Product Operations Manager",
      company_name: "Port",
      location_city: "Tel Aviv",
      is_remote: false,
      years_experience_min: 1,
      years_experience_max: 3,
      seniority: "mid",
      date_posted: new Date(Date.now() - 86400000).toISOString(),
    },
    score: {
      fit_score: 0.93,
      attainability_band: "strong",
      attainability_score: 0.93,
      track: "track_1",
      signals: {
        matched_skills: ["cross_functional_collaboration"],
        missing_core_skills: [],
      },
      reasoning: {
        strengths: ["Strong operational + cross-functional background"],
      },
    },
  },
  {
    job: {
      id: "mock-job-2",
      title: "Product Manager",
      company_name: "Workiz",
      location_city: "Tel Aviv",
      is_remote: true,
      years_experience_min: 1,
      years_experience_max: 2,
      seniority: "entry",
      date_posted: new Date().toISOString(),
    },
    score: {
      fit_score: 0.6,
      attainability_band: "strong",
      attainability_score: 0.6,
      track: "track_1",
      signals: {
        matched_skills: ["data_analysis", "cross_functional_collaboration"],
        missing_core_skills: [],
      },
      reasoning: { strengths: ["Data-driven decision making"] },
    },
  },
  {
    job: {
      id: "mock-job-3",
      title: "Product Manager",
      company_name: "Helfy",
      location_city: "Herzliya",
      is_remote: false,
      years_experience_min: 2,
      years_experience_max: 4,
      seniority: "mid",
      date_posted: new Date().toISOString(),
    },
    score: {
      fit_score: 0.58,
      attainability_band: "good",
      attainability_score: 0.58,
      track: "track_1",
      signals: {
        matched_skills: ["problem_solving", "presentation_skills"],
        missing_core_skills: [],
      },
      reasoning: { strengths: ["Strong communication track record"] },
    },
  },
  {
    job: {
      id: "mock-job-4",
      title: "Product Manager",
      company_name: "AU10TIX",
      location_city: "Israel",
      is_remote: true,
      years_experience_min: 2,
      years_experience_max: 3,
      seniority: "mid",
      date_posted: new Date().toISOString(),
    },
    score: {
      fit_score: 0.51,
      attainability_band: "good",
      attainability_score: 0.51,
      track: "track_1",
      signals: {
        matched_skills: ["market_research"],
        missing_core_skills: ["ab_testing"],
      },
      reasoning: { strengths: ["Relevant market research experience"] },
    },
  },
  {
    job: {
      id: "mock-job-5",
      title: "Product Manager",
      company_name: "Papaya Global",
      location_city: "Herzliya",
      is_remote: true,
      years_experience_min: 3,
      years_experience_max: 5,
      seniority: "senior",
      date_posted: new Date().toISOString(),
    },
    score: {
      fit_score: 0.58,
      attainability_band: "stretch",
      attainability_score: 0.58,
      track: "track_3",
      signals: {
        matched_skills: ["market_research"],
        missing_core_skills: ["stakeholder_management"],
      },
      reasoning: { strengths: ["Domain-adjacent research skills"] },
    },
  },
  {
    job: {
      id: "mock-job-6",
      title: "Senior Product Manager",
      company_name: "Riverside.fm",
      location_city: "Israel",
      is_remote: true,
      years_experience_min: 5,
      years_experience_max: 8,
      seniority: "senior",
      date_posted: new Date().toISOString(),
    },
    score: {
      fit_score: 0.58,
      attainability_band: "stretch",
      attainability_score: 0.58,
      track: "track_3",
      signals: {
        matched_skills: ["data_analysis"],
        missing_core_skills: ["product_roadmapping"],
      },
      reasoning: { strengths: ["Analytical foundation to grow into the role"] },
    },
  },
  {
    job: {
      id: "mock-job-7",
      title: "Business Operations Analyst",
      company_name: "monday.com",
      location_city: "Tel Aviv",
      is_remote: false,
      years_experience_min: 0,
      years_experience_max: 2,
      seniority: "entry",
      date_posted: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    score: {
      fit_score: 0.71,
      attainability_band: "strong",
      attainability_score: 0.71,
      track: "track_1",
      signals: {
        matched_skills: ["data_analysis", "process_improvement"],
        missing_core_skills: [],
      },
      reasoning: { strengths: ["Direct operations + analysis overlap"] },
    },
  },
  {
    job: {
      id: "mock-job-8",
      title: "GTM Operations Associate",
      company_name: "Lemonade",
      location_city: "Tel Aviv",
      is_remote: false,
      years_experience_min: 1,
      years_experience_max: 3,
      seniority: "mid",
      date_posted: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    score: {
      fit_score: 0.66,
      attainability_band: "good",
      attainability_score: 0.66,
      track: "track_2",
      signals: {
        matched_skills: ["vendor_coordination"],
        missing_core_skills: ["sql"],
      },
      reasoning: { strengths: ["Cross-functional GTM exposure"] },
    },
  },
  {
    job: {
      id: "mock-job-9",
      title: "Customer Experience Insights Specialist",
      company_name: "Fiverr",
      location_city: "Tel Aviv",
      is_remote: true,
      years_experience_min: 1,
      years_experience_max: 2,
      seniority: "entry",
      date_posted: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    score: {
      fit_score: 0.63,
      attainability_band: "good",
      attainability_score: 0.63,
      track: "track_2",
      signals: {
        matched_skills: ["customer_escalation_management"],
        missing_core_skills: [],
      },
      reasoning: { strengths: ["Direct escalation-management experience"] },
    },
  },
  {
    job: {
      id: "mock-job-10",
      title: "Strategy & Planning Associate",
      company_name: "Riskified",
      location_city: "Tel Aviv",
      is_remote: false,
      years_experience_min: 2,
      years_experience_max: 4,
      seniority: "mid",
      date_posted: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    score: {
      fit_score: 0.55,
      attainability_band: "good",
      attainability_score: 0.55,
      track: "track_1",
      signals: {
        matched_skills: ["process_improvement"],
        missing_core_skills: ["financial_modeling"],
      },
      reasoning: { strengths: ["Process-improvement track record"] },
    },
  },
];

// ───── Matched roles - fixture list for the Browse Jobs tab's right rail,
// recreating the shape Career.jsx's real matched-roles rail reads
// (career_roles row fields, 0-1 fraction scores). ─────

export const MOCK_MATCHED_ROLES = [
  {
    id: "mock-role-1",
    title: "Product Manager",
    track: "track_1",
    readiness_score: 0.78,
    goal_alignment_score: 0.9,
    matched_skills: [
      "stakeholder_management",
      "data_analysis",
      "process_improvement",
    ],
    missing_skills: ["product_roadmapping"],
  },
  {
    id: "mock-role-2",
    title: "Product Operations Manager",
    track: "track_1",
    readiness_score: 0.84,
    goal_alignment_score: 0.8,
    matched_skills: ["cross_functional_collaboration", "process_improvement"],
    missing_skills: [],
  },
  {
    id: "mock-role-3",
    title: "GTM Operations Manager",
    track: "track_2",
    readiness_score: 0.7,
    goal_alignment_score: 0.42,
    matched_skills: ["vendor_coordination", "customer_escalation_management"],
    missing_skills: ["sql"],
  },
  {
    id: "mock-role-4",
    title: "Senior Product Manager",
    track: "track_3",
    readiness_score: 0.36,
    goal_alignment_score: 0.95,
    matched_skills: ["data_analysis"],
    missing_skills: ["product_roadmapping", "ab_testing"],
  },
];

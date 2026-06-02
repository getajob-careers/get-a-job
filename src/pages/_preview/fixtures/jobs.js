// Jobs preview fixtures — drive every render branch of Jobs.jsx.
// Each fixture seeds the canonical query keys Jobs reads:
//   - userProfile, careerRoles (narrow select), experiences,
//     certifications, projects, education.
// Plus a `jobs` array which the harness writes into Jobs.jsx's
// internal `jobs` useState via a small URL-flag hatch
// (`?preview-force-empty=...`) for the empty states. For populated
// states the harness stubs `supabase.from("jobs")` to return the
// fixture rows.

const UID = "jobs-fixture-user";

function profile(overrides = {}) {
  return {
    id: UID,
    full_name: "Eli Englard",
    onboarding_complete: true,
    qualification_level: "Entry-level",
    last_reality_check_date: "2026-06-01T08:00:00.000Z",
    skill_gaps: [],
    practicum_path: null,
    five_year_role: "Product Manager",
    work_type: ["Hybrid", "Remote"],
    primary_domain: "product",
    education: [],
    ...overrides,
  };
}

const CAREER_ROLES = [
  { title: "Associate Product Manager", track: "track_1", readiness_score: 0.88 },
  { title: "Product Analyst", track: "track_1", readiness_score: 0.82 },
  { title: "Strategy & Operations Associate", track: "track_1", readiness_score: 0.78 },
  { title: "Customer Success Manager", track: "track_2", readiness_score: 0.74 },
  { title: "RevOps Analyst", track: "track_2", readiness_score: 0.62 },
  { title: "Senior Product Manager", track: "track_3", readiness_score: 0.42 },
];

const NOW = Date.now();
const D = (ageDays) => new Date(NOW - ageDays * 86400000).toISOString();

const JOB_ROWS = [
  {
    id: "j-1",
    ats_source: "greenhouse",
    external_id: "gh-1",
    title: "Associate Product Manager",
    company_name: "monday.com",
    company_slug: "monday",
    location_city: "Tel Aviv",
    location_raw: "Tel Aviv, Israel",
    is_remote: false,
    seniority: "entry",
    years_experience_min: 0,
    years_experience_max: 2,
    date_posted: D(2),
    apply_url: "https://example.com/apply/1",
    description: "Drive product discovery and prioritization across our B2B SaaS surfaces. Partner with engineering, design, and customer success to ship the next quarter of product roadmap.",
    industry: "B2B SaaS",
    req_skills_core: ["customer_communication", "data_analysis", "stakeholder_management"],
    req_skills_nice: ["sql", "product_metrics"],
    req_years_min: 0,
    req_years_max: 2,
    req_education_levels: ["bachelors"],
    req_education_strict: false,
    req_seniority: "entry",
    function_family: "product",
    extraction_confidence: 0.9,
  },
  {
    id: "j-2",
    ats_source: "lever",
    external_id: "lv-1",
    title: "Product Operations Manager",
    company_name: "Riverside",
    company_slug: "riverside",
    location_city: "Tel Aviv",
    location_raw: "Tel Aviv (Remote-friendly)",
    is_remote: true,
    seniority: "mid",
    years_experience_min: 2,
    years_experience_max: 4,
    date_posted: D(4),
    apply_url: "https://example.com/apply/2",
    description: "Operationalize the product process across squads. Own the cadence — sprint planning, release notes, customer feedback loops — and keep the engineering org unblocked.",
    industry: "Media Tech",
    req_skills_core: ["project_management", "stakeholder_management"],
    req_skills_nice: ["jira_admin", "process_design"],
    req_years_min: 2,
    req_years_max: 4,
    req_education_levels: ["bachelors"],
    req_education_strict: false,
    req_seniority: "mid",
    function_family: "product",
    extraction_confidence: 0.85,
  },
  {
    id: "j-3",
    ats_source: "greenhouse",
    external_id: "gh-2",
    title: "Associate PM, Growth",
    company_name: "Lemonade",
    company_slug: "lemonade",
    location_city: "Tel Aviv",
    location_raw: "Tel Aviv",
    is_remote: false,
    seniority: "entry",
    years_experience_min: 1,
    years_experience_max: 3,
    date_posted: D(7),
    apply_url: "https://example.com/apply/3",
    description: "Growth-flavoured APM role focused on activation and onboarding. Build A/B tests, instrument funnel metrics, ship copy + UX changes that move first-week retention.",
    industry: "InsurTech",
    req_skills_core: ["data_analysis", "a_b_testing", "customer_communication"],
    req_skills_nice: ["sql", "growth_marketing"],
    req_years_min: 1,
    req_years_max: 3,
    req_education_levels: ["bachelors"],
    req_education_strict: false,
    req_seniority: "entry",
    function_family: "product",
    extraction_confidence: 0.88,
  },
  {
    id: "j-4",
    ats_source: "ashby",
    external_id: "ab-1",
    title: "Project Coordinator",
    company_name: "Wix",
    company_slug: "wix",
    location_city: "Tel Aviv",
    location_raw: "Tel Aviv",
    is_remote: false,
    seniority: "entry",
    years_experience_min: 0,
    years_experience_max: 2,
    date_posted: D(10),
    apply_url: "https://example.com/apply/4",
    description: null,
    industry: "Consumer Web",
    req_skills_core: ["project_management"],
    req_skills_nice: [],
    req_years_min: 0,
    req_years_max: 2,
    req_education_levels: ["bachelors"],
    req_education_strict: false,
    req_seniority: "entry",
    function_family: "operations",
    extraction_confidence: 0.6,
  },
];

export const JOBS_FIXTURES = {
  "jobs-loading": {
    label: "Jobs · loading state (initial fetch in flight)",
    profile: profile(),
    careerRoles: CAREER_ROLES,
    jobs: [],
    loading: true,
  },
  "jobs-populated": {
    label: "Jobs · Track 1 populated (4 cards across match bands)",
    profile: profile(),
    careerRoles: CAREER_ROLES,
    jobs: JOB_ROWS,
  },
  "jobs-keyword-mode": {
    label: "Jobs · keyword search applied (?role=Product Manager)",
    profile: profile(),
    careerRoles: CAREER_ROLES,
    jobs: JOB_ROWS.slice(0, 3),
    urlFlag: "role=Product Manager",
  },
  "jobs-empty-no-roles": {
    label: "Jobs · Track tab with no career_roles (empty)",
    profile: profile(),
    careerRoles: [],
    jobs: [],
    urlFlag: "preview-force-empty=no_roles",
  },
  "jobs-empty-no-matches": {
    label: "Jobs · keyword search with no results",
    profile: profile(),
    careerRoles: CAREER_ROLES,
    jobs: [],
    urlFlag: "role=NonexistentRole&preview-force-empty=no_matches",
  },
  "jobs-stale-banner": {
    label: "Jobs · stale roadmap banner (experiences created_at > last_reality_check_date)",
    profile: profile({ last_reality_check_date: "2026-05-01T00:00:00.000Z" }),
    careerRoles: CAREER_ROLES,
    experiences: [
      { id: "e-1", user_id: UID, title: "New role added post-analysis", created_at: "2026-05-25T10:00:00.000Z" },
    ],
    jobs: JOB_ROWS.slice(0, 2),
  },
  "jobs-no-profile": {
    label: "Jobs · no profile (pre-onboarding banner)",
    profile: null,
    careerRoles: [],
    jobs: [],
  },
};

export const JOBS_STATE_IDS = Object.keys(JOBS_FIXTURES);
export const JOBS_FIXTURE_UID = UID;

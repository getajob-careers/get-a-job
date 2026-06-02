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

// Profile shape — gives scoreJobFit (the per-render deterministic
// scorer) enough signal to push seeded jobs above the track_1 cut
// (fit_score >= 0.55). Without skills_canonical + a bachelors
// education + the right primary_domain, every seeded job would score
// in track_3 and the PR-G displayedJobs filter would wipe the
// populated fixture clean.
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
    // Canonical skill IDs that scoreJobFit's skill axis intersects
    // against each job's req_skills_core / req_skills_nice. Picked to
    // give the seeded Track-1 jobs a real match score (j-1 ≈ 100,
    // j-2 ≈ 65, j-3 ≈ 84) so the populated fixture renders cards
    // across the strong + medium match-band colors.
    skills_canonical: [
      "customer_communication",
      "data_analysis",
      "stakeholder_management",
      "sql",
      "product_metrics",
      "project_management",
    ],
    education: [],
    ...overrides,
  };
}

// One bachelors entry — pushes the education axis from "gap_soft" (0.45)
// to "met" (1.0). Without it, even the perfect-skill-match jobs barely
// touch the 0.55 track_1 cut and the displayedJobs filter eats them.
const EDUCATIONS = [
  {
    id: "edu-1",
    user_id: UID,
    institution: "Reichman University",
    degree_level: "bachelors",
    field_of_study: "Business Administration",
    start_date: "2023-09-01",
    end_date: "2026-06-30",
    is_current: false,
  },
];

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

// scoreJobFit constants (track-scoring-constants.ts) require exact-case
// strings for `function_family` (must match DOMAIN_TO_FAMILIES values
// like "Product" / "Operations") and `req_seniority` (must match
// SENIORITY_RANK keys like "Entry" / "Entry_Mid"). Lowercase strings
// resolve to `undefined` in those lookups and silently soften the
// scores — every job ends up in track_3 and the PR-G displayedJobs
// filter wipes them out. Each job below is tuned for a specific track
// + match-band outcome (annotated above each row) so the populated
// fixture renders track-tinted cards across the strong + medium bands.
const JOB_ROWS = [
  // → track_1, ~100% (strong band): all 3 core + both nice skills match,
  //   bachelors met, on-domain (Product), entry seniority OK for early-
  //   career stage, 0 years required.
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
    req_seniority: "Entry",
    function_family: "Product",
    extraction_confidence: 0.9,
  },
  // → track_1, ~84% (strong band): 2 of 3 core match, bachelors met,
  //   on-domain, entry seniority, 0 years required.
  {
    id: "j-2",
    ats_source: "greenhouse",
    external_id: "gh-2",
    title: "Associate PM, Growth",
    company_name: "Lemonade",
    company_slug: "lemonade",
    location_city: "Tel Aviv",
    location_raw: "Tel Aviv",
    is_remote: false,
    seniority: "entry",
    years_experience_min: 0,
    years_experience_max: 2,
    date_posted: D(7),
    apply_url: "https://example.com/apply/3",
    description: "Growth-flavoured APM role focused on activation and onboarding. Build A/B tests, instrument funnel metrics, ship copy + UX changes that move first-week retention.",
    industry: "InsurTech",
    req_skills_core: ["data_analysis", "a_b_testing", "customer_communication"],
    req_skills_nice: ["sql", "growth_marketing"],
    req_years_min: 0,
    req_years_max: 2,
    req_education_levels: ["bachelors"],
    req_education_strict: false,
    req_seniority: "Entry",
    function_family: "Product",
    extraction_confidence: 0.88,
  },
  // → track_1, ~63% (medium band): only 2 of 4 core skills match (user
  //   has project_management + stakeholder_management; lacks
  //   roadmap_planning + sprint_facilitation). On-domain, Entry_Mid
  //   seniority (stretch but within early-career ceiling=1), 1-year
  //   gap (years axis penalty).
  {
    id: "j-3",
    ats_source: "lever",
    external_id: "lv-1",
    title: "Product Operations Coordinator",
    company_name: "Riverside",
    company_slug: "riverside",
    location_city: "Tel Aviv",
    location_raw: "Tel Aviv (Remote-friendly)",
    is_remote: true,
    seniority: "entry",
    years_experience_min: 1,
    years_experience_max: 3,
    date_posted: D(4),
    apply_url: "https://example.com/apply/2",
    description: "Operationalize the product process across squads. Own the cadence — sprint planning, release notes, customer feedback loops — and keep the engineering org unblocked.",
    industry: "Media Tech",
    req_skills_core: ["project_management", "stakeholder_management", "roadmap_planning", "sprint_facilitation"],
    req_skills_nice: ["jira_admin", "process_design"],
    req_years_min: 1,
    req_years_max: 3,
    req_education_levels: ["bachelors"],
    req_education_strict: false,
    req_seniority: "Entry_Mid",
    function_family: "Product",
    extraction_confidence: 0.85,
  },
  // → track_2/3, ~30% (soft / low-fit band): off-domain (Operations,
  //   not Product), no core skills match. Surfaces in the keyword
  //   fixture (no track filter) as the "low fit, shown because you
  //   searched" example. Filtered OUT of the Track-1 tab.
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
    req_skills_core: ["business_operations", "vendor_management"],
    req_skills_nice: [],
    req_years_min: 0,
    req_years_max: 2,
    req_education_levels: ["bachelors"],
    req_education_strict: false,
    req_seniority: "Entry",
    function_family: "Operations",
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
    label: "Jobs · Track 1 populated (3 cards across strong + medium bands)",
    profile: profile(),
    careerRoles: CAREER_ROLES,
    educations: EDUCATIONS,
    // First 3 jobs all score as track_1 (see annotations above each job
    // row); j-4 stays off-domain and gets filtered out by Jobs.jsx's
    // displayedJobs filter. The keyword fixture below shows j-4
    // alongside the others.
    jobs: JOB_ROWS,
  },
  "jobs-keyword-mode": {
    label: "Jobs · keyword search applied (track filter off — all bands)",
    profile: profile(),
    careerRoles: CAREER_ROLES,
    educations: EDUCATIONS,
    jobs: JOB_ROWS,
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
    educations: EDUCATIONS,
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

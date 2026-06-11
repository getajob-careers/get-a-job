// Home preview fixtures — drive every render branch of Home.jsx.
// Each fixture seeds the full set of canonical query keys Home reads:
//   - userProfile, careerRoles, applications, experiences, certifications,
//     projects, stories, linkedin_posts_home, linkedin_opts_home,
//     daily_action_home (with today's date string), new_jobs_home,
//     live_matches_home.
// The harness layer (HomePreview.jsx) wires these into a fresh
// QueryClient + a stub AuthContext.Provider, then mounts the real Home.

const UID = "home-fixture-user";

const TODAY = new Date().toDateString();

function profile(overrides = {}) {
  return {
    id: UID,
    full_name: "Eli Englard",
    onboarding_complete: true,
    qualification_level: "entry",
    last_reality_check_date: "2026-06-02T08:00:00.000Z",
    skill_gaps: [],
    practicum_path: null,
    education: [],
    ...overrides,
  };
}

const APP_ACTIVE_3 = [
  {
    id: "app-1",
    user_id: UID,
    company: "monday.com",
    role_title: "Associate Product Manager",
    status: "interviewing",
    created_at: "2026-05-21T10:00:00.000Z",
    updated_at: "2026-05-30T10:00:00.000Z",
  },
  {
    id: "app-2",
    user_id: UID,
    company: "Fiverr",
    role_title: "Product Operations Manager",
    status: "applied",
    created_at: "2026-05-26T10:00:00.000Z",
    updated_at: "2026-05-28T10:00:00.000Z",
  },
  {
    id: "app-3",
    user_id: UID,
    company: "Riskified",
    role_title: "BizOps Analyst",
    status: "applied",
    created_at: "2026-05-23T10:00:00.000Z",
    updated_at: "2026-05-23T10:00:00.000Z",
  },
];

export const APP_ACTIVE_7 = [
  ...APP_ACTIVE_3,
  {
    id: "app-4",
    user_id: UID,
    company: "Lemonade",
    role_title: "Associate Product Manager",
    status: "applied",
    created_at: "2026-05-29T10:00:00.000Z",
    updated_at: "2026-05-29T10:00:00.000Z",
  },
  {
    id: "app-5",
    user_id: UID,
    company: "Wix",
    role_title: "Product Analyst",
    status: "interviewing",
    created_at: "2026-05-25T10:00:00.000Z",
    updated_at: "2026-05-31T10:00:00.000Z",
  },
  {
    id: "app-6",
    user_id: UID,
    company: "Gong",
    role_title: "Customer Success Specialist",
    status: "rejected",
    created_at: "2026-05-15T10:00:00.000Z",
    updated_at: "2026-05-20T10:00:00.000Z",
  },
  {
    id: "app-7",
    user_id: UID,
    company: "Fireblocks",
    role_title: "Strategy & Ops Associate",
    status: "applied",
    created_at: "2026-05-31T10:00:00.000Z",
    updated_at: "2026-05-31T10:00:00.000Z",
  },
];

// Scores stored as 0-1 fractions to mirror the live DB contract — see
// tasks/lessons.md 2026-06-11. Consumers normalize to percent at display
// time. Previously these rows used display-unit numbers (88, 80, …),
// which let a 100× display bug slip past two reviews of Career.jsx.
const ROLES_MIXED = [
  { id: "r-1", user_id: UID, title: "Associate Product Manager", track: "track_1", match_score: 0.88, readiness_score: 0.84 },
  { id: "r-2", user_id: UID, title: "Product Analyst", track: "track_1", match_score: 0.80, readiness_score: 0.78 },
  { id: "r-3", user_id: UID, title: "Strategy & Operations Associate", track: "track_1", match_score: 0.72, readiness_score: 0.70 },
  { id: "r-4", user_id: UID, title: "BizOps Analyst", track: "track_2", match_score: 0.65, readiness_score: 0.64 },
  { id: "r-5", user_id: UID, title: "Customer Success Manager", track: "track_2", match_score: 0.60, readiness_score: 0.58 },
  { id: "r-6", user_id: UID, title: "Senior Product Manager", track: "track_3", match_score: 0.55, readiness_score: 0.45 },
];

const NEW_JOBS_5 = [
  { id: "j-1", title: "Associate Product Manager", company_name: "monday.com", date_posted: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: "j-2", title: "Product Operations Manager", company_name: "Lightricks", date_posted: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "j-3", title: "BizOps Analyst", company_name: "Fireblocks", date_posted: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: "j-4", title: "Product Analyst", company_name: "Wix", date_posted: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "j-5", title: "Customer Success Specialist", company_name: "Gong", date_posted: new Date(Date.now() - 6 * 86400000).toISOString() },
];

const STORIES_4 = [
  { id: "s-1", created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: "s-2", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "s-3", created_at: "2026-05-01T10:00:00.000Z" },
  { id: "s-4", created_at: "2026-04-12T10:00:00.000Z" },
];

const TASKS_MIXED = [
  { id: "t-1", user_id: UID, title: "Capture the Q3 funnel story", category: "project", is_complete: true, due_date: null, role_title: null },
  { id: "t-2", user_id: UID, title: "Prep 3 STAR answers for the Wix interview", category: "interview_prep", is_complete: false, due_date: new Date(Date.now() + 2 * 86400000).toISOString(), role_title: "Product Analyst" },
  { id: "t-3", user_id: UID, title: "Apply to the Riskified Revenue Analyst role", category: "application", is_complete: false, due_date: new Date(Date.now() + 4 * 86400000).toISOString(), role_title: "BizOps Analyst" },
  { id: "t-4", user_id: UID, title: "Update your LinkedIn headline", category: "networking", is_complete: false, due_date: null, role_title: null },
];

const DAILY_ACTION_POPULATED = {
  title: "Reach out to the PM lead at monday.com",
  rationale: "Your strongest open match — and the role went live two days ago.",
  source_table: "career_roles",
  action_type: "outreach",
};

// Fixture shape contract — every key the harness reads when seeding the
// cache. Optional keys default to empty in the harness so a sparse
// fixture (e.g. home-empty) doesn't need to spell everything out.
export const HOME_FIXTURES = {
  "home-empty": {
    label: "Home · empty (post-onboarding, no roles yet, live-matches incoming)",
    profile: profile({ last_reality_check_date: null, qualification_level: null }),
    roles: [],
    applications: [],
    stories: [],
    linkedinPosts: [],
    linkedinOpts: [],
    dailyAction: null,
    newJobs: [],
    liveMatchCount: null,
  },
  "home-partial": {
    label: "Home · partial (6 roles, no apps, 4 stories, LI baseline, count=42)",
    profile: profile(),
    roles: ROLES_MIXED,
    applications: [],
    tasks: TASKS_MIXED.slice(1, 3),
    stories: STORIES_4,
    linkedinPosts: [],
    linkedinOpts: [{ baseline_data: { profile: { headline: "Aspiring PM" } } }],
    dailyAction: null,
    newJobs: NEW_JOBS_5.slice(0, 2),
    liveMatchCount: 42,
  },
  "home-active": {
    label: "Home · active (12 roles, 7 apps, recent LI post, daily action, count=174)",
    profile: profile(),
    roles: [
      ...ROLES_MIXED,
      { id: "r-7", user_id: UID, title: "RevOps Analyst", track: "track_2", match_score: 0.62, readiness_score: 0.60 },
      { id: "r-8", user_id: UID, title: "Implementation Manager", track: "track_2", match_score: 0.58, readiness_score: 0.56 },
      { id: "r-9", user_id: UID, title: "Sales Operations Analyst", track: "track_2", match_score: 0.56, readiness_score: 0.54 },
      { id: "r-10", user_id: UID, title: "Director of Product Operations", track: "track_3", match_score: 0.48, readiness_score: 0.38 },
      { id: "r-11", user_id: UID, title: "Head of Strategy", track: "track_3", match_score: 0.45, readiness_score: 0.35 },
      { id: "r-12", user_id: UID, title: "Principal Product Manager", track: "track_3", match_score: 0.42, readiness_score: 0.32 },
    ],
    applications: APP_ACTIVE_7,
    tasks: TASKS_MIXED,
    stories: STORIES_4,
    linkedinPosts: [{ created_at: new Date(Date.now() - 3 * 86400000).toISOString() }],
    linkedinOpts: [{ baseline_data: { profile: { headline: "Aspiring PM" } } }],
    dailyAction: DAILY_ACTION_POPULATED,
    newJobs: NEW_JOBS_5,
    liveMatchCount: 174,
  },
  "home-stale-banner": {
    label: "Home · stale banner (experience created_at newer than last_reality_check_date)",
    profile: profile({ last_reality_check_date: "2026-05-01T10:00:00.000Z" }),
    roles: ROLES_MIXED,
    applications: APP_ACTIVE_3,
    experiences: [
      { id: "e-1", title: "Customer Success Specialist", created_at: "2026-05-30T10:00:00.000Z" },
    ],
    stories: STORIES_4.slice(0, 2),
    linkedinPosts: [{ created_at: new Date(Date.now() - 12 * 86400000).toISOString() }],
    linkedinOpts: [{ baseline_data: { profile: { headline: "Aspiring PM" } } }],
    dailyAction: DAILY_ACTION_POPULATED,
    newJobs: NEW_JOBS_5.slice(0, 3),
    liveMatchCount: 96,
  },
  "home-error-banner": {
    label: "Home · error banner (roles + apps queries errored)",
    profile: profile(),
    roles: ROLES_MIXED,
    applications: APP_ACTIVE_3,
    stories: [],
    linkedinPosts: [],
    linkedinOpts: [],
    dailyAction: null,
    newJobs: [],
    liveMatchCount: null,
    forceErrors: ["careerRoles", "applications"],
  },
  "home-self-healing": {
    label: "Home · self-heal in progress (?preview-selfheal=1)",
    profile: profile({ qualification_level: null, last_reality_check_date: null }),
    roles: [],
    applications: [],
    stories: [],
    linkedinPosts: [],
    linkedinOpts: [],
    dailyAction: null,
    newJobs: [],
    liveMatchCount: null,
    urlFlag: "preview-selfheal=1",
  },
};

export const HOME_STATE_IDS = Object.keys(HOME_FIXTURES);
export const HOME_FIXTURE_UID = UID;
export const HOME_FIXTURE_DATE = TODAY;

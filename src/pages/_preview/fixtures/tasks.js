// Tasks preview fixtures — drive every render branch of Tasks.jsx.
// Each fixture seeds the 3 query keys Tasks reads:
//   ["tasks", UID]        — primary task list
//   ["userProfile", UID]  — useProfileQuery (gates the Generate button)
//   ["careerRoles", UID]  — used in the empty-state copy branching

const UID = "tasks-fixture-user";

// "Today" relative to the fixture render. The dueChipFor logic computes
// from `new Date()`, so we set due dates as absolute ISO strings tied to
// the run-time clock. Anchor offsets:
//   -3 → overdue
//    0 → today
//   +2 → "Due in 2d"
//   +9 → "Due in 1w"
const D = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

function profile(overrides = {}) {
  return {
    id: UID,
    full_name: "Eli Englard",
    onboarding_complete: true,
    qualification_level: "Junior",
    primary_domain: "product_management",
    skill_gaps: [],
    skills: [],
    skills_canonical: [],
    skills_unmapped: [],
    ...overrides,
  };
}

// One task per category × priority/state cluster, plus a few extras to
// drive the sort + filter branches.
const TASKS = [
  // skill / high / overdue
  {
    id: "task-1",
    user_id: UID,
    title: "Learn SQL window functions for the Riverside Product Analyst role",
    description: "Cover ROW_NUMBER, RANK, LAG/LEAD, and frame-clause syntax. Run 5 practice queries against a free dataset.",
    category: "skill",
    priority: "high",
    role_title: "Product Analyst at Riverside",
    skill_gap: "SQL — window functions",
    due_date: D(-3),
    is_complete: false,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  // project / medium / due today
  {
    id: "task-2",
    user_id: UID,
    title: "Ship the IAI internship-picker README",
    description: "Add a 200-word README explaining the scoring model + a screenshot. Link it from your CV.",
    category: "project",
    priority: "medium",
    role_title: "Associate Product Manager at monday.com",
    skill_gap: null,
    due_date: D(0),
    is_complete: false,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  // networking / medium / due in 2d
  {
    id: "task-3",
    user_id: UID,
    title: "DM 3 Wix product managers on LinkedIn",
    description: "Use the 'I'm a Reichman BA student researching X at your company' template. Mention one specific recent product launch.",
    category: "networking",
    priority: "medium",
    role_title: "Strategy & Operations Associate at Wix",
    skill_gap: null,
    due_date: D(2),
    is_complete: false,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  // cv / low / due in 1w (no role_title to test the meta-line branch)
  {
    id: "task-4",
    user_id: UID,
    title: "Add the Lightricks CS internship bullets to your master CV",
    description: "Three bullets, STAR format, with the 11d→6d time-to-value metric front-and-center.",
    category: "cv",
    priority: "low",
    role_title: null,
    skill_gap: null,
    due_date: D(9),
    is_complete: false,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  // application / medium / no due_date (no-pressure variant)
  {
    id: "task-5",
    user_id: UID,
    title: "Submit the Fireblocks BizOps Analyst application",
    description: "JD already in your Tracker. Tailor the cover-letter opener to the deal-desk responsibility line.",
    category: "application",
    priority: "medium",
    role_title: "BizOps Analyst at Fireblocks",
    skill_gap: null,
    due_date: null,
    is_complete: false,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  // completed (sinks to bottom regardless of priority)
  {
    id: "task-6",
    user_id: UID,
    title: "Update LinkedIn headline to 'Aspiring Product Manager'",
    description: "Done last Sunday — captured the keyword recruiters search for.",
    category: "networking",
    priority: "medium",
    role_title: null,
    skill_gap: null,
    due_date: null,
    is_complete: true,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

// Onboarding-fallback tasks: 2 generic placeholders. Tasks.jsx detects
// these via `allTasksAreOnboardingFallback(tasks)` and shows the
// "personalised tasks haven't been generated yet" banner.
//
// The helper checks the exact strings used by the onboarding fallback
// generator — see src/lib/onboardingFallbackTasks.js. We use a heuristic
// match here to avoid coupling the fixture to the helper's internals.
const ONBOARDING_FALLBACK_TASKS = [
  {
    id: "fallback-1",
    user_id: UID,
    title: "Identify three roles you'd be excited to apply to this month",
    description: "Use the Roadmap to surface roles that match your skills. Open them in Jobs to read the requirements.",
    category: "application",
    priority: "medium",
    role_title: null,
    skill_gap: null,
    due_date: null,
    is_complete: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "fallback-2",
    user_id: UID,
    title: "Update your CV to reflect your strongest experience",
    description: "Open Profile → Experience and capture your two most recent roles with measurable outcomes.",
    category: "cv",
    priority: "medium",
    role_title: null,
    skill_gap: null,
    due_date: null,
    is_complete: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const TASKS_FIXTURES = {
  "tasks-loading": {
    label: "Tasks · loading spinner (tasks query in flight)",
    profile: profile(),
    tasks: [],
    roles: [],
    loading: true,
  },
  "tasks-empty-no-roles": {
    label: "Tasks · empty · no career roles yet (Roadmap-first CTA)",
    profile: profile(),
    tasks: [],
    roles: [],
  },
  "tasks-empty-with-roles": {
    label: "Tasks · empty · with career roles (Generate-tasks CTA)",
    profile: profile(),
    tasks: [],
    roles: [{ id: "role-1", user_id: UID, role_title: "Product Manager", track: "track_1" }],
  },
  "tasks-populated": {
    label: "Tasks · 6 tasks across all categories + priorities + states",
    profile: profile(),
    tasks: TASKS,
    roles: [{ id: "role-1", user_id: UID, role_title: "Product Manager", track: "track_1" }],
  },
  "tasks-filter-skill": {
    label: "Tasks · filter 'Skill gap' selected (1 card visible)",
    profile: profile(),
    tasks: TASKS,
    roles: [{ id: "role-1", user_id: UID, role_title: "Product Manager", track: "track_1" }],
    filter: "skill",
  },
  "tasks-filter-networking": {
    label: "Tasks · filter 'Networking' selected (1 active + 1 completed)",
    profile: profile(),
    tasks: TASKS,
    roles: [{ id: "role-1", user_id: UID, role_title: "Product Manager", track: "track_1" }],
    filter: "networking",
  },
  "tasks-onboarding-fallback-banner": {
    label: "Tasks · onboarding-fallback banner (personalise CTA)",
    profile: profile({ onboarding_complete: true }),
    tasks: ONBOARDING_FALLBACK_TASKS,
    roles: [{ id: "role-1", user_id: UID, role_title: "Product Manager", track: "track_1" }],
  },
  "tasks-generate-error": {
    label: "Tasks · generate error banner (retry CTA)",
    profile: profile(),
    tasks: TASKS,
    roles: [{ id: "role-1", user_id: UID, role_title: "Product Manager", track: "track_1" }],
    generateError: "Edge function returned 500. Try again in a moment.",
  },
  "tasks-date-editor-open": {
    label: "Tasks · first task · inline date picker open with Clear + dismiss",
    profile: profile(),
    tasks: TASKS,
    roles: [{ id: "role-1", user_id: UID, role_title: "Product Manager", track: "track_1" }],
    editDateForTaskId: "task-1",
  },
};

export const TASKS_STATE_IDS = Object.keys(TASKS_FIXTURES);
export const TASKS_FIXTURE_UID = UID;

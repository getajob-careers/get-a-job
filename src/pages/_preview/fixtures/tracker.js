// Tracker preview fixtures — drive every render branch of Tracker.jsx.
// Each fixture seeds the canonical query keys Tracker reads:
//   - userProfile (used by Layout chrome; not strictly needed for the
//     Tracker page-render path, but seeded for safety so the auth-stub
//     subtree never falls back to a refetch).
//   - applications (the primary list, ordered by created_at DESC).
//   - trackedJobsActiveStatus (the cross-ref Set populated for rows that
//     came from Browse Jobs with ats_source + external_id).

const UID = "tracker-fixture-user";

const D = (daysAgo) =>
  new Date(Date.now() - daysAgo * 86400000).toISOString();

function profile(overrides = {}) {
  return {
    id: UID,
    full_name: "Eli Englard",
    onboarding_complete: true,
    qualification_level: "Entry-level",
    last_reality_check_date: "2026-06-01T08:00:00.000Z",
    skill_gaps: [],
    practicum_path: null,
    education: [],
    ...overrides,
  };
}

// 5 applications spanning the statuses + tracks the page surfaces.
// Annotated by what they're meant to capture in the populated fixture:
//   - app-1 Associate PM @ monday.com  → applied / track_1 / 88% conf
//   - app-2 Product Analyst @ Riverside → interviewing / track_1 / 76%
//   - app-3 BizOps @ Fireblocks         → preparing / track_2 / 62%
//   - app-4 RevOps Analyst @ Lightricks → interested / track_3 / 41%
//   - app-5 Strategy & Ops @ Wix        → applied / NO TRACK YET (scoring),
//                                         ats-linked but jobs.is_active=false
//                                         → drives the "may no longer be
//                                         active" warning fixture.
const APPLICATIONS = [
  {
    id: "app-1",
    user_id: UID,
    role_title: "Associate Product Manager",
    company: "monday.com",
    status: "applied",
    track: "track_1",
    qualification_score: 0.88,
    goal_alignment_score: 0.94,
    source: "job_suggestion",
    score_source: "deterministic",
    job_description:
      "Drive product discovery and prioritization across our B2B SaaS surfaces. Partner with engineering, design, and customer success to ship the next quarter of product roadmap.",
    applied_date: "2026-05-30",
    cv_version_used: "Product CV — monday.com",
    referral_attached: true,
    ats_source: "greenhouse",
    external_id: "gh-1",
    checklist: {
      qualification_confirmed: true,
      jd_dissected: true,
      cv_tailored: true,
      skills_proof_mapped: false,
      referral_attempted: true,
      application_submitted: false,
      interview_prep_done: false,
    },
    created_at: D(3),
    updated_at: D(2),
  },
  {
    id: "app-2",
    user_id: UID,
    role_title: "Product Analyst",
    company: "Riverside",
    status: "interviewing",
    track: "track_1",
    qualification_score: 0.76,
    goal_alignment_score: 0.82,
    source: "job_suggestion",
    score_source: "deterministic",
    job_description:
      "Own the analytics behind product decisions: define metrics, build dashboards, run experiments. SQL + a-b testing + storytelling.",
    applied_date: "2026-05-20",
    cv_version_used: "Analyst CV v2",
    referral_attached: false,
    ats_source: "lever",
    external_id: "lv-1",
    checklist: {
      qualification_confirmed: true,
      jd_dissected: true,
      cv_tailored: true,
      skills_proof_mapped: true,
      referral_attempted: false,
      application_submitted: true,
      interview_prep_done: false,
    },
    created_at: D(10),
    updated_at: D(4),
  },
  {
    id: "app-3",
    user_id: UID,
    role_title: "BizOps Analyst",
    company: "Fireblocks",
    status: "preparing",
    track: "track_2",
    qualification_score: 0.62,
    goal_alignment_score: 0.55,
    source: "manual",
    score_source: "deterministic",
    job_description:
      "Partner with Finance + Sales on KPI reporting, deal-desk support, and ad-hoc business analyses.",
    applied_date: "",
    cv_version_used: "",
    referral_attached: false,
    ats_source: null,
    external_id: null,
    checklist: {
      qualification_confirmed: true,
      jd_dissected: false,
      cv_tailored: false,
      skills_proof_mapped: false,
      referral_attempted: false,
      application_submitted: false,
      interview_prep_done: false,
    },
    created_at: D(5),
    updated_at: D(5),
  },
  {
    id: "app-4",
    user_id: UID,
    role_title: "RevOps Analyst",
    company: "Lightricks",
    status: "interested",
    track: "track_3",
    qualification_score: 0.41,
    goal_alignment_score: 0.72,
    source: "manual",
    score_source: "deterministic",
    job_description: "",
    applied_date: "",
    cv_version_used: "",
    referral_attached: false,
    ats_source: null,
    external_id: null,
    checklist: {},
    created_at: D(7),
    updated_at: D(7),
  },
  {
    id: "app-5",
    user_id: UID,
    role_title: "Strategy & Operations Associate",
    company: "Wix",
    status: "applied",
    track: null, // unclassified → "Calculating track…" indicator
    qualification_score: null,
    goal_alignment_score: null,
    source: "job_suggestion",
    score_source: null,
    job_description: "",
    applied_date: "2026-05-22",
    cv_version_used: "",
    referral_attached: false,
    ats_source: "ashby",
    external_id: "ab-1",
    checklist: {},
    created_at: D(8),
    updated_at: D(8),
  },
];

// The inactive-listing fixture drops a single ats-linked row into the
// `trackedJobsActiveStatus` set so the row renders "This listing may no
// longer be active". We pass a Set, not an array — Tracker reads the
// query value as `inactiveExternalIds` and does `.has(...)`.
const INACTIVE_SET = new Set(["ashby|ab-1"]);

export const TRACKER_FIXTURES = {
  "tracker-empty": {
    label: "Tracker · empty (no applications)",
    profile: profile(),
    applications: [],
    inactive: new Set(),
  },
  "tracker-loading": {
    label: "Tracker · loading skeleton (applications query in flight)",
    profile: profile(),
    applications: [],
    inactive: new Set(),
    loading: true,
  },
  "tracker-populated": {
    label: "Tracker · 5 applications across statuses + tracks",
    profile: profile(),
    applications: APPLICATIONS,
    inactive: new Set(),
  },
  "tracker-filtered-applied": {
    label: "Tracker · filter pill 'Applied' selected (2 cards visible)",
    profile: profile(),
    applications: APPLICATIONS,
    inactive: new Set(),
    urlFlag: "filter=applied",
  },
  "tracker-expanded-steps": {
    label: "Tracker · first row expanded · 📋 Steps tab (grouped 7-step checklist)",
    profile: profile(),
    applications: APPLICATIONS,
    inactive: new Set(),
    urlFlag: "expand=app-1&tab=checklist",
  },
  "tracker-expanded-target": {
    label: "Tracker · first row expanded · Target role tab (JD textarea)",
    profile: profile(),
    applications: APPLICATIONS,
    inactive: new Set(),
    urlFlag: "expand=app-1&tab=target",
  },
  "tracker-expanded-locked-interview": {
    label: "Tracker · expanded · Interview tab locked (status=interested)",
    profile: profile(),
    applications: APPLICATIONS,
    inactive: new Set(),
    urlFlag: "expand=app-4&tab=interview",
  },
  "tracker-add-dialog": {
    label: "Tracker · Add application dialog open (mid-fill)",
    profile: profile(),
    applications: APPLICATIONS,
    inactive: new Set(),
    urlFlag: "add=1",
  },
  "tracker-inactive-listing": {
    label: "Tracker · ats-linked row with jobs.is_active=false ('may no longer be active')",
    profile: profile(),
    applications: APPLICATIONS,
    inactive: INACTIVE_SET,
  },
};

export const TRACKER_STATE_IDS = Object.keys(TRACKER_FIXTURES);
export const TRACKER_FIXTURE_UID = UID;

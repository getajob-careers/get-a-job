// Roadmap preview fixtures — drive every render branch of Roadmap.jsx.
// Each fixture seeds the canonical query keys Roadmap reads:
//   - userProfile, careerRoles, experiences, education, certifications,
//     projects, roadmap_tier1_jobs.
// The HomePreview pattern is reused: the harness wires these into a
// fresh QueryClient + a stub AuthContext.Provider, then mounts the real
// Roadmap.
//
// roadmap_tier1_jobs has a VARIABLE key shape — composed from the joined
// track-1 titles + allowedSeniorities + work_type. The harness reads each
// fixture's `tier1JobsKey` array fragment and combines it with the user
// id to match Roadmap's queryKey construction. Empty array == seed key
// `[..., uid, "", "", ""]` which matches the live page's empty-track-1
// state (the query stays disabled in that case anyway).

const UID = "roadmap-fixture-user";

function profile(overrides = {}) {
  return {
    id: UID,
    full_name: "Eli Englard",
    onboarding_complete: true,
    qualification_level: "Entry-level",
    overall_assessment:
      "Strong commercial instincts from a marketing background, with three internships in customer-facing roles. Ready for entry-level Product / Operations / RevOps tracks; needs more direct PM experience for stretch roles.",
    last_reality_check_date: "2026-06-01T08:00:00.000Z",
    skill_gaps: [],
    practicum_path: null,
    five_year_role: "Product Manager",
    work_type: ["Hybrid", "Remote"],
    education: [],
    ...overrides,
  };
}

const ROLES_MIXED = [
  {
    id: "r-1",
    user_id: UID,
    title: "Associate Product Manager",
    track: "track_1",
    match_score: 0.88,
    readiness_score: 0.88,
    goal_alignment_score: 0.94,
    matched_skills: ["customer_communication", "data_analysis", "stakeholder_management"],
    missing_skills: ["product_roadmapping", "sprint_planning"],
    skills_gap: ["product_roadmapping", "sprint_planning"],
    alignment_to_goal:
      "Associate PM is the natural first step toward your stated 5-year goal of Product Manager. Direct path, no detour.",
    alignment_reason: "Matches stated 5-year goal.",
    reasoning:
      "You hit the qualification bar on the customer + analytical axes. The two missing skills (roadmapping, sprint cadence) are typically built on the job in the first 6 months.",
    action_items: [
      "Ship a personal product side-project (1-page README + roadmap) to prove roadmapping intuition.",
      "Read 'Inspired' by Marty Cagan — the canonical PM reference for the framing your interviewers will use.",
    ],
  },
  {
    id: "r-2",
    user_id: UID,
    title: "Product Analyst",
    track: "track_1",
    match_score: 0.82,
    readiness_score: 0.82,
    goal_alignment_score: 0.78,
    matched_skills: ["data_analysis", "sql", "customer_communication"],
    missing_skills: ["a_b_testing", "product_metrics"],
    skills_gap: ["a_b_testing", "product_metrics"],
    reasoning:
      "Analyst-flavoured PM track. Strong analytical foundation; missing the experimentation vocabulary that hiring managers probe for.",
    alignment_to_goal: "",
    action_items: [
      "Run an A/B test on a real surface (LinkedIn post headline, side-project landing page) and write up the result.",
    ],
  },
  {
    id: "r-3",
    user_id: UID,
    title: "Customer Success Specialist",
    track: "track_2",
    match_score: 0.92,
    readiness_score: 0.92,
    goal_alignment_score: 0.42,
    matched_skills: ["customer_communication", "stakeholder_management", "crm_management"],
    missing_skills: [],
    skills_gap: [],
    reasoning:
      "You're well-qualified for entry-level Customer Success — but it takes you sideways from your Product Manager goal. Good fallback if the PM pipeline stalls.",
    alignment_to_goal: "Off-path from your stated 5-year goal.",
    action_items: [],
  },
  {
    id: "r-4",
    user_id: UID,
    title: "RevOps Analyst",
    track: "track_2",
    match_score: 0.74,
    readiness_score: 0.74,
    goal_alignment_score: 0.38,
    matched_skills: ["data_analysis", "sql"],
    missing_skills: ["salesforce_admin", "pipeline_modeling"],
    skills_gap: ["salesforce_admin", "pipeline_modeling"],
    reasoning:
      "Strong analytics-on-go-to-market fit. Off-path from Product but a meaningful detour if you want to learn revenue mechanics on the way.",
    alignment_to_goal: "",
    action_items: [],
  },
  {
    id: "r-5",
    user_id: UID,
    title: "Senior Product Manager",
    track: "track_3",
    match_score: 0.32,
    readiness_score: 0.32,
    goal_alignment_score: 0.96,
    matched_skills: ["stakeholder_management"],
    missing_skills: ["product_roadmapping", "team_leadership", "stakeholder_negotiation", "outcome_ownership"],
    skills_gap: ["product_roadmapping", "team_leadership", "stakeholder_negotiation", "outcome_ownership"],
    reasoning:
      "Perfectly on-path but too far ahead. Senior PM typically asks for 4-6 years of direct product experience. File under 'grow into this' over the next 2-3 years.",
    alignment_to_goal:
      "Exactly your goal trajectory — but you need direct PM tenure before this is reachable.",
    action_items: [
      "Don't apply for these yet — apply for Track 1 first, then this becomes reachable in 24-36 months.",
    ],
  },
];

export const ROADMAP_FIXTURES = {
  "roadmap-empty-no-profile": {
    label: "Roadmap · empty (no profile yet)",
    profile: null,
    roles: [],
  },
  "roadmap-empty-no-roles": {
    label: "Roadmap · empty (profile, no analysis run yet)",
    profile: profile({ qualification_level: null, overall_assessment: null, last_reality_check_date: null }),
    roles: [],
  },
  "roadmap-why": {
    label: "Roadmap · How tracks work tab (default, populated)",
    profile: profile(),
    roles: ROLES_MIXED,
  },
  "roadmap-track-1": {
    label: "Roadmap · Track 1 tab (sweet spot, all collapsed)",
    profile: profile(),
    roles: ROLES_MIXED,
    urlFlag: "tab=track_1",
  },
  "roadmap-track-1-expanded": {
    label: "Roadmap · Track 1 tab, first role card expanded (bars + reasoning + skills + action items)",
    profile: profile(),
    roles: ROLES_MIXED,
    urlFlag: "tab=track_1",
    expandFirstCard: true,
  },
  "roadmap-track-2": {
    label: "Roadmap · Track 2 tab (detour)",
    profile: profile(),
    roles: ROLES_MIXED,
    urlFlag: "tab=track_2",
  },
  "roadmap-track-3": {
    label: "Roadmap · Track 3 tab (growth)",
    profile: profile(),
    roles: ROLES_MIXED,
    urlFlag: "tab=track_3",
  },
  "roadmap-stale": {
    label: "Roadmap · stale banner (experience created_at > last_reality_check_date)",
    profile: profile({ last_reality_check_date: "2026-05-01T10:00:00.000Z" }),
    roles: ROLES_MIXED,
    experiences: [
      { id: "e-1", user_id: UID, title: "New role added post-analysis", created_at: "2026-05-28T10:00:00.000Z" },
    ],
  },
  "roadmap-generating": {
    label: "Roadmap · generating banner (?preview-generating=1)",
    profile: profile(),
    roles: ROLES_MIXED,
    urlFlag: "preview-generating=1",
  },
  "roadmap-error": {
    label: "Roadmap · error short-circuit (careerRoles + profile queries failed)",
    profile: null,
    roles: [],
    forceErrors: ["careerRoles", "userProfile"],
  },
};

export const ROADMAP_STATE_IDS = Object.keys(ROADMAP_FIXTURES);
export const ROADMAP_FIXTURE_UID = UID;

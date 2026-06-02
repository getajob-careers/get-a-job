// Internship fixtures — PR 3L (Internship / Practicum restyle).
//
// Internship.jsx loads conversations + targets via TanStack Query. The
// harness pre-seeds the queryClient with the fixture's profile + targets
// + pitch + status_changes data. Direct supabase reads still go through
// a fetch override (status_changes timeline + companies enrichment).
//
// 5 fixtures (3K lesson: seed enough data to populate the kanban):
//   1. populated-kanban  — full board, cards across all 6 statuses
//   2. add-own-modal     — AddOwnCompanyModal open (subtree)
//   3. drawer-open       — CompanyTargetDrawer open (subtree)
//   4. match-result      — FindCompaniesCard + populated kanban
//   5. empty-pipeline    — 0 targets, InternshipStartHere visible

const UID = "internship-fixture-user";

const ISO = (msAgo) => new Date(Date.now() - msAgo).toISOString();

function profile(overrides = {}) {
  return {
    id: UID,
    full_name: "Eli Englard",
    onboarding_complete: true,
    practicum_path: "self_sourced",
    practicum_status: "matched",
    practicum_cohort: "Aug 2026",
    ...overrides,
  };
}

function company(id, overrides = {}) {
  return {
    id,
    name: overrides.name || `Company ${id}`,
    domain: overrides.domain || `${id}.com`,
    description: overrides.description || null,
    industry: overrides.industry || null,
    sector: overrides.sector || null,
    stage: overrides.stage || null,
    hq_country: overrides.hq_country || "IL",
    hq_city: overrides.hq_city || "Tel Aviv",
    employee_count_range: overrides.employee_count_range || null,
    source: overrides.source || "manual",
    created_by: overrides.created_by || null,
    ...overrides,
  };
}

function target(id, status, overrides = {}) {
  return {
    id,
    user_id: UID,
    company_id: overrides.companies?.id || `co-${id}`,
    status,
    source: overrides.source || "matched",
    match_score: overrides.match_score ?? null,
    match_rationale: overrides.match_rationale ?? null,
    pitched_role: overrides.pitched_role ?? null,
    notes: overrides.notes ?? null,
    created_at: overrides.created_at || ISO(7 * 86400000),
    updated_at: overrides.updated_at || ISO(2 * 86400000),
    companies: overrides.companies || null,
    ...overrides,
  };
}

// Twelve targets spread across the 6 status columns — covers all the
// kanban states + sources (matched / faculty_assigned / self_added).
const POPULATED_TARGETS = [
  // bandForLlmScore thresholds: ≥85 = high (coral), 70-84 = real (warm),
  // 50-69 = stretch (faded), <50 = none. Spread fixture scores across
  // all three bands so the PDF demonstrates the visual variety.

  // Exploring (3) — high + real bands
  target("t-1", "exploring", {
    source: "matched",
    match_score: 88,
    match_rationale: "Strong product analytics fit with Reichman alumni network.",
    pitched_role: "Product Analyst internship",
    companies: company("co-1", { name: "monday.com", sector: "B2B SaaS", stage: "Public" }),
  }),
  target("t-2", "exploring", {
    source: "matched",
    match_score: 78,
    match_rationale: "Activation-focused PM org; Guardio onboarding story maps cleanly.",
    pitched_role: "Customer Success Intern",
    companies: company("co-2", { name: "Lightricks", sector: "Consumer SaaS", stage: "Growth" }),
  }),
  target("t-3", "exploring", {
    source: "self_added",
    pitched_role: "Growth Analyst",
    companies: company("co-3", { name: "Wix", sector: "Web platform", stage: "Public" }),
  }),
  // Outreach sent (2) — stretch band
  target("t-4", "outreach_sent", {
    source: "matched",
    match_score: 64,
    pitched_role: "Product Analyst internship",
    companies: company("co-4", { name: "Riverside", sector: "B2B media", stage: "Series B" }),
  }),
  target("t-5", "outreach_sent", {
    source: "faculty_assigned",
    pitched_role: "Operations Intern",
    companies: company("co-5", { name: "Verbit", sector: "Enterprise SaaS", stage: "Late stage" }),
  }),
  // Interview (2) — real band
  target("t-6", "interview", {
    source: "matched",
    match_score: 76,
    pitched_role: "Customer Success",
    companies: company("co-6", { name: "Guardio", sector: "Consumer security", stage: "Growth" }),
  }),
  target("t-7", "interview", {
    source: "self_added",
    pitched_role: "Product Ops",
    companies: company("co-7", { name: "Atera", sector: "B2B SaaS", stage: "Growth" }),
  }),
  // Offered (2) — high band
  target("t-8", "offered", {
    source: "matched",
    match_score: 87,
    pitched_role: "Product Analyst Intern",
    companies: company("co-8", { name: "Tomorrow.fin", sector: "Fintech", stage: "Series B" }),
  }),
  target("t-9", "offered", {
    source: "faculty_assigned",
    pitched_role: "Marketing Intern",
    companies: company("co-9", { name: "Bringg", sector: "Logistics SaaS", stage: "Series C" }),
  }),
  // Rejected (2) — stretch band
  target("t-10", "rejected", {
    source: "matched",
    match_score: 58,
    pitched_role: "Product Analyst Intern",
    companies: company("co-10", { name: "Papaya", sector: "Payroll SaaS", stage: "Series C" }),
  }),
  target("t-11", "rejected", {
    source: "self_added",
    pitched_role: "Strategy Intern",
    companies: company("co-11", { name: "Forter", sector: "Fraud prevention", stage: "Late stage" }),
  }),
  // Declined (1) — stretch band
  target("t-12", "declined", {
    source: "matched",
    match_score: 62,
    pitched_role: "Customer Success",
    companies: company("co-12", { name: "Walkme", sector: "DAP", stage: "Public" }),
  }),
];

const INTERNSHIP_PROFILE = {
  user_id: UID,
  realistic_company_stages: ["Series A", "Series B", "Growth"],
  realistic_sectors: ["B2B SaaS", "Consumer SaaS", "Fintech"],
  // ruleScore (src/lib/internshipRuleScore.js) reads .length on this
  // array — must be present (possibly empty) or the browse-grid render
  // crashes inside the score computation memo.
  realistic_signal_filters: ["activation", "onboarding", "product analytics"],
  pitchable_role_archetypes: [
    "Product Analyst Intern",
    "Customer Success Intern",
    "Operations Intern",
  ],
  pitch_strength_signals: ["Guardio activation work", "Reichman alumni network", "SQL fluency"],
  skill_gaps_to_close: ["Experimentation frameworks", "Window functions"],
  track_1_role_alignment: "Product Analyst aligns with your stated track-1 goal.",
  career_compound_rationale:
    "An internship at an IL B2B SaaS in the activation space sets up Year-2 hiring at a US-headquartered analytics-led PM org.",
  generated_from_career_roles_at: ISO(3 * 86400000),
};

const STATUS_CHANGES = [
  {
    id: "sc-1",
    target_id: "t-6",
    user_id: UID,
    old_status: "exploring",
    new_status: "outreach_sent",
    note: "Sent intro via Sarah Cohen — Reichman alumna at Guardio.",
    changed_at: ISO(5 * 86400000),
  },
  {
    id: "sc-2",
    target_id: "t-6",
    user_id: UID,
    old_status: "outreach_sent",
    new_status: "interview",
    note: "Got the call. First round Tuesday.",
    changed_at: ISO(2 * 86400000),
  },
];

export const INTERNSHIP_FIXTURES = {
  "internship-populated-kanban": {
    label: "Internship · populated kanban across all 6 statuses",
    tab: "pipeline",
    profile: profile(),
    internshipProfile: INTERNSHIP_PROFILE,
    targets: POPULATED_TARGETS,
    statusChanges: STATUS_CHANGES,
  },
  "internship-add-own-modal": {
    label: "Internship · Add own company modal open (subtree)",
    tab: "pipeline",
    profile: profile(),
    internshipProfile: INTERNSHIP_PROFILE,
    targets: POPULATED_TARGETS,
    statusChanges: STATUS_CHANGES,
    subtreeOnly: "add-own-modal",
  },
  "internship-drawer-open": {
    label: "Internship · CompanyTargetDrawer open (subtree)",
    tab: "pipeline",
    profile: profile(),
    internshipProfile: INTERNSHIP_PROFILE,
    targets: POPULATED_TARGETS,
    statusChanges: STATUS_CHANGES,
    subtreeOnly: "drawer-open",
    drawerTargetId: "t-6", // interview-stage target with audit trail
  },
  "internship-match-result": {
    label: "Internship · FindCompaniesCard + populated kanban",
    tab: "pipeline",
    profile: profile(),
    internshipProfile: INTERNSHIP_PROFILE,
    targets: POPULATED_TARGETS,
    statusChanges: STATUS_CHANGES,
  },
  "internship-empty-pipeline": {
    label: "Internship · empty pipeline + InternshipStartHere",
    tab: "pipeline",
    profile: profile(),
    internshipProfile: null, // user hasn't generated yet
    targets: [],
    statusChanges: [],
  },
  // PR 3L: browse-tab coverage. Exercises the .brz-* CSS surface
  // (cards, filter pills, score chips, footer borders) so the rd-token
  // migration of browseStyles.js is visually verified in the PDF.
  // Without this fixture the act-* → rd-* CSS-var rewrite was untested
  // — the bug Eli caught before the prior re-surface.
  "internship-browse-grid": {
    label: "Internship · Browse tab · populated grid + filters",
    tab: "browse",
    profile: profile(),
    internshipProfile: INTERNSHIP_PROFILE,
    targets: POPULATED_TARGETS,
    statusChanges: STATUS_CHANGES,
  },
};

export const INTERNSHIP_STATE_IDS = Object.keys(INTERNSHIP_FIXTURES);
export const INTERNSHIP_FIXTURE_UID = UID;

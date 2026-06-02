// LinkedIn preview fixtures — 3J-A Profile tab only.
//
// ProfileTab.jsx does a direct supabase.from("linkedin_optimizations")
// .select(...).maybeSingle() call in useEffect on mount (not wrapped in
// TanStack Query), so seeding via setQueryData alone is not enough.
// The harness installs a fetch override that mocks PostgREST responses
// for that exact URL + the generate-linkedin-content edge function.
// Everything else falls through to the real fetch (which 401s in DEV
// for non-mocked endpoints — harmless for the preview).
//
// Each fixture carries:
//   - profile:  { full_name, location } for the useProfileQuery seed
//   - linkedinOptimizations: the row returned by the maybeSingle() call
//     (or null for the empty-baseline path)
//   - generateError: { status, message } to drive the error banner via
//     a post-mount Generate-button click
//   - postMountAction: drives view-toggle and refine-form opens via
//     DOM clicks (the corresponding state lives in local useState
//     inside ProfilePreview, so a click is the only outside-in driver)

const UID = "linkedin-fixture-user";

// Sample baseline + generated content. Both refer to the same
// `experience_id` keys so the "Optimized" pills track changes by
// section per the live diff logic.
const BASELINE = {
  profile: {
    headline: "Business administration student",
    about:
      "Business administration student passionate about technology and product. A fast learner looking for opportunities to grow and make an impact.",
  },
  positions: [
    {
      position_id: "pos-1",
      Title: "Customer Success Intern",
      "Company Name": "Guardio",
      Description:
        "Helped customers with onboarding. Answered support questions and worked with the team to improve activation.",
    },
    {
      position_id: "pos-2",
      Title: "Marketing Coordinator",
      "Company Name": "Reichman Student Union",
      Description: "Coordinated marketing for events.",
    },
  ],
  volunteering: [],
  _meta: {
    counts: { positions: 2, skills: 18, education: 1, honors: 2, volunteering: 0 },
    imported_at: "2026-05-30T00:00:00.000Z",
  },
};

const GENERATED = {
  headline: "Aspiring Product Manager · turning user research into product decisions",
  about:
    "Business student moving into product management. At Guardio I owned onboarding for a portfolio of SMB accounts, where a two-line setup checklist cut first-week churn in my cohort. I care about the unglamorous decisions that move retention — and I'm looking for an associate PM or product ops role.",
  experiences: [
    {
      experience_id: "pos-1",
      description:
        "Owned onboarding for a portfolio of SMB accounts at Guardio. Built a two-line setup checklist that made the activation steps unavoidable; first-week churn in that cohort dropped from 31% to 14% over six weeks. The checklist is still the default onboarding flow.",
    },
    {
      experience_id: "pos-2",
      description:
        "Led marketing for four back-to-back student-council events across the spring semester. Coordinated a six-person team; two of the four events became annual fixtures the council still runs.",
    },
  ],
  volunteering: [],
  military: [],
  honors: [
    {
      name: "Dean's List · Reichman University",
      description:
        "Top-decile academic standing, awarded each semester for sustained GPA above the school's distinction threshold.",
    },
    {
      name: "Merit Scholarship",
      description: "",
    },
  ],
  skills_priority: [
    { skill: "Product Management", rationale: "Anchors the headline." },
    { skill: "Customer Success", rationale: "Strongest narrated evidence (Guardio onboarding)." },
    { skill: "Product Analytics", rationale: "Newly added — supports the funnel-dashboards narrative." },
    { skill: "SQL", rationale: "Listed but unused on Guardio bullets." },
    { skill: "Stakeholder Management", rationale: "Common in PM target roles." },
  ],
  experience_labels: {
    "pos-1": "Customer Success Intern at Guardio",
    "pos-2": "Marketing Coordinator at Reichman Student Union",
  },
};

function profile(overrides = {}) {
  return {
    id: UID,
    full_name: "Eli Englard",
    location: "Tel Aviv, Israel",
    onboarding_complete: true,
    ...overrides,
  };
}

export const LINKEDIN_FIXTURES = {
  "linkedin-profile-empty": {
    label: "LinkedIn · Profile tab · empty state (no baseline, no content)",
    profile: profile(),
    linkedinOptimizations: null,
  },
  "linkedin-profile-baseline-imported": {
    label: "LinkedIn · Profile tab · baseline imported, awaiting Generate",
    profile: profile(),
    linkedinOptimizations: {
      baseline_data: BASELINE,
      generated_data: null,
    },
  },
  "linkedin-profile-optimized": {
    label: "LinkedIn · Profile tab · fully generated · Optimized view (default)",
    profile: profile(),
    linkedinOptimizations: {
      baseline_data: BASELINE,
      generated_data: GENERATED,
    },
  },
  "linkedin-profile-toggle-current": {
    label: "LinkedIn · Profile tab · toggle = Current (raw baseline rendered)",
    profile: profile(),
    linkedinOptimizations: {
      baseline_data: BASELINE,
      generated_data: GENERATED,
    },
    postMountAction: { kind: "toggle-current" },
  },
  "linkedin-profile-section-refine-open": {
    label: "LinkedIn · Profile tab · About section refine form open",
    profile: profile(),
    linkedinOptimizations: {
      baseline_data: BASELINE,
      generated_data: GENERATED,
    },
    postMountAction: { kind: "open-refine-about" },
  },
  "linkedin-profile-error": {
    label: "LinkedIn · Profile tab · rate-limit error banner",
    profile: profile(),
    linkedinOptimizations: {
      baseline_data: BASELINE,
      generated_data: null,
    },
    generateError: {
      status: 429,
      message: "Rate limit reached (30 generations/hour). Try again in a bit.",
    },
    postMountAction: { kind: "click-generate" },
  },
};

export const LINKEDIN_STATE_IDS = Object.keys(LINKEDIN_FIXTURES);
export const LINKEDIN_FIXTURE_UID = UID;

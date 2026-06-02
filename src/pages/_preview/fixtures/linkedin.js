// LinkedIn preview fixtures — 3J-A (Profile) + 3J-B (Posts).
//
// ProfileTab + PostsTab use direct supabase calls in useEffect (NOT
// TanStack-wrapped), so the harness installs a fetch override that
// mocks PostgREST endpoints + the relevant edge functions. Cleanup
// restores the real fetch on unmount.
//
// Two render modes per fixture:
//   - default: render full `<Linkedin>` page; harness pins `?tab=` via
//     `Navigate replace`. Post-mount DOM clicks drive view transitions.
//   - subtreeOnly: render page shell + tab bar manually, bypass the
//     orchestrator, render the named component standalone with seeded
//     props. Used for states deep in the PostsTab state machine that
//     can't be driven by mocked-fetch alone (preview / refine-open /
//     image-attached).

const UID = "linkedin-fixture-user";

// ── Profile fixture data (3J-A — unchanged) ─────────────────────────
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

// ── Posts fixture data (3J-B) ───────────────────────────────────────
const SAVED_POSTS = [
  {
    id: "post-1",
    user_id: UID,
    post_type: "lessons",
    inputs: { source_type: "role", source_name: "Customer Success Intern at Guardio", lessons: ["Onboarding-completion-rate is the leading retention signal — it predicts week-4 churn cleanly.", "VIP cohorts watch what other VIPs do; one-on-one calls scale far less than a shared onboarding doc.", "Friction in the first five steps is what loses cohorts — anything beyond step five is upside, not save."] },
    story_id: null,
    generated_data: {
      post_text: "Three months into owning onboarding, I learned the fastest way to cut churn wasn't a new feature — it was a two-line setup checklist.\n\nWe'd been blaming the product. The data said otherwise: the users who finished setup in week one stayed. So we made finishing unavoidable, and that cohort's churn dropped.\n\nThe lesson I keep coming back to: the problem usually isn't the thing everyone's pointing at.\n\n#productmanagement #customersuccess",
      hook_preview: "Three months into owning onboarding, I learned the fastest way to cut churn wasn't a new feature — it was a two-line setup checklist.",
    },
    edited_text: null,
    user_published_at: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "post-2",
    user_id: UID,
    post_type: "project",
    inputs: { project_name: "VIP onboarding redesign", context: "company", what_you_built: "...", outcome: "..." },
    story_id: "story-1",
    generated_data: {
      post_text: "I rewrote VIP onboarding at Guardio from a 4-step manual handoff into a self-serve guided tour. Time-to-first-value dropped from 8 days to 3. The VIP cohort hit 88% feature adoption in their first quarter.\n\nWhat surprised me: the win was in the empty space, not the steps. Removing two confirmation screens did more than rewriting any of the copy.\n\n#productdesign #customersuccess",
      hook_preview: "I rewrote VIP onboarding at Guardio from a 4-step manual handoff into a self-serve guided tour. Time-to-first-value dropped from 8 days to 3.",
    },
    edited_text: null,
    user_published_at: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "post-3",
    user_id: UID,
    post_type: "milestone",
    inputs: { milestone_type: "internship_offer", the_thing: "Product Analyst internship at Riverside" },
    story_id: null,
    generated_data: {
      post_text: "Excited to share — I'm joining Riverside as a Product Analyst intern this summer.\n\nThree people made this possible: Maya at monday.com who refactored my CV with me, Daniel who walked me through the SQL window-function patterns Riverside cared about, and my Customer Success lead at Guardio who let me redirect my last month toward analytics work.\n\nFirst two weeks I'm shadowing the activation cohort. Concrete first.\n\n#newrole #productanalytics",
      hook_preview: "I'm joining Riverside as a Product Analyst intern this summer.",
    },
    edited_text: "Joining Riverside as a Product Analyst intern this summer. Three people made this possible — Maya at monday.com refactored my CV with me, Daniel walked me through the SQL window-function patterns Riverside cared about, and my Customer Success lead at Guardio let me redirect my last month toward analytics work.\n\nFirst two weeks I'm shadowing the activation cohort. Concrete first.\n\n#newrole #productanalytics",
    user_published_at: null,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 13 * 86400000).toISOString(),
  },
];

// Synthetic "preview-mode" post object — matches the shape PostPreview
// expects (post.post_text, post.hook_preview, post.hashtag_suggestions,
// post.format_recommendation, post.format_reason, post.saveable_score,
// post.warnings[]). Used by `subtreeOnly: "post-preview"` fixtures so we
// can show the feed-card simulacrum without driving the full state
// machine.
const PREVIEW_POST = {
  post_id: "post-preview",
  post_text:
    "Three months into owning onboarding, I learned the fastest way to cut churn wasn't a new feature — it was a two-line setup checklist.\n\nWe'd been blaming the product. The data said otherwise: the users who finished setup in week one stayed. So we made finishing unavoidable, and that cohort's churn dropped.\n\nThe lesson I keep coming back to: the problem usually isn't the thing everyone's pointing at.\n\n#productmanagement #customersuccess",
  hook_preview:
    "Three months into owning onboarding, I learned the fastest way to cut churn wasn't a new feature — it was a two-line setup checklist.",
  hashtag_suggestions: ["#productmanagement", "#customersuccess", "#earlycareer"],
  format_recommendation: "text",
  format_reason:
    "Story-driven lesson post — text format outperforms image/carousel here. The hook does the work.",
  saveable_score: 8,
  warnings: [],
  generated_at: new Date().toISOString(),
};

const PREVIEW_INPUTS = {
  source_type: "role",
  source_name: "Customer Success Intern at Guardio",
  lessons: [
    "Onboarding-completion-rate is the leading retention signal — it predicts week-4 churn cleanly.",
    "VIPs watch what other VIPs do; one-on-one calls scale far less than a shared onboarding doc.",
    "Friction in the first five steps is what loses cohorts — anything beyond step five is upside, not save.",
  ],
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
  // ── 3J-A Profile fixtures (unchanged from prior PR) ────────────
  "linkedin-profile-empty": {
    label: "LinkedIn · Profile tab · empty state (no baseline, no content)",
    tab: "profile",
    profile: profile(),
    linkedinOptimizations: null,
  },
  "linkedin-profile-baseline-imported": {
    label: "LinkedIn · Profile tab · baseline imported, awaiting Generate",
    tab: "profile",
    profile: profile(),
    linkedinOptimizations: {
      baseline_data: BASELINE,
      generated_data: null,
    },
  },
  "linkedin-profile-optimized": {
    label: "LinkedIn · Profile tab · fully generated · Optimized view (default)",
    tab: "profile",
    profile: profile(),
    linkedinOptimizations: {
      baseline_data: BASELINE,
      generated_data: GENERATED,
    },
  },
  "linkedin-profile-toggle-current": {
    label: "LinkedIn · Profile tab · toggle = Current (raw baseline rendered)",
    tab: "profile",
    profile: profile(),
    linkedinOptimizations: {
      baseline_data: BASELINE,
      generated_data: GENERATED,
    },
    postMountAction: { kind: "toggle-current" },
  },
  "linkedin-profile-section-refine-open": {
    label: "LinkedIn · Profile tab · About section refine form open",
    tab: "profile",
    profile: profile(),
    linkedinOptimizations: {
      baseline_data: BASELINE,
      generated_data: GENERATED,
    },
    postMountAction: { kind: "open-refine-about" },
  },
  "linkedin-profile-error": {
    label: "LinkedIn · Profile tab · rate-limit error banner",
    tab: "profile",
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

  // ── 3J-B Posts fixtures (this PR) ───────────────────────────────
  "linkedin-posts-idle-empty": {
    label: "LinkedIn · Posts tab · idle · type grid + empty history",
    tab: "posts",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    posts: [],
  },
  "linkedin-posts-idle-with-history": {
    label: "LinkedIn · Posts tab · idle · type grid + 3 saved posts",
    tab: "posts",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    posts: SAVED_POSTS,
  },
  "linkedin-posts-compose-project": {
    label: "LinkedIn · Posts tab · compose Project (post-mount click)",
    tab: "posts",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    posts: [],
    postMountAction: { kind: "select-post-type", type: "project" },
  },
  "linkedin-posts-compose-observation": {
    label: "LinkedIn · Posts tab · compose Observation (warning banner visible)",
    tab: "posts",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    posts: [],
    postMountAction: { kind: "select-post-type", type: "observation" },
  },
  "linkedin-posts-compose-free-form": {
    label: "LinkedIn · Posts tab · compose Free-form (escape-hatch intro card)",
    tab: "posts",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    posts: [],
    postMountAction: { kind: "select-post-type", type: "free_form" },
  },
  "linkedin-posts-preview-feed-card": {
    label: "LinkedIn · Posts tab · preview feed-card simulacrum (no image)",
    tab: "posts",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    subtreeOnly: "post-preview",
    previewPost: PREVIEW_POST,
    previewInputs: PREVIEW_INPUTS,
    previewPostType: "lessons",
    previewImageUrl: null,
  },
  "linkedin-posts-preview-with-image": {
    label: "LinkedIn · Posts tab · preview feed-card with image attached",
    tab: "posts",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    subtreeOnly: "post-preview",
    previewPost: PREVIEW_POST,
    previewInputs: PREVIEW_INPUTS,
    previewPostType: "lessons",
    previewImageUrl:
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=640&q=80",
  },
  "linkedin-posts-preview-refine-open": {
    label: "LinkedIn · Posts tab · preview · Refine textarea open",
    tab: "posts",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    subtreeOnly: "post-preview",
    previewPost: PREVIEW_POST,
    previewInputs: PREVIEW_INPUTS,
    previewPostType: "lessons",
    previewImageUrl: null,
    postMountAction: { kind: "open-refine-post" },
  },
};

export const LINKEDIN_STATE_IDS = Object.keys(LINKEDIN_FIXTURES);
export const LINKEDIN_FIXTURE_UID = UID;

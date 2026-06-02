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

  // ── 3J-C Networking fixtures (this PR) ──────────────────────────
  "linkedin-networking-list-empty": {
    label: "LinkedIn · Networking · Outreach list empty + Comment Coach",
    tab: "networking",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    outreachConversations: [],
  },
  "linkedin-networking-list-with-conversations": {
    label: "LinkedIn · Networking · Outreach list with 3 conversations",
    tab: "networking",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    outreachConversations: [
      {
        id: "conv-1",
        goal: "propose_internship",
        target_person: { name: "Maya Levi", role: "PM Lead", company: "monday.com" },
        status: "active",
        message_thread: [
          { role: "user", text: "Hi Maya — I'm a Reichman business student focused on product…", ts: new Date(Date.now() - 3 * 86400000).toISOString() },
          { role: "them", text: "Thanks for reaching out! We do take a few interns each semester. What kind of work are you hoping to do?", ts: new Date(Date.now() - 2 * 86400000).toISOString() },
        ],
        updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: "conv-2",
        goal: "message_recruiter",
        target_person: { name: "Daniel Ofer", role: "Talent Lead", company: "Riverside" },
        status: "active",
        message_thread: [
          { role: "user", text: "Hi Daniel — I saw the Product Analyst opening at Riverside…", ts: new Date(Date.now() - 1 * 86400000).toISOString() },
        ],
        updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: "conv-3",
        goal: "thank_you_follow_up",
        target_person: { name: "Sara Cohen", role: "Senior PM", company: "Lightricks" },
        status: "completed",
        message_thread: [
          { role: "user", text: "Hi Sara — thanks for the mock-interview prep…", ts: new Date(Date.now() - 14 * 86400000).toISOString() },
          { role: "them", text: "Happy to help! Good luck with the rest of the process.", ts: new Date(Date.now() - 13 * 86400000).toISOString() },
        ],
        updated_at: new Date(Date.now() - 13 * 86400000).toISOString(),
      },
    ],
  },
  "linkedin-networking-composer-goal-picker": {
    label: "LinkedIn · Networking · composer @ goal picker (grouped 9 goals)",
    tab: "networking",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    outreachConversations: [],
    postMountAction: { kind: "click-new-conversation" },
  },
  "linkedin-networking-composer-target-form": {
    label: "LinkedIn · Networking · composer @ describe target (after goal pick)",
    tab: "networking",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    outreachConversations: [],
    postMountAction: { kind: "pick-goal-propose-internship" },
  },
  "linkedin-networking-composer-thread-suggestion": {
    label: "LinkedIn · Networking · thread + agent suggestion (no warnings)",
    tab: "networking",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    outreachConversations: [],
    subtreeOnly: "outreach-thread",
    threadConversation: {
      id: "conv-thread",
      goal: "propose_internship",
      target_person: { name: "Maya Levi", role: "PM Lead", company: "monday.com", relationship: "alumni from Reichman" },
      status: "active",
      message_thread: [
        { role: "user", name: "Eli", text: "Hi Maya — I'm a Reichman business student focused on product, and I've followed Monday's work on workflow automation. I'm part of my university's internship program and would love to learn how your team thinks about onboarding.", ts: new Date(Date.now() - 3 * 86400000).toISOString() },
        { role: "them", name: "Maya", text: "Thanks for reaching out! We do take a few interns each semester. What kind of work are you hoping to do?", ts: new Date(Date.now() - 2 * 86400000).toISOString() },
      ],
    },
    threadSuggestion: {
      suggested_text:
        "Thanks, Maya! If it'd be useful, one thing I could dig into is your week-one activation. I owned onboarding at Guardio and cut first-week churn with a simple setup checklist — so I'd be glad to look at where new Monday teams drop off early on, and share a short writeup either way.",
      angle: "Concrete proposal grounded in real Guardio result",
      turn_type: "next_response",
      conversation_state: "rapport_built",
      warm_up_advice: "",
      warnings: [],
    },
  },
  "linkedin-networking-composer-warm-up-warning": {
    label: "LinkedIn · Networking · thread + warm_up_advice 'Coach's advice' WARNING (Q4)",
    tab: "networking",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    outreachConversations: [],
    subtreeOnly: "outreach-thread",
    threadConversation: {
      id: "conv-warmup",
      goal: "ask_for_referral",
      target_person: { name: "Tom Bennett", role: "Senior PM", company: "Wix", relationship: "we worked together briefly on the campus hackathon last year" },
      status: "active",
      message_thread: [
        { role: "user", name: "Eli", text: "Hi Tom — long time no speak! Wondering if you could put me through to the Wix PM team for the Product Analyst role.", ts: new Date(Date.now() - 1 * 86400000).toISOString() },
      ],
    },
    threadSuggestion: {
      suggested_text:
        "Hey Tom — it's been a while since the hackathon. Hope things are good. I've been working on the analytics side at Guardio and was reflecting on some of the activation patterns we saw — curious if Wix runs into anything similar at scale. Would love to hear what's been keeping you busy.",
      angle: "Pure reconnection — ask deferred to turn 2",
      turn_type: "opener",
      conversation_state: "warming_up",
      warm_up_advice: "This relationship is warm but not strong enough for a turn-1 ask. Send a reconnection message first, then bring up the referral in your next turn. Path B is the play here.",
      warnings: [],
    },
  },
  "linkedin-networking-composer-warning-only": {
    label: "LinkedIn · Networking · thread + edge-fn warnings (no warm-up advice)",
    tab: "networking",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    outreachConversations: [],
    subtreeOnly: "outreach-thread",
    threadConversation: {
      id: "conv-warnings",
      goal: "message_recruiter",
      target_person: { name: "Daniel Ofer", role: "Talent Lead", company: "Riverside" },
      status: "active",
      message_thread: [
        { role: "user", name: "Eli", text: "Hi Daniel — interested in the Product Analyst role.", ts: new Date(Date.now() - 1 * 86400000).toISOString() },
      ],
    },
    threadSuggestion: {
      suggested_text:
        "Hi Daniel — saw the Product Analyst opening at Riverside. I owned the activation funnel dashboards at monday.com over the summer; the patterns mapped well to what your JD describes around adoption metrics. Happy to share a quick writeup or set up a call.",
      angle: "Direct opener with concrete recent experience",
      turn_type: "opener",
      conversation_state: "cold_open",
      warm_up_advice: "",
      warnings: [
        "Consider waiting until Tuesday morning Israel time — Mondays often see recruiter inboxes flooded.",
      ],
    },
  },
  "linkedin-networking-comment-coach-options": {
    label: "LinkedIn · Networking · Comment Coach with 3 options",
    tab: "networking",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    outreachConversations: [],
    subtreeOnly: "comment-coach",
    commentCoachState: {
      postText:
        "Three months into owning CS at a small SaaS — the most counterintuitive lesson is that activation completion rate is a better leading indicator of retention than CSAT. CSAT measures how the customer felt about one interaction; activation measures whether they'll come back.",
      authorName: "Sarah Chen",
      authorHeadline: "VP Customer Success at Verbit",
      result: {
        options: [
          {
            angle: "Echo + concrete add",
            text: "Sarah — this matches what I saw at Guardio. We tracked CSAT for 18 months before noticing it lagged adoption-rate by ~3 weeks. The win was switching the early-warning dashboard to adoption-per-VIP-cohort; we caught two retention risks earlier than CSAT would have. One nuance: the threshold for 'activated' matters more than the metric itself — we re-tightened ours twice in the first quarter.",
          },
          {
            angle: "Question the bar",
            text: "Curious how you're defining 'activated' for this — is it tied to a specific feature usage count, an in-app event, or a time-based threshold (e.g. 7-day usage frequency)? At Guardio we initially used login-frequency and got false positives; switching to feature-completion gave a cleaner predictive signal but took two months to backfill.",
          },
          {
            angle: "Counterexample",
            text: "Agree on activation as the leading indicator most of the time, but with one wrinkle: for very long sales cycles (enterprise B2B) activation can lag the deal economics by months. CSAT during the proof-of-concept phase tracked closer to renewal for us than first-month activation did. Activation became the right metric only after the first contract anniversary.",
          },
        ],
      },
    },
  },
  "linkedin-networking-comment-coach-no-fit": {
    label: "LinkedIn · Networking · Comment Coach anti-fab 'no genuine relevance' banner",
    tab: "networking",
    profile: profile(),
    linkedinOptimizations: { baseline_data: BASELINE, generated_data: GENERATED },
    outreachConversations: [],
    subtreeOnly: "comment-coach",
    commentCoachState: {
      postText:
        "Lessons from running a series-B fintech: scaling compliance is the moat. Three years in, our regulatory infrastructure is what makes the unit economics work — not the rates we charge.",
      authorName: "Roni Adler",
      authorHeadline: "CEO at Tomorrow.fin",
      result: {
        options: [],
        no_fit_reason:
          "Your profile is centered on early-career product work; you have no fintech or compliance experience to ground a substantive comment here. Saying anything about regulatory infrastructure would read as posturing.",
      },
    },
  },
};

export const LINKEDIN_STATE_IDS = Object.keys(LINKEDIN_FIXTURES);
export const LINKEDIN_FIXTURE_UID = UID;

// StoryBank preview fixtures — drive every render branch of StoryBank.jsx.
// Each fixture seeds the 2 query keys StoryBank reads:
//   ["stories", UID]      — useQuery inside StoryBank.jsx
//   ["experiences", UID]  — useQuery inside StoryBank.jsx

const UID = "storybank-fixture-user";

const D = (daysAgo) =>
  new Date(Date.now() - daysAgo * 86400000).toISOString();

const EXPERIENCES = [
  { id: "exp-1", title: "Product Analyst Intern", company: "monday.com" },
  { id: "exp-2", title: "Customer Success Intern", company: "Lightricks" },
  { id: "exp-3", title: "Marketing Coordinator", company: "Guardio" },
];

// Six stories spanning every render branch the cards can hit:
//   - Linked + rich STAR (story-1, expanded preview hits all 4 STAR rows)
//   - Linked + result-only (story-2, summary preview falls back to result)
//   - Linked + situation-only (story-3, summary preview falls back to situation)
//   - General (no experience_id) (story-4)
//   - Long-result truncation (story-5, summary > 140 chars triggers ellipsis)
//   - Linked with metric + skill + tool + relevance_tags (story-6, all 4 tag families)
const STORIES = [
  {
    id: "story-1",
    user_id: UID,
    source: "chat_capture",
    experience_id: "exp-3",
    title: "Cutting first-week churn at Guardio",
    situation:
      "New users were dropping off after install — first-week churn was over 30% and product was treating it as 'just how onboarding works'.",
    task:
      "Diagnose the gap and propose a fix that didn't require an engineering quarter.",
    action:
      "Built a two-line setup checklist that made the activation steps impossible to miss. Pushed it through CS-led testing on a 5% slice before product green-lit a full rollout.",
    result:
      "Churn in that cohort dropped from 31% to 14% over 6 weeks. The checklist is still the default onboarding flow.",
    metrics: ["31% → 14% churn", "6 weeks to roll out"],
    skills_demonstrated: ["Onboarding", "Retention", "Product analytics"],
    tools_used: ["Mixpanel", "Figma"],
    relevance_tags: ["activation", "growth"],
    created_at: D(2),
  },
  {
    id: "story-2",
    user_id: UID,
    source: "manual_quick_add",
    experience_id: "exp-1",
    title: "A/B testing the onboarding checklist",
    situation: null,
    task: null,
    action: null,
    result:
      "Winning variant lifted day-7 retention by 4.2 percentage points across the cohort.",
    metrics: ["+4.2 pp retention"],
    skills_demonstrated: ["A/B testing", "Product analytics"],
    tools_used: ["Optimizely"],
    relevance_tags: [],
    created_at: D(5),
  },
  {
    id: "story-3",
    user_id: UID,
    source: "manual_quick_add",
    experience_id: "exp-2",
    title: "Reducing onboarding time at Lightricks",
    situation:
      "SMB accounts were taking 11 days to hit first value. CS team was firefighting individual accounts rather than fixing the playbook.",
    task: null,
    action: null,
    result: null,
    metrics: [],
    skills_demonstrated: ["Customer success", "Onboarding"],
    tools_used: ["Salesforce"],
    relevance_tags: [],
    created_at: D(8),
  },
  {
    id: "story-4",
    user_id: UID,
    source: "manual_quick_add",
    experience_id: null,
    title: "Leading the campus event team",
    situation:
      "The student council needed someone to coordinate 4 back-to-back events across the spring semester.",
    task: "Plan, staff, and run all 4 events without overlapping deadlines.",
    action:
      "Coordinated a 6-person team across all 4 events. Owned planning, vendor management, and day-of logistics.",
    result:
      "Every event ran on schedule. Two became annual fixtures the council still runs.",
    metrics: ["6-person team", "4 events"],
    skills_demonstrated: ["Leadership", "Operations", "Stakeholder management"],
    tools_used: ["Notion"],
    relevance_tags: ["leadership"],
    created_at: D(15),
  },
  {
    id: "story-5",
    user_id: UID,
    source: "manual_quick_add",
    experience_id: "exp-3",
    title: "Growing event turnout at Reichman",
    situation: null,
    task: null,
    action: null,
    result:
      "Ran targeted Instagram + WhatsApp campaigns that noticeably lifted attendance at student events, particularly among first-year students who hadn't been turning up; the same playbook is now used by next year's marketing chair as the default outreach approach.",
    metrics: [],
    skills_demonstrated: ["Marketing", "Social media"],
    tools_used: [],
    relevance_tags: [],
    created_at: D(22),
  },
  {
    id: "story-6",
    user_id: UID,
    source: "chat_capture",
    experience_id: "exp-1",
    title: "Building the activation funnel dashboard",
    situation:
      "Growth PM had no shared view of activation drop-off; weekly reviews were guessing.",
    task: "Build a dashboard that surfaces drop-off per onboarding step.",
    action:
      "Modeled the event stream in SQL, wired it into a Mixpanel funnel, and shipped a Looker dashboard the whole team now uses in weekly readouts.",
    result:
      "Cut activation review prep from 4 hours to 15 minutes and surfaced a new drop-off step the PM hadn't seen.",
    metrics: ["4h → 15min prep"],
    skills_demonstrated: ["SQL", "Funnel analytics"],
    tools_used: ["Mixpanel", "Looker"],
    relevance_tags: ["analytics", "growth"],
    created_at: D(30),
  },
];

export const STORYBANK_FIXTURES = {
  "storybank-empty-no-experiences": {
    label: "Story Bank · empty · no experiences yet (Profile-link CTA)",
    stories: [],
    experiences: [],
  },
  "storybank-empty-with-experiences": {
    label: "Story Bank · empty · with experiences (Capture-your-first CTA)",
    stories: [],
    experiences: EXPERIENCES,
  },
  "storybank-loading": {
    label: "Story Bank · loading spinner (stories query in flight)",
    stories: [],
    experiences: EXPERIENCES,
    loading: true,
  },
  "storybank-populated": {
    label: "Story Bank · 6 stories · default 'All' filter",
    stories: STORIES,
    experiences: EXPERIENCES,
  },
  "storybank-filter-linked": {
    label: "Story Bank · filter 'Linked to experience' selected (5 cards)",
    stories: STORIES,
    experiences: EXPERIENCES,
    urlFlag: "filter=linked",
  },
  "storybank-filter-general": {
    label: "Story Bank · filter 'General' selected (1 card)",
    stories: STORIES,
    experiences: EXPERIENCES,
    urlFlag: "filter=general",
  },
  "storybank-filter-by-experience": {
    label: "Story Bank · filtered by experience exp-1 (2 cards + 'Show all' pill)",
    stories: STORIES,
    experiences: EXPERIENCES,
    urlFlag: "filter=experience_id=exp-1",
  },
  "storybank-card-expanded": {
    label: "Story Bank · first card expanded · full STAR + 4 tag families",
    stories: STORIES,
    experiences: EXPERIENCES,
    expandStoryId: "story-1",
  },
  "storybank-delete-confirm": {
    label: "Story Bank · first card · delete-confirm state (Confirm / Cancel pair)",
    stories: STORIES,
    experiences: EXPERIENCES,
    deleteConfirmStoryId: "story-1",
  },
  "storybank-add-dialog": {
    label: "Story Bank · Add-story dialog open · StorySaveCard REVIEW state",
    stories: STORIES,
    experiences: EXPERIENCES,
    openAddDialog: true,
  },
  "storybank-edit-dialog": {
    label: "Story Bank · Edit-story dialog open · STAR fields prefilled",
    stories: STORIES,
    experiences: EXPERIENCES,
    editStoryId: "story-1",
  },
};

export const STORYBANK_STATE_IDS = Object.keys(STORYBANK_FIXTURES);
export const STORYBANK_FIXTURE_UID = UID;

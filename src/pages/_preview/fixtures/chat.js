// Chat fixtures — PR 3K (Chat / Career Agent restyle).
//
// ChatInterface loads conversations + messages directly via supabase
// (lines 484-501, 514-518). The harness installs a fetch override that
// mocks those PostgREST endpoints. Conversations live on `conversations`
// table; messages on `chat_messages` with the suggested_* columns.
//
// For action-card fixtures, we seed an assistant message with the
// suggested_tasks / suggested_roadmap_changes / suggested_application_
// actions / suggested_company_target_actions / suggested_cv_generation /
// suggested_agent column populated. The frontend extractor logic then
// renders the appropriate card.
//
// suggested_story_capture is NOT a chat_messages column — it's an
// in-memory-only field on the assistant turn. Fixtures that need
// the StorySaveCard render path use a special `seedStoryCapture` flag
// that the harness applies post-mount via direct setState.

const UID = "chat-fixture-user";
const CONVO_ID = "convo-fixture";

const ISO = (msAgo) => new Date(Date.now() - msAgo).toISOString();

// Shared assistant + user message text for multi-turn fixtures.
const USER_MSG_STORY = "I just wrapped a project at Guardio — I cut first-week churn by building a two-line setup checklist for onboarding. The data showed users who finished setup in week one stayed; we made finishing unavoidable, and that cohort's churn dropped from 31% to 14%.";
const ASSIST_MSG_STORY = "That's a strong, concrete story — exactly the kind that wins PM interviews. The before/after numbers (31% → 14%) and the mechanism (making setup unavoidable rather than blaming the product) are gold. Want me to save it to your Story Bank, structured?";

function profile(overrides = {}) {
  return {
    id: UID,
    full_name: "Eli Englard",
    onboarding_complete: true,
    ...overrides,
  };
}

function convo(overrides = {}) {
  return {
    id: CONVO_ID,
    user_id: UID,
    agent: "career_agent",
    title: "Career conversation",
    application_id: null,
    updated_at: ISO(60 * 1000),
    ...overrides,
  };
}

function msg(role, content, extras = {}) {
  return {
    id: extras.id || `msg-${role}-${Math.random().toString(36).slice(2, 8)}`,
    conversation_id: CONVO_ID,
    role,
    content,
    suggested_tasks: null,
    suggested_roadmap_changes: null,
    suggested_application_actions: null,
    suggested_company_target_actions: null,
    suggested_cv_generation: null,
    suggested_agent: null,
    is_error: false,
    original_user_message: null,
    created_at: extras.created_at || ISO(60 * 1000),
    ...extras,
  };
}

export const CHAT_FIXTURES = {
  // 1. Empty / intro screen — no conversation, prompts visible.
  "chat-empty-intro": {
    label: "Chat · empty conversation + intro + suggested prompts",
    profile: profile(),
    conversations: [],
    messages: [],
    activeConversationId: null,
  },

  // 2. Multi-turn thread + STORY_CAPTURE card (P22)
  "chat-multi-turn-story-capture": {
    label: "Chat · multi-turn thread + STORY_CAPTURE card (P22)",
    profile: profile(),
    conversations: [convo({ title: "Guardio onboarding story" })],
    messages: [
      msg("user", USER_MSG_STORY, { id: "msg-1", created_at: ISO(5 * 60 * 1000) }),
      msg("assistant", ASSIST_MSG_STORY, { id: "msg-2", created_at: ISO(4 * 60 * 1000) }),
    ],
    activeConversationId: CONVO_ID,
    // Story-capture is in-memory only; harness seeds via post-mount.
    seedStoryCapture: {
      messageId: "msg-2",
      capture: {
        text: "Cutting first-week churn at Guardio: built a two-line setup checklist that made onboarding completion unavoidable. First-week churn in that cohort dropped from 31% to 14% over six weeks.",
        experience_id: null,
        framing: "Capture this story",
      },
    },
  },

  // 3. Task suggestion (P16)
  "chat-task-suggestion": {
    label: "Chat · task suggestion card (P16)",
    profile: profile(),
    conversations: [convo({ title: "Weekly plan" })],
    messages: [
      msg("user", "What should I focus on this week to move my job search forward?", { id: "msg-1", created_at: ISO(5 * 60 * 1000) }),
      msg("assistant", "Here are three focused tasks for this week — each one builds momentum on a different part of your funnel.", {
        id: "msg-2",
        created_at: ISO(4 * 60 * 1000),
        suggested_tasks: [
          {
            title: "Apply to 3 Product Analyst roles at IL startups",
            description: "Use Jobs filter (track_1, senior level) — apply by Wednesday.",
            category: "application",
            priority: "high",
            role_title: "Product Analyst",
          },
          {
            title: "Reach out to 2 alumni for informational interviews",
            description: "LinkedIn alumni search → 2 message templates → send.",
            category: "outreach",
            priority: "medium",
          },
          {
            title: "Refine your Guardio bullet to lead with the churn number",
            description: "Move the 31% → 14% datum to the front of the bullet.",
            category: "profile",
            priority: "medium",
          },
        ],
      }),
    ],
    activeConversationId: CONVO_ID,
  },

  // 4. Roadmap change proposal (P17)
  "chat-roadmap-change": {
    label: "Chat · roadmap change proposal (P17)",
    profile: profile(),
    conversations: [convo({ title: "Tracks check-in" })],
    messages: [
      msg("user", "I've been getting more excited about analytics than product management lately. Should I rethink my tracks?", { id: "msg-1", created_at: ISO(5 * 60 * 1000) }),
      msg("assistant", "That's a meaningful signal. Based on what you've said and the work you've actually shipped at Guardio (the activation-funnel work), here's how I'd adjust your roadmap:", {
        id: "msg-2",
        created_at: ISO(4 * 60 * 1000),
        suggested_roadmap_changes: [
          {
            action: "update_track",
            role_title: "Product Analyst",
            new_track: "track_1",
            reason: "stronger pull + clearer evidence chain through Guardio analytics work",
          },
          {
            action: "update_track",
            role_title: "Associate Product Manager",
            new_track: "track_2",
            reason: "still viable as Plan B, but secondary to analytics now",
          },
          {
            action: "add_role",
            title: "Growth Analyst",
            track: "track_1",
            reason: "adjacent target with high overlap to Product Analyst skill set",
          },
        ],
      }),
    ],
    activeConversationId: CONVO_ID,
  },

  // 5. Application actions proposal (P18)
  "chat-application-actions": {
    label: "Chat · application actions proposal (P18)",
    profile: profile(),
    conversations: [convo({ title: "Riverside follow-up" })],
    messages: [
      msg("user", "I had my first interview with Riverside yesterday — went well, moving to round 2 next week.", { id: "msg-1", created_at: ISO(5 * 60 * 1000) }),
      msg("assistant", "Good news! Let me update your tracker so the calendar surfaces this and you keep momentum:", {
        id: "msg-2",
        created_at: ISO(4 * 60 * 1000),
        suggested_application_actions: [
          {
            action: "update_application",
            match_company: "Riverside",
            match_role_title: "Product Analyst",
            new_status: "interviewing",
            new_interview_stage: "round_2_scheduled",
          },
          {
            action: "add_application",
            company: "Lightricks",
            role_title: "Product Analyst Intern",
            status: "interested",
            location: "Jerusalem, IL",
          },
        ],
      }),
    ],
    activeConversationId: CONVO_ID,
  },

  // 6. Company target / internship proposal (P19)
  "chat-company-target": {
    label: "Chat · company target / internship proposal (P19)",
    profile: profile(),
    conversations: [convo({ title: "Internship targets" })],
    messages: [
      msg("user", "I've been thinking about pitching myself for a customer success internship at monday.com — they have alumni from Reichman.", { id: "msg-1", created_at: ISO(5 * 60 * 1000) }),
      msg("assistant", "That's a sharp pick — monday.com matches your stated goal and the Reichman alumni network is a real bridge. Let me add it to your pipeline:", {
        id: "msg-2",
        created_at: ISO(4 * 60 * 1000),
        suggested_company_target_actions: [
          {
            action: "add_company_target",
            company_name: "monday.com",
            company_sector: "B2B SaaS — workflow automation",
            pitched_role: "Customer Success Intern",
            pitch_rationale: "Guardio onboarding work maps directly to monday's activation focus; Reichman alumni network supports the bridge.",
            skill_gaps_this_fills: ["customer success at scale", "enterprise-segment onboarding"],
          },
        ],
      }),
    ],
    activeConversationId: CONVO_ID,
  },

  // 7. CV generation idle → done (P20). Two-state — harness flips to "done" via cvGenStates seed.
  "chat-cv-generation-idle-done": {
    label: "Chat · CV generation idle → done (P20)",
    profile: profile(),
    conversations: [convo({ title: "CV for Riverside" })],
    messages: [
      msg("user", "Can you generate a tailored CV for that Product Analyst role at Riverside I'm interviewing for?", { id: "msg-1", created_at: ISO(5 * 60 * 1000) }),
      msg("assistant", "I can tailor a CV for the Riverside Product Analyst role using your profile + the JD you pasted earlier. Click Generate when you're ready.", {
        id: "msg-2",
        created_at: ISO(4 * 60 * 1000),
        suggested_cv_generation: {
          target_role: "Product Analyst",
          application_id: "app-fixture-1",
          job_description: "Riverside is looking for a Product Analyst to own activation + retention dashboards…",
          result: {
            cv_url: "https://example.com/fixtures/cv-tailored.pdf",
            fit_analysis: {
              alignment: "Strong",
              skill_match_percentage: 78,
              major_gaps: ["SQL window functions", "experimentation frameworks (A/B testing at scale)"],
              explanation: "Your Guardio activation work + analytics fluency map cleanly to the JD. Two gaps — both addressable with a focused week of practice — are flagged above.",
            },
            application_id: "app-fixture-1",
            tailoring: { score: 0.82 },
            unsourced_bullets: [],
          },
        },
      }),
    ],
    activeConversationId: CONVO_ID,
    // Seed cvGenStates so CVGenerationCard renders in "done" state
    // (download link + fit analysis), exercising the success branch.
    seedCvGenStates: {
      "msg-2": {
        status: "done",
        cv_url: "https://example.com/fixtures/cv-tailored.pdf",
        fit_analysis: {
          alignment: "Strong",
          skill_match_percentage: 78,
          major_gaps: ["SQL window functions", "experimentation frameworks (A/B testing at scale)"],
          explanation: "Your Guardio activation work + analytics fluency map cleanly to the JD. Two gaps — both addressable with a focused week of practice — are flagged above.",
        },
        application_id: "app-fixture-1",
        tailoring: { score: 0.82 },
        unsourced_bullets: [],
      },
    },
  },

  // 8. Agent redirect (P21)
  "chat-agent-redirect": {
    label: "Chat · agent redirect card (P21)",
    profile: profile(),
    conversations: [convo({ title: "Interview prep" })],
    messages: [
      msg("user", "Can you help me prep for the behavioral round at Riverside? I have it next Wednesday.", { id: "msg-1", created_at: ISO(5 * 60 * 1000) }),
      msg("assistant", "Behavioral prep is exactly what the Interview Coach is built for — they'll walk you through STAR frameworks tied to your stories. Want me to switch you over?", {
        id: "msg-2",
        created_at: ISO(4 * 60 * 1000),
        suggested_agent: {
          agent: "interview_coach",
          label: "Interview Coach",
          page: "InterviewCoach",
          reason: "Behavioral prep with STAR-framework coaching",
        },
      }),
    ],
    activeConversationId: CONVO_ID,
  },

  // 9. Error state — session expired retry banner + generic AI-unavailable
  "chat-error-states": {
    label: "Chat · error states (session-expired retry + generic AI-unavailable)",
    profile: profile(),
    conversations: [convo({ title: "Error states" })],
    messages: [
      msg("user", "What's the read on my track 1 right now?", { id: "msg-1", created_at: ISO(10 * 60 * 1000) }),
      msg(
        "assistant",
        "I couldn't reach the AI service. This is usually temporary — tap Retry to try again.",
        {
          id: "msg-2",
          created_at: ISO(9 * 60 * 1000),
          is_error: true,
          original_user_message: "What's the read on my track 1 right now?",
        },
      ),
      msg("user", "Try again — should be back now.", { id: "msg-3", created_at: ISO(2 * 60 * 1000) }),
      msg(
        "assistant",
        "Your session expired. Please sign out and sign in again to continue.",
        {
          id: "msg-4",
          created_at: ISO(1 * 60 * 1000),
          is_error: true,
          original_user_message: null,
        },
      ),
    ],
    activeConversationId: CONVO_ID,
  },
};

export const CHAT_STATE_IDS = Object.keys(CHAT_FIXTURES);
export const CHAT_FIXTURE_UID = UID;
export const CHAT_FIXTURE_CONVO_ID = CONVO_ID;

// Coach dock + panel preview harness — DEV-only at
// /_preview/drawer/:state. Mounts the real Layout (which contains the
// CoachConversationProvider + AgentDrawerProvider + CoachDock +
// AgentDrawer) so we can capture both the docked sidebar chat and the
// panel "expanded" view of the same conversation.
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`.

import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { useCoachConversation } from "@/lib/CoachConversationContext";
import Layout from "@/Layout";

const UID = "drawer-fixture-user";

const FIXTURE_PROFILE = {
  id: UID,
  full_name: "Eli Englard",
  onboarding_complete: true,
  practicum_path: null,
  skills_canonical: ["stakeholder_management", "user_research"],
  qualification_level: "entry",
};

const FIXTURE_APP = {
  id: "drawer-app-1",
  user_id: UID,
  role_title: "Associate Product Manager",
  company: "monday.com",
  status: "interviewing",
  source: "job_suggestion",
  ats_source: "greenhouse",
  external_id: "x1",
  job_description: "Join monday.com's product team as an APM…",
  cv_skills_emphasized: ["stakeholder_management"],
  skills_required: { core: ["stakeholder_management", "user_research"], nice: [] },
  url: "https://example.com",
  location: "Tel Aviv",
  notes: "",
  created_at: "2026-05-21T10:00:00.000Z",
  updated_at: "2026-05-30T10:00:00.000Z",
  applied_date: "2026-05-23T10:00:00.000Z",
  interview_stage: null,
};

// Sample conversation seeded so the dock + panel show non-empty states.
const SEEDED_MESSAGES = [
  { id: "m1", role: "user", content: "What should I focus on this week?" },
  { id: "m2", role: "assistant", content: "Three priorities given your Track 1 + APM context:\n\n1. Knock out the Product Roadmapping skill gap — your top blocker.\n2. Draft a tailored CV for the monday.com APM interview.\n3. Send a referral ask to anyone you know in their growth org." },
  { id: "m3", role: "user", content: "Help me draft the referral ask" },
  { id: "m4", role: "assistant", content: "Here's a short, polite ask you can send today:\n\n> Hi [name] — saw you're on the growth team at monday.com. I'm interviewing for an APM role there next week and would love a quick referral if my background lines up. Happy to share my CV in a thread. Either way, hope you're well!" },
];

// Long messages to demonstrate independent scroll inside the dock.
const LONG_SEEDED_MESSAGES = Array.from({ length: 14 }, (_, i) => ({
  id: `m-long-${i}`,
  role: i % 2 === 0 ? "user" : "assistant",
  content: i % 2 === 0
    ? `Question ${i + 1} about my Career roadmap?`
    : `Answer ${i + 1}: focusing on Track 1 means doubling down on roles where your readiness is already ≥60% before chasing the stretch ones. Specifically the APM and the Product Analyst on your rail.`,
}));

const STATES = {
  "dock-idle": { label: "Dock · idle (fresh state, no messages)" },
  "dock-condensed-apply-succeeded": {
    label: "Dock · condensed Apply succeeded (CV generation proposed → Applied chip)",
    seedAppliedCV: true,
  },
  "dock-with-conversation": {
    label: "Dock · seeded conversation (single source of truth shared with panel)",
    messages: SEEDED_MESSAGES,
  },
  "dock-thread-scrolled-mid": {
    label: "Dock thread scrolled mid-conversation while the page shows a long Career list",
    messages: LONG_SEEDED_MESSAGES,
    showLongPage: true,
  },
  "dock-collapsed-short-viewport": {
    label: "Dock collapsed at short-viewport (~< 220px) — header + input only",
    forceShortViewport: true,
  },
  "panel-expanded-from-dock": {
    label: "Panel expanded from the dock (same conversation, full view)",
    messages: SEEDED_MESSAGES,
    openDrawer: true,
  },
  "mobile-header-trigger-visible": {
    label: "Mobile header — persistent Coach trigger beside hamburger",
  },
  "mobile-bottom-sheet-open": {
    label: "Mobile bottom sheet open from the header trigger",
    messages: SEEDED_MESSAGES,
    openDrawer: true,
  },
  "mobile-hamburger-sidebar-with-dock": {
    label: "Mobile hamburger sidebar with the dock as the secondary path",
    messages: SEEDED_MESSAGES,
    forceMobileSidebarOpen: true,
  },
};

function PreviewDriver({ state }) {
  const drawer = useAgentDrawer();
  const conv = useCoachConversation();
  useEffect(() => {
    if (state.openDrawer) drawer.open({});
    if (state.seedAppliedCV && conv) {
      // Seed a canned conversation: one user turn + one assistant turn
      // carrying a suggestedCVGeneration payload. Then mark the
      // suggestion as applied so the capture shows the "Applied" chip.
      conv.setMessages([
        { id: "preview-user-msg", role: "user", content: "Tailor a CV for the monday.com APM role" },
        {
          id: "preview-cv-msg",
          role: "assistant",
          content: "Here's a tailored CV proposal for the APM role at monday.com. Tap Generate to produce the PDF.",
          suggestedCVGeneration: {
            target_role: "Associate Product Manager",
            application_id: "drawer-app-1",
            // result is populated by the harness's markApplied below — this
            // value gets fed back into the row via the cvGeneration applied
            // state read.
            result: {
              cv_url: "https://example.com/tailored.pdf",
              fit_analysis: { skill_match_percentage: 0.82, alignment: "Strong" },
              application_id: "drawer-app-1",
              tailoring: null,
              unsourced_bullets: [],
            },
          },
        },
      ]);
    }
    if (state.forceMobileSidebarOpen) {
      setTimeout(() => {
        const btn = document.querySelector('[aria-label="Open menu"]');
        if (btn instanceof HTMLElement) btn.click();
      }, 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function DrawerPreview() {
  const { state } = useParams();
  const fixture = STATES[state] || STATES["dock-idle"];

  const queryClient = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false, refetchOnMount: false },
      },
    });
    qc.setQueryData(["userProfile", UID], FIXTURE_PROFILE);
    qc.setQueryData(["userProfile", UID, "small"], FIXTURE_PROFILE);
    qc.setQueryData(["experiences", UID], []);
    return qc;
  }, []);

  const authValue = useMemo(
    () => ({
      user: { id: UID, email: "eli@example.com" },
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout: () => {},
      navigateToLogin: () => {},
      checkAppState: () => {},
    }),
    [],
  );

  const showLongPage = !!fixture.showLongPage;
  // For dock-collapsed-short-viewport, render a tall page body that
  // forces the sidebar to be short enough to trigger the dock's collapse
  // threshold. The dock measures its own height via ResizeObserver.
  const forceShort = !!fixture.forceShortViewport;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <Layout currentPageName="Home">
          {/* If forceShort: pad the brand mark area at the top of the
              sidebar with a tall stub so the dock has less vertical
              space — proxy for a short viewport. We can't set the
              viewport from JSX so this is the closest approximation
              the preview can offer. */}
          <div className="max-w-[1080px] mx-auto px-8 py-10">
            <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
              Drawer preview · {state || "dock-idle"}
            </p>
            <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] leading-[1.1] tracking-tight text-rd-text mt-1">
              {fixture.label}
            </h1>
            <p className="text-[12.5px] text-rd-text-secondary mt-2 max-w-xl">
              DEV-only harness. Mounted inside the real Layout so the
              sidebar CoachDock + the AgentDrawer panel are both visible.
              {forceShort && " (Short-viewport scene — the dock collapses below ~220px of available height.)"}
            </p>

            {showLongPage && (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 30 }, (_, i) => (
                  <div key={i} className="rounded-[14px] border border-rd-border bg-rd-bg-card p-4">
                    <p className="font-display font-bold text-[14px] text-rd-text">Career list item {i + 1}</p>
                    <p className="text-[12px] text-rd-text-secondary mt-1">
                      Long scrollable page content to prove the dock's thread scrolls independently of the main column.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <PreviewDriver state={fixture} />
        </Layout>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

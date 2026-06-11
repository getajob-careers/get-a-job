// Agent drawer preview harness — DEV-only route at
// /_preview/drawer/:state. Same pattern as the other preview harnesses
// (Home / Career / Tracker): fresh QueryClient + AuthContext stub,
// synchronous seed inside useMemo, post-mount driver opens the drawer
// / detail Sheet via DOM clicks where needed.
//
// States cover the five required preview surfaces:
//   - closed-tab-visible
//   - open-empty (drawer open, no seed, fresh conversation)
//   - open-with-seed (drawer open, coach-band seed populated)
//   - open-with-history (drawer open with a seeded conversation thread)
//   - open-over-detail-sheet (the z-order overlap capture: agent panel
//     layers above an open ApplicationDetailDrawer Sheet)
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/drawer/* falls through to
// AuthenticatedApp → /login.

import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import { AgentDrawerProvider, useAgentDrawer } from "@/lib/AgentDrawerContext";
import AgentDrawer from "@/components/agent/AgentDrawer";
import ApplicationDetailDrawer from "@/components/tracker/ApplicationDetailDrawer";

const UID = "drawer-fixture-user";

// Minimal fixture profile — Layout's onboardingComplete gate is bypassed
// since this harness doesn't mount Layout; the drawer provider mounts
// directly. Profile is only seeded for ChatInterface's profile read.
const FIXTURE_PROFILE = {
  id: UID,
  full_name: "Eli Englard",
  onboarding_complete: true,
  skills_canonical: ["stakeholder_management", "user_research"],
  qualification_level: "entry",
};

// Sample application for the over-detail-sheet capture. Wide enough to
// drive ApplicationDetailDrawer + ApplicationRow without errors.
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

const STATES = {
  "closed-tab-visible": { label: "Tab visible, drawer closed (right-edge persistence)", open: false },
  "open-empty": { label: "Drawer open · empty (no seed, default prompts)", open: true, seed: null, applicationId: null },
  "open-with-seed": {
    label: "Drawer open · seeded from coach band (Help me prepare for my APM interview…)",
    open: true,
    seed: "Help me prepare for my Associate Product Manager interview at monday.com",
    applicationId: FIXTURE_APP.id,
  },
  "open-with-history": {
    label: "Drawer open · rolling conversation (seeded history)",
    open: true,
    seed: null,
    applicationId: null,
    seedHistory: true,
  },
  "open-over-detail-sheet": {
    label: "Z-order overlap · agent panel layered over ApplicationDetailDrawer Sheet",
    open: true,
    seed: null,
    applicationId: null,
    openDetailSheet: true,
  },
};

function DrawerDriver({ state }) {
  const drawer = useAgentDrawer();
  useEffect(() => {
    if (!state) return;
    if (state.open) {
      drawer.open({ seed: state.seed || null, applicationId: state.applicationId || null });
    } else {
      drawer.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function DrawerPreview() {
  const { state } = useParams();
  const fixture = STATES[state] || STATES["closed-tab-visible"];

  const queryClient = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
        },
      },
    });
    qc.setQueryData(["userProfile", UID], FIXTURE_PROFILE);
    qc.setQueryData(["userProfile", UID, "small"], FIXTURE_PROFILE);
    qc.setQueryData(["experiences", UID], []);
    qc.setQueryData(["applications", UID, "picker"], [
      { id: FIXTURE_APP.id, role_title: FIXTURE_APP.role_title, company: FIXTURE_APP.company, status: FIXTURE_APP.status },
    ]);
    // ChatInterface's conversation list query — empty list = "New conversation".
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

  // The over-detail-sheet capture needs the detail Sheet open underneath
  // so we can prove the agent panel layers above. Mount the detail
  // drawer here when the state asks for it.
  const detailOpen = !!fixture.openDetailSheet;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <AgentDrawerProvider>
          {/* Stub page chrome — a single rd-bg-page canvas so the
              right-edge tab has somewhere to sit and the panel has a
              page color to slide over. */}
          <div className="min-h-screen bg-rd-bg-page font-body text-rd-text relative">
            <div className="max-w-[1080px] mx-auto px-8 py-10">
              <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
                Drawer preview · {state || "closed-tab-visible"}
              </p>
              <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] leading-[1.1] tracking-tight text-rd-text mt-1">
                {fixture.label}
              </h1>
              <p className="text-[12.5px] text-rd-text-secondary mt-2 max-w-xl">
                DEV-only harness. The drawer is mounted inside an{" "}
                <code className="font-mono text-[12px]">AgentDrawerProvider</code>; the rest of
                this page is a stub canvas so the right-edge tab has visible context.
              </p>
            </div>

            {/* Z-order overlap state — mount the detail Sheet open so the
                capture proves the agent panel covers it. */}
            {detailOpen && (
              <ApplicationDetailDrawer
                app={FIXTURE_APP}
                profile={FIXTURE_PROFILE}
                listingInactive={false}
                open
                onClose={() => {}}
                onUpdate={() => {}}
              />
            )}

            <AgentDrawer />
            <DrawerDriver state={fixture} />
          </div>
        </AgentDrawerProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

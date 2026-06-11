// Agent drawer preview harness — DEV-only route at
// /_preview/drawer/:state. Same pattern as the other preview harnesses
// (Home / Career / Tracker): fresh QueryClient + AuthContext stub,
// synchronous seed inside useMemo, post-mount driver opens the drawer
// / detail Sheet via DOM clicks where needed.
//
// Updated for the sidebar-entry change: the harness now mounts the real
// Layout so the new Coach nav item is visible. AgentDrawerProvider is
// already mounted inside Layout, so we don't wrap again here.
//
// States cover the sidebar-entry + panel flows + the z-order overlap:
//   - entry-visible: closed drawer, Coach item idle in sidebar
//   - panel-open-from-sidebar: drawer open + Coach item highlighted
//   - panel-open-with-seed: drawer open + coach-band seed in input
//   - panel-open-over-detail-sheet: agent panel layered above an open
//     ApplicationDetailDrawer Sheet (z-order regression check)
//   - mobile-sidebar-with-coach: mobile sidebar open with the Coach
//     item reachable (the spec's mobile reachability proof at <768px)
//
// Production safety: route registration in App.jsx is gated by
// `import.meta.env.DEV`. Prod /_preview/drawer/* falls through to
// AuthenticatedApp → /login.

import React, { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import Layout from "@/Layout";
import ApplicationDetailDrawer from "@/components/tracker/ApplicationDetailDrawer";

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

const STATES = {
  "entry-visible": {
    label: "Sidebar entry · Coach item idle (drawer closed)",
    open: false,
  },
  "panel-open-from-sidebar": {
    label: "Sidebar entry · Coach item active + panel open (default prompts)",
    open: true,
    seed: null,
    applicationId: null,
  },
  "panel-open-with-seed": {
    label: "Sidebar entry · panel open with coach-band seed populated",
    open: true,
    seed: "Help me prepare for my Associate Product Manager interview at monday.com",
    applicationId: FIXTURE_APP.id,
  },
  "panel-open-over-detail-sheet": {
    label: "Z-order overlap · agent panel layered over ApplicationDetailDrawer Sheet",
    open: true,
    seed: null,
    applicationId: null,
    openDetailSheet: true,
  },
  "mobile-sidebar-with-coach": {
    label: "Mobile (<768px) · sidebar open with Coach item visible (tap-through reachability)",
    open: false,
    forceSidebarOpen: true,
  },
};

// Driver runs inside the AgentDrawerProvider (mounted by Layout) so it
// can call useAgentDrawer.open() to drive the panel states from the URL
// param. Also forces the mobile sidebar open via a DOM click on the
// hamburger when the state asks for it.
function PreviewDriver({ state }) {
  const drawer = useAgentDrawer();
  useEffect(() => {
    if (!state) return;
    if (state.open) {
      drawer.open({ seed: state.seed || null, applicationId: state.applicationId || null });
    }
    if (state.forceSidebarOpen) {
      // The mobile hamburger sits in Layout's <768px header. Click it so
      // the sidebar slides in for the capture.
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
  const fixture = STATES[state] || STATES["entry-visible"];

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

  const detailOpen = !!fixture.openDetailSheet;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        {/* Layout mounts AgentDrawerProvider + AgentDrawer + the sidebar.
            The harness's children are the page-content stub. */}
        <Layout currentPageName="Home">
          <div className="max-w-[1080px] mx-auto px-8 py-10">
            <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
              Drawer preview · {state || "entry-visible"}
            </p>
            <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] leading-[1.1] tracking-tight text-rd-text mt-1">
              {fixture.label}
            </h1>
            <p className="text-[12.5px] text-rd-text-secondary mt-2 max-w-xl">
              DEV-only harness. Mounted inside the real Layout so the new
              <strong className="text-rd-text font-display"> Coach</strong> sidebar entry +
              the agent panel are both visible. The page body is a stub —
              not a real Home — so changes there don't change this surface.
            </p>
          </div>

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

          <PreviewDriver state={fixture} />
        </Layout>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

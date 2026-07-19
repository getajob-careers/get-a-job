// DEV-only harness at /_preview/home3tab-real: the REAL production ThreeTabHome
// (the flag-on 3-tab home wired to the real components) mounted inside the real
// Layout with a stubbed auth session. Navigate with ?next=1 to get the CanvasShell
// (flag-on). Seeds the applications query so the Tracker tab shows a real kanban;
// CV (CVStudioLive) and Browse Jobs (UnifiedJobsFeed) self-fetch and render their
// real empty/loading states (no seeded data here). Route is DEV-gated in App.jsx.

import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Layout from "@/Layout";
import ThreeTabHome from "@/components/redesign/home/ThreeTabHome";
import { CANVAS_APPLICATIONS } from "./fixtures/canvasHome";

const UID = "home3tab-real-preview-uid";

export default function Home3TabRealPreview() {
  const queryClient = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
    qc.setQueryData(["userProfile", UID], {
      id: UID,
      full_name: "Preview User",
      onboarding_complete: true,
    });
    qc.setQueryData(["applications", UID], CANVAS_APPLICATIONS);
    return qc;
  }, []);

  const authValue = useMemo(
    () => ({
      user: { id: UID, email: "preview@example.com" },
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <Layout currentPageName="Home">
          <ThreeTabHome />
        </Layout>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

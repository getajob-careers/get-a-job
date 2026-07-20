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
import {
  applicationCvsQueryKey,
  cvDataQueryKey,
} from "@/lib/queries/useApplicationCvs"; // eslint-disable-line
import { CANVAS_APPLICATIONS } from "./fixtures/canvasHome";

const UID = "home3tab-real-preview-uid";
const MASTER_CV_ID = "preview-master-cv";

// A minimal but complete master CV so CVStudioLive renders the full studio
// (templates | document | rail) instead of its empty state - lets the preview
// show the flag-on CV-tab composition and the per-bullet "Revise with AI"
// affordance. Raw cv_data shape (fromCvData input).
const MASTER_CV_DATA = {
  header: {
    name: "Preview User",
    subtitle: "Business & Data Analyst",
    email: "preview@example.com",
    linkedin: "linkedin.com/in/preview",
    location: "Tel Aviv",
  },
  summary:
    "Final-year business student with internship experience in analytics and finance, comfortable turning messy data into decisions.",
  professional_experiences: [
    {
      title: "Analyst Intern",
      company: "Acme Corp",
      dates: "2024 - 2025",
      bullets: [
        "Built dashboards tracking KPIs across three product teams.",
        "Automated a weekly reporting pipeline, saving roughly five hours a week.",
      ],
    },
    {
      title: "Research Assistant",
      company: "University Data Lab",
      dates: "2023 - 2024",
      bullets: ["Cleaned and analyzed survey data for a published study."],
    },
  ],
  education: [
    {
      institution: "Reichman University",
      degree: "BA Business Administration",
      dates: "2022 - 2025",
      field_of_study: "Data & Finance",
    },
  ],
  skills: {
    domain: ["Financial modeling", "Data analysis", "Market research"],
    tools: ["Excel", "SQL", "Tableau"],
    technical: ["Python"],
  },
  languages: ["English", "Hebrew"],
};

const MASTER_CV_OPTION = {
  id: MASTER_CV_ID,
  isMaster: true,
  tag: "Master",
  label: "Master CV",
  sub: "Your full, untailored CV",
  role: null,
  company: null,
  cvUrl: null,
  applicationId: null,
};

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
    qc.setQueryData(applicationCvsQueryKey(UID), [MASTER_CV_OPTION]);
    qc.setQueryData(cvDataQueryKey(MASTER_CV_ID), {
      id: MASTER_CV_ID,
      cv_data: MASTER_CV_DATA,
      cv_url: null,
      application_id: null,
      is_master: true,
      version: 1,
    });
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

// Career preview harness — DEV-only route at /_preview/career, same
// pattern as HomePreview: a fresh QueryClient pre-seeded with every key
// Career reads, mounted inside the real Layout with a stubbed auth user.
// Track-1 keys are seeded; switching to Track 2/3 in the preview hits
// unseeded job keys and falls to the empty state (acceptable — the
// fixture exercises the populated path).

import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import Layout from "@/Layout";
import Career from "@/pages/Career";
import { HOME_FIXTURES, HOME_FIXTURE_UID } from "./fixtures/home";

const UID = HOME_FIXTURE_UID;
const MAX_TRACK_ROLES = 8;

// Roles enriched with the why-panel fields Career renders (axis bars +
// matched/gap skill chips). Skill ids are canonical library ids so
// humanizeSkillId resolves them.
const CAREER_ROLES = [
  { id: "r-1", user_id: UID, title: "Associate Product Manager", track: "track_1", match_score: 88, readiness_score: 84, goal_alignment_score: 95, matched_skills: ["stakeholder_management", "user_research"], missing_skills: ["product_roadmapping"] },
  { id: "r-2", user_id: UID, title: "Product Analyst", track: "track_1", match_score: 80, readiness_score: 78, goal_alignment_score: 70, matched_skills: ["data_analysis", "sql"], missing_skills: ["ab_testing"] },
  { id: "r-3", user_id: UID, title: "Strategy & Operations Associate", track: "track_1", match_score: 72, readiness_score: 70, goal_alignment_score: 66, matched_skills: ["process_design"], missing_skills: ["financial_modeling"] },
  { id: "r-4", user_id: UID, title: "Customer Success Manager", track: "track_2", match_score: 64, readiness_score: 81, goal_alignment_score: 38, matched_skills: ["client_communication"], missing_skills: ["cs_tooling"] },
  { id: "r-5", user_id: UID, title: "Implementation Specialist", track: "track_2", match_score: 55, readiness_score: 74, goal_alignment_score: 31, matched_skills: ["onboarding"], missing_skills: ["integrations"] },
  { id: "r-6", user_id: UID, title: "Product Manager", track: "track_3", match_score: 41, readiness_score: 34, goal_alignment_score: 98, matched_skills: ["user_research"], missing_skills: ["product_roadmapping"] },
];

const CAREER_JOBS = [
  { id: "cj-1", ats_source: "greenhouse", external_id: "x1", title: "Associate Product Manager", company_name: "monday.com", location_city: "Tel Aviv", is_remote: false, seniority: "Junior", date_posted: new Date(Date.now() - 2 * 86400000).toISOString(), apply_url: "https://example.com", description: "", req_skills_core: [], req_skills_nice: [], req_seniority: null, function_family: null, extraction_confidence: 0.8 },
  { id: "cj-2", ats_source: "comeet", external_id: "x2", title: "Product Operations Manager", company_name: "Lightricks", location_city: "Jerusalem", is_remote: true, seniority: "Junior", date_posted: new Date(Date.now() - 4 * 86400000).toISOString(), apply_url: "https://example.com", description: "", req_skills_core: [], req_skills_nice: [], req_seniority: null, function_family: null, extraction_confidence: 0.7 },
  { id: "cj-3", ats_source: "lever", external_id: "x3", title: "Junior Product Analyst", company_name: "Riskified", location_city: "Tel Aviv", is_remote: false, seniority: "Junior", date_posted: new Date(Date.now() - 5 * 86400000).toISOString(), apply_url: "https://example.com", description: "", req_skills_core: [], req_skills_nice: [], req_seniority: null, function_family: null, extraction_confidence: 0.6 },
];

function titlesJoin(roles, track) {
  return roles
    .filter((r) => r.track === track)
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, MAX_TRACK_ROLES)
    .map((r) => r.title)
    .filter(Boolean)
    .join("|");
}

export default function CareerPreview() {
  const queryClient = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false, refetchOnMount: false },
      },
    });
    const fixture = HOME_FIXTURES["home-active"];
    const t1 = titlesJoin(CAREER_ROLES, "track_1");
    const t2 = titlesJoin(CAREER_ROLES, "track_2");
    const t3 = titlesJoin(CAREER_ROLES, "track_3");
    qc.setQueryData(["userProfile", UID], { ...fixture.profile, five_year_role: "Product Manager" });
    qc.setQueryData(["careerRoles", UID], CAREER_ROLES);
    qc.setQueryData(["experiences", UID], fixture.experiences || []);
    qc.setQueryData(["education", UID], []);
    qc.setQueryData(["career_track_counts", UID, t1, t2, t3], { track_1: 19, track_2: 14, track_3: 7 });
    qc.setQueryData(["career_jobs", UID, "track_1", t1], CAREER_JOBS);
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <Layout currentPageName="Career">
          <Career />
        </Layout>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

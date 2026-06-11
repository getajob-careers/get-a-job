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
import { HOME_FIXTURES, HOME_FIXTURE_UID, APP_ACTIVE_7 } from "./fixtures/home";

const UID = HOME_FIXTURE_UID;
const MAX_TRACK_ROLES = 8;

// Roles enriched with the why-panel fields Career renders (axis bars +
// matched/gap skill chips). Skill ids are canonical library ids so
// humanizeSkillId resolves them.
const CAREER_ROLES = [
  // Scores stored as 0-1 fractions to mirror the live DB contract — see
  // tasks/lessons.md 2026-06-11. Career.jsx normalizes to percent at
  // display time via toPct(). Previously these rows used display-unit
  // numbers (88, 80, …), which let the 100× display bug slip past two
  // reviews and a 17-page preview packet because the preview pipeline
  // saw already-percent values and never exercised the missing × 100.
  { id: "r-1", user_id: UID, title: "Associate Product Manager", track: "track_1", match_score: 0.88, readiness_score: 0.84, goal_alignment_score: 0.95, matched_skills: ["stakeholder_management", "user_research"], missing_skills: ["product_roadmapping"] },
  { id: "r-2", user_id: UID, title: "Product Analyst", track: "track_1", match_score: 0.80, readiness_score: 0.78, goal_alignment_score: 0.70, matched_skills: ["data_analysis", "sql"], missing_skills: ["ab_testing"] },
  { id: "r-3", user_id: UID, title: "Strategy & Operations Associate", track: "track_1", match_score: 0.72, readiness_score: 0.70, goal_alignment_score: 0.66, matched_skills: ["process_design"], missing_skills: ["financial_modeling"] },
  { id: "r-4", user_id: UID, title: "Customer Success Manager", track: "track_2", match_score: 0.64, readiness_score: 0.81, goal_alignment_score: 0.38, matched_skills: ["client_communication"], missing_skills: ["cs_tooling"] },
  { id: "r-5", user_id: UID, title: "Implementation Specialist", track: "track_2", match_score: 0.55, readiness_score: 0.74, goal_alignment_score: 0.31, matched_skills: ["onboarding"], missing_skills: ["integrations"] },
  { id: "r-6", user_id: UID, title: "Product Manager", track: "track_3", match_score: 0.41, readiness_score: 0.34, goal_alignment_score: 0.98, matched_skills: ["user_research"], missing_skills: ["product_roadmapping"] },
];

// Canonical skill IDs the fixture profile holds — these intersect with
// the in-range jobs' req_skills_core / req_skills_nice so scoreJobFit
// produces meaningful matched_skills / missing_core_skills arrays and
// the JobCard chip rows render visibly. Without these, every card
// renders chip-less and the preview can't validate the JobCard
// adoption visually.
const FIXTURE_SKILLS_CANONICAL = [
  "stakeholder_management",
  "user_research",
  "data_analysis",
  "sql",
  "process_design",
  "onboarding",
];

// Seniority + skill profiles per job. Chosen so the early-career
// fixture profile lands in the 70-90% band on the three entry/mid
// jobs and in the 20-45% band on the out-of-range senior/lead/director
// jobs — producing a clean visual spread for the JD/chips preview.
//
// Seniority values use the live enum (entry / mid / senior / lead /
// director / executive — confirmed against live data 2026-05-20 per
// experienceLevel.js:185-187). The mix here is deliberate: 3 in-range
// for the early-career fixture profile (entry / mid) + 3 out-of-range
// (senior / lead / director). With the seniority pre-filter restored,
// only the first three render on Track 1 and Track 2; Track 3 still
// shows the full set thanks to the ALL_SENIORITIES bypass (the
// 2026-05-20 discovery lesson).
//
// Job descriptions filled in (~140-180 chars each) so the JobCard JD
// preview's "View job description" toggle has real content to render
// in the captured pdf.
const CAREER_JOBS = [
  { id: "cj-1", ats_source: "greenhouse", external_id: "x1", title: "Associate Product Manager", company_name: "monday.com", location_city: "Tel Aviv", is_remote: false, seniority: "entry", years_experience_min: 0, years_experience_max: 2, date_posted: new Date(Date.now() - 2 * 86400000).toISOString(), apply_url: "https://example.com", description: "Join monday.com's product team as an APM. You'll work alongside senior PMs to scope features, run user research interviews, and ship improvements to the core work-management surface. Strong stakeholder communication and curiosity about workflow tools required.", req_skills_core: ["stakeholder_management", "user_research"], req_skills_nice: ["sql"], req_years_min: 0, req_years_max: 2, req_seniority: "entry", function_family: "product", extraction_confidence: 0.85 },
  { id: "cj-2", ats_source: "comeet", external_id: "x2", title: "Product Operations Manager", company_name: "Lightricks", location_city: "Jerusalem", is_remote: true, seniority: "mid", years_experience_min: 2, years_experience_max: 5, date_posted: new Date(Date.now() - 4 * 86400000).toISOString(), apply_url: "https://example.com", description: "Own the operational backbone of our product org. You'll design the rituals (planning, reviews, launches), maintain the data pipelines that PMs rely on, and shorten the gap between insight and decision.", req_skills_core: ["process_design", "data_analysis"], req_skills_nice: ["product_roadmapping"], req_years_min: 2, req_years_max: 5, req_seniority: "mid", function_family: "product_ops", extraction_confidence: 0.78 },
  { id: "cj-3", ats_source: "lever", external_id: "x3", title: "Junior Product Analyst", company_name: "Riskified", location_city: "Tel Aviv", is_remote: false, seniority: "entry", years_experience_min: 0, years_experience_max: 2, date_posted: new Date(Date.now() - 5 * 86400000).toISOString(), apply_url: "https://example.com", description: "Help our fraud-prevention PMs answer questions in hours, not weeks. You'll write SQL against our merchant-transaction warehouse, build self-serve dashboards, and partner with growth on weekly funnel reviews.", req_skills_core: ["sql", "data_analysis"], req_skills_nice: ["ab_testing"], req_years_min: 0, req_years_max: 2, req_seniority: "entry", function_family: "analytics", extraction_confidence: 0.72 },
  { id: "cj-4", ats_source: "greenhouse", external_id: "x4", title: "Senior Product Manager", company_name: "Wix", location_city: "Tel Aviv", is_remote: false, seniority: "senior", years_experience_min: 5, years_experience_max: 8, date_posted: new Date(Date.now() - 3 * 86400000).toISOString(), apply_url: "https://example.com", description: "Own the AI-website-builder roadmap end-to-end. You'll set quarterly OKRs across 3 squads, partner with research on weekly studies, and drive a North-Star metric from inception to scale across 200M+ Wix users.", req_skills_core: ["stakeholder_management", "product_roadmapping", "ab_testing"], req_skills_nice: [], req_years_min: 5, req_years_max: 8, req_seniority: "senior", function_family: "product", extraction_confidence: 0.82 },
  { id: "cj-5", ats_source: "lever", external_id: "x5", title: "Director of Product", company_name: "Lemonade", location_city: "Tel Aviv", is_remote: false, seniority: "director", years_experience_min: 8, years_experience_max: 14, date_posted: new Date(Date.now() - 6 * 86400000).toISOString(), apply_url: "https://example.com", description: "Lead a 12-person product org spanning underwriting, claims AI, and growth. You'll set the multi-year strategy, hire across IC and management tracks, and report to the CPO on the company's biggest bets.", req_skills_core: ["leadership", "strategic_planning", "stakeholder_management"], req_skills_nice: [], req_years_min: 8, req_years_max: 14, req_seniority: "director", function_family: "product", extraction_confidence: 0.75 },
  { id: "cj-6", ats_source: "comeet", external_id: "x6", title: "Lead Product Operations", company_name: "Fiverr", location_city: "Tel Aviv", is_remote: false, seniority: "lead", years_experience_min: 6, years_experience_max: 10, date_posted: new Date(Date.now() - 7 * 86400000).toISOString(), apply_url: "https://example.com", description: "Scale the PrOps function as Fiverr's product org grows. You'll design the planning OS, own product-data infrastructure, manage 2-3 ICs, and partner with finance on quarterly capacity reviews.", req_skills_core: ["operations_strategy", "process_design"], req_skills_nice: ["leadership"], req_years_min: 6, req_years_max: 10, req_seniority: "lead", function_family: "product_ops", extraction_confidence: 0.62 },
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
  // PR-A1 strip preview supports two variants via ?state= query param:
  //   - (default / populated) the strip lights up saved/applied/interview tiles
  //   - state=zero — empty applications, all tiles render muted-zero
  // Read synchronously so the seed in useMemo factory picks it up before
  // Career's first render.
  const stripVariant = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("state")
    : null;

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
    qc.setQueryData(["userProfile", UID], {
      ...fixture.profile,
      five_year_role: "Product Manager",
      // skills_canonical drives scoreJobFit's matched_skills /
      // missing_core_skills outputs — populated so JobCard's Strengths
      // and Skill gaps chip rows render in the preview pdf.
      skills_canonical: FIXTURE_SKILLS_CANONICAL,
    });
    qc.setQueryData(["careerRoles", UID], CAREER_ROLES);
    // Wide applications cache for the pipeline strip (PR-A1). Reuses
    // home.js's APP_ACTIVE_7 mixed-status fixture so the strip lights up
    // applied (4) + interview (2) tiles; saved and offer render muted-zero
    // so both render paths appear in a single capture. ?state=zero swaps
    // to an empty list for the zero-state capture.
    qc.setQueryData(["applications", UID], stripVariant === "zero" ? [] : APP_ACTIVE_7);
    // experiences + educations seeded explicitly as empty arrays so
    // inferExperienceLevel resolves deliberately to "early_career"
    // (totalYearsOfExperience([]) === 0, isCurrentlyStudent([]) === false,
    // 0 < 3 → early_career). That maps to allowedSeniorities =
    // ["entry", "mid"], which is the case the fixture's mixed-seniority
    // CAREER_JOBS list is built to exercise.
    qc.setQueryData(["experiences", UID], []);
    qc.setQueryData(["education", UID], []);
    qc.setQueryData(["career_track_counts", UID, t1, t2, t3], { track_1: 19, track_2: 14, track_3: 7 });
    // The career_jobs queryKey now includes the seniority filter — keep
    // both seeds (filtered + bypass) so Track 1 and Track 3 both render
    // through cache without falling back to the (mocked-empty) RPC.
    qc.setQueryData(["career_jobs", UID, "track_1", t1, ["entry","mid"].join(",")], CAREER_JOBS.filter((j) => ["entry","mid"].includes(j.seniority)));
    qc.setQueryData(["career_jobs", UID, "track_3", t3, ["entry","mid","senior","lead","director","executive"].join(",")], CAREER_JOBS);
    // All-scope search fixture: query="product", seniority filter
    // "entry,mid". The Career page's debounce + scope=all path consults
    // this key. Returns the three in-range jobs whose titles match
    // /product/i (APM, Product Operations Manager, Junior Product
    // Analyst) — Senior PM / Director of Product / Lead Product
    // Operations are pre-filtered by the entry,mid allowedSeniorities.
    qc.setQueryData(
      ["career_jobs_search", UID, "product", ["entry","mid"].join(",")],
      CAREER_JOBS.filter((j) =>
        ["entry","mid"].includes(j.seniority) && /product/i.test(j.title),
      ),
    );
    return qc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripVariant]);

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

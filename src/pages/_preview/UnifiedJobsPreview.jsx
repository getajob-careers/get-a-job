// Unified jobs preview - DEV-only route at /_preview/unified-jobs. Mounts the
// REAL flag-on JobsSearchTab (Plan 1: the whole-corpus unified surface) with a
// seeded fixture corpus + profile, so the sort toggle, status line, 3-col
// density, and mobile filter drawer render without auth or network.
//
// The fixture deliberately anti-correlates skill fit with recency (the newest
// roles are weaker matches; a few older roles are strong matches) so the
// Best-match / Newest toggle visibly re-orders the list. Flag-on is forced by
// stamping data-next-design on <html> while this route is mounted.

import React, { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import { jobDescriptionKey } from "@/lib/queries/useJobDescription";
import JobsSearchTab from "@/components/jobs/JobsSearchTab";

// A realistic-enough profile: canonical skills drive the skill axis; the rest
// let the years / education / seniority axes resolve without erroring.
const PROFILE = {
  id: "preview-user",
  skills_canonical: [
    "sql",
    "data_analysis",
    "stakeholder_management",
    "user_research",
    "process_design",
    "excel",
  ],
  work_type: ["onsite", "remote"],
  function_family: "Product",
  education_level: "bachelors",
};
const EXPERIENCES = [
  {
    id: "e1",
    title: "Analyst Intern",
    start_date: "2024-07-01",
    end_date: "2025-06-01",
  },
];
const EDUCATIONS = [
  { id: "d1", degree_level: "bachelors", field_of_study: "Economics" },
];

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

// Skill-heavy roles matched to the profile vs. lean/off-domain roles. `hi`
// tags a strong skill overlap; those are given OLDER dates so Best-match
// pulls them above the newer, weaker roles that Newest surfaces first.
const CORPUS = [
  row(
    "Junior Product Analyst",
    "Riskified",
    "riskified",
    "Tel Aviv",
    false,
    "entry",
    "Data",
    18,
    ["sql", "data_analysis", "excel"],
    ["stakeholder_management"],
  ),
  row(
    "Business Analyst, Revenue",
    "Gong",
    "gong",
    "Ramat Gan",
    false,
    "entry",
    "Data",
    22,
    ["sql", "data_analysis"],
    ["salesforce"],
  ),
  row(
    "Associate Product Manager",
    "monday.com",
    "monday",
    "Tel Aviv",
    false,
    "entry",
    "Product",
    25,
    ["stakeholder_management", "user_research", "process_design"],
    ["product_roadmapping"],
  ),
  row(
    "Product Operations Manager",
    "Lightricks",
    "lightricks",
    "Jerusalem",
    true,
    "mid",
    "Operations",
    30,
    ["process_design", "data_analysis", "stakeholder_management"],
    ["tooling_admin"],
  ),
  row(
    "Data Analyst, Growth",
    "Wix",
    "wix",
    "Tel Aviv",
    false,
    "mid",
    "Data",
    34,
    ["sql", "data_analysis", "excel", "process_design"],
    ["python"],
  ),
  // Newer, weaker matches (surface first under Newest, sink under Best match):
  row(
    "Frontend Engineer",
    "Fireblocks",
    "fireblocks",
    "Tel Aviv",
    false,
    "mid",
    "Engineering",
    1,
    ["react", "typescript"],
    ["graphql"],
  ),
  row(
    "DevOps Engineer",
    "Snyk",
    "snyk",
    "Tel Aviv",
    true,
    "senior",
    "Engineering",
    2,
    ["kubernetes", "aws"],
    ["terraform"],
  ),
  row(
    "Marketing Coordinator",
    "Fiverr",
    "fiverr",
    "Tel Aviv",
    true,
    "entry",
    "Marketing",
    3,
    ["content_marketing"],
    ["seo"],
  ),
  row(
    "Sales Development Rep",
    "Gong",
    "gong",
    "Ramat Gan",
    false,
    "entry",
    "Sales",
    4,
    ["cold_outreach"],
    ["salesforce"],
  ),
  row(
    "Customer Success Manager",
    "Melio",
    "melio",
    "Tel Aviv",
    false,
    "mid",
    "Customer_Experience",
    5,
    ["onboarding"],
    ["account_management"],
  ),
  row(
    "QA Automation Engineer",
    "Papaya Global",
    "papaya",
    "Herzliya",
    false,
    "mid",
    "Engineering",
    6,
    ["selenium", "python"],
    ["ci_cd"],
  ),
  row(
    "Finance Operations Associate",
    "Rapyd",
    "rapyd",
    "Tel Aviv",
    false,
    "entry",
    "Finance",
    7,
    ["excel", "financial_modeling"],
    ["sql"],
  ),
  row(
    "UX Researcher",
    "Lightricks",
    "lightricks",
    "Jerusalem",
    true,
    "mid",
    "Design_UX",
    9,
    ["user_research"],
    ["figma"],
  ),
  row(
    "Operations Associate",
    "Deel",
    "deel",
    "Haifa",
    true,
    "entry",
    "Operations",
    11,
    ["process_design", "excel"],
    ["data_analysis"],
  ),
  row(
    "Business Analyst",
    "Riskified",
    "riskified",
    "Tel Aviv",
    false,
    "mid",
    "Data",
    14,
    ["sql", "data_analysis", "stakeholder_management"],
    ["tableau"],
  ),
];

function row(
  title,
  company_name,
  company_slug,
  location_city,
  is_remote,
  seniority,
  function_family,
  postedDays,
  core,
  nice,
) {
  return {
    id: `${company_slug}-${title.replace(/\W+/g, "-").toLowerCase()}`,
    ats_source: "preview",
    external_id: `${company_slug}-${postedDays}`,
    title,
    company_name,
    company_slug,
    location_city,
    location_raw: location_city,
    is_remote,
    is_agency: false,
    seniority,
    years_experience_min:
      seniority === "entry" ? 0 : seniority === "mid" ? 2 : 5,
    years_experience_max:
      seniority === "entry" ? 2 : seniority === "mid" ? 5 : 9,
    date_posted: daysAgo(postedDays),
    apply_url: "https://example.com",
    industry: "Software",
    req_skills_core: core,
    req_skills_nice: nice,
    req_years_min: seniority === "entry" ? 0 : seniority === "mid" ? 2 : 5,
    req_years_max: seniority === "entry" ? 2 : seniority === "mid" ? 5 : 9,
    req_education_levels: ["bachelors"],
    req_education_strict: false,
    req_seniority: seniority,
    function_family,
    extraction_confidence: 0.8,
  };
}

export default function UnifiedJobsPreview() {
  // Force flag-on BEFORE children first read isNextDesign(): a useState
  // initializer runs during render (an effect would fire after the first
  // paint, and with the corpus seeded synchronously there is no re-render to
  // pick the attribute up, so the first paint would be flag-off).
  useState(() => {
    document.documentElement.setAttribute("data-next-design", "");
    return null;
  });
  useEffect(
    () => () => document.documentElement.removeAttribute("data-next-design"),
    [],
  );

  const queryClient = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    // Seed both corpus queries JobsSearchTab reads (first page + full corpus).
    qc.setQueryData(["jobsCorpusFirstPage"], CORPUS);
    qc.setQueryData(["jobsCorpusLight"], CORPUS);
    qc.setQueryData(["company_domains"], {
      bySlug: {
        riskified: "riskified.com",
        gong: "gong.io",
        monday: "monday.com",
        lightricks: "lightricks.com",
        wix: "wix.com",
        fiverr: "fiverr.com",
      },
      byName: {},
    });
    for (const j of CORPUS)
      qc.setQueryData(
        jobDescriptionKey(j.id),
        `${j.title} at ${j.company_name}. Fixture description for the unified-jobs preview.`,
      );
    return qc;
  }, []);

  const authValue = useMemo(
    () => ({
      user: { id: "preview-user", email: "preview@example.com" },
      isAuthenticated: true,
      isLoadingAuth: false,
      logout: () => {},
    }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        {/* Reproduce ThreeTabHome's jobs-tab shell so the sticky filter bar +
            inner-scroll behavior match the real surface: a fixed-height outer,
            a md:overflow-hidden tab body, and the md:h-full md:overflow-y-auto
            jobs wrapper that owns the desktop scroll. */}
        <div className="h-screen flex flex-col bg-rd-bg-page px-6">
          <div className="flex-shrink-0 pt-4 pb-2 max-w-[1080px] w-full mx-auto">
            <h1 className="font-display font-extrabold text-[22px] text-rd-text mb-1">
              Unified jobs - Plan 1 (flag-on)
            </h1>
            <p className="text-[12.5px] text-rd-text-secondary">
              Real ThreeTabHome scroll shell. Toggle Best match / Newest, open
              Filters, scroll the list, and narrow the viewport for the drawer.
            </p>
          </div>
          <div className="relative flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            <div className="max-w-[1080px] w-full mx-auto md:h-full md:overflow-y-auto">
              <JobsSearchTab
                profile={PROFILE}
                experiences={EXPERIENCES}
                educations={EDUCATIONS}
                unifiedSurface
              />
            </div>
            {/* Batch B bottom edge-fade (the real one lives in ThreeTabHome's
                tab body; mirrored here so the preview shows the effect). */}
            <div
              aria-hidden="true"
              className="hidden md:block pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-rd-bg-page to-transparent"
            />
          </div>
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

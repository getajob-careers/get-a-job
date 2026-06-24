// Jobs logo preview — DEV-only route at /_preview/jobs-logos. Renders a few
// real JobCards with fixture job rows whose company_slug/company_name match
// seeded ["company_domains"] entries, so the logo cascade (logo.dev →
// DuckDuckGo icon → letter avatar) resolves against REAL company domains and
// fetches actual logos over the network. The last card has no domain match
// on purpose, to show the letter-avatar placeholder fallback.

import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import JobCard from "@/components/jobs/JobCard";

const FIXTURE_JOBS = [
  { id: "jl-1", title: "Associate Product Manager", company_name: "monday.com", company_slug: "monday", location_city: "Tel Aviv", is_remote: false, seniority: "entry", date_posted: new Date(Date.now() - 2 * 86400000).toISOString(), apply_url: "https://example.com", req_skills_core: [], req_skills_nice: [] },
  { id: "jl-2", title: "Revenue Analyst", company_name: "Wix", company_slug: "wix", location_city: "Tel Aviv", is_remote: true, seniority: "entry", date_posted: new Date(Date.now() - 3 * 86400000).toISOString(), apply_url: "https://example.com", req_skills_core: [], req_skills_nice: [] },
  { id: "jl-3", title: "Business Operations Associate", company_name: "Fiverr", company_slug: "fiverr", location_city: "Tel Aviv", is_remote: false, seniority: "entry", date_posted: new Date(Date.now() - 5 * 86400000).toISOString(), apply_url: "https://example.com", req_skills_core: [], req_skills_nice: [] },
  { id: "jl-4", title: "Risk Analyst", company_name: "Bank Leumi", company_slug: "leumi", location_city: "Tel Aviv", is_remote: false, seniority: "entry", date_posted: new Date(Date.now() - 4 * 86400000).toISOString(), apply_url: "https://example.com", req_skills_core: [], req_skills_nice: [] },
  { id: "jl-5", title: "Customer Success Specialist", company_name: "Acme Stealth Startup", company_slug: "no-match-xyz", location_city: "Herzliya", is_remote: false, seniority: "entry", date_posted: new Date(Date.now() - 1 * 86400000).toISOString(), apply_url: "https://example.com", req_skills_core: [], req_skills_nice: [] },
];

export default function JobsLogoPreview() {
  const queryClient = useMemo(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false } },
    });
    // Seed the domain map so JobCard resolves these companies without a
    // network call for the lookup itself (logos still load from the CDN).
    qc.setQueryData(["company_domains"], {
      bySlug: { monday: "monday.com", wix: "wix.com", fiverr: "fiverr.com", leumi: "leumi.co.il" },
      byName: { mondaycom: "monday.com", wix: "wix.com", fiverr: "fiverr.com", bankleumi: "leumi.co.il" },
    });
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
        <div className="min-h-screen bg-rd-bg-page p-6">
          <div className="max-w-[640px] mx-auto">
            <h1 className="font-display font-extrabold text-[22px] text-rd-text mb-1">Job cards — company logos</h1>
            <p className="text-[12.5px] text-rd-text-secondary mb-5">
              monday/Wix/Fiverr load real logos; Bank Leumi resolves a domain DuckDuckGo lacks (should show the LETTER, not a grey chevron); Acme has no domain match (letter).
            </p>
            <div className="flex flex-col gap-3">
              {FIXTURE_JOBS.map((job) => (
                <JobCard key={job.id} job={job} trackColor="coral" />
              ))}
            </div>
          </div>
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

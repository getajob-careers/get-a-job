// Jobs grid preview — DEV-only route at /_preview/jobs-grid. Renders the new
// 3-across JobGridCard grid with fixture jobs + scores, manages the open-modal
// state exactly like the feeds do, and seeds the company-domain + description
// caches so logos and the popup body render without auth or network.

import React, { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/AuthContext";
import { TRACK_CONFIG } from "@/lib/trackConfig";
import { jobDescriptionKey } from "@/lib/queries/useJobDescription";
import JobGridCard from "@/components/jobs/JobGridCard";
import JobDetailModal from "@/components/jobs/JobDetailModal";

const FIXTURE = [
  {
    job: { id: "g1", title: "Associate Product Manager", company_name: "monday.com", company_slug: "monday", location_city: "Tel Aviv", is_remote: false, seniority: "entry", years_experience_min: 0, years_experience_max: 2, date_posted: new Date(Date.now() - 2 * 86400000).toISOString(), apply_url: "https://example.com" },
    score: { fit_score: 0.84, track: "track_1", attainability_band: "strong", attainability_score: 0.84, signals: { matched_skills: ["stakeholder_management", "user_research", "process_design"], missing_core_skills: ["product_roadmapping"] }, reasoning: { strengths: ["Strong skills match", "Right seniority for you"] } },
    desc: "Join monday.com's product team as an APM. You'll work alongside senior PMs to scope features, run user-research interviews, and ship improvements to the core work-management surface. Strong stakeholder communication and curiosity about workflow tools required.\n\nThis is an entry-level role with a clear path toward owning your own product area.",
  },
  {
    job: { id: "g2", title: "Junior Product Analyst", company_name: "Riskified", company_slug: "riskified", location_city: "Tel Aviv", is_remote: false, seniority: "entry", years_experience_min: 0, years_experience_max: 2, date_posted: new Date(Date.now() - 5 * 86400000).toISOString(), apply_url: "https://example.com" },
    score: { fit_score: 0.78, track: "track_1", attainability_band: "good", attainability_score: 0.78, signals: { matched_skills: ["sql", "data_analysis"], missing_core_skills: ["ab_testing"] }, reasoning: { strengths: ["Your SQL + analytics line up well"] } },
    desc: "Help our fraud-prevention PMs answer questions in hours, not weeks. You'll write SQL against our merchant-transaction warehouse, build self-serve dashboards, and partner with growth on weekly funnel reviews.",
  },
  {
    job: { id: "g3", title: "Business Operations Associate", company_name: "Fiverr", company_slug: "fiverr", location_city: "Tel Aviv", is_remote: true, seniority: "mid", years_experience_min: 2, years_experience_max: 5, date_posted: new Date(Date.now() - 8 * 86400000).toISOString(), apply_url: "https://example.com" },
    score: { fit_score: 0.55, track: "track_3", attainability_band: "stretch", attainability_score: 0.55, signals: { matched_skills: ["process_design"], missing_core_skills: ["financial_modeling", "sql"] }, reasoning: { strengths: ["Adjacent to your operations experience"] } },
    desc: "Own the operational backbone of a fast-moving marketplace team — planning rituals, the data pipelines leadership relies on, and the gap between insight and decision.",
  },
  {
    job: { id: "g4", title: "Product Operations Manager", company_name: "Lightricks", company_slug: "lightricks", location_city: "Jerusalem", is_remote: true, seniority: "mid", years_experience_min: 2, years_experience_max: 5, date_posted: new Date(Date.now() - 4 * 86400000).toISOString(), apply_url: "https://example.com" },
    score: { fit_score: 0.81, track: "track_2", attainability_band: "strong", attainability_score: 0.81, signals: { matched_skills: ["process_design", "data_analysis"], missing_core_skills: ["tooling_admin"] }, reasoning: { strengths: ["Process + data skills are a direct match"] } },
    desc: "Design the rituals (planning, reviews, launches), maintain the data pipelines PMs rely on, and shorten the gap between insight and decision.",
  },
  {
    job: { id: "g5", title: "Business Analyst, Revenue", company_name: "Gong", company_slug: "gong", location_city: "Ramat Gan", is_remote: false, seniority: "entry", years_experience_min: 0, years_experience_max: 2, date_posted: new Date(Date.now() - 3 * 86400000).toISOString(), apply_url: "https://example.com" },
    score: { fit_score: 0.71, track: "track_1", attainability_band: "good", attainability_score: 0.71, signals: { matched_skills: ["data_analysis"], missing_core_skills: ["salesforce"] }, reasoning: { strengths: ["Analytics foundation fits the role"] } },
    desc: "Partner with revenue leadership to turn raw pipeline data into weekly decisions. Build dashboards, run funnel reviews, and surface where deals stall.",
  },
  {
    job: { id: "g6", title: "Implementation Specialist", company_name: "Acme Stealth", company_slug: "no-match", location_city: "Herzliya", is_remote: false, seniority: "mid", years_experience_min: 2, years_experience_max: 4, date_posted: new Date(Date.now() - 6 * 86400000).toISOString(), apply_url: "https://example.com" },
    score: { fit_score: 0.48, track: "track_3", attainability_band: "reach", attainability_score: 0.48, signals: { matched_skills: ["onboarding"], missing_core_skills: ["integrations", "sql"] }, reasoning: { strengths: ["A reach today — worth growing toward"] } },
    desc: "Own customer onboarding end to end: configure the product, integrate with their stack, and make week one a success. (No company logo match — shows the letter placeholder.)",
  },
];

export default function JobsGridPreview() {
  const [openJob, setOpenJob] = useState(null);

  const queryClient = useMemo(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    qc.setQueryData(["company_domains"], {
      bySlug: { monday: "monday.com", riskified: "riskified.com", fiverr: "fiverr.com", lightricks: "lightricks.com", gong: "gong.io" },
      byName: {},
    });
    for (const f of FIXTURE) qc.setQueryData(jobDescriptionKey(f.job.id), f.desc);
    return qc;
  }, []);

  const authValue = useMemo(
    () => ({ user: { id: "preview-user", email: "preview@example.com" }, isAuthenticated: true, isLoadingAuth: false, logout: () => {} }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <div className="min-h-screen bg-rd-bg-page p-6">
          <div className="max-w-[1000px] mx-auto">
            <h1 className="font-display font-extrabold text-[22px] text-rd-text mb-1">Jobs — grid + detail popup</h1>
            <p className="text-[12.5px] text-rd-text-secondary mb-5">Click any card to open the detail popup (description pre-seeded). Last card has no logo match → letter placeholder.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIXTURE.map(({ job, score }) => {
                const trackRdColor = score?.track ? TRACK_CONFIG[score.track]?.rdColor : null;
                return (
                  <JobGridCard
                    key={job.id}
                    job={job}
                    scoreResult={score}
                    trackColor={trackRdColor}
                    unified
                    onOpen={(j, s) => setOpenJob({ job: j, scoreResult: s, trackColor: trackRdColor })}
                  />
                );
              })}
            </div>
          </div>
          {openJob && (
            <JobDetailModal job={openJob.job} scoreResult={openJob.scoreResult} trackColor={openJob.trackColor} unified onClose={() => setOpenJob(null)} />
          )}
        </div>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

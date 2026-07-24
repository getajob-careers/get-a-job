import React, { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useAgentDrawer } from "@/lib/AgentDrawerContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

import InternshipHeader from "@/components/internship/InternshipHeader";
import InternshipProfileStrip from "@/components/internship/InternshipProfileStrip";
import FindCompaniesCard from "@/components/internship/FindCompaniesCard";
import CompanyTargetsKanban from "@/components/internship/CompanyTargetsKanban";
import CompanyTargetDrawer from "@/components/internship/CompanyTargetDrawer";
import AddOwnCompanyModal from "@/components/internship/AddOwnCompanyModal";
import { InternshipStartHere, NoInternshipProfile } from "@/components/internship/EmptyStates";
import CompanyBrowsePanel from "@/components/internship/browse/CompanyBrowsePanel";
import { BROWSE_CSS } from "@/components/internship/browse/browseStyles";
import RdTabs from "@/components/redesign/RdTabs";

// Internship page — Browse + Pipeline tabs (PR2 redesign).
//
// Browse (default): scrollable catalog of all 819 companies. Display-
// only cards; click is a no-op until PR3 wires the detail drawer.
// Pipeline: existing kanban of company_targets the student owns.
//
// The matcher (generate-internship-profile + FindCompaniesCard) stays
// self_sourced-only. Faculty-assigned users see Browse + their existing
// kanban + the Add-my-own-company button — no profile-strip, no matcher.
//
// Gate removed (PR2): users no longer have to generate an internship
// profile before browsing. The pitch strategy still feeds the per-card
// fit score; without it, scores show "—" and a nudge banner sits above
// the grid.

const TABS = [
  { id: "pipeline", label: "Pipeline" },
  { id: "browse",   label: "Browse" },
];

// PR7: default tab → Pipeline. The pipeline IS the user's working set;
// browse is for exploration. Explicit ?tab=browse still wins so
// "Browse all companies" links and deep links land on Browse.
const DEFAULT_TAB = "pipeline";

export default function Internship() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [openTarget, setOpenTarget] = useState(null);
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

  // PR-B2: surface the open company-target row to the agent drawer so
  // the server can render a TARGET COMPANY block from company_targets +
  // companies. openTarget.id is the row's UUID — no titles or content
  // travel through the client; the server fetches everything under
  // user-scoped auth.
  // Depend on the STABLE setPageContext, not the whole agentDrawer object,
  // which changes identity on every pageContext/isOpen update and ping-pongs
  // this effect into "Maximum update depth exceeded" (audit S-B1). Same fix
  // Home.jsx and Career.jsx carry.
  const { setPageContext } = useAgentDrawer();
  useEffect(() => {
    const ctx = { page: "Internship" };
    if (openTarget?.id) ctx.company_target_id = openTarget.id;
    setPageContext(ctx);
    return () => setPageContext(null);
  }, [openTarget?.id, setPageContext]);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.find((t) => t.id === searchParams.get("tab"))?.id || DEFAULT_TAB;

  const { data: profileRow, isLoading: profileLoading } = useProfileQuery(
    user?.id,
    (p) => p ? {
      practicum_path: p.practicum_path,
      practicum_cohort: p.practicum_cohort,
      practicum_status: p.practicum_status,
    } : null,
  );

  const isSelfSourced = profileRow?.practicum_path === "self_sourced";

  const { data: internshipProfile, isLoading: internshipProfileLoading } = useQuery({
    queryKey: ["internship_profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("internship_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isSelfSourced,
  });

  // career_roles has no updated_at column — rows are replaced wholesale on
  // each career-analysis run, so the newest row's created_at IS the
  // last-analysis time. Querying updated_at returned 400 on every page
  // load (PR11 fix).
  const { data: latestCareerRolesUpdatedAt } = useQuery({
    queryKey: ["career_roles_latest_created_at", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("career_roles")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.created_at || null;
    },
    enabled: !!user?.id && isSelfSourced,
  });

  const handleGenerateProfile = async () => {
    if (generatingProfile) return;
    setGeneratingProfile(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-internship-profile", { body: {} });
      if (error) {
        const status = error?.context?.status;
        if (status === 429) toast.error("Rate limit reached - try again in an hour.");
        else if (status === 400) toast.error(error?.context?.error || "Complete your profile first.");
        else toast.error("Couldn't generate the pitch strategy. Please try again.");
        return;
      }
      if (!data?.internship_profile) {
        toast.error("No profile came back.");
        return;
      }
      toast.success("Pitch strategy generated.");
      queryClient.invalidateQueries({ queryKey: ["internship_profile", user?.id] });
    } catch {
      toast.error("Couldn't generate the pitch strategy. Please try again.");
    } finally {
      setGeneratingProfile(false);
    }
  };

  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ["company_targets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("company_targets")
        .select(`
          id, status, source, match_score, match_rationale,
          pitched_role,
          notes, created_at, updated_at,
          companies (
            id, name, domain, description, industry, sector, stage,
            hq_country, hq_city, employee_count_range
          )
        `)
        .eq("user_id", user.id)
        .order("match_score", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!profileRow?.practicum_path,
  });

  if (profileLoading) {
    return (
      <>
        <style>{BROWSE_CSS}</style>
        <InternshipLoadingSkeleton />
      </>
    );
  }

  const practicumPath = profileRow?.practicum_path;
  if (!practicumPath) {
    return <Navigate to={createPageUrl("Home")} replace />;
  }

  const setTab = (tabId) => {
    setSearchParams((sp) => {
      const next = new URLSearchParams(sp);
      next.set("tab", tabId);
      return next;
    });
  };

  // Three Pipeline-tab states the empty-state logic has to disambiguate:
  //
  //   A. self_sourced, internship_profile missing       → NoInternshipProfile
  //      (the only state with an interactive Generate-profile CTA — without
  //      it the student has no path to invoke generate-internship-profile,
  //      so the matcher/pipeline downstream stays empty forever)
  //   B. self_sourced, internship_profile exists, 0 targets → ProfileStrip +
  //      FindCompaniesCard (enabled) + InternshipStartHere (3-step explainer)
  //      + empty-kanban placeholder
  //   C. faculty_assigned, any target count             → KanbanOrEmpty
  //      (faculty users skip the matcher entirely; they Add-my-own or get a
  //      faculty-assigned placement)
  //
  // PR-NoIPFix (2026-06-14): state A was previously unreachable — the
  // legacy NoInternshipProfile empty state stopped being rendered during
  // the Pipeline-as-default redesign (PRs 184-190), leaving a chicken-and-
  // egg where InternshipProfileStrip (containing the only handle to
  // handleGenerateProfile via its Refresh button) only mounted AFTER an
  // internship_profile existed. The 2 self-sourced practicum users on prod
  // landed on a passive InternshipStartHere card with no action and never
  // invoked generate-internship-profile (zero metric rows confirmed).
  const needsInternshipProfile = isSelfSourced && !internshipProfileLoading && !internshipProfile;
  const showStartHere = !needsInternshipProfile && targets.length === 0 && !targetsLoading;

  return (
    <>
      <style>{BROWSE_CSS}</style>
      <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
          <InternshipHeader
            practicumPath={practicumPath}
            practicumStatus={profileRow?.practicum_status}
            practicumCohort={profileRow?.practicum_cohort}
          />

          {/* Tab pill bar — Pipeline (default) | Browse */}
          <RdTabs
            tabs={TABS}
            value={activeTab}
            onChange={setTab}
            variant="pill"
            className="gap-1.5 mt-6 mb-2"
            aria-label="Internship sections"
          />

          {activeTab === "browse" && <CompanyBrowsePanel />}

          {activeTab === "pipeline" && (
            <>
              {needsInternshipProfile ? (
                <NoInternshipProfile
                  onGenerate={handleGenerateProfile}
                  generateDisabled={generatingProfile}
                />
              ) : (
                <>
                  {isSelfSourced && (
                    <>
                      {!internshipProfileLoading && internshipProfile && (
                        <InternshipProfileStrip
                          profile={internshipProfile}
                          onRefresh={handleGenerateProfile}
                          refreshDisabled={generatingProfile}
                          refreshLoading={generatingProfile}
                          latestCareerRolesUpdatedAt={latestCareerRolesUpdatedAt}
                        />
                      )}
                      <FindCompaniesCard
                        disabled={!internshipProfile || generatingProfile}
                        disabledReason={
                          !internshipProfile
                            ? "Generate your pitch profile first."
                            : undefined
                        }
                      />
                    </>
                  )}

                  {showStartHere && <InternshipStartHere practicumPath={practicumPath} />}

                  <div className="flex items-center justify-between mt-7 mb-3">
                    <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">Your pipeline</p>
                    <button
                      type="button"
                      onClick={() => setAddCompanyOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-display font-semibold bg-rd-bg-card text-rd-text border border-rd-border hover:bg-rd-bg-soft hover:border-rd-border-hover transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add my own company
                    </button>
                  </div>

                  <KanbanOrEmpty
                    targets={targets}
                    loading={targetsLoading}
                    onCardClick={setOpenTarget}
                    practicumPath={practicumPath}
                    onSetTab={setTab}
                    onAddOwn={() => setAddCompanyOpen(true)}
                  />
                </>
              )}
            </>
          )}

          <CompanyTargetDrawer
            target={openTarget}
            open={!!openTarget}
            onClose={() => setOpenTarget(null)}
          />
          <AddOwnCompanyModal
            open={addCompanyOpen}
            onClose={() => setAddCompanyOpen(false)}
          />
        </div>
      </div>
    </>
  );
}

function KanbanOrEmpty({ targets, loading, onCardClick, practicumPath, onSetTab, onAddOwn }) {
  if (loading) {
    return <KanbanSkeleton />;
  }
  if (targets.length === 0) {
    // PR7: Pipeline is now the default tab. A brand-new user with an
    // empty pipeline shouldn't see a blank kanban — lead with the
    // "Find companies" action (the FindCompaniesCard rendered above
    // for self-sourced users covers this for that path), and always
    // offer a Browse jump for users who'd rather explore first.
    //
    // PR-NoIPFix: faculty_assigned users skip the matcher entirely, so
    // their two real next actions are (a) add the company faculty
    // assigned them via "Add my own company" and (b) browse the catalog
    // to explore. Surface BOTH buttons here — Add-my-own used to live
    // only in the header strip above the kanban, easy to miss when the
    // kanban itself is the canvas of attention.
    const isSelfSourced = practicumPath === "self_sourced";
    const headline = isSelfSourced
      ? "Your pipeline is empty."
      : "No companies in your pipeline yet.";
    const subhead = isSelfSourced
      ? "Run Find companies above to populate it with strong matches, or browse the catalog to add companies yourself."
      : "Your faculty will assign you a company - add it here once you have it, or browse the catalog to explore options.";
    return (
      <div className="bg-rd-bg-card border border-rd-border rounded-[14px] p-5 text-center py-8">
        <p className="text-sm font-display font-bold text-rd-text mb-1">{headline}</p>
        <p className="text-xs text-rd-text-secondary mb-4 max-w-md mx-auto leading-relaxed">{subhead}</p>
        <div className="inline-flex flex-wrap items-center justify-center gap-2">
          {!isSelfSourced && onAddOwn && (
            <button
              type="button"
              onClick={onAddOwn}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-display font-bold bg-rd-primary text-white hover:bg-rd-primary-dark transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add my own company
            </button>
          )}
          <button
            type="button"
            onClick={() => onSetTab?.("browse")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-display font-semibold bg-rd-bg-card text-rd-text border border-rd-border hover:bg-rd-bg-soft hover:border-rd-border-hover transition-colors"
          >
            Browse all companies
          </button>
        </div>
      </div>
    );
  }
  return <CompanyTargetsKanban targets={targets} onCardClick={onCardClick} />;
}

function InternshipLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-rd-bg-page font-body text-rd-text">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-2/3 max-w-lg" />
          <Skeleton className="h-3 w-1/2 max-w-md" />
        </div>
        <KanbanSkeleton />
      </div>
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((col) => (
        <div key={col} className="bg-rd-bg-soft rounded-[14px] p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-5 rounded-full" />
          </div>
          {[0, 1].map((card) => (
            <div key={card} className="bg-rd-bg-card rounded-[10px] border border-rd-border p-2.5 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Brain, AlertCircle, RefreshCw, ArrowLeft, ArrowRight, ExternalLink, MapPin, Compass } from "lucide-react";
import { toast } from "sonner";
import GeneratingBanner from "@/components/ui/GeneratingBanner";
import RoleCard from "../components/roadmap/RoleCard";
import TierQuadrantGrid from "../components/roadmap/TierQuadrantGrid";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { inferExperienceLevel, allowedSenioritiesForLevel } from "@/lib/experienceLevel";
import { track, EVENTS } from "@/lib/analytics";
import { TIER_CONFIG, TIER_ORDER, TIERS } from "@/lib/tierConfig";
import { ROADMAP_CSS } from "../components/roadmap/roadmapStyles";

const ROADMAP_MESSAGES = [
  "Searching LinkedIn & Glassdoor for real job postings…",
  "Matching your skills to market requirements…",
  "Calculating skill match scores per role…",
  "Identifying your skill gaps…",
  "Classifying roles into tiers…",
  "Ranking roles by readiness & alignment…",
  "Almost done — finalising your roadmap…",
];

// Trigram similarity threshold for tier-mode job-board search. Matches the
// value used in JobSuggestions.jsx — keep them in sync.
const TIER_SIMILARITY_THRESHOLD = 0.3;
const OVERVIEW_TIER_JOBS_LIMIT = 5;
const OVERVIEW_TIER1_TITLES_PREVIEW = 3;

const TAB_ORDER = ["overview", "why", ...TIER_ORDER];

export default function CareerRoadmap() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();   // eslint-disable-line no-unused-vars
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [generating, setGenerating] = useState(false);

  const tabParam = searchParams.get("tab");
  const activeTab = TAB_ORDER.includes(tabParam) ? tabParam : "overview";
  const setTab = (next) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: false });
  };

  const { data: roles = [], isLoading, isError: rolesError } = useQuery({
    queryKey: ["careerRoles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("career_roles").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: profiles = [], isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("experiences").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: educations = [] } = useQuery({
    queryKey: ["education", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("education").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ["certifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("certifications").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("projects").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const profile = profiles?.[0];
  const stale = isAnalysisStale({ profile, experiences, certifications, projects });

  const tier1 = roles.filter((r) => r.tier === "tier_1");
  const tier2 = roles.filter((r) => r.tier === "tier_2");
  const tier3 = roles.filter((r) => r.tier === "tier_3");
  const byTier = { tier_1: tier1, tier_2: tier2, tier_3: tier3 };

  // Live DB check confirmed (2026-05-20) that no role has ever landed
  // outside tier_1/2/3 across all users — the LLM prompt enforces the
  // enum. We dropped the visible "uncategorized" fallback section and
  // warn here instead, so LLM drift surfaces in dev/QA logs without
  // confusing users.
  useEffect(() => {
    const uncategorized = roles.filter((r) => !TIER_ORDER.includes(r.tier));
    if (uncategorized.length > 0) {
      console.warn("[roadmap] uncategorized roles surfaced — LLM drift?", {
        count: uncategorized.length,
        tiers: [...new Set(uncategorized.map((r) => r.tier))],
      });
    }
  }, [roles]);

  const experienceLevel = inferExperienceLevel(experiences, educations);
  const allowedSeniorities = allowedSenioritiesForLevel(experienceLevel);

  const tier1RoleTitles = tier1.map((r) => r.title).filter(Boolean);
  const { data: tier1Jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["roadmap_tier1_jobs", user?.id, tier1RoleTitles.join("|"), allowedSeniorities.join(",")],
    enabled: !!user?.id && tier1RoleTitles.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("search_jobs_by_role_titles", {
          p_role_titles: tier1RoleTitles,
          p_limit: OVERVIEW_TIER_JOBS_LIMIT,
          p_offset: 0,
          p_similarity_threshold: TIER_SIMILARITY_THRESHOLD,
          p_max_seniority: allowedSeniorities,
        })
        .select("id, title, company_name, location_city, location_raw, is_remote, apply_url, seniority, date_posted");
      if (error) throw error;
      return data || [];
    },
  });

  const handleGenerate = async () => {
    if (!profile) return;
    setGenerating(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      const accessToken = sessionData?.session?.access_token;
      if (sessionError || !accessToken) throw new Error("Session expired. Please log out and log back in.");

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-career-analysis`;
      const response = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ dream_roles: profile?.five_year_role ? [profile.five_year_role] : [] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.msg || `HTTP ${response.status}`);
      if (data?.error) throw new Error(data.error);

      if (data?.roles?.length > 0) {
        const rolesPayload = data.roles.map((r) => ({
          title: r.title,
          tier: r.tier,
          match_score: r.readiness_score,
          readiness_score: r.readiness_score,
          goal_alignment_score: r.goal_alignment_score ?? null,
          matched_skills: r.matched_skills || [],
          missing_skills: r.missing_skills || [],
          skills_gap: r.missing_skills || [],
          alignment_to_goal: r.alignment_to_goal || "",
          alignment_reason: r.alignment_reason || "",
          reasoning: r.reasoning || "",
          action_items: r.action_items || [],
        }));
        const { error: rpcError } = await supabase.rpc("replace_career_roles", {
          p_user_id: user.id,
          p_roles: rolesPayload,
        });
        if (rpcError) throw rpcError;
        track(EVENTS.CAREER_ANALYSIS_REFRESHED, { role_count: rolesPayload.length });

        const { error: persistErr } = await supabase
          .from("profiles")
          .update({
            last_reality_check_date: new Date().toISOString(),
            qualification_level: data?.qualification_level || profile?.qualification_level || "",
            overall_assessment: data?.overall_assessment || profile?.overall_assessment || "",
            skill_gaps: data?.skill_gaps || [],
          })
          .eq("id", user.id);
        if (persistErr) {
          console.error("[career-roadmap] profile persist failed after analysis:", persistErr);
          toast.error("Roles updated but profile didn't fully save — try Refresh again, or contact support.");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["careerRoles"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["roadmap_tier1_jobs"] });
      toast.success("Analysis refreshed.");
    } catch (err) {
      console.error("Roadmap generation error:", err);
      toast.error(`Failed to generate roadmap: ${err.message || "Please try again."}`);
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading || profileLoading) {
    return (
      <>
        <style>{ROADMAP_CSS}</style>
        <div className="roadmap min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#52545A]" />
        </div>
      </>
    );
  }

  if (rolesError || profileError) {
    return (
      <>
        <style>{ROADMAP_CSS}</style>
        <div className="roadmap min-h-screen flex items-center justify-center px-6">
          <div className="rm-banner rm-banner-error flex items-center gap-2 max-w-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load your career roadmap. Refresh the page to try again.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{ROADMAP_CSS}</style>
      <div className="roadmap">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
            <div>
              <p className="rm-eyebrow">Career roadmap</p>
              <h1 className="rm-h1 mt-1.5">Where you stand, where you&apos;re going.</h1>
              <p className="rm-sub">Three tiers of roles tailored to your career goals.</p>
              {profile?.last_reality_check_date && roles.length > 0 && (
                <p className="rm-stamp">
                  Last updated · {new Date(profile.last_reality_check_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </p>
              )}
            </div>
            {profile && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rm-btn rm-btn-primary flex-shrink-0"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Analysing…</>
                ) : roles.length > 0 ? (
                  <><RefreshCw className="w-3.5 h-3.5" />Refresh</>
                ) : (
                  <><Brain className="w-3.5 h-3.5" />Generate roadmap</>
                )}
              </button>
            )}
          </div>

          {generating && (
            <div className="mb-6">
              <GeneratingBanner messages={ROADMAP_MESSAGES} subtitle="Generating your roadmap — this takes ~30–60 seconds" />
            </div>
          )}

          {/* Empty states */}
          {!profile && (
            <div className="rm-card-lg rm-card text-center">
              <Compass className="w-10 h-10 text-[#F87060] mx-auto mb-3" />
              <h2 className="rm-h1" style={{ fontSize: 20 }}>Set up your profile first</h2>
              <p className="rm-sub max-w-md mx-auto">We need your background before we can build your roadmap.</p>
              <Link to={createPageUrl("Profile")} className="rm-btn rm-btn-primary mt-5 inline-flex">
                Add information <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          {roles.length === 0 && profile && (
            <div className="rm-card-lg rm-card text-center">
              <Brain className="w-10 h-10 text-[#F87060] mx-auto mb-3" />
              <h2 className="rm-h1" style={{ fontSize: 20 }}>No roles generated yet</h2>
              <p className="rm-sub max-w-md mx-auto">Hit &quot;Build my roadmap&quot; to analyse your profile and create your tier-classified career map.</p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rm-btn rm-btn-primary mt-5"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Building…</>
                ) : (
                  <><Brain className="w-3.5 h-3.5" />Build my roadmap</>
                )}
              </button>
            </div>
          )}

          {/* Stale banner */}
          {stale && roles.length > 0 && !generating && (
            <div className="rm-banner rm-banner-warning mb-6 flex items-center justify-between gap-4 flex-wrap">
              <p>
                Your profile has changed since this analysis was generated. Refresh to see updated tiers.
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rm-btn rm-btn-sm rm-btn-primary flex-shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh now
              </button>
            </div>
          )}

          {/* Tabs */}
          {roles.length > 0 && (
            <>
              <div className="rm-tabs mb-6" role="tablist" aria-label="Career roadmap sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "overview"}
                  className="rm-tab"
                  onClick={() => setTab("overview")}
                >
                  Overview
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "why"}
                  className="rm-tab"
                  onClick={() => setTab("why")}
                >
                  How tiers work
                </button>
                {TIER_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    className="rm-tab"
                    onClick={() => setTab(id)}
                  >
                    Tier {TIER_CONFIG[id].number}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <OverviewTab
                  profile={profile}
                  tier1={tier1}
                  tier1Jobs={tier1Jobs}
                  jobsLoading={jobsLoading}
                  onJumpToTier1={() => setTab("tier_1")}
                />
              )}
              {activeTab === "why" && <WhyTab />}
              {TIER_ORDER.includes(activeTab) && (
                <TierTab tier={activeTab} roles={byTier[activeTab]} onTabChange={setTab} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ───── Overview tab ─────

function OverviewTab({ profile, tier1, tier1Jobs, jobsLoading, onJumpToTier1 }) {
  const tier1Preview = tier1.slice(0, OVERVIEW_TIER1_TITLES_PREVIEW);
  const tier1Extra = Math.max(0, tier1.length - OVERVIEW_TIER1_TITLES_PREVIEW);

  return (
    <div className="flex flex-col gap-5">
      {/* Qualification level — prominent, leads the page */}
      {profile?.qualification_level && (
        <div className="rm-card">
          <p className="rm-eyebrow mb-2">Qualification level</p>
          <p className="text-base font-semibold text-[#0E1014] leading-snug">
            {profile.qualification_level}
          </p>
        </div>
      )}

      {profile?.overall_assessment && (
        <div className="rm-card">
          <p className="rm-eyebrow mb-2">Assessment</p>
          <p className="text-sm text-[#52545A] leading-relaxed">{profile.overall_assessment}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier 1 preview card — count + top 3 titles, jumps to tier_1 tab */}
        <div className="rm-card rm-tier-green">
          <div className="flex items-center justify-between mb-3">
            <p className="rm-eyebrow">Tier 1 · Sweet spot</p>
            <span className="rm-tier-pill">
              <span className="rm-tier-badge" style={{ width: 16, height: 16, fontSize: 10 }}>1</span>
              {tier1.length}
            </span>
          </div>
          {tier1Preview.length === 0 ? (
            <p className="text-sm text-[#9C9DA1]">No Tier 1 roles surfaced yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm text-[#0E1014]">
              {tier1Preview.map((r) => (
                <li key={r.id} className="truncate">{r.title}</li>
              ))}
            </ul>
          )}
          {tier1.length > 0 && (
            <button
              onClick={onJumpToTier1}
              className="mt-3 text-xs text-[#52545A] hover:text-[#0E1014] underline underline-offset-2"
            >
              {tier1Extra > 0 ? `View all ${tier1.length} →` : "View details →"}
            </button>
          )}
        </div>

        {/* Live Tier 1 job matches from public.jobs */}
        <div className="rm-card">
          <div className="flex items-center justify-between mb-3">
            <p className="rm-eyebrow">Live Tier 1 matches</p>
            <Link
              to={createPageUrl("Jobs")}
              className="text-xs text-[#52545A] hover:text-[#0E1014] underline underline-offset-2"
            >
              View all
            </Link>
          </div>
          {jobsLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#9C9DA1]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading matches…
            </div>
          ) : tier1Jobs.length === 0 ? (
            <p className="text-sm text-[#9C9DA1]">No live matches right now. Check back as new roles are crawled nightly.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {tier1Jobs.map((job) => (
                <li key={job.id}>
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rm-job-row"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="rm-job-row-title truncate">{job.title}</p>
                      <div className="rm-job-row-meta">
                        <span className="truncate">{job.company_name}</span>
                        {(job.location_city || job.is_remote) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.is_remote ? "Remote" : job.location_city}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#9C9DA1] flex-shrink-0 mt-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ───── Why these tiers tab ─────

function WhyTab() {
  return (
    <div className="rm-card rm-card-lg flex flex-col gap-6">
      <div>
        <h2 className="rm-h1" style={{ fontSize: 20 }}>How tiers work</h2>
        <p className="rm-sub mt-2">
          Every role is scored on two axes: <span className="font-semibold text-[#0E1014]">how qualified you are now</span>{" "}
          and <span className="font-semibold text-[#0E1014]">how well it fits the career path you described</span>.
          The combination places each role in one of three tiers.
        </p>
      </div>
      <div className="flex justify-center pt-1">
        <TierQuadrantGrid />
      </div>
      <div className="border-t border-[#E8E8E5] pt-5 flex flex-col gap-3">
        {TIERS.map((tier) => (
          <p key={tier.id} className="text-sm text-[#52545A] leading-relaxed">
            <span className={`rm-tier-${tier.color} inline-flex items-center gap-2 mr-2`}>
              <span className="rm-tier-badge">{tier.number}</span>
              <span className="font-semibold text-[#0E1014]">Tier {tier.number} · {tier.name}</span>
            </span>
            — {tier.description}
          </p>
        ))}
        <p className="text-xs text-[#9C9DA1] mt-2">
          Roles you&apos;re neither qualified for nor on-path for are filtered out of your feed entirely.
        </p>
      </div>
    </div>
  );
}

// ───── Per-tier tab ─────

function TierTab({ tier, roles, onTabChange }) {
  const cfg = TIER_CONFIG[tier];
  const tierIdx = TIER_ORDER.indexOf(tier);
  const prevTier = tierIdx > 0 ? TIER_ORDER[tierIdx - 1] : null;
  const nextTier = tierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[tierIdx + 1] : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Tier header card — restates what the tier means so users can
          re-read the framing without leaving the tab. */}
      <div className={`rm-card rm-tier-${cfg.color} flex items-start gap-3`}>
        <div className="rm-tier-badge mt-0.5">{cfg.number}</div>
        <div>
          <p className="font-semibold text-[#0E1014]">Tier {cfg.number} · {cfg.name}</p>
          <p className="text-sm text-[#52545A] mt-1 leading-relaxed">{cfg.description}</p>
        </div>
      </div>

      {roles.length === 0 ? (
        <div className="rm-card text-center">
          <p className="text-sm text-[#52545A] leading-relaxed">{cfg.emptyCopy}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}

      {/* Arrow nav between tier tabs */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E5]">
        <button
          onClick={() => prevTier && onTabChange(prevTier)}
          disabled={!prevTier}
          className="rm-btn rm-btn-outline rm-btn-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {prevTier ? `Tier ${TIER_CONFIG[prevTier].number}` : "Tier 1"}
        </button>
        <button
          onClick={() => nextTier && onTabChange(nextTier)}
          disabled={!nextTier}
          className="rm-btn rm-btn-outline rm-btn-sm"
        >
          {nextTier ? `Tier ${TIER_CONFIG[nextTier].number}` : "Tier 3"}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

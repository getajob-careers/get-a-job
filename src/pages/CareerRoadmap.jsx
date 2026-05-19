import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Brain, AlertCircle, RefreshCw, ArrowLeft, ArrowRight, ExternalLink, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GeneratingBanner from "@/components/ui/GeneratingBanner";
import RoleCard from "../components/roadmap/RoleCard";
import TierQuadrantGrid from "../components/roadmap/TierQuadrantGrid";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { inferExperienceLevel, allowedSenioritiesForLevel } from "@/lib/experienceLevel";
import { track, EVENTS } from "@/lib/analytics";

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

const TAB_ORDER = ["overview", "why", "tier_1", "tier_2", "tier_3"];

const TIER_CONFIG = {
  tier_1: { label: "Tier 1 — Your Move", color: "text-emerald-700", dot: "bg-emerald-500",
            emptyCopy: "No Tier 1 roles surfaced yet — once your roadmap regenerates, roles you're qualified for AND that fit your career path will land here." },
  tier_2: { label: "Tier 2 — Plan B",    color: "text-amber-700",   dot: "bg-amber-500",
            emptyCopy: "No off-path roles found — your matches are well-aligned with your stated career goals. Tier 2 lists roles you're qualified for that would be detours from your path." },
  tier_3: { label: "Tier 3 — Work Toward", color: "text-indigo-700", dot: "bg-indigo-500",
            emptyCopy: "No work-toward roles surfaced — either every on-path role is already in your reach, or your goals point at roles too far ahead to score meaningfully right now." },
};

export default function CareerRoadmap() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [generating, setGenerating] = useState(false);

  // Resolve the active tab from the URL. Default to overview. Reject unknown
  // values so a stale bookmark to a now-removed tab (e.g. ?tab=learning) lands
  // on the overview instead of a blank page.
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

  // Education feeds inferExperienceLevel via isCurrentlyStudent. Separate
  // table since Phase B (no longer flat columns on profiles).
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
  const uncategorized = roles.filter((r) => !["tier_1", "tier_2", "tier_3"].includes(r.tier));

  // Seniority filter for the Tier 1 live-jobs RPC. Same mapping as
  // JobSuggestions — derived from experiences + education through the
  // shared helper. Prevents a Junior user seeing Senior SWE in their
  // roadmap overview (same bug shape as JobSuggestions).
  const experienceLevel = inferExperienceLevel(experiences, educations);
  const allowedSeniorities = allowedSenioritiesForLevel(experienceLevel);

  // Live Tier 1 job matches from public.jobs — same RPC the JobSuggestions
  // page uses, capped at 5 results for the Overview card.
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
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
      </div>
    );
  }

  if (rolesError || profileError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          Failed to load your career roadmap. Refresh the page to try again.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Persistent header — title, last updated, refresh button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">Career Roadmap</h1>
          <p className="text-sm text-[#A3A3A3] mt-1">
            Roles classified by your current qualification level.
          </p>
          {profile?.last_reality_check_date && roles.length > 0 && (
            <p className="text-xs text-[#A3A3A3] mt-1">
              Last updated: {new Date(profile.last_reality_check_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </p>
          )}
        </div>
        {profile && (
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-[#0A0A0A] hover:bg-[#262626] text-sm"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
            ) : roles.length > 0 ? (
              <><RefreshCw className="w-4 h-4 mr-2" />Refresh Analysis</>
            ) : (
              <><Brain className="w-4 h-4 mr-2" />Generate Roadmap</>
            )}
          </Button>
        )}
      </div>

      {generating && <GeneratingBanner messages={ROADMAP_MESSAGES} subtitle="Generating your roadmap — this takes ~30–60 seconds" />}

      {/* No-profile + no-roles empty states */}
      {!profile && (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 text-center">
          <p className="text-sm text-[#525252] mb-4">
            Set up your profile first to generate a career roadmap.
          </p>
          <Link
            to={createPageUrl("AddInformation")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#262626]"
          >
            Add Information
          </Link>
        </div>
      )}
      {roles.length === 0 && profile && (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 text-center">
          <p className="text-sm text-[#525252]">
            No roles generated yet. Click &quot;Generate Roadmap&quot; to analyze your profile and create your tier-classified career map.
          </p>
        </div>
      )}

      {/* Stale-data banner */}
      {stale && roles.length > 0 && !generating && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            Your profile has changed since this analysis was generated. Refresh to see updated tiers.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Refresh now
          </Button>
        </div>
      )}

      {/* Tabbed content */}
      {roles.length > 0 && (
        <Tabs value={activeTab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full flex h-auto bg-[#F5F5F5] p-1 rounded-lg mb-6 flex-wrap">
            <TabsTrigger value="overview" className="flex-1 min-w-[100px]">Overview</TabsTrigger>
            <TabsTrigger value="why" className="flex-1 min-w-[120px]">Why these tiers</TabsTrigger>
            <TabsTrigger value="tier_1" className="flex-1 min-w-[80px]">Tier 1</TabsTrigger>
            <TabsTrigger value="tier_2" className="flex-1 min-w-[80px]">Tier 2</TabsTrigger>
            <TabsTrigger value="tier_3" className="flex-1 min-w-[80px]">Tier 3</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <OverviewTab
              profile={profile}
              tier1Count={tier1.length}
              tier1Jobs={tier1Jobs}
              jobsLoading={jobsLoading}
            />
          </TabsContent>

          <TabsContent value="why" className="space-y-5">
            <WhyTab />
          </TabsContent>

          <TabsContent value="tier_1" className="space-y-4">
            <TierTab tier="tier_1" roles={tier1} onTabChange={setTab} />
          </TabsContent>
          <TabsContent value="tier_2" className="space-y-4">
            <TierTab tier="tier_2" roles={tier2} onTabChange={setTab} />
          </TabsContent>
          <TabsContent value="tier_3" className="space-y-4">
            <TierTab tier="tier_3" roles={tier3} onTabChange={setTab} />
          </TabsContent>

          {uncategorized.length > 0 && activeTab === "tier_3" && (
            <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
              <h2 className="text-xs uppercase tracking-wider text-[#A3A3A3] font-semibold mb-3">
                Other roles (uncategorized)
              </h2>
              <div className="space-y-3">
                {uncategorized.map((role) => (
                  <RoleCard key={role.id} role={role} />
                ))}
              </div>
            </div>
          )}
        </Tabs>
      )}
    </div>
  );
}

// ───── Overview tab ─────

function OverviewTab({ profile, tier1Count, tier1Jobs, jobsLoading }) {
  return (
    <>
      {profile?.overall_assessment && (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">Assessment</p>
          <p className="text-sm text-[#525252] leading-relaxed">{profile.overall_assessment}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-3">Qualification Level</p>
          <p className="text-sm text-[#0A0A0A] font-medium leading-snug">
            {profile?.qualification_level || "Not yet determined"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-3">Tier 1 Roles</p>
          <p className="text-2xl font-bold text-[#0A0A0A] tabular-nums">{tier1Count}</p>
          <p className="text-xs text-[#A3A3A3] mt-1">roles you&apos;re ready for now</p>
        </div>
      </div>

      {/* Live Tier 1 job matches from public.jobs */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Live Tier 1 matches</p>
          <Link
            to={createPageUrl("JobSuggestions")}
            className="text-xs text-[#525252] hover:text-[#0A0A0A] underline underline-offset-2"
          >
            View all
          </Link>
        </div>
        {jobsLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#A3A3A3]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading matches…
          </div>
        ) : tier1Jobs.length === 0 ? (
          <p className="text-sm text-[#A3A3A3]">No live matches found right now. Check back as new roles are crawled nightly.</p>
        ) : (
          <ul className="space-y-2">
            {tier1Jobs.map((job) => (
              <li key={job.id}>
                <a
                  href={job.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-[#FAFAFA] border border-transparent hover:border-[#E5E5E5] transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">{job.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[#A3A3A3] flex-wrap">
                      <span className="truncate">{job.company_name}</span>
                      {(job.location_city || job.is_remote) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.is_remote ? "Remote" : job.location_city}
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#A3A3A3] flex-shrink-0 mt-0.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// ───── Why these tiers tab ─────

function WhyTab() {
  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-5">
      <div>
        <h2 className="text-base font-bold text-[#0A0A0A] tracking-tight">Why these tiers</h2>
        <p className="text-sm text-[#525252] mt-2 leading-relaxed">
          Every role is scored on two axes: <span className="font-semibold">how qualified you are now</span>, and{" "}
          <span className="font-semibold">how well it fits the career path you described in onboarding</span>.
          Those two scores combine into three tiers — each represents a different strategic move.
        </p>
      </div>
      <div className="flex justify-center pt-2">
        <TierQuadrantGrid />
      </div>
      <div className="pt-3 border-t border-[#F0F0F0] space-y-2 text-sm text-[#525252] leading-relaxed">
        <p>
          <span className="font-semibold text-emerald-700">Tier 1 (your sweet spot):</span>{" "}
          you&apos;re qualified AND the role moves you toward your stated goals. Apply here first.
        </p>
        <p>
          <span className="font-semibold text-amber-700">Tier 3 (your next role):</span>{" "}
          on your path but you&apos;re not quite ready yet. Use these to plan skill-building.
        </p>
        <p>
          <span className="font-semibold text-[#525252]">Tier 2 (a detour):</span>{" "}
          you&apos;re qualified, but the role takes you off your stated career direction.
          Useful as a fallback or short-term pay-the-bills option.
        </p>
        <p className="text-xs text-[#A3A3A3] mt-3">
          Roles you&apos;re neither qualified for nor on-path for are filtered out of your feed entirely.
        </p>
      </div>
    </div>
  );
}

// ───── Per-tier tab ─────

function TierTab({ tier, roles, onTabChange }) {
  const cfg = TIER_CONFIG[tier];
  const currentIdx = TAB_ORDER.indexOf(tier);
  // Tier nav is internal to the tier-tabs subset — overview and why are
  // skipped. The arrows cycle through tier_1 → tier_2 → tier_3.
  const tierTabs = ["tier_1", "tier_2", "tier_3"];
  const tierIdx = tierTabs.indexOf(tier);
  const prevTier = tierIdx > 0 ? tierTabs[tierIdx - 1] : null;
  const nextTier = tierIdx < tierTabs.length - 1 ? tierTabs[tierIdx + 1] : null;
  // The currentIdx is referenced for tab-context only — kept around in case
  // we want overall-tab arrows in the future.
  void currentIdx;

  return (
    <>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <h2 className={`text-sm uppercase tracking-wider font-semibold ${cfg.color}`}>{cfg.label}</h2>
      </div>

      {roles.length === 0 ? (
        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-6">
          <p className="text-sm text-[#525252] leading-relaxed">{cfg.emptyCopy}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}

      {/* Arrow nav between tier tabs */}
      <div className="flex items-center justify-between pt-4 border-t border-[#F0F0F0]">
        <Button
          onClick={() => prevTier && onTabChange(prevTier)}
          disabled={!prevTier}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          {prevTier ? `Tier ${prevTier.slice(-1)}` : "Tier 1"}
        </Button>
        <Button
          onClick={() => nextTier && onTabChange(nextTier)}
          disabled={!nextTier}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5"
        >
          {nextTier ? `Tier ${nextTier.slice(-1)}` : "Tier 3"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, Loader2, CheckCircle2, XCircle, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SkillGapCourses from "../components/dashboard/SkillGapCourses";
import JobMatchChecker from "../components/dashboard/JobMatchChecker";
import DailyActionCard from "../components/dashboard/DailyActionCard";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { pickPrimaryEducation } from "@/lib/educationPolicy";

export default function Home() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetError, setResetError] = useState(null);

  const { data: profiles = [], isLoading: loadingProfile, isFetched: profileFetched, isError: profileError } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      // Nested select pulls education in the same round trip — Phase B
      // moved education off profiles flat columns. We pick the primary
      // row client-side via pickPrimaryEducation.
      const { data, error } = await supabase
        .from("profiles")
        .select("*, education(*)")
        .eq("id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: roles = [], isLoading: loadingRoles, isError: rolesError } = useQuery({
    queryKey: ["careerRoles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("career_roles").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: applications = [], isLoading: loadingApps, isError: appsError } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("applications").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("experiences").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ["certifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("certifications").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const profile = profiles?.[0] || null;
  const primaryEdu = pickPrimaryEducation(profile?.education || []);
  const stale = isAnalysisStale({ profile, experiences, certifications, projects });
  const isLoading = loadingProfile || loadingRoles || loadingApps;

  // Defensive guard for the Skills — Confirmed vs Missing card. The card
  // can fall into one of three "no data" states and we want each to look
  // distinct rather than collapsing them into "Generate your roadmap":
  //   1. Never had roles → "Generate your roadmap..." (existing copy)
  //   2. Had roles before but careerRoles is now empty → "Refreshing skill
  //      analysis…" (covers brief refetch windows, intentional resets that
  //      haven't completed re-onboarding yet, etc.)
  //   3. tier1Role exists but its matched_skills + missing_skills are both
  //      empty (chat agent added a role without skills, falling to the
  //      Path C branch in handleApplyRoadmapChanges) → "Skills computing —
  //      click Refresh Analysis…" pointing at the recovery action.
  React.useEffect(() => {
    if (roles.length > 0 && user?.id) {
      try { localStorage.setItem(`careerRoles:${user.id}:hadData`, "1"); } catch { /* localStorage unavailable */ }
    }
  }, [roles.length, user?.id]);

  const hadRolesPreviously = (() => {
    if (!user?.id || typeof window === "undefined") return false;
    try { return localStorage.getItem(`careerRoles:${user.id}:hadData`) === "1"; } catch { return false; }
  })();

  React.useEffect(() => {
    if (!user || !profileFetched) return;
    // Redirect-on-error: if the profile query failed, we don't actually
    // know whether the user has completed onboarding or not. Sending them
    // to Onboarding is safer than leaving them stuck on Home — Onboarding
    // has its own profile check that handles all three states (no row /
    // incomplete / complete) and bounces back here if they're done.
    //
    // Previously this guard early-returned on ANY error, which masked
    // structural problems like the PostgREST FK-resolution bug shipped in
    // PR-2: new signups had no profile row, the query threw, and the user
    // got stuck on Home with no indication anything was wrong. The new
    // behaviour fails open to Onboarding instead of failing silent.
    if (profileError) {
      console.error("[Home] profile query failed — redirecting to Onboarding as fallback");
      navigate(createPageUrl("Onboarding"));
      return;
    }
    if (profiles?.length === 0) {
      navigate(createPageUrl("Onboarding"));
    } else if (profile && !profile.onboarding_complete) {
      navigate(createPageUrl("Onboarding"));
    }
  }, [user, profileFetched, profileError, profile, profiles, navigate]);

  // Self-heal: if the user reached onboarding_complete but the career-analysis
  // persist silently failed (qualification_level + last_reality_check_date
  // both null is the unambiguous shape — Onboarding.jsx writes both
  // together at line ~432), trigger a one-shot background re-run. This
  // shape should never exist for a properly onboarded user, so a guard
  // check is enough — no risk of triggering on legitimate states. Single
  // call per Home mount via useRef; if it fails the next mount can retry.
  // Subject to the generate-career-analysis 5/hour rate limit, but a user
  // hitting that limit on a self-heal has bigger issues.
  const [selfHealing, setSelfHealing] = useState(false);
  const [selfHealError, setSelfHealError] = useState(null);
  const [selfHealRetryNonce, setSelfHealRetryNonce] = useState(0);
  const selfHealRanRef = useRef(false);
  React.useEffect(() => {
    if (!user?.id || !profile) return;
    if (selfHealRanRef.current) return;
    if (!profile.onboarding_complete) return;
    if (profile.qualification_level || profile.last_reality_check_date) return;
    selfHealRanRef.current = true;
    setSelfHealing(true);
    setSelfHealError(null);

    // 45s ceiling: if the analysis hasn't returned by then, surface a retry
    // affordance rather than spinning forever.
    const timeoutId = setTimeout(() => {
      setSelfHealing(false);
      setSelfHealError("Analysis is taking longer than expected.");
    }, 45000);

    (async () => {
      try {
        console.log("[home self-heal] running career analysis for", user.id);
        const { data, error } = await supabase.functions.invoke("generate-career-analysis", {
          body: { dream_roles: [] },
        });
        if (error || !data?.qualification_level) {
          console.warn("[home self-heal] career analysis returned no data:", error || "(null qualification_level)");
          clearTimeout(timeoutId);
          setSelfHealing(false);
          setSelfHealError("Couldn't run your analysis.");
          return;
        }
        const { error: persistErr } = await supabase.from("profiles").update({
          qualification_level: data.qualification_level,
          overall_assessment: data.overall_assessment || null,
          skill_gaps: data.skill_gaps || [],
          last_reality_check_date: new Date().toISOString(),
        }).eq("id", user.id);
        if (persistErr) {
          console.warn("[home self-heal] persist failed:", persistErr);
          clearTimeout(timeoutId);
          setSelfHealing(false);
          setSelfHealError("Couldn't save your analysis.");
          return;
        }
        console.log("[home self-heal] success — qualification_level:", data.qualification_level);
        clearTimeout(timeoutId);
        setSelfHealing(false);
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        queryClient.invalidateQueries({ queryKey: ["careerRoles"] });
      } catch (err) {
        console.warn("[home self-heal] exception:", err);
        clearTimeout(timeoutId);
        setSelfHealing(false);
        setSelfHealError("Unexpected error during analysis.");
      }
    })();

    return () => clearTimeout(timeoutId);
  }, [user?.id, profile, queryClient, selfHealRetryNonce]);

  const handleSelfHealRetry = () => {
    selfHealRanRef.current = false;
    setSelfHealError(null);
    setSelfHealRetryNonce((n) => n + 1);
  };

  // Render-gate: hide the dashboard during any state where a redirect to
  // Onboarding is about to fire. Without this, the dashboard renders for one
  // frame between profileFetched=true and navigate() actually changing the
  // route — visible as a flash of empty cards for new signups.
  const willRedirect =
    profileError ||
    (profileFetched && profiles?.length === 0) ||
    (profile && !profile.onboarding_complete);

  if (isLoading || willRedirect) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[#A3A3A3]" />
      </div>
    );
  }

  const tier1Role = roles.find((r) => r.tier === "tier_1");
  const matchedSkills = tier1Role?.matched_skills || [];
  const missingSkills = tier1Role?.missing_skills || [];
  const skillGaps = Array.isArray(profile?.skill_gaps) ? profile.skill_gaps : [];
  const pendingTasks = tasks.filter((t) => !t.is_complete);
  const activeApps = applications.filter((a) => !["rejected", "withdrawn", "offer", "accepted"].includes(a.status));
  const score = tier1Role?.readiness_score ?? (tier1Role?.match_percentage != null ? tier1Role.match_percentage / 100 : null);

  const handleResetOnboarding = async () => {
    if (!profile?.id) return;
    if (!resetConfirming) {
      setResetConfirming(true);
      return;
    }
    setResetConfirming(false);
    setResetError(null);
    // Clear the "had roles" flag so the post-reset UI doesn't show
    // "Refreshing skill analysis…" forever when the user genuinely
    // intends to start over.
    if (user?.id) {
      try { localStorage.removeItem(`careerRoles:${user.id}:hadData`); } catch { /* ignore */ }
    }
    const { error: rpcError } = await supabase.rpc("reset_user_data", {
      p_user_id: user.id,
    });
    if (rpcError) {
      console.error("Failed to reset user data:", rpcError);
      setResetError("Reset failed. Please try again.");
      return;
    }
    queryClient.removeQueries({ queryKey: ["userProfile"] });
    queryClient.removeQueries({ queryKey: ["careerRoles"] });
    queryClient.removeQueries({ queryKey: ["tasks"] });
    queryClient.removeQueries({ queryKey: ["applications"] });
    queryClient.removeQueries({ queryKey: ["experiences"] });
    queryClient.removeQueries({ queryKey: ["projects"] });
    queryClient.removeQueries({ queryKey: ["certifications"] });
    queryClient.removeQueries({ queryKey: ["jobSuggestions"] });
    navigate(createPageUrl("Onboarding"));
  };

  return (
    <motion.div
      className="max-w-4xl mx-auto px-6 py-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {resetError && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {resetError}
        </div>
      )}
      {/* Data load error banner */}
      {(rolesError || appsError) && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Some data failed to load. Refresh the page to try again.
        </div>
      )}

      {/* Daily Action Card — top of dashboard, one action per day */}
      <DailyActionCard />

      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#A3A3A3] font-medium mb-1">Career Operating System</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Where do I stand?
          </h1>
          {profile?.last_reality_check_date && (
            <p className="text-xs text-[#A3A3A3] mt-1">
              Last analysis: {new Date(profile.last_reality_check_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              {stale && (
                <>
                  {" · "}
                  <Link to={createPageUrl("CareerRoadmap")} className="text-amber-700 underline hover:text-amber-800">
                    Profile updated — refresh roadmap
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
        {resetConfirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 font-medium">This deletes all your data.</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetOnboarding}
              className="gap-1.5 bg-red-600 hover:bg-red-700"
            >
              <RotateCcw className="w-3 h-3" />
              Confirm Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetOnboarding}
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Onboarding
          </Button>
        )}
      </div>

      {/* Overall Assessment */}
      {profile?.overall_assessment ? (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 mb-5">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">Assessment</p>
          <p className="text-sm text-[#525252] leading-relaxed">{profile.overall_assessment}</p>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-5">
          <p className="text-sm font-medium text-amber-800">No roadmap generated yet.</p>
          <p className="text-xs text-amber-700 mt-1">Go to Career Roadmap → Generate Roadmap to get your qualification assessment.</p>
        </div>
      ) : null}

      {/* Reality Check Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

        {/* Qualification Level */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-3">Qualification Level</p>
          {profile?.qualification_level ? (
            <p className="text-sm text-[#0A0A0A] font-medium leading-snug">{profile.qualification_level}</p>
          ) : selfHealing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A3A3A3]" />
              <p className="text-sm text-[#A3A3A3]">Analysing your profile…</p>
            </div>
          ) : selfHealError ? (
            <div>
              <p className="text-sm text-[#A3A3A3]">{selfHealError}</p>
              <button
                onClick={handleSelfHealRetry}
                className="mt-2 text-xs font-medium text-[#0A0A0A] underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#A3A3A3]">Not yet determined</p>
          )}
          {primaryEdu?.field_of_study && (
            <p className="text-xs text-[#A3A3A3] mt-2">
              {primaryEdu.education_level?.replaceAll("_", " ")} · {primaryEdu.field_of_study}
            </p>
          )}
        </div>

        {/* Closest Tier 1 Role */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-3">Closest Tier 1 Role</p>
          {tier1Role ? (
            <>
              <p className="text-sm font-semibold text-[#0A0A0A]">{tier1Role.title}</p>
              {score !== null && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${score >= 0.45 ? "bg-emerald-500" : score >= 0.25 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${Math.round(score * 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${score >= 0.45 ? "text-emerald-600" : score >= 0.25 ? "text-amber-600" : "text-red-500"}`}>
                    {Math.round(score * 100)}%
                  </span>
                </div>
              )}
              {tier1Role.alignment_to_goal && (
                <p className="text-xs text-[#A3A3A3] mt-2 leading-relaxed">{tier1Role.alignment_to_goal}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#A3A3A3]">No Tier 1 roles yet</p>
          )}
        </div>

        {/* Skills: Confirmed vs Missing */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-3">
            Skills — Confirmed vs Missing
          </p>
          {tier1Role ? (
            (matchedSkills.length === 0 && missingSkills.length === 0) ? (
              <p className="text-sm text-[#A3A3A3]">
                Skills computing — open Career Roadmap and click Refresh Analysis to populate this role's skill breakdown.
              </p>
            ) : (
            <div className="space-y-3">
              {matchedSkills.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-1.5">Confirmed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {matchedSkills.slice(0, 6).map((s, i) => (
                      <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {missingSkills.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-red-500 font-semibold mb-1.5">Missing</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.slice(0, 6).map((s, i) => (
                      <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-red-50 text-red-600 rounded-md">
                        <XCircle className="w-3 h-3" /> {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )
          ) : hadRolesPreviously ? (
            <p className="text-sm text-[#A3A3A3]">Refreshing skill analysis…</p>
          ) : (
            <p className="text-sm text-[#A3A3A3]">Generate your roadmap to see skill analysis.</p>
          )}
        </div>

        {/* Execution Status */}
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-3">Execution Status</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#525252]">Active Applications</span>
              <span className="text-sm font-semibold text-[#0A0A0A]">{activeApps.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#525252]">Pending Tasks</span>
              <span className={`text-sm font-semibold ${pendingTasks.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {pendingTasks.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#525252]">Skill Gaps Identified</span>
              <span className={`text-sm font-semibold ${skillGaps.length > 0 ? "text-red-500" : "text-emerald-600"}`}>
                {skillGaps.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#525252]">5-Year Target</span>
              <span className="text-xs text-[#525252] text-right max-w-[140px] truncate">
                {profile?.five_year_role || "Not set"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Gaps */}
      {skillGaps.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">Identified Skill Gaps</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {skillGaps.map((gap, i) => (
              <span key={i} className="text-xs px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg">
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Job Match Checker */}
      <JobMatchChecker />

      {/* Course Recommendations */}
      {skillGaps.length > 0 && <SkillGapCourses skillGaps={skillGaps} />}

      {skillGaps.length > 0 && <div className="h-5" />}

      {/* Next Action */}
      {pendingTasks.length > 0 && (
        <div className="bg-[#0A0A0A] rounded-xl p-5 mb-6">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">Next Assigned Action</p>
          <p className="text-sm text-white font-medium">{pendingTasks[0].title}</p>
          {pendingTasks[0].description && (
            <p className="text-xs text-[#A3A3A3] mt-1 leading-relaxed">{pendingTasks[0].description}</p>
          )}
          <Link to={createPageUrl("Tasks")} className="inline-flex items-center gap-1 text-xs text-[#A3A3A3] hover:text-white mt-3 transition-colors">
            View all tasks <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Career Roadmap", page: "CareerRoadmap", desc: "Tier-classified roles with reasoning" },
          { label: "AI Career Agent", page: "CareerAgent", desc: "Get evidence-based guidance" },
          { label: "Application Tracker", page: "Tracker", desc: "7-step disciplined application flow" },
        ].map((link) => (
          <Link
            key={link.page}
            to={createPageUrl(link.page)}
            className="bg-white rounded-xl border border-[#E5E5E5] p-4 hover:border-[#D4D4D4] transition-colors group"
          >
            <p className="text-sm font-semibold text-[#0A0A0A]">{link.label}</p>
            <p className="text-xs text-[#A3A3A3] mt-1">{link.desc}</p>
            <ArrowRight className="w-4 h-4 text-[#A3A3A3] mt-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
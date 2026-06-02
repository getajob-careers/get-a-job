/*
 * Home.jsx — authenticated dashboard.
 *
 * Restyled for PR 3B on rd tokens. The page renders on the warm cream
 * page background (provided by Layout) with RdCard surfaces, Rokkitt
 * display type, and coral accents. The bento layout collapses to a
 * 2-col then 1-col grid on narrower viewports.
 *
 * Behaviour PRESERVED 1:1 from the prior Direction-3 Home (see PR 3B
 * spec): the self-heal useEffect (single-fire, force:true, 45s, persist
 * + invalidateAfterCareerAnalysis), the redirect-to-Onboarding guard,
 * the daily-action query (staleTime 30m + retry:false), withDbTimeout
 * wrappers on profile/roles/applications, the inline-titles non-
 * waterfall on the new_jobs_home query, the memoised activeApps /
 * recentApps before the early returns (hook-order stability), all 6
 * card destinations, pickHeadline thresholds, and the hadRolesPreviously
 * localStorage write are all carried over verbatim.
 *
 * NEW IN 3B — a single additional query "liveMatches" that counts
 * uncapped active IL jobs trigram-matching the user's Track-1 role
 * titles via the new count_active_jobs_by_role_titles RPC. Surfaced as
 * the standout number in the hero, linking to /Jobs. Zero-state when
 * the user has no Track-1 roles renders as "Matches incoming" — never
 * an error.
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { invalidateAfterCareerAnalysis } from "@/lib/invalidateAfterCareerAnalysis";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowUpRight, ArrowRight, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RdCard from "@/components/redesign/RdCard";
import RdButton from "@/components/redesign/RdButton";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { withDbTimeout } from "@/lib/withDbTimeout";

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const ROLLING_7D_MS = 7 * 24 * 60 * 60 * 1000;

// Headline rule ladder — picks the most-load-bearing statement about
// the user's current job-hunt state. Active applications are the strongest
// signal (already in motion); Track 1 roles next; goal/roadmap state last;
// fall back to a plain greeting if nothing else qualifies.
// Thresholds preserved: ≥5 active apps · ≥3 T1 · ≥1 T1 · 0 roles · default.
function pickHeadline({ profile, roles, applications }) {
  const firstName = (profile?.full_name || "").split(" ")[0] || "there";
  const activeApps = applications.filter(
    (a) => !["rejected", "withdrawn", "offer", "accepted"].includes(a.status),
  );
  const track1Roles = roles.filter((r) => r.track === "track_1");

  if (activeApps.length >= 5) {
    return (
      <>
        You have{" "}
        <span className="text-rd-coral">{activeApps.length} applications</span>{" "}
        in motion.
      </>
    );
  }
  if (track1Roles.length >= 3) {
    return (
      <>
        You have{" "}
        <span className="text-rd-coral">{track1Roles.length} Track&nbsp;1 roles</span>{" "}
        ready to apply to.
      </>
    );
  }
  if (track1Roles.length >= 1) {
    return (
      <>
        Your strongest fit is{" "}
        <span className="text-rd-coral">{track1Roles[0].title}</span>.
      </>
    );
  }
  if (roles.length === 0) {
    return (
      <>
        Generate your{" "}
        <span className="text-rd-coral">career roadmap</span>{" "}
        to see your first roles.
      </>
    );
  }
  return (
    <>
      Welcome back, <span className="text-rd-coral">{firstName}</span>.
    </>
  );
}

function statusBadgeStyle(status) {
  const s = (status || "").toLowerCase();
  if (s === "offer" || s === "accepted") {
    return "bg-rd-teal-tint text-rd-teal-dark";
  }
  if (s === "interviewing" || s === "preparing") {
    return "bg-rd-golden-tint text-rd-golden-dark";
  }
  if (s === "rejected" || s === "withdrawn") {
    return "bg-[#FEE2E2] text-[#991B1B]";
  }
  return "bg-rd-bg-soft text-rd-text-secondary";
}

// ────────────────────────────────────────────────────────────────────────
// Card components — each one is a clickable launchpad
// ────────────────────────────────────────────────────────────────────────

function HomeCard({ to, dark = false, className = "", children, onClick = null }) {
  const navigate = useNavigate();
  const handle = (e) => {
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }
    if (to) navigate(to);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handle(e);
        }
      }}
      className={[
        "group cursor-pointer flex flex-col gap-2.5 rounded-[18px] border p-6",
        "transition-[transform,border-color,box-shadow] duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2",
        "hover:-translate-y-0.5",
        dark
          ? "bg-rd-text text-white border-rd-text hover:border-rd-coral hover:shadow-[0_14px_32px_rgba(40,25,10,0.18)]"
          : "bg-rd-bg-card text-rd-text border-rd-border hover:border-rd-border-hover hover:shadow-rd",
        className || "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function CardEyebrow({ children, dark = false, stat = null }) {
  return (
    <div
      className={[
        "flex items-center gap-2 text-[10.5px] uppercase tracking-[0.09em] font-medium font-mono",
        dark ? "text-rd-coral" : "text-rd-text-eyebrow",
      ].join(" ")}
    >
      <span>{children}</span>
      {stat && (
        <span
          className={[
            "text-[11px] tracking-normal font-mono normal-case",
            dark ? "text-white/55" : "text-rd-text-secondary",
          ].join(" ")}
        >
          {stat}
        </span>
      )}
    </div>
  );
}

function CardArrow({ dark = false }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "ml-auto self-end inline-flex items-center justify-center w-7 h-7 rounded-full",
        "transition-[background-color,color,transform] duration-150",
        "group-hover:bg-rd-coral group-hover:text-white group-hover:translate-x-0.5",
        dark
          ? "bg-white/10 text-white/70"
          : "bg-rd-bg-soft text-rd-text-secondary",
      ].join(" ")}
    >
      <ArrowUpRight className="w-3.5 h-3.5" />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Root component
// ────────────────────────────────────────────────────────────────────────

export default function Home() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Canonical profile cache — shared across the app. Returns the full
  // row as a single object (or null when no row exists).
  const { data: profile, isLoading: loadingProfile, isFetched: profileFetched, isError: profileError } = useProfileQuery(user?.id);

  // Direct DB queries get wrapped in withDbTimeout (30s) — guards
  // against a hung Supabase REST call leaving Home stuck on the skeleton
  // indefinitely. Profile + roles + applications gate `isLoading`; if any
  // of them hangs, the user can't escape the skeleton. The wrapper
  // surfaces hung queries as normal React Query errors at 30s instead
  // of an infinite wait. Edge function invocations (daily_action) are
  // NOT wrapped — they legitimately run 40s+ in some paths.
  const { data: roles = [], isLoading: loadingRoles, isError: rolesError } = useQuery({
    queryKey: ["careerRoles", user?.id],
    queryFn: withDbTimeout(async () => {
      const { data, error } = await supabase.from("career_roles").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    }, "career_roles"),
    enabled: !!user?.id,
  });

  const { data: applications = [], isLoading: loadingApps, isError: appsError } = useQuery({
    queryKey: ["applications", user?.id],
    queryFn: withDbTimeout(async () => {
      const { data, error } = await supabase.from("applications").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    }, "applications"),
    enabled: !!user?.id,
  });

  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: certifications = [] } = useQuery({
    queryKey: ["certifications", user?.id],
    queryFn: async () => (await supabase.from("certifications").select("*").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => (await supabase.from("projects").select("*").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["stories", user?.id],
    queryFn: async () => (await supabase.from("stories").select("id, created_at").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
  });

  // LinkedIn last-post + optimization status.
  const { data: linkedinPosts = [] } = useQuery({
    queryKey: ["linkedin_posts_home", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("linkedin_posts")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return data || [];
    },
    enabled: !!user?.id,
  });
  const { data: linkedinOpts = [] } = useQuery({
    queryKey: ["linkedin_opts_home", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("linkedin_optimizations")
        .select("baseline_data")
        .eq("user_id", user.id)
        .limit(1);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Daily action — lazy-fetches via the edge function (UPSERTs today's
  // row idempotent per (user_id, for_date)). Preserved: staleTime 30m,
  // retry: false, function-invoke (NOT withDbTimeout — edge fns legitimately
  // run 40s+).
  const { data: dailyAction } = useQuery({
    queryKey: ["daily_action_home", user?.id, new Date().toDateString()],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-daily-action", { body: {} });
      if (error) return null;
      return data?.daily_action || null;
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  // Track-1-matching new jobs in the rolling 7d window. Preserved verbatim
  // including the inline-titles non-waterfall (fetch the narrow title
  // select inline so this query fires in parallel with `roles` on user.id
  // resolution, not gated on the full roles cache).
  const { data: newJobs = [] } = useQuery({
    queryKey: ["new_jobs_home", user?.id],
    queryFn: async () => {
      const { data: rolesData } = await supabase
        .from("career_roles")
        .select("title")
        .eq("user_id", user.id)
        .eq("track", "track_1");
      const titles = (rolesData || []).map((r) => r.title).filter(Boolean);
      if (titles.length === 0) return [];
      const { data } = await supabase.rpc("search_jobs_by_role_titles", {
        p_role_titles: titles,
        p_limit: 20,
        p_offset: 0,
        p_similarity_threshold: 0.3,
      });
      if (!Array.isArray(data)) return [];
      const cutoff = Date.now() - ROLLING_7D_MS;
      return data.filter((j) => j.date_posted && new Date(j.date_posted).getTime() >= cutoff);
    },
    enabled: !!user?.id,
  });

  // NEW (PR 3B) — uncapped count of active IL jobs trigram-matching the
  // user's Track-1 role titles. Fires in parallel with all the others;
  // gated on !!user?.id like the rest. Same inline-titles pattern as
  // new_jobs_home so it doesn't waterfall behind the `roles` query.
  //
  // Zero-state when the user has no Track-1 roles → returns null (NOT
  // zero), so the hero can render "Matches incoming" instead of "0 live
  // job matches". 5-minute staleTime to keep the hero stable across
  // intra-session navigation; refetches on user.id change.
  const { data: liveMatchCount = null } = useQuery({
    queryKey: ["live_matches_home", user?.id],
    queryFn: async () => {
      const { data: rolesData, error: titleErr } = await supabase
        .from("career_roles")
        .select("title")
        .eq("user_id", user.id)
        .eq("track", "track_1");
      if (titleErr) return null;
      const titles = (rolesData || []).map((r) => r.title).filter(Boolean);
      if (titles.length === 0) return null;
      // RPC name not yet in generated types/database.types.ts — cast to
      // any so the typecheck doesn't have to be regenerated for this PR.
      // Regenerating types happens via `supabase gen types` and lives in
      // a separate cleanup pass.
      const { data, error } = await /** @type {any} */ (supabase).rpc("count_active_jobs_by_role_titles", {
        p_role_titles: titles,
        p_similarity_threshold: 0.3,
      });
      if (error) return null;
      // RPC returns an integer scalar; supabase-js sometimes wraps in an
      // array depending on REST shape — accept both.
      const n = Array.isArray(data) ? data[0] : data;
      return typeof n === "number" ? n : null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const stale = isAnalysisStale({ profile, experiences, certifications, projects });
  const isLoading = loadingProfile || loadingRoles || loadingApps;

  // hadRolesPreviously — preserved from pre-redesign for empty-state copy.
  useEffect(() => {
    if (roles.length > 0 && user?.id) {
      try { localStorage.setItem(`careerRoles:${user.id}:hadData`, "1"); } catch { /* localStorage unavailable */ }
    }
  }, [roles.length, user?.id]);

  // Redirect-to-Onboarding — preserved verbatim. Fails open to Onboarding
  // on profile-query errors rather than leaving users stuck on Home.
  useEffect(() => {
    if (!user || !profileFetched) return;
    if (profileError) {
      console.error("[Home] profile query failed — redirecting to Onboarding as fallback");
      navigate(createPageUrl("Onboarding"));
      return;
    }
    if (profileFetched && !profile) {
      navigate(createPageUrl("Onboarding"));
    } else if (profile && !profile.onboarding_complete) {
      navigate(createPageUrl("Onboarding"));
    }
  }, [user, profileFetched, profileError, profile, navigate]);

  // Self-heal — PRESERVED VERBATIM (single-fire, force:true, 45s timeout,
  // persist + invalidateAfterCareerAnalysis). The only behavioural touch in
  // PR 3B is allowing a `?preview-selfheal=1` URL flag to put the page into
  // the self-heal-pending visual state for capture in the preview PDF — it
  // does not invoke the edge function and is DEV-only (URL flags are not
  // gated in prod but the absence of the flag makes them inert).
  const previewSelfHealFlag = (() => {
    try { return new URLSearchParams(window.location.search).get("preview-selfheal") === "1"; }
    catch { return false; }
  })();
  const [selfHealing, setSelfHealing] = useState(previewSelfHealFlag);
  const [, setSelfHealError] = useState(null);
  const [selfHealRetryNonce] = useState(0);
  const selfHealRanRef = useRef(false);
  useEffect(() => {
    if (!user?.id || !profile) return;
    if (selfHealRanRef.current) return;
    if (!profile.onboarding_complete) return;
    if (profile.qualification_level || profile.last_reality_check_date) return;
    selfHealRanRef.current = true;
    setSelfHealing(true);
    setSelfHealError(null);

    const timeoutId = setTimeout(() => {
      setSelfHealing(false);
      setSelfHealError("Analysis is taking longer than expected.");
    }, 45000);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-career-analysis", {
          body: { dream_roles: [], force: true },
        });
        if (error || !data?.qualification_level) {
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
          clearTimeout(timeoutId);
          setSelfHealing(false);
          setSelfHealError("Couldn't save your analysis.");
          return;
        }
        clearTimeout(timeoutId);
        setSelfHealing(false);
        await invalidateAfterCareerAnalysis(queryClient, user.id);
      } catch {
        clearTimeout(timeoutId);
        setSelfHealing(false);
        setSelfHealError("Unexpected error during analysis.");
      }
    })();

    return () => clearTimeout(timeoutId);
  }, [user?.id, profile, queryClient, selfHealRetryNonce]);

  const willRedirect =
    profileError ||
    (profileFetched && !profile) ||
    (profile && !profile.onboarding_complete);

  // Memoised before the early returns so the hook order stays stable.
  // PRESERVED: filter+sort runs once per applications change rather than
  // on every parent re-render.
  const activeApps = useMemo(
    () => applications.filter((a) => !["rejected", "withdrawn", "offer", "accepted"].includes(a.status)),
    [applications],
  );
  const recentApps = useMemo(
    () => [...applications]
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 3),
    [applications],
  );

  if (willRedirect) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-rd-text-secondary" />
      </div>
    );
  }
  if (isLoading) {
    return <HomeSkeleton />;
  }

  const track1Count = roles.filter((r) => r.track === "track_1").length;
  const track2Count = roles.filter((r) => r.track === "track_2").length;
  const track3Count = roles.filter((r) => r.track === "track_3").length;

  const storiesCount = stories.length;
  const storiesThisWeek = stories.filter((s) => new Date(s.created_at).getTime() >= Date.now() - ROLLING_7D_MS).length;

  const lastPostAt = linkedinPosts[0]?.created_at ? new Date(linkedinPosts[0].created_at) : null;
  // baseline_data is typed as Json in the generated types; cast the row
  // to read the nested .profile flag.
  const hasLinkedinBaseline = /** @type {any} */ (linkedinOpts[0]?.baseline_data)?.profile != null;
  const daysSinceLastPost = lastPostAt ? Math.floor((Date.now() - lastPostAt.getTime()) / (24 * 60 * 60 * 1000)) : null;

  const linkedinCta = (() => {
    if (!hasLinkedinBaseline) return "Optimize your profile";
    if (daysSinceLastPost === null || daysSinceLastPost >= 7) return "Write a post";
    return "Continue your draft";
  })();
  const linkedinStat = (() => {
    if (!hasLinkedinBaseline) return "Profile not yet optimized";
    if (daysSinceLastPost === null) return "No posts yet";
    if (daysSinceLastPost === 0) return "Last post: today";
    if (daysSinceLastPost === 1) return "Last post: yesterday";
    return `Last post: ${daysSinceLastPost}d ago`;
  })();

  const focusCta = (() => {
    if (selfHealing) return "Building your daily focus…";
    if (dailyAction?.title) return dailyAction.title;
    if (roles.length === 0) return "Generate your roadmap";
    return "Take your first action";
  })();
  const focusDesc = (() => {
    if (dailyAction?.rationale) return dailyAction.rationale;
    if (roles.length === 0) return "Your daily focus generates from your roadmap. Start there.";
    return "Your daily focus will appear here once it's ready.";
  })();

  const focusDestination = (() => {
    if (dailyAction?.source_table === "applications") return createPageUrl("Tracker");
    if (dailyAction?.source_table === "tasks") return createPageUrl("Tasks");
    if (dailyAction?.source_table === "career_roles") return createPageUrl("Roadmap");
    if (dailyAction?.action_type === "reflect") return createPageUrl("Profile");
    return createPageUrl("Roadmap");
  })();

  const handleHero = () => {
    navigate(focusDestination);
  };

  const firstName = (profile?.full_name || "").split(" ")[0] || "";

  return (
    <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
      {(rolesError || appsError) && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#991B1B]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Some data failed to load. Refresh the page to try again.</span>
        </div>
      )}

      {stale && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[14px] border border-rd-golden bg-rd-golden-tint px-4 py-3 text-[13px] text-rd-golden-dark">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">Your profile changed since the last analysis.</span>
          <Link
            to={createPageUrl("Roadmap")}
            className="font-display font-semibold underline underline-offset-2 hover:text-rd-text"
          >
            Refresh roadmap
          </Link>
        </div>
      )}

      {/* Hero */}
      <section className="pb-7 sm:pb-9">
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          {timeOfDayGreeting()}
          {firstName ? `, ${firstName}` : ""}
        </p>

        <h1 className="font-display font-extrabold text-[40px] sm:text-[52px] leading-[1.06] tracking-tight text-rd-text mt-4 max-w-3xl">
          {pickHeadline({ profile, roles, applications })}
        </h1>

        <LiveMatchesStat count={liveMatchCount} />

        <div className="flex flex-wrap items-center gap-3 mt-6">
          <RdButton onClick={handleHero}>
            See today&apos;s action <ArrowUpRight className="w-4 h-4" />
          </RdButton>
          <Link
            to={createPageUrl("Jobs")}
            className="inline-flex items-center gap-1.5 font-display font-semibold text-[13.5px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-5 py-2.5 transition-colors"
          >
            Browse jobs
          </Link>
        </div>
      </section>

      {/* Bento grid. Row 1: focus (span 4) + roadmap (span 2). Row 2:
          applications + jobs (span 3 each). Row 3: stories + linkedin
          (span 3 each). Collapses to 2 columns at <900px and 1 column
          at <640px. Min-heights keep the skeleton ↔ real-data swap
          CLS-free. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Today's focus — dark accent. */}
        <HomeCard dark className="lg:col-span-4 min-h-[180px]" to={focusDestination}>
          <CardEyebrow dark>Today&apos;s focus</CardEyebrow>
          <p className="font-display font-extrabold text-[24px] sm:text-[26px] leading-[1.15] tracking-tight mt-1 text-white">
            {focusCta}
          </p>
          <p className="text-[13px] leading-[1.55] text-white/70 mt-1">
            {focusDesc}
          </p>
          <CardArrow dark />
        </HomeCard>

        {/* Roadmap */}
        <HomeCard className="lg:col-span-2 min-h-[180px]" to={createPageUrl("Roadmap")}>
          <CardEyebrow>Roadmap</CardEyebrow>
          <p className="font-display font-extrabold text-[20px] sm:text-[22px] leading-[1.15] tracking-tight text-rd-text mt-1">
            {roles.length === 0 ? "Generate your roadmap" : "Open your roadmap"}
          </p>
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-1">
              <TrackPill color="teal" count={track1Count} label="T1" />
              <TrackPill color="golden" count={track2Count} label="T2" />
              <TrackPill color="coral" count={track3Count} label="T3" />
            </div>
          )}
          <p className="text-[12.5px] text-rd-text-secondary leading-[1.5] mt-1">
            {roles.length === 0
              ? "Score every role in the library against your profile."
              : "See your track breakdown, fit scores, and skill gaps."}
          </p>
          <CardArrow />
        </HomeCard>

        {/* Applications */}
        <HomeCard className="lg:col-span-3 min-h-[200px]" to={createPageUrl("Tracker")}>
          <CardEyebrow stat={`${activeApps.length} active`}>Applications</CardEyebrow>
          <p className="font-display font-extrabold text-[22px] leading-[1.15] tracking-tight text-rd-text mt-1">
            {applications.length === 0 ? "Track your first application" : "Manage your pipeline"}
          </p>
          {recentApps.length > 0 ? (
            <ul className="mt-auto pt-3 border-t border-rd-border-subtle space-y-1.5">
              {recentApps.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 text-[12.5px] text-rd-text-secondary"
                >
                  <span className="font-medium text-rd-text truncate min-w-0">
                    {a.company ? `${a.company} · ${a.role_title}` : a.role_title}
                  </span>
                  <span
                    className={[
                      "flex-shrink-0 text-[9.5px] tracking-[0.05em] uppercase font-mono px-2 py-0.5 rounded-full",
                      statusBadgeStyle(a.status),
                    ].join(" ")}
                  >
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-rd-text-secondary leading-[1.5] mt-1">
              Save a role from the job board to start tracking outcomes.
            </p>
          )}
          <CardArrow />
        </HomeCard>

        {/* New jobs (last 7 days) */}
        <HomeCard className="lg:col-span-3 min-h-[200px]" to={createPageUrl("Jobs")}>
          <CardEyebrow stat={`${newJobs.length} matches`}>New this week</CardEyebrow>
          <p className="font-display font-extrabold text-[22px] leading-[1.15] tracking-tight text-rd-text mt-1">
            {roles.filter((r) => r.track === "track_1" && r.title).length === 0
              ? "Browse open roles"
              : "Browse jobs"}
          </p>
          {newJobs.length > 0 ? (
            <ul className="mt-auto pt-3 border-t border-rd-border-subtle space-y-1.5">
              {newJobs.slice(0, 3).map((j) => (
                <li
                  key={j.id}
                  className="text-[12.5px] text-rd-text-secondary truncate"
                >
                  <span className="font-medium text-rd-text">
                    {j.company_name ? `${j.company_name} · ${j.title}` : j.title}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-rd-text-secondary leading-[1.5] mt-1">
              {roles.filter((r) => r.track === "track_1" && r.title).length === 0
                ? "Generate your roadmap first — jobs are filtered to your Track 1 roles."
                : "No new matches in the last 7 days. Browse the full board instead."}
            </p>
          )}
          <CardArrow />
        </HomeCard>

        {/* Story bank */}
        <HomeCard className="lg:col-span-3 min-h-[150px]" to={createPageUrl("StoryBank")}>
          <CardEyebrow
            stat={
              storiesThisWeek > 0
                ? `${storiesCount} · +${storiesThisWeek} this week`
                : `${storiesCount} stories`
            }
          >
            Story bank
          </CardEyebrow>
          <p className="font-display font-extrabold text-[22px] leading-[1.15] tracking-tight text-rd-text mt-1">
            {storiesCount === 0 ? "Capture your first story" : "Add a story"}
          </p>
          <p className="text-[12.5px] text-rd-text-secondary leading-[1.5] mt-1">
            {storiesCount === 0
              ? "Stories fuel every CV, LinkedIn post, and interview answer. Capture once, use everywhere."
              : "Each story you capture compounds across CVs, LinkedIn, and interviews."}
          </p>
          <CardArrow />
        </HomeCard>

        {/* LinkedIn */}
        <HomeCard
          className="lg:col-span-3 min-h-[150px]"
          to={hasLinkedinBaseline ? `${createPageUrl("Linkedin")}?tab=posts` : `${createPageUrl("Linkedin")}?tab=profile`}
        >
          <CardEyebrow stat={linkedinStat}>LinkedIn</CardEyebrow>
          <p className="font-display font-extrabold text-[22px] leading-[1.15] tracking-tight text-rd-text mt-1">
            {linkedinCta}
          </p>
          <p className="text-[12.5px] text-rd-text-secondary leading-[1.5] mt-1">
            {!hasLinkedinBaseline
              ? "Rewrite your headline, About, and experience bullets against your real achievements."
              : "Draft a post from your Story Bank, score a comment, or run warm outreach."}
          </p>
          <CardArrow />
        </HomeCard>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Live-matches hero stat — uncapped count + /Jobs link.
// ────────────────────────────────────────────────────────────────────────
function LiveMatchesStat({ count }) {
  // Two zero-states distinguished:
  //   - count === null: user has no Track-1 roles yet (or fetch errored
  //     — we silently degrade to the same state; never surface an error).
  //   - count === 0: Track-1 roles exist, no live matches found right now.
  // Both render as "Matches incoming" rather than a raw zero, but the
  // link still targets /Jobs in case the user wants to scan the full
  // board. Per spec: graceful zero-state, never an error.
  const isUnavailable = count === null;
  const display = isUnavailable ? null : count;

  return (
    <Link
      to={createPageUrl("Jobs")}
      className="group inline-flex items-baseline gap-3 mt-5 text-rd-text hover:text-rd-coral-dark transition-colors"
    >
      <Sparkles className="w-[18px] h-[18px] text-rd-coral self-center" aria-hidden="true" />
      {display !== null && display > 0 ? (
        <>
          <span className="font-display font-extrabold text-[28px] sm:text-[32px] leading-none tracking-tight">
            {display.toLocaleString()}
          </span>
          <span className="text-[13.5px] sm:text-[14px] font-display font-semibold text-rd-text-secondary group-hover:text-rd-coral-dark">
            live job matches for you
          </span>
          <ArrowRight className="w-3.5 h-3.5 self-center opacity-0 -ml-2 group-hover:opacity-100 group-hover:translate-x-0.5 transition-[opacity,transform]" />
        </>
      ) : (
        <>
          <span className="font-display font-extrabold text-[20px] sm:text-[22px] leading-none tracking-tight text-rd-text-secondary group-hover:text-rd-coral-dark">
            Matches incoming
          </span>
          <span className="text-[12.5px] text-rd-text-tertiary group-hover:text-rd-coral-dark">
            — generate your roadmap to see them
          </span>
        </>
      )}
    </Link>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Track pill — small dot + label for the roadmap card.
// ────────────────────────────────────────────────────────────────────────
function TrackPill({ color, count, label }) {
  const dot = {
    teal: "bg-rd-teal",
    golden: "bg-rd-golden",
    coral: "bg-rd-coral",
  }[color];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-mono text-rd-text-secondary">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {count} {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page-level skeleton — mirrors the bento grid layout pixel-equivalent.
// Each card uses the same min-height as the real card so CLS = 0 when
// real data arrives.
// ────────────────────────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-8 sm:py-10" aria-hidden="true">
      <section className="pb-7 sm:pb-9">
        <Skeleton className="h-3 w-32 mb-4" />
        <Skeleton className="h-10 w-2/3 max-w-2xl" />
        <Skeleton className="h-8 w-72 mt-5" />
        <div className="flex gap-3 mt-6">
          <Skeleton className="h-10 w-40 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <RdCard className="lg:col-span-4 min-h-[180px] p-6 !bg-rd-text">
          <Skeleton className="h-3 w-24 bg-white/20" />
          <Skeleton className="h-6 w-2/3 bg-white/20 mt-3" />
          <Skeleton className="h-3 w-full bg-white/20 mt-2" />
          <Skeleton className="h-3 w-3/4 bg-white/20 mt-1" />
        </RdCard>
        <RdCard className="lg:col-span-2 min-h-[180px] p-6">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-2/3 mt-3" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-3/4 mt-2" />
        </RdCard>
        <RdCard className="lg:col-span-3 min-h-[200px] p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-2/3 mt-3" />
          <div className="space-y-2 mt-4">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
        </RdCard>
        <RdCard className="lg:col-span-3 min-h-[200px] p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-1/2 mt-3" />
          <div className="space-y-2 mt-4">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </RdCard>
        <RdCard className="lg:col-span-3 min-h-[150px] p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-1/2 mt-3" />
          <Skeleton className="h-3 w-full mt-2" />
          <Skeleton className="h-3 w-2/3 mt-1" />
        </RdCard>
        <RdCard className="lg:col-span-3 min-h-[150px] p-6">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-1/2 mt-3" />
          <Skeleton className="h-3 w-3/4 mt-2" />
        </RdCard>
      </div>
    </div>
  );
}

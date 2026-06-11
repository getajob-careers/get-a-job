/*
 * Home.jsx — authenticated dashboard, "command center" layout.
 *
 * Locked design (docs/design/redesign/getajob_home_locked_crowz_style.html
 * + pipeline variant C): greeting → three underlined stats → cream focus
 * card with a single coral action button → Today's plan + Pipeline card
 * row → teal coach band. Pipeline C shows funnel counts up top and
 * exception rows ("worth your attention") below, instead of a roster.
 *
 * Behaviour PRESERVED from PR 3B: the self-heal useEffect (single-fire,
 * force:true, 45s, persist + invalidateAfterCareerAnalysis), the
 * redirect-to-Onboarding guard, the daily-action query (staleTime 30m +
 * retry:false), withDbTimeout wrappers on profile/roles/applications,
 * the liveMatches inline-titles non-waterfall, memoised activeApps
 * before the early returns (hook-order stability), and the
 * hadRolesPreviously localStorage write.
 *
 * Dropped with the bento: the stories / linkedin_posts / linkedin_opts /
 * new_jobs_home queries (no surface reads them here any more).
 *
 * Added: the tasks query — same key + full select as Tasks.jsx so the
 * shared cache never holds a narrower row shape (see tasks/lessons.md
 * 2026-05-28, cache pollution).
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
import {
  ArrowRight, ChevronRight, Loader2, AlertCircle, Sparkles, Check,
  GraduationCap, Rocket, Users, FileText, Send, Bookmark,
  Linkedin as LinkedinIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import RdCard from "@/components/redesign/RdCard";
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

const DAY_MS = 24 * 60 * 60 * 1000;
// An applied row with no movement for this long surfaces in the
// "worth your attention" exception list.
const IDLE_NUDGE_DAYS = 7;

// Funnel buckets for pipeline variant C. Maps the 7-value
// applications.status enum onto the 4 stages a student thinks in.
// rejected / withdrawn are excluded from the funnel entirely.
const FUNNEL_BUCKETS = [
  { key: "saved", label: "saved", statuses: ["interested", "preparing"] },
  { key: "applied", label: "applied", statuses: ["applied"] },
  { key: "interview", label: "interview", statuses: ["interviewing"] },
  { key: "offer", label: "offer", statuses: ["offer", "accepted"] },
];

function taskDueMs(t) {
  if (!t.due_date) return Number.POSITIVE_INFINITY;
  const d = new Date(t.due_date).getTime();
  return Number.isNaN(d) ? Number.POSITIVE_INFINITY : d;
}

// Avatar tint rotation for exception rows — golden for idle (needs a
// nudge), teal for interviews (moving). Color encodes urgency, matching
// the rest of the page.
const ATTENTION_STYLES = {
  idle: { bg: "bg-rd-golden-tint", fg: "text-rd-golden-dark" },
  interview: { bg: "bg-rd-teal-tint", fg: "text-rd-teal-dark" },
};

// Task-row icon per tasks.category — same tint/fg pairs as the
// CATEGORY_LABELS map on the Tasks page so the two surfaces agree.
// Raw category values normalize the same way Tasks.jsx does
// (interview_prep / clarity_positioning fold into application).
const TASK_CATEGORY_STYLES = {
  skill: { icon: GraduationCap, bg: "bg-rd-teal-tint", fg: "text-rd-teal-dark" },
  project: { icon: Rocket, bg: "bg-rd-coral-tint", fg: "text-rd-coral-dark" },
  networking: { icon: Users, bg: "bg-rd-golden-tint", fg: "text-rd-golden-dark" },
  cv: { icon: FileText, bg: "bg-rd-bg-soft", fg: "text-rd-text-secondary" },
  application: { icon: Send, bg: "bg-rd-teal-tint", fg: "text-rd-teal-dark" },
};

function taskCategoryStyle(category) {
  const map = { interview_prep: "application", clarity_positioning: "application" };
  return TASK_CATEGORY_STYLES[map[category] || category] || TASK_CATEGORY_STYLES.application;
}

// ────────────────────────────────────────────────────────────────────────
// Root component
// ────────────────────────────────────────────────────────────────────────

export default function Home() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading: loadingProfile, isFetched: profileFetched, isError: profileError } = useProfileQuery(user?.id);

  // Direct DB queries get wrapped in withDbTimeout (30s) — guards
  // against a hung Supabase REST call leaving Home stuck on the skeleton
  // indefinitely. Edge function invocations (daily_action) are NOT
  // wrapped — they legitimately run 40s+.
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

  // Same key + projection as Tasks.jsx — the shared ["tasks", uid] cache
  // must always hold full rows.
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("tasks").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Stories + last LinkedIn post feed the stat strip and quick tiles.
  const { data: stories = [] } = useQuery({
    queryKey: ["stories", user?.id],
    queryFn: async () => (await supabase.from("stories").select("id, created_at").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
  });
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

  // Daily action — lazy-fetches via the edge function (UPSERTs today's
  // row idempotent per (user_id, for_date)). Preserved: staleTime 30m,
  // retry: false.
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

  // Uncapped count of active IL jobs trigram-matching the user's Track-1
  // role titles. Inline-titles fetch so this fires in parallel with
  // `roles` on user.id resolution — preserved verbatim from PR 3B.
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
      const { data, error } = await /** @type {any} */ (supabase).rpc("count_active_jobs_by_role_titles", {
        p_role_titles: titles,
        p_similarity_threshold: 0.3,
      });
      if (error) return null;
      const n = Array.isArray(data) ? data[0] : data;
      return typeof n === "number" ? n : null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const stale = isAnalysisStale({ profile, experiences, certifications, projects });
  const isLoading = loadingProfile || loadingRoles || loadingApps;

  // hadRolesPreviously — preserved for empty-state copy.
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
  // persist + invalidateAfterCareerAnalysis). ?preview-selfheal=1 puts the
  // page into the pending visual state for preview capture only.
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
  const activeApps = useMemo(
    () => applications.filter((a) => !["rejected", "withdrawn", "offer", "accepted"].includes(a.status)),
    [applications],
  );

  const funnelCounts = useMemo(() => {
    const counts = {};
    for (const bucket of FUNNEL_BUCKETS) {
      counts[bucket.key] = applications.filter((a) => bucket.statuses.includes(a.status)).length;
    }
    return counts;
  }, [applications]);

  // Exception rows: interviews first (moving — don't drop the ball),
  // then applied rows idle past the nudge threshold.
  const attentionItems = useMemo(() => {
    const interviews = [];
    const idle = [];
    for (const a of applications) {
      if (a.status === "interviewing") {
        interviews.push({ app: a, kind: "interview", note: "interviewing — keep momentum" });
      } else if (a.status === "applied") {
        const ts = new Date(a.updated_at || a.created_at).getTime();
        const days = Number.isNaN(ts) ? 0 : Math.floor((Date.now() - ts) / DAY_MS);
        if (days >= IDLE_NUDGE_DAYS) {
          idle.push({ app: a, kind: "idle", days, note: `${days} days quiet` });
        }
      }
    }
    idle.sort((a, b) => b.days - a.days);
    return [...interviews, ...idle].slice(0, 2);
  }, [applications]);

  // Plan rows are checkable in place (seamless-ia Today spec). Rows
  // toggled complete this session stay visible with a strikethrough
  // instead of vanishing — sessionDoneIds remembers them; on the next
  // visit completed tasks drop out naturally.
  const [sessionDoneIds, setSessionDoneIds] = useState(() => new Set());
  const planTasks = useMemo(
    () => tasks
      .filter((t) => !t.is_complete || sessionDoneIds.has(t.id))
      .sort((a, b) => taskDueMs(a) - taskDueMs(b))
      .slice(0, 4),
    [tasks, sessionDoneIds],
  );

  // Hero focus completion — no daily_actions completion column exists, so
  // done-state persists per (user, day) in localStorage. Resets with the
  // next day's action.
  const heroDoneKey = user?.id ? `focusDone:${user.id}:${new Date().toDateString()}` : null;
  const [heroDone, setHeroDone] = useState(false);
  useEffect(() => {
    if (!heroDoneKey) return;
    try { setHeroDone(localStorage.getItem(heroDoneKey) === "1"); } catch { /* unavailable */ }
  }, [heroDoneKey]);
  const toggleHeroDone = () => {
    setHeroDone((prev) => {
      const next = !prev;
      try {
        if (heroDoneKey) localStorage.setItem(heroDoneKey, next ? "1" : "0");
      } catch { /* unavailable */ }
      return next;
    });
  };

  const toggleTask = async (task) => {
    const nextComplete = !task.is_complete;
    setSessionDoneIds((prev) => {
      const next = new Set(prev);
      if (nextComplete) next.add(task.id); else next.delete(task.id);
      return next;
    });
    // Optimistic flip on the shared canonical cache — same pattern as
    // Tasks.jsx toggleComplete.
    queryClient.setQueryData(["tasks", user?.id], (prev) =>
      (prev || []).map((t) => (t.id === task.id ? { ...t, is_complete: nextComplete } : t)),
    );
    const { error } = await supabase.from("tasks").update({ is_complete: nextComplete }).eq("id", task.id);
    if (error) {
      queryClient.setQueryData(["tasks", user?.id], (prev) =>
        (prev || []).map((t) => (t.id === task.id ? { ...t, is_complete: task.is_complete } : t)),
      );
      setSessionDoneIds((prev) => {
        const next = new Set(prev);
        if (nextComplete) next.delete(task.id); else next.add(task.id);
        return next;
      });
    }
  };

  // Progress ring: today's moves = visible plan rows + the hero focus.
  const ringTotal = planTasks.length + (dailyAction?.title || selfHealing ? 1 : 0);
  const ringDone = planTasks.filter((t) => t.is_complete).length + (heroDone && ringTotal > planTasks.length ? 1 : 0);

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

  // Coach band rule ladder — most urgent situation wins. Each rule deep-
  // links into the chat with a ?seed= prompt (and ?application_id= when
  // scoped to a row) so the conversation opens already pointed at the
  // reason the user clicked. Seeds surface as the first suggested prompt;
  // CareerAgent validates the id against the user's own applications.
  const coach = (() => {
    const chatUrl = (seed, appId = null) => {
      const params = new URLSearchParams();
      if (appId) params.set("application_id", appId);
      params.set("seed", seed);
      return `${createPageUrl("CareerAgent")}?${params.toString()}`;
    };

    const interviewApp = activeApps.find((a) => a.status === "interviewing");
    if (interviewApp) {
      const name = interviewApp.company || interviewApp.role_title;
      return {
        headline: `You're interviewing at ${name}.`,
        sub: "Prep with your career agent — it knows the role and your background.",
        cta: "Prep with the agent",
        to: chatUrl(`Help me prepare for my ${interviewApp.role_title} interview at ${name}`, interviewApp.id),
      };
    }

    const idleItem = attentionItems.find((i) => i.kind === "idle");
    if (idleItem) {
      const name = idleItem.app.company || idleItem.app.role_title;
      return {
        headline: `${name} has been quiet for ${idleItem.days} days.`,
        sub: "A short, polite follow-up doubles your odds of a reply.",
        cta: "Draft the follow-up",
        to: chatUrl(`Help me draft a short follow-up message for my ${idleItem.app.role_title} application at ${name}`, idleItem.app.id),
      };
    }

    if (roles.length === 0) {
      return {
        headline: "Not sure where to start?",
        sub: "Your roadmap comes first — your agent can walk you through it.",
        cta: "Ask how it works",
        to: chatUrl("How do I get started with my career roadmap?"),
      };
    }

    if (tasks.length > 0 && planTasks.length === 0) {
      return {
        headline: "All clear for today.",
        sub: "Nice work. Ask your agent what would move you forward next.",
        cta: "What's next?",
        to: chatUrl("I finished today's tasks — what should I focus on next?"),
      };
    }

    return {
      headline: "Your agent knows your pipeline, roadmap, and stories.",
      sub: "Stuck on anything in your search? Ask it anything.",
      cta: "Ask anything",
      to: createPageUrl("CareerAgent"),
    };
  })();

  const firstName = (profile?.full_name || "").split(" ")[0] || "";

  return (
    <div className="max-w-[1080px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
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

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] leading-[1.1] tracking-tight text-rd-text">
            {timeOfDayGreeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[12.5px] text-rd-text-secondary mt-1">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {" · everything for today lives here."}
          </p>
        </div>
        {ringTotal > 0 && (
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--rd-bg-soft)" strokeWidth="5" />
              <circle
                cx="22" cy="22" r="18" fill="none" stroke="var(--rd-teal)" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(ringDone / ringTotal) * 113} 113`}
                transform="rotate(-90 22 22)"
                style={{ transition: "stroke-dasharray .35s ease-out" }}
              />
              <text x="22" y="26" textAnchor="middle" fontFamily="Rokkitt, serif" fontWeight="800" fontSize="11" fill="var(--rd-text)">
                {ringDone}/{ringTotal}
              </text>
            </svg>
            <span className="text-[11px] text-rd-text-secondary leading-[1.35] w-16">today&apos;s moves done</span>
          </div>
        )}
      </div>

      {/* Underlined stats — the locked pattern: big slab number over a
          hairline, no card chrome. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-6">
        <StatBlock
          label="Live matches"
          to={createPageUrl("Career")}
          value={liveMatchCount === null ? "—" : liveMatchCount.toLocaleString()}
        />
        <StatBlock label="In pipeline" to={createPageUrl("Tracker")} value={String(activeApps.length)} />
        <StatBlock
          label="Interviews"
          to={createPageUrl("Tracker")}
          value={String(funnelCounts.interview)}
        />
        <StatBlock label="Stories banked" to={createPageUrl("StoryBank")} value={String(stories.length)} />
      </div>

      {/* Focus card — coral tint, completable (seamless-ia Today spec).
          Card body navigates to the action; the circle button toggles
          done (teal state) without leaving the page. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(focusDestination)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(focusDestination);
          }
        }}
        className={[
          "group cursor-pointer rounded-[18px] mt-6 px-5 py-4 sm:px-6 sm:py-5 flex items-center gap-4",
          "transition-colors duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2",
          heroDone ? "bg-rd-teal-tint" : "bg-rd-coral-tint",
        ].join(" ")}
      >
        <div className="flex-1 min-w-0">
          <p className={`font-display font-semibold text-[11px] uppercase tracking-[0.04em] ${heroDone ? "text-rd-teal-dark" : "text-rd-coral-dark"}`}>
            {heroDone ? "done — nice work" : "today's focus · picked by your agent"}
          </p>
          <p className={`font-display font-bold text-[18px] sm:text-[20px] leading-[1.2] mt-1.5 ${heroDone ? "line-through text-rd-teal-dark" : "text-rd-text"}`}>
            {focusCta}
          </p>
          {!heroDone && (
            <p className="text-[12.5px] text-rd-text-tertiary leading-[1.55] mt-1.5">
              {focusDesc}
            </p>
          )}
        </div>
        <button
          aria-label={heroDone ? "Mark focus not done" : "Mark focus done"}
          onClick={(e) => {
            e.stopPropagation();
            toggleHeroDone();
          }}
          className={[
            "w-[50px] h-[50px] rounded-full flex items-center justify-center flex-shrink-0",
            "transition-[background-color,transform] duration-150 active:scale-[.94]",
            heroDone ? "bg-rd-teal" : "bg-rd-coral group-hover:translate-x-0.5",
          ].join(" ")}
        >
          {heroDone ? (
            <Check className="w-[22px] h-[22px] text-white" />
          ) : (
            <ArrowRight className="w-[22px] h-[22px] text-white" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.45fr_1fr] gap-4 mt-4 items-start">
        {/* Left column — Today's plan + quick-access tiles */}
        <div className="flex flex-col gap-3 min-w-0">
        <RdCard className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-[17px] text-rd-text">Today&apos;s plan</h2>
            {planTasks.filter((t) => !t.is_complete).length > 0 && (
              <span className="text-[11px] text-rd-text-tertiary border border-rd-border-subtle rounded-full px-2.5 py-1">
                {planTasks.filter((t) => !t.is_complete).length} open
              </span>
            )}
          </div>
          {planTasks.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {planTasks.map((t) => {
                const cat = taskCategoryStyle(t.category);
                const CatIcon = cat.icon;
                const done = !!t.is_complete;
                return (
                <li key={t.id}>
                  <button
                    onClick={() => toggleTask(t)}
                    className="w-full text-left flex items-center gap-3 px-1.5 py-2 rounded-[12px] hover:bg-rd-bg-page transition-colors"
                  >
                    <span className={`w-7 h-7 rounded-full ${done ? "bg-rd-teal-tint" : cat.bg} flex items-center justify-center flex-shrink-0`}>
                      {done ? (
                        <Check className="w-3.5 h-3.5 text-rd-teal-dark" />
                      ) : (
                        <CatIcon className={`w-3.5 h-3.5 ${cat.fg}`} />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block font-display font-bold text-[13px] truncate ${done ? "line-through text-rd-text-tertiary" : "text-rd-text"}`}>
                        {t.title}
                      </span>
                      {t.role_title && !done && (
                        <span className="block text-[11px] text-rd-text-secondary truncate">
                          For: {t.role_title}
                        </span>
                      )}
                    </span>
                    {t.due_date && !done && (
                      <span className="text-[11px] text-rd-text-secondary flex-shrink-0">
                        {new Date(t.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </button>
                </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-3 flex items-start gap-3 px-1.5 py-2">
              <span className="w-7 h-7 rounded-full bg-rd-teal-tint flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-rd-teal-dark" />
              </span>
              <p className="text-[12.5px] text-rd-text-secondary leading-[1.55]">
                {tasks.length > 0
                  ? "All caught up. New tasks generate as your roadmap moves."
                  : "No tasks yet — they generate from your roadmap."}
              </p>
            </div>
          )}
          <Link
            to={createPageUrl("Tasks")}
            className="inline-flex items-center gap-1 mt-3 text-[12px] font-medium text-rd-coral-dark hover:text-rd-text transition-colors"
          >
            All tasks <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </RdCard>

        {/* Quick-access tiles — surfaces that left the nav (seamless-ia). */}
        <div className="flex gap-2.5 flex-wrap">
          <QuickTile
            to={createPageUrl("StoryBank")}
            icon={Bookmark}
            tint="bg-rd-coral-tint"
            ink="text-rd-coral-dark"
            label="Story Bank"
            meta={
              stories.length === 0
                ? "capture your first"
                : `${stories.length} ${stories.length === 1 ? "story" : "stories"}${
                    stories.filter((s) => new Date(s.created_at).getTime() >= Date.now() - 7 * DAY_MS).length > 0
                      ? ` · ${stories.filter((s) => new Date(s.created_at).getTime() >= Date.now() - 7 * DAY_MS).length} new`
                      : ""
                  }`
            }
          />
          <QuickTile
            to={createPageUrl("CVAgent")}
            icon={FileText}
            tint="bg-rd-teal-tint"
            ink="text-rd-teal-dark"
            label="My CV"
            meta="tailor one in chat"
          />
          <QuickTile
            to={createPageUrl("Linkedin")}
            icon={LinkedinIcon}
            tint="bg-rd-golden-tint"
            ink="text-rd-golden-dark"
            label="LinkedIn"
            meta={(() => {
              const last = linkedinPosts[0]?.created_at ? new Date(linkedinPosts[0].created_at) : null;
              if (!last) return "no posts yet";
              const d = Math.floor((Date.now() - last.getTime()) / DAY_MS);
              if (d === 0) return "posted today";
              if (d === 1) return "posted yesterday";
              return `last post ${d}d ago`;
            })()}
          />
        </div>
        </div>

        {/* Pipeline — variant C: funnel counts up top, exceptions below. */}
        <RdCard className="p-5">
          <h2 className="font-display font-bold text-[17px] text-rd-text">Pipeline</h2>
          <div className="flex gap-1.5 mt-3">
            <FunnelTile label="saved" value={funnelCounts.saved} tone="neutral" />
            <FunnelTile label="applied" value={funnelCounts.applied} tone="coral" />
            <FunnelTile label="interview" value={funnelCounts.interview} tone="teal" />
            <FunnelTile label="offer" value={funnelCounts.offer} tone="neutral" />
          </div>
          <div className="border-t-[1.5px] border-rd-border-subtle mt-4 pt-3">
            <p className="text-[11px] font-medium text-rd-text-eyebrow">worth your attention</p>
            {attentionItems.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {attentionItems.map(({ app, kind, note }) => {
                  const style = ATTENTION_STYLES[kind];
                  const name = app.company || app.role_title || "Application";
                  return (
                    <li key={app.id}>
                      <Link
                        to={createPageUrl("Tracker")}
                        className="flex items-center gap-3 px-1.5 py-2 rounded-[12px] hover:bg-rd-bg-page transition-colors"
                      >
                        <span className={`w-7 h-7 rounded-full ${style.bg} flex items-center justify-center flex-shrink-0`}>
                          <span className={`font-display font-bold text-[12px] ${style.fg}`}>
                            {name.charAt(0).toUpperCase()}
                          </span>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-display font-bold text-[13px] text-rd-text truncate">
                            {name}
                          </span>
                          <span className={`block text-[11px] truncate ${style.fg}`}>{note}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1.5 px-1.5 text-[12.5px] text-rd-text-secondary leading-[1.55]">
                {applications.length === 0
                  ? "Save a role from the job board to start your funnel."
                  : "Nothing needs you right now."}
              </p>
            )}
          </div>
          <Link
            to={createPageUrl("Tracker")}
            className="inline-flex items-center gap-1 mt-3 text-[12px] font-medium text-rd-coral-dark hover:text-rd-text transition-colors"
          >
            Open tracker <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </RdCard>
      </div>

      {/* Coach band — teal zone, one sentence, one action. */}
      <div className="bg-rd-teal-tint rounded-[20px] mt-4 px-5 py-4 flex items-center gap-3.5 flex-wrap">
        <span className="w-[34px] h-[34px] rounded-full bg-rd-text flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-rd-coral" />
        </span>
        <div className="flex-1 min-w-[180px]">
          <p className="font-display font-bold text-[14px] text-rd-text">{coach.headline}</p>
          <p className="text-[12px] text-rd-teal-dark mt-0.5">{coach.sub}</p>
        </div>
        <Link
          to={coach.to}
          className="flex-shrink-0 bg-rd-bg-card rounded-full px-4 py-2 text-[12px] font-medium text-rd-text hover:shadow-rd transition-shadow"
        >
          {coach.cta}
        </Link>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Pieces
// ────────────────────────────────────────────────────────────────────────

function QuickTile({ to, icon: Icon, tint, ink, label, meta }) {
  return (
    <Link
      to={to}
      className="flex-1 basis-[96px] min-w-[96px] bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-[14px] px-3 py-2.5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5"
    >
      <span className={`w-7 h-7 rounded-full ${tint} flex items-center justify-center`}>
        <Icon className={`w-3.5 h-3.5 ${ink}`} />
      </span>
      <span className="block font-display font-bold text-[12.5px] text-rd-text mt-2">{label}</span>
      <span className="block text-[10.5px] text-rd-text-secondary truncate mt-0.5">{meta}</span>
    </Link>
  );
}

function StatBlock({ label, value, suffix = "", to }) {
  return (
    <Link to={to} className="block min-w-0 border-b-[1.5px] border-rd-border-subtle pb-2 group">
      <span className="text-[12px] text-rd-text-secondary">{label}</span>
      <span className="block font-display font-extrabold text-[26px] sm:text-[28px] leading-tight text-rd-text mt-1 group-hover:text-rd-coral-dark transition-colors">
        {value}
        {suffix && <span className="text-rd-text-tertiary text-[17px]">{suffix}</span>}
      </span>
    </Link>
  );
}

const FUNNEL_TONES = {
  neutral: { bg: "bg-rd-bg-page", num: "text-rd-text", label: "text-rd-text-secondary" },
  coral: { bg: "bg-rd-coral-tint", num: "text-rd-coral-dark", label: "text-rd-coral-dark" },
  teal: { bg: "bg-rd-teal-tint", num: "text-rd-teal-dark", label: "text-rd-teal-dark" },
};

function FunnelTile({ label, value, tone }) {
  const t = FUNNEL_TONES[tone];
  // Zero counts render muted regardless of tone — the colored tiles only
  // light up once there's something in the stage.
  const isZero = !value;
  return (
    <div className={`flex-1 min-w-0 text-center rounded-[12px] py-2 ${isZero ? "bg-rd-bg-page" : t.bg}`}>
      <div className={`font-display font-extrabold text-[18px] leading-tight ${isZero ? "text-rd-text-tertiary" : t.num}`}>
        {value}
      </div>
      <div className={`text-[10.5px] ${isZero ? "text-rd-text-tertiary" : t.label}`}>{label}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page-level skeleton — mirrors the command-center layout so the
// skeleton ↔ real-data swap stays CLS-free.
// ────────────────────────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div className="max-w-[1080px] mx-auto px-5 sm:px-8 py-8 sm:py-10" aria-hidden="true">
      <Skeleton className="h-9 w-72" />
      <div className="grid grid-cols-3 gap-4 sm:gap-7 mt-7">
        <div className="border-b-[1.5px] border-rd-border-subtle pb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16 mt-2" />
        </div>
        <div className="border-b-[1.5px] border-rd-border-subtle pb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-10 mt-2" />
        </div>
        <div className="border-b-[1.5px] border-rd-border-subtle pb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-12 mt-2" />
        </div>
      </div>
      <div className="bg-rd-bg-soft rounded-[20px] mt-7 px-6 py-5 flex items-center gap-4 min-h-[110px]">
        <div className="flex-1">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-6 w-2/3 mt-2.5" />
          <Skeleton className="h-3 w-1/2 mt-2" />
        </div>
        <Skeleton className="w-[50px] h-[50px] rounded-full flex-shrink-0" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1.45fr_1fr] gap-4 mt-4">
        <RdCard className="p-5 min-h-[220px]">
          <Skeleton className="h-5 w-28" />
          <div className="space-y-3 mt-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-5/6" />
          </div>
        </RdCard>
        <RdCard className="p-5 min-h-[220px]">
          <Skeleton className="h-5 w-20" />
          <div className="flex gap-1.5 mt-4">
            <Skeleton className="h-12 flex-1 rounded-[12px]" />
            <Skeleton className="h-12 flex-1 rounded-[12px]" />
            <Skeleton className="h-12 flex-1 rounded-[12px]" />
            <Skeleton className="h-12 flex-1 rounded-[12px]" />
          </div>
          <Skeleton className="h-3 w-32 mt-4" />
          <Skeleton className="h-9 w-full mt-2" />
        </RdCard>
      </div>
      <div className="bg-rd-teal-tint rounded-[20px] mt-4 px-5 py-4 flex items-center gap-3.5 min-h-[66px]">
        <Skeleton className="w-[34px] h-[34px] rounded-full flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-40 mt-1.5" />
        </div>
      </div>
    </div>
  );
}

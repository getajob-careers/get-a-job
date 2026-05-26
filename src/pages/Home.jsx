/*
 * Home.jsx — authenticated dashboard.
 *
 * Direction 3 tokens (warm slate + coral + Geist-only) — same brand
 * system as Landing.jsx. The two surfaces share the visual identity
 * but render different content: Landing is a marketing-page, Home is
 * a launchpad.
 *
 * Action-driven bento: every card has a clear verb-CTA and the whole
 * card is the click target. No "View all" links. Cards reflect user
 * state (empty / partial / full) so the CTA is always the next action
 * the user can take, not a description of the page they'll land on.
 *
 * Self-heal + redirect logic from the pre-redesign Home is preserved
 * verbatim. The visual chrome is what changed; the auth + analysis
 * recovery paths are unchanged.
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { invalidateAfterCareerAnalysis } from "@/lib/invalidateAfterCareerAnalysis";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowUpRight, Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { withDbTimeout } from "@/lib/withDbTimeout";

// ────────────────────────────────────────────────────────────────────────
// Inline CSS — Direction 3 tokens. Same palette as Landing.jsx.
// Scoped to `.home` so it never leaks into other dashboard pages that
// still use the neutral grey palette.
// ────────────────────────────────────────────────────────────────────────

const HOME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600;700;800;900&display=swap');
.home {
  --h-bg: #F4F4F2;
  --h-bg-tinted: #E8E8E5;
  --h-ink: #0E1014;
  --h-ink-soft: #52545A;
  --h-ink-faded: #9C9DA1;
  --h-accent: #F87060;
  --h-accent-deep: #C84F40;
  --h-accent-tint: #FDE7E3;
  --h-ink-card: #0E1014;
  --h-line: #DDDDDB;
  --h-line-soft: #E8E8E5;
  --h-card: #FFFFFF;
  --h-green: #1D7556;
  --h-green-tint: #DBEEE5;
  --h-blue: #2B5DC4;
  --h-blue-tint: #DEE6F7;
  --h-violet: #6B4FBF;
  --h-violet-tint: #E7E0F5;
  --h-font-display: 'Geist', system-ui, sans-serif;
  --h-font-body: 'Geist', system-ui, sans-serif;
  --h-font-mono: 'Geist Mono', ui-monospace, monospace;
  font-family: var(--h-font-body);
  color: var(--h-ink);
  background: var(--h-bg);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.home * { box-sizing: border-box; }

/* Topbar strip — sits in the space above the hero greeting. Currently
   houses the "About Get A Job" link (right-aligned). Matches the same
   small-caps-mono style the .home-greeting uses below it. */
.home-topbar {
  max-width: 1180px;
  margin: 0 auto;
  padding: 22px 32px 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.home-about-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--h-font-mono);
  font-size: 11px;
  color: var(--h-ink-faded);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  transition: color 0.15s ease;
}
.home-about-link:hover { color: var(--h-ink-soft); }

.home-hero {
  padding: 28px 32px 48px;
  max-width: 1180px;
  margin: 0 auto;
  text-align: left;
}
.home-greeting {
  font-family: var(--h-font-mono);
  font-size: 11px;
  color: var(--h-ink-faded);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 18px;
}
.home-headline {
  font-family: var(--h-font-display);
  font-size: 56px;
  font-weight: 700;
  line-height: 1.06;
  letter-spacing: -0.035em;
  color: var(--h-ink);
  margin-bottom: 28px;
  max-width: 900px;
}
.home-headline .accent { color: var(--h-accent); font-weight: 500; }
.home-cta-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.home-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 22px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--h-font-body);
  cursor: pointer;
  text-decoration: none;
  border: none;
  transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.home-btn:hover { transform: translateY(-1px); }
.home-btn:active { transform: scale(0.97); }
.home-btn-primary { background: var(--h-ink-card); color: white; box-shadow: 0 4px 16px rgba(248, 112, 96, 0.15); }
.home-btn-primary:hover { background: var(--h-accent); }
.home-btn-ghost { background: transparent; color: var(--h-ink); border: 1px solid var(--h-line); }
.home-btn-ghost:hover { background: var(--h-bg-tinted); }

@media (max-width: 640px) {
  .home-topbar { padding: 16px 20px 0; }
  .home-hero { padding: 18px 20px 32px; }
  .home-headline { font-size: 36px; }
  .home-cta-row { flex-direction: column; align-items: stretch; }
  .home-btn { justify-content: center; }
}

/* Bento */
.home-bento {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 32px 80px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
}
.home-card {
  background: var(--h-card);
  border: 1px solid var(--h-line);
  border-radius: 14px;
  padding: 24px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  width: 100%;
  font-family: var(--h-font-body);
}
.home-card:hover {
  transform: translateY(-2px);
  border-color: var(--h-ink);
  box-shadow: 0 8px 24px rgba(14, 16, 20, 0.06);
}
.home-card:focus-visible {
  outline: 2px solid var(--h-accent);
  outline-offset: 2px;
}
.home-card-dark { background: var(--h-ink-card); color: white; border-color: var(--h-ink-card); }
.home-card-dark:hover { border-color: var(--h-accent); }

.home-card-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--h-font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--h-ink-faded);
  font-weight: 500;
}
.home-card-dark .home-card-eyebrow { color: var(--h-accent); }

.home-card-stat {
  font-family: var(--h-font-mono);
  font-size: 11px;
  color: var(--h-ink-faded);
  letter-spacing: 0.03em;
}
.home-card-dark .home-card-stat { color: rgba(255,255,255,0.55); }

.home-card-cta {
  font-family: var(--h-font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--h-ink);
  margin-top: 4px;
}
.home-card-dark .home-card-cta { color: white; }
.home-card-big .home-card-cta { font-size: 26px; }

.home-card-desc {
  font-size: 13px;
  color: var(--h-ink-soft);
  line-height: 1.5;
}
.home-card-dark .home-card-desc { color: rgba(255,255,255,0.7); }

.home-card-list {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--h-line);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.home-card-dark .home-card-list { border-color: rgba(255,255,255,0.1); }

.home-card-row {
  font-size: 12px;
  color: var(--h-ink-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.home-card-row .label { font-weight: 500; color: var(--h-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.home-card-row .badge {
  font-family: var(--h-font-mono);
  font-size: 9px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 100px;
  flex-shrink: 0;
}

.home-card-arrow {
  margin-left: auto;
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--h-bg-tinted);
  color: var(--h-ink-soft);
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.home-card:hover .home-card-arrow { background: var(--h-accent); color: white; transform: translateX(2px); }
.home-card-dark .home-card-arrow { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
.home-card-dark:hover .home-card-arrow { background: var(--h-accent); color: white; }

.home-card-tiers { display: flex; gap: 12px; }
.home-track-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--h-font-mono);
  font-size: 11px;
  color: var(--h-ink-soft);
}
.home-track-dot { width: 8px; height: 8px; border-radius: 50%; }
.home-track-1 { background: var(--h-green); }
.home-track-2 { background: var(--h-blue); }
.home-track-3 { background: var(--h-violet); }

.home-this-week {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 100px;
  font-family: var(--h-font-mono);
  font-size: 10px;
  background: var(--h-accent-tint);
  color: var(--h-accent-deep);
  letter-spacing: 0.04em;
}

.home-error-banner {
  max-width: 1180px;
  margin: 16px auto 0;
  padding: 12px 16px;
  border-radius: 10px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: #991B1B;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Grid spans — desktop bento layout
   Row 1: [Today's focus span 4 | Roadmap span 2]
   Row 2: [Applications span 3   | New jobs span 3]
   Row 3: [Stories span 3        | LinkedIn span 3] */
.home-card-focus     { grid-column: span 4; min-height: 180px; }
.home-card-roadmap   { grid-column: span 2; min-height: 180px; }
.home-card-apps      { grid-column: span 3; min-height: 200px; }
.home-card-jobs      { grid-column: span 3; min-height: 200px; }
.home-card-stories   { grid-column: span 3; min-height: 150px; }
.home-card-linkedin  { grid-column: span 3; min-height: 150px; }

@media (max-width: 900px) {
  .home-bento { grid-template-columns: repeat(2, 1fr); }
  .home-card-focus, .home-card-roadmap, .home-card-apps,
  .home-card-jobs, .home-card-stories, .home-card-linkedin {
    grid-column: span 2;
  }
}
@media (max-width: 640px) {
  .home-bento { grid-template-columns: 1fr; padding: 0 20px 60px; gap: 12px; }
  .home-card-focus, .home-card-roadmap, .home-card-apps,
  .home-card-jobs, .home-card-stories, .home-card-linkedin {
    grid-column: span 1;
  }
}
`;

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

// Rolling-7-day epoch ms. "This week" everywhere on Home = last 7 days
// from now, not calendar-week-Monday.
const ROLLING_7D_MS = 7 * 24 * 60 * 60 * 1000;

// Headline rule ladder — picks the most-load-bearing statement about
// the user's current job-hunt state. Active applications are the strongest
// signal (already in motion); Track 1 roles next; goal/roadmap state last;
// fall back to a plain greeting if nothing else qualifies.
function pickHeadline({ profile, roles, applications }) {
  const firstName = (profile?.full_name || "").split(" ")[0] || "there";
  const activeApps = applications.filter(
    (a) => !["rejected", "withdrawn", "offer", "accepted"].includes(a.status),
  );
  const track1Roles = roles.filter((r) => r.track === "track_1");

  if (activeApps.length >= 5) {
    return (
      <>
        You have <span className="accent">{activeApps.length} applications</span> in motion.
      </>
    );
  }
  if (track1Roles.length >= 3) {
    return (
      <>
        You have <span className="accent">{track1Roles.length} Track&nbsp;1 roles</span> ready to apply to.
      </>
    );
  }
  if (track1Roles.length >= 1) {
    return (
      <>
        Your strongest fit is <span className="accent">{track1Roles[0].title}</span>.
      </>
    );
  }
  if (roles.length === 0) {
    return (
      <>
        Generate your <span className="accent">career roadmap</span> to see your first roles.
      </>
    );
  }
  return (
    <>
      Welcome back, <span className="accent">{firstName}</span>.
    </>
  );
}

function statusBadgeStyle(status) {
  const s = (status || "").toLowerCase();
  if (s === "offer" || s === "accepted") return { background: "var(--h-green-tint)", color: "var(--h-green)" };
  if (s === "interviewing" || s === "preparing") return { background: "var(--h-blue-tint)", color: "var(--h-blue)" };
  if (s === "rejected" || s === "withdrawn") return { background: "#FEE2E2", color: "#991B1B" };
  return { background: "var(--h-bg-tinted)", color: "var(--h-ink-soft)" };
}

// ────────────────────────────────────────────────────────────────────────
// Card components — each one is a clickable launchpad
// ────────────────────────────────────────────────────────────────────────

function HomeCard({ to, dark, big, className, children, onClick }) {
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
        "home-card",
        dark ? "home-card-dark" : "",
        big ? "home-card-big" : "",
        className || "",
      ].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}

function CardArrow() {
  return (
    <div className="home-card-arrow" aria-hidden="true">
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

  // Canonical profile cache — shared with Layout, Profile, Roadmap,
  // Jobs, Tasks, ChatInterface, JobMatchChecker, Practicum, and
  // LinkedIn ProfileTab. Returns the full row as a single object (or
  // null when no row exists).
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

  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences", user?.id],
    queryFn: async () => (await supabase.from("experiences").select("*").eq("user_id", user.id)).data || [],
    enabled: !!user?.id,
  });
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

  // New queries — drive the bento cards.
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
  // row idempotent per (user_id, for_date)). When the user hits Home for
  // the first time today, the function generates the action; subsequent
  // visits return the cached row from the DB.
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

  // Track-1-matching new jobs in the rolling 7d window. Reuses the same
  // search_jobs_by_role_titles RPC used by /Jobs.
  //
  // Pre-PR-F: this query was gated on `track1RoleTitles` derived from
  // the `roles` query — creating a waterfall (jobs couldn't start until
  // roles finished). Now: fetch the track-1 titles inline (narrow select,
  // titles only) so this query fires in parallel with `roles` on user.id
  // resolution. Saves ~300-500ms on Home first paint.
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

  // Self-heal — preserved verbatim. If onboarding_complete but missing
  // qualification_level + last_reality_check_date, re-run the analysis.
  const [selfHealing, setSelfHealing] = useState(false);
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
        // Self-heal exists because a prior run's persist step failed and
        // left profile.qualification_level=null. We MUST bypass the input-
        // hash cache here — if inputs are unchanged since that failed run,
        // the cache would return cached:true with no qualification_level,
        // leaving the null state unrepaired. force:true guarantees a fresh
        // response shape with all the fields we need to persist.
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
        // Single source of truth for the post-career-analysis invalidation
        // set — fans out across all profile/roles/applications/tasks/jobs
        // caches that derive from the new career_roles + updated profile.
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

  // ── Derived state for cards ──────────────────────────────────────────
  // Memoised so the filter+sort doesn't run on every parent re-render
  // (Layout chrome state changes, sidebar collapses, etc.). Cheap as
  // each pass is, with up to ~50 applications it accumulates.
  // Computed before the early returns so the hook order stays stable
  // (rules-of-hooks). The values are unused when willRedirect or
  // isLoading short-circuit below — the memo cost is negligible.
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

  // willRedirect short-circuits to a quiet spinner — no point painting
  // the bento skeleton just to immediately navigate away. isLoading
  // renders the full page skeleton so users see real geometry.
  if (willRedirect) {
    return (
      <>
        <style>{HOME_CSS}</style>
        <div className="home flex items-center justify-center h-screen">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--h-ink-faded)" }} />
        </div>
      </>
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
  const hasLinkedinBaseline = (linkedinOpts[0]?.baseline_data?.profile) != null;
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

  return (
    <>
      <style>{HOME_CSS}</style>
      <div className="home">
        {/* Top-right link to the public marketing page. /Landing (not /)
            so Landing.jsx's auth-redirect skips it. Same affordance as
            the SidebarFooter link, surfaced here because the hero had
            unused space at the top. */}
        <div className="home-topbar">
          <Link to="/Landing" className="home-about-link">
            About Get A Job
          </Link>
        </div>

        {(rolesError || appsError) && (
          <div className="home-error-banner">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Some data failed to load. Refresh the page to try again.
          </div>
        )}

        {stale && (
          <div className="home-error-banner" style={{ background: "#FFFBEB", borderColor: "#FDE68A", color: "#92400E" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Your profile changed since the last analysis.</span>
            <Link to={createPageUrl("Roadmap")} style={{ marginLeft: "auto", textDecoration: "underline" }}>
              Refresh roadmap
            </Link>
          </div>
        )}

        {/* Hero */}
        <section className="home-hero">
          <div className="home-greeting">
            {timeOfDayGreeting()}
            {profile?.full_name ? `, ${profile.full_name.split(" ")[0].toUpperCase()}` : ""}
          </div>
          <h1 className="home-headline">{pickHeadline({ profile, roles, applications })}</h1>
          <div className="home-cta-row">
            <button type="button" className="home-btn home-btn-primary" onClick={handleHero}>
              See today&apos;s action <ArrowUpRight className="w-4 h-4" />
            </button>
            <Link to={createPageUrl("Jobs")} className="home-btn home-btn-ghost">
              Browse jobs
            </Link>
          </div>
        </section>

        {/* Bento */}
        <div className="home-bento">
          {/* Today's focus — dark accent */}
          <HomeCard dark big className="home-card-focus" to={focusDestination}>
            <div className="home-card-eyebrow">TODAY&apos;S FOCUS</div>
            <div className="home-card-cta">{focusCta}</div>
            <div className="home-card-desc">{focusDesc}</div>
            <CardArrow />
          </HomeCard>

          {/* Roadmap */}
          <HomeCard className="home-card-roadmap" to={createPageUrl("Roadmap")}>
            <div className="home-card-eyebrow">ROADMAP</div>
            <div className="home-card-cta">
              {roles.length === 0 ? "Generate your roadmap" : "Open your roadmap"}
            </div>
            {roles.length > 0 && (
              <div className="home-card-tiers">
                <span className="home-track-pill"><span className="home-track-dot home-track-1" />{track1Count} T1</span>
                <span className="home-track-pill"><span className="home-track-dot home-track-2" />{track2Count} T2</span>
                <span className="home-track-pill"><span className="home-track-dot home-track-3" />{track3Count} T3</span>
              </div>
            )}
            <div className="home-card-desc">
              {roles.length === 0
                ? "Score every role in the library against your profile."
                : "See your track breakdown, fit scores, and skill gaps."}
            </div>
            <CardArrow />
          </HomeCard>

          {/* Applications */}
          <HomeCard className="home-card-apps" to={createPageUrl("Tracker")}>
            <div className="home-card-eyebrow">
              APPLICATIONS
              <span className="home-card-stat">{activeApps.length} active</span>
            </div>
            <div className="home-card-cta">
              {applications.length === 0 ? "Track your first application" : "Manage your pipeline"}
            </div>
            {recentApps.length > 0 && (
              <div className="home-card-list">
                {recentApps.map((a) => (
                  <div key={a.id} className="home-card-row">
                    <span className="label">
                      {a.company ? `${a.company} · ${a.role_title}` : a.role_title}
                    </span>
                    <span className="badge" style={statusBadgeStyle(a.status)}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
            {applications.length === 0 && (
              <div className="home-card-desc">
                Save a role from the job board to start tracking outcomes.
              </div>
            )}
            <CardArrow />
          </HomeCard>

          {/* New jobs */}
          <HomeCard className="home-card-jobs" to={createPageUrl("Jobs")}>
            <div className="home-card-eyebrow">
              NEW THIS WEEK
              <span className="home-card-stat">{newJobs.length} matches</span>
            </div>
            <div className="home-card-cta">
              {/* "no track-1 yet" copy mirrors the pre-PR-F branch that
                  inspected track1RoleTitles directly. Now we derive the
                  state from in-memory `roles` (kept by the existing
                  `roles` query) — same outcome, no waterfall. */}
              {roles.filter((r) => r.track === "track_1" && r.title).length === 0
                ? "Browse open roles"
                : "Browse jobs"}
            </div>
            {newJobs.length > 0 ? (
              <div className="home-card-list">
                {newJobs.slice(0, 3).map((j) => (
                  <div key={j.id} className="home-card-row">
                    <span className="label">{j.company_name ? `${j.company_name} · ${j.title}` : j.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="home-card-desc">
                {roles.filter((r) => r.track === "track_1" && r.title).length === 0
                  ? "Generate your roadmap first — jobs are filtered to your Track 1 roles."
                  : "No new matches in the last 7 days. Browse the full board instead."}
              </div>
            )}
            <CardArrow />
          </HomeCard>

          {/* Story bank */}
          <HomeCard className="home-card-stories" to={createPageUrl("StoryBank")}>
            <div className="home-card-eyebrow">
              STORY BANK
              <span className="home-card-stat">{storiesCount} stories</span>
              {storiesThisWeek > 0 && <span className="home-this-week">+{storiesThisWeek} this week</span>}
            </div>
            <div className="home-card-cta">
              {storiesCount === 0 ? "Capture your first story" : "Add a story"}
            </div>
            <div className="home-card-desc">
              {storiesCount === 0
                ? "Stories fuel every CV, LinkedIn post, and interview answer. Capture once, use everywhere."
                : "Each story you capture compounds across CVs, LinkedIn, and interviews."}
            </div>
            <CardArrow />
          </HomeCard>

          {/* LinkedIn */}
          <HomeCard
            className="home-card-linkedin"
            to={hasLinkedinBaseline ? `${createPageUrl("Linkedin")}?tab=posts` : `${createPageUrl("Linkedin")}?tab=profile`}
          >
            <div className="home-card-eyebrow">
              LINKEDIN
              <span className="home-card-stat">{linkedinStat}</span>
            </div>
            <div className="home-card-cta">{linkedinCta}</div>
            <div className="home-card-desc">
              {!hasLinkedinBaseline
                ? "Rewrite your headline, About, and experience bullets against your real achievements."
                : "Draft a post from your Story Bank, score a comment, or run warm outreach."}
            </div>
            <CardArrow />
          </HomeCard>
        </div>
      </div>
    </>
  );
}

// Page-level skeleton — mirrors the bento grid layout pixel-equivalent.
// Each card uses the same `home-card-*` class as the real cards so it
// occupies the same grid cell + the new min-height CSS we just added.
// That keeps CLS (cumulative layout shift) at zero when real data
// arrives: the bento doesn't reflow, only the inner skeleton lines swap
// to real content.
function HomeSkeleton() {
  return (
    <>
      <style>{HOME_CSS}</style>
      <div className="home" aria-hidden="true">
        <div className="home-topbar">
          <Skeleton className="h-3 w-28" />
        </div>

        {/* Hero placeholder */}
        <section className="home-hero">
          <Skeleton className="h-3 w-32 mx-auto mb-4" />
          <Skeleton className="h-8 w-2/3 max-w-2xl mx-auto mb-6" />
          <div className="home-cta-row">
            <Skeleton className="h-10 w-40 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </section>

        {/* Bento skeleton */}
        <div className="home-bento">
          <div className="home-card home-card-dark home-card-focus">
            <Skeleton className="h-3 w-24 bg-white/20" />
            <Skeleton className="h-5 w-2/3 bg-white/20 mt-2" />
            <Skeleton className="h-3 w-full bg-white/20 mt-2" />
            <Skeleton className="h-3 w-3/4 bg-white/20 mt-1" />
          </div>
          <div className="home-card home-card-roadmap">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-2/3 mt-2" />
            <div className="flex gap-1.5 mt-2">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-3/4 mt-2" />
          </div>
          <div className="home-card home-card-apps">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-2/3 mt-2" />
            <div className="space-y-2 mt-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          </div>
          <div className="home-card home-card-jobs">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-1/2 mt-2" />
            <div className="space-y-2 mt-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
          <div className="home-card home-card-stories">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-1/2 mt-2" />
            <Skeleton className="h-3 w-full mt-2" />
            <Skeleton className="h-3 w-2/3 mt-1" />
          </div>
          <div className="home-card home-card-linkedin">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-1/2 mt-2" />
            <Skeleton className="h-3 w-3/4 mt-2" />
          </div>
        </div>
      </div>
    </>
  );
}

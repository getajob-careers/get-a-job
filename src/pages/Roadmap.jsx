import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { invalidateAfterCareerAnalysis } from "@/lib/invalidateAfterCareerAnalysis";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Brain, AlertCircle, RefreshCw, ArrowLeft, ArrowRight, ExternalLink, MapPin, Compass } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import GeneratingBanner from "@/components/ui/GeneratingBanner";
import RoleCard from "../components/roadmap/RoleCard";
import TrackQuadrantGrid from "../components/roadmap/TrackQuadrantGrid";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { inferExperienceLevel, allowedSenioritiesForLevel } from "@/lib/experienceLevel";
import { track, EVENTS } from "@/lib/analytics";
import { TRACK_CONFIG, TRACK_ORDER, TRACKS } from "@/lib/trackConfig";
import { ROADMAP_CSS } from "../components/roadmap/roadmapStyles";

const ROADMAP_MESSAGES = [
  "Searching LinkedIn & Glassdoor for real job postings…",
  "Matching your skills to market requirements…",
  "Calculating skill match scores per role…",
  "Identifying your skill gaps…",
  "Classifying roles into tracks…",
  "Ranking roles by readiness & alignment…",
  "Almost done — finalising your roadmap…",
];

// Trigram similarity threshold for track-mode job-board search. Matches the
// value used in JobSuggestions.jsx — keep them in sync.
const TRACK_SIMILARITY_THRESHOLD = 0.3;
const OVERVIEW_TRACK_JOBS_LIMIT = 5;
const OVERVIEW_TIER1_TITLES_PREVIEW = 3;

const TAB_ORDER = ["overview", "why", ...TRACK_ORDER];

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

  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfileQuery(user?.id);

  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: educations = [] } = useEducationQuery(user?.id);

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

  const stale = isAnalysisStale({ profile, experiences, certifications, projects });

  const track1 = roles.filter((r) => r.track === "track_1");
  const track2 = roles.filter((r) => r.track === "track_2");
  const track3 = roles.filter((r) => r.track === "track_3");
  const byTrack = { track_1: track1, track_2: track2, track_3: track3 };

  // Live DB check confirmed (2026-05-20) that no role has ever landed
  // outside track_1/2/3 across all users — the LLM prompt enforces the
  // enum. We dropped the visible "uncategorized" fallback section and
  // warn here instead, so LLM drift surfaces in dev/QA logs without
  // confusing users.
  useEffect(() => {
    const uncategorized = roles.filter((r) => !TRACK_ORDER.includes(r.track));
    if (uncategorized.length > 0) {
      console.warn("[roadmap] uncategorized roles surfaced — LLM drift?", {
        count: uncategorized.length,
        tracks: [...new Set(uncategorized.map((r) => r.track))],
      });
    }
  }, [roles]);

  const experienceLevel = inferExperienceLevel(experiences, educations);
  const allowedSeniorities = allowedSenioritiesForLevel(experienceLevel);

  const track1RoleTitles = track1.map((r) => r.title).filter(Boolean);
  const profileWorkTypes = Array.isArray(profile?.work_type) ? profile.work_type : [];
  const { data: tier1Jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["roadmap_tier1_jobs", user?.id, track1RoleTitles.join("|"), allowedSeniorities.join(","), profileWorkTypes.join(",")],
    enabled: !!user?.id && track1RoleTitles.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("search_jobs_by_role_titles", {
          p_role_titles: track1RoleTitles,
          p_limit: OVERVIEW_TRACK_JOBS_LIMIT,
          p_offset: 0,
          p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
          p_max_seniority: allowedSeniorities,
          p_work_types: profileWorkTypes.length > 0 ? profileWorkTypes : null,
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
        // force:true bypasses the input-hash cache so the Refresh button
        // always regenerates. Cache check only kicks in for automatic /
        // background recompute paths (none today; reserved for future).
        body: JSON.stringify({
          dream_roles: profile?.five_year_role ? [profile.five_year_role] : [],
          force: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.msg || `HTTP ${response.status}`);
      if (data?.error) throw new Error(data.error);

      // cached:true should be impossible here because we sent force:true,
      // but defensively handle it: skip the writes + invalidations and
      // treat as a successful no-op. (Logging because it'd indicate a
      // server-side bug.)
      if (data?.cached) {
        console.warn("[career-roadmap] unexpected cached:true on force-refresh — skipping rewrite");
        track(EVENTS.CAREER_ANALYSIS_REFRESHED, { role_count: 0, cached: true });
      } else if (data?.roles?.length > 0) {
        const rolesPayload = data.roles.map((r) => ({
          title: r.title,
          track: r.track,
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
          // Forwarded from the edge function; written to function_cache
          // atomically with the career_roles rows so a future call with
          // the same inputs can short-circuit. See PR B.
          p_input_hash: data?.input_hash || null,
        });
        if (rpcError) throw rpcError;
        track(EVENTS.CAREER_ANALYSIS_REFRESHED, { role_count: rolesPayload.length, cached: false });

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

      // Single source of truth for the post-career-analysis invalidation
      // set. await ensures the cache is fresh before the toast fires (so
      // any follow-on navigation sees the new data, not the old).
      await invalidateAfterCareerAnalysis(queryClient, user.id);
      toast.success("Analysis refreshed.");
    } catch (err) {
      console.error("Roadmap generation error:", err);
      toast.error(`Failed to generate roadmap: ${err.message || "Please try again."}`);
    } finally {
      setGenerating(false);
    }
  };

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
              <p className="rm-sub">Your career-direction fit, by role. For specific job openings to apply to, see <Link to={createPageUrl("Jobs")} className="underline hover:text-[#0E1014]">Jobs</Link>.</p>
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

          {/* Loading skeleton — replaces both the empty states and the
              tabs/roles list while either query is in flight. */}
          {(isLoading || profileLoading) && <RoadmapSkeleton />}

          {/* Empty states */}
          {!isLoading && !profileLoading && !profile && (
            <div className="rm-card-lg rm-card text-center">
              <Compass className="w-10 h-10 text-[#F87060] mx-auto mb-3" />
              <h2 className="rm-h1" style={{ fontSize: 20 }}>Set up your profile first</h2>
              <p className="rm-sub max-w-md mx-auto">We need your background before we can build your roadmap.</p>
              <Link to={createPageUrl("Profile")} className="rm-btn rm-btn-primary mt-5 inline-flex">
                Add information <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          {!isLoading && !profileLoading && roles.length === 0 && profile && (
            <div className="rm-card-lg rm-card text-center">
              <Brain className="w-10 h-10 text-[#F87060] mx-auto mb-3" />
              <h2 className="rm-h1" style={{ fontSize: 20 }}>No roles generated yet</h2>
              <p className="rm-sub max-w-md mx-auto">Hit &quot;Build my roadmap&quot; to analyse your profile and create your track-classified career map.</p>
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
                Your profile has changed since this analysis was generated. Refresh to see updated tracks.
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
                  How tracks work
                </button>
                {TRACK_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    className="rm-tab"
                    onClick={() => setTab(id)}
                  >
                    Track {TRACK_CONFIG[id].number}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <OverviewTab
                  profile={profile}
                  track1={track1}
                  tier1Jobs={tier1Jobs}
                  jobsLoading={jobsLoading}
                  onJumpToTier1={() => setTab("track_1")}
                />
              )}
              {activeTab === "why" && <WhyTab />}
              {TRACK_ORDER.includes(activeTab) && (
                <TrackTab track={activeTab} roles={byTrack[activeTab]} onTabChange={setTab} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ───── Overview tab ─────

function OverviewTab({ profile, track1, tier1Jobs, jobsLoading, onJumpToTier1 }) {
  const tier1Preview = track1.slice(0, OVERVIEW_TIER1_TITLES_PREVIEW);
  const tier1Extra = Math.max(0, track1.length - OVERVIEW_TIER1_TITLES_PREVIEW);

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
        {/* Track 1 preview card — count + top 3 titles, jumps to track_1 tab */}
        <div className="rm-card rm-track-green">
          <div className="flex items-center justify-between mb-3">
            <p className="rm-eyebrow">Track 1 · Sweet spot</p>
            <span className="rm-track-pill">
              <span className="rm-track-badge" style={{ width: 16, height: 16, fontSize: 10 }}>1</span>
              {track1.length}
            </span>
          </div>
          {tier1Preview.length === 0 ? (
            <p className="text-sm text-[#9C9DA1]">No Track 1 roles surfaced yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm text-[#0E1014]">
              {tier1Preview.map((r) => (
                <li key={r.id} className="truncate">{r.title}</li>
              ))}
            </ul>
          )}
          {track1.length > 0 && (
            <button
              onClick={onJumpToTier1}
              className="mt-3 text-xs text-[#52545A] hover:text-[#0E1014] underline underline-offset-2"
            >
              {tier1Extra > 0 ? `View all ${track1.length} →` : "View details →"}
            </button>
          )}
        </div>

        {/* Live Track 1 job matches from public.jobs */}
        <div className="rm-card">
          <div className="flex items-center justify-between mb-3">
            <p className="rm-eyebrow">Live Track 1 matches</p>
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

// ───── How tracks work tab ─────

function WhyTab() {
  return (
    <div className="rm-card rm-card-lg flex flex-col gap-6">
      <div>
        <h2 className="rm-h1" style={{ fontSize: 20 }}>How tracks work</h2>
        <p className="rm-sub mt-2">
          Every role is scored on two axes: <span className="font-semibold text-[#0E1014]">how qualified you are now</span>{" "}
          and <span className="font-semibold text-[#0E1014]">how well it fits the career path you described</span>.
          The combination places each role in one of three tracks.
        </p>
      </div>
      <div className="flex justify-center pt-1">
        <TrackQuadrantGrid />
      </div>
      <div className="border-t border-[#E8E8E5] pt-5 flex flex-col gap-3">
        {TRACKS.map((track) => (
          <p key={track.id} className="text-sm text-[#52545A] leading-relaxed">
            <span className={`rm-track-${track.color} inline-flex items-center gap-2 mr-2`}>
              <span className="rm-track-badge">{track.number}</span>
              <span className="font-semibold text-[#0E1014]">Track {track.number} · {track.name}</span>
            </span>
            — {track.description}
          </p>
        ))}
        <p className="text-xs text-[#9C9DA1] mt-2">
          Roles you&apos;re neither qualified for nor on-path for are filtered out of your feed entirely.
        </p>
      </div>
    </div>
  );
}

// ───── Per-track tab ─────

function TrackTab({ track, roles, onTabChange }) {
  const cfg = TRACK_CONFIG[track];
  const trackIdx = TRACK_ORDER.indexOf(track);
  const prevTrack = trackIdx > 0 ? TRACK_ORDER[trackIdx - 1] : null;
  const nextTrack = trackIdx < TRACK_ORDER.length - 1 ? TRACK_ORDER[trackIdx + 1] : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Track header card — restates what the track means so users can
          re-read the framing without leaving the tab. */}
      <div className={`rm-card rm-track-${cfg.color} flex items-start gap-3`}>
        <div className="rm-track-badge mt-0.5">{cfg.number}</div>
        <div>
          <p className="font-semibold text-[#0E1014]">Track {cfg.number} · {cfg.name}</p>
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

      {/* Arrow nav between track tabs */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E5]">
        <button
          onClick={() => prevTrack && onTabChange(prevTrack)}
          disabled={!prevTrack}
          className="rm-btn rm-btn-outline rm-btn-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {prevTrack ? `Track ${TRACK_CONFIG[prevTrack].number}` : "Track 1"}
        </button>
        <button
          onClick={() => nextTrack && onTabChange(nextTrack)}
          disabled={!nextTrack}
          className="rm-btn rm-btn-outline rm-btn-sm"
        >
          {nextTrack ? `Track ${TRACK_CONFIG[nextTrack].number}` : "Track 3"}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Roadmap-body skeleton — renders in place of the tabs + roles list while
// the careerRoles / profile queries are loading. Header stays visible
// throughout so the page identity is stable. 3 placeholder role cards
// mirror the typical row count above the fold.
function RoadmapSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {/* tab bar placeholder */}
      <div className="flex gap-2 mb-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      {/* role card placeholders */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-[#DDDDDB] px-5 py-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { invalidateAfterCareerAnalysis } from "@/lib/invalidateAfterCareerAnalysis";
import { runCareerAnalysisAndReplaceRoles } from "@/lib/careerAnalysis";
import { Link } from "react-router-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Loader2,
  Brain,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Compass,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import GeneratingBanner from "@/components/ui/GeneratingBanner";
import RoleCard from "../components/roadmap/RoleCard";
import TrackQuadrantGrid from "../components/roadmap/TrackQuadrantGrid";
import { isAnalysisStale } from "@/lib/staleAnalysis";
import { track, EVENTS } from "@/lib/analytics";
import { TRACK_CONFIG, TRACK_ORDER } from "@/lib/trackConfig";

// PR 3C — Roadmap restyle on rd tokens. Behavioural-preservation contract
// (P1–P17) is enforced verbatim:
//   - P1 handleGenerate flow (force:true, replace_career_roles RPC,
//     profile stamp, invalidateAfterCareerAnalysis fan-out) — unchanged.
//   - P4 URL-driven tab state — preserved; default changed from
//     "overview" to "why" per the spec.
//   - P6/P7 isAnalysisStale trigger + gating — unchanged.
//   - P8 client reads `r.track` directly; no client-side re-tracking.
//   - P9 TRACK_CONFIG remains the single source of truth.
//   - P10–P13 canonical query hooks + invalidation helper untouched.

const ROADMAP_MESSAGES = [
  "Reading your profile & career goals…",
  "Matching your skills to market requirements…",
  "Calculating skill match scores per role…",
  "Identifying your skill gaps…",
  "Classifying roles into tracks…",
  "Ranking roles by readiness & alignment…",
  "Almost done - finalising your roadmap…",
];

// PR 3C: Overview tab dropped. Default lands on the "How tracks work"
// quadrant. TAB_ORDER stays URL-stable; old `?tab=overview` URLs fall
// through to the default below.
const TAB_ORDER = ["why", ...TRACK_ORDER];
const DEFAULT_TAB = "why";

export default function CareerRoadmap() {
  const queryClient = useQueryClient();
  const navigate = useNavigate(); // eslint-disable-line no-unused-vars
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [generating, setGenerating] = useState(false);

  // P4: tab routing preserved (push, not replace). Default flips from
  // "overview" to "why". Invalid / legacy "overview" URLs fall through
  // to the default.
  const tabParam = searchParams.get("tab");
  const activeTab = TAB_ORDER.includes(tabParam) ? tabParam : DEFAULT_TAB;
  const setTab = (next) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: false });
  };

  // Preview hatch — `?preview-generating=1` lets the harness paint the
  // GeneratingBanner state without invoking the edge function. Inert in
  // prod (the flag is never set there).
  const previewGenerating = (() => {
    try {
      return new URLSearchParams(window.location.search).get("preview-generating") === "1";
    } catch {
      return false;
    }
  })();
  const generatingState = generating || previewGenerating;

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
  // eslint-disable-next-line no-unused-vars
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

  // P8: track filter reads `r.track` directly; no client-side re-tracking.
  const track1 = roles.filter((r) => r.track === "track_1");
  const track2 = roles.filter((r) => r.track === "track_2");
  const track3 = roles.filter((r) => r.track === "track_3");
  const byTrack = { track_1: track1, track_2: track2, track_3: track3 };

  // P10: uncategorized-roles dev warning (no UI surface — `track_x` is
  // enforced server-side; warn here so LLM drift surfaces in logs).
  useEffect(() => {
    const uncategorized = roles.filter((r) => !TRACK_ORDER.includes(r.track));
    if (uncategorized.length > 0) {
      console.warn("[roadmap] uncategorized roles surfaced — LLM drift?", {
        count: uncategorized.length,
        tracks: [...new Set(uncategorized.map((r) => r.track))],
      });
    }
  }, [roles]);

  // P1: handleGenerate flow — runCareerAnalysisAndReplaceRoles (force:true)
  // does the refreshSession → POST generate-career-analysis → defensive
  // cached:true branch → replace_career_roles RPC with the full 12-field
  // payload; the caller keeps its CAREER_ANALYSIS_REFRESHED events + profile
  // stamp (last_reality_check_date, qualification_level, overall_assessment,
  // skill_gaps) → invalidateAfterCareerAnalysis. Behavior preserved.
  const handleGenerate = async () => {
    if (!profile) return;
    setGenerating(true);
    try {
      const { data, rolesWritten } = await runCareerAnalysisAndReplaceRoles({
        userId: user.id,
        dreamRoles: profile?.five_year_role ? [profile.five_year_role] : [],
        force: true,
      });

      if (data?.cached) {
        console.warn("[career-roadmap] unexpected cached:true on force-refresh — skipping rewrite");
        track(EVENTS.CAREER_ANALYSIS_REFRESHED, { role_count: 0, cached: true });
      } else if (rolesWritten > 0) {
        track(EVENTS.CAREER_ANALYSIS_REFRESHED, { role_count: rolesWritten, cached: false });

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
          toast.error("Roles updated but profile didn't fully save - try Refresh again, or contact support.");
        }
      }

      await invalidateAfterCareerAnalysis(queryClient, user.id);
      toast.success("Analysis refreshed.");
    } catch (err) {
      console.error("Roadmap generation error:", err);
      // The function returns a retryable 503 { error: "analysis_timeout" } when
      // it hits its ~80s deadline. Surface calm copy; the Refresh button the
      // user already clicked is the retry affordance.
      if (err?.message === "analysis_timeout") {
        toast.error("Analysis is taking longer than usual. Tap Refresh to try again.");
      } else {
        toast.error(`Failed to generate roadmap: ${err.message || "Please try again."}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  if (rolesError || profileError) {
    return (
      <div className="min-h-full flex items-center justify-center px-6 bg-rd-bg-page">
        <div className="max-w-md flex items-center gap-2.5 rounded-[14px] border border-rd-error-border bg-rd-error-bg px-4 py-3 text-[13px] text-rd-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Failed to load your career roadmap. Refresh the page to try again.</span>
        </div>
      </div>
    );
  }

  const counts = {
    track_1: track1.length,
    track_2: track2.length,
    track_3: track3.length,
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      {/* Header — serif wordmark, Refresh button, last-updated stamp.
          Subtitle dropped per the 3C spec. */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Roadmap
          </p>
          <h1 className="font-display font-extrabold text-[32px] sm:text-[36px] leading-[1.08] tracking-tight text-rd-text mt-1">
            Career roadmap
          </h1>
          {profile?.last_reality_check_date && roles.length > 0 && (
            <p className="text-[11.5px] text-rd-text-secondary mt-2 font-mono">
              Last updated · {new Date(profile.last_reality_check_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </p>
          )}
        </div>
        {profile && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analysing…
              </>
            ) : roles.length > 0 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </>
            ) : (
              <>
                <Brain className="w-3.5 h-3.5" />
                Generate roadmap
              </>
            )}
          </button>
        )}
      </div>

      {/* Qualification + Assessment band — relocated from the dropped
          Overview tab. Visible on every tab so the user's anchor context
          travels with them. */}
      {profile && (profile.qualification_level || profile.overall_assessment) && roles.length > 0 && (
        <QualificationBand profile={profile} />
      )}

      {generatingState && (
        <div className="mt-7">
          <GeneratingBanner
            messages={ROADMAP_MESSAGES}
            subtitle={
              roles.length > 0
                ? "Refreshing your roadmap - this can take up to about 80 seconds"
                : "Generating your roadmap - this can take up to about 80 seconds"
            }
          />
        </div>
      )}

      {(isLoading || profileLoading) && <RoadmapSkeleton />}

      {!isLoading && !profileLoading && !profile && <EmptyNoProfile />}
      {!isLoading && !profileLoading && roles.length === 0 && profile && (
        <EmptyNoRoles onGenerate={handleGenerate} generating={generating} />
      )}

      {/* P6/P7: stale banner gated on `stale && roles.length > 0 &&
          !generating`. */}
      {stale && roles.length > 0 && !generating && (
        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap rounded-[14px] border border-rd-golden bg-rd-golden-tint px-4 py-3 text-[13px] text-rd-golden-dark">
          <p className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Your profile has changed since this analysis was generated. Refresh to see updated tracks.</span>
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-bold text-[12px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-3.5 py-1.5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh now
          </button>
        </div>
      )}

      {roles.length > 0 && (
        <div
          className={
            generatingState
              ? "opacity-40 pointer-events-none transition-opacity duration-300"
              : "transition-opacity duration-300"
          }
          aria-hidden={generatingState || undefined}
        >
          <TabBar activeTab={activeTab} setTab={setTab} />
          {activeTab === "why" && <WhyTab onTrackClick={setTab} counts={counts} />}
          {TRACK_ORDER.includes(activeTab) && (
            <TrackTab track={activeTab} roles={byTrack[activeTab]} onTabChange={setTab} />
          )}
        </div>
      )}
    </div>
  );
}

// ───── Header band: qualification + assessment ─────

function QualificationBand({ profile }) {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-[18px] border border-rd-border bg-rd-bg-card p-5 shadow-rd">
      {profile.qualification_level && (
        <div className="md:col-span-1">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Qualification level
          </p>
          <p className="font-display font-bold text-[15px] text-rd-text leading-snug mt-1.5">
            {profile.qualification_level}
          </p>
        </div>
      )}
      {profile.overall_assessment && (
        <div className={profile.qualification_level ? "md:col-span-2" : "md:col-span-3"}>
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Assessment
          </p>
          <p className="text-[13px] text-rd-text-secondary leading-[1.6] mt-1.5">
            {profile.overall_assessment}
          </p>
        </div>
      )}
    </div>
  );
}

// ───── Tabs ─────

function TabBar({ activeTab, setTab }) {
  return (
    <div
      role="tablist"
      aria-label="Career roadmap sections"
      className="mt-7 flex items-end gap-6 border-b border-rd-border overflow-x-auto"
    >
      <Tab active={activeTab === "why"} onClick={() => setTab("why")}>
        How tracks work
      </Tab>
      {TRACK_ORDER.map((id) => (
        <Tab
          key={id}
          active={activeTab === id}
          onClick={() => setTab(id)}
        >
          Track {TRACK_CONFIG[id].number}
        </Tab>
      ))}
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "pb-2.5 -mb-px font-display font-semibold text-[14px] whitespace-nowrap transition-colors duration-150",
        active
          ? "text-rd-text border-b-[2.5px] border-rd-primary"
          : "text-rd-text-tertiary hover:text-rd-text border-b-[2.5px] border-transparent",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ───── How tracks work tab ─────

function WhyTab({ onTrackClick, counts }) {
  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="rounded-[14px] bg-rd-bg-soft px-4 py-3">
        <p className="text-[13px] text-rd-text-secondary leading-[1.55]">
          Every role is placed by two things - how{" "}
          <span className="font-display font-bold text-rd-text">qualified</span> you
          are now, and how well it{" "}
          <span className="font-display font-bold text-rd-text">moves you toward your goal</span>.
        </p>
      </div>
      <div className="flex justify-center pt-2">
        <TrackQuadrantGrid onTrackClick={onTrackClick} counts={counts} />
      </div>
      <p className="text-center text-[12px] text-rd-text-secondary mt-2">
        Tap a track to see your suggested roles.
      </p>
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
    <div className="mt-6 flex flex-col gap-5">
      {/* Track header card — restates what the track means so users can
          re-read the framing without leaving the tab. */}
      <TrackHeaderCard cfg={cfg} />

      {roles.length === 0 ? (
        <div className="rounded-[18px] border border-rd-border bg-rd-bg-card px-5 py-6 shadow-rd text-center">
          <p className="text-[13px] text-rd-text-secondary leading-[1.6]">
            {cfg.emptyCopy}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      )}

      {/* Arrow nav between track tabs */}
      <div className="flex items-center justify-between pt-2 border-t border-rd-border-subtle">
        <button
          type="button"
          onClick={() => prevTrack && onTabChange(prevTrack)}
          disabled={!prevTrack}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-display font-semibold text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-3.5 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {prevTrack ? `Track ${TRACK_CONFIG[prevTrack].number}` : "Track 1"}
        </button>
        <button
          type="button"
          onClick={() => nextTrack && onTabChange(nextTrack)}
          disabled={!nextTrack}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-display font-semibold text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-3.5 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {nextTrack ? `Track ${TRACK_CONFIG[nextTrack].number}` : "Track 3"}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Track header — the rd-token equivalent of the legacy "track-color
// stripe" header. Same content (badge + name + description) reframed
// against the warm palette.
function TrackHeaderCard({ cfg }) {
  const TINT = {
    coral:  "var(--rd-primary-tint)",
    teal:   "var(--rd-teal-tint)",
    golden: "var(--rd-golden-tint)",
  };
  const BADGE_BG = {
    coral:  "var(--rd-primary)",
    teal:   "var(--rd-teal)",
    golden: "var(--rd-golden)",
  };
  const ACCENT = {
    coral:  "var(--rd-primary-dark)",
    teal:   "var(--rd-teal-dark)",
    golden: "var(--rd-golden-dark)",
  };
  const tint = TINT[cfg.rdColor] || TINT.coral;
  const badge = BADGE_BG[cfg.rdColor] || BADGE_BG.coral;
  const accent = ACCENT[cfg.rdColor] || ACCENT.coral;

  return (
    <div
      className="rounded-[18px] px-5 py-4 flex items-start gap-3 border border-rd-border"
      style={{ background: tint }}
    >
      <span
        aria-hidden="true"
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: badge }}
      >
        <span className="font-display font-extrabold text-[14px] text-white leading-none">
          {cfg.number}
        </span>
      </span>
      <div>
        <p
          className="font-display font-bold text-[15px] leading-snug"
          style={{ color: accent }}
        >
          Track {cfg.number} · {cfg.name}
        </p>
        <p className="text-[13px] text-rd-text-secondary leading-[1.6] mt-1">
          {cfg.description}
        </p>
      </div>
    </div>
  );
}

// ───── Empty states ─────

function EmptyNoProfile() {
  return (
    <div className="mt-7 rounded-[18px] border border-rd-border bg-rd-bg-card p-8 shadow-rd text-center">
      <Compass className="w-10 h-10 text-rd-primary mx-auto mb-3" />
      <h2 className="font-display font-extrabold text-[22px] text-rd-text">
        Set up your profile first
      </h2>
      <p className="text-[13.5px] text-rd-text-secondary max-w-md mx-auto mt-2">
        We need your background before we can build your roadmap.
      </p>
      <Link
        to={createPageUrl("Profile")}
        className="mt-5 inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-5 py-2.5 transition-colors"
      >
        Add information <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function EmptyNoRoles({ onGenerate, generating }) {
  return (
    <div className="mt-7 rounded-[18px] border border-rd-border bg-rd-bg-card p-8 shadow-rd text-center">
      <Brain className="w-10 h-10 text-rd-primary mx-auto mb-3" />
      <h2 className="font-display font-extrabold text-[22px] text-rd-text">
        No roles generated yet
      </h2>
      <p className="text-[13.5px] text-rd-text-secondary max-w-md mx-auto mt-2">
        Hit &quot;Build my roadmap&quot; to analyse your profile and create your
        track-classified career map.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="mt-5 inline-flex items-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-5 py-2.5 transition-colors"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Building…
          </>
        ) : (
          <>
            <Brain className="w-3.5 h-3.5" />
            Build my roadmap
          </>
        )}
      </button>
    </div>
  );
}

// Body skeleton — replaces the tab bar + role list while either query is
// in flight. Header stays visible throughout so page identity is stable.
function RoadmapSkeleton() {
  return (
    <div className="mt-7 flex flex-col gap-4" aria-hidden="true">
      <div className="flex gap-5 border-b border-rd-border pb-2.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-rd-bg-card rounded-[18px] border border-rd-border px-5 py-4 space-y-3 shadow-rd"
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

// CV tab content for the 3-tab homepage demo (Home3TabPreview.jsx).
//
// Center column reuses the REAL CV studio as-is (CVStudioLive - already
// "Layout-LESS on purpose" per its own header comment, built to be mounted
// standalone). Left-bottom reuses the REAL docked coach chat (CoachDock -
// reads/writes CoachConversationProvider, which Layout.jsx already mounts,
// so this is live, not a stub). Right column is new: a compact "top
// matches" list built from the same data hooks + picks/stretch sectioning
// UnifiedJobsFeed.jsx uses, rendered with the existing JobGridCard, opening
// the existing JobDetailModal (which already has a real Track action via
// addJobToTracker). "Tailor CV" has no existing standalone entry point from
// a bare job row (today it only exists inside CVStudioLive's own "Tailor to
// a job" flow, which expects a tracked application, not a raw feed job) -
// per investigation, that's a visual stub here, called out as such.

import React, { useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Linkedin,
  BookOpen,
  FileStack,
  IdCard,
  Columns3,
  Compass,
  Loader2,
  AlertCircle,
  Check,
  Plus,
  Wand2,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import CVStudioLive from "@/components/cv-studio/CVStudioLive";
import CoachDock from "@/components/agent/CoachDock";
import JobGridCard from "@/components/jobs/JobGridCard";
import JobDetailModal from "@/components/jobs/JobDetailModal";
import { addJobToTracker } from "@/components/jobs/JobCard";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { useCareerRolesQuery } from "@/lib/queries/useCareerRoles";
import {
  inferExperienceLevel,
  allowedSenioritiesForLevel,
} from "@/lib/experienceLevel";
import { TRACK_CONFIG, TRACK_ORDER } from "@/lib/trackConfig";
import { scoreJobFit } from "@/lib/scoreJobFit";
import {
  UNIFIED_MAX_ROLES,
  TRACK_SIMILARITY_THRESHOLD,
  JOBS_SELECT_LIGHT,
  stretchAwareSeniorityFor,
} from "@/lib/jobsFeed";
import { CANVAS_FIXTURES } from "./canvas/canvasConfig";
import { useCursorMagnet } from "./canvas/useCursorMagnet";
import CanvasCoachDock from "./canvas/CanvasCoachDock";
import CanvasCvDocument from "./canvas/CanvasCvDocument";
import { CanvasTopMatches } from "./canvas/CanvasMatches";

const TOP_MATCHES_FETCH_SIZE = 30;
const TOP_MATCHES_SHOWN = 6;

const ICON_TILES = (onSwitchTab) => [
  {
    id: "linkedin",
    label: "LinkedIn tools",
    icon: Linkedin,
    href: createPageUrl("Linkedin"),
  },
  {
    id: "storybank",
    label: "Story bank",
    icon: BookOpen,
    href: createPageUrl("StoryBank"),
  },
  {
    id: "cvbank",
    label: "CV bank",
    icon: FileStack,
    href: createPageUrl("CVAgent"),
  },
  {
    id: "profile",
    label: "Profile",
    icon: IdCard,
    href: createPageUrl("Profile"),
  },
  {
    id: "tracker",
    label: "Tracker",
    icon: Columns3,
    onClick: () => onSwitchTab?.("tracker"),
  },
  {
    id: "jobs",
    label: "Browse jobs",
    icon: Compass,
    onClick: () => onSwitchTab?.("jobs"),
  },
];

export default function Home3TabCvTab({ onSwitchTab }) {
  return (
    <div className="flex flex-col md:flex-row gap-4 h-full min-h-0">
      {/* Left - icon grid (top) + coach dock (bottom) */}
      <div className="w-full md:w-[220px] flex-shrink-0 flex flex-col gap-4 md:h-full min-h-0">
        <IconGrid tiles={ICON_TILES(onSwitchTab)} />
        <div className="flex-1 min-h-[280px] md:min-h-0 bg-rd-bg-sidebar rounded-[16px] flex flex-col">
          {CANVAS_FIXTURES ? <CanvasCoachDock /> : <CoachDock />}
        </div>
      </div>

      {/* Center - CV studio (live) or fixture master-CV document (canvas) */}
      <div className="w-full md:flex-1 min-w-0 md:h-full md:overflow-y-auto bg-rd-bg-card border border-rd-border-subtle rounded-[16px]">
        {CANVAS_FIXTURES ? <CanvasCvDocument /> : <CVStudioLive />}
      </div>

      {/* Right - compact top-matches list */}
      <div className="w-full md:w-[320px] flex-shrink-0 md:h-full md:overflow-y-auto">
        {CANVAS_FIXTURES ? <CanvasTopMatches /> : <TopMatchesPanel />}
      </div>
    </div>
  );
}

// ───── Left: icon grid ─────

function IconGrid({ tiles }) {
  // Cursor-magnet: tiles lean toward the pointer (Part 3 reconstruction).
  const { containerRef, registerTile } = useCursorMagnet();
  return (
    <div ref={containerRef} className="grid grid-cols-3 gap-2">
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        const content = (
          <>
            <Icon
              className="w-4 h-4 text-rd-text-secondary group-hover:text-rd-text transition-colors"
              aria-hidden="true"
            />
            <span className="text-[10px] font-display font-semibold text-rd-text-secondary group-hover:text-rd-text leading-tight text-center transition-colors">
              {tile.label}
            </span>
          </>
        );
        const className =
          "group flex flex-col items-center justify-center gap-1.5 aspect-square rounded-[12px] bg-rd-bg-card border border-rd-border hover:border-rd-border-hover hover:bg-rd-bg-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-teal focus-visible:ring-offset-2 p-2";
        // Yishai's exact transform ease (.35s cubic-bezier) for the lean;
        // colours keep the quick 150ms. will-change hints the compositor.
        const style = {
          transition:
            "transform .35s cubic-bezier(.22,.61,.36,1), border-color .15s ease, background-color .15s ease",
          willChange: "transform",
        };
        if (tile.href) {
          return (
            <Link
              key={tile.id}
              ref={registerTile(i)}
              to={tile.href}
              className={className}
              style={style}
            >
              {content}
            </Link>
          );
        }
        return (
          <button
            key={tile.id}
            ref={registerTile(i)}
            type="button"
            onClick={tile.onClick}
            className={className}
            style={style}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

// ───── Right: top matches (mirrors UnifiedJobsFeed's fetch + gate + sort +
// picks/stretch sectioning, trimmed to a single compact reveal for this
// panel - no pagination, no search tab) ─────

function useTopMatches() {
  const { user } = useAuth();
  const { data: profile } = useProfileQuery(user?.id);
  const { data: experiences = [] } = useExperiencesQuery(user?.id);
  const { data: educations = [] } = useEducationQuery(user?.id);
  const { data: careerRoles = [] } = useCareerRolesQuery(user?.id, { profile });

  const experienceLevel = useMemo(
    () => inferExperienceLevel(experiences, educations),
    [experiences, educations],
  );
  const allowedSeniorities = useMemo(
    () => allowedSenioritiesForLevel(experienceLevel),
    [experienceLevel],
  );

  const rolesByTrack = useMemo(() => {
    const groups = { track_1: [], track_2: [], track_3: [] };
    for (const r of careerRoles) {
      if (!r?.title || !groups[r.track]) continue;
      groups[r.track].push(r);
    }
    for (const t of TRACK_ORDER) {
      groups[t].sort(
        (a, b) =>
          (Number(b.readiness_score) || 0) - (Number(a.readiness_score) || 0),
      );
    }
    return groups;
  }, [careerRoles]);

  const unionedRoles = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const t of TRACK_ORDER) {
      for (const r of rolesByTrack[t] || []) {
        if (!r?.title || seen.has(r.title)) continue;
        seen.add(r.title);
        out.push(r.title);
        if (out.length >= UNIFIED_MAX_ROLES) break;
      }
      if (out.length >= UNIFIED_MAX_ROLES) break;
    }
    return out;
  }, [rolesByTrack]);

  const jobsQuery = useQuery({
    queryKey: ["home3tabTopMatches", user?.id, unionedRoles.join("|")],
    queryFn: async () => {
      const stretchSeniorities = stretchAwareSeniorityFor(allowedSeniorities);
      const workTypes = Array.isArray(profile?.work_type)
        ? profile.work_type
        : [];
      const { data, error } = await supabase
        .rpc("search_jobs_by_role_titles", {
          p_role_titles: unionedRoles,
          p_limit: TOP_MATCHES_FETCH_SIZE,
          p_offset: 0,
          p_similarity_threshold: TRACK_SIMILARITY_THRESHOLD,
          p_max_seniority: stretchSeniorities,
          p_work_types: workTypes.length > 0 ? workTypes : null,
        })
        .select(JOBS_SELECT_LIGHT);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && unionedRoles.length > 0,
  });

  const jobs = jobsQuery.data || [];

  const scoredById = useMemo(() => {
    if (!profile || jobs.length === 0) return {};
    const out = {};
    for (const job of jobs) {
      out[job.id] = scoreJobFit({ profile, experiences, educations }, job);
    }
    return out;
  }, [profile, experiences, educations, jobs]);

  const sectioned = useMemo(() => {
    if (jobs.length === 0 || !profile) return { picks: [], stretch: [] };
    const rankRel = { primary: 0, adjacent: 1, unknown: 2 };
    const gated = jobs.filter((job) => {
      const r = scoredById[job.id];
      if (!r) return false;
      return r.relevance_match && r.relevance_match !== "off";
    });
    gated.sort((a, b) => {
      const ra = rankRel[scoredById[a.id].relevance_match];
      const rb = rankRel[scoredById[b.id].relevance_match];
      if (ra !== rb) return ra - rb;
      const aa = scoredById[a.id].attainability_score ?? 0;
      const ab = scoredById[b.id].attainability_score ?? 0;
      return ab - aa;
    });
    const shown = gated.slice(0, TOP_MATCHES_SHOWN);
    const picks = [];
    const stretch = [];
    for (const job of shown) {
      const b = scoredById[job.id]?.attainability_band;
      if (b === "strong" || b === "good") picks.push(job);
      else stretch.push(job);
    }
    return { picks, stretch };
  }, [jobs, scoredById, profile]);

  return {
    ...sectioned,
    scoredById,
    isLoading: jobsQuery.isLoading,
    isError: jobsQuery.isError,
    noRoles: unionedRoles.length === 0,
  };
}

function TopMatchesPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { picks, stretch, scoredById, isLoading, isError, noRoles } =
    useTopMatches();
  const [openJob, setOpenJob] = useState(null);
  const [trackedIds, setTrackedIds] = useState(() => new Set());
  const [trackingId, setTrackingId] = useState(null);

  const handleTrack = useCallback(
    async (job, scoreResult) => {
      setTrackingId(job.id);
      const res = await addJobToTracker({
        user,
        queryClient,
        job,
        scoreResult,
      });
      setTrackingId(null);
      if (res?.error) {
        toast.error("Couldn't add to your pipeline. Try again.");
        return;
      }
      if (res?.duplicate) {
        toast.info("Already in your pipeline.");
      } else {
        toast.success("Added to your pipeline.");
      }
      setTrackedIds((prev) => new Set(prev).add(job.id));
    },
    [user, queryClient],
  );

  const handleTailorStub = () => {
    toast.info(
      "Tailor CV from here isn't wired up yet in this prototype - use the CV studio's \"Tailor to a job\" flow for now.",
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display font-bold text-[14px] text-rd-text px-0.5">
        Top matches for you
      </h2>

      {isLoading ? (
        <div className="rounded-[14px] border border-rd-border bg-rd-bg-card px-4 py-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-rd-text-secondary mx-auto mb-2" />
          <p className="text-[12px] text-rd-text-secondary">
            Finding your matches…
          </p>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-[12.5px] text-[#991B1B]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Couldn't load matches - try again.</span>
        </div>
      ) : noRoles ? (
        <div className="rounded-[14px] border border-rd-border bg-rd-bg-card px-4 py-6 text-center">
          <p className="text-[12.5px] text-rd-text-secondary leading-[1.5]">
            Run your Career Roadmap to generate matched roles, then top matches
            show up here.
          </p>
        </div>
      ) : picks.length === 0 && stretch.length === 0 ? (
        <div className="rounded-[14px] border border-rd-border bg-rd-bg-card px-4 py-6 text-center">
          <p className="text-[12.5px] text-rd-text-secondary leading-[1.5]">
            No matches right now - check the Browse Jobs tab for the full
            search.
          </p>
        </div>
      ) : (
        <>
          {picks.length > 0 && (
            <MatchSection
              title="Our picks for you"
              jobs={picks}
              scoredById={scoredById}
              trackedIds={trackedIds}
              trackingId={trackingId}
              onOpen={setOpenJob}
              onTrack={handleTrack}
              onTailorStub={handleTailorStub}
            />
          )}
          {stretch.length > 0 && (
            <MatchSection
              title="Worth a stretch"
              jobs={stretch}
              scoredById={scoredById}
              trackedIds={trackedIds}
              trackingId={trackingId}
              onOpen={setOpenJob}
              onTrack={handleTrack}
              onTailorStub={handleTailorStub}
            />
          )}
        </>
      )}

      {openJob && (
        <JobDetailModal
          job={openJob.job}
          scoreResult={openJob.scoreResult}
          trackColor={openJob.trackColor}
          unified
          onClose={() => setOpenJob(null)}
        />
      )}
    </div>
  );
}

function MatchSection({
  title,
  jobs,
  scoredById,
  trackedIds,
  trackingId,
  onOpen,
  onTrack,
  onTailorStub,
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-rd-text-eyebrow font-mono mb-1.5 px-0.5">
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {jobs.map((job) => {
          const scoreResult = scoredById[job.id];
          const perJobTrack = scoreResult?.track;
          const trackColor = perJobTrack
            ? TRACK_CONFIG[perJobTrack]?.rdColor
            : null;
          const tracked = trackedIds.has(job.id);
          const tracking = trackingId === job.id;
          return (
            <div key={job.id} className="flex flex-col gap-1.5">
              <JobGridCard
                job={job}
                scoreResult={scoreResult}
                trackColor={trackColor}
                unified
                onOpen={(j, s) =>
                  onOpen({ job: j, scoreResult: s, trackColor })
                }
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onTrack(job, scoreResult)}
                  disabled={tracked || tracking}
                  className="flex-1 inline-flex items-center justify-center gap-1 font-display font-semibold text-[11px] rounded-full px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed"
                  style={
                    tracked
                      ? {
                          background: "var(--rd-teal-tint)",
                          color: "var(--rd-teal-dark)",
                        }
                      : {
                          background: "var(--rd-bg-soft)",
                          color: "var(--rd-text)",
                        }
                  }
                >
                  {tracking ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : tracked ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  {tracked ? "Tracked" : "Track"}
                </button>
                <button
                  type="button"
                  onClick={onTailorStub}
                  className="flex-1 inline-flex items-center justify-center gap-1 font-display font-semibold text-[11px] rounded-full px-2.5 py-1.5 bg-rd-bg-soft text-rd-text-secondary hover:text-rd-text transition-colors"
                  title="Not wired up yet in this prototype"
                >
                  <Wand2 className="w-3 h-3" />
                  Tailor CV
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

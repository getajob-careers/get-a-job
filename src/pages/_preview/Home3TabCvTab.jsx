// CV tab content for the 3-tab homepage demo (Home3TabPreview.jsx).
//
// As of iteration 2 Stage A the sidebar (tiles + coach) lives in the shell
// (CanvasSidebar), persistent across tabs — so this tab is two columns:
//   Center: the REAL CV studio (CVStudioLive, "Layout-LESS on purpose") in live
//     mode, or the fixture master-CV document in canvas mode.
//   Right: a compact "top matches" list built from the same data hooks +
//     picks/stretch sectioning UnifiedJobsFeed.jsx uses, rendered with the
//     existing JobGridCard/JobDetailModal (real Track via addJobToTracker in
//     live mode). "Tailor CV" is a visual stub (no standalone entry point yet).

import React, { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertCircle, Check, Plus, Wand2 } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import CVStudioLive from "@/components/cv-studio/CVStudioLive";
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
import CanvasCvGeneration from "./canvas/CanvasCvGeneration";
import { CanvasTopMatches } from "./canvas/CanvasMatches";

const TOP_MATCHES_FETCH_SIZE = 30;
const TOP_MATCHES_SHOWN = 6;

// Sidebar (tiles + coach) moved to CanvasSidebar in iteration 2 Stage A — it's
// now persistent across all three tabs, rendered by the shell. This tab is just
// the CV document (center) + top-matches (right).
export default function Home3TabCvTab() {
  return (
    <div className="flex flex-col md:flex-row gap-4 md:h-full md:min-h-0">
      {/* Center - CV studio (live) or fixture CV-generation flow (canvas) */}
      <div className="w-full md:flex-1 min-w-0 md:h-full md:overflow-hidden bg-rd-bg-card border border-rd-border-subtle rounded-[16px]">
        {CANVAS_FIXTURES ? <CanvasCvGeneration /> : <CVStudioLive />}
      </div>

      {/* Right - compact top-matches list */}
      <div className="cx-fade-y w-full md:w-[320px] flex-shrink-0 md:h-full md:overflow-y-auto md:pb-2">
        {CANVAS_FIXTURES ? <CanvasTopMatches /> : <TopMatchesPanel />}
      </div>
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

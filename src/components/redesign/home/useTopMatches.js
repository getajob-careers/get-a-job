// useTopMatches - the matched-roles data hook for the CV tab's rail.
//
// Mirrors UnifiedJobsFeed's fetch + gate + sort + picks/stretch sectioning
// (roadmap role titles -> search_jobs_by_role_titles -> scoreJobFit ->
// picks/stretch), trimmed to a single compact reveal (no pagination, no search
// tab). Extracted from the Home3TabCvTab preview so the production rail and the
// preview share ONE source of truth for the matching logic.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useProfileQuery } from "@/lib/queries/useProfile";
import { useExperiencesQuery } from "@/lib/queries/useExperiences";
import { useEducationQuery } from "@/lib/queries/useEducation";
import { useCareerRolesQuery } from "@/lib/queries/useCareerRoles";
import {
  inferExperienceLevel,
  allowedSenioritiesForLevel,
} from "@/lib/experienceLevel";
import { TRACK_ORDER } from "@/lib/trackConfig";
import { scoreJobFit } from "@/lib/scoreJobFit";
import {
  UNIFIED_MAX_ROLES,
  TRACK_SIMILARITY_THRESHOLD,
  JOBS_SELECT_LIGHT,
  stretchAwareSeniorityFor,
} from "@/lib/jobsFeed";

const TOP_MATCHES_FETCH_SIZE = 30;
const TOP_MATCHES_SHOWN = 6;

export function useTopMatches() {
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

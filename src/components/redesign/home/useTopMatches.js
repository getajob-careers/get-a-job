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
// Rail depth (CV RED): reveal 15 initially, load-more to the fetched 30. The
// rail scrolls, so a deeper list is fine. Extending the FETCH beyond 30 is a
// deferred follow-up (would need pagination like the unified feed).
const TOP_MATCHES_SHOWN = 15;

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

  // The full relevance-gated, ranked match list (capped by the fetch buffer,
  // TOP_MATCHES_FETCH_SIZE). The rail reveals TOP_MATCHES_SHOWN at a time with
  // load-more; the picks/stretch split happens on the revealed slice there.
  const matches = useMemo(() => {
    if (jobs.length === 0 || !profile) return [];
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
    return gated;
  }, [jobs, scoredById, profile]);

  return {
    matches,
    initialShown: TOP_MATCHES_SHOWN,
    scoredById,
    isLoading: jobsQuery.isLoading,
    isError: jobsQuery.isError,
    noRoles: unionedRoles.length === 0,
  };
}

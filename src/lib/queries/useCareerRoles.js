// useCareerRoles.js — canonical TanStack Query hook for the user's
// career_roles rows. Created for the /career ← unified-feed integration
// (PR1): both Career.jsx (Matched Roles) and <UnifiedJobsFeed> read
// career_roles, and they previously used the SAME key ["careerRoles", uid]
// with DIFFERENT select projections — Career `select("*")`, Jobs the narrow
// `select("title, track, readiness_score")`. That is the exact same-key /
// different-shape poison documented in useProfile.js: whichever mounts first
// defines the cache shape; a later mount reads the wrong shape back (e.g.
// Career's Matched Roles getting Jobs' narrow rows → missing match_score /
// goal_alignment_score / matched_skills, so the panel breaks).
//
// This module gives ONE canonical fetcher + key + hook, fetching the
// SUPERSET (`*`) so every consumer reads a complete row regardless of which
// mounted first. The feed reads only {title, track} from it; Career reads the
// full row — both are subsets of `*`.
//
// Poll: while the just-signed-up analysis is still generating, career_roles
// is empty but isAnalysisPending(profile) is true. Refetch every 4s until the
// rows land, then stop — same cold-start auto-resolve Career.jsx had.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { isAnalysisPending } from "@/lib/analysisStatus";

// Canonical key — always use this; never hand-roll the array shape.
export const careerRolesQueryKey = (userId) => ["careerRoles", userId];

// Fetch the full career_roles rows (superset projection). Returns an array.
export async function fetchCareerRoles(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("career_roles")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data || [];
}

/**
 * useCareerRolesQuery — canonical career_roles fetch.
 * @param {string|null|undefined} userId
 * @param {object} [opts]
 * @param {any} [opts.profile] — used only for the analysis-pending poll gate.
 */
export function useCareerRolesQuery(userId, { profile } = {}) {
  return useQuery({
    queryKey: careerRolesQueryKey(userId),
    queryFn: () => fetchCareerRoles(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) =>
      (query.state.data?.length ?? 0) === 0 && isAnalysisPending(profile)
        ? 4000
        : false,
  });
}

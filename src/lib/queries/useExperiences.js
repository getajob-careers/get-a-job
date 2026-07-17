// useExperiences.js — canonical TanStack Query hook for the user's experiences.
//
// Before this hook existed, the codebase had 6 separate useQuery hooks all
// reading from `experiences` under the SAME cache key `["experiences", uid]`
// but with INCONSISTENT projections:
//   - ChatInterface     select("id, title, company")
//   - JobMatchChecker   select("type, start_date, end_date, is_current, title, company, responsibilities")
//   - Profile, Jobs, Roadmap, Home  select("*")
//
// React Query caches by queryKey only — whichever consumer fetched LAST
// wrote to the shared cache, and other consumers immediately got that
// projection back regardless of what their own queryFn would have returned.
//
// Eli's 2026-05-27 incident: he had ChatInterface mount before Profile;
// the narrow {id, title, company} rows clobbered the cache; Profile then
// rendered with `e.skills_used = undefined` everywhere; when he clicked
// Save Profile, aggregateProfileSkills walked rows with no skills_used →
// profiles.skills_canonical dropped from 64 → 7 IDs → his Jobs Track 1
// went from many results to 1. Same anti-pattern PR #150 fixed for the
// userProfile cache.
//
// This module solves it the same way:
//   - ONE canonical fetcher (select * always)
//   - ONE hook with optional `select` projection for narrow consumers
//     (TanStack's `select` is per-observer client-side, doesn't pollute
//     the cache)
//
// Field availability contract: every consumer can safely assume the full
// experiences row shape — including skills_used and tools_used.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

// Canonical query key. Always use this — never hand-roll the array shape.
export const experiencesQueryKey = (userId) => ["experiences", userId];

// Fetch the full experiences row set for a user. Returns an array.
// Consumers needing a narrow subset should use the `select` option on
// useExperiencesQuery rather than calling supabase themselves.
// Ordered by display_order (the CV Studio reorder write-through target),
// NULLS LAST so rows the user has never reordered keep their created_at order -
// the implicit order before display_order existed. Mirrors fetchEducation. The
// deterministic master builder iterates this array in order, so the persisted
// display_order is what reproduces a user's experience ordering on rebuild.
export async function fetchExperiences(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("user_id", userId)
    .order("display_order", { ascending: true, nullsLast: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * useExperiencesQuery — canonical experiences fetch hook.
 * @param {string|null|undefined} userId
 * @param {(rows: any[]) => any} [select] — optional projection applied to
 *   the cached array. TanStack memoizes by referential equality of `select`
 *   so prefer module-level functions or useCallback over inline lambdas
 *   if you care about render churn. For trivial narrow projections the
 *   per-render recompute cost is negligible.
 */
export function useExperiencesQuery(userId, select) {
  return useQuery({
    queryKey: experiencesQueryKey(userId),
    queryFn: () => fetchExperiences(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    select,
  });
}

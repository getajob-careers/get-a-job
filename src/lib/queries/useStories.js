// useStories.js — canonical TanStack Query hook for the user's STAR stories.
//
// Before this hook existed, three useQuery hooks read from `stories` under
// the SAME cache key `["stories", uid]` but with INCONSISTENT projections:
//   - StoryBank   select("*")                (needs title/action/result/…)
//   - Home        select("id, created_at")   (stat strip count)
//   - Profile     select("id, experience_id")(per-experience count pills)
//
// React Query caches by queryKey only — whichever consumer fetched LAST
// wrote to the shared cache, and the others immediately got that
// projection back. Home (landing page) mounts first and writes the narrow
// {id, created_at} rows; navigating to StoryBank then renders those rows,
// so every card showed "Untitled story" with an empty expanded body even
// though the DB rows were fully populated (2026-06-16 incident). Same
// anti-pattern as the `experiences` cache (see useExperiences.js).
//
// This module solves it identically:
//   - ONE canonical fetcher (select * always, newest-first)
//   - ONE hook with an optional `select` projection for narrow consumers
//     (TanStack's `select` is per-observer client-side — it never writes
//     the cache, so the shared entry always holds full rows).
//
// Field-availability contract: every consumer can safely assume the full
// stories row shape — title, situation, task, action, result, metrics,
// skills_demonstrated, tools_used, relevance_tags, source, created_at.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

// Canonical query key. Always use this — never hand-roll the array shape.
export const storiesQueryKey = (userId) => ["stories", userId];

// Fetch the full stories row set for a user, newest-first (the order
// StoryBank renders). Returns an array.
export async function fetchStories(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * useStoriesQuery — canonical stories fetch hook.
 * @param {string|null|undefined} userId
 * @param {(rows: any[]) => any} [select] — optional per-observer projection
 *   applied to the cached array. Prefer a module-level function (or
 *   useCallback) over an inline lambda so TanStack's referential-equality
 *   memo holds and downstream useMemos don't churn.
 */
export function useStoriesQuery(userId, select) {
  return useQuery({
    queryKey: storiesQueryKey(userId),
    queryFn: () => fetchStories(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    select,
  });
}

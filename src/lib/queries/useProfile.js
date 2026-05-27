// useProfile.js — canonical TanStack Query hook for the user's profile.
//
// Before this hook existed, the codebase had 4 separate cache keys all
// reading from the `profiles` table:
//   - ["userProfile", uid]              (6 call sites, mutually
//                                        incompatible queryFns — array
//                                        vs object vs narrow-columns)
//   - ["profile_layout_chrome", uid]    (Layout sidebar)
//   - ["userProfileFullName", uid]      (linkedin ProfileTab)
//   - ["profile_practicum", uid]        (Internship page — cache key kept tied to DB column name practicum_path)
//
// Three latent problems:
//   1. The 4 caches diverged on profile save — only `userProfile` was
//      invalidated. Layout sidebar could show a stale full_name for up
//      to 5 minutes after a save (or never refresh until a navigation).
//   2. Among the 6 `userProfile` consumers, the queryFn shape disagreed:
//      Home/Profile/Roadmap/Tasks returned arrays via `.select("*")`,
//      Jobs/ChatInterface read `data?.[0]`, JobMatchChecker smuggled a
//      narrow-column `.maybeSingle()` query under the same key. Whichever
//      component mounted first defined the cache shape; later mounts
//      got the wrong shape back.
//   3. Five-way duplication makes invalidation after the upcoming
//      auto-trigger career analysis (which mutates `profiles` + writes
//      `career_roles`) a coordination problem we don't want.
//
// This module solves all three by providing ONE canonical fetcher
// (`fetchFullProfile`) and ONE hook (`useProfileQuery`) with an optional
// `select` projection for callers that only need a subset.
//
// Shape contract: `.maybeSingle()` → returns the profile OBJECT or
// `null` (never an array, never undefined-vs-null surprises). Callers
// that previously read `profile?.[0]` now read `profile` directly.
//
// Fields fetched: `*, education(*)` — superset of every consumer's
// needs across the whole app. Trade-off: Layout's first paint fetches
// ~2KB more bytes than before (was 3 columns), but because Layout
// mounts before every page that nested-fetched profile, downstream
// page loads now hit a warm cache. Net first-paint impact is
// neutral-to-positive across navigation.
//
// staleTime: 5 minutes — matches the previous Layout value and gives
// the cache enough lifetime to span typical session navigation. Saves
// + onboarding completions invalidate explicitly, so freshness is
// preserved on every meaningful write.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { withDbTimeout } from "@/lib/withDbTimeout";

// Canonical query key. Always use this — never hand-roll the array
// shape, since drift is what got us here.
export const profileQueryKey = (userId) => ["userProfile", userId];

// Fetch the full profile row + education join. Returns an object or
// null. Consumers needing a narrow subset should use the `select`
// option on useProfileQuery rather than calling supabase themselves.
export async function fetchFullProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*, education(*)")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * useProfileQuery — canonical profile fetch hook.
 * @param {string|null|undefined} userId
 * @param {(profile: any) => any} [select] — optional projection
 *   applied to the cached profile object. TanStack memoizes by
 *   referential equality of `select` so prefer module-level functions
 *   or useCallback over inline lambdas if you care about render churn.
 *   For 3-field plucks the per-render recompute cost is negligible.
 */
// Wrapped at module level so every caller of useProfileQuery gets the
// 30s timeout for free. The wrapped fn is stable across renders, so
// React Query's reference-equality checks on queryFn still work.
const fetchFullProfileWithTimeout = withDbTimeout(fetchFullProfile, "profiles");

export function useProfileQuery(userId, select) {
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchFullProfileWithTimeout(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    select,
  });
}

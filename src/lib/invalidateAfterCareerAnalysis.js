// invalidateAfterCareerAnalysis.js — single source of truth for the
// cache invalidations that must fire after generate-career-analysis
// completes.
//
// The edge function writes BOTH:
//   - new rows in `career_roles`
//   - back-updates to `profiles` columns (qualification_level,
//     primary_domain, etc.)
//
// Any cache that derives from either table needs refresh. Before this
// helper, each trigger site (Roadmap manual trigger, Home self-heal,
// Onboarding post-step trigger) hand-rolled its own subset of
// invalidations — and they DIVERGED. Roadmap invalidated 3 keys, Home
// invalidated 2. New consumers that depended on the missing keys would
// see stale data for up to staleTime (~5 min) after the trigger.
//
// Sequencing: ALWAYS `await` the generate-career-analysis call before
// calling this helper. Invalidating before the edge fn finishes races
// the cache and the user sees old data refetched from the database
// (which still has the OLD career_roles since the new ones haven't
// landed yet).

/**
 * Fire the full set of cache invalidations required after the
 * generate-career-analysis edge function completes successfully.
 *
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @param {string} userId
 */
export async function invalidateAfterCareerAnalysis(queryClient, userId) {
  if (!queryClient || !userId) return;
  await Promise.all([
    // profiles — both the canonical key + (future-proof) any unique
    // narrow-column keys still in the codebase. The canonical key
    // covers Layout, Practicum, LinkedIn ProfileTab via select after
    // PR #cache-consolidation-p0, but if a new narrow key sneaks in
    // before this list catches up, the unique invalidations below are
    // a no-op safety net.
    queryClient.invalidateQueries({ queryKey: ["userProfile", userId] }),
    queryClient.invalidateQueries({ queryKey: ["profile_layout_chrome", userId] }),
    queryClient.invalidateQueries({ queryKey: ["userProfileFullName", userId] }),
    queryClient.invalidateQueries({ queryKey: ["profile_practicum", userId] }),

    // careerRoles — written by the edge fn directly.
    queryClient.invalidateQueries({ queryKey: ["careerRoles", userId] }),

    // applications — scoreApplication.js uses careerRoles to compute
    // trackFromScores; cached track badges would otherwise show old
    // assignments.
    queryClient.invalidateQueries({ queryKey: ["applications", userId] }),

    // tasks — generated from careerRoles; stale tasks would point at
    // deleted role IDs.
    queryClient.invalidateQueries({ queryKey: ["tasks", userId] }),

    // jobs/roadmap derivatives — keyed by track1RoleTitles derived from
    // careerRoles. The keys themselves change when careerRoles change,
    // but explicit invalidation collapses any stale entries.
    queryClient.invalidateQueries({ queryKey: ["roadmap_tier1_jobs"] }),
    queryClient.invalidateQueries({ queryKey: ["new_jobs_home"] }),

    // daily action — LLM-derived from profile state; 30-min staleTime
    // amplifies the gap if not invalidated.
    queryClient.invalidateQueries({ queryKey: ["daily_action_home"] }),
  ]);
}

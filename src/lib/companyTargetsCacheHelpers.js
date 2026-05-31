// Pure cache transforms for the ["company_targets", userId] query cache.
//
// Extracted so the optimistic-mutation paths (delete, status change, etc.)
// can be unit-tested without spinning up a QueryClient. Both the kanban's
// updateStatus (PR #69 pattern) and the drawer's delete reuse the same
// shape: setQueryData(key, (prev) => transform(prev)), then on error
// invalidate to restore from the server.

/**
 * Filter a target out of the cached array. Used by the delete mutator
 * to remove the row optimistically before the DELETE round-trip.
 *
 * Tolerates non-array prev (returns it unchanged) so callers don't have
 * to guard — TanStack's setQueryData fires for every cache miss too.
 */
export function filterOutTarget(prev, targetId) {
  if (!Array.isArray(prev)) return prev;
  if (!targetId) return prev;
  return prev.filter((t) => t?.id !== targetId);
}

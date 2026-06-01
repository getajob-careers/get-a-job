// useCertifications.js — canonical TanStack Query hook for the user's
// certification rows. Mirrors useEducation's shape so the cache-pollution
// pattern that bit us in PR #178 (narrow select() strings writing thin
// rows to a shared cache key, silently breaking every other consumer)
// can't reach this surface:
//
//   - select("*") always. Per-observer projection happens client-side
//     via the `select` option below, not at the query level.
//   - Dedicated query key — ["certifications", userId] — same shape and
//     userId scoping as ["education", userId]. EntityCard / CV / spine
//     consumers all read from the same key.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

export const certificationsQueryKey = (userId) => ["certifications", userId];

export async function fetchCertifications(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("certifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * useCertificationsQuery — canonical certifications fetch hook.
 * @param {string|null|undefined} userId
 * @param {(rows: any[]) => any} [select] — optional client-side projection.
 */
export function useCertificationsQuery(userId, select) {
  return useQuery({
    queryKey: certificationsQueryKey(userId),
    queryFn: () => fetchCertifications(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    select,
  });
}

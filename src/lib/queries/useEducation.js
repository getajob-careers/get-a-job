// useEducation.js — canonical TanStack Query hook for the user's education rows.
//
// Same cache-pollution anti-pattern as useExperiences fixed: 4 consumers
// (JobMatchChecker, EducationTab, Jobs, Roadmap) all keyed
// ["education", uid] but JobMatchChecker fetched only `degree_level` while
// others fetched `select("*")`. First-fetcher-wins on cache contents.
// Consolidating to one canonical fetcher + per-observer projection.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

export const educationQueryKey = (userId) => ["education", userId];

// Fetch the full education row set for a user, ordered by display_order
// (Phase B normalized layout). EducationTab + Roadmap consumers rely on
// this order; narrow consumers (JobMatchChecker) don't care so it's a
// safe superset.
export async function fetchEducation(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("education")
    .select("*")
    .eq("user_id", userId)
    .order("display_order", { ascending: true, nullsLast: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * useEducationQuery — canonical education fetch hook.
 * @param {string|null|undefined} userId
 * @param {(rows: any[]) => any} [select] — optional projection.
 */
export function useEducationQuery(userId, select) {
  return useQuery({
    queryKey: educationQueryKey(userId),
    queryFn: () => fetchEducation(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    select,
  });
}

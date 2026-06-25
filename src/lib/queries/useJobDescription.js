// Per-job description fetch — the heavy `description` column is no longer
// pulled in the job list query (see jobsFeed.js light projection). The detail
// modal fetches it on demand, and the grid card PREFETCHES it on hover so the
// modal opens with the description already in cache (~0ms perceived).
//
// Cached 30 min and keyed by job id, so re-opening the same job is instant.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

export const jobDescriptionKey = (id) => ["job_description", id];

async function fetchJobDescription(id) {
  if (!id) return "";
  const { data } = await supabase.from("jobs").select("description").eq("id", id).maybeSingle();
  return data?.description ?? "";
}

export function useJobDescription(jobId, { enabled = true, seed } = {}) {
  return useQuery({
    queryKey: jobDescriptionKey(jobId),
    queryFn: () => fetchJobDescription(jobId),
    // If the row already carried a description (e.g. a legacy full-fat
    // query), seed it so we never refetch what we already have.
    initialData: seed != null && seed !== "" ? seed : undefined,
    enabled: !!jobId && enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Fire-and-forget warm of the cache, used on card hover.
export function prefetchJobDescription(queryClient, jobId) {
  if (!queryClient || !jobId) return;
  if (queryClient.getQueryData(jobDescriptionKey(jobId)) != null) return;
  queryClient.prefetchQuery({
    queryKey: jobDescriptionKey(jobId),
    queryFn: () => fetchJobDescription(jobId),
    staleTime: 30 * 60 * 1000,
  });
}

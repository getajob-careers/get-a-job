-- count_active_jobs_by_role_titles (2026-06-03).
--
-- Returns the uncapped count of active IL jobs whose title trigram-
-- matches any of the caller's role titles. Mirrors the match logic of
-- search_jobs_by_role_titles (is_il = TRUE AND is_active = TRUE AND
-- similarity(j.title, role) >= threshold) but returns a single integer
-- so Home can surface "X live job matches" as the hero stat without
-- pulling row data.
--
-- Why a count RPC instead of calling search_jobs_by_role_titles with a
-- high p_limit: the search RPC's diversification window functions and
-- ORDER BY would do real work over the full match set on every call;
-- counting a HashAgg over unnest+similarity is materially cheaper, and
-- there's no risk of accidentally clamping the surfaced number at the
-- limit ceiling. The search RPC already gates its rows by RLS via
-- SECURITY INVOKER; this counter does the same.
--
-- No date filter, no diversification, no seniority/work_type filter —
-- intentionally. The number on Home represents the true ceiling of
-- "live Track-1 matches for you right now", not the filtered jobs-page
-- view. Filtering happens on /Jobs.
--
-- Rollback: DROP FUNCTION public.count_active_jobs_by_role_titles(TEXT[], REAL);

CREATE OR REPLACE FUNCTION public.count_active_jobs_by_role_titles(
  p_role_titles          TEXT[],
  p_similarity_threshold REAL DEFAULT 0.3
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT COUNT(DISTINCT j.id)::INTEGER
  FROM public.jobs j
  CROSS JOIN unnest(p_role_titles) AS r(role)
  WHERE j.is_il = TRUE
    AND j.is_active = TRUE
    AND extensions.similarity(j.title, r.role) >= p_similarity_threshold;
$$;

GRANT EXECUTE ON FUNCTION public.count_active_jobs_by_role_titles(TEXT[], REAL) TO authenticated;

COMMENT ON FUNCTION public.count_active_jobs_by_role_titles(TEXT[], REAL) IS
  'Returns COUNT(DISTINCT jobs.id) where the title trigram-similarity to any p_role_titles entry meets the threshold AND is_il=TRUE AND is_active=TRUE. Mirrors search_jobs_by_role_titles match logic without diversification/limit/order so Home can surface the unfiltered match ceiling.';

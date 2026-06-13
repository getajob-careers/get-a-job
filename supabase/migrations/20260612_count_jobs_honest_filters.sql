-- count_active_jobs_by_role_titles v2 (2026-06-12).
--
-- Adds OPTIONAL p_max_seniority + p_work_types so the Career header can
-- show the POST-FILTER match count ("N live roles — showing top 20")
-- instead of the unfiltered ceiling, which contradicted the rendered list
-- (the "174 matches but I see ~15" P0). Filters mirror
-- search_jobs_by_role_titles EXACTLY so header N == the list's universe.
--
-- v1 was (TEXT[], REAL). Adding two trailing defaulted params makes a
-- DIFFERENT signature; leaving both overloads live makes a 2-arg call
-- ambiguous. So DROP the old signature first, then CREATE the new one. A
-- 2-arg caller (Home hero stat) still resolves via the new defaults
-- (NULL/NULL -> identical to v1 behavior). Idempotent.
--
-- Rollback: DROP FUNCTION public.count_active_jobs_by_role_titles(TEXT[], REAL, TEXT[], TEXT[]);
--           then re-run 20260603_count_active_jobs_by_role_titles.sql.

DROP FUNCTION IF EXISTS public.count_active_jobs_by_role_titles(TEXT[], REAL);

CREATE OR REPLACE FUNCTION public.count_active_jobs_by_role_titles(
  p_role_titles          TEXT[],
  p_similarity_threshold REAL    DEFAULT 0.3,
  p_max_seniority        TEXT[]  DEFAULT NULL,
  p_work_types           TEXT[]  DEFAULT NULL
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
    AND extensions.similarity(j.title, r.role) >= p_similarity_threshold
    AND (p_max_seniority IS NULL OR j.seniority = ANY(p_max_seniority))
    AND (
      p_work_types IS NULL
      OR cardinality(p_work_types) = 0
      OR j.is_remote IS NULL
      OR 'Hybrid'   = ANY(p_work_types)
      OR 'Flexible' = ANY(p_work_types)
      OR 'Remote'   = ANY(p_work_types)
      OR j.is_remote = FALSE
    );
$$;

GRANT EXECUTE ON FUNCTION public.count_active_jobs_by_role_titles(TEXT[], REAL, TEXT[], TEXT[]) TO authenticated;

COMMENT ON FUNCTION public.count_active_jobs_by_role_titles(TEXT[], REAL, TEXT[], TEXT[]) IS
  'COUNT(DISTINCT jobs.id) with is_il + is_active + title trigram-sim >= threshold, and OPTIONAL p_max_seniority / p_work_types filters mirroring search_jobs_by_role_titles. Both NULL == v1 unfiltered ceiling.';

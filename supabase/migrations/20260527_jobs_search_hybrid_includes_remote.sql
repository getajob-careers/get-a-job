-- Treat 'Hybrid' as inclusive of remote in search_jobs_by_role_titles
-- (2026-05-27, follow-up to 20260527_jobs_search_diversify_and_worktype.sql).
--
-- Bug surfaced via Eli's account: with work_type = ['Hybrid', 'On-site']
-- the prior filter excluded is_remote=true, which cut the only Track-1-
-- qualifying jobs (Guideline CSM Entry, sim 1.0, scoreJobFit 0.83) from
-- the result set. Eli's Jobs Track 1 tab went from 2 hits to 0 even
-- though Hybrid users typically don't object to fully-remote roles.
--
-- Updated semantic:
--   - 'Hybrid'   in array → no filter (Hybrid means flexible incl. remote)
--   - 'Flexible' in array → no filter (already there)
--   - 'Remote'   in array → no filter (user explicitly OK with remote)
--   - otherwise (only On-site selected) → exclude is_remote = TRUE
--   - empty / NULL → no filter
--   - is_remote IS NULL → always included
--
-- This makes the filter "show remote unless user has explicitly opted out
-- by selecting On-site alone." Stricter-than-Hybrid users (On-site only)
-- still get the strict filter.
--
-- Rollback: re-run 20260527_jobs_search_diversify_and_worktype.sql.

CREATE OR REPLACE FUNCTION public.search_jobs_by_role_titles(
  p_role_titles            TEXT[],
  p_limit                  INTEGER  DEFAULT 20,
  p_offset                 INTEGER  DEFAULT 0,
  p_similarity_threshold   REAL     DEFAULT 0.3,
  p_max_seniority          TEXT[]   DEFAULT NULL,
  p_work_types             TEXT[]   DEFAULT NULL
)
RETURNS SETOF public.jobs
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH pairs AS (
    SELECT
      j.id,
      r.role AS matched_role,
      extensions.similarity(j.title, r.role) AS sim,
      ROW_NUMBER() OVER (
        PARTITION BY j.id
        ORDER BY extensions.similarity(j.title, r.role) DESC
      ) AS rn_per_job
    FROM public.jobs j
    CROSS JOIN unnest(p_role_titles) AS r(role)
    WHERE j.is_il = TRUE
      AND j.is_active = TRUE
      AND (p_max_seniority IS NULL OR j.seniority = ANY(p_max_seniority))
      AND extensions.similarity(j.title, r.role) >= p_similarity_threshold
      AND (
        p_work_types IS NULL
        OR cardinality(p_work_types) = 0
        OR j.is_remote IS NULL                              -- never hide unknowns
        OR 'Hybrid'   = ANY(p_work_types)
        OR 'Flexible' = ANY(p_work_types)
        OR 'Remote'   = ANY(p_work_types)
        OR j.is_remote = FALSE                              -- only On-site selected
      )
  ),
  best_role_per_job AS (
    SELECT id, matched_role, sim FROM pairs WHERE rn_per_job = 1
  ),
  ranked AS (
    SELECT
      b.id,
      b.matched_role,
      b.sim,
      ROW_NUMBER() OVER (
        PARTITION BY b.matched_role
        ORDER BY b.sim DESC, j.date_posted DESC NULLS LAST
      ) AS rn_per_role
    FROM best_role_per_job b
    JOIN public.jobs j ON j.id = b.id
  )
  SELECT j.*
  FROM ranked r
  JOIN public.jobs j ON j.id = r.id
  ORDER BY r.rn_per_role ASC, r.sim DESC, j.date_posted DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.search_jobs_by_role_titles(TEXT[], INTEGER, INTEGER, REAL, TEXT[], TEXT[]) TO authenticated;

COMMENT ON FUNCTION public.search_jobs_by_role_titles(TEXT[], INTEGER, INTEGER, REAL, TEXT[], TEXT[]) IS
  'Trigram-similarity search over public.jobs.title with round-robin diversification across p_role_titles and optional work_type / seniority filters. Optional p_work_types: ''Hybrid'', ''Flexible'', or ''Remote'' in array = no filter; only ''On-site'' = exclude is_remote=TRUE. is_remote IS NULL always included. SECURITY INVOKER so RLS applies.';

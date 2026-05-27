-- Diversification + work_type filter on search_jobs_by_role_titles (2026-05-27).
--
-- Two bugs from QA against Eli's account (Track 1 = CSM + APM + POM,
-- work_type = Hybrid + On-site):
--
-- (A) Live Track 1 Matches showed 5 CSM jobs and zero APM/POM jobs.
--     Cause: prior RPC sorted by max similarity DESC, and "Customer
--     Success Manager" → "Customer Success Manager" = sim 1.0 dominates
--     "Associate Product Manager" → "Product Manager" ≈ 0.65 every time.
--     Fix: round-robin by closest matching role. Each job is attributed
--     to its best-matching p_role_titles entry, then ranked within that
--     partition (ROW_NUMBER), then ordered by rn ASC then sim DESC. So
--     the first 3 results are the top match for each of the 3 roles,
--     the next 3 are the 2nd-best per role, etc.
--
-- (B) Remote jobs surfaced despite work_type = Hybrid + On-site.
--     Cause: no work_type filter anywhere in the RPC. Job data only
--     carries a boolean is_remote — no separate hybrid flag — so the
--     filter logic is simple:
--       - 'Flexible' or 'Remote' in array → no filter (show all)
--       - otherwise (only On-site and/or Hybrid, no Remote/Flexible)
--         → exclude is_remote = TRUE
--       - empty / NULL p_work_types → no filter (preserves prior
--         behaviour for any caller that doesn't pass the new arg)
--     CRITICAL: jobs with is_remote IS NULL are ALWAYS included — never
--     hide a job for missing metadata.
--
-- Rollback: re-run 20260520_jobs_search_seniority_filter.sql (CREATE OR
-- REPLACE drops the 6-param signature in favour of the 5-param one).

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
        OR 'Flexible' = ANY(p_work_types)
        OR 'Remote'   = ANY(p_work_types)
        OR j.is_remote = FALSE                              -- only On-site/Hybrid selected
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
  'Trigram-similarity search over public.jobs.title with round-robin diversification across p_role_titles and optional work_type / seniority filters. Each job is attributed to its best-matching role, then ranked within that role''s partition; final order is rn_per_role ASC, sim DESC. Optional p_work_types: ''Flexible'' or ''Remote'' in array = no filter; otherwise (only On-site / Hybrid) exclude is_remote=TRUE. is_remote IS NULL is always included. SECURITY INVOKER so RLS applies.';

-- Data hygiene: normalize profiles.work_type casing. The onboarding option
-- list uses "On-site"; the SkillTagInput suggestions historically wrote
-- "On-Site" (capital S). Some rows have both forms in the array.
UPDATE public.profiles
SET work_type = (
  SELECT ARRAY(
    SELECT DISTINCT CASE
      WHEN lower(v) = 'on-site' THEN 'On-site'
      WHEN lower(v) = 'remote'  THEN 'Remote'
      WHEN lower(v) = 'hybrid'  THEN 'Hybrid'
      ELSE v
    END
    FROM unnest(work_type) AS v
  )
)
WHERE work_type IS NOT NULL
  AND cardinality(work_type) > 0
  AND EXISTS (
    SELECT 1 FROM unnest(work_type) AS v
    WHERE v IN ('On-Site', 'on-site', 'REMOTE', 'remote', 'HYBRID', 'hybrid')
  );

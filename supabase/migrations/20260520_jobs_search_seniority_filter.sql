-- Seniority filter on search_jobs_by_role_titles (2026-05-20).
--
-- Bug: pg_trgm similarity('Senior Software Engineer', 'Junior Software
-- Engineer') is ~0.75 — well above the 0.3 threshold. A Junior user
-- searching their Tier 1 SWE role was getting 19 Senior SWE results +
-- 1 Junior. No seniority filter anywhere in the read path.
--
-- Fix: add an optional p_max_seniority TEXT[] argument. When supplied,
-- only rows whose jobs.seniority is IN the array are returned. When NULL
-- (default), no filter is applied — preserves prior behaviour for any
-- caller that doesn't pass the new arg.
--
-- Frontend mapping (in src/lib/experienceLevel.js):
--   early_career  → ['entry', 'mid']
--   mid_career    → ['mid', 'senior']
--   senior_career → ['senior', 'lead', 'director', 'executive']
--
-- The seniority values that exist in jobs.seniority today (verified live
-- 2026-05-20): entry, mid, senior, lead, director, executive. 3,071 rows,
-- zero NULLs. The IN-array filter therefore naturally excludes rows with
-- a future NULL value if any appear.
--
-- Rollback: re-run 20260517_jobs_trgm_search_rpc.sql (which CREATE OR
-- REPLACES with the original 4-param signature). Postgres allows the
-- function to be replaced in place — no downtime, no dropped grants.

CREATE OR REPLACE FUNCTION public.search_jobs_by_role_titles(
  p_role_titles            TEXT[],
  p_limit                  INTEGER  DEFAULT 20,
  p_offset                 INTEGER  DEFAULT 0,
  p_similarity_threshold   REAL     DEFAULT 0.3,
  p_max_seniority          TEXT[]   DEFAULT NULL
)
RETURNS SETOF public.jobs
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH matches AS (
    SELECT
      j.id,
      MAX(extensions.similarity(j.title, r.role)) AS max_sim
    FROM public.jobs j
    CROSS JOIN unnest(p_role_titles) AS r(role)
    WHERE j.is_il = TRUE
      AND j.is_active = TRUE
      AND (p_max_seniority IS NULL OR j.seniority = ANY(p_max_seniority))
      AND extensions.similarity(j.title, r.role) >= p_similarity_threshold
    GROUP BY j.id
  )
  SELECT j.*
  FROM public.jobs j
  JOIN matches m ON m.id = j.id
  ORDER BY m.max_sim DESC, j.date_posted DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.search_jobs_by_role_titles(TEXT[], INTEGER, INTEGER, REAL, TEXT[]) TO authenticated;

COMMENT ON FUNCTION public.search_jobs_by_role_titles(TEXT[], INTEGER, INTEGER, REAL, TEXT[]) IS
  'Trigram-similarity search over public.jobs.title. Returns IL active jobs whose title is similar (pg_trgm) to ANY of p_role_titles above p_similarity_threshold (default 0.3). Optional p_max_seniority filters to rows where jobs.seniority is in the array; NULL = no filter. Sorted by best-match similarity DESC, then date_posted DESC. SECURITY INVOKER so RLS applies.';

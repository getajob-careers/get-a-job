-- search_jobs_by_role_titles: deterministic ordering for stable pagination
-- (2026-06-12). Follow-up to 20260527_jobs_search_hybrid_includes_remote.sql.
--
-- The Career list paginates via p_offset, but the prior ORDER BY
-- (rn_per_role, sim, date_posted) had NO unique tiebreaker. date_posted is
-- NULL across large swaths of the corpus (AdamTotal / IAI / Workday rows),
-- so ties were common and the row order under ties is undefined — page 2
-- (offset 20) could overlap or gap page 1 across separate requests (the
-- legacy load-more bug class). Fix: add a unique tiebreaker to every
-- ROW_NUMBER window AND the final ORDER BY so the total order is stable:
--   - pairs.rn_per_job   : break sim ties by r.role  (deterministic role pick)
--   - ranked.rn_per_role : break ties by b.id
--   - final ORDER BY     : break ties by j.id
-- Behavior is otherwise byte-identical (same filters, same diversification).
-- Client still dedupes by id on append as a belt.
--
-- Rollback: re-run 20260527_jobs_search_hybrid_includes_remote.sql.

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
        ORDER BY extensions.similarity(j.title, r.role) DESC, r.role ASC
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
        OR j.is_remote IS NULL
        OR 'Hybrid'   = ANY(p_work_types)
        OR 'Flexible' = ANY(p_work_types)
        OR 'Remote'   = ANY(p_work_types)
        OR j.is_remote = FALSE
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
        ORDER BY b.sim DESC, j.date_posted DESC NULLS LAST, b.id ASC
      ) AS rn_per_role
    FROM best_role_per_job b
    JOIN public.jobs j ON j.id = b.id
  )
  SELECT j.*
  FROM ranked r
  JOIN public.jobs j ON j.id = r.id
  ORDER BY r.rn_per_role ASC, r.sim DESC, j.date_posted DESC NULLS LAST, j.id ASC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.search_jobs_by_role_titles(TEXT[], INTEGER, INTEGER, REAL, TEXT[], TEXT[]) TO authenticated;

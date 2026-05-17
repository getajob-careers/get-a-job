-- Fuzzy tier-to-jobs matching via pg_trgm similarity (2026-05-17).
--
-- The PR #42 cutover matched tier role titles against jobs via plain
-- ILIKE substring (`title ILIKE '%Customer Support Representative%'`).
-- Diagnostic showed this is too strict for compound role names — the
-- pilot's Tier 1 set returned 8 jobs (vs ~80+ semantically relevant
-- ones) and Tier 2 returned 0. The old Active Jobs DB path side-stepped
-- this via stripSeniority() + canonicalizeRoleTitle() in the deleted
-- _shared/job-search.ts; the cutover lost that smart matching.
--
-- Fix: expose a Postgres function that uses pg_trgm.similarity() to find
-- jobs whose titles are similar to ANY of a list of role titles, above a
-- tunable threshold. Frontend invokes via supabase.rpc(). PostgREST
-- doesn't expose the % trigram operator natively, so an RPC is the
-- cleanest path. We already created the GIN trgm index on jobs.title in
-- PR #40, so even without the % operator the planner can fall back to a
-- fast sequential scan over the ~600-IL-jobs slice.
--
-- Diagnostic threshold tuning (pilot user, May 17):
--   Tier 1 role: "Associate Product Manager"
--     full ILIKE phrase match: 0    trgm@0.3: 55    trgm@0.4: 38
--   Tier 1 role: "Product Operations Manager"
--     full ILIKE phrase match: 0    trgm@0.3: 66    trgm@0.4: 40
--   Tier 1 role: "Customer Success Manager"
--     full ILIKE phrase match: 8    trgm@0.3: 15    trgm@0.4: 12
-- → 0.3 is the right default. Generous enough to catch obvious variants
--   ("Customer Success Specialist") without devolving into noise.

CREATE OR REPLACE FUNCTION public.search_jobs_by_role_titles(
  p_role_titles            TEXT[],
  p_limit                  INTEGER DEFAULT 20,
  p_offset                 INTEGER DEFAULT 0,
  p_similarity_threshold   REAL    DEFAULT 0.3
)
RETURNS SETOF public.jobs
LANGUAGE sql
STABLE
SECURITY INVOKER          -- preserve RLS — authenticated read-all policy still applies
SET search_path = public, extensions
AS $$
  -- Step 1: per-job MAX similarity across the role list. CROSS JOIN +
  -- GROUP BY dedupes jobs that match multiple roles (e.g. a "Customer
  -- Success Manager" listing matches both "Customer Support
  -- Representative" and "Customer Experience Specialist" — we keep the
  -- single row scored by its best match).
  WITH matches AS (
    SELECT
      j.id,
      MAX(extensions.similarity(j.title, r.role)) AS max_sim
    FROM public.jobs j
    CROSS JOIN unnest(p_role_titles) AS r(role)
    WHERE j.is_il = TRUE
      AND j.is_active = TRUE
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

-- Authenticated users can call. SECURITY INVOKER means the function runs
-- with the caller's privileges, so the RLS policy on public.jobs (also
-- authenticated read-all) governs visibility.
GRANT EXECUTE ON FUNCTION public.search_jobs_by_role_titles(TEXT[], INTEGER, INTEGER, REAL) TO authenticated;

COMMENT ON FUNCTION public.search_jobs_by_role_titles(TEXT[], INTEGER, INTEGER, REAL) IS
  'Trigram-similarity search over public.jobs.title. Returns IL active jobs whose title is similar (pg_trgm) to ANY of p_role_titles above p_similarity_threshold (default 0.3). Sorted by best-match similarity DESC, then date_posted DESC. SECURITY INVOKER so RLS applies.';

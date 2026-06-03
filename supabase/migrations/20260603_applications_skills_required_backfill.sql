-- One-time backfill: stamp applications.skills_required for rows that are
-- jobs-cache-sourced (have ats_source + external_id) but predate the
-- 2026-06-03 tracker-skills-autofill PR's JobCard write change.
--
-- Scope: 28 total applications in prod; 19 have an ATS reference; of those
-- 16 join to a public.jobs row that has req_skills_core / req_skills_nice
-- populated (the source job ran through extract-job-requirements, now
-- automated nightly per refresh-jobs.yml). The other 3 ATS-resolvable
-- rows + 9 non-ATS rows remain NULL and render the Tracker Skills tab's
-- empty state — JD extraction for non-ATS apps is a follow-up.
--
-- Shape: { core: [...ids], nice: [...ids] } — matches the new JobCard
-- write shape so the Tracker reads one shape only. NULL entries on the
-- source job become [] (the COALESCE).
--
-- Idempotent: the WHERE clause only touches rows where skills_required
-- is currently NULL, so re-running this migration after partial apply
-- is a no-op.
--
-- Reversible: the DOWN section sets the same rows back to NULL. Apply by
-- running just the UPDATE inside the comment block.

-- ─── UP ──────────────────────────────────────────────────────────────────
UPDATE public.applications a
SET skills_required = jsonb_build_object(
  'core', COALESCE(to_jsonb(j.req_skills_core), '[]'::jsonb),
  'nice', COALESCE(to_jsonb(j.req_skills_nice), '[]'::jsonb)
)
FROM public.jobs j
WHERE a.skills_required IS NULL
  AND a.ats_source IS NOT NULL
  AND a.external_id IS NOT NULL
  AND j.ats_source = a.ats_source
  AND j.external_id = a.external_id
  AND (j.req_skills_core IS NOT NULL OR j.req_skills_nice IS NOT NULL);

-- ─── DOWN (manual; paste into psql / dashboard to revert) ────────────────
-- Restores the pre-backfill NULL state for the 16 rows touched above.
-- Safe because no read path mutates skills_required between backfill UP
-- and a hypothetical revert — the Tracker Skills tab is read-only on
-- this column post-rewrite.
--
-- UPDATE public.applications
-- SET skills_required = NULL
-- WHERE skills_required IS NOT NULL
--   AND ats_source IS NOT NULL
--   AND external_id IS NOT NULL;

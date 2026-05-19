-- One-shot backfill: re-classify existing jobs.seniority using the new
-- Variant B logic (title-wins for senior/lead/director/executive; years
-- refines the mid bucket only).
--
-- Why: tonight's GHA refresh would re-classify everything via the
-- updated TypeScript in scripts/lib/normalize.ts — but we don't want
-- 558 mis-tagged active jobs in production for the next ~14 hours.
-- This migration applies the same logic in SQL, in-place.
--
-- Scope: every row in public.jobs (active + inactive). Inactive rows
-- could come back via UPSERT later and we want consistency. Touching
-- ~3,071 active rows + a backlog of inactive ones — small UPDATE,
-- atomic, no advisory locks needed.
--
-- Algorithm mirrors finalSeniority() in scripts/lib/normalize.ts:
--   1. Title-derived bucket via regex (executive > director > lead >
--      senior > entry > mid).
--   2. If title-bucket is senior/lead/director/executive → use it.
--   3. If title-bucket is entry → use it.
--   4. If title-bucket is mid → refine via years_experience_min when
--      present (≤2 entry / 3-5 mid / 6-8 senior / 9+ lead). NULL years
--      → stay mid.
--
-- Idempotent: re-running this is a no-op for any row whose title +
-- years combination already produces the same final bucket. The next
-- nightly refresh will produce the same result for any row whose title
-- regex + years parsing haven't changed — no risk of an oscillation
-- where the script and the backfill disagree.
--
-- Rollback: nothing to undo. Revert the code change in normalize.ts +
-- wait for the next nightly run, OR run an equivalent UPDATE that
-- restores the old years-wins logic. The data itself isn't structurally
-- changed — only the value of jobs.seniority for rows where the rule
-- differed.

WITH new_classification AS (
  SELECT
    id,
    CASE
      WHEN title ~* '\m(vp|chief|cto|ceo|cmo|cpo|cfo|head of)\M'             THEN 'executive'
      WHEN title ~* '\m(director|head)\M'                                     THEN 'director'
      WHEN title ~* '\m(principal|staff|lead|architect)\M'                    THEN 'lead'
      WHEN title ~* '\m(senior|sr\.?)\M'                                      THEN 'senior'
      WHEN title ~* '\m(junior|jr\.?|associate|intern|entry|graduate|trainee|student)\M' THEN 'entry'
      ELSE 'mid'
    END AS title_bucket,
    years_experience_min AS yrs_min
  FROM public.jobs
),
final AS (
  SELECT
    id,
    CASE
      WHEN title_bucket IN ('senior', 'lead', 'director', 'executive') THEN title_bucket
      WHEN title_bucket = 'entry' THEN 'entry'
      -- title_bucket = 'mid' from here on — refine by years if available
      WHEN yrs_min IS NULL THEN 'mid'
      WHEN yrs_min <= 2 THEN 'entry'
      WHEN yrs_min < 6  THEN 'mid'
      WHEN yrs_min < 9  THEN 'senior'
      ELSE 'lead'
    END AS new_seniority
  FROM new_classification
)
UPDATE public.jobs j
SET seniority = f.new_seniority
FROM final f
WHERE j.id = f.id
  AND j.seniority IS DISTINCT FROM f.new_seniority;

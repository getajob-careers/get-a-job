-- Invalidate the prior zero-confidence extractions for Workday + SR
-- jobs so the nightly extraction-step picker re-grabs them once the
-- 2026-06-03 workday-detail-fetch PR starts populating descriptions
-- via the per-job CXS / SR v1 detail endpoints.
--
-- Without this UPDATE, those rows have extracted_at SET (confidence
-- 0.00 from a prior empty-JD pass) — the picker filter
-- `extracted_at IS NULL OR extraction_schema_version < 4` would skip
-- them indefinitely even as their descriptions arrive. Nulling
-- extracted_at + description_hash returns them to the "needs
-- extraction" cohort. The edge function's own description_hash
-- idempotency takes over from there.
--
-- Scope: workday + smartrecruiters only — Lever's 6 zero-conf rows
-- are NOT a per-job-detail problem and aren't being fixed in this PR;
-- invalidating them here would just be no-op churn that muddies
-- verification. Separate follow-up if the Lever quirk needs a fix.
--
-- Expected affected rows (DB-observed pre-merge): 444 workday + 6
-- smartrecruiters = 450. Combined with the standard ~30-60 nightly
-- ingest delta, the next extraction-step run picks ~480-510 jobs;
-- with --limit=500 on the picker (per PR #237) up to ~10 spill to
-- night two — flagged in the PR description.
--
-- Reversible: the DOWN section below restores extracted_at to the
-- pre-invalidation timestamp. Skip the revert entirely if you'd
-- rather let the natural extraction re-run those rows again.

-- ─── UP ──────────────────────────────────────────────────────────────────
UPDATE public.jobs
SET extracted_at = NULL,
    description_hash = NULL
WHERE ats_source IN ('workday', 'smartrecruiters')
  AND extracted_at IS NOT NULL
  AND extraction_confidence < 0.1;

-- ─── DOWN (manual; paste into psql / dashboard to revert) ────────────────
-- Restores a synthetic non-null extracted_at so the picker stops
-- selecting them. Sets to now() rather than the original timestamp
-- (we didn't snapshot that). description_hash stays null — the next
-- nightly run will re-stamp it on the next extraction attempt.
--
-- UPDATE public.jobs
-- SET extracted_at = now()
-- WHERE ats_source IN ('workday', 'smartrecruiters')
--   AND extracted_at IS NULL
--   AND extraction_confidence < 0.1;

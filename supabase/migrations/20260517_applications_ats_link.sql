-- Link tracker entries back to the jobs cache (PR 3 of 3, 2026-05-17).
--
-- The Browse Jobs page UPSERTs into applications when the user clicks
-- "Add to Tracker" on a Browse card. Storing the (ats_source, external_id)
-- pair on the application row lets the Tracker page cross-reference
-- public.jobs.is_active and surface a "This listing may no longer be
-- active" badge when the underlying ATS posting has been removed.
--
-- Two nullable columns — existing manual-add rows stay NULL and don't
-- get the badge (acceptable for pilot launch; the common path post-cutover
-- is Add-from-Browse). The partial index makes the badge cross-ref query
-- ignore the NULLs without bloating the index.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS ats_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_ats_lookup
  ON public.applications (ats_source, external_id)
  WHERE ats_source IS NOT NULL;

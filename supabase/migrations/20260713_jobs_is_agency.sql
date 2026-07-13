-- Staffing/recruiting agencies are allowed in the corpus but must be marked:
-- their postings are client placements/reposts, not their own headcount.
-- refresh-jobs.ts copies companies_il.json's is_agency onto each row at ingest
-- (mirrors the industry propagation), the UI shows a "via staffing agency"
-- badge, and evals exclude/footnote these rows so corpus-pass stays clean.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_agency boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.jobs.is_agency IS
  'True when the sourcing company is a staffing/recruiting agency (postings are client placements/reposts, not own headcount). Copied from companies_il.json is_agency by refresh-jobs.ts. Drives the UI agency badge; evals exclude these rows.';

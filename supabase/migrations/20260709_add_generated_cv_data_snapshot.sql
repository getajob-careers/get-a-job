-- CV Excellence Arc P0 — revision history.
-- application_cvs.cv_data is overwritten IN PLACE by the Studio autosave
-- (CVStudioLive.jsx: .update({ cv_data })), so the AS-GENERATED CV is lost the
-- moment a user hand-edits. This column preserves the generator's original
-- output immutably: written ONCE at generation (generate-tailored-cv /
-- refine-cv insert) and NEVER updated by the edit/autosave path. That makes
-- generated-vs-corrected diffable forever (no storage-PDF archaeology) and is
-- the substrate for the CV Excellence eval loop (P1+ regression gates).
--
-- Nullable: existing rows stay NULL (their originals are already gone / only in
-- storage PDFs). New rows populate it. Rollback: DROP COLUMN.

ALTER TABLE public.application_cvs
  ADD COLUMN generated_cv_data jsonb;

COMMENT ON COLUMN public.application_cvs.generated_cv_data IS
  'Immutable snapshot of the CV as first generated. Written once at generation (generate-tailored-cv / refine-cv), never updated by the Studio edit/autosave path (which only writes cv_data). NULL for rows generated before 2026-07-09. Powers the generated-vs-corrected diff + CV Excellence eval loop.';

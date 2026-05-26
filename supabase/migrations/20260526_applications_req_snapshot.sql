-- applications.req_snapshot — per-application snapshot of the v4
-- structured job requirements.
--
-- Why this exists: previous code path tried to join applications → jobs
-- via applications.job_id, but that column never existed. The SELECT
-- silently failed (PostgREST 400 surfaced as `data = undefined`), the
-- entire targetRoleContext block in generate-tailored-cv was skipped,
-- and the About Me sparse path fired for every user regardless of
-- whether their target role had v4 extraction.
--
-- Instead of resurrecting a foreign key (which would break on the
-- nightly jobs-table cleanup — when a posting goes inactive or gets
-- deleted, the FK would orphan the application), we snapshot the
-- structured fields directly onto the application row. The application
-- carries its own grounding forever, independent of jobs-table churn.
--
-- Shape: JSONB containing the fields generate-tailored-cv reads — the
-- exact subset of jobs.* that fed targetRoleContext.req_skills_core
-- etc. Stored as JSONB instead of individual columns because:
--   - The field set may grow (we already have v4 with 10+ structured
--     signals; v5 is conceivable). JSONB absorbs additions without
--     migrations.
--   - The values are read together, not queried individually. No
--     indexable predicates needed today.
--   - Null vs empty array vs missing key is preservable.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS req_snapshot JSONB;

COMMENT ON COLUMN public.applications.req_snapshot IS
  'Snapshot of v4 structured job requirements (req_skills_core, '
  'req_skills_nice, req_seniority, notable_customers, scale_signals, '
  'funding_signals, req_ai_tooling, etc.) at the time the application '
  'was added or first CV-generated. Populated by: '
  '(a) Browse-add path via jobs join at scoreApplication time, '
  '(b) inline stateless extract-job-requirements call from '
  'generate-tailored-cv when missing + job_description is substantive. '
  'Permanent on the application row — immune to nightly jobs cleanup.';

-- Backfill from jobs via the existing (ats_source, external_id) link
-- shipped in 20260517_applications_ats_link.sql. Covers every Browse-
-- originated application that has a matching live jobs row. Manual-add
-- applications (no ATS link) stay null and will be populated lazily on
-- their first CV generation via the stateless extractor.
--
-- jsonb_strip_nulls removes the empty keys so application.req_snapshot
-- is non-null only when we actually copied something useful — a true
-- empty snapshot ({}) would otherwise fool the "is null" branch in the
-- edge function into skipping the inline extraction fallback.
UPDATE public.applications a
SET req_snapshot = jsonb_strip_nulls(jsonb_build_object(
  'req_skills_core',       j.req_skills_core,
  'req_skills_nice',       j.req_skills_nice,
  'req_years_min',         j.req_years_min,
  'req_years_max',         j.req_years_max,
  'req_education_levels',  j.req_education_levels,
  'req_education_fields',  j.req_education_fields,
  'req_seniority',         j.req_seniority,
  'notable_customers',     j.notable_customers,
  'scale_signals',         j.scale_signals,
  'funding_signals',       j.funding_signals,
  'req_ai_tooling',        j.req_ai_tooling
))
FROM public.jobs j
WHERE a.ats_source IS NOT NULL
  AND a.external_id IS NOT NULL
  AND a.ats_source = j.ats_source
  AND a.external_id = j.external_id
  AND a.req_snapshot IS NULL
  AND (
    j.req_skills_core IS NOT NULL OR
    j.req_skills_nice IS NOT NULL OR
    j.notable_customers IS NOT NULL OR
    j.scale_signals IS NOT NULL OR
    j.funding_signals IS NOT NULL
  );

-- Phase A of the education refactor: create the education table + backfill
-- from the flat profile columns. Code still reads/writes the flat columns
-- after this migration; cutover happens in Phase B. Phase C drops the flat
-- columns later.
--
-- Design (approved 2026-05-14):
-- * institution + education_level both nullable — copy what exists, blanks
--   stay NULL, no fake defaults.
-- * secondary_education jsonb collapses into normal rows with
--   education_level = 'high_school'.
-- * degree column → degree_type in the new table (clearer semantics).
-- * academic_projects column added even though no data exists yet —
--   StepEducation already collects this client-side but the column was
--   missing.
-- * RLS mirrors experiences exactly.
-- * updated_at maintained by the existing set_updated_at() trigger.
-- * Backfill skips profiles with zero education fields populated.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Table
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.education (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  institution           text,           -- nullable per approved design
  education_level       text,           -- nullable; informal enum (high_school | associate | bachelors | masters | phd | bootcamp | self_taught)
  degree_type           text,           -- "B.A.", "B.Sc.", "MBA", "Ph.D." — distinct from education_level
  field_of_study        text,

  start_date            text,           -- free-form like experiences: "September 2023", "2023"
  end_date              text,           -- free-form: "May 2025", "Present"
  is_current            boolean NOT NULL DEFAULT false,

  gpa                   text,           -- free-form, matches existing column type
  honors                text[]  NOT NULL DEFAULT '{}',
  relevant_coursework   text[]  NOT NULL DEFAULT '{}',
  academic_projects     text[]  NOT NULL DEFAULT '{}',  -- finally persists this (was collected by StepEducation, dropped by cleanProfilePayload)

  location              text,

  -- Display ordering: lower number = higher on the user's list.
  -- Backfill writes 0 for primary, 1 for secondary; future inserts pick
  -- their own value (frontend can compute next-available).
  display_order         integer,

  created_at            timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at            timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_education_user_id ON public.education(user_id);
CREATE INDEX idx_education_user_order
  ON public.education(user_id, display_order NULLS LAST, created_at);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. updated_at trigger (reuses existing public.set_updated_at)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TRIGGER education_updated_at
  BEFORE UPDATE ON public.education
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. RLS — mirror experiences exactly
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own education" ON public.education
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own education" ON public.education
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own education" ON public.education
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own education" ON public.education
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Backfill — primary education from flat profile columns.
--    Skip profiles with zero education fields populated.
--    Date parser handles both observed formats in live data:
--      "2023 - Present"  (spaced hyphen, education_dates)
--      "2014-2018"       (no-space hyphen, secondary_education.dates)
--    If education_dates doesn't match, the whole string lands in start_date
--    so nothing is lost.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.education (
  user_id, institution, education_level, degree_type, field_of_study,
  start_date, end_date, is_current, gpa, honors, relevant_coursework,
  display_order
)
SELECT
  p.id,
  NULLIF(p.education_institution, ''),
  NULLIF(p.education_level, ''),
  NULLIF(p.degree, ''),
  NULLIF(p.field_of_study, ''),
  -- Split on optional-spaces around hyphen or en-dash. If no separator,
  -- the entire string ends up in start_date (group 1 in the regex).
  CASE
    WHEN p.education_dates ~ '\s*[-–]\s*'
      THEN NULLIF(trim((regexp_split_to_array(p.education_dates, '\s*[-–]\s*'))[1]), '')
    ELSE NULLIF(p.education_dates, '')
  END,
  CASE
    WHEN p.education_dates ~ '\s*[-–]\s*'
      THEN NULLIF(trim((regexp_split_to_array(p.education_dates, '\s*[-–]\s*'))[2]), '')
    ELSE NULL
  END,
  COALESCE(p.education_dates ILIKE '%present%' OR p.education_dates ILIKE '%current%', false),
  NULLIF(p.gpa, ''),
  COALESCE(p.honors, '{}'),
  COALESCE(p.relevant_coursework, '{}'),
  0
FROM public.profiles p
WHERE COALESCE(NULLIF(p.degree, ''), NULLIF(p.field_of_study, ''),
               NULLIF(p.education_level, ''), NULLIF(p.education_institution, ''),
               NULLIF(p.education_dates, ''), NULLIF(p.gpa, '')) IS NOT NULL
   OR COALESCE(array_length(p.honors, 1), 0) > 0
   OR COALESCE(array_length(p.relevant_coursework, 1), 0) > 0;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Backfill — secondary education (high school) from jsonb.
--    Observed shape: { institution, dates, location, highlights }
--    Always education_level = 'high_school'; is_current always false.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.education (
  user_id, institution, education_level, start_date, end_date,
  honors, location, display_order
)
SELECT
  p.id,
  NULLIF(p.secondary_education->>'institution', ''),
  'high_school',
  CASE
    WHEN (p.secondary_education->>'dates') ~ '\s*[-–]\s*'
      THEN NULLIF(trim((regexp_split_to_array(p.secondary_education->>'dates', '\s*[-–]\s*'))[1]), '')
    ELSE NULLIF(p.secondary_education->>'dates', '')
  END,
  CASE
    WHEN (p.secondary_education->>'dates') ~ '\s*[-–]\s*'
      THEN NULLIF(trim((regexp_split_to_array(p.secondary_education->>'dates', '\s*[-–]\s*'))[2]), '')
    ELSE NULL
  END,
  -- secondary_education.highlights → honors (school-leadership wins fit here)
  COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(
      COALESCE(p.secondary_education->'highlights', '[]'::jsonb)
    )),
    '{}'
  ),
  NULLIF(p.secondary_education->>'location', ''),
  1
FROM public.profiles p
WHERE p.secondary_education IS NOT NULL
  AND jsonb_typeof(p.secondary_education) = 'object';

COMMIT;

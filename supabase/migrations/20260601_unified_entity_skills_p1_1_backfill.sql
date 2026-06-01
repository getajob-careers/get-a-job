-- Unified entity + skills model — P1.1 backfill.
--
-- Populates the unified `skills` column from legacy per-entity arrays.
-- Idempotent (re-running is safe: WHERE skills IS NULL excludes already-
-- backfilled rows). Verification runs in the same migration as a DO
-- block — RAISE EXCEPTION if counts diverge, rolling back the whole
-- migration.
--
-- Also patches entity_spine's education display_title COALESCE chain so
-- the 5 education rows that were rendering blank (rows with degree but
-- no institution, plus high-school / self-taught rows) get a sensible
-- fallback. See bucket-A discussion for the exact COALESCE shape.

-- ───── 1. Backfill skills column from legacy arrays ─────

-- experiences: union skills_used + tools_used, dedup, drop empties/nulls
UPDATE public.experiences
SET skills = (
  SELECT array_agg(DISTINCT s ORDER BY s)
  FROM unnest(COALESCE(skills_used, '{}') || COALESCE(tools_used, '{}')) AS s
  WHERE s IS NOT NULL AND s <> ''
)
WHERE skills IS NULL
  AND (
    COALESCE(array_length(skills_used, 1), 0) > 0
    OR COALESCE(array_length(tools_used, 1), 0) > 0
  );

-- education: skills_developed → skills (no merge target)
UPDATE public.education
SET skills = (
  SELECT array_agg(DISTINCT s ORDER BY s)
  FROM unnest(skills_developed) AS s
  WHERE s IS NOT NULL AND s <> ''
)
WHERE skills IS NULL
  AND COALESCE(array_length(skills_developed, 1), 0) > 0;

-- projects: skills_demonstrated → skills (0 rows in prod, but run for
-- correctness in lower envs / fresh installs)
UPDATE public.projects
SET skills = (
  SELECT array_agg(DISTINCT s ORDER BY s)
  FROM unnest(skills_demonstrated) AS s
  WHERE s IS NOT NULL AND s <> ''
)
WHERE skills IS NULL
  AND COALESCE(array_length(skills_demonstrated, 1), 0) > 0;

-- certifications: no legacy skill column, nothing to backfill.

-- ───── 2. In-migration verification ─────
-- For each table, the count of rows with skills populated AFTER backfill
-- must equal the count of rows with a populated legacy array (filtered
-- to non-empty / non-null entries — matches the WHERE clauses above).
-- RAISE EXCEPTION rolls the whole migration back if mismatched.

DO $$
DECLARE
  exp_new_filled int;
  exp_old_filled int;
  edu_new_filled int;
  edu_old_filled int;
  proj_new_filled int;
  proj_old_filled int;
BEGIN
  -- experiences
  SELECT COUNT(*) INTO exp_new_filled
    FROM public.experiences
    WHERE COALESCE(array_length(skills, 1), 0) > 0;
  SELECT COUNT(*) INTO exp_old_filled
    FROM public.experiences
    WHERE EXISTS (
      SELECT 1 FROM unnest(COALESCE(skills_used, '{}') || COALESCE(tools_used, '{}')) AS s
      WHERE s IS NOT NULL AND s <> ''
    );
  IF exp_new_filled <> exp_old_filled THEN
    RAISE EXCEPTION 'experiences backfill mismatch: new_filled=% old_filled=%', exp_new_filled, exp_old_filled;
  END IF;

  -- education
  SELECT COUNT(*) INTO edu_new_filled
    FROM public.education
    WHERE COALESCE(array_length(skills, 1), 0) > 0;
  SELECT COUNT(*) INTO edu_old_filled
    FROM public.education
    WHERE EXISTS (
      SELECT 1 FROM unnest(skills_developed) AS s
      WHERE s IS NOT NULL AND s <> ''
    );
  IF edu_new_filled <> edu_old_filled THEN
    RAISE EXCEPTION 'education backfill mismatch: new_filled=% old_filled=%', edu_new_filled, edu_old_filled;
  END IF;

  -- projects
  SELECT COUNT(*) INTO proj_new_filled
    FROM public.projects
    WHERE COALESCE(array_length(skills, 1), 0) > 0;
  SELECT COUNT(*) INTO proj_old_filled
    FROM public.projects
    WHERE EXISTS (
      SELECT 1 FROM unnest(skills_demonstrated) AS s
      WHERE s IS NOT NULL AND s <> ''
    );
  IF proj_new_filled <> proj_old_filled THEN
    RAISE EXCEPTION 'projects backfill mismatch: new_filled=% old_filled=%', proj_new_filled, proj_old_filled;
  END IF;

  RAISE NOTICE 'P1.1 backfill verification PASSED — exp=%/%, edu=%/%, proj=%/%',
    exp_new_filled, exp_old_filled,
    edu_new_filled, edu_old_filled,
    proj_new_filled, proj_old_filled;
END $$;

-- ───── 3. Patch entity_spine education display_title ─────
-- 5 education rows currently render blank because the prior COALESCE
-- required institution to be non-empty. New chain:
--   1. <degree_type> <field_of_study> @ <institution>  (when degree+field set)
--   2. <degree_type> <field_of_study>                  (institution missing)
--   3. <institution>                                    (only institution set)
--   4. INITCAP(REPLACE(education_level,'_',' '))        (e.g. "High School", "Self Taught")
--   5. 'Education'                                      (last-resort fallback)

CREATE OR REPLACE VIEW public.entity_spine
WITH (security_invoker = true) AS
SELECT id, user_id,
       'experience'::text AS entity_type,
       title AS display_title,
       start_date, end_date, is_current, skills, created_at
  FROM public.experiences
UNION ALL
SELECT id, user_id,
       'education'::text AS entity_type,
       COALESCE(
         NULLIF(TRIM(COALESCE(degree_type, '') || ' ' || COALESCE(field_of_study, '')), '')
           || CASE
                WHEN NULLIF(TRIM(institution), '') IS NOT NULL THEN ' @ ' || institution
                ELSE ''
              END,
         NULLIF(TRIM(institution), ''),
         INITCAP(REPLACE(education_level, '_', ' ')),
         'Education'
       ) AS display_title,
       start_date, end_date, is_current, skills, created_at
  FROM public.education
UNION ALL
SELECT id, user_id,
       'project'::text AS entity_type,
       name AS display_title,
       start_date, end_date, is_current, skills, created_at
  FROM public.projects
UNION ALL
SELECT id, user_id,
       'certification'::text AS entity_type,
       name AS display_title,
       date_earned AS start_date,
       NULL::text AS end_date,
       is_current, skills, created_at
  FROM public.certifications;

-- Unified entity + skills model — P1.0 (additive schema only).
--
-- Federates experiences / education / projects / certifications onto a
-- shared spine without merging tables. Each entity keeps its own row +
-- entity-specific columns; this migration adds the unified columns the
-- spine VIEW reads.
--
-- See bucket-A design doc in conversation log. This migration is
-- additive-only — no data movement (that's P1.1), no read switch (P1.3),
-- no legacy drops (P1.4).
--
-- Cross-review fixes applied:
--   1. VIEW uses WITH (security_invoker = true) — PG17 default would
--      otherwise bypass underlying RLS and leak rows.
--   2. updated_at is NOT in the spine (experiences doesn't have it).
--   3. display_title is computed IN the VIEW per-entity (no stored
--      generated column on education).
--   4. certifications.date_earned → spine.start_date is a VIEW mapping,
--      not a new column.

-- ───── 1. Unified skills column on all 4 entities ─────
ALTER TABLE public.experiences    ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE public.education      ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE public.projects       ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS skills text[];

-- ───── 2. is_current on projects + certifications ─────
-- experiences + education already have it. Default false = "we don't
-- know" / "completed" — the safest semantics for backfill.
ALTER TABLE public.projects       ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT false;
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT false;

-- ───── 3. Dates on projects (forward-looking for redesign) ─────
-- Currently 0 rows so no backfill needed. Certifications: spine maps
-- existing date_earned to start_date in the VIEW; no new column there.
ALTER TABLE public.projects       ADD COLUMN IF NOT EXISTS start_date text;
ALTER TABLE public.projects       ADD COLUMN IF NOT EXISTS end_date   text;

-- ───── 4. Federation read VIEW — RLS-preserving via security_invoker ─────
-- Spine columns: id, user_id, entity_type, display_title, start_date,
-- end_date, is_current, skills, created_at. Each per-entity column lives
-- on its source table; the VIEW only normalizes shape for federated
-- aggregation queries (e.g. profile.skills_canonical recompute).
--
-- security_invoker = true means: a SELECT against entity_spine runs
-- with the CURRENT user's identity, so RLS on experiences/education/
-- projects/certifications continues to filter rows to that user. Without
-- this, the VIEW would run as its owner (postgres) and return every
-- user's rows to any authenticated caller — RLS bypass.
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
         NULLIF(TRIM(COALESCE(degree_type, '') || ' ' || COALESCE(field_of_study, '')), '') || ' @ ' || institution,
         institution
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

COMMENT ON VIEW public.entity_spine IS
  'Federation read model for the 4 student-entity tables (experiences, education, projects, certifications). Each row in the underlying tables surfaces as one row here with a unified shape. security_invoker = true preserves RLS — querying entity_spine returns only the calling user''s rows.';

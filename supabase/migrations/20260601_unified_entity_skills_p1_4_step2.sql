-- P1.4 Step 2: drop legacy per-entity skill columns + snapshot columns.
--
-- Applied to live prod on 2026-06-01 via Supabase MCP apply_migration
-- (remote migration version: 20260601145234 / name:
-- p1_4_step2_drop_legacy_skill_columns). This file mirrors that migration
-- so the repo's committed history matches the live schema.
--
-- Pre-conditions verified before this migration:
--   * generate-tailored-cv v107 logged two authed 200s on real data
--     (migrated reader path).
--   * 0 rows where legacy skill columns are non-empty but unified
--     skills[] is empty (gap check).
--   * 0 code refs (read or write) to legacy columns on main.
--
-- stories.tools_used / stories.skills_demonstrated are a DIFFERENT table
-- (STAR records, not entity rows) and are intentionally NOT dropped.

ALTER TABLE public.experiences DROP COLUMN skills_used;
ALTER TABLE public.experiences DROP COLUMN tools_used;
ALTER TABLE public.education   DROP COLUMN skills_developed;
ALTER TABLE public.projects    DROP COLUMN skills_demonstrated;
ALTER TABLE public.profiles    DROP COLUMN skills_canonical_pre_eduskills;
ALTER TABLE public.profiles    DROP COLUMN skills_unmapped_pre_eduskills;

DO $$
DECLARE
  remaining int;
BEGIN
  SELECT count(*) INTO remaining
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'experiences' AND column_name IN ('skills_used','tools_used')) OR
      (table_name = 'education'   AND column_name = 'skills_developed') OR
      (table_name = 'projects'    AND column_name = 'skills_demonstrated') OR
      (table_name = 'profiles'    AND column_name IN ('skills_canonical_pre_eduskills','skills_unmapped_pre_eduskills'))
    );
  IF remaining > 0 THEN
    RAISE EXCEPTION 'P1.4 Step 2 verification failed: % legacy columns still present', remaining;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stories' AND column_name='tools_used'
  ) THEN
    RAISE EXCEPTION 'stories.tools_used unexpectedly missing — should be preserved';
  END IF;
END$$;

-- Add 'founder' to the experiences.type CHECK constraint. Replaces the
-- existing chk_experiences_type (from 20260423_experiences_type_military)
-- with the same shape plus the new value.
--
-- Applied to live prod on 2026-06-01 via Supabase MCP apply_migration
-- (remote name: experiences_type_founder). This file mirrors that
-- migration so the repo's committed history matches the live schema.
--
-- Forward-compatible: adds a value to the allowed set, doesn't remove
-- any. Reversible by re-running the prior constraint definition.

ALTER TABLE public.experiences
  DROP CONSTRAINT IF EXISTS chk_experiences_type;

ALTER TABLE public.experiences
  ADD CONSTRAINT chk_experiences_type
  CHECK (type = ANY (ARRAY[
    'internship',
    'full_time',
    'part_time',
    'freelance',
    'volunteer',
    'leadership',
    'military',
    'founder'
  ]));

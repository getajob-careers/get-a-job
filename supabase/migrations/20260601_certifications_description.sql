-- PR 2 of entity IA: certifications become rich entities under Education.
-- Adds a free-text description column ("what you did / what it covered").
-- date_earned + is_current already exist on this table (text + boolean
-- respectively); no need to add. Skills already feed entity_spine via
-- the unified skills text[] column (P1.0 migration).
--
-- Applied to live prod on 2026-06-01 via Supabase MCP apply_migration
-- (remote name: certifications_description). This file mirrors that
-- migration so the repo's committed history matches the live schema.
--
-- Forward-compatible (nullable column). Reversible via
-- `ALTER TABLE certifications DROP COLUMN description`.

ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS description text;

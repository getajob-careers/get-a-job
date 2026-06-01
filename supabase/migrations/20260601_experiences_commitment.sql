-- Add experiences.commitment text column with a CHECK constraint limiting
-- to ('full_time' | 'part_time' | NULL). NULL preserves the "unset" state
-- for freelance/founder/non-employment rows where commitment doesn't yet
-- apply (user sets it later).
--
-- Backfill: type='full_time'  → commitment='full_time'
--           type='part_time'  → commitment='part_time'
--           everything else   → NULL (freelance/founder left for user to set,
--                                     internship/volunteer/military/leadership
--                                     don't have a meaningful commitment axis)
--
-- Applied to live prod on 2026-06-01 via Supabase MCP apply_migration
-- (remote name: experiences_commitment_column). This file mirrors that
-- migration so the repo's committed history matches the live schema.
--
-- Forward-compatible: nullable column with a permissive CHECK; reversible
-- via `ALTER TABLE experiences DROP COLUMN commitment`. Doesn't change
-- existing read paths.

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS commitment text;

ALTER TABLE public.experiences
  DROP CONSTRAINT IF EXISTS chk_experiences_commitment;

ALTER TABLE public.experiences
  ADD CONSTRAINT chk_experiences_commitment
  CHECK (commitment IS NULL OR commitment IN ('full_time', 'part_time'));

UPDATE public.experiences
  SET commitment = 'full_time'
  WHERE type = 'full_time' AND commitment IS NULL;

UPDATE public.experiences
  SET commitment = 'part_time'
  WHERE type = 'part_time' AND commitment IS NULL;

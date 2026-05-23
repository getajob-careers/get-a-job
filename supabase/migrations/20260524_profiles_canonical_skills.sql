-- Profile canonical skill resolution at save (PR-B of Phase 3).
--
-- Adds two columns to profiles so that the deterministic scoreJobFit()
-- (PR-C) has a stable, resolved skill set to compare against the job's
-- req_skills_core array. Previously, skills lived only as raw free-text
-- in profiles.skills; the only path that resolved them to library IDs was
-- the generate-career-analysis edge function, which doesn't run on every
-- save. Per-view scoring needs the resolution to happen ONCE at save time.
--
-- - skills_canonical: array of resolved skill_library IDs (e.g. ["python",
--   "figma_mastery"]). Powers the deterministic scorer's skill-overlap math.
-- - skills_unmapped: array of raw phrases that didn't resolve through the
--   alias map. Surfaces growth opportunities for the alias map (the same
--   loop we already run from extractor unmapped → library additions).

ALTER TABLE profiles
  ADD COLUMN skills_canonical TEXT[],
  ADD COLUMN skills_unmapped  TEXT[];

-- GIN index on skills_canonical so scoreJobFit can do set-intersection
-- queries server-side if we ever want to. Today the resolution is
-- client-side, but the index costs nothing on a 100-student pilot.
CREATE INDEX idx_profiles_skills_canonical ON profiles USING GIN (skills_canonical);

COMMENT ON COLUMN profiles.skills_canonical IS
  'Resolved skill_library IDs — computed at save via src/lib/skillResolver.js from the free-text profiles.skills array. Used by scoreJobFit for set-intersection against jobs.req_skills_core. Backfill: scripts/backfill-profile-canonical-skills.ts.';
COMMENT ON COLUMN profiles.skills_unmapped IS
  'Raw skill phrases that did not resolve through the alias map. Surfaces alias-map growth candidates from real user signal.';

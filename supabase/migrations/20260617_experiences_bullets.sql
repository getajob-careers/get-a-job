-- experiences.bullets — Phase 1 of the Story Bank -> experiences migration.
--
-- STAR-disciplined achievement bullets move OUT of the standalone `stories`
-- table and INTO the experience they belong to. Each array element is ONE
-- resume-ready line with the real metric/tool in-line. The situation/task
-- STAR slots that were always empty are dropped -- the resume-relevant content
-- is action + result + metric/tool (the deferred situation/task extraction bug
-- becomes moot under this model).
--
-- ADDITIVE + ZERO OUTPUT-RISK (Phase 1): nothing READS bullets for CV /
-- LinkedIn output yet -- those consumers are rewired in Phases 2-4. The
-- existing `responsibilities` text column stays as the freeform fallback and
-- is NOT migrated. The `stories` table is untouched (retired in Phase 5).
--
-- text[] mirrors `experiences.skills`; if per-bullet provenance / references
-- are ever needed, moving to jsonb is a contained later migration.
--
-- RLS: no new policy needed -- the existing 4-policy own-row pattern on
-- `experiences` (auth.uid() = user_id) already gates every column.

ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS bullets text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN experiences.bullets IS
  'STAR-disciplined achievement bullets (Phase 1 of Story Bank retirement). Each element is one resume-ready line with the real metric/tool in-line. Becomes the primary CV + LinkedIn bullet source (responsibilities = freeform fallback) in later phases. Written via the Profile bullets editor + the extract-experience-bullets edge function (anti-fab gated, user-reviewed). skills_demonstrated + tools_used from folded stories dedupe into experiences.skills.';

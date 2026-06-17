-- education.bullets — extend the experiences.bullets pattern to education.
--
-- Mirrors 20260617_experiences_bullets.sql exactly: an additive text[] column
-- of STAR-disciplined achievement bullets, NOT NULL DEFAULT '{}' (so consumers
-- and the append path never deal with a NULL array). Written via the Profile
-- per-education bullets editor + the (generalized) extract-bullets edge
-- function (anti-fab gated, user-reviewed). A captured bullet's
-- skills_demonstrated dedupe into the existing education.skills array.
--
-- ADDITIVE + ZERO OUTPUT-RISK: nothing reads education.bullets for CV /
-- LinkedIn output yet. No backfill (education never had a stories link).
--
-- RLS: no new policy needed -- the existing own-row pattern on education
-- (auth.uid() = user_id) already gates every column.

ALTER TABLE education
  ADD COLUMN IF NOT EXISTS bullets text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN education.bullets IS
  'STAR-disciplined achievement bullets on an education entry (mirrors experiences.bullets). Each element is one resume-ready line with the real metric/tool in-line. Written via the Profile education bullets editor + the extract-bullets edge function (target_type=education). skills_demonstrated from a capture dedupe into education.skills.';

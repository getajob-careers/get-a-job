-- Provenance for applications.qualification_score / track / goal_alignment_score.
--
-- After PR-D (deterministic application scoring) any given row was scored
-- via one of three paths:
--   'deterministic' — scoreJobFit ran client- or server-side against v4
--                     structured fields (either from the linked jobs row,
--                     or from a fresh extract-job-requirements pass on a
--                     pasted JD)
--   'llm'           — fall-back to analyze-job-match when the extractor
--                     fails or the input is too short/missing
--   'manual'        — user filled the form without a JD; no scoring run
--
-- Surfaces in the Tracker UI as a tooltip on the track badge so the user
-- knows whether the number is the same one the Jobs page would show.

ALTER TABLE applications
  ADD COLUMN score_source TEXT
  CHECK (score_source IN ('deterministic', 'llm', 'manual'));

COMMENT ON COLUMN applications.score_source IS
  'How qualification_score + track + goal_alignment_score were computed: deterministic (scoreJobFit), llm (analyze-job-match fallback), manual (no JD provided). Set at insert/score time.';

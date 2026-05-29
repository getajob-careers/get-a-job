-- PR6: collapse two-score model into single match_score.
--
-- The matcher was returning fit_score and career_compound_score as
-- ostensibly independent axes. The data showed they were measuring the
-- same signal in practice (100% identical for one user, 67% identical
-- for the other) — see investigation in PR5 follow-up. Collapse to one
-- honest score whose rubric absorbs both axes; the career-compound
-- framing moves into the pitch prose (rationale + closes-these-gaps).
--
-- Rename rather than drop: existing data (60 rows across 2 users) keeps
-- its score under the new name. Users re-trigger the matcher to refresh
-- with the new single-rubric output.

ALTER TABLE public.company_targets
  RENAME COLUMN fit_score TO match_score;

ALTER TABLE public.company_targets
  RENAME COLUMN fit_rationale TO match_rationale;

ALTER TABLE public.company_targets
  DROP COLUMN career_compound_score;

-- Invalidate the drawer pitch cache. Old cached pitches contain
-- fit_rationale / fit_score / career_compound_score JSON keys; new
-- pitches will emit match_rationale / match_score. Truncating forces
-- regeneration on next drawer open so the cache and the new shape
-- agree from day one.
TRUNCATE TABLE public.internship_pitches;

-- Refresh column comments (RENAME preserves the stale ones).
COMMENT ON COLUMN public.company_targets.match_score IS
  'Single honest match score (0-100). Absorbs both axes the matcher used to score separately: how well this company matches realistic targets AND how much an internship here serves long-term Track 1. A great match is strong on BOTH; a weak match is weak on EITHER. NULL for non-matched sources (faculty_assigned, self_added).';
COMMENT ON COLUMN public.company_targets.match_rationale IS
  '1-sentence rationale naming the primary signal driving match_score — the strongest hook or the weakest caveat, whichever determines the band.';

-- Refresh the cached comment on the pitches JSONB column so its old
-- "fit_score, career_compound_score, fit_rationale" reference doesn't
-- mislead future maintainers.
COMMENT ON COLUMN public.internship_pitches.pitch IS
  'Structured pitch JSON returned by generate-internship-pitch. Shape: { pitched_role, pitch_rationale, who_to_contact, skill_gaps_this_fills, match_score, match_rationale }. Same shape as match-internship-companies entries. Truncated 2026-05-29 when the schema collapsed fit_score + career_compound_score → match_score.';

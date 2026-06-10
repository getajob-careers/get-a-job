-- Phase 2 onboarding redesign: structured career-direction pick.
--
-- Adds the locked-in role library ID that the new StepCareerDirection
-- picker writes on selection. Nullable so existing users (and any
-- in-flight onboarding users from before this deploy) keep working
-- through the existing resolveGoalRoleId(five_year_role) fallback in
-- generate-career-analysis.
--
-- five_year_role (free-text label) stays — the picker writes both
-- columns on selection (column = role.id, text = role.standardized_title),
-- so the human-readable goal still renders in CV gen, summaries,
-- and the fallback resolver for users whose column is null.
--
-- Why text and not an enum / FK: the role library is a code-side TS
-- file (supabase/functions/_shared/libraries/00_role_library.ts), not
-- a DB table. Same shape we use for primary_domain.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS five_year_goal_role_id text DEFAULT NULL;

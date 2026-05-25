-- Add skills_developed column to education table.
--
-- Onboarding redesign moves skill capture from one flat StepSkills page
-- to per-experience + per-education + per-project tagging. experiences
-- and projects already have arrays (skills_used, tools_used,
-- skills_demonstrated); education was missing its equivalent.
--
-- Existing rows default to empty array. cleanProfilePayload computes the
-- union of every per-object skill array into profiles.skills_canonical
-- at save time, so downstream scoring/CV-gen consumers continue to read
-- a single column without changes.
ALTER TABLE public.education
  ADD COLUMN skills_developed text[] DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.education.skills_developed IS
  'Canonical skill IDs (snake_case) the user developed during this degree/program. Populated via onboarding StepRoleSkills + Profile editor. Empty array = not tagged. Same shape as experiences.skills_used.';

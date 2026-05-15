-- Hotfix: re-target education.user_id FK from auth.users → profiles.
--
-- Why: Supabase PostgREST resolves nested-embed syntax (`.select('*, education(*)')`)
-- via direct FK relationships between the two tables. PR-2 introduced this
-- embed in 8 call sites (Home.jsx + 7 edge functions). But education.user_id
-- originally FK'd to auth.users (mirroring the experiences/projects/certs
-- pattern), and profiles also FKs to auth.users — no direct relationship
-- between profiles and education. PostgREST returns "Could not find a
-- relationship between profiles and education in the schema cache."
--
-- Knock-on effect: Home.jsx's profile query throws → profileError=true →
-- the redirect-to-Onboarding effect early-returns → every new signup is
-- stuck on Home page. This is the blocker for pilot launch.
--
-- Fix: re-target education.user_id to reference profiles.id. profiles.id
-- is itself a FK to auth.users.id (already cascades), so deleting a user
-- still cascades through profiles → education exactly as before. The
-- semantic change is "education rows belong to a profile" which matches
-- how the React code already treats them.
--
-- Safety verification (run before this migration, 2026-05-14):
--   * 9 existing education rows; all 9 have user_id values matching a
--     profile.id (orphan_rows = 0). Migration won't error on FK creation.

ALTER TABLE public.education
  DROP CONSTRAINT education_user_id_fkey;

ALTER TABLE public.education
  ADD CONSTRAINT education_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

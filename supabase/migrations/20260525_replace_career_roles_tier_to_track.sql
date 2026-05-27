-- Sync repo with production state (2026-05-27 audit).
--
-- The 2026-05-24 column rename migration (20260524_tier_to_track_rename.sql)
-- renamed career_roles.tier → career_roles.track but did NOT touch the
-- replace_career_roles RPC body. The RPC was still writing into a
-- non-existent `tier` column after the rename. A hotfix was applied
-- DIRECTLY to production on 2026-05-25 (recorded as migration version
-- 20260525085129_fix_replace_career_roles_tier_to_track in pg_migrations)
-- but the corresponding .sql file was never committed to the repo.
--
-- This file captures that hotfix verbatim from prod via pg_get_functiondef,
-- so a fresh DB rebuild from the repo's migration history produces the
-- same RPC body that's running in production.
--
-- IMPORTANT — this migration is repo-only sync. It is already in
-- pg_migrations on production, so re-running supabase db push WILL NOT
-- re-execute it. CREATE OR REPLACE FUNCTION is idempotent regardless.
-- No prod behaviour change.

CREATE OR REPLACE FUNCTION public.replace_career_roles(p_user_id uuid, p_roles jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: caller is not the target user'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM career_roles WHERE user_id = p_user_id;

  IF jsonb_array_length(p_roles) > 0 THEN
    INSERT INTO career_roles (
      user_id, title, track, match_score, readiness_score, goal_alignment_score,
      matched_skills, missing_skills, skills_gap,
      alignment_to_goal, alignment_reason, reasoning, action_items
    )
    SELECT
      p_user_id,
      (r->>'title')::text,
      (r->>'track')::text,
      (r->>'match_score')::numeric,
      (r->>'readiness_score')::numeric,
      NULLIF(r->>'goal_alignment_score','')::numeric,
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(r->'matched_skills', '[]'::jsonb))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(r->'missing_skills', '[]'::jsonb))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(r->'skills_gap',     '[]'::jsonb))),
      COALESCE(r->>'alignment_to_goal', ''),
      COALESCE(r->>'alignment_reason', ''),
      COALESCE(r->>'reasoning', ''),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(r->'action_items', '[]'::jsonb)))
    FROM jsonb_array_elements(p_roles) AS r;
  END IF;
END;
$function$;

-- Grants from the 2026-05-13 security-hardening migration carry through
-- a CREATE OR REPLACE; restated here so a fresh build still has the same
-- lockdown (anon revoked, authenticated allowed).
REVOKE EXECUTE ON FUNCTION public.replace_career_roles(uuid, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.replace_career_roles(uuid, jsonb) TO authenticated;

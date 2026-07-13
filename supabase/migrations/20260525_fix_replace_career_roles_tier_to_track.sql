-- ─────────────────────────────────────────────────────────────────────────────
-- Fix replace_career_roles RPC: tier → track
--
-- PR-103-109 renamed the user-facing concept "tier" to "track" and renamed
-- the DB column career_roles.tier → career_roles.track. The frontend +
-- generate-career-analysis edge function were updated; replace_career_roles
-- RPC was missed. Result: every "Refresh career analysis" call failed with
--   ERROR: column "tier" of relation "career_roles" does not exist
-- because the RPC tried to INSERT INTO career_roles (..., tier, ...) and
-- read r->>'tier' from a payload that contains "track".
--
-- This re-defines the RPC with track everywhere. All other logic (auth
-- check, DELETE+INSERT pattern, SECURITY DEFINER, hardened search_path)
-- preserved verbatim from 20260513_security_hardening_definer_functions.sql.
-- ─────────────────────────────────────────────────────────────────────────────

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

REVOKE EXECUTE ON FUNCTION public.replace_career_roles(uuid, jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.replace_career_roles(uuid, jsonb) TO authenticated;

-- Pre-pilot security audit findings (2026-05-13) — fix critical SECURITY DEFINER
-- function exposures and remove overly-permissive RLS policies on job_suggestions.
--
-- Findings addressed:
--   C-1  reset_user_data callable by anon with arbitrary user_id (data wipe)
--   C-2  replace_career_roles callable by anon with arbitrary user_id (overwrite)
--   C-3  job_suggestions INSERT policy WITH CHECK (true) — confirmed exploitable
--   M-1  log_error, check_rate_limit callable by anon (spam / DoS vector)
--   M-2  4 SECURITY DEFINER functions with mutable search_path
--   M-4  job_suggestions DELETE policy USING (true) — lurking vulnerability
--
-- Strategy:
--   * reset_user_data + replace_career_roles are called by frontend as the
--     authenticated user. Add internal auth.uid() = p_user_id check; keep
--     EXECUTE for authenticated; REVOKE from anon.
--   * check_rate_limit + log_error are called by edge functions via service_role
--     (auth.uid() is NULL in that context). Cannot enforce per-user check
--     internally; restrict via REVOKE so only service_role can invoke.
--   * Trigger functions: REVOKE direct RPC access; triggers still fire because
--     they run as the SECURITY DEFINER owner.
--   * Drop the two overly-permissive job_suggestions policies. Service role
--     bypasses RLS without needing a policy; the remaining "Users read own
--     suggestions" SELECT policy keeps user reads correctly scoped.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- C-1: reset_user_data — add internal auth check + harden search_path
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_user_data(p_user_id uuid)
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

  DELETE FROM career_roles    WHERE user_id = p_user_id;
  DELETE FROM tasks           WHERE user_id = p_user_id;
  DELETE FROM experiences     WHERE user_id = p_user_id;
  DELETE FROM projects        WHERE user_id = p_user_id;
  DELETE FROM certifications  WHERE user_id = p_user_id;
  DELETE FROM job_suggestions WHERE user_id = p_user_id;

  UPDATE profiles SET
    onboarding_complete      = false,
    onboarding_step          = 0,
    skills                   = '{}',
    summary                  = null,
    five_year_role           = null,
    primary_domain           = null,
    adjacent_fields          = '[]'::jsonb,
    proof_signals            = '[]'::jsonb,
    relevant_coursework      = '{}',
    gpa                      = null,
    honors                   = null,
    overall_assessment       = null,
    qualification_level      = null,
    skill_gaps               = '{}',
    last_reality_check_date  = null
  WHERE id = p_user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reset_user_data(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reset_user_data(uuid) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- C-2: replace_career_roles — add internal auth check + harden search_path
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
      user_id, title, tier, match_score, readiness_score, goal_alignment_score,
      matched_skills, missing_skills, skills_gap,
      alignment_to_goal, alignment_reason, reasoning, action_items
    )
    SELECT
      p_user_id,
      (r->>'title')::text,
      (r->>'tier')::text,
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


-- ─────────────────────────────────────────────────────────────────────────────
-- M-1: check_rate_limit + log_error — restrict to service_role only.
-- These are infrastructure RPCs called by edge functions via service_role.
-- Restricting EXECUTE is the right lever since service_role's auth.uid() is
-- NULL, so a per-user internal check is impossible.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_error(uuid, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
-- service_role retains EXECUTE via the role's default privileges; no explicit
-- GRANT needed.


-- ─────────────────────────────────────────────────────────────────────────────
-- M-2: trigger functions — add search_path + remove direct RPC access.
-- Triggers still fire because the function runs as its SECURITY DEFINER owner;
-- the REVOKE only blocks direct /rest/v1/rpc/ calls.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO status_changes (application_id, user_id, old_status, new_status, changed_at)
  VALUES (NEW.id, NEW.user_id, OLD.status, NEW.status, now());
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_company_target_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO company_target_status_changes
    (target_id, user_id, old_status, new_status, changed_at)
  VALUES
    (NEW.id, NEW.user_id, OLD.status, NEW.status, now());
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_application_status_change()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_company_target_status_change() FROM PUBLIC, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- C-3 + M-4: drop overly-permissive job_suggestions policies.
-- The edge function writes via service_role which bypasses RLS without needing
-- a policy. The remaining "Users read own suggestions" SELECT policy keeps
-- user reads correctly scoped.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service inserts suggestions" ON public.job_suggestions;
DROP POLICY IF EXISTS "Service deletes suggestions" ON public.job_suggestions;


COMMIT;

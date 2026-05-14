-- reset_user_data also clears the user's education rows.
--
-- Education was moved off the profiles flat columns into its own table in
-- Phase A (20260514_education_table_phase_a.sql). Phase B (this session) cuts
-- the code over to read/write the new table. reset_user_data needs to clear
-- it alongside the other per-user data tables.
--
-- Preserves all 2026-05-13/14 hardening byte-for-byte:
--   * SECURITY DEFINER + SET search_path TO 'public'
--   * Internal auth.uid() = p_user_id guard
--   * EXECUTE revoked from PUBLIC, anon; granted to authenticated
--
-- One added line: DELETE FROM education WHERE user_id = p_user_id;
--
-- The profile UPDATE list intentionally still references the flat education
-- columns (gpa, honors). They live until Phase C drops them; resetting them
-- is harmless until that point.

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
  DELETE FROM rate_limits     WHERE user_id = p_user_id;
  DELETE FROM education       WHERE user_id = p_user_id;

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

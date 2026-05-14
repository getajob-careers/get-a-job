-- reset_user_data: also clear the user's rate_limits rows.
--
-- Without this, testing the onboarding flow burns through the hourly
-- generate-career-analysis quota (5/hr) across reset cycles, because the
-- rate-limit table is keyed on (user_id, function_name, window_start) and
-- reset_user_data didn't previously touch it.
--
-- Abuse-vector consideration: a user wiping their own data to top up their
-- quota isn't a meaningful threat. reset_user_data is already scoped to
-- auth.uid() = p_user_id (added during the 2026-05-13 security hardening),
-- so a user can only reset their own quota. The rate limit's job is to bound
-- runaway cost from a stuck/buggy client, not to gate legitimate per-session
-- usage; if a user resets enough times to top up the quota, they've also
-- destroyed their own profile / experiences / stories — a costly attack with
-- no offensive payoff.
--
-- Everything else about the function (SECURITY DEFINER, search_path, internal
-- auth check, the column-by-column UPDATE on profiles) is preserved
-- byte-for-byte from the 2026-05-13 hardening migration.

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

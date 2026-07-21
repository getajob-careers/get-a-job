-- Regardless-fix (c): AdminLaunch top-of-funnel undercount.
--
-- The activation funnel started at "Started onboarding" counted from `profiles`,
-- with NO signed-in top stage. Users who confirm (email/OAuth) but bounce at the
-- step-0 resume wall never create a profile row, so they were invisible to the
-- funnel -- exactly the cohort the onboarding redesign targets. This prepends a
-- "Signed in" stage from auth.users, and adds admin_recent_signups() so the
-- "Recent signups (7d)" panel counts real signups, not profiles.
--
-- KNOWN TRADEOFF -- is_internal_user '%+%' rule: is_internal_user treats any
-- email containing '+' as internal (plus-addressing tags test accounts). A
-- FUTURE real signup using gmail plus-addressing would be silently scrubbed from
-- these counts. Zero such real signups exist today (hub-checked 2026-07-21);
-- accepted as a deliberate tradeoff. Revisit if a real plus-addressed cohort
-- appears. is_internal_user is otherwise verified complete (covers Noms + all
-- bare internal accounts by UUID).
--
-- SECURITY: admin_activation_funnel moves INVOKER -> DEFINER (must read
-- auth.users for the new stage), mirroring the audited admin_user_counts pattern
-- -- admin-gated via is_admin(), search_path pinned to '', REVOKEd from anon.

CREATE OR REPLACE FUNCTION public.admin_activation_funnel()
RETURNS TABLE(ord int, stage text, count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM (VALUES
      (0, 'Signed in',             (SELECT COUNT(*) FROM auth.users u
                                      WHERE u.last_sign_in_at IS NOT NULL
                                        AND NOT public.is_internal_user(u.id))::bigint),
      (1, 'Started onboarding',    (SELECT COUNT(*) FROM public.profiles p
                                      WHERE NOT public.is_internal_user(p.id))::bigint),
      (2, 'Completed onboarding',  (SELECT COUNT(*) FROM public.profiles p
                                      WHERE p.onboarding_complete = true
                                        AND NOT public.is_internal_user(p.id))::bigint),
      (3, 'Ran career analysis',   (SELECT COUNT(DISTINCT cr.user_id) FROM public.career_roles cr
                                      WHERE NOT public.is_internal_user(cr.user_id))::bigint),
      (4, 'Tracked an application',(SELECT COUNT(DISTINCT a.user_id) FROM public.applications a
                                      WHERE NOT public.is_internal_user(a.user_id))::bigint),
      (5, 'Saved a story',         (SELECT COUNT(DISTINCT s.user_id) FROM public.stories s
                                      WHERE NOT public.is_internal_user(s.user_id))::bigint)
    ) AS f(ord, stage, count)
    ORDER BY ord;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_activation_funnel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_activation_funnel() TO authenticated;

-- Recent signups from auth.users (not profiles), so confirmed-but-no-profile
-- users appear. full_name / onboarding_complete / referral_source come from the
-- profile row when it exists (NULL / false otherwise).
CREATE OR REPLACE FUNCTION public.admin_recent_signups(p_days int DEFAULT 7)
RETURNS TABLE(
  id uuid, email text, full_name text, created_at timestamptz,
  has_profile boolean, onboarding_complete boolean, referral_source text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, p.full_name, u.created_at,
      (p.id IS NOT NULL) AS has_profile,
      COALESCE(p.onboarding_complete, false) AS onboarding_complete,
      p.referral_source
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.created_at >= now() - make_interval(days => p_days)
      AND u.email_confirmed_at IS NOT NULL
      AND NOT public.is_internal_user(u.id)
    ORDER BY u.created_at DESC;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_recent_signups(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recent_signups(int) TO authenticated;

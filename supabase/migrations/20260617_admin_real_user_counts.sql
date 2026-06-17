-- admin real-user counts — exclude internal/test accounts from every admin
-- user-count tile, and split the conflated "signed up" number into a true
-- "visited" (signed in >= once) vs "started onboarding" (has a profile).
--
-- Before: /admin tiles counted profiles/applications with NO internal-account
-- exclusion, so all 8 team/test accounts inflated every number; and the
-- top-of-funnel "Signed up" counted `profiles` (onboarding-gated), not sign-ins.
--
-- SECURITY (per the 2026-05-14 audit: anon-callable SECURITY DEFINER functions
-- taking arbitrary user_ids were a critical vuln): both SECURITY DEFINER
-- functions below enforce is_admin() at the top and are REVOKEd from anon —
-- is_internal_user is a helper used only inside admin RPCs, never a public
-- surface; admin_user_counts refuses any non-admin caller.

-- ─── is_internal_user(uuid) ───────────────────────────────────────────
-- LOCKSTEP with src/lib/internalUsers.js — the rule MUST stay identical:
--   email LIKE '%+%'  OR  id IN (the 5 no-plus team accounts).
-- If you edit the internal list here, edit src/lib/internalUsers.js too (and
-- vice versa). SECURITY DEFINER to read auth.users; admin-gated so it can't be
-- probed by non-admins with arbitrary ids.
CREATE OR REPLACE FUNCTION is_internal_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p_user_id
      AND (
        u.email LIKE '%+%'
        OR u.id IN (
          '4b243f3a-5035-474e-a89d-aff13fe06cc2',
          '294d7fca-15e1-4131-bf47-cd82718990c4',
          'b16b7ad7-dfe8-44ff-8ebf-13eedb1ecdd3',
          '6de6aa99-a940-4f5d-88c9-3a32e387c761',
          '90bcf097-77f2-437f-9210-42755ba4d143'
        )
      )
  );
END $$;

REVOKE EXECUTE ON FUNCTION is_internal_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_internal_user(uuid) TO authenticated;

-- ─── admin_user_counts() — headline tiles, real (non-internal) users ──
-- visited            = signed in >= once (auth.users.last_sign_in_at), real.
-- started_onboarding = has a profile row, real (profiles created at onboarding).
-- onboarded          = profile + onboarding_complete, real.
-- SECURITY DEFINER (reads auth.users); admin-gated; REVOKEd from anon.
CREATE OR REPLACE FUNCTION admin_user_counts()
RETURNS TABLE(visited bigint, started_onboarding bigint, onboarded bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT
      (SELECT COUNT(*) FROM auth.users u
         WHERE u.last_sign_in_at IS NOT NULL
           AND NOT public.is_internal_user(u.id))::bigint,
      (SELECT COUNT(*) FROM public.profiles p
         WHERE NOT public.is_internal_user(p.id))::bigint,
      (SELECT COUNT(*) FROM public.profiles p
         WHERE p.onboarding_complete = true
           AND NOT public.is_internal_user(p.id))::bigint;
END $$;

REVOKE EXECUTE ON FUNCTION admin_user_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_user_counts() TO authenticated;

-- ─── Thread the exclusion into the existing funnels / table / picker ──
-- admin_funnel(): stage 1 relabeled "Started onboarding" (it counts profiles,
-- not sign-ins), and every stage excludes internal accounts.
CREATE OR REPLACE FUNCTION admin_funnel()
RETURNS TABLE(ord int, stage text, count bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM (VALUES
      (1, 'Started onboarding', (SELECT COUNT(*) FROM profiles WHERE NOT is_internal_user(id))::bigint),
      (2, 'Onboarded',          (SELECT COUNT(*) FROM profiles WHERE onboarding_complete = true AND NOT is_internal_user(id))::bigint),
      (3, '1+ Application',     (SELECT COUNT(DISTINCT user_id) FROM applications WHERE NOT is_internal_user(user_id))::bigint),
      (4, '1+ Interview',       (SELECT COUNT(DISTINCT user_id) FROM applications WHERE status IN ('interviewing','offer','accepted') AND NOT is_internal_user(user_id))::bigint),
      (5, '1+ Offer',           (SELECT COUNT(DISTINCT user_id) FROM applications WHERE status IN ('offer','accepted') AND NOT is_internal_user(user_id))::bigint)
    ) AS f(ord, stage, count)
    ORDER BY ord;
END $$;

-- admin_activation_funnel(): the AdminLaunch funnel (signup->onboard->analysis
-- ->application->story), moved server-side + internal-excluded. Replaces the
-- AdminLaunch client-side direct queries (which can't read auth.users anyway).
CREATE OR REPLACE FUNCTION admin_activation_funnel()
RETURNS TABLE(ord int, stage text, count bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM (VALUES
      (1, 'Started onboarding',   (SELECT COUNT(*) FROM profiles WHERE NOT is_internal_user(id))::bigint),
      (2, 'Completed onboarding', (SELECT COUNT(*) FROM profiles WHERE onboarding_complete = true AND NOT is_internal_user(id))::bigint),
      (3, 'Ran career analysis',  (SELECT COUNT(DISTINCT user_id) FROM career_roles WHERE NOT is_internal_user(user_id))::bigint),
      (4, 'Tracked an application',(SELECT COUNT(DISTINCT user_id) FROM applications WHERE NOT is_internal_user(user_id))::bigint),
      (5, 'Saved a story',        (SELECT COUNT(DISTINCT user_id) FROM stories WHERE NOT is_internal_user(user_id))::bigint)
    ) AS f(ord, stage, count)
    ORDER BY ord;
END $$;

-- admin_student_engagement(): per-user table excludes internal accounts.
CREATE OR REPLACE FUNCTION admin_student_engagement()
RETURNS TABLE(
  user_id uuid, full_name text, signed_up_at timestamptz, onboarding_complete boolean,
  total_applications bigint, applications_7d bigint, total_stories bigint,
  last_application_at timestamptz, total_cost_usd numeric, function_calls_7d bigint
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT
      p.id, p.full_name, p.created_at, p.onboarding_complete,
      (SELECT COUNT(*) FROM applications WHERE applications.user_id = p.id)::bigint,
      (SELECT COUNT(*) FROM applications WHERE applications.user_id = p.id AND created_at > now() - INTERVAL '7 days')::bigint,
      (SELECT COUNT(*) FROM stories WHERE stories.user_id = p.id)::bigint,
      (SELECT MAX(created_at) FROM applications WHERE applications.user_id = p.id),
      COALESCE((SELECT SUM(cost_usd) FROM function_metrics WHERE function_metrics.user_id = p.id), 0)::numeric,
      COALESCE((SELECT COUNT(*) FROM function_metrics WHERE function_metrics.user_id = p.id AND created_at > now() - INTERVAL '7 days'), 0)::bigint
    FROM profiles p
    WHERE NOT is_internal_user(p.id)
    ORDER BY p.created_at DESC;
END $$;

-- admin_list_students(): dropdown picker excludes internal accounts.
CREATE OR REPLACE FUNCTION admin_list_students()
RETURNS TABLE(user_id uuid, full_name text, signed_up_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.full_name, p.created_at
    FROM profiles p
    WHERE NOT is_internal_user(p.id)
    ORDER BY p.created_at DESC;
END $$;

COMMENT ON FUNCTION is_internal_user(uuid) IS
  'True if the user is a team/test/demo account (email LIKE ''%+%'' OR id IN the 5 no-plus team accounts). LOCKSTEP with src/lib/internalUsers.js. SECURITY DEFINER + admin-gated; used only inside admin RPCs.';
COMMENT ON FUNCTION admin_user_counts() IS
  'Headline real-user counts excluding internal accounts: visited (signed in >= once), started_onboarding (has a profile), onboarded.';

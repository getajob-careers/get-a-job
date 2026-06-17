-- Defense-in-depth hardening for the admin dashboard RPCs (follow-up to
-- 20260617_admin_real_user_counts.sql / PR #352).
--
-- admin_funnel / admin_activation_funnel / admin_student_engagement /
-- admin_list_students are SECURITY INVOKER and already gate on is_admin()
-- (RAISE 'admin only' for non-admins). But they were created with the default
-- PUBLIC execute grant (+ an explicit anon grant), so anon could still CALL
-- them — only to hit the gate. Per the May 14 audit posture (admin surfaces
-- must not be anon-callable at all), revoke the PUBLIC + anon execute grant so
-- anon is blocked at the grant layer, not just the gate. authenticated and
-- service_role keep their explicit grants (admins call these while signed in).
-- Mirrors the lockdown already on admin_user_counts() / is_internal_user().
REVOKE EXECUTE ON FUNCTION public.admin_funnel()             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_activation_funnel()  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_student_engagement() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_students()      FROM PUBLIC, anon;

-- Regardless-fix (a): create the profiles row at signup, server-side.
--
-- Today the profiles row is created client-side on the first "Continue" past
-- the step-0 resume wall (Onboarding.jsx). A user who confirms (email/OAuth) and
-- bounces at the wall leaves NO row -> invisible, unrecoverable, no background-
-- extraction write target. This trigger creates a minimal row at auth signup so
-- every confirmed user is tracked and re-engageable.
--
-- BELT-AND-BRACES: the client-side insert STAYS. Onboarding.checkExistingProfile
-- SELECTs the row on mount and routes to the UPDATE path when it exists, so a
-- trigger-created row does NOT collide with the client flow (no duplicate key).
--
-- SAFETY (PR #156 lesson — a production-critical auth path):
--  * Idempotent: ON CONFLICT (id) DO NOTHING.
--  * The body is exception-guarded so a failure can NEVER block signup...
--  * ...but it RAISE WARNINGs with SQLERRM so a FAILING trigger is VISIBLE in
--    Supabase logs. A trigger that can fail invisibly forever is the same bug
--    one layer down — the warning is mandatory, not optional.
--  * SECURITY DEFINER + search_path='' (writes public.profiles from an auth-
--    schema trigger).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        'User'
      )
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never block signup; but make the failure loud in the logs.
    RAISE WARNING 'handle_new_user failed for auth user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

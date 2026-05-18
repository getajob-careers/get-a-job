-- Persistent flag: did this user ever finish (or skip) the post-onboarding
-- platform tutorial?
--
-- Set to TRUE in Onboarding.jsx when the user reaches the end of the
-- tutorial OR clicks "Skip tutorial — I've seen this before" on the
-- returning-user gate.
--
-- INTENTIONALLY NOT INCLUDED in reset_user_data's UPDATE list — the
-- whole point of this flag is to detect returning users so we can offer
-- them the skip-tutorial shortcut. If reset wiped it, a user who hits
-- the reset button would be back to seeing the full tutorial despite
-- having already seen it.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_seen_onboarding_tutorial BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.has_seen_onboarding_tutorial IS
  'TRUE once the user has completed or skipped the post-onboarding tutorial. Not cleared by reset_user_data — survives reset so returning users get the skip-tutorial shortcut.';

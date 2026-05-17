-- Add referral_source column to profiles for the "How did you hear about us?"
-- question added to the onboarding Survey step (Wk 5 onboarding-UX bundle).
--
-- One text column, no enum constraint. Predefined survey options write
-- canonical snake_case values (e.g. "reichman_practicum", "school_whatsapp",
-- "friends", "community"); the "Other" path writes the user's free text
-- directly. Same pattern as cv_tailoring_strategy / linkedin_outreach_strategy.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_source TEXT;

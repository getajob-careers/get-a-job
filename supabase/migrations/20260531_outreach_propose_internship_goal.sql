-- PR13: add propose_internship to the outreach goal CHECK constraint.
--
-- The /Internship cards deep-link into the Outreach Coach but no
-- existing goal fits "propose yourself for an unposted internship in
-- a target function." The closest, message_hiring_manager, is
-- job-application framing ("are you hiring") rather than the
-- value-forward proposal model an internship pitch needs.
--
-- See _shared/outreach-frameworks/frameworks.ts PROPOSE_INTERNSHIP_FRAMEWORK
-- for the full coaching template. The framework reads
-- user_data.in_practicum (injected by the edge function from
-- profiles.practicum_path) to gate the program-backed credibility
-- lever.
--
-- Adding a goal requires DROP + ADD CONSTRAINT — CHECK constraints
-- in Postgres aren't extensible in place.

ALTER TABLE public.linkedin_outreach_conversations
  DROP CONSTRAINT IF EXISTS linkedin_outreach_conversations_goal_check;

ALTER TABLE public.linkedin_outreach_conversations
  ADD CONSTRAINT linkedin_outreach_conversations_goal_check
  CHECK (goal IN (
    'message_recruiter',
    'message_hiring_manager',
    'message_alumni',
    'request_informational_interview',
    'thank_you_follow_up',
    'reconnect_dormant',
    'ask_for_referral',
    'ask_for_recommendation',
    'propose_internship'
  ));

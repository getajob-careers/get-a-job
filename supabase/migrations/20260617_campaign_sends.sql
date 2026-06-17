-- Per-(campaign, user) sent-log — the send-once idempotency guard for
-- outbound campaigns (reengagement, etc.).
--
-- WHY: the send path inserts here FIRST and only sends if the row is newly
-- created; UNIQUE(campaign_id, user_id) makes a re-run skip anyone already
-- recorded. Durable: NO FK to auth.users, so the log survives account
-- deletion and stays a faithful record of what was sent. Email is plaintext
-- on purpose (light internal audit), same posture as account_deletions.

CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       TEXT NOT NULL,
  user_id           UUID NOT NULL,
  email             TEXT NOT NULL,
  segment           TEXT,
  status            TEXT NOT NULL DEFAULT 'sent',
  resend_message_id TEXT,
  error             TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);

COMMENT ON TABLE public.campaign_sends IS
  'Per-(campaign,user) sent-log; UNIQUE(campaign_id,user_id) is the send-once idempotency guard. No FK to auth.users so the log is durable across deletion.';

-- Service-role only: enable RLS with NO policies. Service role bypasses RLS
-- (the only writer/reader — the send function uses the service-role key);
-- authenticated/anon callers get nothing. Mirrors account_deletions.
ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

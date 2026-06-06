-- User feedback widget — a single table the floating "Beta: got
-- feedback?" widget writes into directly from the browser via the
-- supabase anon key. No edge function or Slack/email ping in v1; Eli
-- triages by querying this table directly (or via /admin later).
--
-- Categories are deliberately broad (Bug / Confusing / Missing feature /
-- Other) so the pilot doesn't pre-commit to surface-specific buckets
-- before we see where users actually complain — refine later from
-- "Other" submissions clustering.
--
-- RLS model:
--   - users INSERT their own rows (widget submit path)
--   - users SELECT their own rows (so a future "your submissions"
--     UI can show them what they sent)
--   - admins (per public.is_admin() + admin_users) SELECT all rows
--     (no-arg signature — `is_admin()` reads auth.uid() internally)
--   - no UPDATE / DELETE policy → tombstone-style, mutation goes
--     through service-role only if ever needed
--
-- Apply manually via Supabase MCP `apply_migration` before merging the
-- frontend, otherwise the widget will 42P01 on submit. This file mirrors
-- the live schema once applied.

CREATE TABLE public.feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text NOT NULL CHECK (category IN ('bug', 'confusing', 'missing_feature', 'other')),
  message     text NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  route       text,
  context     jsonb,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY fb_insert_own
  ON public.feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY fb_select_own
  ON public.feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY fb_select_admin
  ON public.feedback
  FOR SELECT
  USING (public.is_admin());

CREATE INDEX feedback_created_at_idx ON public.feedback (created_at DESC);
CREATE INDEX feedback_user_id_idx    ON public.feedback (user_id);

-- Audit trail for self-service account deletions.
--
-- WHY: After delete-account runs auth.admin.deleteUser, every CASCADE FK
-- wipes the user's data and the SET NULL FKs (companies.created_by,
-- error_logs.user_id) anonymize. There's no surviving record that the
-- account ever existed. Customer support needs a way to confirm "yes,
-- we did delete that account on X date" without inferring from
-- absence. Also useful to spot deletion patterns (mass deletes, abuse,
-- pilot fall-off).
--
-- NOT TIED TO auth.users — the row needs to survive the delete it
-- describes. Email is plaintext on purpose; this table is intended for
-- light internal audit, not as a re-identification source.

CREATE TABLE IF NOT EXISTS public.account_deletions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  email        TEXT,
  user_id_was  UUID
);

COMMENT ON TABLE public.account_deletions IS
  'Tombstone records for self-service deletions. user_id_was is the value of auth.users.id at deletion time — no FK because the referenced row is gone.';

-- Only service-role inserts. No user-facing read access (RLS off means
-- only privileged callers can SELECT — service role bypasses RLS, regular
-- users get nothing).
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

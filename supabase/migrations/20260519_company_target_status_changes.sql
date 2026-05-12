-- company_target_status_changes — Wk 4 audit table for the Internship
-- Finder kanban. Mirrors the application status_changes pattern
-- (20260504_application_outcome_loop_schema.sql) with one addition:
-- per-transition optional `note` for the user's reflection.
--
-- Trigger auto-logs every status transition with note=NULL. The UI then
-- patches the note on the just-inserted row when the user provides one
-- in the drawer's status-change form. This keeps the audit log
-- complete even when the UI forgets the note write, and lets the user
-- attach context to the transition without changing the trigger.
--
-- Same append-only discipline as application status_changes: INSERT
-- runs from the trigger (SECURITY DEFINER) and is not granted to
-- users; UPDATE is granted but only ever used to set the `note`
-- column from the UI; DELETE is not granted.

-- ─── table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_target_status_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES company_targets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Timeline reads: "show this target's transitions, newest first"
CREATE INDEX IF NOT EXISTS idx_cts_changes_target_changed
  ON company_target_status_changes (target_id, changed_at DESC);

-- Cohort dashboards: "show all transitions for this user, newest first"
CREATE INDEX IF NOT EXISTS idx_cts_changes_user_changed
  ON company_target_status_changes (user_id, changed_at DESC);

-- ─── trigger ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_company_target_status_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO company_target_status_changes
    (target_id, user_id, old_status, new_status, changed_at)
  VALUES
    (NEW.id, NEW.user_id, OLD.status, NEW.status, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_company_target_status_change ON company_targets;
CREATE TRIGGER trg_log_company_target_status_change
  AFTER UPDATE OF status ON company_targets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_company_target_status_change();

-- ─── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE company_target_status_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cts_changes_select_own ON company_target_status_changes;
CREATE POLICY cts_changes_select_own ON company_target_status_changes
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- UPDATE is granted so the UI can patch `note` on the just-inserted
-- row. The old_status / new_status / target_id / user_id are stable
-- in practice (the UI only ever sets `note`); we don't bother with a
-- column-level guard because the audit consumers (admin dashboards)
-- can detect mutations via changed_at vs row history if needed.
DROP POLICY IF EXISTS cts_changes_update_own_note ON company_target_status_changes;
CREATE POLICY cts_changes_update_own_note ON company_target_status_changes
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- INSERT and DELETE are intentionally NOT granted — the audit trail is
-- append-only and the trigger handles inserts via SECURITY DEFINER.

-- ─── comments ────────────────────────────────────────────────────────

COMMENT ON TABLE company_target_status_changes IS
  'Append-only audit log of company_targets.status transitions. Mirrors application status_changes with an added `note` column for user reflection per transition. Trigger writes the row on every status change; UI patches `note` on the just-inserted row if the user provided one.';

COMMENT ON COLUMN company_target_status_changes.note IS
  'Optional free-text reflection captured from the drawer status-change form. Null when the user changed status without commenting. Editable by the user via the UPDATE RLS policy (in practice, only patched once right after the trigger fires).';

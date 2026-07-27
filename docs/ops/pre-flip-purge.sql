-- =====================================================================
-- Pre-flip test-account purge  (PREP ONLY - execution is hub-gated)
-- Doc: docs/ops/pre-flip-purge.md   Built: 2026-07-23
--
-- Run order: SECTION 1 (dry-run) -> eyeball -> SECTION 2 (delete, in a txn)
-- -> SECTION 3 (verify).  Apply via MCP execute_sql. NOTHING here runs on its
-- own. The target set is DERIVED BY QUERY (email pattern), never hand-copied.
-- =====================================================================

-- ============ SECTION 0 : define the target set (EDIT HERE) ============
-- Captured into a TEMP TABLE so SECTION 3 can still verify by id AFTER the
-- auth.users rows are deleted. Ships with the DEFINITE (Eli-named) set only.
-- To add Eli-APPROVED candidates, add their patterns to the WHERE below
-- (e.g.  OR email LIKE '%+6a-%'  for the 6a-flip siblings). Do NOT add the
-- other devs' demo accounts (isaacselig+demo, yishailieser+demo*) without
-- their ok.
DROP TABLE IF EXISTS _purge_targets;
CREATE TEMP TABLE _purge_targets AS
SELECT id, email
FROM auth.users
WHERE email LIKE '%+6b-%'
   OR email LIKE '%+p3p4drive%'
   OR email LIKE '%+collapse723%';

-- Sanity: list + count. CONFIRM the count == the human-approved number before
-- proceeding (stop-and-flag on any mismatch - lesson 2026-06-12).
SELECT email FROM _purge_targets ORDER BY email;
SELECT count(*) AS target_count FROM _purge_targets;   -- expect 9 for the DEFINITE set

-- ============ SECTION 1 : DRY-RUN counts (non-destructive) ============
SELECT tbl, n FROM (
  SELECT 'profiles' tbl, count(*) n FROM profiles WHERE id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'applications', count(*) FROM applications WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'application_cvs', count(*) FROM application_cvs WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'calendar_events', count(*) FROM calendar_events WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'cv_generation_progress', count(*) FROM cv_generation_progress WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'status_changes', count(*) FROM status_changes WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'conversations', count(*) FROM conversations WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'chat_messages', count(*) FROM chat_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM _purge_targets))
  UNION ALL SELECT 'company_target_status_changes', count(*) FROM company_target_status_changes WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'company_targets', count(*) FROM company_targets WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'linkedin_posts', count(*) FROM linkedin_posts WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'linkedin_optimizations', count(*) FROM linkedin_optimizations WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'linkedin_outreach_conversations', count(*) FROM linkedin_outreach_conversations WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'stories', count(*) FROM stories WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'internship_pitches', count(*) FROM internship_pitches WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'internship_profiles', count(*) FROM internship_profiles WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'career_roles', count(*) FROM career_roles WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'certifications', count(*) FROM certifications WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'daily_actions', count(*) FROM daily_actions WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'tasks', count(*) FROM tasks WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'projects', count(*) FROM projects WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'education', count(*) FROM education WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'experiences', count(*) FROM experiences WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'entity_spine', count(*) FROM entity_spine WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'profile_edits', count(*) FROM profile_edits WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'feedback', count(*) FROM feedback WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'function_cache', count(*) FROM function_cache WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'rate_limits', count(*) FROM rate_limits WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'onboarding_events', count(*) FROM onboarding_events WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'error_logs', count(*) FROM error_logs WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'reset_audit', count(*) FROM reset_audit WHERE user_id IN (SELECT id FROM _purge_targets)
  -- KEEP (shown for awareness, NOT deleted):
  UNION ALL SELECT 'function_metrics (KEEP)', count(*) FROM function_metrics WHERE user_id IN (SELECT id FROM _purge_targets)
  -- edge guards (expect 0):
  UNION ALL SELECT 'EDGE admin_users', count(*) FROM admin_users WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'EDGE companies.created_by', count(*) FROM companies WHERE created_by IN (SELECT id FROM _purge_targets)
) q
WHERE n > 0
ORDER BY n DESC;

-- ============ SECTION 2 : DELETE (transaction - review, then COMMIT or ROLLBACK) ============
-- Order respects the public->public FK graph. All cascade/set-null; none RESTRICT.
BEGIN;
  -- edge guards (registry rows are shared - NULL the ref, never delete the row)
  UPDATE companies SET created_by = NULL WHERE created_by IN (SELECT id FROM _purge_targets);
  DELETE FROM admin_users        WHERE user_id IN (SELECT id FROM _purge_targets);

  -- indirect child (no user_id) - before conversations
  DELETE FROM chat_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM _purge_targets));

  -- application children before applications
  DELETE FROM application_cvs         WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM calendar_events         WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM cv_generation_progress  WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM status_changes          WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM conversations           WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM applications            WHERE user_id IN (SELECT id FROM _purge_targets);

  -- company-target children before company_targets
  DELETE FROM company_target_status_changes WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM company_targets               WHERE user_id IN (SELECT id FROM _purge_targets);

  -- linkedin (posts ref stories SET NULL) + outreach + optimizations
  DELETE FROM linkedin_posts                    WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM linkedin_optimizations            WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM linkedin_outreach_conversations   WHERE user_id IN (SELECT id FROM _purge_targets);

  -- stories (ref experiences/conversations SET NULL) before experiences
  DELETE FROM stories             WHERE user_id IN (SELECT id FROM _purge_targets);

  -- internship
  DELETE FROM internship_pitches  WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM internship_profiles WHERE user_id IN (SELECT id FROM _purge_targets);

  -- remaining user-scoped leaf tables
  DELETE FROM career_roles    WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM certifications   WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM daily_actions    WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM tasks            WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM projects         WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM education        WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM experiences      WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM entity_spine     WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM profile_edits    WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM feedback         WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM function_cache   WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM rate_limits      WHERE user_id IN (SELECT id FROM _purge_targets);

  -- test-drive telemetry that would contaminate the flip funnel
  DELETE FROM onboarding_events WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM error_logs        WHERE user_id IN (SELECT id FROM _purge_targets);
  DELETE FROM reset_audit       WHERE user_id IN (SELECT id FROM _purge_targets);

  -- KEEP (do NOT delete): function_metrics (join-filtered ghosts),
  --   account_deletions (audit), bakeoff_results / refine_rebake_results (eval artifacts).

  -- OPTIONAL audit trail (uncomment if Eli wants the purge recorded):
  -- INSERT INTO account_deletions (user_id_was, deleted_at, reason)
  --   SELECT id, now(), 'pre-flip test-account purge' FROM _purge_targets;

  -- root public row (CASCADEs education/function_cache/internship_pitches - idempotent)
  DELETE FROM profiles WHERE id IN (SELECT id FROM _purge_targets);

  -- the account itself (CASCADEs within the auth schema: identities/sessions/refresh_tokens)
  DELETE FROM auth.users WHERE id IN (SELECT id FROM _purge_targets);
COMMIT;
-- ROLLBACK;  -- <- use this instead of COMMIT if the per-statement counts look wrong

-- ============ SECTION 3 : VERIFY (assert zero remains) ============
-- Uses _purge_targets (still holds the ids after auth.users deletion). Every
-- row here must be 0. The last row independently re-derives from the email
-- pattern and must also be 0 (the accounts are gone).
SELECT tbl, n FROM (
  SELECT 'profiles' tbl, count(*) n FROM profiles WHERE id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'experiences', count(*) FROM experiences WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'education', count(*) FROM education WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'career_roles', count(*) FROM career_roles WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'tasks', count(*) FROM tasks WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'entity_spine', count(*) FROM entity_spine WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'onboarding_events', count(*) FROM onboarding_events WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'rate_limits', count(*) FROM rate_limits WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'application_cvs', count(*) FROM application_cvs WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'function_cache', count(*) FROM function_cache WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'projects', count(*) FROM projects WHERE user_id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'auth.users by-id', count(*) FROM auth.users WHERE id IN (SELECT id FROM _purge_targets)
  UNION ALL SELECT 'auth.users by-pattern (independent)', count(*) FROM auth.users
    WHERE email LIKE '%+6b-%' OR email LIKE '%+p3p4drive%' OR email LIKE '%+collapse723%'
) q
ORDER BY n DESC;
-- Expected: every n = 0. Any non-zero row is a stop-and-flag.

DROP TABLE IF EXISTS _purge_targets;

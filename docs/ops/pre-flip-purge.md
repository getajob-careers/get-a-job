# Pre-flip test-account purge - prep package (execution hub-gated)

**Status:** PREP ONLY. Nothing here has been executed. Eli rules the go at pre-flip.
**Built:** 2026-07-23 · **Script:** `docs/ops/pre-flip-purge.sql`
**Method:** target set is derived by QUERY (email pattern), never hand-copied
(lesson 2026-06-12: build the kill-list by predicate, diff against the human-approved
list, treat any count mismatch as stop-and-flag).

## 1. Target accounts

### DEFINITE (Eli-named) - 9 accounts, matched by `email LIKE '%+6b-%' OR '%+p3p4drive%' OR '%+collapse723%'`

| bucket          | emails                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6b-flip (7)     | `+6b-cv-1784742522`, `+6b-skip-1784756949`, `+6b-fail-1784756951`, `+6b-infer-1784758566`, `+6b-pr1-1784760360`, `+6b-selfheal-1784763791`, `+6b-selfheal-1784763814` |
| p3p4drive (1)   | `+p3p4drive`                                                                                                                                                          |
| collapse723 (1) | `+collapse723` (tonight's drive)                                                                                                                                      |

### CANDIDATES - need Eli's explicit ruling (listed, NOT assumed)

**Eli-owned test/flip accounts (almost certainly purge, but not named):**
`+6a-skip-1784737130`, `+6a-cv-1784738125`, `+6a-fail-1784738528` (6a-flip siblings of 6b),
`+demo34343434`, `+cwsreview`, `+test4545454527`, `+demo2323231417` (signed in 2026-07-21),
`+test90909090909` (2026-07-21), `+test5656573829` (2026-07-20).

**Other devs' demo accounts (DO NOT purge without their ok / Eli's ruling):**
`isaacselig+demo` (Isaac), `yishailieser+demo3` (signed in 2026-07-22), `+demo4`, `+demo5` (Yishai).
Several are ACTIVELY used - purging mid-test would disrupt Isaac/Yishai. Flagged, held.

The SQL's target CTE ships with the DEFINITE pattern only. To add approved candidates,
uncomment/extend the CTE (Section 0 of the script) - the dry-run + verify re-derive from
the same CTE, so the blast radius updates automatically.

## 2. Per-table keep-vs-delete (FK sweep, with justification)

Supabase uses RLS, not FK constraints to `auth.users` - there are ZERO FKs to `auth.users`,
so every user-scoped table is purged by an explicit `WHERE user_id IN (targets)`. The
public->public FK graph (cascade rules) drives the deletion ORDER.

**DELETE (user-scoped app data):** `profiles` (PK `id` = user_id), `applications`,
`application_cvs`, `calendar_events`, `cv_generation_progress`, `conversations`,
`chat_messages` (indirect - via `conversation_id`, no user_id of its own),
`status_changes`, `company_targets`, `company_target_status_changes`, `career_roles`,
`certifications`, `daily_actions`, `education`, `entity_spine`, `experiences`, `feedback`,
`function_cache`, `internship_pitches`, `internship_profiles`, `linkedin_optimizations`,
`linkedin_outreach_conversations`, `linkedin_posts`, `profile_edits`, `projects`,
`rate_limits`, `stories`, `tasks`.

**DELETE (test-drive telemetry that WOULD contaminate the flip funnel):**
`onboarding_events` (feeds the onboarding-funnel metric the flip is measured on; test-drive
events must not skew the pre-flip baseline), `error_logs`, `reset_audit` (test noise).

**KEEP (justified):**

- `function_metrics` - **KEEP (Eli ruling).** Append-only cost/throughput telemetry;
  scrubbed-usage analytics already excludes non-real users via the auth.users join rule,
  so ghost rows are filtered and harmless. Deletion is unnecessary and loses history. (24 rows.)
- `account_deletions` - the deletion AUDIT table; keep its rows. (Script optionally INSERTs an
  audit row per purged user for traceability - commented, Eli's call.)
- `bakeoff_results`, `refine_rebake_results` (`profile_user_id`) - research/eval artifacts, not
  user data; a ghost profile ref is harmless. KEEP.
- `admin_users`, `companies` (`created_by`), `jobs`, `invite_codes`, `jd_unmapped_skill_counts`
  - shared/registry, NOT user-scoped. **Verified zero overlap** with the target set
    (admin_users 0, companies.created_by 0), so nothing to touch. If a future target IS an admin
    or created a company, the script NULLs `created_by` (never deletes the shared row) and deletes
    the admin_users grant - guarded in Section 2.

## 3. Blast radius - DEFINITE set (9 accounts), dry-run counts 2026-07-23

`profiles 9 · entity_spine 30 · career_roles 27 · experiences 22 · tasks 21 ·
onboarding_events 14 · rate_limits 13 · application_cvs 7 · education 7 · function_cache 3 ·
projects 1` · everything else 0 (applications, conversations, chat_messages, stories,
certifications, daily_actions, company_targets, linkedin__, internship__, feedback,
error_logs, reset_audit, profile_edits). KEEP: `function_metrics 24`.
Edge cases: admin_users 0, companies.created_by 0.

## 4. Execution ritual (hub-gated - do NOT run without Eli's go)

1. Run **Section 1 (DRY-RUN)** of `pre-flip-purge.sql`; eyeball the counts against this doc.
   Confirm the target count == the human-approved account count (stop-and-flag on mismatch).
2. Run **Section 2 (DELETE)** - it is wrapped in `BEGIN ... COMMIT`; review the per-statement
   row counts, and `ROLLBACK` instead of `COMMIT` if anything is off.
3. Run **Section 3 (VERIFY)** - independently re-derives the target set and asserts zero
   remaining rows across every purged table AND that the target `auth.users` rows are gone.
4. `auth.users` deletion is the LAST step (cascades within the auth schema to identities/
   sessions/refresh_tokens; no public cascade). Apply via MCP `execute_sql` or the admin API.

Apply via MCP `execute_sql` (the loaded Supabase tool). `supabase db push` is dead in this
repo (lesson 2026-06-15). This is a data purge, not a migration - no migration file.

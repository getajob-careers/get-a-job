-- Arc 0 PR#1 — drop orphan tables left by killed/undeployed surfaces.
-- Verified against live schema 2026-07-06 (docs/research/arc0-kill-manifest.md).
--
-- HELD: apply during the merge-and-deploy ritual via MCP apply_migration
-- (db push is non-functional in this repo — see tasks/lessons.md 2026-06-15),
-- AFTER the 4 remote edge-fn undeploys, THEN regenerate src/lib/database.types.ts.
--
-- NOT dropped: calendar_events — it has a live read+write (the Calendar
-- add-event feature: AddEventDialog.jsx / Calendar.jsx). "0 rows" only means
-- no user has added an event yet. See manifest section D1 (STOP).

begin;

-- campaign_sends: written only by send-reengagement (undeployed, deleted). No incoming FKs.
drop table if exists public.campaign_sends;

-- waitlist_signups: 0 rows; send-waitlist-email undeployed. No incoming FKs.
drop table if exists public.waitlist_signups;

-- job_suggestions: 0 rows; no .from() caller anywhere. No incoming FKs.
drop table if exists public.job_suggestions;

-- cv_templates: 0 rows, unused. applications.custom_template_id is a dead FK
-- column (NULL everywhere, no code reference) — drop the constraint + column first.
alter table public.applications drop constraint if exists fk_custom_template;
alter table public.applications drop column if exists custom_template_id;
drop table if exists public.cv_templates;

-- one-off seniority rollback backup from 2026-06-09; zero live code refs.
drop table if exists public."_seniority_derive_rollback_2026_06_09";

commit;

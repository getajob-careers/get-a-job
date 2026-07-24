-- Email automation arc (BUILD ONLY, dry-run). Two tables:
--   1. email_preferences  — per-user digest opt-in + unsubscribe token + last-sent marker
--   2. email_dry_run_log  — every rendered email is logged here; NOTHING is sent to a
--      real address until Eli approves samples (dry-run gate lives in the edge fns).
-- Applied via MCP apply_migration by the hub (db push is dead here, lesson 2026-06-15).
-- Nothing here sends email or touches a real user; these are empty tables + RLS.

-- ── 1. email_preferences ──────────────────────────────────────────────────────
-- One row per user, lazily upserted on first digest. job_digest_enabled defaults
-- true (opt-out model). unsubscribe_token is unguessable (uuid v4) and unique so a
-- public no-login endpoint can flip the row by token. last_job_digest_at drives the
-- "new jobs since your last digest" window (null => first-ever digest).
create table if not exists public.email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  job_digest_enabled boolean not null default true,
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  last_job_digest_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.email_preferences enable row level security;
-- Users read + toggle only their own prefs (for a future settings UI). All service
-- writes (digest upsert, token unsubscribe) go through the service role, which
-- bypasses RLS — so no user INSERT policy is needed.
drop policy if exists email_prefs_own_read on public.email_preferences;
create policy email_prefs_own_read on public.email_preferences
  for select using (auth.uid() = user_id);
drop policy if exists email_prefs_own_update on public.email_preferences;
create policy email_prefs_own_update on public.email_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 2. email_dry_run_log ──────────────────────────────────────────────────────
-- Every rendered email (digest + re-engagement) is written here in dry-run mode
-- instead of being sent. Eli reviews rows before any real send is enabled.
create table if not exists public.email_dry_run_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email_type text not null,            -- 'job_digest' | 'reengagement'
  to_email text not null,
  subject text not null,
  html_body text not null,
  text_body text,
  meta jsonb not null default '{}'::jsonb,   -- job ids, scores, window, bar, etc.
  created_at timestamptz not null default now()
);
alter table public.email_dry_run_log enable row level security;
-- Service-role only: the edge fns write it, Eli reads it via the service role /
-- dashboard. RLS enabled with NO policy => denied to anon/authenticated, which is
-- the intent (internal dry-run audit log, no user-facing surface).
create index if not exists email_dry_run_log_type_created_idx
  on public.email_dry_run_log(email_type, created_at desc);

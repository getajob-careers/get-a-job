-- function_cache — generic per-(user, function) cache fingerprint table.
--
-- Purpose: lets expensive edge functions (career-analysis, tasks,
-- learning-paths, etc.) skip regeneration when the user's inputs haven't
-- changed since the last successful run.
--
-- This table stores ONLY the input fingerprint + timestamp. The cached
-- content itself stays in its domain table (career_roles, tasks, etc.) —
-- this is just the "is the existing content still valid?" marker.
--
-- Why one table instead of per-function columns on profiles: adding 2
-- columns per cached feature would clutter profiles (hot table, ~2KB
-- per row, read on every page) with internal bookkeeping. A single
-- function_cache scales to any number of cached features without
-- profiles schema churn, and gives us a single dashboard query for
-- cache-hit telemetry across the platform.
--
-- Write order discipline (enforced in edge function code, not SQL):
-- always write the domain table FIRST, then update function_cache.
-- If function_cache write fails, the failure mode is "hash stays old →
-- next call regenerates unnecessarily" (extra cost, not stale serve).
-- Reverse order risks "hash committed, content not" → silent stale data.

create table public.function_cache (
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  function_name  text        not null,
  input_hash     text        not null,
  cached_at      timestamptz not null default now(),
  primary key (user_id, function_name)
);

comment on table  public.function_cache is
  'Per-(user, function) input fingerprint + timestamp. Lets expensive edge functions skip regeneration when inputs haven''t changed. Content lives in domain tables (career_roles, tasks, ...); this is just the staleness marker.';
comment on column public.function_cache.function_name is
  'Edge function slug, e.g. ''generate-career-analysis''. text (not enum) so new cached features add a row, not a migration.';
comment on column public.function_cache.input_hash is
  'sha256 hex of canonicalized user inputs that drive the function output. Hex (not bytea) keeps debugging in psql/dashboard readable.';

-- RLS: users can read their own cache metadata (telemetry, debugging).
-- Edge functions use service_role and bypass RLS for writes. No INSERT/
-- UPDATE/DELETE policies — default deny is correct for anything that
-- isn't service_role.
alter table public.function_cache enable row level security;

create policy "own rows readable"
  on public.function_cache
  for select
  using (auth.uid() = user_id);

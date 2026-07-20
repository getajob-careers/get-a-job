-- cv_generation_progress — per-user CV generation progress for the UI ring.
-- Contract {done, total, stage}; the fan-out edge path upserts per stage.
-- Applied via MCP apply_migration (db push is dead in this repo, lesson 2026-06-15).
-- PK = user_id: one concurrent generation per user, last-write-wins (v1 limit).
create table if not exists public.cv_generation_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  application_id uuid,
  done integer not null default 0,
  total integer not null default 0,
  -- stage: starting | authoring | assembling | coverage-retry | rendering | done | error
  stage text not null default 'starting',
  updated_at timestamptz not null default now()
);
alter table public.cv_generation_progress enable row level security;
-- Users read only their own progress row; writes are service-role only (the edge
-- function), so no user INSERT/UPDATE policy.
drop policy if exists cv_progress_own_read on public.cv_generation_progress;
create policy cv_progress_own_read on public.cv_generation_progress
  for select using (auth.uid() = user_id);

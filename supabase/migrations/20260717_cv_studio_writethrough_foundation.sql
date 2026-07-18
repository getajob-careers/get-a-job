-- CV Studio Option-A write-through — schema foundation (migration-only).
-- No behavior change; unlocks the write-mediation + write-through PR on top.
-- Verified against live DB 2026-07-17: experiences.awards ALREADY exists
-- (applied 20260715); not re-added here.
-- Applied via MCP apply_migration (db push is dead in this repo, lesson 2026-06-15).

-- 1. profile_edits — append-only audit of every write to profile source-of-truth.
--    BLOCKING PREREQUISITE for the coach's write tools (cv-studio-contracts #592
--    rule 6): no LLM-initiated profile/master write ships until every write is
--    recorded here. Human Studio write-through ships earlier on session-scoped
--    undo; this table gates only the coach.
--    TRUST BOUNDARY: with client-side INSERT allowed (below), the log is
--    BEST-EFFORT for client (Studio) writes — RLS cannot force the chokepoint, so
--    a client could technically write to profiles/experiences directly and skip
--    logging. Acceptable because (a) our own code always routes through
--    writeProfileEntity, and (b) the log is AUTHORITATIVE for what rule 6 actually
--    gates: coach/LLM writes run server-side where the chokepoint is enforced by
--    construction. The log is an audit aid, not a tamper-proof ledger.
create table if not exists public.profile_edits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  entity_type  text not null,        -- 'profile' | 'experience' | 'education' | ...
  entity_id    uuid,                 -- source row id; NULL for profile-level fields
  field        text not null,        -- 'summary' | 'bullets' | 'title' | ...
  prior_value  jsonb,                -- snapshot before the write (feeds undo)
  new_value    jsonb,
  source       text not null,        -- 'studio' | 'coach' | ...
  created_at   timestamptz not null default timezone('utc', now())
);
comment on table public.profile_edits is
  'Append-only audit of writes to profile source-of-truth via the shared write layer. Blocking prereq for coach write tools (#592 rule 6). Feeds cross-session undo. Best-effort for client writes (RLS cannot force the chokepoint); authoritative for server-side coach/LLM writes.';
create index if not exists profile_edits_user_created_idx
  on public.profile_edits (user_id, created_at desc);

-- RLS: append-only own-row. SELECT + INSERT own only; NO update/delete policy
-- (an audit log is immutable to users; the service role still bypasses for
-- server-side content writes).
alter table public.profile_edits enable row level security;
drop policy if exists "Users can view own profile_edits" on public.profile_edits;
create policy "Users can view own profile_edits" on public.profile_edits
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own profile_edits" on public.profile_edits;
create policy "Users can insert own profile_edits" on public.profile_edits
  for insert with check (auth.uid() = user_id);

-- 2. updated_at on experiences + application_cvs — Requirement 4 optimistic
--    concurrency ("never a silent clobber"). education + profiles already have it.
--    Existing rows backfill to migration time via the default; accurate going
--    forward, which is all optimistic concurrency needs.
alter table public.experiences
  add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.application_cvs
  add column if not exists updated_at timestamptz not null default timezone('utc', now());
drop trigger if exists trg_experiences_updated_at on public.experiences;
create trigger trg_experiences_updated_at
  before update on public.experiences
  for each row execute function public.set_updated_at();
drop trigger if exists trg_application_cvs_updated_at on public.application_cvs;
create trigger trg_application_cvs_updated_at
  before update on public.application_cvs
  for each row execute function public.set_updated_at();

-- 3. profiles.headline — the deterministic master builder reads profile.headline
--    (cv-master.ts -> header.subtitle), but NO such column existed, so the CV
--    headline has been SILENTLY DEAD (always empty from the profile). Adding the
--    column makes the field real; the Studio header write-through populates it.
alter table public.profiles
  add column if not exists headline text;
comment on column public.profiles.headline is
  'CV header subtitle. Read by buildMasterCvData (silently dead pre-2026-07: builder referenced it, no column existed). Written via the Studio header write-through.';

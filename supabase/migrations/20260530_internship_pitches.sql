-- internship_pitches — per-(user, company) cached pitch for the
-- Internship detail drawer.
--
-- The drawer (PR4) generates on-demand pitches when students click a
-- browse card. Without caching, every reopen would re-run a ~$0.02-0.05
-- LLM call. This table holds the structured pitch + an input
-- fingerprint so reopening within 30 days of an unchanged profile
-- returns instantly + free.
--
-- Schema choice (vs adding to function_cache): function_cache PK is
-- (user_id, function_name) — one row per user-function. Per-company
-- pitches need (user_id, company_id). Putting the pitch JSON in
-- function_cache.input_hash also violates the design comment ("Content
-- lives in domain tables; this is just the staleness marker"). Pitches
-- have no existing domain table, so this IS their domain table.
--
-- Write order (enforced in edge function): always set pitch + hash
-- together in a single UPSERT. There's no separate domain table to
-- coordinate with — the pitch IS the content.

create table public.internship_pitches (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  company_id  uuid        not null references public.companies(id) on delete cascade,
  pitch       jsonb       not null,
  input_hash  text        not null,
  cached_at   timestamptz not null default now(),
  primary key (user_id, company_id)
);

comment on table public.internship_pitches is
  'Per-(user, company) pitch cache for the Internship drawer. pitch jsonb holds the structured response: { pitched_role, pitch_rationale, who_to_contact, skill_gaps_this_fills, fit_score, career_compound_score, fit_rationale }. Regenerated when input_hash mismatches the recomputed hash OR cached_at exceeds the function-side TTL (30d).';

comment on column public.internship_pitches.pitch is
  'Structured pitch JSON returned by generate-internship-pitch. Same shape as match-internship-companies entries, plus who_to_contact (max 2 role-level titles).';

comment on column public.internship_pitches.input_hash is
  'sha256 hex of sanitised inputs: profile.target_job_titles + five_year_role + primary_domain + summary, experiences[0..5] (title/company/skills_used), internship_profile pitch signals, company (id/name/sector/industry/stage/description) + model identifier. Stable across runs via _shared/content-hash.ts stableStringify.';

-- "Recently viewed" index for any future UI surfacing the user's
-- most-recently-opened companies.
create index idx_internship_pitches_user_cached_at
  on public.internship_pitches (user_id, cached_at desc);

-- RLS: read-own (students can see their own pitches, useful for
-- debugging + a future history view). Writes are service_role only
-- since the edge function holds the model output and is the only
-- legitimate writer.
alter table public.internship_pitches enable row level security;

create policy "own rows readable"
  on public.internship_pitches
  for select
  using (auth.uid() = user_id);

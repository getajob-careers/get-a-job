-- cv_generation_progress: add a `source` discriminator + composite PK so each
-- generation function owns a distinct progress row per user. Before this, PK was
-- user_id alone (one row per user); adding refine-cv as a second writer would let
-- a refine run clobber / be confused with a concurrent generate-tailored-cv run.
--
-- generate-tailored-cv stays byte-untouched: its upsert passes NO onConflict, so
-- PostgREST resolves on the (new composite) PK, and it sets no `source`, so the
-- column DEFAULT 'generate-tailored-cv' fills in — its rows keep landing on
-- (user_id,'generate-tailored-cv'). refine-cv writes source='refine-cv' with an
-- explicit onConflict:'user_id,source', so the two functions can never collide.
--
-- Poller contract (design lane): read filtered by (user_id, source), NEVER bare
-- user_id — a bare-user_id read now returns whichever function wrote last.
--
-- Applied via MCP apply_migration (db push is dead in this repo, lesson 2026-06-15).
-- Safe on existing rows: user_id was unique (old PK), so each maps to exactly one
-- (user_id,'generate-tailored-cv') — no duplicate-key on the composite PK add.
alter table public.cv_generation_progress
  add column if not exists source text not null default 'generate-tailored-cv';
alter table public.cv_generation_progress
  drop constraint if exists cv_generation_progress_pkey;
alter table public.cv_generation_progress
  add primary key (user_id, source);
-- RLS unchanged: the existing cv_progress_own_read policy (auth.uid() = user_id)
-- still governs reads; `source` is not part of the policy.

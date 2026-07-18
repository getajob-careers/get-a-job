-- experiences.display_order — user-curated ordering for the CV Studio reorder
-- write-through (Option-A, #592). Mirrors education.display_order (added
-- 20260514_education_table_phase_a): nullable integer, index on
-- (user_id, display_order NULLS LAST, created_at) so unset rows keep their
-- created_at order. No backfill — NULLS LAST makes existing rows sort by
-- created_at until the user reorders, which is the current implicit behavior.
-- Applied via MCP apply_migration (db push is dead in this repo, lesson 2026-06-15).

alter table public.experiences
  add column if not exists display_order integer;

create index if not exists idx_experiences_user_order
  on public.experiences (user_id, display_order nulls last, created_at);

comment on column public.experiences.display_order is
  'User-curated ordering for the CV Studio experience reorder write-through. NULL = unset (falls back to created_at order). Mirrors education.display_order.';

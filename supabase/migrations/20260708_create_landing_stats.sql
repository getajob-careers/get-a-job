-- landing_stats: single-row cache for the marketing-site Hero counters
-- (2026-07-08). Backs the "N live roles" / "N companies hiring now" stats
-- on LandingV2Preview.jsx, replacing the hand-maintained literals in
-- HERO_STATS (src/pages/_preview/LandingV2Preview.jsx:1039-1051), last
-- manually refreshed by Eli on 2026-07-07 (PR #512) to 5,700 / 525.
--
-- Populated nightly by scripts/refresh-jobs.ts (service role) as the final
-- step of the existing job-refresh cron, AFTER the soft-delete sweep runs,
-- so the counts reflect that night's is_active state. The writer UPSERTs
-- the single row (id = 1) with:
--
--   live_roles_count       = COUNT(*)                 FROM public.jobs
--                             WHERE is_il = TRUE AND is_active = TRUE
--   companies_hiring_count = COUNT(DISTINCT company_slug) FROM public.jobs
--                             WHERE is_il = TRUE AND is_active = TRUE
--
-- This is the EXACT is_il/is_active filter used by search_jobs_by_role_titles
-- and count_active_jobs_by_role_titles (20260517_create_jobs_cache_table.sql,
-- 20260612_jobs_search_deterministic_order.sql, 20260612_count_jobs_honest_
-- filters.sql) — no naive count(*) over the whole table, no role-title
-- trigram filtering (that part of those RPCs is for personalized track
-- matching and doesn't apply to a sitewide anonymous-visitor stat).
-- companies_hiring_count counts distinct companies WITH an active job right
-- now, not the size of the companies_il.json / public.companies registry.
--
-- Rollback: DROP TABLE public.landing_stats;

CREATE TABLE public.landing_stats (
  -- Fixed at 1 — the CHECK constraint plus PRIMARY KEY makes a second row
  -- impossible, so callers can always .select().single() with no WHERE.
  id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  live_roles_count        INTEGER NOT NULL,
  companies_hiring_count  INTEGER NOT NULL,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.landing_stats IS
  'Single-row cache of the marketing Hero counters, refreshed nightly by scripts/refresh-jobs.ts (service role) from public.jobs using the is_il=TRUE AND is_active=TRUE filter shared with search_jobs_by_role_titles. Frontend reads updated_at to detect staleness (>~48h) and falls back to the hardcoded HERO_STATS literals if the read fails or is stale.';

COMMENT ON COLUMN public.landing_stats.id IS
  'Always 1. CHECK (id = 1) + PRIMARY KEY enforces a single row.';

-- ── RLS ─────────────────────────────────────────────────────────────────
-- Public read-only counter: anon (logged-out landing page) and authenticated
-- both need SELECT. No INSERT/UPDATE/DELETE policy is created for any role
-- — the nightly cron writes via the service-role key, which bypasses RLS
-- entirely, so this table has no write path for anon/authenticated even
-- with RLS enabled. Per Eli's approval condition #1.
ALTER TABLE public.landing_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY landing_stats_read_anon
  ON public.landing_stats
  FOR SELECT
  TO anon
  USING (TRUE);

CREATE POLICY landing_stats_read_authenticated
  ON public.landing_stats
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Seed the single row so the frontend has something to read before the
-- first nightly cron run lands. Matches the current HERO_STATS literals
-- (src/pages/_preview/LandingV2Preview.jsx:1041,1047 — Eli's 2026-07-07
-- manual refresh, PR #512) so behavior is unchanged until the cron
-- overwrites it with a live count.
INSERT INTO public.landing_stats (id, live_roles_count, companies_hiring_count)
VALUES (1, 5700, 525);

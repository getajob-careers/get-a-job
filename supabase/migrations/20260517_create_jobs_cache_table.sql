-- Local jobs cache (PR 1 of 3, 2026-05-17).
--
-- Replaces the on-demand Active Jobs DB fetch model with a nightly cron
-- that pulls from 116 verified ATS endpoints (Greenhouse / Lever / Ashby
-- / Workday / SmartRecruiters) and UPSERTs normalized rows into this table.
-- Frontend queries this table directly via supabase-js — no edge function
-- in the hot read path.
--
-- This PR creates the schema only. PR 2 ships the fetcher script + GitHub
-- Actions cron. PR 3 cuts the frontend over with a feature flag.

-- pg_trgm enables GIN-indexed substring search on title — used by the
-- Browse Jobs keyword filter. Cheaper than a separate tsvector full-text
-- column for our use case (single-field substring match, not phrase search).
--
-- Installed in the `extensions` schema (NOT public) for consistency with
-- pgcrypto / uuid-ossp / pg_stat_statements and to satisfy Supabase's
-- `extension_in_public` linter. The trgm index below references the
-- operator class explicitly via the schema prefix.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE public.jobs (
  -- ── Identity + dedup ──────────────────────────────────────────────────
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ATS-assigned job ID. Stable across nightly fetches — the dedup key.
  -- Greenhouse: numeric string. Lever: UUID. Ashby: ULID. Workday: long
  -- composite path string. SmartRecruiters: UUID.
  ats_source            TEXT NOT NULL,
  external_id           TEXT NOT NULL,
  -- Links to the company registry (tasks/israeli_ats_companies.json).
  -- Slug is the ATS slug (e.g. 'wix', 'monday', 'fiverr'), NOT a UUID FK,
  -- since companies aren't stored in a DB-managed table for ATS lookup.
  company_slug          TEXT NOT NULL,
  -- Denormalized for fast browse queries without join.
  company_name          TEXT NOT NULL,

  -- ── Display fields ────────────────────────────────────────────────────
  title                 TEXT NOT NULL,
  -- HTML or plain text — varies by ATS. Frontend strips/sanitizes per ATS.
  description           TEXT,
  -- Direct link to the ATS application page. NOT a tracking link.
  apply_url             TEXT NOT NULL,

  -- ── Location (raw + normalized) ───────────────────────────────────────
  -- Exactly what the ATS returned (e.g. "Tel Aviv, Tel-Aviv District,
  -- Israel" / "TLV" / "Hybrid - Herzliya"). Kept for display + debugging.
  location_raw          TEXT,
  -- Normalized canonical city ("Tel Aviv", "Herzliya", "Remote IL", null).
  -- Computed by the fetcher's classifyLocation() helper.
  location_city         TEXT,
  -- Precomputed IL filter — fastest possible WHERE clause for the browse
  -- query. Set true if structured country='IL' OR location matched any
  -- IL city keyword (with word-boundary "IL" / "israel" guards to avoid
  -- false positives on Illinois / Lille).
  is_il                 BOOLEAN NOT NULL DEFAULT FALSE,
  is_remote             BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Compensation ──────────────────────────────────────────────────────
  salary_min            NUMERIC,
  salary_max            NUMERIC,
  salary_currency       TEXT,

  -- ── Classification (inferred) ─────────────────────────────────────────
  -- Six buckets: entry / mid / senior / lead / director / executive.
  -- Set by detectJobSeniority() from title; when years_experience parsing
  -- succeeds, that signal overrides the title-based guess.
  seniority             TEXT NOT NULL,
  -- v2 seniority: parsed from job description via deterministic regex
  -- ("5+ years", "3-5 yrs", "minimum 2 years"). Null when nothing matched.
  -- Used in the Top Picks heuristic and surfaced as subtle "0-2 yrs"
  -- chips on Browse cards.
  years_experience_min  INTEGER,
  years_experience_max  INTEGER,
  industry              TEXT,

  -- ── Lifecycle ─────────────────────────────────────────────────────────
  -- ATS-supplied posting date. Null for ATSs that don't expose it.
  date_posted           TIMESTAMPTZ,
  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Bumped on every nightly fetch that re-encounters this external_id.
  -- Soft-delete sweep marks is_active=FALSE for rows where
  -- last_seen_at < now() - 2 days (absorbs single-night fetch failures).
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Forensics ─────────────────────────────────────────────────────────
  -- Full ATS response — cheap insurance against schema decisions we'll
  -- want to revisit (re-parse seniority, extract benefits, etc.) without
  -- a re-fetch. ~5-20 KB per row; bounded by the ~4000 IL jobs we expect.
  raw_payload           JSONB,
  fetched_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dedup constraint — every (ats_source, external_id) pair is unique.
  -- Nightly fetcher uses ON CONFLICT (ats_source, external_id) DO UPDATE.
  CONSTRAINT jobs_dedup_key UNIQUE (ats_source, external_id)
);

COMMENT ON TABLE public.jobs IS
  'Local cache of Israeli tech-company job listings, fetched nightly from public ATS APIs (Greenhouse / Lever / Ashby / Workday / SmartRecruiters). Source of truth for Browse Jobs + Top Picks reads.';

-- ── Indexes ─────────────────────────────────────────────────────────────
-- Partial index covers the hot path: "active IL jobs". The WHERE clause
-- makes the index smaller (no inactive rows) and faster than a full index.
CREATE INDEX idx_jobs_active_il
  ON public.jobs (is_il, is_active)
  WHERE is_active = TRUE;

-- Seniority filter (composite — Postgres can use prefix for any of these).
CREATE INDEX idx_jobs_seniority
  ON public.jobs (seniority, is_il, is_active);

-- Company lookup for "all jobs at company X" + tracker cross-reference.
CREATE INDEX idx_jobs_company
  ON public.jobs (company_slug);

-- Industry filter for "Top Picks in HealthTech" / "Browse Cybersecurity".
CREATE INDEX idx_jobs_industry
  ON public.jobs (industry, is_il, is_active);

-- Recency sort — DESC NULLS LAST puts dated jobs first, undated last.
CREATE INDEX idx_jobs_posted
  ON public.jobs (date_posted DESC NULLS LAST);

-- Keyword search on title. gin_trgm_ops supports ILIKE '%foo%' queries
-- without a full-text-search pipeline. ~3-5x larger than a btree index
-- on title, but the substring-match speedup pays for itself many times
-- over on the browse-page keyword filter. Operator class is referenced
-- with the `extensions.` schema prefix because we installed pg_trgm
-- outside the public schema.
CREATE INDEX idx_jobs_title_trgm
  ON public.jobs USING GIN (title extensions.gin_trgm_ops);

-- ── RLS ─────────────────────────────────────────────────────────────────
-- Authenticated users can read all rows. No row-level scoping needed —
-- jobs are public listings, identical for every user. Writes are
-- service-role-only (RLS blocks everything else by default since we
-- create no INSERT/UPDATE/DELETE policy).
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_read_authenticated
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (TRUE);

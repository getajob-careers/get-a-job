-- Jobs extraction v4 — extended structured fields
--
-- Adds 10 new columns + 5 JSONB-refinement columns to the jobs table for the
-- v4 extractor schema. Each one is JD-signal we know exists from the
-- 3,054-job v3 backfill audit but didn't have a place to land.
--
-- Refinement columns are NEW (suffix `_struct` or domain-prefixed) — we keep
-- the existing v3 columns intact for backward compatibility. The extractor
-- writes to BOTH so downstream consumers can migrate at their own pace.

ALTER TABLE jobs
  -- New v4 fields (10)
  --
  -- 1. AI-tool fluency requirement (45% of JDs in 2026)
  --    Shape: { required:["cursor","claude_code"], nice:["copilot"], mindset_flag:bool }
  --    mindset_flag=true when the JD has an "AI-first" cultural framing but
  --    doesn't name specific tools.
  ADD COLUMN req_ai_tooling JSONB,

  -- 2. Per-skill years requirement (40% of JDs)
  --    Shape: [{ skill: "kubernetes", years_min: 2, required: true }, ...]
  --    Supplements the flat req_years_min — lets the deterministic scorer do
  --    per-skill gap analysis instead of one years-vs-experience check.
  ADD COLUMN req_skill_years JSONB,

  -- 3. On-call rotation expectation (20-40% of infra/backend JDs)
  --    none | occasional | rotation_required | 24_7
  ADD COLUMN on_call_expected TEXT,

  -- 4. Office policy structured (supplements days_in_office)
  --    Shape: { days_in_office_min, days_in_office_max, mandatory: bool, full_remote: bool, days_specified: bool }
  ADD COLUMN office_policy JSONB,

  -- 5. Notable customers / brand logos named in the JD body (55% prevalence)
  --    Free-text array of customer names: ["Toyota","NBC News","Fortune 500"]
  ADD COLUMN notable_customers TEXT[],

  -- 6. Company scale signals stated in the JD ("40TB/day", "600M DAU")
  --    Shape: { users_dau, users_total, data_volume, transactions, customers_count, revenue }
  --    Free-form numeric or text values per key — extractor populates whatever it finds.
  ADD COLUMN scale_signals JSONB,

  -- 7. Israeli-specific compensation perks (25% of IL employer JDs)
  --    Shape: { keren_hishtalmut: bool, meal_card: 'cibus'|'10bis'|null,
  --             wellness_stipend_nis: int, study_fund: bool, gym: bool,
  --             commute_subsidy: bool, meals_provided: bool }
  ADD COLUMN il_benefits JSONB,

  -- 8. Funding / valuation signals from JD prose (30%)
  --    Shape: { last_round_size_usd, last_round_type: 'seed'|'series_a'|...,
  --             total_raised_usd, valuation_usd, notable_investors: text[] }
  ADD COLUMN funding_signals JSONB,

  -- 9. Track type (IC vs management)
  --    ic | manager | tech_lead | hybrid_player_coach | unknown
  ADD COLUMN track TEXT,

  -- 9b. Direct reports range (only when track is manager / hybrid)
  ADD COLUMN direct_reports_min INT,
  ADD COLUMN direct_reports_max INT,

  -- 10. JD body language detection (Hebrew vs English)
  --     en | he | mixed
  ADD COLUMN jd_language TEXT,

  -- ═══════════════════════════════════════════════════════════════════════
  -- 5 JSONB refinements (add structured versions; keep existing flat fields
  -- for backward compatibility — extractor writes both)
  -- ═══════════════════════════════════════════════════════════════════════

  -- equity_mentioned BOOLEAN → equity_struct JSONB
  --   { mentioned: bool, type: ['options'|'rsu'|'espp'], qualifier: 'meaningful'|'standard'|null,
  --     percentage: numeric|null, vesting_mentioned: bool, refresh_mentioned: bool }
  ADD COLUMN equity_struct JSONB,

  -- benefits TEXT[] → benefits_struct JSONB
  --   { pto_days: int, retirement_match_pct: numeric, parental_leave: bool,
  --     mental_health: bool, learning_budget: bool, gym_wellness: bool,
  --     meal_voucher: bool, commute_subsidy: bool, dental: bool, vision: bool, health: bool }
  ADD COLUMN benefits_struct JSONB,

  -- travel_percentage TEXT → travel_struct JSONB
  --   { percentage_max: int, destinations: text[], frequency: 'monthly'|'quarterly'|'ad_hoc' }
  ADD COLUMN travel_struct JSONB,

  -- reports_to TEXT → reports_to_struct JSONB
  --   { title: text, function: text, seniority: 'manager'|'director'|'vp'|'cxo', named: bool }
  ADD COLUMN reports_to_struct JSONB,

  -- company_size_employees INT → add rd_local_headcount + local_office_city
  --   Local IL headcount is what students care about (vs global)
  ADD COLUMN rd_local_headcount INT,
  ADD COLUMN local_office_city TEXT;

-- Indexes for filterable new fields
CREATE INDEX idx_jobs_on_call ON jobs (on_call_expected) WHERE on_call_expected IS NOT NULL;
CREATE INDEX idx_jobs_track ON jobs (track) WHERE track IS NOT NULL;
CREATE INDEX idx_jobs_jd_language ON jobs (jd_language) WHERE jd_language IS NOT NULL;
CREATE INDEX idx_jobs_notable_customers ON jobs USING GIN (notable_customers);
CREATE INDEX idx_jobs_req_ai_tooling ON jobs USING GIN (req_ai_tooling);
CREATE INDEX idx_jobs_il_benefits ON jobs USING GIN (il_benefits);
CREATE INDEX idx_jobs_local_office_city ON jobs (local_office_city) WHERE local_office_city IS NOT NULL;

COMMENT ON COLUMN jobs.req_ai_tooling IS
  '2026 signal — AI-tool fluency named as required (Cursor/Claude Code/Copilot). 45% of v3 JDs.';
COMMENT ON COLUMN jobs.req_skill_years IS
  'Per-skill years gating — replaces flat req_years_min for the deterministic scorer. Array of { skill, years_min, required }.';
COMMENT ON COLUMN jobs.on_call_expected IS
  'none | occasional | rotation_required | 24_7. Junior-fit filter — interns cannot meaningfully claim on-call.';
COMMENT ON COLUMN jobs.notable_customers IS
  'Customer logos / company names cited in the JD body (e.g. "Toyota", "NBC News", "Fortune 500"). Used for CV positioning + company-prestige signal.';
COMMENT ON COLUMN jobs.scale_signals IS
  'Scale metrics stated in JD ({users_dau, data_volume, transactions, customers_count, revenue}). Differentiates JDs by product scale.';
COMMENT ON COLUMN jobs.il_benefits IS
  'IL-specific comp perks (Keren Hishtalmut, 10bis/Cibus, wellness stipend). 25% of mature-IL-employer JDs.';

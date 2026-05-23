-- Extended job-requirements extraction columns (Phase 1.5)
--
-- Following the sample-run findings, we're expanding the extraction schema
-- BEFORE the full 3,187-job backfill so we capture every valuable signal in
-- one $16 pass. Each field has been chosen on prevalence-in-actual-JDs +
-- clear downstream consumer (Jobs page, CV gen, Career Roadmap, chat
-- agents, Tracker eligibility checks).
--
-- All additive; no existing column is changed. Existing scraper-populated
-- columns (salary_min, salary_max, salary_currency, industry, seniority,
-- years_experience_min/max) are NOT overwritten by extraction — the
-- extractor only fills when those are null.

ALTER TABLE jobs
  -- Customer / market context (Tier A, 52% prevalence)
  ADD COLUMN customer_type TEXT[],          -- enterprise | mid_market | smb | consumer | b2b | b2c | b2b2c | government

  -- Industry vertical (Tier A, 20% explicit, supplements existing `industry`)
  -- The existing `industry` column is scraper-derived and often blank.
  -- `industry_vertical` is JD-derived as a normalized snake_case array so
  -- the downstream scorer can match against user preferences cleanly.
  ADD COLUMN industry_vertical TEXT[],

  -- Company stage / size signal (Tier A, derived from "Series B", "100
  -- employees", "publicly traded", "growing startup")
  ADD COLUMN company_stage TEXT,            -- early_stage_startup | growth_stage_startup | scale_up | enterprise | public_corp | mature_private
  ADD COLUMN company_size_employees INT,    -- when stated ("100 employees", "5,000 employees")
  ADD COLUMN founded_year INT,              -- when stated ("Founded in 2018")

  -- Tech context (Tier A for tech roles)
  -- tech_stack carries the verbatim tool names from the JD ("Terraform",
  -- "Amazon EKS"), distinct from req_skills_core which only contains
  -- canonical skill_library IDs. CV gen surfaces these in Skills/Tools.
  ADD COLUMN tech_stack TEXT[],

  -- Process / methodology signals
  ADD COLUMN methodology TEXT[],            -- agile | scrum | kanban | tdd | ci_cd | devops | pair_programming | code_review | gitops

  -- Compensation (Tier A — JD extraction complements scraper's structured
  -- salary fields). The extractor ONLY writes these when the JD prose
  -- explicitly states comp; it never overwrites scraper-populated values.
  -- Note: salary_min / salary_max / salary_currency already exist from the
  -- scraper. Only NEW columns added below.
  ADD COLUMN salary_cadence TEXT,           -- hourly | monthly | annual
  ADD COLUMN equity_mentioned BOOLEAN,
  ADD COLUMN bonus_mentioned BOOLEAN,

  -- Scope / scale signal
  ADD COLUMN team_size INT,                 -- "join our 12-person team" → 12. Null when not stated.
  ADD COLUMN reports_to TEXT,               -- "Reports to VP of Engineering" — verbatim phrase

  -- Work arrangement (Tier A for hybrid + Tier B for travel details)
  ADD COLUMN days_in_office INT,            -- only when hybrid + days are stated (1-5)
  ADD COLUMN travel_percentage TEXT,        -- raw phrase: "up to 25%", "occasional", "minimal"

  -- Application requirements (Tier A — pre-application UX)
  ADD COLUMN application_extras TEXT[],     -- github_required | portfolio_required | cover_letter_required | writing_sample_required | case_study_required | linkedin_required | reference_required

  -- Interview process (Tier B)
  -- JSONB so we can capture varied shapes: rounds count, named stages,
  -- take-home boolean, system-design boolean, case-study boolean, length.
  -- Used by the Interview Coach for prep when this data exists.
  ADD COLUMN interview_process JSONB,

  -- Benefits (Tier B — informational, displayed but not matched-on)
  ADD COLUMN benefits TEXT[],               -- health_insurance | dental | parental_leave | learning_budget | gym_wellness | pension | hishtalmut | rsus | bonus | wfh_stipend | flexible_hours | unlimited_pto | sabbatical | relocation_support

  -- Hard eligibility filters (Tier A — surface upfront so students don't
  -- waste applications on roles they can't qualify for)
  -- {
  --   "il_military_completed": true,           // role requires IDF service complete
  --   "il_military_unit_specific": "8200",     // when role names a specific unit
  --   "security_clearance_required": true,
  --   "security_clearance_level": "TS/SC",
  --   "miluim_friendly": true,                 // explicitly accommodates reservist duty
  --   "citizenship_required": "israeli",
  --   "work_authorization_required": "israeli_or_eu"
  -- }
  ADD COLUMN eligibility_constraints JSONB,

  -- Freeform signal capture for market-pattern observation. The extractor
  -- can record 0-3 phrases per JD that seem recurring/noteworthy but don't
  -- fit any defined schema field (e.g., "AI-first engineering culture",
  -- "open source contributions valued", "fully async team"). We aggregate
  -- across the backfill to spot patterns we should add as fields in v2.
  --
  -- Shape: [{ signal: "ai_first_culture", evidence: "We are building an AI-first engineering culture", category: "culture" }, ...]
  ADD COLUMN extraction_freeform_signals JSONB;

-- Column comments for documentation + dashboard display.
COMMENT ON COLUMN jobs.customer_type IS
  'Customer segment the role serves: enterprise | mid_market | smb | consumer | b2b | b2c | b2b2c | government';
COMMENT ON COLUMN jobs.company_stage IS
  'Company maturity: early_stage_startup | growth_stage_startup | scale_up | enterprise | public_corp | mature_private';
COMMENT ON COLUMN jobs.tech_stack IS
  'Verbatim tool/framework names from the JD ("Terraform", "Amazon EKS"). Distinct from req_skills_core (canonical skill_library IDs).';
COMMENT ON COLUMN jobs.eligibility_constraints IS
  'Hard eligibility filters: IDF service, security clearance, citizenship, work authorization. Used as pre-application UX filter.';
COMMENT ON COLUMN jobs.extraction_freeform_signals IS
  'Per-JD freeform pattern capture (0-3 entries) for market-signal analysis. Mined post-backfill to surface emerging trends we did not pre-define.';

-- Indexes for the new filterable fields. GIN for arrays + JSONB; B-tree on
-- scalars used in equality filters. These are the columns the Jobs page
-- filter UI will use most frequently once Phase 3 ships.
CREATE INDEX idx_jobs_customer_type ON jobs USING GIN (customer_type);
CREATE INDEX idx_jobs_industry_vertical ON jobs USING GIN (industry_vertical);
CREATE INDEX idx_jobs_company_stage ON jobs (company_stage) WHERE company_stage IS NOT NULL;
CREATE INDEX idx_jobs_tech_stack ON jobs USING GIN (tech_stack);
CREATE INDEX idx_jobs_application_extras ON jobs USING GIN (application_extras);
CREATE INDEX idx_jobs_eligibility ON jobs USING GIN (eligibility_constraints);

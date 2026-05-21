-- Job Requirements Extraction (Phase 1)
--
-- Adds structured requirement columns to the `jobs` cache so we can do
-- deterministic profile-vs-job fit scoring at view time instead of running
-- analyze-job-match (one LLM call per user-view). One LLM extraction per job
-- during the nightly scrape replaces N user-view LLM calls.
--
-- Migration is additive only. Existing scoring paths (analyze-job-match,
-- generate-career-analysis) keep working until Phase 3 wires the deterministic
-- scorer into the Jobs page.

ALTER TABLE jobs
  -- Years-of-experience requirement, extracted from JD prose like "3-5 years"
  ADD COLUMN req_years_min INT,
  ADD COLUMN req_years_max INT,

  -- Canonical seniority from roleLibrary.seniority_levels:
  -- Entry | Entry_Mid | Mid | Senior | Lead_Manager | Director_Head | VP_Executive
  ADD COLUMN req_seniority TEXT,

  -- Education requirements. Levels are normalized to onboarding's EDUCATION_LEVELS
  -- vocab: high_school | associate | bachelors | masters | phd | bootcamp |
  -- self_taught. Fields are free-form snake_case (computer_science,
  -- industrial_engineering, business_administration, etc.). `strict=true` means
  -- the JD lacks any "or equivalent" softening clause.
  ADD COLUMN req_education_levels TEXT[],
  ADD COLUMN req_education_fields TEXT[],
  ADD COLUMN req_education_strict BOOLEAN,

  -- Canonical skill_library IDs only — extractor resolves free-text skill
  -- names via skill-aliases.ts. Anything that doesn't resolve goes to
  -- extraction_unmapped_skills (per-job) AND increments
  -- jd_unmapped_skill_counts (global frequency).
  ADD COLUMN req_skills_core TEXT[],
  ADD COLUMN req_skills_nice TEXT[],

  -- Language requirements: [{language: "English", proficiency: "Native"}].
  -- proficiency uses our standard vocab: Native | Fluent | Professional |
  -- Conversational | Basic.
  ADD COLUMN req_languages JSONB,

  -- Eligibility constraints surfaced verbatim from the JD when present
  -- ("Israeli citizens only", "Security clearance required", etc.). Null
  -- when none. Stored as raw text so the UI can display the user-facing
  -- phrasing without rephrasing it.
  ADD COLUMN req_visa_constraint TEXT,

  -- Canonical role family from roleLibrary.role_families (e.g. "Product",
  -- "Customer_Experience"). Used by the deterministic scorer to compute
  -- domain-match against profile.primary_domain.
  ADD COLUMN function_family TEXT,

  -- Snake_case action terms the JD emphasizes ("user_stories",
  -- "backlog_management", "prds"). Feeds CV tailoring + UI gap reasoning.
  ADD COLUMN responsibility_keywords TEXT[],

  -- Free-text skills the extractor couldn't resolve to a canonical
  -- skill_library ID. Audit trail per job; the global aggregate lives in
  -- jd_unmapped_skill_counts.
  ADD COLUMN extraction_unmapped_skills TEXT[],

  -- 0..1 confidence the extractor reports. Low confidence (< 0.4) → the
  -- scorer falls back to title-only tier. Reasons logged separately.
  ADD COLUMN extraction_confidence NUMERIC,

  -- Which model produced this row. Lets us roll forward when we upgrade.
  ADD COLUMN extraction_model TEXT,

  -- Bump to force re-extraction. Increment when the extractor schema changes
  -- in a way that needs everyone re-processed. Today = 1.
  ADD COLUMN extraction_schema_version INT DEFAULT 1,

  -- Hash of the JD text the extractor saw. Lets the nightly scrape skip
  -- jobs whose description hasn't changed since last extraction.
  ADD COLUMN description_hash TEXT,

  ADD COLUMN extracted_at TIMESTAMPTZ;

-- Index supports the nightly "what needs extracting?" query: anything
-- with no extraction OR a stale schema version. Partial index keeps it small.
CREATE INDEX idx_jobs_needs_extraction ON jobs (id)
  WHERE extracted_at IS NULL OR extraction_schema_version < 1;

COMMENT ON COLUMN jobs.req_seniority IS
  'Canonical seniority: Entry | Entry_Mid | Mid | Senior | Lead_Manager | Director_Head | VP_Executive (matches roleLibrary.seniority_levels)';
COMMENT ON COLUMN jobs.req_skills_core IS
  'Canonical skill_library IDs only (snake_case). Free-text skills that did not resolve go to extraction_unmapped_skills.';
COMMENT ON COLUMN jobs.extraction_confidence IS
  '0..1 self-reported by extractor. < 0.4 means scorer should fall back to title-only tier.';

-- ──────────────────────────────────────────────────────────────────────────
-- Unmapped-skill frequency table
--
-- Every time the extractor encounters a skill phrase that doesn't resolve to
-- a canonical skill_library ID, it increments the count here. The aggregate
-- tells us which skills the market actually demands but our library lacks —
-- the input signal for growing 01_skill_library.ts from real data.
--
-- The promoted_to_library flag flips true after a maintainer adds the skill
-- to the library AND extends skill-aliases.ts. From that point new extractions
-- of the same phrase will resolve and won't increment this table.
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE jd_unmapped_skill_counts (
  -- Normalized lowercased form ("ci/cd pipelines", not "CI/CD Pipelines").
  -- The extractor lowercases + whitespace-collapses before insert.
  skill_phrase TEXT PRIMARY KEY,

  -- How many distinct jobs have used this exact phrase (post-normalization).
  job_count INT NOT NULL DEFAULT 1,

  -- One example job_id for spot-checking ("show me the JD that used this").
  -- Not a FK — we don't want a stale link blocking job deletes; we just need
  -- a representative pointer.
  example_job_id UUID,

  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Maintainer flips true after promoting this phrase into skill_library +
  -- skill-aliases.ts. Stops further increments treating it as unmapped.
  promoted_to_library BOOLEAN NOT NULL DEFAULT false,
  promoted_to_skill_id TEXT,
  promoted_at TIMESTAMPTZ
);

CREATE INDEX idx_jd_unmapped_skill_counts_count ON jd_unmapped_skill_counts (job_count DESC)
  WHERE NOT promoted_to_library;

COMMENT ON TABLE jd_unmapped_skill_counts IS
  'Frequency table of skill phrases extractor saw in job JDs but could not resolve to a skill_library ID. Drives skill library expansion from market signal.';

-- RLS: this table is admin-only. Edge function writes via service role.
ALTER TABLE jd_unmapped_skill_counts ENABLE ROW LEVEL SECURITY;
-- (No public policies — nobody but service role reads/writes.)

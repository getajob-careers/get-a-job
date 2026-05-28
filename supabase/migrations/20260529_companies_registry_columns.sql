-- companies: registry-side columns + 'registry' source for JSON-imported rows
--
-- Internship redesign PR1: unify companies_il.json (832 entries / 819 unique
-- normalized domains) with the curated companies table (391 rows) into a single
-- catalog. Every curated row is already a domain-subset of the JSON registry, so
-- the JSON imports cleanly UPSERT-by-domain without conflicts. Cross-links ATS
-- info onto existing rows so the future browse page can show "live jobs" badges,
-- and adds the 428 import candidates so the catalog covers the whole registry.
--
-- Out of scope for this migration:
--   - Rich profile fields (description / stage / size / founded / hq) for the
--     new imports — those stay NULL and get filled by a later multi-source
--     research pass with per-fact source URLs.
--   - The startup/scaleup/corporate *maturity* label — depends on stage/size,
--     deferred to the same later PR.
--   - Cutover of scripts/refresh-jobs.ts from JSON → DB. JSON registry stays
--     the canonical job-fetching source for now.

ALTER TABLE companies
  ADD COLUMN ats         text,
  ADD COLUMN ats_slug    text,
  ADD COLUMN api_url     text,
  ADD COLUMN verified    boolean,
  ADD COLUMN origin      text,
  ADD COLUMN enriched_at timestamptz;

COMMENT ON COLUMN companies.ats IS
  'ATS platform name from companies_il.json (greenhouse, lever, ashby, workday, comeet, smartrecruiters, successfactors, workable, custom, ...). ''unknown'' = registry entry exists but ATS hasn''t been identified.';

COMMENT ON COLUMN companies.ats_slug IS
  'ATS-side handle (greenhouse board id, lever org name, comeet token, ...). Joins with jobs.company_slug.';

COMMENT ON COLUMN companies.api_url IS
  'Precomputed ATS API endpoint, where one is known. Mirrors companies_il.json.api_url.';

COMMENT ON COLUMN companies.verified IS
  'True when refresh-jobs has confirmed the ATS slug returns IL jobs. Mirrors companies_il.json.verified.';

COMMENT ON COLUMN companies.origin IS
  'Company origin/IL-presence type from companies_il.json: israeli_founded | international_il_rd | israeli_subsidiary | aggregator. Distinct from the future maturity column (startup/scaleup/corporate) which depends on stage/size.';

COMMENT ON COLUMN companies.enriched_at IS
  'When the website-enrichment script last populated rich fields (description / stage / size / founded / hq). NULL = never enriched.';

-- Source CHECK constraint: add 'registry' alongside the existing four values.
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_source_check;

ALTER TABLE companies
  ADD CONSTRAINT companies_source_check
  CHECK (source IN ('jsearch', 'manual', 'faculty_seeded', 'research', 'registry'));

COMMENT ON COLUMN companies.source IS
  'Provenance of the row. jsearch=pulled by match-internship-companies, manual=admin-curated or student-added via Career Agent, faculty_seeded=loaded from a faculty cohort list, research=batch from initial research seed (PDF + LLM enrichment, May 2026), registry=imported from companies_il.json (May 2026).';

-- Browse-page filter + ATS join indexes (partial, NULL-skipping).
CREATE INDEX IF NOT EXISTS idx_companies_ats      ON companies (ats)      WHERE ats      IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_verified ON companies (verified) WHERE verified IS TRUE;
CREATE INDEX IF NOT EXISTS idx_companies_origin   ON companies (origin)   WHERE origin   IS NOT NULL;

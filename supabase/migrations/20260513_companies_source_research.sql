-- companies — add 'research' to the source CHECK constraint.
--
-- The original source vocabulary (migration 20260518_internship_finder
-- but applied earlier in real time) was 'jsearch' | 'manual' |
-- 'faculty_seeded'. This seed of ~250 Israeli tech companies comes
-- from a research pass (PDF source + LLM enrichment) — it isn't a
-- JSearch pull, isn't admin-typed, and isn't a faculty list. Adding
-- 'research' keeps source attribution faithful so future de-dup /
-- quality cleanup can target this batch specifically if needed.

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_source_check;

ALTER TABLE companies
  ADD CONSTRAINT companies_source_check
  CHECK (source IN ('jsearch', 'manual', 'faculty_seeded', 'research'));

COMMENT ON COLUMN companies.source IS
  'Provenance of the row. jsearch=pulled by match-internship-companies, manual=admin-curated or student-added via Career Agent, faculty_seeded=loaded from a faculty cohort list, research=batch from initial research seed (PDF + LLM enrichment, May 2026).';

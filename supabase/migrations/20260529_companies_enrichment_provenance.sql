-- companies: per-fact provenance + audit-trail model column
--
-- Internship redesign PR3. The enrichment script (scripts/enrich-companies.ts)
-- fills NULL rich fields on the 428 source='registry' rows via OpenAI's
-- Responses API web_search tool. Anti-fabrication rule is non-negotiable:
-- every filled fact must cite a verifiable source URL. This migration
-- adds the storage for those citations.
--
-- enrichment_sources: JSONB map { field_name → { url, snippet? } }. Only
--   contains entries for fields the enrichment pass actually filled in
--   that run — fields left NULL get no entry. Reading "what was the
--   source for company X's stage?" → companies.enrichment_sources->'stage'.
--
-- enrichment_model: the OpenAI model identifier that produced the
--   sources (e.g. 'gpt-4o-mini-2024-07-18'). Audit trail for quarterly
--   re-runs — when we revisit a row in 3 months we know whether mini
--   or gpt-4o filled it.
--
-- enriched_at already exists from PR1 (20260529_companies_registry_columns).

ALTER TABLE companies
  ADD COLUMN enrichment_sources jsonb,
  ADD COLUMN enrichment_model   text;

COMMENT ON COLUMN companies.enrichment_sources IS
  'Per-fact provenance for enrichment-pass writes. Shape: { "<field>": { "url": "https://...", "snippet": "..." } }. Snippets present for description + stage only; URL-only for founded_year/employee_count_range/hq_city/hq_country. Only contains entries for fields the enrichment pass actually filled. Set together with enriched_at and enrichment_model in a single transaction by scripts/enrich-companies.ts.';

COMMENT ON COLUMN companies.enrichment_model IS
  'OpenAI model identifier that produced enrichment_sources (e.g. ''gpt-4o-mini-2024-07-18''). NULL on rows never enriched. Audit trail for quarterly re-runs.';

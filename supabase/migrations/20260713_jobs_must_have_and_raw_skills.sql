-- Scoring-arc extraction-completeness pass (schema v5). Adds four columns the
-- v5 extractor writes. HELD: do NOT apply until Eli approves the full-corpus
-- re-extraction cost (see PR body). Applying this ALONE (without the pass) is
-- safe and inert — all four columns are nullable and unread until the pass
-- populates them; scoring does not consume them yet.
--
-- Applied to production via apply_migration (repo-wide DB push is broken);
-- committed here for repo<->prod sync.

-- Resolved mandatory subset of req_skills_core (canonical skill_library IDs).
-- Scoring-unused for now — a forward signal for a future must-have-aware axis.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS req_skills_must_have text[];

-- Raw-persistence: every skill PHRASE the LLM emitted, resolved or not. Lets a
-- future library expansion re-resolve the whole corpus at zero LLM cost (cheap
-- re-run of the alias resolver over these arrays) instead of a paid re-extract.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS req_skills_core_raw      text[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS req_skills_nice_raw      text[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS req_skills_must_have_raw text[];

COMMENT ON COLUMN public.jobs.req_skills_must_have IS
  'Resolved (skill_library ID) subset of req_skills_core the JD marks mandatory ("must"/"required"/"essential"/"חובה"/hard years-gate). Strict subset of req_skills_core. Set by extract-job-requirements (schema v5). Scoring does not consume this yet.';
COMMENT ON COLUMN public.jobs.req_skills_core_raw IS
  'Verbatim free-text skill phrases the LLM extracted as core requirements, BEFORE alias resolution. Persisted so future library expansions re-resolve at zero LLM cost. Superset source of req_skills_core (resolved) + the core portion of extraction_unmapped_skills. Set by extract-job-requirements (schema v5).';
COMMENT ON COLUMN public.jobs.req_skills_nice_raw IS
  'Verbatim free-text skill phrases the LLM extracted as nice-to-have, BEFORE alias resolution. See req_skills_core_raw. Set by extract-job-requirements (schema v5).';
COMMENT ON COLUMN public.jobs.req_skills_must_have_raw IS
  'Verbatim free-text skill phrases the LLM marked mandatory, BEFORE alias resolution. Strict subset of req_skills_core_raw. Set by extract-job-requirements (schema v5).';

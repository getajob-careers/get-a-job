-- Phase 0 score-coverage honesty gate: persist a per-job and per-role
-- coverage ratio so the scorer can suppress fake-confident scores for roles
-- whose domain our hand-curated skill library does not cover. Applied to
-- production via apply_migration (DB push is broken repo-wide); committed
-- here for repo<->prod sync.

ALTER TABLE public.jobs         ADD COLUMN IF NOT EXISTS skill_coverage_ratio numeric;
ALTER TABLE public.career_roles ADD COLUMN IF NOT EXISTS skill_coverage_ratio numeric;

COMMENT ON COLUMN public.jobs.skill_coverage_ratio IS
  'Phase 0 coverage gate: fraction of LLM-extracted JD skill phrases that resolved to a library skill ID (resolved / total extracted). Low => library does not cover this role''s domain and the match score is unreliable. Set by extract-job-requirements; existing rows backfilled from req_skills_core/nice + extraction_unmapped_skills (id-count approximation).';
COMMENT ON COLUMN public.career_roles.skill_coverage_ratio IS
  'Phase 0 coverage gate: user-level skill coverage = skills_canonical / (skills_canonical + skills_unmapped) at analysis time. Low => the user''s own skills were poorly understood, so every roadmap score is built on a thin generic subset. Set by generate-career-analysis; existing rows backfilled from the profile.';

-- Backfill jobs from already-stored arrays. NOTE: this uses resolved-ID
-- counts vs unmapped-phrase counts (the only data on existing rows); the
-- extractor computes the precise phrase-level ratio going forward.
UPDATE public.jobs
SET skill_coverage_ratio = round(
  (coalesce(cardinality(req_skills_core),0) + coalesce(cardinality(req_skills_nice),0))::numeric
  / nullif(coalesce(cardinality(req_skills_core),0) + coalesce(cardinality(req_skills_nice),0) + coalesce(cardinality(extraction_unmapped_skills),0), 0),
  3)
WHERE skill_coverage_ratio IS NULL
  AND (req_skills_core IS NOT NULL OR req_skills_nice IS NOT NULL OR extraction_unmapped_skills IS NOT NULL);

-- Backfill career_roles from each user's profile skill resolution, so the
-- display gate is verifiable on existing rows before any re-analysis runs.
UPDATE public.career_roles cr
SET skill_coverage_ratio = round(
  coalesce(cardinality(p.skills_canonical),0)::numeric
  / nullif(coalesce(cardinality(p.skills_canonical),0) + coalesce(cardinality(p.skills_unmapped),0), 0),
  3)
FROM public.profiles p
WHERE p.id = cr.user_id
  AND cr.skill_coverage_ratio IS NULL;

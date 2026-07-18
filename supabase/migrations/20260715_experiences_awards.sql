-- experiences.awards: the canonical STORED home for military / role awards.
--
-- Honors & Awards on a generated CV are now a DETERMINISTIC aggregation of
-- stored structured fields ONLY (education.honors + experiences.awards), each
-- traceable to its source. The LLM no longer authors that section: doing so
-- fabricated unearned awards ("Dean's List") and surfaced items with no stored
-- provenance. This column gives military / leadership-role awards a real home so
-- they survive refine/master rebuilds instead of living only in LLM output.
alter table public.experiences
  add column if not exists awards text[] not null default '{}';

comment on column public.experiences.awards is
  'Awards/commendations earned in this role (e.g. military awards). Aggregated with education.honors into the CV Honors & Awards section deterministically; never LLM-composed.';

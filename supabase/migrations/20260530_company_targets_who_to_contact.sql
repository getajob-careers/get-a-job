-- company_targets — add who_to_contact column to persist the PR4 pitch field.
--
-- match-internship-companies has emitted who_to_contact on every scored
-- company since the PR4 shared-prompt extraction, but the matcher
-- couldn't write it because the column didn't exist. With this column
-- the kanban drawer (PR5 unification) can finally surface the same
-- "Who to contact" guidance as the browse drawer reads from
-- internship_pitches.
--
-- text[] mirrors skill_gaps_this_fills's existing shape. Default empty
-- array (not NULL) so the UI never has to null-check before .length /
-- .map calls — the matcher's parser caps at 2 entries via
-- _shared/internship-pitch.ts.

alter table public.company_targets
  add column if not exists who_to_contact text[] not null default array[]::text[];

comment on column public.company_targets.who_to_contact is
  'Role-level titles to contact at this company (e.g. "CS team lead", "Recruiter"). Max 2 entries, never invented names, never ungroundable seniority — enforced by the shared pitch parser in _shared/internship-pitch.ts. Populated by match-internship-companies UPSERT and by drawer "Add to my pipeline" actions.';

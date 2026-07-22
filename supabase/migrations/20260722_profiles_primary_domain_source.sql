-- profiles.primary_domain_source — provenance for primary_domain.
--
-- WHY: primary_domain gates the jobs feed (scoreJobFit domain gate). It is
-- populated two ways: CV extraction (extract-proof-signals, the authoritative
-- signal) and, for CV-less / no-domain users, goal-picker inference
-- (_shared/infer-primary-domain.ts, added in #671). Onboarding V2's direction
-- screen writes the inferred value.
--
-- The precedence invariant the inference write must honor:
--   extraction-derived primary_domain is NEVER overwritten by inference;
--   inference writes only into a NULL value or a previously-INFERRED one.
--
-- This column makes that invariant STATED and ENFORCEABLE at the DB level: the
-- inference UPDATE carries a `WHERE primary_domain IS NULL OR
-- primary_domain_source = 'inferred'` guard, so an extracted value (source
-- 'extracted', or legacy NULL — anything that is not 'inferred') is protected
-- by construction. The inference is the ONLY writer that stamps 'inferred', so
-- re-inference can only ever overwrite its own prior guess, never real
-- extracted data.
--
-- Values:
--   'extracted' — set by the CV-extraction persist path (a follow-up stamps
--                 this; today that path leaves it NULL — see below).
--   'inferred'  — set by the goal-picker inference write.
--   NULL        — legacy rows, or an extracted value written before this column
--                 existed. Treated as authoritative (NOT 'inferred'), so the
--                 guard protects it exactly like an 'extracted' value. The
--                 invariant holds for these rows without a backfill.
--
-- Nullable, no default: absence is meaningful (pre-provenance / legacy), and a
-- default would wrongly claim provenance for every existing row.

alter table public.profiles
  add column if not exists primary_domain_source text
    check (primary_domain_source in ('extracted', 'inferred'));

comment on column public.profiles.primary_domain_source is
  'Provenance of primary_domain: extracted (CV) | inferred (goal-picker) | NULL (legacy/pre-provenance, treated as authoritative). Enforces the inference precedence invariant — inference writes only into NULL or previously-inferred values.';

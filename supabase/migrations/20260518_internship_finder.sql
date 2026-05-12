-- internship_finder — Wk 4 Strategic Internship Finder schema.
--
-- Three new tables + four columns on profiles. Backs the Internship
-- Finder feature for self-sourced Reichman practicum students (the
-- faculty-assigned path uses the same company_targets table but skips
-- the matching/finder UX — distinguished via profiles.practicum_path).
--
-- Design decisions (Eli + Claude, 2026-05-12):
--   - companies is a GLOBAL shared table (multiple users care about Atera/Wiz/etc).
--     Authenticated users SELECT; admins INSERT/UPDATE/DELETE.
--   - internship_profiles is a pitch STRATEGY, not just match characteristics:
--     realistic targets + pitchable role archetypes (grounded in TODAY's
--     strength, not aspirations) + career-compound rationale.
--   - company_targets carries the per-company pitch recommendation
--     (pitched_role + pitch_rationale + skill_gaps_this_fills) alongside
--     the two scores: fit_score (matches realistic profile) +
--     career_compound_score (serves long-term Tier 1).
--   - faculty-assigned placements use company_targets.source='faculty_assigned'.
--     No separate faculty_practicum_companies table — design simplified
--     after Eli's call to fold faculty placements into the same pipeline
--     model as self-sourced matches.
--   - LinkedIn connections fully dropped from this schema (legal risk).
--   - V1 cuts locked: no UNIQUE on companies (dedup later if noisy), no
--     outreach_drafts column (lands with draft-outreach-message
--     post-launch), no curated companies seed (lazy population from
--     match-internship-companies via JSearch).
--
-- See decisions A–O in the design conversation for full context.

-- ─── 1. internship_profiles ──────────────────────────────────────────
-- One row per user. UNIQUE (user_id) via PRIMARY KEY constraint. Output
-- of generate-internship-profile edge function.
--
-- 9 substantive columns split into 3 groups: WHAT companies / WHAT to
-- pitch / WHY this serves the long-term career. The pitch-strategy
-- framing is what distinguishes this from a generic "match my profile."

CREATE TABLE IF NOT EXISTS internship_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- WHAT KINDS OF COMPANIES would realistically take this student
  -- at their current tier. LLM scopes these to the student's actual
  -- level — Tier 3 student doesn't get pitched to a Series C unicorn.
  realistic_company_stages text[] NOT NULL DEFAULT '{}',
  realistic_team_size_range text,
  realistic_sectors text[] NOT NULL DEFAULT '{}',
  realistic_signal_filters text[] NOT NULL DEFAULT '{}',

  -- WHAT ROLES / PROJECTS TO PITCH given current strengths today.
  -- "I can help your PM team with competitor research" not "make me
  -- Head of Product." pitch_strength_signals are the specific things
  -- the student CAN offer — named projects, real metrics, real tools.
  pitchable_role_archetypes text[] NOT NULL DEFAULT '{}',
  pitch_strength_signals text[] NOT NULL DEFAULT '{}',
  pitch_anti_patterns text[] NOT NULL DEFAULT '{}',

  -- WHY this internship strategy serves the long-term career.
  -- skill_gaps_to_close are gaps from career_roles that this kind of
  -- practicum could fill; career_compound_rationale explains why
  -- doing this kind of internship NOW compounds toward Tier 1.
  skill_gaps_to_close text[] NOT NULL DEFAULT '{}',
  career_compound_rationale text,
  tier_1_role_alignment text,

  -- Meta
  rationale text,
  -- Staleness check: regenerate when career_roles changed AFTER this.
  -- Frontend compares vs MAX(career_roles.updated_at) and prompts the
  -- user to refresh if stale. No auto-regen / no background cron for v1.
  generated_from_career_roles_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ─── 2. companies (global shared pool) ───────────────────────────────
-- Many users care about the same companies (Atera, Wiz, etc.) — shared
-- table avoids per-user duplication. v1 has no curated seed; populated
-- lazily by match-internship-companies via JSearch and by admins via SQL.
--
-- No UNIQUE constraint for v1 — JSearch returning "Atera" twice with
-- slightly different names just creates two rows. Manual dedup later
-- if noisy. The lower(name) and lower(domain) indexes support the
-- matching algorithm without enforcing uniqueness.

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,                                  -- e.g. "atera.com" (no scheme)
  description text,
  industry text,
  sector text,                                  -- e.g. "B2B SaaS", "FinTech"
  stage text,                                   -- "Seed" | "Series A" | ... | "Public"
  hq_country text,
  hq_city text,
  employee_count_range text,                    -- e.g. "50-200"
  founded_year integer,
  careers_url text,
  source text NOT NULL CHECK (source IN (
    'jsearch',           -- pulled from JSearch API by match-internship-companies
    'manual',            -- admin-curated
    'faculty_seeded'     -- seeded from a faculty-provided cohort list (post-launch UI)
  )),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ─── 3. company_targets (per-user pipeline) ──────────────────────────
-- Each row = one company in this user's pipeline. Source distinguishes
-- WHERE it came from: match-internship-companies output (self-sourced
-- students), faculty placement (faculty-assigned students), or manual
-- student add. Same kanban model for all three paths.
--
-- Pitch fields (pitched_role / pitch_rationale / skill_gaps_this_fills)
-- are the load-bearing v2 of "fit_rationale" — not just "good fit" but
-- "pitch THIS role at THIS company because of THESE strengths and it
-- closes THESE gaps." Populated for source='matched'; nullable for
-- faculty_assigned / self_added.

CREATE TABLE IF NOT EXISTS company_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  source text NOT NULL CHECK (source IN (
    'matched',          -- match-internship-companies populated this row
    'faculty_assigned', -- faculty mentor assigned this placement
    'self_added'        -- student added a company they found independently
  )),

  -- Scoring (populated for source='matched'; null for the others)
  fit_score numeric(5,2),                       -- 0-100: matches realistic profile
  career_compound_score numeric(5,2),           -- 0-100: serves long-term Tier 1
  fit_rationale text,

  -- Per-company pitch recommendation
  pitched_role text,                            -- "User research support for the CS team"
  pitch_rationale text,                         -- why THIS pitch for THIS company given student's strengths
  skill_gaps_this_fills text[] DEFAULT '{}',

  -- Kanban pipeline state — same model for all sources
  status text NOT NULL DEFAULT 'exploring' CHECK (status IN (
    'exploring',
    'outreach_sent',
    'interview',
    'offered',
    'rejected',
    'declined'
  )),

  notes text,

  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  -- One row per (user, company). Re-running match-internship-companies
  -- UPSERTs against this constraint rather than inserting duplicates.
  UNIQUE (user_id, company_id)
);

-- ─── 4. profiles additions ───────────────────────────────────────────
-- practicum_path = NULL means user isn't in any practicum (default).
-- Frontend uses practicum_path to gate finder UX vs status-only display.
--
-- current_employment_status is independent of practicum — captures the
-- user's current career state for future behavior gating. Data model
-- only for v1; no smart behaviors triggered yet (per Eli's call).
-- Distinct from existing profiles.employment_status (which is an array
-- of life-stage values like 'student' / 'parent').

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS practicum_path text
    CHECK (practicum_path IN ('faculty_assigned', 'self_sourced')),
  ADD COLUMN IF NOT EXISTS practicum_cohort text,
  ADD COLUMN IF NOT EXISTS practicum_status text
    CHECK (practicum_status IN ('exploring', 'matched', 'active_internship', 'completed')),
  ADD COLUMN IF NOT EXISTS current_employment_status text
    CHECK (current_employment_status IN (
      'job_seeking', 'employed', 'internship', 'between_roles'
    ));

-- ─── 5. Indexes ──────────────────────────────────────────────────────

-- Kanban display: "show me my targets grouped by status, ranked by fit"
CREATE INDEX IF NOT EXISTS idx_company_targets_user_status_score
  ON company_targets (user_id, status, fit_score DESC NULLS LAST);

-- Ranked list (top-N suggestions for self-sourced students)
CREATE INDEX IF NOT EXISTS idx_company_targets_user_score
  ON company_targets (user_id, fit_score DESC NULLS LAST);

-- Company lookups for the matching algorithm
CREATE INDEX IF NOT EXISTS idx_companies_name_lower
  ON companies (lower(name));
CREATE INDEX IF NOT EXISTS idx_companies_domain_lower
  ON companies (lower(domain))
  WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_stage
  ON companies (stage)
  WHERE stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_hq_country
  ON companies (hq_country)
  WHERE hq_country IS NOT NULL;

-- Admin cohort dashboards (filter by practicum cohort + path)
CREATE INDEX IF NOT EXISTS idx_profiles_practicum
  ON profiles (practicum_cohort, practicum_path)
  WHERE practicum_path IS NOT NULL;

-- ─── 6. updated_at triggers ──────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_internship_profiles_updated_at ON internship_profiles;
CREATE TRIGGER trg_internship_profiles_updated_at
  BEFORE UPDATE ON internship_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_company_targets_updated_at ON company_targets;
CREATE TRIGGER trg_company_targets_updated_at
  BEFORE UPDATE ON company_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 7. RLS ──────────────────────────────────────────────────────────

-- internship_profiles: 4-policy own-row (standard pattern)
ALTER TABLE internship_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own internship_profile" ON internship_profiles;
CREATE POLICY "Users view own internship_profile" ON internship_profiles
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own internship_profile" ON internship_profiles;
CREATE POLICY "Users insert own internship_profile" ON internship_profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own internship_profile" ON internship_profiles;
CREATE POLICY "Users update own internship_profile" ON internship_profiles
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own internship_profile" ON internship_profiles;
CREATE POLICY "Users delete own internship_profile" ON internship_profiles
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- companies: SELECT for any authenticated user (shared pool);
-- admin-only INSERT/UPDATE/DELETE.
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated view all companies" ON companies;
CREATE POLICY "Authenticated view all companies" ON companies
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Admins insert companies" ON companies;
CREATE POLICY "Admins insert companies" ON companies
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins update companies" ON companies;
CREATE POLICY "Admins update companies" ON companies
  FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins delete companies" ON companies;
CREATE POLICY "Admins delete companies" ON companies
  FOR DELETE USING (is_admin());

-- company_targets: 4-policy own-row. Faculty-assigned rows for v1 are
-- seeded by admins via SQL (no UI yet); admin RLS access on companies
-- doesn't bleed to company_targets — students own their pipeline.
ALTER TABLE company_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own company_targets" ON company_targets;
CREATE POLICY "Users view own company_targets" ON company_targets
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own company_targets" ON company_targets;
CREATE POLICY "Users insert own company_targets" ON company_targets
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own company_targets" ON company_targets;
CREATE POLICY "Users update own company_targets" ON company_targets
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own company_targets" ON company_targets;
CREATE POLICY "Users delete own company_targets" ON company_targets
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ─── 8. Comments for future maintainers ──────────────────────────────

COMMENT ON TABLE internship_profiles IS
  'Strategic Internship Finder — per-user pitch strategy generated by generate-internship-profile. Captures realistic company targets + pitchable role archetypes (grounded in today''s strengths) + career-compound rationale. Distinct from a generic "match my profile" — this IS the pitch strategy. Regenerates on user request when career_roles updates past generated_from_career_roles_at.';

COMMENT ON TABLE companies IS
  'Global shared pool of companies (multiple users care about the same companies). v1 has no curated seed — populated lazily by match-internship-companies via JSearch + admin curation. No UNIQUE constraint; manual dedup later if duplicates pile up.';

COMMENT ON TABLE company_targets IS
  'Per-user company pipeline. Source distinguishes match-internship-companies output (self-sourced), faculty placement (faculty-assigned), or manual student add. Same kanban model for all three paths — frontend gates the matching UX based on profiles.practicum_path.';

COMMENT ON COLUMN company_targets.fit_score IS
  'How well this company matches the realistic targets in internship_profiles. 0-100. NULL for non-matched sources (faculty_assigned, self_added).';
COMMENT ON COLUMN company_targets.career_compound_score IS
  'How much this specific internship at this specific company serves long-term Tier 1 progression. 0-100. Distinct from fit_score — a company can be a great fit but a poor long-term move (or vice versa). NULL for non-matched sources.';
COMMENT ON COLUMN company_targets.pitched_role IS
  'The role / project the student should pitch when reaching out to this company, grounded in their TODAY-level strengths (not aspirations). E.g. "User research support for the CS team during Q3 product cycle" not "Senior PM".';

COMMENT ON COLUMN profiles.practicum_path IS
  'NULL = not in practicum. faculty_assigned = placement handled by faculty (finder UX hidden, /Practicum tracks status only). self_sourced = student finds their own (full finder UX). Determines whether match-internship-companies runs for this user.';
COMMENT ON COLUMN profiles.current_employment_status IS
  'Current career state (job_seeking / employed / internship / between_roles). Distinct from employment_status array (which is life-stage: student / parent / etc). Data model only for v1; no behaviors gated on this yet.';

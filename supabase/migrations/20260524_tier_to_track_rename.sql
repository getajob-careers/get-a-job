-- Tier → Track rename: align DB column names with the new user-facing
-- "Track 1/2/3" vocabulary the platform now uses for job-fit classification.
--
-- The renamed application code is shipping in PR-A together with this
-- migration; both must land at the same commit on main. After this runs,
-- any older deploy of the frontend (or an edge function that still reads
-- `applications.tier`) will fail — the 100-student pilot accepts that
-- coupled-deploy risk for a clean rename.
--
-- Four columns to rename:
--   1. applications.tier                    → applications.track
--   2. applications.tier_scoring_failed_at  → applications.track_scoring_failed_at
--   3. career_roles.tier                    → career_roles.track
--   4. internship_profiles.tier_1_role_alignment → internship_profiles.track_1_role_alignment
--
-- Enum values inside those columns ("tier_1" / "tier_2" / "tier_3") are
-- updated in place to "track_1" / "track_2" / "track_3" so downstream
-- code reading TRACK_CONFIG[row.track] resolves correctly.

BEGIN;

-- 1. applications.tier → track
ALTER TABLE applications RENAME COLUMN tier TO track;
ALTER TABLE applications RENAME COLUMN tier_scoring_failed_at TO track_scoring_failed_at;

-- 2. career_roles.tier → track
ALTER TABLE career_roles RENAME COLUMN tier TO track;

-- 3. internship_profiles.tier_1_role_alignment → track_1_role_alignment
ALTER TABLE internship_profiles RENAME COLUMN tier_1_role_alignment TO track_1_role_alignment;

-- Rewrite enum values: tier_N → track_N
UPDATE applications SET track = 'track_1' WHERE track = 'tier_1';
UPDATE applications SET track = 'track_2' WHERE track = 'tier_2';
UPDATE applications SET track = 'track_3' WHERE track = 'tier_3';

UPDATE career_roles SET track = 'track_1' WHERE track = 'tier_1';
UPDATE career_roles SET track = 'track_2' WHERE track = 'tier_2';
UPDATE career_roles SET track = 'track_3' WHERE track = 'tier_3';

COMMIT;

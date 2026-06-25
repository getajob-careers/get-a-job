---
title: Data model
status: living
owner: shared
last_reviewed: 2026-06-25
code_paths:
  - supabase/migrations
  - supabase/functions/_shared/libraries
  - supabase/functions/delete-account
---

> Carried over from the previous docs/ layout. Content is broadly accurate; a line-by-line review against current code is still pending (see the freshness note at the bottom).

# Database Documentation

Supabase (PostgreSQL) is the sole data store. The public schema has 40 tables, all with Row Level Security (RLS) enabled. Most are scoped to the authenticated user's `id`, so each user reads and writes only their own rows. Not all are user-scoped, though: a few are service-only (RLS is on but they have no client policies, so the browser cannot read them at all, for example `account_deletions`, `admin_users`, and `rate_limits`), and a few hold global or shared reference data that is the same for everyone (`companies`, `jobs`, `cv_templates`, `invite_codes`).

---

## Regenerating Types

When you modify the schema in Supabase, regenerate the TypeScript types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

Do not edit `database.types.ts` by hand.

---

## Complete Table Directory (40 Tables)

The active database contains the following 40 tables, all under the `public` schema with RLS enabled. RLS is on for every table, but as noted above not all are user-scoped: some are service-only (no client policies) and some hold shared reference data.

1. **`_seniority_derive_rollback_2026_06_09`**: snapshot retained from the 2026-06-09 seniority-derivation migration, kept for rollback.
2. **`account_deletions`** — Audit log of self-service account deletions (retains tombstone metadata).
3. **`admin_users`** — Configures administrative roles and control access.
4. **`application_cvs`**: stored tailored-CV records linked to an application (versions, source JD, generated output).
5. **`applications`** — Tracks job applications, milestones, custom CVs, and checklists.
6. **`bakeoff_results`**: results from CV and chat model bake-off experiments.
7. **`calendar_events`** — Chronological calendar deadlines and scheduling logs.
8. **`campaign_sends`**: log of lifecycle emails sent (welcome, waitlist, re-engagement).
9. **`career_roles`** — AI-generated and track-classified role recommendations.
10. **`certifications`** — Academic or professional user profile certifications.
11. **`chat_messages`** — History of multi-turn messaging records with AI agents.
12. **`companies`** — Standard seed and self-added company repository.
13. **`company_target_status_changes`** — Transitions log for tracking kanban movements.
14. **`company_targets`** — User-specific target internship list.
15. **`conversations`** — Thread grouping identifiers for messaging channels.
16. **`cv_templates`** — Definitions and file styling layouts for CV builders.
17. **`daily_actions`** — Action items displayed on the Daily Action Card widget.
18. **`education`** — Separate table storing university coursework, institution, and GPA details.
19. **`error_logs`** — Audit table tracing backend and Edge Function error metrics.
20. **`experiences`** — Work, military, and leadership positions.
21. **`feedback`**: user-submitted product feedback entries.
22. **`function_cache`**: cached edge-function results, keyed for reuse.
23. **`function_metrics`** — Tracks execution latency, tokens, and billing costs for Deno APIs.
24. **`internship_pitches`**: generated internship pitch records for the internship surface.
25. **`internship_profiles`**: alignment strategies that power the internship pitch surface.
26. **`invite_codes`**: pilot invite codes that gate sign-up, with usage limits (shared across users).
27. **`jd_unmapped_skill_counts`**: telemetry of job-description skills that did not map to the skill library.
28. **`job_suggestions`** — Scored job suggestions cache (refreshed daily).
29. **`jobs`** — Scrape cache of current tech jobs from supported ATS interfaces.
30. **`linkedin_optimizations`** — Copywriting prompts and optimizations for profiles.
31. **`linkedin_outreach_conversations`** — Outreach messaging threads.
32. **`linkedin_posts`** — Generated posts draft archive.
33. **`profiles`** — Consolidated user settings, status, onboarding milestones.
34. **`projects`** — Academic / personal proof portfolio details.
35. **`rate_limits`** — User-scoped rate controllers for Edge Function endpoints.
36. **`refine_rebake_results`**: results from refine-cv rebake experiments.
37. **`status_changes`** — Chronological status records for applications.
38. **`stories`** — Portfolio STAR method narratives.
39. **`tasks`** — General task management entries.
40. **`waitlist_signups`**: waitlist entries captured when the cohort is full.

---

## Core Table Schemas

> The column tables below are illustrative, not exhaustive. They list the columns that matter for understanding each table, not every column (`profiles` and `applications` in particular have many more). Treat `src/lib/database.types.ts`, regenerated from Supabase, as the authoritative schema. Status-like columns such as `applications.status` are `text`, not Postgres enums.

### `profiles`
One row per user. Created by the onboarding flow. The `id` matches Supabase Auth's `user.id` (UUID).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key = auth user ID |
| `full_name` | text | Displays user profile names |
| `phone_number` | text | |
| `linkedin_url` | text | |
| `location` | text | User-entered geography |
| `resume_url` | text | Signed URL of uploaded PDF resume file |
| `skills` | text[] | User skills array |
| `summary` | text | AI-generated professional summary |
| `onboarding_step` | int | Wizard completion index (0–8) |
| `onboarding_complete` | boolean | Set to true when tutorial is finished |
| `skill_gaps` | text[] | Identified deficiencies vs target tracks |
| `qualification_level` | text | Junior \| Mid-Level \| Senior (calculated from full_time + freelance) |
| `overall_assessment` | text | 2–3 sentence AI performance critique |
| `last_reality_check_date` | timestamptz | Date of last career track calculations |
| `has_seen_onboarding_tutorial` | boolean | Returns skip-state for onboarding carousels |
| `referral_source` | text | Captures channel of acquisition |

---

### `education`
Separate table for academic credentials (FK linked to `profiles`).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → profiles.id (CASCADE) |
| `institution` | text | School name |
| `degree_type` | text | e.g. BSc, BA |
| `field_of_study` | text | e.g. Computer Science |
| `gpa` | text | Stored as text to handle formats like 3.8/4.0 |
| `relevant_coursework` | text[] | Academic modules list |
| `skills` | text[] | Core competencies acquired |
| `start_date` | date | |
| `end_date` | date | |

---

### `applications`
One row per job application tracked by a user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `role_title` | text | |
| `company` | text | |
| `status` | text | `interested` \| `preparing` \| `applied` \| `interviewing` \| `offer` \| `accepted` \| `rejected` |
| `track` | text | `track_1` \| `track_2` \| `track_3` (renamed from tier) |
| `track_scoring_failed_at` | timestamptz| Error timestamp for retry calculations |
| `job_description` | text | Source JD text |
| `url` | text | |
| `location` | text | |
| `cv_url` | text | Tailored CV PDF link (Supabase Storage signed URL) |
| `cv_status` | text | `not_started` \| `draft` \| `ready` |
| `ats_source` | text | Source ATS the listing came from (see also `external_id`) |
| `checklist` | jsonb | Complete 7-step tracker tasks |
| `networking_contacts` | jsonb | Array of linked network contacts |
| `projects_proof` | jsonb | Linked proof items from `projects` |
| `qualification_score` | float | Float 0–1 computed score |
| `score_source` | text | `deterministic` \| `llm_enhanced` |

---

### `career_roles`
Classified recommendations generated during career analysis.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `title` | text | Canonical title from standard libraries |
| `track` | text | `track_1` \| `track_2` \| `track_3` |
| `readiness_score` | float | 0.0–1.0 score threshold (>0.6 track_1, 0.3-0.6 track_2) |
| `matched_skills` | text[] | Skills found in user's profile |
| `missing_skills` | text[] | Gap skills required for this role |
| `alignment_to_goal` | text | AI reasoning text detailing path alignment |

---

### `stories`
STAR method stories from the Story Bank.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to the owning user |
| `experience_id` | uuid | FK to the source `experiences` row (nullable) |
| `title` | text | STAR title |
| `situation` | text | STAR context |
| `task` | text | Goal or problem |
| `action` | text | What the user did |
| `result` | text | Concrete outcome |
| `metrics` | text[] | Captured quantitative outcomes |
| `skills_demonstrated` | text[] | Linked skills |
| `tools_used` | text[] | Tools and technologies used |
| `relevance_tags` | text[] | Tags for reuse and matching |
| `source` | text | How the story was captured |
| `conversation_id` | uuid | FK to the chat that produced it (nullable) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `company_targets`
Target internship pipeline tracker rows.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `company_id` | uuid | FK → companies.id |
| `status` | text | `wishlist` \| `contacted` \| `interviewing` \| `placed` \| `rejected` |
| `pitch_rationale` | text | Why this company is a fit and how to pitch |

---

## Insert-Before-Delete Pattern

When replacing user-scoped rows during batch creations (experiences, roadmaps, tasks), the app enforces the **Insert-Before-Delete** pattern to guarantee transaction safety:

1. Fetch IDs of the existing rows.
2. Insert new rows in a batch, throwing an error if it fails (the original rows are left untouched).
3. Delete the old rows by their fetched IDs only after step 2 succeeds.

**Where this pattern is used:**
- `Onboarding.jsx` `handleFinalise` — batch writes for `experiences`, `projects`, `certifications`, and `tasks`.
- `Roadmap.jsx` `handleGenerate` — batch replaces `career_roles` with rollback on failure.
- `Tasks.jsx` `handleGenerate` — regenerates the weekly `tasks` set.

---

## RLS Policy Pattern

All tables enforce Row Level Security policies. The standard RLS policy template is structured as follows:

```sql
-- SELECT: users can only read their own rows
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: users can only insert rows for themselves
CREATE POLICY "Users can insert own data" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE / DELETE: restricts edits to owned user rows
CREATE POLICY "Users can update own data" ON table_name
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON table_name
  FOR DELETE USING (auth.uid() = user_id);
```

For `profiles`, the primary key column is named `id` (matching `auth.uid()` directly). For administrative auditing tables like `account_deletions` and `function_metrics`, RLS restricts access to `service-role` executions only.

---

## Supabase Storage

There are three private Storage buckets: **`cvs`** (tailored CV PDFs generated by the edge functions), **`resumes`** (the user's uploaded resume, referenced by `profiles.resume_url`), and **`linkedin_post_images`** (images for generated LinkedIn posts). Tailored CV PDFs are written to the **`cvs`** bucket under `{user_id}/{role_title}_CV_{timestamp}.pdf` by Deno edge functions using service-role credentials to bypass RLS, returning signed URLs that expire after 315360000 seconds (about 10 years).

---

## Account deletion and FK cascade

User data is wiped on account deletion through foreign keys to `auth.users`. There are 24 such foreign keys from public tables: 22 are `ON DELETE CASCADE` (the user's own rows, for example `applications`, `experiences`, `stories`, `profiles`), and 2 are `ON DELETE SET NULL` (`companies.created_by` and `error_logs.user_id`), which anonymize shared or audit rows instead of deleting them. The `delete-account` edge function tombstones into `account_deletions`, wipes the user's storage folder, then calls the auth admin delete, which fires these cascades.

# Database Documentation

Supabase (PostgreSQL) is the sole data store. All 29 tables have Row Level Security (RLS) enabled — every query is scoped to the authenticated user's `id`.

---

## Regenerating Types

When you modify the schema in Supabase, regenerate the TypeScript types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
```

Do not edit `database.types.ts` by hand.

---

## Complete Table Directory (29 Tables)

The active database contains the following 29 tables, all under the `public` schema and protected by Row Level Security (RLS) policies:

1. **`account_deletions`** — Audit log of self-service account deletions (retains tombstone metadata).
2. **`admin_users`** — Configures administrative roles and control access.
3. **`applications`** — Tracks job applications, milestones, custom CVs, and checklists.
4. **`calendar_events`** — Chronological calendar deadlines and scheduling logs.
5. **`career_roles`** — AI-generated and track-classified role recommendations.
6. **`certifications`** — Academic or professional user profile certifications.
7. **`chat_messages`** — History of multi-turn messaging records with AI agents.
8. **`companies`** — Standard seed and self-added company repository.
9. **`company_target_status_changes`** — Transitions log for tracking kanban movements.
10. **`company_targets`** — User-specific target internship list.
11. **`conversations`** — Thread grouping identifiers for messaging channels.
12. **`cv_templates`** — Definitions and file styling layouts for CV builders.
13. **`daily_actions`** — Action items displayed on the Daily Action Card widget.
14. **`education`** — Separate table storing university coursework, institution, and GPA details.
15. **`error_logs`** — Audit table tracing backend and Edge Function error metrics.
16. **`experiences`** — Work, military, and leadership positions.
17. **`function_metrics`** — Tracks execution latency, tokens, and billing costs for Deno APIs.
18. **`internship_profiles`** — Alignment strategies for faculty practicum programs.
19. **`job_suggestions`** — Scored job suggestions cache (refreshed daily).
20. **`jobs`** — Scrape cache of current tech jobs from supported ATS interfaces.
21. **`linkedin_optimizations`** — Copywriting prompts and optimizations for profiles.
22. **`linkedin_outreach_conversations`** — Outreach messaging threads.
23. **`linkedin_posts`** — Generated posts draft archive.
24. **`profiles`** — Consolidated user settings, status, onboarding milestones.
25. **`projects`** — Academic / personal proof portfolio details.
26. **`rate_limits`** — User-scoped rate controllers for Edge Function endpoints.
27. **`status_changes`** — Chronological status records for applications.
28. **`stories`** — Portfolio STAR method narratives.
29. **`tasks`** — General task management entries.

---

## Core Table Schemas

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
| `degree` | text | e.g. BSc, BA |
| `field_of_study` | text | e.g. Computer Science |
| `gpa` | text | Stored as text to handle formats like 3.8/4.0 |
| `relevant_coursework` | text[] | Academic modules list |
| `skills_developed` | text[] | Core competencies acquired |
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
| `status` | text | `interested` \| `preparing` \| `applied` \| `interviewing` \| `offer` \| `rejected` |
| `track` | text | `track_1` \| `track_2` \| `track_3` (renamed from tier) |
| `track_scoring_failed_at` | timestamptz| Error timestamp for retry calculations |
| `job_description` | text | Source JD text |
| `url` | text | |
| `location` | text | |
| `cv_url` | text | Tailored CV PDF link (Supabase Storage signed URL) |
| `cv_status` | text | `not_started` \| `draft` \| `ready` |
| `ats_link` | text | Links to internal company tracking tools |
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
| `user_id` | uuid | FK → auth.users |
| `title` | text | STAR title |
| `situation` | text | STAR Context |
| `task` | text | Goal/problem |
| `action` | text | User activities |
| `result` | text | Concrete metric outcomes |
| `skills_demonstrated` | text[] | Linked skills |
| `is_verified` | boolean | Set when parsed through the AI reviewer |

---

### `company_targets`
Target internship pipeline tracker rows.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → auth.users |
| `company_id` | uuid | FK → companies.id |
| `status` | text | `wishlist` \| `contacted` \| `interviewing` \| `placed` \| `rejected` |
| `pitch_strategy` | text | Custom pitch rationale |
| `track_1_role_alignment`| text | Target track role relationship details |

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

The **`resumes`** bucket is private, storing CV PDFs under `{user_id}/{role_title}_CV_{timestamp}.pdf`. Tailored CV PDFs are written by Deno edge functions using service role credentials to bypass local RLS, returning secure, signed URLs expiring after 1 year.

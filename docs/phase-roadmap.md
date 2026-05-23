# Phase Roadmap

## Phase 1–4: Complete

The application was originally built on the Base44 platform. Phases 1–4 migrated it fully to a self-hosted React + Supabase stack.

| Phase | Work Done |
|-------|-----------|
| Phase 1 | Supabase project setup, client initialisation (`src/api/supabaseClient.js`) |
| Phase 2 | Database schema created (7 tables), RLS policies applied |
| Phase 3 | Supabase Auth integrated — `AuthContext`, Login page, session management |
| Phase 4 | All pages and components migrated from Base44 APIs to Supabase queries. All Base44 references removed. |

---

## Phase 5: Edge Functions + LLM Features

Phase 5 wires up the AI-powered features using **Supabase Edge Functions** (Deno/TypeScript) and the **OpenAI API** (`gpt-4o-mini`). The functions live in the `functions/` directory.

All Edge Functions share the same security pattern: user-scoped Supabase client (anon key + Authorization header) for all DB reads/writes under RLS, service client (service role key) only for rate limiting RPCs, error logging, and Storage uploads. All functions enforce rate limits, a payload size cap, guarded JSON parsing, and string truncation before injecting user data into prompts.

---

### Completed

#### Career Roadmap Generation

- **Status:** Live
- **Edge Function:** `functions/generate-career-analysis.ts`
- **Called from:** `CareerRoadmap.jsx` `handleGenerate`, `Onboarding.jsx` `handleSurveyNext`
- **What it does:** Reads the user's profile, experiences, projects, and certifications from Supabase, then calls OpenAI to produce track-classified role recommendations (track_1 / track_2 / track_3), a qualification level, an overall assessment, and a skill gaps list. Results are written to `career_roles` and the `profiles` table.
- **Rate limit:** 5 calls per hour per user
- **Payload size limit:** 100 KB

#### AI-Powered CV Generation

- **Status:** Live
- **Edge Function:** `functions/generateTailoredCV.ts`
- **Called from:** `CVManagement.jsx` inside the Application Tracker
- **What it does:** Reads the user's full profile from Supabase, generates a tailored CV JSON structure via OpenAI, renders it as a PDF using `jsPDF`, uploads the PDF to Supabase Storage (`cvs` bucket), creates or updates the `applications` row with `cv_url` and `cv_status: 'ready'`, and returns a signed download URL.
- **Payload size limit:** 50 KB
- **Requires:** `target_role` in the request body; `application_id` is optional

#### Task Generation

- **Status:** Live
- **Edge Function:** `functions/generate-tasks.ts`
- **Called from:** `Onboarding.jsx` `handleFinalise` (initial generation), `Tasks.jsx` `handleGenerate` (manual regeneration)
- **What it does:** Reads the user's profile, career roles, applications, and experience from Supabase, then calls OpenAI to produce a personalised weekly action plan of 5–8 tasks. Results are written to the `tasks` table using the insert-before-delete pattern.
- **Rate limit:** 10 calls per hour per user

#### Agent Chat

- **Status:** Live
- **Edge Function:** `ai-chat` (deployed separately, not in the `functions/` directory of this repo)
- **Called from:** `ChatInterface.jsx` (used by `CareerAgent.jsx`, `Subagents.jsx`), `StepResumeUpload.jsx` (resume extraction)
- **What it does:** General-purpose conversational AI. Accepts a message, agent type, and conversation history. For resume extraction, `StepResumeUpload` passes the raw CV text and requests a JSON-structured response.

#### Infrastructure

- **Status:** Complete
- `functions/` directory created with Deno/TypeScript Edge Functions
- `OPENAI_API_KEY` set as a Supabase project secret (never exposed to the browser)

#### Job Match Checker

- **Status:** Live
- **Edge Function:** `analyze-job-match` (deployed separately)
- **UI:** `src/components/dashboard/JobMatchChecker.jsx`
- **What it does:** User pastes a job description or URL; returns a match score and gap analysis.
- **Input:** Job description text or URL + user profile context
- **Output:** Match percentage, matched skills, missing skills, brief narrative

#### Job Suggestions (Smart Match)

- **Status:** Live (v4)
- **Edge Function:** `generate-job-suggestions` (deployed separately)
- **UI:** `src/pages/JobSuggestions.jsx`
- **What it does:** Fetches real job listings from the Reed.co.uk API based on the user's track_1 career role and location, then uses `gpt-4o-mini` to score each job against the user's profile. Results are cached in the `job_suggestions` table for 24 hours; subsequent page loads return cached data instantly.
- **Input:** User profile, career roles, experiences (auto-read from DB)
- **Output:** Array of scored jobs with title, company, salary, location, match_score, match_reason, matched/missing skills, and direct Reed link
- **Rate limit:** 5 calls per hour per user
- **Token cost:** ~$0.002 per scoring run

#### Learning Paths & Skill Gap Courses

- **Status:** Live
- **Edge Function:** `generate-learning-paths` (deployed separately)
- **UI:** `src/components/roadmap/LearningPaths.jsx`, `src/components/dashboard/SkillGapCourses.jsx`
- **What it does:** Generates a structured learning roadmap and course recommendations for closing specific skill gaps.
- **Input:** Skill gaps + target role context
- **Output:** Structured learning plan with milestones and course recommendations

---

### Pending

#### Job Import from URL

- **Edge Function needed:** `import-job-url`
- **UI:** `src/pages/Tracker.jsx` `handleImportFromUrl` (exists, intentionally non-functional)
- **What it will do:** Scrape and parse a job posting URL to auto-fill role title, company, and job description.
- **Input:** Job posting URL
- **Output:** Parsed `role_title`, `company`, `job_description`

#### Agent Conversation Storage

- **Database needed:** `agent_conversations` table (not yet created)
- **UI:** `src/components/subagents/ConversationSelector.jsx`
- **What it will do:** Persist and retrieve conversation history per user per agent.
- **Fields:** `id`, `user_id`, `agent_type`, `messages` (jsonb), `created_at`

#### LinkedIn Profile Import

- **UI:** "Connect with LinkedIn" button in `StepResumeUpload.jsx` (preserved, non-functional)
- **What it will do:** OAuth flow to import LinkedIn profile data into the onboarding wizard.

#### Calendar Events Table

- **Database needed:** `calendar_events` table (not yet created)
- **UI:** `src/pages/Calendar.jsx` (queries the table, fails gracefully with empty fallback)

---

## Phase 6: Payments and Monetisation

Stripe is installed (`@stripe/react-stripe-js`, `@stripe/stripe-js`) but not wired up. No payment flows exist. This is reserved for a future phase.

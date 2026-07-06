# Deep QA 3 — Part 1: Surface Inventory (Ground-Truth Map)

> Read-only investigation. Every LOC/count below comes from an actual `wc -l` or SQL
> `count(*)` against the live project (`ilmqmodklutztuybsvwd`), captured 2026-07-05.
> Nothing here is estimated. Where a caller could not be found, it says so explicitly.

## Shape of the codebase (one paragraph)

getajob is a React 18 + Vite SPA over a Supabase backend. The frontend ships **28 page
files** in `src/pages/` (12,996 LOC) exposing **21 authenticated routes** (via
`LAZY_PAGES`) + **7 public routes** (Landing v2, legacy Landing, login, reset-password,
privacy, terms, auth/callback) + 2 legacy redirects + **22 `_preview/*` harness routes**
that are dead-stripped from production builds. The backend runs **32 deployed edge
functions** (16,303 LOC of `index.ts`, of which **29 have local source, 3 are
remote-only deprecated duplicates**; a 4th, `send-reengagement`, has local source but is
**not deployed**). The database holds **40 public tables** (plus one dated rollback-backup
table). LOC concentrates heavily in the CV pipeline and the chat surface: the single
biggest artifact anywhere is `generate-tailored-cv/index.ts` at **2,872 LOC**, followed by
`generate-career-analysis` (1,495), `extract-job-requirements` (1,353), the AI-chat
prompt library `ai-chat/prompt-lib.ts` (1,559), and the monolithic chat renderer
`ChatInterface.jsx` (1,452). On the page side the weight sits in `Profile.jsx` (1,383),
`Landing.jsx` (1,234), and `Onboarding.jsx` (1,206). Crons are **GitHub Actions
workflows**, not pg_cron — the `cron` schema does not exist in the database.

### Headline counts

| Metric                                           | Count                                    |
| ------------------------------------------------ | ---------------------------------------- |
| Page files (`src/pages/*.jsx`)                   | 28                                       |
| Authenticated routes (`LAZY_PAGES`)              | 21                                       |
| Public routes                                    | 7 (+2 redirects, +22 `_preview` harness) |
| Deployed edge functions                          | 32                                       |
| — with local source                              | 29                                       |
| — remote-only, no source, no caller (deprecated) | 3                                        |
| — local source but NOT deployed, no caller       | 1 (`send-reengagement`)                  |
| Public tables                                    | 40 (+1 dated rollback backup)            |
| Crons (GitHub Actions)                           | 3 workflows (2 scheduled)                |

### Top-5 LOC-heaviest surfaces (whole codebase)

1. `supabase/functions/generate-tailored-cv/index.ts` — **2,872**
2. `supabase/functions/ai-chat/prompt-lib.ts` — **1,559** (chat system prompt library)
3. `supabase/functions/generate-career-analysis/index.ts` — **1,495**
4. `src/components/chat/ChatInterface.jsx` — **1,452** (all coach cards inline)
5. `src/pages/Profile.jsx` — **1,383** (heaviest page); `extract-job-requirements` 1,353 close behind

### Key redundancy / orphan signals (detail in each section)

- **3 deprecated remote-only edge fns** with no local source and no caller:
  `generate-application-tasks`, `generateApplicationTasks`, `generateTailoredCV`
  (camelCase legacy — superseded by `generate-tasks` / `generate-tailored-cv`).
- **`send-reengagement`** — local source (564 LOC) but **not deployed** and **no caller
  anywhere** (frontend, extension, or workflow). Writes `campaign_sends` (36 rows, orphan telemetry).
- **`extract-jd-basics` and `lookup-role-skills`** — no _main-app_ caller; only the Chrome
  extension (`extension/popup.js`) and scripts call them.
- **Empty tables**: `calendar_events` (0), `cv_templates` (0), `job_suggestions` (0),
  `waitlist_signups` (0). `job_suggestions`/`cv_templates` are referenced only in
  `database.types.ts` — candidates for the redundancy pass.
- **Eval/telemetry-only tables** (referenced only by `scripts/`, never read by the app):
  `bakeoff_results`, `refine_rebake_results`, `jd_unmapped_skill_counts` (22,259 rows).
- **`_seniority_derive_rollback_2026_06_09`** — dated one-off rollback backup, zero code refs.

Complexity weight legend: **S** ≤150 LOC / thin deps · **M** 150–500 · **L** 500–1000 ·
**XL** >1000 or high dependency fan-out.

---

## 1. Pages / Routes

Routing source of truth is `src/App.jsx` (route table) + `src/pages.lazy.js` (`LAZY_PAGES`).
`src/pages.config.js` is hand-maintained but App.jsx reads `LAZY_PAGES`, not `PAGES`.
Table deps below are **direct `.from()` refs**; most pages also read via shared
`src/lib/queries/*` hooks, so this is a floor not a ceiling.

### Authenticated routes (rendered inside dashboard Layout + auth gate)

| Route                      | Page (LOC)                       | Claims to do                                                 | Key deps (tables / edge fns)                                                                                                                             | Weight |
| -------------------------- | -------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `/` → `Home`               | Home.jsx (1032)                  | Dashboard: daily action, progress, CV/roles snapshot         | profiles, applications, application_cvs, career_roles, certifications, projects, tasks, linkedin_posts · `generate-daily-action`, `generate-tailored-cv` | XL     |
| `/Profile`                 | Profile.jsx (1383)               | Master profile: experiences, projects, skills, resume upload | profiles, experiences, projects, entity_spine · storage bucket `resumes` (not a table)                                                                   | XL     |
| `/Onboarding` (eager)      | Onboarding.jsx (1206)            | New-student intake → seeds profile + first tasks             | profiles, education, experiences, projects, certifications, tasks · `generate-tasks`, `send-welcome-email`, `generate-career-analysis`                   | XL     |
| `/Career`                  | Career.jsx (939)                 | Unified best-fit job feed + application pipeline             | applications, jobs · `analyze-job-match`, `extract-job-requirements`                                                                                     | L      |
| `/Roadmap`                 | Roadmap.jsx (650)                | Career roadmap / target roles + skill plan                   | career_roles, certifications, projects, profiles · `generate-career-analysis`                                                                            | L      |
| `/Calendar`                | Calendar.jsx (641)               | Calendar of applications, tasks, events                      | applications, calendar_events (0 rows), tasks                                                                                                            | L      |
| `/StoryBank`               | StoryBank.jsx (559)              | STAR story bank from daily actions                           | stories, daily_actions · `extract-story-from-text`                                                                                                       | L      |
| `/Tasks`                   | Tasks.jsx (518)                  | Task list + generation                                       | tasks, career_roles · `generate-tasks`                                                                                                                   | M      |
| `/Internship`              | Internship.jsx (408)             | Practicum: company targets + internship profile/pitch        | career_roles, company_targets, internship_profiles · `generate-internship-profile`, `generate-internship-pitch`, `match-internship-companies`            | M      |
| `/Resources`               | Resources.jsx (309)              | Static resources / links                                     | (component-driven)                                                                                                                                       | M      |
| `/Tracker`                 | TrackerRedirect.jsx (20)         | Redirect → `/Career?pipeline=open` (legacy)                  | — (Tracker.jsx 286 LOC kept for preview harness only)                                                                                                    | S      |
| `/Settings`                | Settings.jsx (219)               | Account settings, delete account                             | profiles · `delete-account`                                                                                                                              | M      |
| `/CareerAgent`             | CareerAgent.jsx (143)            | Career-coach chat entry                                      | applications · `ai-chat`                                                                                                                                 | S      |
| `/InterviewCoach`          | InterviewCoach.jsx (124)         | Interview-prep coach entry                                   | applications · `ai-chat`                                                                                                                                 | S      |
| `/Linkedin`                | Linkedin.jsx (95)                | LinkedIn optimization tools entry                            | · `generate-linkedin-*`, `import-linkedin-archive` (via components)                                                                                      | S      |
| `/Subagents`               | Subagents.jsx (87)               | Subagent/tools landing                                       | (component-driven)                                                                                                                                       | S      |
| `/SkillDevelopmentAdvisor` | SkillDevelopmentAdvisor.jsx (39) | Skill-gap → courses entry                                    | · `generate-learning-paths` (via component)                                                                                                              | S      |
| `/Jobs`                    | Jobs.jsx (24)                    | Thin wrapper → jobs feed                                     | (delegates to Career/components)                                                                                                                         | S      |
| `/CVAgent`                 | CVAgent.jsx (12)                 | Thin CV-agent stub                                           | · CV pipeline (via components)                                                                                                                           | S      |
| `/Admin`                   | Admin.jsx (1095)                 | Function-metrics admin dashboard                             | function_metrics                                                                                                                                         | XL     |
| `/AdminLaunch`             | AdminLaunch.jsx (776)            | Launch-readiness admin: users, errors, feedback              | profiles, error_logs, feedback, function_metrics, invite_codes                                                                                           | L      |

### Public routes (outside auth gate + Layout)

| Route             | Page (LOC)                                     | Claims to do                                                              | Weight |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| `/`               | LandingV2Preview (live homepage; preview file) | Marketing homepage v2                                                     | —      |
| `/Landing`        | Landing.jsx (1234)                             | Legacy marketing page (rollback + in-app links)                           | XL     |
| `/login`          | Login.jsx (527)                                | Open signup + Google OAuth + inline waitlist form (`send-waitlist-email`) | L      |
| `/reset-password` | ResetPassword.jsx (102)                        | Password reset                                                            | S      |
| `/privacy`        | Privacy.jsx (270)                              | Privacy policy                                                            | M      |
| `/terms`          | Terms.jsx (224)                                | Terms of service                                                          | M      |
| `/auth/callback`  | AuthCallback.jsx (74)                          | OAuth PKCE/implicit callback exchange                                     | S      |
| `/Practicum`      | → Navigate `/Internship`                       | Legacy redirect                                                           | S      |

Plus **22 `/_preview/*` routes** (OnboardingPreview, ShellPreview, HomePreview,
CareerPreview, JobsLogoPreview, JobsGridPreview, LandingV2Preview, CVAgentPreview,
CVAgentLivePreview, RoadmapPreview, TrackerPreview, ProfilePreview, StoryBankPreview,
TasksPreview, CalendarPreview, LinkedinPreview, ChatPreview, InternshipPreview,
ResourcesPreview, SettingsPreview, DrawerPreview) — registered only when
`SHOW_PREVIEW_ROUTES` (local dev or Vercel preview); dead-stripped in production.

---

## 2. Coach capabilities (AI coach action surface)

The coach is the `ai-chat` edge function (index 466 LOC + `prompt-lib.ts` 1,559 +
`page-context.ts` 574). It emits typed suggestion blocks; the frontend renders a card per
type (all cards defined **inline in `ChatInterface.jsx`**, 1,452 LOC) and, on user
confirm, calls a handler in `src/lib/coachActionHandlers.js` (772 LOC). The Chrome
extension (`extension/popup.js`) is a second, parallel coach client on the same `ai-chat`.

| Action type (`suggested_*`)        | Card (in ChatInterface.jsx) | Handler (coachActionHandlers.js)                                                                     | What it does                                                                       | Weight |
| ---------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| `suggested_tasks`                  | TaskSuggestionCard          | `applyTaskSuggestion` / `applyAllTaskSuggestions`                                                    | Propose tasks → write to `tasks`                                                   | M      |
| `suggested_roadmap_changes`        | RoadmapChangeCard           | `applyRoadmapChanges`                                                                                | Add/remove target roles, update track → `career_roles`, `profiles`                 | M      |
| `suggested_application_actions`    | ApplicationActionsCard      | `applyApplicationActions` (`add_application`, `update_application`)                                  | Add/update tracked applications → `applications`                                   | M      |
| `suggested_company_target_actions` | CompanyTargetActionsCard    | `applyCompanyTargetActions` (`add_company_target`, `update_company_target_status`, `enrich_company`) | Manage internship company targets → `company_targets`                              | M      |
| `suggested_cv_generation`          | CVGenerationCard            | `generateTailoredCV` / `generateTailoredCVLinked` (+ `ensureApplicationHasJd`)                       | Generate tailored CV → `generate-tailored-cv` (+ `extract-job-requirements`)       | L      |
| `suggested_bullet_capture`         | BulletSaveCard (343)        | `extractBullets` / `appendBullets` / `setBullets` / `restoreBullets` (dedupe)                        | Capture achievement bullets onto an experience → `experiences` · `extract-bullets` | L      |
| `suggested_add_skill`              | AddSkillCard (101)          | `applyAddSkillToExperience`                                                                          | Add a skill to an experience/profile                                               | M      |
| `suggested_agent`                  | (agent card / handoff)      | —                                                                                                    | Agent-mode handoff block                                                           | S      |
| (story capture)                    | StorySaveCard (256)         | `extractStoryFromText` / `saveStory`                                                                 | STAR story capture → `stories` · `extract-story-from-text`                         | M      |

Roadmap sub-actions handled: `add_role`, `remove_role`, `update_track`. Coach chat state
persists to `conversations` (183 rows) + `chat_messages` (745 rows). Agent drawer chrome:
`src/components/agent/` (770 LOC total; CoachThread 484, AgentDrawer 110, CoachDock 83).

---

## 3. Edge functions (32 deployed)

Version + `verify_jwt` from the live `list_edge_functions`. LOC from local `index.ts`.
"Called by" from grep of `src/` (`invoke(...)`, `invokeWithAuthRetry(...)`,
`supabase.functions.invoke`, fetch to `/functions/v1/...`), `extension/popup.js`, and
`.github/workflows/`.

| Function                           | v   | jwt   | LOC            | Claims to do                                       | Called by                                                                           | Weight |
| ---------------------------------- | --- | ----- | -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- | ------ |
| generate-tailored-cv               | 143 | false | 2872           | Build tailored CV from profile + JD                | coachActionHandlers, CVManagement, prewarmMasterCv, Home                            | XL     |
| generate-career-analysis           | 107 | false | 1495           | Career analysis: tracks, target roles, skill gaps  | Onboarding, Roadmap (fetch `/functions/generate-career-analysis`)                   | XL     |
| extract-job-requirements           | 20  | false | 1353           | Parse JD → structured reqs, family, seniority      | Career/Tracker, `analyze-job-match`, workflows (backfill)                           | XL     |
| refine-cv                          | 26  | false | 986            | Refine/rewrite CV bullets                          | CV pipeline (refine-cv path)                                                        | L      |
| generate-linkedin-content          | 28  | true  | 804            | LinkedIn profile optimization content              | Linkedin components                                                                 | L      |
| generate-linkedin-post             | 23  | true  | 655            | Draft LinkedIn posts                               | Linkedin components                                                                 | L      |
| generate-internship-profile        | 14  | true  | 650            | Build internship one-pager profile                 | Internship.jsx                                                                      | L      |
| generate-linkedin-outreach-message | 30  | true  | 642            | Draft recruiter outreach DMs                       | Linkedin/outreach components                                                        | L      |
| generate-tasks                     | 68  | false | 579            | Generate next-step tasks                           | Onboarding, Tasks                                                                   | L      |
| import-linkedin-archive            | 26  | true  | 577            | Parse uploaded LinkedIn data export                | Linkedin import component                                                           | L      |
| match-internship-companies         | 19  | true  | 575            | Rank IL companies for internship fit               | Internship.jsx                                                                      | L      |
| **send-reengagement**              | —   | —     | 564            | Re-engagement email campaign                       | **NO CALLER — NOT DEPLOYED** (only docs/config)                                     | L      |
| ai-chat                            | 101 | false | 466            | The coach: streaming chat + suggestion blocks      | ChatInterface, agent/*, extension/popup.js                                          | XL*    |
| generate-internship-pitch          | 15  | true  | 420            | Per-company pitch (role, angle, contacts)          | CompanyTargetDrawer, browse/CompanyDetailDrawer                                     | M      |
| extract-bullets                    | 6   | true  | 404            | Extract achievement bullets from text              | coachActionHandlers (bullet capture)                                                | M      |
| generate-learning-paths            | 48  | false | 400            | Skill-gap → course/learning paths                  | SkillGapCourses.jsx                                                                 | M      |
| extract-story-from-text            | 23  | true  | 394            | Extract STAR story from freeform text              | coachActionHandlers, StoryBank                                                      | M      |
| analyze-job-match                  | 56  | false | 392            | Fit score: profile vs job                          | Career/Tracker components                                                           | M      |
| generate-linkedin-comment          | 20  | true  | 316            | Draft LinkedIn comments                            | Linkedin components                                                                 | M      |
| render-cv                          | 9   | true  | 289            | Render CV JSON → PDF/HTML                          | CVManagement, render path                                                           | M      |
| send-welcome-email                 | 12  | true  | 190            | Welcome email on signup                            | Onboarding.jsx                                                                      | M      |
| extract-jd-basics                  | 4   | false | 183            | Fast JD parse (company + title only)               | **extension/popup.js only** (no main-app caller)                                    | M      |
| extract-proof-signals              | 47  | false | 178            | Extract proof/impact signals from CV text          | CV pipeline component                                                               | M      |
| lookup-role-skills                 | 30  | false | 162            | Role → canonical skills lookup                     | **extension/popup.js + scripts only** (no main-app caller)                          | M      |
| edit-cv                            | 8   | true  | 143            | Apply targeted edits to a CV                       | edit-cv UI path                                                                     | S      |
| extract-cv-text                    | 8   | true  | 136            | OCR/parse uploaded CV file → text                  | Profile/onboarding resume upload                                                    | S      |
| generate-daily-action              | 10  | true  | 130            | Generate today's single daily action               | Home.jsx, DailyActionCard.jsx                                                       | S      |
| send-waitlist-email                | 8   | true  | 119            | Waitlist confirmation email                        | Login.jsx inline waitlist form (waitlist_signups=0 → dormant)                       | S      |
| cron-generate-daily-action         | 8   | true  | 118            | Batch daily-action gen for all active users        | `scripts/generate-daily-actions.ts` (GitHub Action) — no frontend caller (expected) | S      |
| delete-account                     | 8   | true  | 111            | GDPR account deletion                              | Settings.jsx                                                                        | S      |
| **generate-application-tasks**     | 35  | false | (no local src) | Legacy task gen (superseded by generate-tasks)     | **NO CALLER** — remote-only, docs/config refs only                                  | ?      |
| **generateApplicationTasks**       | 35  | false | (no local src) | camelCase legacy duplicate                         | **NO CALLER** — deprecated                                                          | ?      |
| **generateTailoredCV**             | 37  | false | (no local src) | camelCase legacy duplicate of generate-tailored-cv | **NO CALLER** — deprecated                                                          | ?      |

\* `ai-chat` index.ts is 466 LOC but its true weight is XL via `prompt-lib.ts` (1,559) +
`page-context.ts` (574).

**No-caller summary (redundancy pass targets):**

- `generate-application-tasks`, `generateApplicationTasks`, `generateTailoredCV` — deployed
  but no source in repo and nothing invokes them. Safe-delete candidates (verify no external
  cron hits them first).
- `send-reengagement` — has source, not deployed, no caller. Either finish-wire or delete.
- `extract-jd-basics`, `lookup-role-skills` — only the Chrome extension / scripts call
  these; **no React-app caller**. Not orphans, but their liveness is coupled to the
  extension, which lags behind the Web Store rebuild.

---

## 4. Crons

There is **no `pg_cron`** — the `cron` schema does not exist in the database
(`select ... from cron.job` errors with "relation does not exist"). All scheduled work runs
as **GitHub Actions workflows** in `.github/workflows/`, invoking edge fns / scripts with a
service-role key.

| Cron (workflow)                 | Schedule (UTC)                                     | Runs                                                                                                                                                                             | Output type                                                                                     | Weight |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| `generate-daily-actions.yml`    | `0 4 * * *` (daily 04:00)                          | `scripts/generate-daily-actions.ts` → loops active `profiles` (onboarding_complete=true) → POSTs `cron-generate-daily-action` per user (idempotent, skips if today's row exists) | **Auto-generated throughput** — writes `daily_actions` (966 rows) whether or not the user asked | L      |
| `refresh-jobs.yml`              | `0 1 * * *` (daily 01:00)                          | `scripts/refresh-jobs.ts` (fetch ATS feeds → classify → UPSERT `jobs`), then `scripts/backfill-job-requirements.ts` + `scripts/derive-hebrew-seniority.ts`                       | **Auto-generated throughput** — maintains `jobs` cache (8,366 rows)                             | L      |
| `backfill-job-requirements.yml` | (no schedule — manual/dispatch + reused as a step) | `scripts/backfill-job-requirements.ts` — fill `function_family` for active IL jobs where NULL                                                                                    | Maintenance backfill (not user-demanded)                                                        | M      |
| `ci.yml`                        | on PR/push                                         | test/build/lint/typecheck                                                                                                                                                        | CI (not a data cron)                                                                            | —      |

Note: `cron-generate-daily-action` is the only `cron-*` edge fn; it is driven exclusively by
the GitHub Action, never by the frontend.

---

## 5. Tables (40 public + 1 rollback backup)

Row counts from live `count(*)` (2026-07-05). "Read/write" inferred from `.from()` /
`insert` / `upsert` refs across `src/`, `supabase/functions/`, `scripts/`,
`extension/popup.js`. WNR = written-never-read-by-app (redundancy candidate).

| Table                                      | Rows          | Holds                                          | Read/write status                                                       | Weight |
| ------------------------------------------ | ------------- | ---------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| jobs                                       | 8366          | Cached ATS job postings (IL market)            | Written by refresh-jobs cron; read by Career/Tracker                    | XL     |
| jd_unmapped_skill_counts                   | 22259         | Skill strings from JDs not mapped to canon     | Written by extract-job-requirements; **read only by scripts** → WNR-app | L      |
| function_metrics                           | 4238          | Per-invocation edge-fn telemetry               | Written by all fns; read by Admin.jsx                                   | L      |
| daily_actions                              | 966           | Generated daily actions per user               | Written by daily-action cron/fn; read by Home, StoryBank                | M      |
| chat_messages                              | 745           | Coach chat message rows                        | Written+read by ai-chat / ChatInterface                                 | M      |
| career_roles                               | 494           | User target roles / skill graph rows           | Written+read by Roadmap, Tasks, Internship, career-analysis             | M      |
| entity_spine                               | 311           | Canonical entity spine (profile normalization) | Written+read by Profile / extraction                                    | M      |
| rate_limits                                | 291           | Per-user/fn rate-limit counters                | Written+read by edge fns                                                | S      |
| experiences                                | 193           | Master-profile work experiences                | Written+read by Profile, Onboarding, bullet capture                     | M      |
| conversations                              | 183           | Coach conversation threads                     | Written+read by ai-chat / ChatInterface                                 | S      |
| tasks                                      | 157           | User tasks                                     | Written+read by Tasks, Onboarding, Home, Calendar                       | M      |
| bakeoff_results                            | 148           | CV/chat eval bakeoff outputs                   | **Only scripts** (eval harness) → WNR-app                               | S      |
| applications                               | 95            | Tracked job applications                       | Written+read by Career, Calendar, Home, coach                           | M      |
| application_cvs                            | 91            | Generated CVs per application                  | Written by CV pipeline; read by Home, CVManagement                      | M      |
| status_changes                             | 79            | Application status audit trail                 | Written on status change; read rarely                                   | S      |
| education                                  | 69            | Profile education rows                         | Written+read by Onboarding/Profile                                      | S      |
| company_targets                            | 64            | Internship target companies                    | Written+read by Internship, coach                                       | S      |
| refine_rebake_results                      | 60            | Refine-CV eval outputs                         | **Only scripts** → WNR-app                                              | S      |
| profiles                                   | 51            | Core user profile (1/user)                     | Read/written everywhere                                                 | M      |
| campaign_sends                             | 36            | Re-engagement send log                         | Written by `send-reengagement` (**not deployed**) → orphan telemetry    | S      |
| certifications                             | 32            | Profile certifications                         | Written+read by Onboarding/Roadmap/Home                                 | S      |
| linkedin_outreach_conversations            | 23            | Saved outreach threads                         | Written+read by Linkedin outreach                                       | S      |
| jobs / job_suggestions                     | see above / 0 | —                                              | job_suggestions empty; **only in database.types.ts** → WNR / dead       | S      |
| projects                                   | 17            | Profile projects                               | Written+read by Profile/Onboarding/Roadmap                              | S      |
| internship_pitches                         | 13            | Cached per-company pitches                     | Written by generate-internship-pitch; read by drawers                   | S      |
| stories                                    | 13            | STAR stories                                   | Written+read by StoryBank                                               | S      |
| linkedin_posts                             | 10            | Generated LinkedIn posts                       | Written+read by Linkedin, Home                                          | S      |
| linkedin_optimizations                     | 8             | LinkedIn profile optimizations                 | Written+read by Linkedin                                                | S      |
| status/company_target_status_changes       | 79 / 5        | Audit trails                                   | Written; read rarely                                                    | S      |
| invite_codes                               | 5             | Signup invite codes                            | Read by Login/AdminLaunch                                               | S      |
| internship_profiles                        | 4             | Internship one-pager profiles                  | Written+read by Internship                                              | S      |
| feedback                                   | 2             | In-app feedback widget submissions             | Written by FeedbackWidget; read by AdminLaunch                          | S      |
| admin_users                                | 2             | Admin allowlist                                | Read by Admin gates                                                     | S      |
| account_deletions                          | 2             | Deletion audit                                 | Written by delete-account                                               | S      |
| error_logs                                 | 18            | Client/edge error log                          | Written by handlers; read by AdminLaunch                                | S      |
| function_cache                             | 41            | Edge-fn response cache                         | Written+read by edge fns                                                | S      |
| **calendar_events**                        | **0**         | Calendar events                                | Referenced by Calendar.jsx but empty → likely unused                    | S      |
| **cv_templates**                           | **0**         | CV templates                                   | **Only database.types.ts** → dead/unused                                | S      |
| **waitlist_signups**                       | **0**         | Waitlist signups                               | send-waitlist path exists but 0 rows → dormant                          | S      |
| **\_seniority_derive_rollback_2026_06_09** | (backup)      | One-off seniority rollback backup              | **Zero code refs** → dead backup table                                  | S      |

**Redundancy-pass shortlist (tables):** `job_suggestions`, `cv_templates`,
`waitlist_signups`, `calendar_events` (empty/unused); `_seniority_derive_rollback_2026_06_09`
(dead backup); `bakeoff_results`, `refine_rebake_results`, `jd_unmapped_skill_counts`
(script/eval-only, never read by the app); `campaign_sends` (fed only by the undeployed
`send-reengagement`).

---

_Generated as Part 1 (Inventory) of Deep QA 3. All counts ground-truthed against
`ilmqmodklutztuybsvwd` and local `wc -l` on 2026-07-05._

# Architecture

## Overview

Get-a-Job is a single-page React application. All persistent data is stored in Supabase (PostgreSQL + Auth + Storage). There is no custom backend server — browser-to-database queries handle read/write operations for everything except AI-powered features, which run in Supabase Edge Functions (Deno/TypeScript).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite 6 |
| Routing | React Router v6 |
| State / Data fetching | TanStack React Query v5 |
| Backend | Supabase (Auth + PostgreSQL + Storage + Edge Functions) |
| Styling | Tailwind CSS v3 |
| UI Components | Radix UI (headless) + shadcn/ui wrappers |
| Icons | Lucide React |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Notifications | Sonner (toast) |
| PDF generation | jsPDF (client-side in browser; also used in Edge Functions via DOCX templates) |
| Charts | Recharts |
| Drag and drop | @hello-pangea/dnd |
| Payments | Stripe (installed, not yet wired) |
| Observability | Langfuse Cloud (LLM Tracing) + Supabase `function_metrics` table |
| Analytics | PostHog Cloud (EU) |
| Testing | Vitest + Testing Library (unit/integration), Playwright (E2E) |
| Build / Lint | Vite 6, ESLint 9, TypeScript (type-checking only) |

---

## Folder Structure

```
src/
├── api/
│   └── supabaseClient.js         # Supabase client initialisation (anon key)
├── components/
│   ├── activity/                 # Daily activity dashboard components
│   ├── calendar/                 # Calendar event UI
│   ├── chat/                     # ChatInterface, MessageBubble, AgentIntro
│   ├── dashboard/                # JobMatchChecker, SkillGapCourses widgets
│   ├── jobs/                     # JobCard and job search cards
│   ├── layout/                   # SidebarFooter
│   ├── linkedin/                 # ProfilePreview, PostImageUpload, OutreachComposer
│   ├── onboarding/               # Multi-step onboarding components (9 steps)
│   ├── roadmap/                  # TrackQuadrantGrid, ProgressVisualization, LearningPaths
│   ├── storyBank/                # StoryCard, StoryEditor
│   ├── subagents/                # AI subagent selector UI
│   ├── tracker/                  # ApplicationRow and all tracker sub-tabs
│   └── ui/                       # shadcn/ui component library
├── hooks/                        # Custom React hooks
├── lib/
│   ├── AuthContext.jsx            # Supabase auth state (useAuth hook)
│   ├── database.types.ts          # Auto-generated Supabase TypeScript types
│   ├── PageNotFound.jsx
│   ├── query-client.js            # TanStack Query client instance
│   ├── scoreJobFit.js             # Client-side job fit calculation
│   ├── trackConfig.js             # Configurations for Track 1/2/3
│   └── utils.js                   # cn() utility (clsx + tailwind-merge)
├── pages/
│   ├── Admin.jsx                  # Database and metrics admin console
│   ├── Calendar.jsx               # Applications scheduling calendar
│   ├── CareerAgent.jsx            # General Career Coach Agent chat
│   ├── CVAgent.jsx                # Dedicated CV tailoring chat
│   ├── Home.jsx                   # User dashboard / execution statistics
│   ├── InterviewCoach.jsx         # Dedicated Interview Prep coach chat
│   ├── Jobs.jsx                   # Job search and score listings
│   ├── Landing.jsx                # High-converting landing page
│   ├── Linkedin.jsx               # LinkedIn Outreach, post, comment optimizer
│   ├── Login.jsx                  # Auth login/signup entry
│   ├── Onboarding.jsx             # Onboarding wizard shell
│   ├── Practicum.jsx              # Faculty + self-sourced internship tracker
│   ├── Profile.jsx                # Profile, experience, education, resume editor
│   ├── ResetPassword.jsx          # Auth password reset
│   ├── Resources.jsx              #accordion job search guides
│   ├── Roadmap.jsx                # Track-classified role recommendations
│   ├── Settings.jsx               # Preferences, account deletion, user data reset
│   ├── SkillDevelopmentAdvisor.jsx# Dedicated skill gaps advisor chat
│   ├── StoryBank.jsx              # STAR method story generator & reviewer
│   ├── Subagents.jsx              # AI Subagent roster page
│   ├── Tasks.jsx                  # AI-generated weekly task planner
│   └── Tracker.jsx                # Collapsible application tracking cards
├── test/                          # Vitest unit and integration tests
│   ├── mockSupabase.js
│   ├── testUtils.jsx
│   ├── setup.js
│   └── integration/
├── utils/
│   └── index.js                   # createPageUrl() helper
├── App.jsx                        # Root — auth routing + trial paywalls
├── Layout.jsx                     # Sidebar navigation + mobile header
├── main.jsx                       # Entry point — GlobalErrorBoundary wrapper
└── pages.config.js                # Page registry (manually maintained)

supabase/                          # Supabase project folder
├── functions/                     # Supabase Edge Functions (Deno/TypeScript)
│   ├── _shared/                   # Shared types, libraries, metrics, and prompts
│   │   ├── libraries/             # 00_role_library.ts, 01_skill_library.ts, etc.
│   │   ├── metrics.ts             # Performance tracing metrics
│   │   └── voice-rules.ts         # Multi-surface tone and vocabulary rules
│   ├── ai-chat/                   # General multi-turn career chat
│   ├── analyze-job-match/         # JD vs profile match calculator
│   ├── delete-account/            # JWT-gated profile and files cascade deletion
│   ├── extract-proof-signals/     # Extraction of metrics and skill signals from CVs
│   ├── extract-story-from-text/   # STAR method portfolio builder
│   ├── generate-career-analysis/  # Core track-based role analysis
│   ├── generate-daily-action/     # Logic picks for daily tasks cards
│   ├── generate-internship-profile/ # Pitch generator for practicum students
│   ├── generate-learning-paths/   # Skill gap course recommendations
│   ├── generate-linkedin-comment/ # Substantive comment option builder
│   ├── generate-linkedin-content/ # Standard profile copy optimization
│   ├── generate-linkedin-outreach-message/ # Multi-goal message draft coach
│   ├── generate-linkedin-post/    # Post composer (projects/lessons/observations)
│   ├── generate-tailored-cv/      # DOCX-rendered CV tailoring
│   ├── generate-tasks/            # Custom weekly task generators
│   ├── import-linkedin-archive/   # ZIP archive positions and experiences parser
│   ├── lookup-role-skills/        # Deterministic role-to-skills maps
│   └── match-internship-companies/# Practicum company compatibility analyzer
└── migrations/                    # SQL Database migrations history

e2e/                               # Playwright E2E tests
```

---

## Data Flow

### Standard read/write (non-AI)

```
User action
    ↓
React component (page or component)
    ↓
Supabase JS client (src/api/supabaseClient.js)
    ↓
Supabase PostgreSQL (with RLS enforcing user_id)
    ↓
React Query cache invalidation → re-render
```

### AI-powered features

```
User triggers AI action (generate roadmap, generate CV, etc.)
    ↓
React component calls supabase.functions.invoke(functionName, { body })
    with the user's session Authorization header forwarded automatically
    ↓
Supabase Edge Function (Deno/TypeScript in supabase/functions/)
    ├── Authenticates user via user-scoped Supabase client (anon key + Authorization header)
    ├── Checks rate limit via service client RPC against rate_limits table
    ├── Reads user data from Supabase (profiles, experiences, etc.) via user-scoped client
    ├── Calls OpenAI API (gpt-4o / gpt-4o-mini) with custom prompt and voice rules
    ├── Traces performance and usage tokens via Langfuse
    └── Writes results to Supabase and/or returns JSON to the browser
    ↓
React component handles response → updates DB → React Query invalidation → re-render
```

All database reads/writes inside Edge Functions that are user-scoped use the **anon key + Authorization header** so that RLS policies enforce `user_id` constraints server-side. The service role key is used only for operations that must bypass RLS: rate limit RPCs, error logging, and Storage uploads.

---

## React Query Conventions

The `QueryClient` is configured in `src/lib/query-client.js` with a global `staleTime` of 5 minutes.

**Do not use `initialData: []` on queries.** Setting `initialData` puts the query into `status: 'success'` immediately with empty data, which causes components to render empty states before real data has loaded. Use a default value in destructuring instead:

```js
// Correct
const { data: roles = [] } = useQuery({ ... });

// Wrong — do not do this
const { data: roles } = useQuery({ ..., initialData: [] });
```

**On onboarding completion**, call `queryClient.removeQueries()` (not `invalidateQueries`) to wipe the entire cache before navigating to Home. This prevents stale onboarding-era data from appearing on the dashboard.

---

## Page Registry

Pages are registered in `src/pages.config.js`. This file is manually maintained. Adding a new page:

1. Create `src/pages/YourPage.jsx`
2. Import and add it to `PAGES` in `pages.config.js`
3. Add a nav item to `Layout.jsx` if it needs sidebar navigation (accessible views not in Sidebar go to respective pages directly)

---

## Key Conventions

- **Data fetching**: Always use `useQuery` from TanStack React Query. Never fetch directly in `useEffect`.
- **Mutations**: Use `supabase.from(...).insert/update/delete` directly, then call `queryClient.invalidateQueries(...)` to refresh.
- **Data integrity on replace**: When replacing a full set of rows (career roles, tasks, experiences), always insert new rows first, then delete old rows by ID. Never delete first. See the insert-before-delete pattern documented in `database.md`.
- **Notifications**: Use `toast` from `sonner` for user feedback.
- **Styling**: Tailwind utility classes only. Use `cn()` from `@/lib/utils` for conditional classes.
- **Path aliases**: `@/` maps to `src/` (configured in `vite.config.js` and `jsconfig.json`).
- **Error states**: Pages must distinguish between query errors (show an error screen or banner) and empty results (show an empty state prompt). Never silently render an empty state when a query has failed.

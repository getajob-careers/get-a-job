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
| PDF generation | jsPDF (client-side in browser; also used in Edge Functions via npm:jspdf) |
| Charts | Recharts |
| Drag and drop | @hello-pangea/dnd |
| Payments | Stripe (installed, not yet wired) |
| Testing | Vitest + Testing Library (unit/integration), Playwright (E2E) |
| Build / Lint | Vite 6, ESLint 9, TypeScript (type-checking only) |

---

## Folder Structure

```
src/
├── api/
│   └── supabaseClient.js         # Supabase client initialisation (anon key)
├── components/
│   ├── calendar/                 # Calendar event UI
│   ├── chat/                     # ChatInterface + MessageBubble
│   ├── dashboard/                # JobMatchChecker, SkillGapCourses widgets
│   ├── layout/                   # SidebarFooter
│   ├── onboarding/               # Multi-step onboarding form components (8 steps)
│   ├── roadmap/                  # RoleCard, ProgressVisualization, LearningPaths
│   ├── subagents/                # AI subagent selector UI
│   ├── tracker/                  # ApplicationRow and all tracker sub-tabs
│   └── ui/                       # shadcn/ui component library (do not edit manually)
├── hooks/                        # Custom React hooks
├── lib/
│   ├── AuthContext.jsx            # Supabase auth state (useAuth hook)
│   ├── database.types.ts          # Auto-generated Supabase TypeScript types
│   ├── PageNotFound.jsx
│   ├── query-client.js            # TanStack Query client instance
│   └── utils.js                   # cn() utility (clsx + tailwind-merge)
├── pages/
│   ├── AddInformation.jsx
│   ├── Calendar.jsx
│   ├── CareerAgent.jsx
│   ├── CareerRoadmap.jsx
│   ├── Home.jsx
│   ├── JobSuggestions.jsx
│   ├── Login.jsx
│   ├── Onboarding.jsx
│   ├── Resources.jsx
│   ├── Subagents.jsx
│   ├── Tasks.jsx
│   └── Tracker.jsx
├── test/                          # Vitest unit and integration tests
│   ├── mockSupabase.js
│   ├── testUtils.jsx
│   ├── setup.js
│   ├── onboarding.utils.test.js
│   ├── career.utils.test.js
│   ├── resume.extraction.test.js
│   └── integration/
│       ├── home-redirect.test.jsx
│       ├── home-errors.test.jsx
│       ├── tasks-state.test.jsx
│       └── career-roadmap-tiers.test.jsx
├── utils/
│   └── index.js                   # createPageUrl() helper
├── App.jsx                        # Root — auth routing + toasters
├── Layout.jsx                     # Sidebar navigation + mobile header
├── main.jsx                       # Entry point — GlobalErrorBoundary wrapper
└── pages.config.js                # Page registry (auto-managed, do not edit PAGES)

functions/                         # Supabase Edge Functions (Deno/TypeScript)
├── generate-career-analysis.ts    # AI career track analysis
├── generate-tasks.ts              # AI weekly task plan generation
├── generateTailoredCV.ts          # AI CV generation + PDF upload to Storage
├── generateApplicationTasks.ts    # Application-specific task generation
└── getLinkedinProfile.ts          # LinkedIn profile fetching (stub)

e2e/                               # Playwright E2E tests
├── home.spec.js
├── tasks.spec.js
└── helpers/
    └── mockSupabase.js
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
Supabase Edge Function (Deno/TypeScript in functions/)
    ├── Authenticates user via user-scoped Supabase client (anon key + Authorization header)
    ├── Checks rate limit via service client RPC
    ├── Reads user data from Supabase (profiles, experiences, etc.) via user-scoped client
    ├── Calls OpenAI API (gpt-4o-mini)
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
3. Add a nav item to `Layout.jsx` if it needs sidebar navigation

---

## Key Conventions

- **Data fetching**: Always use `useQuery` from TanStack React Query. Never fetch directly in `useEffect`.
- **Mutations**: Use `supabase.from(...).insert/update/delete` directly, then call `queryClient.invalidateQueries(...)` to refresh.
- **Data integrity on replace**: When replacing a full set of rows (career roles, tasks, experiences), always insert new rows first, then delete old rows by ID. Never delete first. See the insert-before-delete pattern documented in `database.md`.
- **Notifications**: Use `toast` from `sonner` for user feedback.
- **Styling**: Tailwind utility classes only. Use `cn()` from `@/lib/utils` for conditional classes.
- **Path aliases**: `@/` maps to `src/` (configured in `vite.config.js` and `jsconfig.json`).
- **Error states**: Pages must distinguish between query errors (show an error screen or banner) and empty results (show an empty state prompt). Never silently render an empty state when a query has failed.

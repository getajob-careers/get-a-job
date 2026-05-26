# Testing Documentation

The project has two test layers: **Vitest** for unit and integration tests, and **Playwright** for E2E browser tests.

---

## Running Tests

### Vitest (unit + integration)

```bash
# Watch mode (re-runs on file change)
npm test

# Single run, exit when done
npm run test:run

# Interactive UI in the browser
npm run test:ui
```

### Playwright (E2E)

Playwright requires the Vite dev server to be running before you execute tests.

```bash
# Terminal 1 — start the dev server
npm run dev

# Terminal 2 — run E2E tests
npx playwright test
```

To run a single spec file:
```bash
npx playwright test e2e/home.spec.js
```

---

## Complete Test File Directory

### Vitest — Unit Tests (`src/test/`)

| File | What it tests |
|------|--------------|
| `onboarding.utils.test.js` | `cleanProfilePayload` — strips wizard fields that don't exist in the Postgres schema before upsert. |
| `career.utils.test.js` | `mapRoleToDbRow` and `mapTaskToDbRow` — maps AI payload structures into database rows. |
| `resume.extraction.test.js` | `extractJson` — unescapes double-escaped JSON outputs in resume parsing. |
| `educationPolicy.test.js` | Validates validation schemas and dates logic for academic entries. |
| `experienceLevel.test.js` | Qualification logic calculating Junior/Mid/Senior titles based on work history. |
| `jobTitleNormalize.test.js` | Fuzzy matching and normalization of role titles against standard role libraries. |
| `passwordPolicy.test.js` | Reauthentication, email checks, and minimum requirements for user passwords. |
| `scoreApplication.test.js` | Deterministic job application match scoring based on required vs user skills. |
| `scoreJobFit.test.js` | Dynamic algorithms scoring compatibility with target industries and career tracks. |
| `scoreJobFit.alignment.test.js` | Quantitative alignment of career roles with user's 5-year goal. |
| `skillResolver.test.js` | Autocomplete matching and normalization of free-text tags to library skills. |
| `staleAnalysis.test.js` | Check for analysis staleness (checks if more than 30 days have elapsed since last reality check). |
| `successfactorsParser.test.js` | Custom ATS-specific parsing functions mapping SuccessFactors fields. |
| `trackMatching.test.js` | Maps computed match scores to `track_1` / `track_2` / `track_3` ranges (renamed from tierMatching). |
| `useFakeProgress.test.js` | Simulates linear progress states across multi-stage background Edge Function operations. |
| `workdayDateParser.test.js` | Parsers standardizing Workday dates into SQL-compliant formats. |
| `yearsCap.test.js` | Cap logic capping total full-time and freelance years for Junior role classifications. |

---

### Vitest — Integration Tests (`src/test/integration/`)

| File | What it tests |
|------|--------------|
| `home-redirect.test.jsx` | `Home.jsx` redirect guard: redirects incomplete profiles to `/Onboarding`; ignores transient network connection errors. |
| `home-errors.test.jsx` | Error banner rendering when `career_roles` or `applications` queries fail on mount. |
| `tasks-state.test.jsx` | Tasks checklist: shows spinners on load, red full error blocks on query failures, empty blocks when tasks count is zero. |
| `career-roadmap-tracks.test.jsx` | Roadmap tracks rendering: ensures roles appear in the correct Track 1/2/3 sections (renamed from roadmap-tiers). |
| `login-signup.test.jsx` | Integrates login auth state and toggle behaviors between register/login views. |
| `password-card.test.jsx` | Intercepts password change cards, validating matching passwords and token verification events. |

---

### Playwright — E2E Tests (`e2e/`)

| File | Tests |
|------|-------|
| `e2e/home.spec.js` | Dashboard loading, red error states on server query errors, pending task components, redirect to Onboarding. |
| `e2e/tasks.spec.js` | Action planner list displays, empty list rendering, and error banner overlays. |

---

## Test Infrastructure

### Vitest Shared Utilities

#### `src/test/testUtils.jsx` — `createWrapper`
Wraps tested components with `QueryClient` + `MemoryRouter`. The query client disables retries (`retry: false`) and disables query caching (`gcTime: 0`) to prevent state bleed.

#### `src/test/mockSupabase.js` — `createSupabaseMock`
Builds a chainable, mockable Supabase client that mirrors all Postgres queries (`.select().eq().order()`). It resolves dynamically with configurable data or error payloads:

```js
import { createSupabaseMock } from '../mockSupabase.js';

const mock = createSupabaseMock({
  profiles:     { data: [MOCK_PROFILE_COMPLETE], error: null },
  career_roles: { data: MOCK_ROLES, error: null },
});
```

#### `src/test/setup.js`
Imports `@testing-library/jest-dom` matchers for Vitest DOM rendering validation.

### Playwright E2E Utilities

#### `e2e/helpers/mockSupabase.js` — `injectFakeSession`, `mockSupabaseRoutes`
- `injectFakeSession(page)`: Injects an mock user session token directly to browser `localStorage` before running `page.goto()`.
- `mockSupabaseRoutes(page, overrides)`: Intercepts Supabase API REST calls, feeding custom JSON fixtures to chromium instead of calling live Postgres.

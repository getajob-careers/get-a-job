# Testing

The project has two test layers: **Vitest** for unit and integration tests, and **Playwright** for end-to-end (E2E) browser tests.

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

To run in headed mode (see the browser):

```bash
npx playwright test --headed
```

---

## Test File Map

### Vitest — Unit Tests

| File | What it tests |
|------|--------------|
| `src/test/onboarding.utils.test.js` | `cleanProfilePayload` — strips fields that don't exist in the `profiles` DB schema before upsert |
| `src/test/career.utils.test.js` | `mapRoleToDbRow` and `mapTaskToDbRow` — AI response shape → DB row shape transformation |
| `src/test/resume.extraction.test.js` | `extractJson` — guarded JSON extraction from LLM response text, including double-escape handling |

### Vitest — Integration Tests

| File | What it tests |
|------|--------------|
| `src/test/integration/home-redirect.test.jsx` | `Home.jsx` redirect guard: redirects for new users and incomplete profiles, does NOT redirect on network error |
| `src/test/integration/home-errors.test.jsx` | `Home.jsx` error banners: shown when `career_roles` or `applications` query fails, not shown when both succeed |
| `src/test/integration/tasks-state.test.jsx` | `Tasks.jsx` state rendering: error screen on query failure, empty state on zero results, task titles on success |
| `src/test/integration/career-roadmap-tiers.test.jsx` | `CareerRoadmap.jsx` track rendering: roles appear in the correct tier section; error screen on query failure |

### Playwright — E2E Tests

| File | Tests |
|------|-------|
| `e2e/home.spec.js` | 5 tests — dashboard renders with real profile data; error banner renders when roles endpoint fails; pending task appears in Next Action section; redirect to Onboarding for incomplete profile; no redirect to Onboarding on profile query 503 |
| `e2e/tasks.spec.js` | 3 tests — tasks page renders task list; error screen on failed tasks endpoint; empty state on zero tasks |

---

## Test Infrastructure

### Vitest Shared Utilities

#### `src/test/testUtils.jsx` — `createWrapper`

Creates a fresh `QueryClient` + `MemoryRouter` wrapper for each test. The query client is configured with `retry: false` (tests fail fast) and `gcTime: 0` (no cache bleed between tests).

```js
import { createWrapper } from '../testUtils.jsx';

const Wrapper = createWrapper('/Home');
render(<Home />, { wrapper: Wrapper });
```

#### `src/test/mockSupabase.js` — `createSupabaseMock`, `createChain`

Builds a chainable Supabase query mock. Any sequence of `.select().eq().order()` etc. is valid on the chain, and the chain is thenable — `await supabase.from('x').select('*')` resolves with the configured response.

```js
import { createSupabaseMock } from '../mockSupabase.js';

const mock = createSupabaseMock({
  profiles:     { data: [MOCK_PROFILE_COMPLETE], error: null },
  career_roles: { data: MOCK_ROLES, error: null },
  tasks:        { data: [], error: null },
  // Any table not listed resolves with { data: [], error: null }
});
```

To simulate a query error, set `error` to any object and `data` to `null`:

```js
const mock = createSupabaseMock({
  tasks: { data: null, error: { message: 'Connection timeout' } },
});
```

`mockSupabase.js` also exports shared fixture constants: `MOCK_USER`, `MOCK_PROFILE_COMPLETE`, `MOCK_PROFILE_INCOMPLETE`, `MOCK_ROLES`, `MOCK_TASKS`.

#### `src/test/setup.js`

Vitest setup file. Configures `@testing-library/jest-dom` matchers (e.g. `toBeInTheDocument`).

### Playwright Shared Utilities

#### `e2e/helpers/mockSupabase.js` — `injectFakeSession`, `mockSupabaseRoutes`

**`injectFakeSession(page)`** — injects a fake Supabase session into `localStorage` before `page.goto()` so `AuthContext` believes the user is authenticated without hitting the real auth server.

**`mockSupabaseRoutes(page, overrides)`** — intercepts all Supabase REST API and Auth API calls via `page.route()` and returns controlled fixture data. Accepts an `overrides` object to customise responses per table:

```js
await injectFakeSession(page);
await mockSupabaseRoutes(page, {
  profiles:     [MOCK_PROFILE_COMPLETE],
  career_roles: MOCK_ROLES,
  tasks:        [],
});
await page.goto('/Home');
```

To simulate a failing endpoint, add a `page.route()` call before `mockSupabaseRoutes` (more specific routes take precedence):

```js
await page.route(`${SUPABASE_URL}/rest/v1/career_roles**`, (route) => {
  route.fulfill({ status: 500, body: JSON.stringify({ message: 'Internal server error' }) });
});
```

---

## Mocking Conventions

### Vitest integration tests

Dependencies are mocked at the module level using `vi.mock`. This must be done at the top of the test file before any imports that depend on the mocked module.

```js
// Mock react-router-dom to capture navigate calls
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock AuthContext to return a fake user
vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: MOCK_USER }),
}));

// Mock the Supabase client module — replaced per-test via Object.assign
vi.mock('@/api/supabaseClient', () => ({ supabase: {} }));
```

To set the Supabase mock for a specific test, use the dynamic import pattern:

```js
async function setSupabaseMock(tableMap) {
  const { supabase } = await import('@/api/supabaseClient');
  Object.assign(supabase, createSupabaseMock(tableMap));
}
```

Child components that make their own network calls should be stubbed to prevent unexpected query activity:

```js
vi.mock('../../components/dashboard/SkillGapCourses', () => ({
  default: () => <div data-testid="skill-gap-courses" />,
}));
```

### Playwright E2E tests

E2E tests mock only the network boundary. The actual browser, React, React Query, React Router, and all component code run for real. This means E2E tests catch bugs that integration tests cannot: real CSS rendering, real history API navigation, real `localStorage` interaction.

---

## What Each Test Layer Catches

| Bug type | Vitest unit | Vitest integration | Playwright E2E |
|----------|------------|-------------------|----------------|
| Incorrect data mapping (AI response → DB row) | Yes | No | No |
| Wrong regex / parse logic | Yes | No | No |
| Redirect fires when it shouldn't (component logic) | No | Yes | Yes |
| Error banner renders on query failure | No | Yes | Yes |
| Error renders in real browser (CSS, layout) | No | No | Yes |
| Real React Router navigation (history API) | No | No | Yes |
| Real React Query hydration from localStorage | No | No | Yes |

---

## Writing New Tests

### Adding a Vitest unit test

Create a file in `src/test/` with a `.test.js` or `.test.jsx` extension. Pure logic tests (no components) should be `.test.js`. Tests that render components should be `.test.jsx`.

If you are testing logic extracted from a component (e.g. a mapping function), replicate the function in the test file rather than importing from the component. This keeps tests independent of component refactors and forces the logic to be readable in isolation.

### Adding a Vitest integration test

Create a file in `src/test/integration/`. Use `createWrapper` from `testUtils.jsx` to wrap the component. Use `createSupabaseMock` to control the data layer. Mock all dependencies that make their own network calls.

Ensure your test covers the three mandatory states: error, empty, and loaded data. Never write a test that only validates the happy path.

### Adding a Playwright E2E test

Add a `.spec.js` file in `e2e/`. Always call `injectFakeSession` and `mockSupabaseRoutes` before `page.goto()`. Use `page.route()` to override specific endpoints when testing error conditions. Set a reasonable timeout on `expect(...).toBeVisible()` calls (8000ms covers React Query hydration in Chromium).

/**
 * Playwright helper: intercepts all Supabase API calls and returns controlled data.
 *
 * This lets E2E tests run without a real Supabase instance. The actual browser,
 * React, React Query, React Router, and all component code runs for real — only
 * the network boundary is replaced with deterministic fixtures.
 */

const SUPABASE_URL = 'https://ilmqmodklutztuybsvwd.supabase.co';

export const MOCK_USER = {
  id: 'e2e-test-user-id',
  email: 'e2e@test.com',
  aud: 'authenticated',
  role: 'authenticated',
};

export const MOCK_SESSION = {
  access_token: 'fake-e2e-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'fake-e2e-refresh-token',
  user: MOCK_USER,
};

export const MOCK_PROFILE_COMPLETE = {
  id: 'e2e-test-user-id',
  full_name: 'E2E Test User',
  onboarding_complete: true,
  onboarding_step: 8,
  skills: ['React', 'SQL', 'Python'],
  skill_gaps: ['Docker', 'Kubernetes'],
  qualification_level: 'Junior',
  overall_assessment: 'Good foundational skills with clear growth areas.',
  five_year_role: 'Senior Data Engineer',
  last_reality_check_date: '2026-03-22T12:00:00.000Z',
};

export const MOCK_PROFILE_INCOMPLETE = {
  ...MOCK_PROFILE_COMPLETE,
  onboarding_complete: false,
  onboarding_step: 3,
};

export const MOCK_ROLES = [
  {
    id: 'e2e-role-1',
    user_id: 'e2e-test-user-id',
    title: 'Junior Data Analyst',
    track: 'track_1',
    readiness_score: 0.72,
    matched_skills: ['SQL', 'Python'],
    missing_skills: ['Tableau'],
    alignment_to_goal: 'Strong match for near-term goal.',
  },
  {
    id: 'e2e-role-2',
    user_id: 'e2e-test-user-id',
    title: 'Business Intelligence Analyst',
    track: 'track_2',
    readiness_score: 0.45,
    matched_skills: ['SQL'],
    missing_skills: ['Power BI'],
    alignment_to_goal: 'Achievable with upskilling.',
  },
];

export const MOCK_TASKS = [
  {
    id: 'e2e-task-1',
    user_id: 'e2e-test-user-id',
    title: 'Update CV for Data Analyst roles',
    description: 'Tailor CV based on skill gaps identified.',
    category: 'cv',
    priority: 'high',
    is_complete: false,
  },
];

/**
 * Injects a fake Supabase session into localStorage so AuthContext thinks
 * the user is authenticated — without hitting the real auth server.
 *
 * Must be called via page.addInitScript() BEFORE page.goto().
 */
export async function injectFakeSession(page) {
  await page.addInitScript(
    ({ url, session }) => {
      // Supabase stores session under this key
      const projectRef = new URL(url).hostname.split('.')[0];
      localStorage.setItem(
        `sb-${projectRef}-auth-token`,
        JSON.stringify(session)
      );
    },
    { url: SUPABASE_URL, session: MOCK_SESSION }
  );
}

/**
 * Intercepts all Supabase REST + Auth API calls and returns mock responses.
 *
 * Call this after injectFakeSession() but before page.goto().
 */
export async function mockSupabaseRoutes(page, overrides = {}) {
  const data = {
    profiles:     [MOCK_PROFILE_COMPLETE],
    career_roles: MOCK_ROLES,
    tasks:        MOCK_TASKS,
    applications: [],
    experiences:  [],
    certifications: [],
    ...overrides,
  };

  // Auth endpoints
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) });
    } else if (url.includes('/token')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  // REST API endpoints — match table name from URL path
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const url = route.request().url();
    const tableName = Object.keys(data).find((t) => url.includes(`/rest/v1/${t}`));
    const response = tableName !== undefined ? data[tableName] : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

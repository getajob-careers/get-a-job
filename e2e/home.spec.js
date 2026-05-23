/**
 * home.spec.js — Playwright E2E tests for the Home page.
 *
 * WHY E2E TESTS ON TOP OF INTEGRATION TESTS:
 * Integration tests (Vitest + jsdom) verify component logic in isolation.
 * These Playwright tests verify the same behaviors in a real Chromium browser:
 *
 *   - Real browser rendering pipeline (CSS, layout, repaint)
 *   - Real React Router (not MemoryRouter) navigation
 *   - Real React Query hydration from localStorage-seeded state
 *   - Real Supabase JS client running (only network is mocked)
 *
 * The integration tests would not catch a bug where, for example, the CSS
 * hides an error banner via `display: none` that only appears in a real browser,
 * or a navigation that only fires correctly in a real history API environment.
 */

import { test, expect } from '@playwright/test';
import {
  injectFakeSession,
  mockSupabaseRoutes,
  MOCK_PROFILE_COMPLETE,
  MOCK_PROFILE_INCOMPLETE,
  MOCK_ROLES,
  MOCK_TASKS,
} from './helpers/mockSupabase.js';

test.describe('Home page — authenticated user', () => {
  test('renders the dashboard for a user with a complete profile', async ({ page }) => {
    /**
     * End-to-end sanity check: authenticated user with onboarding_complete=true
     * should land on Home and see their qualification level and track 1 role.
     *
     * This test would fail if:
     * - The auth injection doesn't work (shows login page)
     * - The Supabase mock routes don't fire (shows loading forever)
     * - The profile guard redirects to Onboarding incorrectly
     * - The qualification level or role title isn't rendered to the DOM
     */
    await injectFakeSession(page);
    await mockSupabaseRoutes(page, {
      profiles:     [MOCK_PROFILE_COMPLETE],
      career_roles: MOCK_ROLES,
      tasks:        MOCK_TASKS,
    });

    await page.goto('/Home');

    // The page heading should be present
    await expect(page.getByText('Where do I stand?')).toBeVisible({ timeout: 8000 });

    // Assessment from profile should render
    await expect(
      page.getByText('Good foundational skills with clear growth areas.')
    ).toBeVisible();

    // Track 1 role should show
    await expect(page.getByText('Junior Data Analyst')).toBeVisible();

    // Should NOT have navigated away to Onboarding
    expect(page.url()).toContain('/Home');
  });

  test('shows error banner when the roles query fails', async ({ page }) => {
    /**
     * Tests that the error banner renders in a real browser when the roles
     * endpoint returns a server error.
     *
     * This would fail against the pre-fix code where there was no error state —
     * the component would silently show empty skill data with no feedback.
     */
    await injectFakeSession(page);
    await mockSupabaseRoutes(page, {
      profiles: [MOCK_PROFILE_COMPLETE],
    });

    // Override roles to return a 500 error
    const SUPABASE_URL = 'https://ilmqmodklutztuybsvwd.supabase.co';
    await page.route(`${SUPABASE_URL}/rest/v1/career_roles**`, (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ message: 'Internal server error' }) });
    });

    await page.goto('/Home');

    await expect(
      page.getByText(/some data failed to load/i)
    ).toBeVisible({ timeout: 8000 });
  });

  test('shows the pending task in the Next Action section', async ({ page }) => {
    /**
     * The "Next Assigned Action" section shows the first incomplete task.
     * This tests that the tasks query result flows through to the DOM correctly.
     */
    await injectFakeSession(page);
    await mockSupabaseRoutes(page, {
      profiles:     [MOCK_PROFILE_COMPLETE],
      career_roles: MOCK_ROLES,
      tasks:        MOCK_TASKS,
    });

    await page.goto('/Home');

    await expect(
      page.getByText('Update CV for Data Analyst roles')
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Home page — redirect behavior', () => {
  test('redirects to Onboarding when profile is not complete', async ({ page }) => {
    /**
     * A user with onboarding_complete=false should be redirected to /Onboarding.
     * This tests the redirect guard end-to-end in a real browser with real
     * React Router history navigation.
     *
     * The redirect loop bug was specifically about the navigation NOT stopping
     * once it reached Onboarding. This test verifies the final URL is /Onboarding
     * and stable (no further redirects).
     */
    await injectFakeSession(page);
    await mockSupabaseRoutes(page, {
      profiles: [MOCK_PROFILE_INCOMPLETE],
    });

    await page.goto('/Home');

    // Should redirect to Onboarding
    await expect(page).toHaveURL(/\/Onboarding/, { timeout: 8000 });
  });

  test('does not redirect to Onboarding when profile query returns a server error', async ({ page }) => {
    /**
     * This is the profileError guard test in a real browser.
     *
     * Before the fix: profileError=true → profiles=[] → redirect to /Onboarding
     * After the fix:  profileError=true → guard returns early → stays on current page
     *
     * In a real browser this matters because a flaky network connection could
     * otherwise bounce a legitimate user out of their session into an Onboarding loop.
     */
    await injectFakeSession(page);

    // Auth works, but the profiles table throws a 503
    const SUPABASE_URL = 'https://ilmqmodklutztuybsvwd.supabase.co';
    await page.route(`${SUPABASE_URL}/rest/v1/profiles**`, (route) => {
      route.fulfill({ status: 503, body: JSON.stringify({ message: 'Service unavailable' }) });
    });
    await mockSupabaseRoutes(page, {
      career_roles: MOCK_ROLES,
      tasks:        MOCK_TASKS,
    });

    await page.goto('/Home');

    // Give React Query time to settle with retry:false
    await page.waitForTimeout(1500);

    // Must remain on /Home — not redirected to /Onboarding
    expect(page.url()).not.toMatch(/\/Onboarding/);
    expect(page.url()).toContain('/Home');
  });
});

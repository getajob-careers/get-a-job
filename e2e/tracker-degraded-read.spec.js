/**
 * tracker-degraded-read.spec.js — Playwright E2E: the tracker "silent read" defect.
 *
 * Root cause (investigation 2026-07-12): a degraded applications read — the
 * client authenticated but the JWT desynced — returns either HTTP 200 with 0
 * rows (session dropped → anon fallback) or HTTP 401 (stale/invalid JWT). The
 * three surfaces that read `applications` destructure only `{ data = [] }` and
 * ignore `isError`, so BOTH failure modes render as "you have 0 applications"
 * with no error shown. A user with 60 tracked rows saw 1.
 *
 * These tests run the real browser + React Query + Supabase JS client (only the
 * network boundary is mocked) and assert the Pipeline board distinguishes
 * "genuinely empty" from "the read failed":
 *   - control: a healthy read with rows shows the cards
 *   - 401:     an errored read shows the error state, NOT the empty state
 *
 * FAIL-ON-BROKEN: against the pre-fix Career.jsx (which ignores isError) the 401
 * test fails — the board shows "No applications yet" and no error. PASS-ON-FIXED
 * once the applications read surfaces its error state.
 */

import { test, expect } from "@playwright/test";
import {
  injectFakeSession,
  mockSupabaseRoutes,
  MOCK_PROFILE_COMPLETE,
  MOCK_ROLES,
} from "./helpers/mockSupabase.js";

const SUPABASE_URL = "https://ilmqmodklutztuybsvwd.supabase.co";

const APP_ROWS = [
  {
    id: "e2e-app-1",
    user_id: "e2e-test-user-id",
    company: "DriveNets",
    role_title: "AI Operations Assistant",
    status: "applied",
    track: "track_1",
    created_at: "2026-07-08T10:00:00.000Z",
  },
  {
    id: "e2e-app-2",
    user_id: "e2e-test-user-id",
    company: "TERMINAL X",
    role_title: "Junior Product Manager",
    status: "interested",
    track: "track_1",
    created_at: "2026-06-14T10:00:00.000Z",
  },
];

test.describe("Tracker pipeline — degraded applications read", () => {
  test("control: a healthy read renders the tracked rows", async ({ page }) => {
    await injectFakeSession(page);
    await mockSupabaseRoutes(page, {
      profiles: [MOCK_PROFILE_COMPLETE],
      career_roles: MOCK_ROLES,
      applications: APP_ROWS,
    });

    await page.goto("/Career?pipeline=open");

    await expect(page.getByText("DriveNets")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("TERMINAL X")).toBeVisible();
    // The empty state must NOT show when rows exist.
    await expect(page.getByText(/no applications yet/i)).toHaveCount(0);
  });

  test("401: an errored read shows an error state, never the empty state", async ({
    page,
  }) => {
    await injectFakeSession(page);
    await mockSupabaseRoutes(page, {
      profiles: [MOCK_PROFILE_COMPLETE],
      career_roles: MOCK_ROLES,
    });
    // Registered AFTER mockSupabaseRoutes so it takes precedence for this table:
    // the stale-JWT desync signature (PostgREST rejects the token).
    await page.route(`${SUPABASE_URL}/rest/v1/applications**`, (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          code: "PGRST301",
          message: "No suitable key or wrong key type",
        }),
      });
    });

    await page.goto("/Career?pipeline=open");

    // The board must tell the user the read failed…
    await expect(
      page.getByText(/couldn't load your applications/i),
    ).toBeVisible({ timeout: 8000 });
    // …and must NOT claim the tracker is empty (the silent-swallow bug).
    await expect(page.getByText(/no applications yet/i)).toHaveCount(0);
  });
});

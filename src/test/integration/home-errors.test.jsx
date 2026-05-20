/**
 * home-errors.test.jsx
 *
 * Tests the error banners in Home.jsx for failed secondary queries.
 *
 * WHY THESE TESTS MATTER:
 * Before the fix, a failed roles or applications query would silently show
 * empty data — no indication to the user that something went wrong.
 * The user might think they have no roles or no applications when in fact
 * the query just failed. These tests verify that:
 *
 *   1. When roles fails → error banner is shown
 *   2. When applications fails → error banner is shown
 *   3. When all queries succeed → error banner is NOT shown
 *
 * Test 3 is equally important: a false positive (showing an error when
 * everything is fine) would be confusing and erode trust.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createWrapper } from '../testUtils.jsx';
import {
  createSupabaseMock,
  MOCK_USER,
  MOCK_PROFILE_COMPLETE,
  MOCK_ROLES,
  MOCK_TASKS,
} from '../mockSupabase.js';

// ── Mock dependencies ─────────────────────────────────────────────────────────

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: MOCK_USER }),
}));

vi.mock('@/api/supabaseClient', () => ({ supabase: {} }));

// SkillGapCourses and JobMatchChecker components are no longer rendered
// by Home after the 2026-05-20 redesign — kept mock stubs out for now.

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setSupabaseMock(tableMap) {
  const { supabase } = await import('@/api/supabaseClient');
  const mock = createSupabaseMock(tableMap);
  Object.assign(supabase, mock);
}

async function renderHome() {
  const { default: Home } = await import('../../pages/Home.jsx');
  const Wrapper = createWrapper('/Home');
  return render(<Home />, { wrapper: Wrapper });
}

const SUCCESS_MAP = {
  profiles:     { data: [MOCK_PROFILE_COMPLETE], error: null },
  career_roles: { data: MOCK_ROLES, error: null },
  applications: { data: [], error: null },
  experiences:  { data: [], error: null },
  tasks:        { data: MOCK_TASKS, error: null },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Home error banners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error banner when the roles query fails', async () => {
    await setSupabaseMock({
      ...SUCCESS_MAP,
      career_roles: { data: null, error: { message: 'Network error' } },
    });

    await renderHome();

    await waitFor(() => {
      expect(
        screen.getByText(/some data failed to load/i)
      ).toBeInTheDocument();
    });
  });

  it('shows error banner when the applications query fails', async () => {
    await setSupabaseMock({
      ...SUCCESS_MAP,
      applications: { data: null, error: { message: 'Network error' } },
    });

    await renderHome();

    await waitFor(() => {
      expect(
        screen.getByText(/some data failed to load/i)
      ).toBeInTheDocument();
    });
  });

  it('does NOT show error banner when all queries succeed', async () => {
    await setSupabaseMock(SUCCESS_MAP);

    await renderHome();

    // Wait for the bento to render. The "Roadmap" eyebrow uniquely
    // identifies the new Home layout — sits in every state, success or
    // empty, so it's a stable test target.
    await waitFor(() => {
      expect(screen.getByText('ROADMAP')).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/some data failed to load/i)
    ).not.toBeInTheDocument();
  });
});

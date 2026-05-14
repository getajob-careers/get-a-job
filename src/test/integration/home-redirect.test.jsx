/**
 * home-redirect.test.jsx
 *
 * Tests the redirect guard in Home.jsx.
 *
 * WHY THESE TESTS MATTER:
 * The redirect logic has three conditions that must ALL be correct:
 *   1. Only fire after a real fetch (profileFetched=true), not while loading
 *   2. Fire when profiles is empty (new user)
 *   3. Fire when profile.onboarding_complete is false
 *   4. Fire when the profile query errored — we don't actually know if the
 *      user has completed onboarding, so sending them to Onboarding is
 *      safer than leaving them stuck on Home. Onboarding has its own
 *      profile check that handles all states and bounces back to Home if
 *      already complete. The previous "don't redirect on error" guard
 *      masked a structural PostgREST FK bug shipped in PR-2 — every new
 *      signup got stuck on Home silently. Fail-open is the right default.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createWrapper } from '../testUtils.jsx';
import {
  createSupabaseMock,
  MOCK_USER,
  MOCK_PROFILE_COMPLETE,
  MOCK_PROFILE_INCOMPLETE,
  MOCK_ROLES,
  MOCK_TASKS,
} from '../mockSupabase.js';

// ── Mock dependencies ────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    // Keep Link as a simple anchor so we don't need Routes setup
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: MOCK_USER }),
}));

// Supabase is mocked per-test via vi.mocked
vi.mock('@/api/supabaseClient', () => ({ supabase: {} }));

// Stub child components that make their own network calls
vi.mock('../../components/dashboard/SkillGapCourses', () => ({
  default: () => <div data-testid="skill-gap-courses" />,
}));
vi.mock('../../components/dashboard/JobMatchChecker', () => ({
  default: () => <div data-testid="job-match-checker" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Replaces the mocked supabase module's implementation for each test.
 * Using dynamic import so the module mock is already hoisted.
 */
async function setSupabaseMock(tableMap) {
  const { supabase } = await import('@/api/supabaseClient');
  const mock = createSupabaseMock(tableMap);
  Object.assign(supabase, mock);
}

async function renderHome() {
  // Dynamic import so module mocks are applied first
  const { default: Home } = await import('../../pages/Home.jsx');
  const Wrapper = createWrapper('/Home');
  return render(<Home />, { wrapper: Wrapper });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Home redirect guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to Onboarding when profiles array is empty (new user)', async () => {
    await setSupabaseMock({
      profiles:     { data: [], error: null },
      career_roles: { data: [], error: null },
      applications: { data: [], error: null },
      experiences:  { data: [], error: null },
      tasks:        { data: [], error: null },
    });

    await renderHome();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/Onboarding');
    });
  });

  it('redirects to Onboarding when profile.onboarding_complete is false', async () => {
    await setSupabaseMock({
      profiles:     { data: [MOCK_PROFILE_INCOMPLETE], error: null },
      career_roles: { data: [], error: null },
      applications: { data: [], error: null },
      experiences:  { data: [], error: null },
      tasks:        { data: [], error: null },
    });

    await renderHome();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/Onboarding');
    });
  });

  it('redirects to /Onboarding when the profile query errors (fail-open)', async () => {
    /**
     * Updated 2026-05-14: previous behaviour was "do nothing on error,"
     * which masked the PR-2 PostgREST FK bug — every new signup got
     * stuck on Home with no indication anything was wrong.
     *
     * New behaviour: on profile-query error, redirect to /Onboarding.
     * Onboarding has its own profile check (handles missing / incomplete
     * / complete) and bounces back to Home if the user is already done.
     * Worst case the user sees a brief flicker; best case (the common
     * case for an unfinished user) they land where they should.
     */
    await setSupabaseMock({
      profiles:     { data: null, error: { message: 'Failed to fetch', code: 'PGRST301' } },
      career_roles: { data: [], error: null },
      applications: { data: [], error: null },
      experiences:  { data: [], error: null },
      tasks:        { data: [], error: null },
    });

    await renderHome();

    // Give React Query time to resolve
    await new Promise((r) => setTimeout(r, 100));

    expect(mockNavigate).toHaveBeenCalledWith('/Onboarding');
  });

  it('does NOT redirect when profile is complete', async () => {
    await setSupabaseMock({
      profiles:     { data: [MOCK_PROFILE_COMPLETE], error: null },
      career_roles: { data: MOCK_ROLES, error: null },
      applications: { data: [], error: null },
      experiences:  { data: [], error: null },
      tasks:        { data: [], error: null },
    });

    await renderHome();

    await new Promise((r) => setTimeout(r, 100));

    expect(mockNavigate).not.toHaveBeenCalledWith('/Onboarding');
  });
});

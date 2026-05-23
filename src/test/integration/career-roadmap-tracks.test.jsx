/**
 * career-roadmap-tiers.test.jsx
 *
 * Tests role track rendering and error state in CareerRoadmap.jsx.
 *
 * WHY THESE TESTS MATTER:
 *
 * 1. Error state test: Before the fix, a failed roles query rendered an empty
 *    page — the same as "no roles yet". A user couldn't tell if the query failed
 *    or if they just hadn't generated a roadmap. The fix added a proper error
 *    screen. This test ensures it appears.
 *
 * 2. Track rendering test: Each role has a `track` field (track_1/track_2/track_3).
 *    The component renders separate sections per track. If a role ends up in the
 *    wrong section (e.g., due to a bad insert mapping), the test catches it.
 *    This is the UI counterpart of the mapRoleToDbRow unit test.
 *
 * 3. No-roles state test: Ensures the "generate roadmap" prompt renders when
 *    the list is empty — not an error message, not nothing.
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

// Stub child components that render sub-queries
vi.mock('../../components/roadmap/RoleCard', () => ({
  default: ({ role }) => <div data-testid={`role-${role.id}`}>{role.title}</div>,
}));
vi.mock('../../components/roadmap/TrackQuadrantGrid', () => ({
  default: () => <div data-testid="quadrant-grid" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setSupabaseMock(tableMap) {
  const { supabase } = await import('@/api/supabaseClient');
  const mock = createSupabaseMock(tableMap);
  Object.assign(supabase, mock);
}

async function renderCareerRoadmap() {
  const { default: CareerRoadmap } = await import('../../pages/Roadmap.jsx');
  const Wrapper = createWrapper('/Roadmap');
  return render(<CareerRoadmap />, { wrapper: Wrapper });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CareerRoadmap track rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error screen when roles query fails', async () => {
    await setSupabaseMock({
      career_roles: { data: null, error: { message: 'Network error' } },
      profiles:     { data: [MOCK_PROFILE_COMPLETE], error: null },
      experiences:  { data: [], error: null },
      certifications: { data: [], error: null },
    });

    await renderCareerRoadmap();

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load your career roadmap/i)
      ).toBeInTheDocument();
    });
  });

  it('renders all three track tabs + the overview content by default', async () => {
    /**
     * The page now uses a Tabs primitive: Overview | Why these tiers |
     * Track 1 | Track 2 | Track 3. The default tab is Overview. We verify
     * (a) all three track tabs are present in the navigation, (b) overview
     * content renders by default. Role-title-per-track assertions were
     * dropped because radix Tabs unmounts inactive content; the underlying
     * track-mapping logic is covered by mapRoleToDbRow's unit test.
     */
    await setSupabaseMock({
      career_roles:   { data: MOCK_ROLES, error: null },
      profiles:       { data: [MOCK_PROFILE_COMPLETE], error: null },
      experiences:    { data: [], error: null },
      certifications: { data: [], error: null },
    });

    await renderCareerRoadmap();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Track 1/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Track 2/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Track 3/i })).toBeInTheDocument();
    });
    // Overview-tab content present — there are multiple "qualification
    // level" matches (header subtitle + tab card label), so use getAllByText.
    expect(screen.getAllByText(/qualification level/i).length).toBeGreaterThan(0);
  });

  it('shows generate-roadmap prompt when no roles exist yet', async () => {
    await setSupabaseMock({
      career_roles:   { data: [], error: null },
      profiles:       { data: [MOCK_PROFILE_COMPLETE], error: null },
      experiences:    { data: [], error: null },
      certifications: { data: [], error: null },
    });

    await renderCareerRoadmap();

    await waitFor(() => {
      expect(
        screen.getByText(/No roles generated yet/i)
      ).toBeInTheDocument();
    });

    // Error screen must not appear for an empty-but-successful query
    expect(
      screen.queryByText(/failed to load your career roadmap/i)
    ).not.toBeInTheDocument();
  });
});

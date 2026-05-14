/**
 * password-card.test.jsx
 *
 * Tests the two-step password change flow in PasswordCard.
 *
 * WHY THESE TESTS MATTER:
 * Supabase's "Secure password change" setting (now ON in our project) requires
 * the user to prove email possession via reauthenticate() before updateUser()
 * will accept a password change. PasswordCard implements this as a two-step
 * UI:
 *
 *   1. compose → user types new password + confirm → reauthenticate() emails a code
 *   2. verify  → user types the 6-digit code → updateUser({ password, nonce })
 *   3. done    → success state
 *
 * If either step regresses, users get locked into broken flows. Tests cover:
 *   - Compose-step validation (mismatched passwords, too short)
 *   - Successful reauthenticate transitions UI to verify step
 *   - Successful updateUser transitions UI to done step
 *   - Nonce format validation (must be 6 digits)
 *   - reauthenticate error surfaces in UI
 *   - updateUser error surfaces in UI (e.g., expired/incorrect code)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createWrapper } from '../testUtils.jsx';

// ── Mocks ────────────────────────────────────────────────────────────────────

const reauthenticate = vi.fn();
const updateUser = vi.fn();

vi.mock('@/api/supabaseClient', () => ({
  supabase: {
    auth: {
      reauthenticate: (...args) => reauthenticate(...args),
      updateUser: (...args) => updateUser(...args),
    },
  },
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PasswordCard from '../../components/account/PasswordCard.jsx';

beforeEach(() => {
  reauthenticate.mockReset();
  updateUser.mockReset();
});

function renderCard() {
  const Wrapper = createWrapper();
  return render(<PasswordCard />, { wrapper: Wrapper });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PasswordCard — compose step', () => {
  it('rejects passwords shorter than 8 characters', async () => {
    renderCard();
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByPlaceholderText(/repeat the password above/i), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));

    expect(await screen.findByText(/at least 8 characters\./i)).toBeInTheDocument();
    expect(reauthenticate).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords', async () => {
    renderCard();
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), {
      target: { value: 'aValidPassword1' },
    });
    fireEvent.change(screen.getByPlaceholderText(/repeat the password above/i), {
      target: { value: 'differentPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
    expect(reauthenticate).not.toHaveBeenCalled();
  });

  it('calls reauthenticate and advances to verify step on valid submit', async () => {
    reauthenticate.mockResolvedValue({ error: null });
    renderCard();
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), {
      target: { value: 'aValidPassword1' },
    });
    fireEvent.change(screen.getByPlaceholderText(/repeat the password above/i), {
      target: { value: 'aValidPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => expect(reauthenticate).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/we emailed a 6-digit code/i)).toBeInTheDocument();
  });

  it('surfaces reauthenticate error in UI without advancing', async () => {
    reauthenticate.mockResolvedValue({ error: { message: 'Rate limit reached' } });
    renderCard();
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), {
      target: { value: 'aValidPassword1' },
    });
    fireEvent.change(screen.getByPlaceholderText(/repeat the password above/i), {
      target: { value: 'aValidPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));

    expect(await screen.findByText(/rate limit reached/i)).toBeInTheDocument();
    expect(screen.queryByText(/we emailed a 6-digit code/i)).not.toBeInTheDocument();
  });
});

describe('PasswordCard — verify step', () => {
  async function advanceToVerify() {
    reauthenticate.mockResolvedValue({ error: null });
    renderCard();
    fireEvent.change(screen.getByPlaceholderText(/at least 8 characters/i), {
      target: { value: 'aValidPassword1' },
    });
    fireEvent.change(screen.getByPlaceholderText(/repeat the password above/i), {
      target: { value: 'aValidPassword1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
    await screen.findByText(/we emailed a 6-digit code/i);
  }

  it('strips non-digits from nonce input', async () => {
    await advanceToVerify();
    const input = screen.getByPlaceholderText('123456');
    fireEvent.change(input, { target: { value: 'abc1d2e3f4g5h6' } });
    expect(input.value).toBe('123456');
  });

  it('disables confirm button until 6 digits entered', async () => {
    await advanceToVerify();
    const btn = screen.getByRole('button', { name: /confirm and update password/i });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '12345' } });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });
    expect(btn).not.toBeDisabled();
  });

  it('calls updateUser with the nonce + new password, advances to done', async () => {
    await advanceToVerify();
    updateUser.mockResolvedValue({ error: null });

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm and update password/i }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({
      password: 'aValidPassword1',
      nonce: '123456',
    }));
    expect(await screen.findByText(/your password is updated/i)).toBeInTheDocument();
  });

  it('surfaces updateUser error and keeps user on verify step', async () => {
    await advanceToVerify();
    updateUser.mockResolvedValue({ error: { message: 'Invalid or expired code' } });

    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '999999' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm and update password/i }));

    expect(await screen.findByText(/invalid or expired code/i)).toBeInTheDocument();
    expect(screen.queryByText(/your password is updated/i)).not.toBeInTheDocument();
  });
});

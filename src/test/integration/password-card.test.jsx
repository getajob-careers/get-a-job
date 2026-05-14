/**
 * password-card.test.jsx
 *
 * Tests the two-step password change flow in PasswordCard.
 *
 * WHY THESE TESTS MATTER:
 * Supabase's "Require reauthentication for password updates" setting requires
 * the user to prove email possession via reauthenticate() before updateUser()
 * will accept a password change. PasswordCard implements this as a two-step
 * UI:
 *
 *   1. compose → live-validate against the project's password rules
 *      (min length, lowercase, uppercase, digit, symbol) BEFORE calling
 *      reauthenticate(). Submit is disabled until all 5 client-side checks
 *      pass + the two password fields match. This avoids the bad UX where
 *      the user goes through the email step only to find out their
 *      password doesn't meet requirements.
 *   2. verify  → user types the 6-digit code → updateUser({ password, nonce })
 *   3. done    → success state
 *
 * HIBP is the only server-side-only check (we surface it as a hint).
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

// A password that satisfies all 5 client-side checks.
const STRONG_PASSWORD = 'StrongPass1!';

beforeEach(() => {
  reauthenticate.mockReset();
  updateUser.mockReset();
});

function renderCard() {
  const Wrapper = createWrapper();
  return render(<PasswordCard />, { wrapper: Wrapper });
}

function newPasswordInput() {
  return screen.getByPlaceholderText(/meets all 5 requirements/i);
}

function confirmInput() {
  return screen.getByPlaceholderText(/repeat the password above/i);
}

function submitButton() {
  return screen.getByRole('button', { name: /send verification code/i });
}

// ── Compose-step validation ──────────────────────────────────────────────────

describe('PasswordCard — compose-step live validation', () => {
  it('disables submit by default (empty password)', () => {
    renderCard();
    expect(submitButton()).toBeDisabled();
  });

  it('shows all 5 requirement rows', () => {
    renderCard();
    const list = screen.getByLabelText(/password requirements/i);
    expect(list).toBeInTheDocument();
    expect(list.querySelectorAll('li')).toHaveLength(5);
  });

  it('keeps submit disabled when password meets some but not all requirements', () => {
    renderCard();
    // Length + lowercase + digit, but no uppercase or symbol → not all 5 ✓
    fireEvent.change(newPasswordInput(), { target: { value: 'abcdefg1' } });
    fireEvent.change(confirmInput(), { target: { value: 'abcdefg1' } });
    expect(submitButton()).toBeDisabled();
  });

  it('enables submit when all 5 checks pass AND passwords match', () => {
    renderCard();
    fireEvent.change(newPasswordInput(), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(confirmInput(), { target: { value: STRONG_PASSWORD } });
    expect(submitButton()).not.toBeDisabled();
  });

  it('keeps submit disabled when passwords mismatch even if strong', () => {
    renderCard();
    fireEvent.change(newPasswordInput(), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(confirmInput(), { target: { value: 'DifferentPass1!' } });
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(/doesn't match the password above/i)).toBeInTheDocument();
  });

  it('does not call reauthenticate when submit is disabled', () => {
    renderCard();
    fireEvent.change(newPasswordInput(), { target: { value: 'weak' } });
    // Button is disabled, so clicking has no effect
    fireEvent.click(submitButton());
    expect(reauthenticate).not.toHaveBeenCalled();
  });
});

// ── Compose → verify transition ──────────────────────────────────────────────

describe('PasswordCard — compose → verify transition', () => {
  it('calls reauthenticate and advances to verify step on valid submit', async () => {
    reauthenticate.mockResolvedValue({ error: null });
    renderCard();
    fireEvent.change(newPasswordInput(), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(confirmInput(), { target: { value: STRONG_PASSWORD } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(reauthenticate).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/we emailed a 6-digit code/i)).toBeInTheDocument();
  });

  it('surfaces reauthenticate error in UI without advancing', async () => {
    reauthenticate.mockResolvedValue({ error: { message: 'Rate limit reached' } });
    renderCard();
    fireEvent.change(newPasswordInput(), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(confirmInput(), { target: { value: STRONG_PASSWORD } });
    fireEvent.click(submitButton());

    expect(await screen.findByText(/rate limit reached/i)).toBeInTheDocument();
    expect(screen.queryByText(/we emailed a 6-digit code/i)).not.toBeInTheDocument();
  });
});

// ── Verify step ──────────────────────────────────────────────────────────────

describe('PasswordCard — verify step', () => {
  async function advanceToVerify() {
    reauthenticate.mockResolvedValue({ error: null });
    renderCard();
    fireEvent.change(newPasswordInput(), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(confirmInput(), { target: { value: STRONG_PASSWORD } });
    fireEvent.click(submitButton());
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
      password: STRONG_PASSWORD,
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

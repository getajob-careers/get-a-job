/**
 * login-signup.test.jsx
 *
 * Tests Login.jsx's mode-specific behavior, focused on:
 *   1. Live password validation must appear in SIGNUP mode
 *   2. Live password validation must NOT appear in SIGNIN mode
 *      (don't nag returning users about character-class rules)
 *   3. Submit button disabled in signup until all 5 checks pass; never
 *      gated in signin
 *   4. minLength matches server (8) in signup mode
 *
 * Whole point: the signup flow used to be a first-impression UX trap —
 * a 6-char `minLength` browser hint, no rules guidance, and server-side
 * rejection only AFTER submit. These tests prevent that regression.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createWrapper } from '../testUtils.jsx';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const signUp = vi.fn();
const signInWithPassword = vi.fn();
const resetPasswordForEmail = vi.fn();

vi.mock('@/api/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: (...args) => signUp(...args),
      signInWithPassword: (...args) => signInWithPassword(...args),
      resetPasswordForEmail: (...args) => resetPasswordForEmail(...args),
    },
  },
}));

// Mock the Cloudflare Turnstile widget. Real widget is async (network call
// to Cloudflare) — in tests we simulate "user solved the captcha
// instantly" by firing onSuccess on mount. This isolates the password-
// policy assertions below from captcha plumbing.
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }) => {
    React.useEffect(() => {
      onSuccess?.('test-captcha-token');
    }, [onSuccess]);
    return <div data-testid="turnstile-mock" />;
  },
}));

import Login from '../../pages/Login.jsx';

beforeEach(() => {
  signUp.mockReset();
  signInWithPassword.mockReset();
  resetPasswordForEmail.mockReset();
});

function renderLogin() {
  return render(<Login />, { wrapper: createWrapper() });
}

function switchToSignup() {
  // Mode switch lives in the tablist at the top of the form. role="tab"
  // keeps it distinct from the form's submit button (which also matches
  // /sign in/i) so existing submit-button assertions still resolve uniquely.
  fireEvent.click(screen.getByRole('tab', { name: /sign up/i }));
}

describe('Login — signin mode (default)', () => {
  it('does NOT show password requirements', () => {
    renderLogin();
    expect(screen.queryByLabelText(/password requirements/i)).not.toBeInTheDocument();
  });

  it('submit button is enabled regardless of password strength', () => {
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText(/you@example/i), { target: { value: 'u@x.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), { target: { value: 'weak' } });
    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });

  it('uses browser minLength=6 (signin only — weak passwords already in the wild)', () => {
    renderLogin();
    const pwInput = screen.getByPlaceholderText(/••••••••/);
    expect(pwInput.getAttribute('minlength')).toBe('6');
  });
});

describe('Login — signup mode', () => {
  it('shows password requirements checklist', () => {
    renderLogin();
    switchToSignup();
    expect(screen.getByLabelText(/password requirements/i)).toBeInTheDocument();
  });

  it('uses minLength=8 to match server requirements', () => {
    renderLogin();
    switchToSignup();
    const pwInput = screen.getByPlaceholderText(/meets all 5 requirements/i);
    expect(pwInput.getAttribute('minlength')).toBe('8');
  });

  it('disables Create Account until all 5 checks pass', () => {
    renderLogin();
    switchToSignup();
    fireEvent.change(screen.getByPlaceholderText(/john doe/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example/i), { target: { value: 'u@x.com' } });

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    const pwInput = screen.getByPlaceholderText(/meets all 5 requirements/i);

    // Empty: disabled
    expect(submitBtn).toBeDisabled();

    // Length only (no uppercase, digit, symbol): disabled
    fireEvent.change(pwInput, { target: { value: 'abcdefgh' } });
    expect(submitBtn).toBeDisabled();

    // Missing symbol (the regression case from PR #25 + #26): disabled
    fireEvent.change(pwInput, { target: { value: 'Abcdefg1' } });
    expect(submitBtn).toBeDisabled();

    // All 5: enabled
    fireEvent.change(pwInput, { target: { value: 'StrongPass1!' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('does not call signUp when client-side gate fails', () => {
    renderLogin();
    switchToSignup();
    fireEvent.change(screen.getByPlaceholderText(/john doe/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example/i), { target: { value: 'u@x.com' } });
    fireEvent.change(screen.getByPlaceholderText(/meets all 5 requirements/i), { target: { value: 'weak' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe('Login — forgot mode', () => {
  it('hides the password field entirely', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.queryByPlaceholderText(/••••••••/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/meets all 5 requirements/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password requirements/i)).not.toBeInTheDocument();
  });
});

describe('Login — captcha gating', () => {
  it('renders the Turnstile widget in signup mode but not signin', () => {
    renderLogin();
    // signin (default): no widget
    expect(screen.queryByTestId('turnstile-mock')).not.toBeInTheDocument();

    // signup: widget appears
    switchToSignup();
    expect(screen.getByTestId('turnstile-mock')).toBeInTheDocument();
  });

  it('hides the Turnstile widget in forgot-password mode', () => {
    renderLogin();
    // From signin, click "Forgot password?" — widget should NOT appear.
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.queryByTestId('turnstile-mock')).not.toBeInTheDocument();
  });
});

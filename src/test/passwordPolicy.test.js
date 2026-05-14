/**
 * passwordPolicy.test.js
 *
 * Unit tests for the shared password validation helper used by both
 * PasswordCard (in-app change-password) and Login.jsx (signup).
 *
 * WHY THESE TESTS MATTER:
 * Validation rules MUST match Supabase's server-side enforcement exactly.
 * A previous regex-based version had a subtle bug where the `+-=` substring
 * inside a regex character class was interpreted as an ASCII range (43-61),
 * silently matching digits 0-9 as "symbols". The frontend green-lit
 * passwords the server rejected.
 *
 * These tests are the single guard against that class of bug. If the policy
 * file changes, these tests catch any drift before it hits users.
 */

import { describe, it, expect } from 'vitest';
import {
  MIN_LEN,
  SYMBOL_SET,
  hasSymbol,
  getPasswordChecks,
  allChecksPass,
} from '../lib/passwordPolicy.js';

// Mirror of Supabase's password_required_characters config (verified via
// Management API GET on 2026-05-14). The duplicate backslash in Supabase's
// default collapses naturally in a Set; we list 32 distinct chars.
const SUPABASE_SYMBOLS = [
  '!', '@', '#', '$', '%', '^', '&', '*', '(', ')',
  '_', '+', '-', '=', '[', ']', '{', '}', ';', "'",
  '\\', ':', '"', '|', '<', '>', '?', ',', '.', '/',
  '`', '~',
];

describe('passwordPolicy — constants', () => {
  it('MIN_LEN matches Supabase password_min_length config (8)', () => {
    expect(MIN_LEN).toBe(8);
  });

  it('SYMBOL_SET contains exactly the 32 chars Supabase enforces', () => {
    expect(SYMBOL_SET.size).toBe(SUPABASE_SYMBOLS.length);
    for (const c of SUPABASE_SYMBOLS) {
      expect(SYMBOL_SET.has(c)).toBe(true);
    }
  });
});

describe('passwordPolicy — hasSymbol', () => {
  it.each(SUPABASE_SYMBOLS)('returns true for password containing %s', (s) => {
    expect(hasSymbol(`Aa1${s}xyz`)).toBe(true);
  });

  it('returns false for letters-only', () => {
    expect(hasSymbol('AbcdefGH')).toBe(false);
  });

  it('returns false for letters + digits only (regression for +-= range bug)', () => {
    expect(hasSymbol('Aaaaaaa1')).toBe(false);
    expect(hasSymbol('12345678')).toBe(false);
    expect(hasSymbol('Abc12345')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasSymbol('')).toBe(false);
  });
});

describe('passwordPolicy — getPasswordChecks', () => {
  it('returns all 5 keys as booleans', () => {
    const c = getPasswordChecks('Aa1!aaaa');
    expect(Object.keys(c).sort()).toEqual(
      ['digit', 'length', 'lowercase', 'symbol', 'uppercase']
    );
    for (const v of Object.values(c)) expect(typeof v).toBe('boolean');
  });

  it('all checks pass for a strong password', () => {
    const c = getPasswordChecks('StrongPass1!');
    expect(c).toEqual({
      length: true,
      lowercase: true,
      uppercase: true,
      digit: true,
      symbol: true,
    });
  });

  it('length fails for short passwords even if other rules pass', () => {
    const c = getPasswordChecks('Aa1!');
    expect(c.length).toBe(false);
    expect(c.lowercase).toBe(true);
    expect(c.uppercase).toBe(true);
    expect(c.digit).toBe(true);
    expect(c.symbol).toBe(true);
  });

  it('regression: Aaaaaaa1 fails symbol check (digits are not symbols)', () => {
    const c = getPasswordChecks('Aaaaaaa1');
    expect(c.length).toBe(true);
    expect(c.lowercase).toBe(true);
    expect(c.uppercase).toBe(true);
    expect(c.digit).toBe(true);
    expect(c.symbol).toBe(false);
  });

  it('regression: digits-only password fails letter + symbol checks', () => {
    const c = getPasswordChecks('12345678');
    expect(c.length).toBe(true);
    expect(c.lowercase).toBe(false);
    expect(c.uppercase).toBe(false);
    expect(c.digit).toBe(true);
    expect(c.symbol).toBe(false);
  });
});

describe('passwordPolicy — allChecksPass', () => {
  it('returns true only when every check is true', () => {
    expect(allChecksPass({ a: true, b: true })).toBe(true);
    expect(allChecksPass({ a: true, b: false })).toBe(false);
    expect(allChecksPass({})).toBe(true);
  });
});

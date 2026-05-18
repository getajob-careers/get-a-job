import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseWorkdayDate } from '../../scripts/lib/ats-fetchers.ts';

describe('parseWorkdayDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T14:23:45Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for null / undefined / empty', () => {
    expect(parseWorkdayDate(null)).toBeNull();
    expect(parseWorkdayDate(undefined)).toBeNull();
    expect(parseWorkdayDate('')).toBeNull();
    expect(parseWorkdayDate('   ')).toBeNull();
  });

  it('parses "Posted Today" to start of today UTC', () => {
    expect(parseWorkdayDate('Posted Today')).toBe('2026-05-18T00:00:00.000Z');
  });

  it('parses "Posted Yesterday" to start of yesterday UTC', () => {
    expect(parseWorkdayDate('Posted Yesterday')).toBe('2026-05-17T00:00:00.000Z');
  });

  it('parses "Posted N Days Ago"', () => {
    expect(parseWorkdayDate('Posted 3 Days Ago')).toBe('2026-05-15T00:00:00.000Z');
    expect(parseWorkdayDate('Posted 1 Day Ago')).toBe('2026-05-17T00:00:00.000Z');
  });

  it('parses "Posted N+ Days Ago" (treats N+ as N — best-effort floor)', () => {
    expect(parseWorkdayDate('Posted 30+ Days Ago')).toBe('2026-04-18T00:00:00.000Z');
  });

  it('is case-insensitive and whitespace-tolerant', () => {
    expect(parseWorkdayDate('  posted  4  days  ago  ')).toBe('2026-05-14T00:00:00.000Z');
    expect(parseWorkdayDate('POSTED TODAY')).toBe('2026-05-18T00:00:00.000Z');
  });

  it('passes ISO timestamps through (Date.parse roundtrip)', () => {
    expect(parseWorkdayDate('2026-05-10T12:34:56Z')).toBe('2026-05-10T12:34:56.000Z');
  });

  it('returns null for unparseable garbage rather than throwing', () => {
    expect(parseWorkdayDate('Posted a long time ago')).toBeNull();
    expect(parseWorkdayDate('nonsense')).toBeNull();
    expect(parseWorkdayDate('Posted Soon')).toBeNull();
  });
});

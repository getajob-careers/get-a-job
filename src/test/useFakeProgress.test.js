import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFakeProgress } from '../lib/useFakeProgress';

describe('useFakeProgress', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts at 0', () => {
    const { result } = renderHook(() => useFakeProgress(false, 60000));
    expect(result.current).toBe(0);
  });

  it('advances on a slowing curve over the expected duration', () => {
    const { result } = renderHook(() => useFakeProgress(false, 60000));

    // Tick forward in chunks and confirm the curve is monotonic + capped at 95
    act(() => { vi.advanceTimersByTime(10_000); });
    const at10s = result.current;

    act(() => { vi.advanceTimersByTime(20_000); });
    const at30s = result.current;

    act(() => { vi.advanceTimersByTime(30_000); });
    const at60s = result.current;

    act(() => { vi.advanceTimersByTime(60_000); });
    const at120s = result.current;

    expect(at10s).toBeGreaterThan(0);
    expect(at30s).toBeGreaterThan(at10s);
    expect(at60s).toBeGreaterThan(at30s);
    expect(at60s).toBeLessThanOrEqual(95);
    expect(at120s).toBeLessThanOrEqual(95);
    // Curve flattens: the gain from 60s → 120s is smaller than the gain
    // from 10s → 30s — that's the "slows as it approaches 95" behavior.
    expect(at120s - at60s).toBeLessThan(at30s - at10s);
  });

  it('snaps to 100 when isComplete flips true', () => {
    const { result, rerender } = renderHook(({ done }) => useFakeProgress(done, 60000), {
      initialProps: { done: false },
    });
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(result.current).toBeLessThan(100);

    rerender({ done: true });
    expect(result.current).toBe(100);
  });

  it('caps at 95 even after very long elapsed time', () => {
    const { result } = renderHook(() => useFakeProgress(false, 60000));
    act(() => { vi.advanceTimersByTime(600_000); }); // 10 minutes
    expect(result.current).toBe(95);
  });
});

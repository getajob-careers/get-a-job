// deriveCvProgress - the honesty guard for the determinate CV ring.
// The ring must only fill for a trustworthy, in-flight generation; anything
// else (terminal rows, pre-first-milestone rows, stale leftovers) resolves to
// null so the ring stays honestly indeterminate.
import { describe, it, expect } from "vitest";
import { deriveCvProgress } from "@/hooks/useCvGenerationProgress";

const NOW = 1_700_000_000_000;
const fresh = (over = {}) => ({
  done: 1,
  total: 3,
  stage: "tailoring",
  updated_at: new Date(NOW - 1000).toISOString(),
  ...over,
});

describe("deriveCvProgress - honest determinate ring", () => {
  it("returns the contract for a fresh in-flight row with a completed milestone", () => {
    expect(deriveCvProgress(fresh(), NOW)).toEqual({
      done: 1,
      total: 3,
      stage: "tailoring",
    });
  });

  it("null for no row (indeterminate spin)", () => {
    expect(deriveCvProgress(null, NOW)).toBeNull();
    expect(deriveCvProgress(undefined, NOW)).toBeNull();
  });

  it("null on the terminal 'error' stage (caller's error UI takes over)", () => {
    expect(
      deriveCvProgress(fresh({ stage: "error", done: 2 }), NOW),
    ).toBeNull();
  });

  it("null on the terminal 'done' stage (unmount imminent)", () => {
    expect(deriveCvProgress(fresh({ stage: "done", done: 3 }), NOW)).toBeNull();
  });

  it("null before the first milestone (done=0 => honest spin, not an empty arc)", () => {
    expect(
      deriveCvProgress(fresh({ stage: "starting", done: 0 }), NOW),
    ).toBeNull();
  });

  it("null when total is 0 (no real contract)", () => {
    expect(deriveCvProgress(fresh({ total: 0, done: 0 }), NOW)).toBeNull();
  });

  it("null for a stale leftover row (a crashed run that skipped its terminal emit)", () => {
    const stale = fresh({ updated_at: new Date(NOW - 120_000).toISOString() });
    expect(deriveCvProgress(stale, NOW)).toBeNull();
  });

  it("lights for a recent row within the freshness window", () => {
    const recent = fresh({
      done: 2,
      updated_at: new Date(NOW - 80_000).toISOString(),
    });
    expect(deriveCvProgress(recent, NOW)).toEqual({
      done: 2,
      total: 3,
      stage: "tailoring",
    });
  });
});

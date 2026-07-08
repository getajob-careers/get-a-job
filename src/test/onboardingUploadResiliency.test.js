import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withTimeout,
  resilientUploadEnabled,
  UPLOAD_TIMEOUT_MS,
  PARSE_TIMEOUT_MS,
} from "@/lib/onboardingUploadResiliency";

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves with the underlying value when it beats the timer", async () => {
    const p = withTimeout(() => Promise.resolve("ok"), 1000, "op");
    await expect(p).resolves.toBe("ok");
  });

  it("rejects with code='timeout' when the operation is too slow", async () => {
    const slow = () => new Promise((r) => setTimeout(() => r("late"), 5000));
    const p = withTimeout(slow, 1000, "Upload");
    const assertion = expect(p).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it("aborts the underlying request via the passed AbortSignal on timeout", async () => {
    let seenSignal = null;
    const run = (signal) => {
      seenSignal = signal;
      return new Promise((r) => setTimeout(() => r("late"), 5000));
    };
    const p = withTimeout(run, 1000, "op").catch(() => {});
    await vi.advanceTimersByTimeAsync(1000);
    await p;
    expect(seenSignal).toBeInstanceOf(AbortSignal);
    expect(seenSignal.aborted).toBe(true);
  });
});

describe("resilientUploadEnabled", () => {
  afterEach(() => {
    try {
      localStorage.removeItem("gaj.onb.upload_resiliency");
    } catch {
      /* noop */
    }
  });

  it("defaults ON (DEFAULT_ON enabled after the 2026-07-08 live smoke test)", () => {
    expect(resilientUploadEnabled()).toBe(true);
  });

  it("enables when the localStorage flag is set", () => {
    localStorage.setItem("gaj.onb.upload_resiliency", "1");
    expect(resilientUploadEnabled()).toBe(true);
  });
});

describe("timeout constants", () => {
  it("gives the reasoning-model parse leg a wider cap than upload", () => {
    // gpt-5.4-mini latency is variable and can exceed 10s legitimately, so
    // the parse cap must be > the upload cap to avoid aborting good calls.
    expect(PARSE_TIMEOUT_MS).toBeGreaterThan(UPLOAD_TIMEOUT_MS);
    expect(UPLOAD_TIMEOUT_MS).toBe(30_000);
  });
});

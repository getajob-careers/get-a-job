// Tests for the shared metrics wrapper. Two purposes:
//
//   1. Pin pricing math + null-handling on computeCostUsd so model-table
//      edits don't silently regress per-call cost in dashboards.
//   2. Lock in the field-name-typo backstop on finishMetric. The
//      generate-internship-pitch null-coded-row bug (May 4 → June 11 2026)
//      shipped because the call site passed `{ http, err }` instead of
//      `{ httpStatus, errorCode }` and TypeScript was never run on the
//      deployed edge function. finishMetric now logs loudly when the wrong
//      shape arrives at runtime; this test guarantees that backstop fires.
//
// Test runner: vitest (same as the other _shared tests). We don't exercise
// the actual Supabase insert — finishMetric short-circuits on a missing
// env var, which is what happens under vitest by default.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeCostUsd, finishMetric, startMetric, type MetricResult } from "./metrics.ts";

describe("computeCostUsd", () => {
  it("returns null when model is missing", () => {
    expect(computeCostUsd(null, 100, 200)).toBeNull();
    expect(computeCostUsd(undefined, 100, 200)).toBeNull();
  });

  it("returns null when either token count is null/undefined", () => {
    expect(computeCostUsd("gpt-4o", null, 200)).toBeNull();
    expect(computeCostUsd("gpt-4o", 100, null)).toBeNull();
    expect(computeCostUsd("gpt-4o", undefined, 200)).toBeNull();
  });

  it("returns 0 for unknown models so SUMs still work", () => {
    expect(computeCostUsd("totally-fake-model", 1000, 2000)).toBe(0);
  });

  it("applies the priced rates per 1M tokens", () => {
    // gpt-4o: $2.50 in, $10.00 out per 1M
    expect(computeCostUsd("gpt-4o", 1_000_000, 0)).toBeCloseTo(2.5, 6);
    expect(computeCostUsd("gpt-4o", 0, 1_000_000)).toBeCloseTo(10.0, 6);
    // gpt-4o-mini: $0.15 in, $0.60 out per 1M
    expect(computeCostUsd("gpt-4o-mini", 2_000_000, 500_000)).toBeCloseTo(2.0 * 0.15 + 0.5 * 0.60, 6);
    // claude-sonnet-4-6: $3.00 in, $15.00 out per 1M
    expect(computeCostUsd("claude-sonnet-4-6", 500_000, 500_000)).toBeCloseTo(0.5 * 3.0 + 0.5 * 15.0, 6);
  });
});

describe("finishMetric — field-name-typo backstop", () => {
  beforeEach(() => {
    // Force the env-skip branch so finishMetric never touches the
    // Supabase client (it would fail to resolve outside Deno runtime).
    // The console.error backstop fires BEFORE the env check, which is
    // what we're verifying.
    vi.stubGlobal("Deno", { env: { get: () => "" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does NOT log [metrics] error on a well-formed MetricResult", () => {
    const m = startMetric("test-fn");
    const good: MetricResult = { ok: true, httpStatus: 200, errorCode: null };
    finishMetric(m, good);
    const errCalls = (console.error as ReturnType<typeof vi.spyOn>).mock.calls;
    const matched = errCalls.filter((args) =>
      String(args[0] ?? "").includes("[metrics]") &&
      String(args[0] ?? "").includes("non-numeric httpStatus"),
    );
    expect(matched).toHaveLength(0);
  });

  it("logs [metrics] error when httpStatus is undefined (the actual bug)", () => {
    // The exact wrong shape that generate-internship-pitch shipped for
    // 13 months. Caster mimics how a field-name typo bypasses TS at runtime
    // when `deno check` isn't part of the deploy pipeline.
    const m = startMetric("test-fn");
    const wrong = { ok: false, http: 500, err: "unhandled" } as unknown as MetricResult;
    finishMetric(m, wrong);
    const errCalls = (console.error as ReturnType<typeof vi.spyOn>).mock.calls;
    const matched = errCalls.filter((args) =>
      String(args[0] ?? "").includes("[metrics]") &&
      String(args[0] ?? "").includes("non-numeric httpStatus") &&
      String(args[0] ?? "").includes("test-fn"),
    );
    expect(matched.length).toBeGreaterThanOrEqual(1);
  });

  it("logs [metrics] error when httpStatus is a string", () => {
    const m = startMetric("test-fn");
    const wrong = { ok: true, httpStatus: "200", errorCode: null } as unknown as MetricResult;
    finishMetric(m, wrong);
    const errCalls = (console.error as ReturnType<typeof vi.spyOn>).mock.calls;
    const matched = errCalls.filter((args) =>
      String(args[0] ?? "").includes("non-numeric httpStatus"),
    );
    expect(matched.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT throw when the typo occurs — observability must never break the caller", () => {
    const m = startMetric("test-fn");
    const wrong = { ok: false } as unknown as MetricResult;
    expect(() => finishMetric(m, wrong)).not.toThrow();
  });
});

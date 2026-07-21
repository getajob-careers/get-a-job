// Tests for cache-aware computeCostUsd. Runner: vitest. metrics.ts reads
// Deno.env only inside finishMetric (runtime), not at load, but stub Deno
// anyway so the import is inert.

import { describe, it, expect, vi } from "vitest";

vi.stubGlobal("Deno", { env: { get: () => undefined } });
const { computeCostUsd } = await import("./metrics.ts");

// claude-sonnet-4-6: input $3/M, output $15/M. Cache write 1.25x input ($3.75),
// cache read 0.1x input ($0.30).
describe("computeCostUsd — cache-aware pricing", () => {
  it("prices with no cache breakdown exactly as before (backward compatible)", () => {
    // 1,000,000 input @ $3 + 0 output = $3
    expect(computeCostUsd("claude-sonnet-4-6", 1_000_000, 0)).toBeCloseTo(3, 6);
  });

  it("prices cache read at 0.1x and cache write at 1.25x of the input rate", () => {
    // tokensIn is the TOTAL (regular + read + write). 1M total split as
    // 600k regular + 300k read + 100k write, 0 output.
    const cost = computeCostUsd("claude-sonnet-4-6", 1_000_000, 0, {
      readTokens: 300_000,
      writeTokens: 100_000,
    });
    // 600k*$3 + 100k*$3.75 + 300k*$0.30 per M
    const expected = (600_000 * 3 + 100_000 * 3.75 + 300_000 * 0.3) / 1_000_000;
    expect(cost).toBeCloseTo(expected, 6);
    // and it must be cheaper than pricing the whole input at the base rate
    expect(cost!).toBeLessThan(computeCostUsd("claude-sonnet-4-6", 1_000_000, 0)!);
  });

  it("adds output cost on top", () => {
    const cost = computeCostUsd("claude-sonnet-4-6", 0, 1_000_000);
    expect(cost).toBeCloseTo(15, 6);
  });

  it("returns null on missing inputs and 0 on an unknown model", () => {
    expect(computeCostUsd(null, 10, 10)).toBeNull();
    expect(computeCostUsd("claude-sonnet-4-6", null, 10)).toBeNull();
    expect(computeCostUsd("no-such-model", 10, 10)).toBe(0);
  });
});

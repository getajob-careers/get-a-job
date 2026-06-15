// Per-ATS failure-rate tests. The orchestrator uses these to decide
// whether to exit 1 even when the global >20% backstop hasn't tripped —
// the canonical scenario is a single ATS family (e.g. Greenhouse) going
// dark while the rest of the corpus stays green.

import { describe, it, expect } from "vitest";
import {
  computePerAtsBreakdown,
  selectOverThreshold,
  type CompanyResultLike,
} from "./per-ats-thresholds.ts";

const ok = (ats: string): CompanyResultLike => ({ ats, status: "ok" });
const fail = (ats: string): CompanyResultLike => ({
  ats,
  status: "fetch_error",
});
const upsertFail = (ats: string): CompanyResultLike => ({
  ats,
  status: "upsert_error",
});
const noSlug = (ats: string): CompanyResultLike => ({ ats, status: "no_slug" });

describe("computePerAtsBreakdown — grouping + math", () => {
  it("returns [] on empty input", () => {
    expect(computePerAtsBreakdown([])).toEqual([]);
  });

  it("groups by ats and computes failurePct", () => {
    const r = computePerAtsBreakdown([
      ok("greenhouse"),
      ok("greenhouse"),
      fail("greenhouse"), // 33%
      ok("lever"),
      ok("lever"),
      ok("lever"),
      ok("lever"), // 0%
      fail("workday"),
      fail("workday"), // 100%
    ]);
    expect(r).toEqual([
      {
        ats: "workday",
        total: 2,
        successful: 0,
        failed: 2,
        skipped: 0,
        failurePct: 100,
      },
      expect.objectContaining({
        ats: "greenhouse",
        total: 3,
        failed: 1,
        failurePct: expect.closeTo(33.33, 1),
      }),
      {
        ats: "lever",
        total: 4,
        successful: 4,
        failed: 0,
        skipped: 0,
        failurePct: 0,
      },
    ]);
  });

  it("counts both fetch_error and upsert_error as failures (matches global formula)", () => {
    const r = computePerAtsBreakdown([
      ok("comeet"),
      fail("comeet"),
      upsertFail("comeet"),
    ]);
    const comeet = r.find((b) => b.ats === "comeet")!;
    expect(comeet.failed).toBe(2);
    expect(comeet.failurePct).toBeCloseTo(66.67, 1);
  });

  it("treats no_slug as skipped (neither success nor failure)", () => {
    // no_slug is the existing 'we never attempted a fetch' state. The
    // orchestrator's global formula counts it as neither success nor
    // failure; the per-ATS formula must match that or the threshold
    // semantics drift.
    const r = computePerAtsBreakdown([
      ok("comeet"),
      ok("comeet"),
      noSlug("comeet"),
      noSlug("comeet"),
    ]);
    const c = r.find((b) => b.ats === "comeet")!;
    expect(c.total).toBe(4);
    expect(c.successful).toBe(2);
    expect(c.failed).toBe(0);
    expect(c.skipped).toBe(2);
    expect(c.failurePct).toBe(0);
  });

  it("sorts by failurePct descending (worst first)", () => {
    const r = computePerAtsBreakdown([
      ok("a"),
      fail("a"), // 50%
      ok("b"),
      ok("b"),
      ok("b"),
      fail("b"), // 25%
      fail("c"),
      fail("c"),
      fail("c"), // 100%
    ]);
    expect(r.map((b) => b.ats)).toEqual(["c", "a", "b"]);
  });
});

describe("selectOverThreshold — the orchestrator's exit gate", () => {
  it("returns [] when every ATS is at or under the threshold", () => {
    const breakdown = computePerAtsBreakdown([
      ok("comeet"),
      ok("comeet"),
      fail("comeet"), // 33%
      ok("greenhouse"),
      fail("greenhouse"), // 50% — at threshold, not OVER
    ]);
    expect(selectOverThreshold(breakdown, 50)).toEqual([]);
  });

  it("returns only ATSs whose failurePct strictly exceeds the threshold", () => {
    const breakdown = computePerAtsBreakdown([
      ok("ok-ats"),
      ok("ok-ats"),
      fail("ok-ats"), // 33%, under 50
      fail("bad-ats"),
      fail("bad-ats"),
      ok("bad-ats"), // 67%, over 50
      fail("worst"),
      fail("worst"),
      fail("worst"), // 100%, over 50
    ]);
    const over = selectOverThreshold(breakdown, 50);
    expect(over.map((b) => b.ats)).toEqual(["worst", "bad-ats"]);
  });

  // The Greenhouse-goes-dark scenario the comment in per-ats-thresholds.ts
  // calls out. Global rate stays under 20% (199 of 891 = 22% — borderline,
  // simulate 198/891 = 22% under), but Greenhouse alone is 100%.
  it("trips on a single-ATS outage even when the global rate is healthy", () => {
    const results: CompanyResultLike[] = [];
    // 90 healthy ATS (Workday/Lever/etc.) — all green
    for (let i = 0; i < 90; i++) results.push(ok("lever"));
    // 10 broken Greenhouse — all fetch_error
    for (let i = 0; i < 10; i++) results.push(fail("greenhouse"));
    // Global rate: 10/100 = 10%, well under the 20% backstop.
    // Per-ATS: greenhouse = 100%, lever = 0%.
    const breakdown = computePerAtsBreakdown(results);
    const over = selectOverThreshold(breakdown, 50);
    expect(over).toHaveLength(1);
    expect(over[0].ats).toBe("greenhouse");
    expect(over[0].failurePct).toBe(100);
  });
});

describe("selectOverThreshold — minSample guard (2026-06-13 regression fix)", () => {
  // A single-company family hits 100% on one transient error. Pre-guard
  // that tripped exit 1 nightly and (via the workflow's if:success gate)
  // skipped extraction for every newly-ingested job. The minSample floor
  // stops the percentage gate from firing below a meaningful denominator.
  it("does NOT trip a 1/1 single-company family (iai) at minSample=5", () => {
    const breakdown = computePerAtsBreakdown([fail("iai")]);
    expect(breakdown[0].failurePct).toBe(100); // still computed/visible
    expect(selectOverThreshold(breakdown, 50, 5)).toEqual([]);
  });

  it("the exact failed-run shape: iai@100% (1 co) is silenced, real corpus stays green", () => {
    const results: CompanyResultLike[] = [];
    results.push(fail("iai")); // 1/1 = 100% — the false alarm
    for (let i = 0; i < 176; i++) results.push(ok("greenhouse"));
    for (let i = 0; i < 203; i++) results.push(ok("comeet"));
    results.push(ok("amazon_jobs")); // singleton, healthy
    const breakdown = computePerAtsBreakdown(results);
    expect(selectOverThreshold(breakdown, 50, 5)).toEqual([]); // no exit 1
  });

  it("STILL trips a genuine large-family outage at minSample=5 (preserves #308 intent)", () => {
    const results: CompanyResultLike[] = [];
    for (let i = 0; i < 176; i++) results.push(fail("greenhouse")); // dark
    for (let i = 0; i < 200; i++) results.push(ok("comeet"));
    const over = selectOverThreshold(computePerAtsBreakdown(results), 50, 5);
    expect(over.map((b) => b.ats)).toEqual(["greenhouse"]);
  });

  it("does not trip a small family at the boundary (4 < minSample 5)", () => {
    const breakdown = computePerAtsBreakdown([
      fail("tiny"),
      fail("tiny"),
      fail("tiny"),
      fail("tiny"), // 4/4 = 100%
    ]);
    expect(selectOverThreshold(breakdown, 50, 5)).toEqual([]);
    // ...but a 5th failing company clears the floor and trips.
    const five = computePerAtsBreakdown([
      fail("tiny"),
      fail("tiny"),
      fail("tiny"),
      fail("tiny"),
      fail("tiny"),
    ]);
    expect(selectOverThreshold(five, 50, 5).map((b) => b.ats)).toEqual([
      "tiny",
    ]);
  });

  it("defaults minSample=1 — unchanged behavior for callers that omit it", () => {
    const breakdown = computePerAtsBreakdown([fail("iai")]);
    expect(selectOverThreshold(breakdown, 50).map((b) => b.ats)).toEqual([
      "iai",
    ]);
  });
});

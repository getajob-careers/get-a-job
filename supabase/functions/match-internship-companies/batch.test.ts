import { describe, it, expect } from "vitest";
import { chunk } from "./batch.ts";

describe("chunk - internship matcher batch splitting", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => i);

  it("splits 25 into [10, 10, 5]", () => {
    expect(chunk(ids(25), 10).map((b) => b.length)).toEqual([10, 10, 5]);
  });

  it("splits a full 30 into [10, 10, 10]", () => {
    expect(chunk(ids(30), 10).map((b) => b.length)).toEqual([10, 10, 10]);
  });

  it("returns a single short batch when the pool is smaller than the size", () => {
    expect(chunk(ids(5), 10).map((b) => b.length)).toEqual([5]);
  });

  it("returns no batches for an empty pool", () => {
    expect(chunk([], 10)).toEqual([]);
  });

  it("preserves order and every element across batches", () => {
    expect(chunk(ids(25), 10).flat()).toEqual(ids(25));
  });
});

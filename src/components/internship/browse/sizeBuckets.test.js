import { describe, it, expect } from "vitest";
import { SIZE_BUCKETS, bucketsForRaw, companyMatchesSizeBucket } from "./sizeBuckets";

describe("bucketsForRaw", () => {
  it("returns [] for null / empty / nonsense", () => {
    expect(bucketsForRaw(null)).toEqual([]);
    expect(bucketsForRaw("")).toEqual([]);
    expect(bucketsForRaw("unknown")).toEqual([]);
  });

  it("'50-100' overlaps 1-50 and 51-200", () => {
    expect(bucketsForRaw("50-100")).toEqual(["1-50", "51-200"]);
  });

  it("'50-200' overlaps 1-50 and 51-200", () => {
    expect(bucketsForRaw("50-200")).toEqual(["1-50", "51-200"]);
  });

  it("'200-500' overlaps 51-200 and 201-500", () => {
    expect(bucketsForRaw("200-500")).toEqual(["51-200", "201-500"]);
  });

  it("'500-1000' overlaps 201-500 and 501-1000", () => {
    expect(bucketsForRaw("500-1000")).toEqual(["201-500", "501-1000"]);
  });

  it("'1000-5000' overlaps 501-1000 and 1000+", () => {
    expect(bucketsForRaw("1000-5000")).toEqual(["501-1000", "1000+"]);
  });

  it("'5000+' overlaps only 1000+", () => {
    expect(bucketsForRaw("5000+")).toEqual(["1000+"]);
  });

  it("'1-50' overlaps only 1-50", () => {
    expect(bucketsForRaw("1-50")).toEqual(["1-50"]);
  });

  it("accepts en-dash separator", () => {
    expect(bucketsForRaw("50–100")).toEqual(["1-50", "51-200"]);
  });
});

describe("companyMatchesSizeBucket", () => {
  it("returns true when no bucket filter is active", () => {
    expect(companyMatchesSizeBucket(null, null)).toBe(true);
    expect(companyMatchesSizeBucket("50-100", null)).toBe(true);
  });

  it("matches overlapping bucket", () => {
    expect(companyMatchesSizeBucket("50-100", "51-200")).toBe(true);
    expect(companyMatchesSizeBucket("50-100", "1-50")).toBe(true);
  });

  it("rejects non-overlapping bucket", () => {
    expect(companyMatchesSizeBucket("1-50", "201-500")).toBe(false);
    expect(companyMatchesSizeBucket("5000+", "1-50")).toBe(false);
  });

  it("null raw never matches any bucket filter", () => {
    expect(companyMatchesSizeBucket(null, "1-50")).toBe(false);
  });
});

describe("SIZE_BUCKETS", () => {
  it("declares 5 buckets in ascending order", () => {
    expect(SIZE_BUCKETS).toHaveLength(5);
    for (let i = 0; i + 1 < SIZE_BUCKETS.length; i++) {
      expect(SIZE_BUCKETS[i].lo).toBeLessThan(SIZE_BUCKETS[i + 1].lo);
    }
  });
});

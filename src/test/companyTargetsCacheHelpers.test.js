import { describe, it, expect } from "vitest";
import { filterOutTarget } from "@/lib/companyTargetsCacheHelpers";

describe("filterOutTarget", () => {
  const rows = [
    { id: "a", status: "exploring" },
    { id: "b", status: "outreach_sent" },
    { id: "c", status: "interview" },
  ];

  it("removes the target with the matching id", () => {
    const out = filterOutTarget(rows, "b");
    expect(out).toEqual([
      { id: "a", status: "exploring" },
      { id: "c", status: "interview" },
    ]);
  });

  it("returns the array unchanged when no id matches", () => {
    const out = filterOutTarget(rows, "z");
    expect(out).toEqual(rows);
  });

  it("returns prev unchanged when prev is undefined (cache miss)", () => {
    expect(filterOutTarget(undefined, "a")).toBeUndefined();
  });

  it("returns prev unchanged when prev is null", () => {
    expect(filterOutTarget(null, "a")).toBeNull();
  });

  it("returns prev unchanged when prev is a non-array object", () => {
    const obj = { not: "an array" };
    expect(filterOutTarget(obj, "a")).toBe(obj);
  });

  it("returns prev unchanged when targetId is empty/falsy", () => {
    expect(filterOutTarget(rows, "")).toBe(rows);
    expect(filterOutTarget(rows, null)).toBe(rows);
    expect(filterOutTarget(rows, undefined)).toBe(rows);
  });

  it("returns an empty array when the only row is removed", () => {
    expect(filterOutTarget([{ id: "a" }], "a")).toEqual([]);
  });

  it("tolerates rows without an id field", () => {
    const mixed = [{ id: "a" }, { name: "no id" }, { id: "b" }];
    expect(filterOutTarget(mixed, "a")).toEqual([{ name: "no id" }, { id: "b" }]);
  });
});

// Locks the two contracts behind the "disappearing Track 1 jobs" fix:
//   1. the career_jobs cache key includes EVERY queryFn input — crucially
//      work_type (the bug: p_work_types used in the queryFn but absent from
//      the key), sorted so order-only changes don't bust the cache;
//   2. the enabled gate requires jobsInputsReady (profile + experiences +
//      educations settled) so the query never fires under a half-loaded
//      early_career seniority filter.

import { describe, it, expect } from "vitest";
import {
  careerJobsQueryKey,
  careerJobsEnabled,
  workTypesKeyPart,
} from "../lib/careerJobsQuery";

const UID = "u-1";

describe("careerJobsQueryKey", () => {
  const base = {
    userId: UID,
    selectedTrack: "track_1",
    titles: ["Product Manager", "Product Ops"],
    seniorityFilter: ["entry", "mid"],
    workType: ["On-site", "Hybrid"],
  };

  it("includes work_type in the key (the missing-dependency bug)", () => {
    const key = careerJobsQueryKey(base);
    // last element is the work_types part
    expect(key[key.length - 1]).toBe("Hybrid,On-site"); // sorted
    expect(key).toEqual([
      "career_jobs",
      UID,
      "track_1",
      "Product Manager|Product Ops",
      "entry,mid",
      "Hybrid,On-site",
    ]);
  });

  it("work_type ordering does NOT change the key (sorted join)", () => {
    const a = careerJobsQueryKey({ ...base, workType: ["On-site", "Hybrid"] });
    const b = careerJobsQueryKey({ ...base, workType: ["Hybrid", "On-site"] });
    expect(a).toEqual(b);
  });

  it("a work_type CHANGE busts the key (so a later edit refetches)", () => {
    const a = careerJobsQueryKey({ ...base, workType: ["On-site", "Hybrid"] });
    const b = careerJobsQueryKey({ ...base, workType: ["Remote"] });
    expect(a).not.toEqual(b);
  });

  it("a seniorityFilter change busts the key (early_career → mid_career)", () => {
    const a = careerJobsQueryKey({
      ...base,
      seniorityFilter: ["entry", "mid"],
    });
    const b = careerJobsQueryKey({
      ...base,
      seniorityFilter: ["entry", "mid", "senior"],
    });
    expect(a).not.toEqual(b);
  });

  it("handles missing / non-array work_type as an empty part", () => {
    expect(workTypesKeyPart(undefined)).toBe("");
    expect(workTypesKeyPart(null)).toBe("");
    expect(workTypesKeyPart("On-site")).toBe(""); // non-array → empty
    expect(careerJobsQueryKey({ ...base, workType: undefined }).at(-1)).toBe(
      "",
    );
  });
});

describe("careerJobsEnabled — gate on settled inputs", () => {
  it("false until jobsInputsReady (profile+experiences+educations settled)", () => {
    expect(
      careerJobsEnabled({
        userId: UID,
        rolesLength: 5,
        jobsInputsReady: false,
      }),
    ).toBe(false);
  });

  it("false with no user or no roles even when inputs ready", () => {
    expect(
      careerJobsEnabled({
        userId: null,
        rolesLength: 5,
        jobsInputsReady: true,
      }),
    ).toBe(false);
    expect(
      careerJobsEnabled({ userId: UID, rolesLength: 0, jobsInputsReady: true }),
    ).toBe(false);
  });

  it("true only when user + roles + inputs are all ready", () => {
    expect(
      careerJobsEnabled({ userId: UID, rolesLength: 5, jobsInputsReady: true }),
    ).toBe(true);
  });
});

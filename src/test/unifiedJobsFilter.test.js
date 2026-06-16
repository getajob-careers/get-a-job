// Locks the unified-feed filter contracts (PR: unified-jobs-filters-1,
// seniority + work-type). Mirrors careerJobsQuery.test.js:
//   1. the fetch key includes every value the unified fetch passes to the
//      RPC, so a filter change re-fetches and order-only noise doesn't bust;
//   2. work-type toggle ↔ p_work_types mapping (two honest states);
//   3. seniority effective-set + toggle helpers;
//   4. dedupe belt under an active filter (re-export of careerJobsQuery's).

import { describe, it, expect } from "vitest";
import {
  unifiedFeedKey,
  defaultWorkTypeMode,
  workTypeModeToParam,
  effectiveSeniorities,
  toggleSeniority,
  dedupeJobsById,
  WORK_TYPE_REMOTE_OK,
  WORK_TYPE_ONSITE_ONLY,
} from "../lib/unifiedJobsFilter";

const UID = "u-1";

describe("unifiedFeedKey — filter state busts the fetch key", () => {
  const base = {
    userId: UID,
    titles: ["Associate Product Manager", "Sales Associate"],
    seniorities: ["entry", "mid", "senior"],
    workTypeMode: WORK_TYPE_REMOTE_OK,
  };

  it("includes seniority + work-type so the fetch re-runs on change", () => {
    expect(unifiedFeedKey(base)).toEqual([
      "unified_jobs",
      UID,
      "Associate Product Manager|Sales Associate",
      "entry,mid,senior",
      "remote_ok",
    ]);
  });

  it("seniority ordering does NOT bust the key (sorted join)", () => {
    const a = unifiedFeedKey({
      ...base,
      seniorities: ["entry", "mid", "senior"],
    });
    const b = unifiedFeedKey({
      ...base,
      seniorities: ["senior", "entry", "mid"],
    });
    expect(a).toEqual(b);
  });

  it("a seniority CHANGE busts the key", () => {
    const a = unifiedFeedKey({
      ...base,
      seniorities: ["entry", "mid", "senior"],
    });
    const b = unifiedFeedKey({ ...base, seniorities: ["entry", "mid"] });
    expect(a).not.toEqual(b);
  });

  it("a work-type CHANGE busts the key", () => {
    const a = unifiedFeedKey({ ...base, workTypeMode: WORK_TYPE_REMOTE_OK });
    const b = unifiedFeedKey({ ...base, workTypeMode: WORK_TYPE_ONSITE_ONLY });
    expect(a).not.toEqual(b);
  });
});

describe("work-type toggle ↔ p_work_types", () => {
  it("default is remote_ok when profile admits remote (Hybrid/Flexible/Remote or empty)", () => {
    expect(defaultWorkTypeMode(["Hybrid", "On-site", "Full-time"])).toBe(
      WORK_TYPE_REMOTE_OK,
    );
    expect(defaultWorkTypeMode(["Flexible"])).toBe(WORK_TYPE_REMOTE_OK);
    expect(defaultWorkTypeMode([])).toBe(WORK_TYPE_REMOTE_OK);
    expect(defaultWorkTypeMode(null)).toBe(WORK_TYPE_REMOTE_OK);
  });

  it("default is onsite_only when profile is on-site only", () => {
    expect(defaultWorkTypeMode(["On-site"])).toBe(WORK_TYPE_ONSITE_ONLY);
    expect(defaultWorkTypeMode(["On-site", "Full-time"])).toBe(
      WORK_TYPE_ONSITE_ONLY,
    );
  });

  it("remote_ok → null param (admit all); onsite_only → ['On-site'] (RPC drops remote)", () => {
    expect(workTypeModeToParam(WORK_TYPE_REMOTE_OK)).toBeNull();
    expect(workTypeModeToParam(WORK_TYPE_ONSITE_ONLY)).toEqual(["On-site"]);
  });
});

describe("seniority effective-set + toggle", () => {
  const defaults = ["entry", "mid", "senior"];

  it("uses the selection when non-empty", () => {
    expect(effectiveSeniorities(["entry"], defaults)).toEqual(["entry"]);
  });

  it("falls back to defaults when nothing is selected (never blanks the feed)", () => {
    expect(effectiveSeniorities([], defaults)).toEqual(defaults);
    expect(effectiveSeniorities(null, defaults)).toEqual(defaults);
  });

  it("toggle removes a selected value and adds an unselected one", () => {
    expect(toggleSeniority(["entry", "mid", "senior"], "senior")).toEqual([
      "entry",
      "mid",
    ]);
    expect(toggleSeniority(["entry", "mid"], "senior")).toEqual([
      "entry",
      "mid",
      "senior",
    ]);
  });
});

describe("dedupeJobsById — pagination belt under an active filter", () => {
  it("drops a repeated id across appended pages (no duplicate React key)", () => {
    const page1 = [{ id: "a" }, { id: "b" }];
    const page2 = [{ id: "b" }, { id: "c" }]; // 'b' straddles the page boundary
    expect(dedupeJobsById([...page1, ...page2]).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

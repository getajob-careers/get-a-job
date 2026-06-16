// Locks the Tab-2 "Search All Jobs" client-side faceting contracts (PR B):
//   1. facet→predicate mappers (seniority, work-type, track);
//   2. searchFacetsKey busts on any facet change + AND-composition;
//   3. the score→sort→track-filter reducer against fixtures.

import { describe, it, expect } from "vitest";
import {
  matchesSeniority,
  matchesWorkType,
  matchesTrack,
  searchFacetsKey,
  applyFacetsAndRank,
} from "../lib/jobsSearchFacets";

describe("facet → predicate mappers", () => {
  it("seniority: empty/null = no filter; otherwise membership", () => {
    expect(matchesSeniority({ seniority: "entry" }, null)).toBe(true);
    expect(matchesSeniority({ seniority: "entry" }, [])).toBe(true);
    expect(matchesSeniority({ seniority: "entry" }, ["entry", "mid"])).toBe(
      true,
    );
    expect(matchesSeniority({ seniority: "senior" }, ["entry", "mid"])).toBe(
      false,
    );
  });

  it("work-type: onsite_only drops remote; remote_ok/null admit all", () => {
    expect(matchesWorkType({ is_remote: true }, "onsite_only")).toBe(false);
    expect(matchesWorkType({ is_remote: false }, "onsite_only")).toBe(true);
    expect(matchesWorkType({ is_remote: null }, "onsite_only")).toBe(true); // unknown ≠ remote
    expect(matchesWorkType({ is_remote: true }, "remote_ok")).toBe(true);
    expect(matchesWorkType({ is_remote: true }, null)).toBe(true);
  });

  it("track: null = no filter; otherwise scoreJobFit.track match (off-roadmap null drops)", () => {
    expect(matchesTrack({ track: "track_1" }, null)).toBe(true);
    expect(matchesTrack({ track: "track_1" }, "track_1")).toBe(true);
    expect(matchesTrack({ track: "track_3" }, "track_1")).toBe(false);
    expect(matchesTrack({ track: null }, "track_1")).toBe(false); // off-roadmap drops
  });
});

describe("searchFacetsKey — busts on change + AND-composition", () => {
  const base = {
    seniorities: ["entry", "mid"],
    workTypeMode: "remote_ok",
    track: null,
  };

  it("seniority order does NOT bust (sorted)", () => {
    expect(searchFacetsKey({ ...base, seniorities: ["entry", "mid"] })).toBe(
      searchFacetsKey({ ...base, seniorities: ["mid", "entry"] }),
    );
  });

  it("each facet change busts the key (AND-composition — adding a facet changes the key)", () => {
    const k0 = searchFacetsKey(base);
    expect(searchFacetsKey({ ...base, seniorities: ["entry"] })).not.toBe(k0);
    expect(searchFacetsKey({ ...base, workTypeMode: "onsite_only" })).not.toBe(
      k0,
    );
    expect(searchFacetsKey({ ...base, track: "track_1" })).not.toBe(k0);
  });
});

describe("applyFacetsAndRank — score → sort → AND-filter reducer", () => {
  // fixtures: { job, score } where score is the scoreJobFit shape we read.
  // score carries fit_score (the Tab-2 sort key) + attainability_score (the
  // card badge — present but NOT the sort key).
  const mk = (id, seniority, is_remote, track, fit) => ({
    job: { id, seniority, is_remote },
    score: { track, fit_score: fit, attainability_score: 1 - fit },
  });
  const corpus = [
    mk("a", "entry", false, "track_1", 0.4),
    mk("b", "mid", true, "track_2", 0.8),
    mk("c", "entry", true, "track_1", 0.6),
    mk("d", "senior", false, null, 0.9),
  ];

  it("no facets → whole corpus, sorted by fit_score desc (off-domain sinks)", () => {
    const out = applyFacetsAndRank(corpus, {});
    expect(out.map((x) => x.job.id)).toEqual(["d", "b", "c", "a"]);
  });

  it("AND-composes: Entry + On-site + Track 1 → only 'a'", () => {
    const out = applyFacetsAndRank(corpus, {
      seniorities: ["entry"],
      workTypeMode: "onsite_only",
      track: "track_1",
    });
    expect(out.map((x) => x.job.id)).toEqual(["a"]);
  });

  it("track filter drops the null-track (off-roadmap) job even though it ranks highest by fit", () => {
    const out = applyFacetsAndRank(corpus, { track: "track_1" });
    expect(out.map((x) => x.job.id)).toEqual(["c", "a"]); // 'd' (null track) excluded
  });

  it("a tight combination can yield zero (honest-empty upstream)", () => {
    expect(applyFacetsAndRank(corpus, { seniorities: ["lead"] })).toEqual([]);
  });
});

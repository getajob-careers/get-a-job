// Locks the Tab-2 "Search All Jobs" client-side faceting contracts (PR B):
//   1. facet→predicate mappers (seniority, work-type, track);
//   2. searchFacetsKey busts on any facet change + AND-composition;
//   3. the score→sort→track-filter reducer against fixtures.

import { describe, it, expect } from "vitest";
import {
  matchesSeniority,
  matchesWorkType,
  matchesKeyword,
  matchesTrack,
  matchesFamily,
  matchesLocation,
  buildLocationOptions,
  LOCATION_DISTRICT_TAGS,
  searchFacetsKey,
  applyFacetsAndRank,
  orderDefaultMatches,
  selectFeedOrder,
  LOCATION_REGIONS,
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

  it("work-type chips: onsite=is_remote false, remote=is_remote true, both/neither=all", () => {
    // neither selected → all
    expect(matchesWorkType({ is_remote: true }, [])).toBe(true);
    expect(matchesWorkType({ is_remote: false }, null)).toBe(true);
    // both selected → all
    expect(matchesWorkType({ is_remote: true }, ["onsite", "remote"])).toBe(
      true,
    );
    // remote only
    expect(matchesWorkType({ is_remote: true }, ["remote"])).toBe(true);
    expect(matchesWorkType({ is_remote: false }, ["remote"])).toBe(false);
    // onsite only
    expect(matchesWorkType({ is_remote: false }, ["onsite"])).toBe(true);
    expect(matchesWorkType({ is_remote: true }, ["onsite"])).toBe(false);
  });

  it("keyword: case-insensitive substring over title + company; empty = all", () => {
    const job = { title: "Senior Product Manager", company_name: "Wiz" };
    expect(matchesKeyword(job, "")).toBe(true);
    expect(matchesKeyword(job, "  ")).toBe(true);
    expect(matchesKeyword(job, "product")).toBe(true);
    expect(matchesKeyword(job, "WIZ")).toBe(true); // company, case-insensitive
    expect(matchesKeyword(job, "designer")).toBe(false);
  });

  it("track: null = no filter; otherwise scoreJobFit.track match (off-roadmap null drops)", () => {
    expect(matchesTrack({ track: "track_1" }, null)).toBe(true);
    expect(matchesTrack({ track: "track_1" }, "track_1")).toBe(true);
    expect(matchesTrack({ track: "track_3" }, "track_1")).toBe(false);
    expect(matchesTrack({ track: null }, "track_1")).toBe(false); // off-roadmap drops
  });
});

describe("function/family + location predicates (PR C)", () => {
  it("family: null = no filter; otherwise exact; null-family job drops under a selection", () => {
    expect(matchesFamily({ function_family: "Sales" }, null)).toBe(true);
    expect(matchesFamily({ function_family: "Sales" }, "Sales")).toBe(true);
    expect(matchesFamily({ function_family: "Engineering" }, "Sales")).toBe(
      false,
    );
    expect(matchesFamily({ function_family: null }, "Sales")).toBe(false);
  });

  it("location: region admits its cities only; NULL/unmapped location drops under a selection", () => {
    expect(matchesLocation({ location_city: "Herzliya" }, null)).toBe(true); // no filter
    expect(matchesLocation({ location_city: "Herzliya" }, "tlv_center")).toBe(
      true,
    );
    expect(matchesLocation({ location_city: "Haifa" }, "tlv_center")).toBe(
      false,
    );
    expect(matchesLocation({ location_city: null }, "tlv_center")).toBe(false); // NULL drops
    expect(matchesLocation({ location_city: "Atlantis" }, "tlv_center")).toBe(
      false,
    ); // unmapped drops
    expect(matchesLocation({ location_city: "Be'er Sheva" }, "south")).toBe(
      true,
    );
  });

  it("location: a raw CITY key matches exactly (no volume bar); NULL drops", () => {
    expect(matchesLocation({ location_city: "Herzliya" }, "Herzliya")).toBe(
      true,
    );
    expect(matchesLocation({ location_city: "Tel Aviv" }, "Herzliya")).toBe(
      false,
    );
    expect(matchesLocation({ location_city: null }, "Herzliya")).toBe(false);
  });

  it("region city lists are non-empty and apostrophe-exact to the live values", () => {
    expect(LOCATION_REGIONS.tlv_center.cities).toContain("Tel Aviv");
    expect(LOCATION_REGIONS.sharon.cities).toContain("Ra'anana");
    expect(LOCATION_REGIONS.south.cities).toContain("Be'er Sheva");
    for (const r of Object.values(LOCATION_REGIONS))
      expect(r.cities.length).toBeGreaterThan(0);
  });

  it("buildLocationOptions: real cities (district tags excluded) with counts + region sums", () => {
    const corpus = [
      { location_city: "Tel Aviv" },
      { location_city: "Tel Aviv" },
      { location_city: "Herzliya" },
      { location_city: "Tel Aviv District" }, // district tag — excluded from city list
      { location_city: "Haifa" },
      { location_city: null }, // null — excluded
    ];
    const { cities, regions } = buildLocationOptions(corpus);
    // city list: real cities only, no district tags, sorted by count desc
    expect(cities.map((c) => c.key)).toEqual(["Tel Aviv", "Haifa", "Herzliya"]);
    expect(cities.find((c) => c.key === "Tel Aviv").count).toBe(2);
    expect(cities.some((c) => LOCATION_DISTRICT_TAGS.has(c.key))).toBe(false);
    // region sum INCLUDES the district tag (the region filter admits it):
    // TLV & Center = Tel Aviv(2) + Tel Aviv District(1) + Herzliya(1) = 4
    expect(regions.find((r) => r.key === "tlv_center").count).toBe(4);
    expect(regions.find((r) => r.key === "haifa_north").count).toBe(1); // Haifa
  });
});

describe("searchFacetsKey — busts on change + AND-composition", () => {
  const base = {
    seniorities: ["entry", "mid"],
    workTypes: [],
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
    expect(searchFacetsKey({ ...base, workTypes: ["onsite"] })).not.toBe(k0);
    expect(searchFacetsKey({ ...base, track: "track_1" })).not.toBe(k0);
    expect(searchFacetsKey({ ...base, family: "Sales" })).not.toBe(k0);
    expect(searchFacetsKey({ ...base, location: "tlv_center" })).not.toBe(k0);
    expect(searchFacetsKey({ ...base, keyword: "wiz" })).not.toBe(k0);
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

  it("flag-on tie-break: within a fit bucket orders by attainability; fit stays primary across buckets", () => {
    const set = [
      {
        job: { id: "hi-fit" },
        score: { fit_score: 0.9, attainability_score: 0.1 },
      },
      {
        job: { id: "tie-lo-attain" },
        score: { fit_score: 0.7, attainability_score: 0.2 },
      },
      {
        job: { id: "tie-hi-attain" },
        score: { fit_score: 0.702, attainability_score: 0.9 },
      },
    ];
    // 0.700 and 0.702 land in the same 0.005 bucket -> attainability breaks the
    // tie (hi first); 0.9 is a higher bucket so it stays on top regardless.
    const out = applyFacetsAndRank(set, {}, { tieBreakEps: 0.005 }).map(
      (x) => x.job.id,
    );
    expect(out).toEqual(["hi-fit", "tie-hi-attain", "tie-lo-attain"]);
  });

  it("flag-off (no opts): pure fit_score sort, tie-break inactive", () => {
    const set = [
      {
        job: { id: "higher-fit" },
        score: { fit_score: 0.702, attainability_score: 0.2 },
      },
      {
        job: { id: "lower-fit" },
        score: { fit_score: 0.7, attainability_score: 0.9 },
      },
    ];
    expect(applyFacetsAndRank(set, {}).map((x) => x.job.id)).toEqual([
      "higher-fit",
      "lower-fit",
    ]);
  });

  it("AND-composes: Entry + On-site + Track 1 → only 'a'", () => {
    const out = applyFacetsAndRank(corpus, {
      seniorities: ["entry"],
      workTypes: ["onsite"],
      track: "track_1",
    });
    expect(out.map((x) => x.job.id)).toEqual(["a"]);
  });

  it("keyword AND-composes over title + company, fit-ranked", () => {
    const k = (id, title, company, fit) => ({
      job: {
        id,
        title,
        company_name: company,
        seniority: "entry",
        is_remote: false,
      },
      score: { track: "track_1", fit_score: fit, attainability_score: 1 - fit },
    });
    const set = [
      k("x", "Product Manager", "Wiz", 0.5),
      k("y", "Product Designer", "Monday", 0.9), // matches "product" but ranks higher
      k("z", "Data Analyst", "Wiz", 0.7), // company matches "wiz" not "product"
    ];
    expect(
      applyFacetsAndRank(set, { keyword: "product" }).map((j) => j.job.id),
    ).toEqual(["y", "x"]);
    expect(
      applyFacetsAndRank(set, { keyword: "wiz" }).map((j) => j.job.id),
    ).toEqual(["z", "x"]);
  });

  it("track filter drops the null-track (off-roadmap) job even though it ranks highest by fit", () => {
    const out = applyFacetsAndRank(corpus, { track: "track_1" });
    expect(out.map((x) => x.job.id)).toEqual(["c", "a"]); // 'd' (null track) excluded
  });

  it("a tight combination can yield zero (honest-empty upstream)", () => {
    expect(applyFacetsAndRank(corpus, { seniorities: ["lead"] })).toEqual([]);
  });

  it("family + location AND-compose with the rest (PR C)", () => {
    const j = (id, family, city, fit) => ({
      job: {
        id,
        seniority: "entry",
        is_remote: false,
        function_family: family,
        location_city: city,
      },
      score: { track: "track_1", fit_score: fit, attainability_score: 1 - fit },
    });
    const set = [
      j("p", "Sales", "Tel Aviv", 0.5),
      j("q", "Sales", "Haifa", 0.9), // right family, wrong region
      j("r", "Marketing", "Herzliya", 0.8), // wrong family, right region
      j("s", "Sales", null, 0.7), // right family, NULL location → drops under a region
    ];
    const out = applyFacetsAndRank(set, {
      family: "Sales",
      location: "tlv_center",
    });
    expect(out.map((x) => x.job.id)).toEqual(["p"]); // only Sales ∧ TLV&Center ∧ non-null city
  });
});

describe("orderDefaultMatches - flag-on default matches ordering", () => {
  const mk = (id, relevance, rank, fit = 0) => ({
    job: { id },
    score: { relevance_match: relevance, rank_score: rank, fit_score: fit },
  });

  it("drops off-direction jobs; keeps primary/adjacent/unknown", () => {
    const out = orderDefaultMatches([
      mk("p", "primary", 0.5),
      mk("o", "off", 0.99),
      mk("a", "adjacent", 0.4),
      mk("u", "unknown", 0.3),
    ]);
    expect(out.map((x) => x.job.id)).toEqual(["p", "a", "u"]); // 'o' gated out
  });

  it("orders by rank_score DESC, and rank_score is never overridden by tier", () => {
    // an ADJACENT job with a higher rank_score must stay above a PRIMARY one with
    // a lower rank_score (tier is a tiebreaker only - the documented contract).
    const out = orderDefaultMatches([
      mk("primary-lo", "primary", 0.6),
      mk("adjacent-hi", "adjacent", 0.8),
    ]);
    expect(out.map((x) => x.job.id)).toEqual(["adjacent-hi", "primary-lo"]);
  });

  it("relevance tier breaks EXACT rank_score ties (primary above adjacent above unknown)", () => {
    const out = orderDefaultMatches([
      mk("adj", "adjacent", 0.7),
      mk("unk", "unknown", 0.7),
      mk("prim", "primary", 0.7),
    ]);
    expect(out.map((x) => x.job.id)).toEqual(["prim", "adj", "unk"]);
  });

  it("fit_score breaks a tie when rank_score AND tier are equal", () => {
    const out = orderDefaultMatches([
      {
        job: { id: "lo" },
        score: { relevance_match: "primary", rank_score: 0.5, fit_score: 0.3 },
      },
      {
        job: { id: "hi" },
        score: { relevance_match: "primary", rank_score: 0.5, fit_score: 0.9 },
      },
    ]);
    expect(out.map((x) => x.job.id)).toEqual(["hi", "lo"]);
  });

  it("falls back to attainability_score when rank_score is absent", () => {
    const out = orderDefaultMatches([
      {
        job: { id: "a" },
        score: { relevance_match: "primary", attainability_score: 0.4 },
      },
      {
        job: { id: "b" },
        score: { relevance_match: "adjacent", attainability_score: 0.6 },
      },
    ]);
    expect(out.map((x) => x.job.id)).toEqual(["b", "a"]);
  });
});

describe("selectFeedOrder - flag gate (flag-off byte-identical)", () => {
  const ranked = [
    {
      job: { id: "x" },
      score: { relevance_match: "off", rank_score: 0.9, fit_score: 0.9 },
    },
    {
      job: { id: "y" },
      score: { relevance_match: "primary", rank_score: 0.4, fit_score: 0.4 },
    },
  ];
  const byNewest = (r) => [...r].reverse();

  it("flag OFF: returns `ranked` UNTOUCHED (same reference) for every mode/facet combo", () => {
    for (const sortMode of ["best", "newest"]) {
      for (const hasActiveFacets of [true, false]) {
        const out = selectFeedOrder({
          alive: false,
          sortMode,
          hasActiveFacets,
          ranked,
          byNewest,
        });
        expect(out).toBe(ranked); // reference-equal => byte-identical, no reorder, no gate
      }
    }
  });

  it("flag ON, best, NO facet: gates off + rank_score order (orderDefaultMatches)", () => {
    const out = selectFeedOrder({
      alive: true,
      sortMode: "best",
      hasActiveFacets: false,
      ranked,
      byNewest,
    });
    expect(out.map((x) => x.job.id)).toEqual(["y"]); // 'x' (off) gated out
  });

  it("flag ON, best, WITH facet: returns `ranked` unchanged (off-direction stays reachable when searched)", () => {
    const out = selectFeedOrder({
      alive: true,
      sortMode: "best",
      hasActiveFacets: true,
      ranked,
      byNewest,
    });
    expect(out).toBe(ranked);
  });

  it("flag ON, newest: applies byNewest", () => {
    const out = selectFeedOrder({
      alive: true,
      sortMode: "newest",
      hasActiveFacets: false,
      ranked,
      byNewest,
    });
    expect(out.map((x) => x.job.id)).toEqual(["y", "x"]);
  });
});

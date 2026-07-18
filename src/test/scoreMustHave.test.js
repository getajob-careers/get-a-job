// Component 2a: must-have weighting. Locks (a) the must-have core curve's
// ordering (distinctive coverage > generic-only; full match not penalized;
// missing distinctive must-haves penalized), (b) flag-off byte-identity with the
// legacy scorer, (c) that the flag ON de-inflates a lone-generic match on
// attainability_score only (fit_score untouched). Tuning constants are validated
// separately against the pinned label set (docs/eval + the offline harness).
import { describe, it, expect } from "vitest";
import { mustHaveCoreScore, scoreJobFit } from "@/lib/scoreJobFit";

describe("mustHaveCoreScore", () => {
  const set = (...ids) => new Set(ids);

  it("gives full credit when every core is matched and >=2 distinctive", () => {
    // P09 shape: all 4 cores matched, 2 distinctive → must not be penalized.
    const core = [
      "sql",
      "python_development",
      "customer_communication",
      "presentation_skills",
    ];
    expect(
      mustHaveCoreScore(
        core,
        set(
          "sql",
          "python_development",
          "customer_communication",
          "presentation_skills",
        ),
      ),
    ).toBe(1);
  });

  it("hard-floors a lone-generic core match (0 distinctive matched)", () => {
    // core: [analytical_thinking] matched → coverageW 1.0 × evidence(0)=0.15.
    expect(
      mustHaveCoreScore(["analytical_thinking"], set("analytical_thinking")),
    ).toBeCloseTo(0.15, 5);
  });

  it("penalizes a match that misses distinctive must-haves (coverageW)", () => {
    // 1 distinctive of 3 distinctive cores matched → coverageW = 1/3.
    const core = ["sql", "python_development", "data_modeling"];
    expect(mustHaveCoreScore(core, set("sql"))).toBeCloseTo((1 / 3) * 0.85, 5);
  });

  it("ranks full-distinctive > partial-distinctive > generic-only", () => {
    const core = ["sql", "python_development", "data_modeling"];
    const full = mustHaveCoreScore(
      core,
      set("sql", "python_development", "data_modeling"),
    );
    const partial = mustHaveCoreScore(core, set("sql", "python_development"));
    const genericCore = ["stakeholder_management"];
    const generic = mustHaveCoreScore(
      genericCore,
      set("stakeholder_management"),
    );
    expect(full).toBeGreaterThan(partial);
    expect(partial).toBeGreaterThan(generic);
  });
});

describe("scoreJobFit must-have flag", () => {
  const input = {
    profile: {
      skills_canonical: ["analytical_thinking"],
      primary_domain: "data_analytics",
    },
    experiences: [],
    educations: [],
  };
  const loneGenericJob = {
    req_skills_core: ["analytical_thinking"],
    req_skills_nice: [],
    skill_coverage_ratio: 0.5,
    extraction_confidence: 0.8,
    req_seniority: "mid",
    function_family: "Data",
  };

  it("is byte-identical with the flag off (both opts shapes)", () => {
    const legacy = scoreJobFit(input, loneGenericJob);
    const emptyOpts = scoreJobFit(input, loneGenericJob, {});
    const flagsOff = scoreJobFit(input, loneGenericJob, {
      confidenceAware: false,
      mustHave: false,
    });
    expect(emptyOpts.attainability_score).toBe(legacy.attainability_score);
    expect(flagsOff.attainability_score).toBe(legacy.attainability_score);
    expect(flagsOff.fit_score).toBe(legacy.fit_score);
    expect(flagsOff.signals.skill_match_pct).toBe(
      legacy.signals.skill_match_pct,
    );
  });

  it("de-inflates a lone-generic match on attainability, not fit_score", () => {
    const off = scoreJobFit(input, loneGenericJob);
    const on = scoreJobFit(input, loneGenericJob, { mustHave: true });
    expect(on.attainability_score).toBeLessThan(off.attainability_score);
    // fit_score is the Search-tab number and stays flag-independent.
    expect(on.fit_score).toBe(off.fit_score);
    // 2a is a skill-axis reshape; it must not move the direction fields.
    expect(on.relevance_match).toBe(off.relevance_match);
    expect(on.goal_alignment_score).toBe(off.goal_alignment_score);
  });

  it("does not penalize a strong full-distinctive match", () => {
    const strongInput = {
      profile: {
        skills_canonical: [
          "sql",
          "python_development",
          "data_modeling",
          "etl_elt",
        ],
        primary_domain: "data_analytics",
      },
      experiences: [],
      educations: [],
    };
    const strongJob = {
      req_skills_core: [
        "sql",
        "python_development",
        "data_modeling",
        "etl_elt",
      ],
      req_skills_nice: [],
      skill_coverage_ratio: 0.6,
      extraction_confidence: 0.8,
      req_seniority: "mid",
      function_family: "Data",
    };
    const off = scoreJobFit(strongInput, strongJob);
    const on = scoreJobFit(strongInput, strongJob, { mustHave: true });
    // full coverage + 4 distinctive → coreScore == coreRatio == 1.0, no change.
    expect(on.attainability_score).toBe(off.attainability_score);
  });
});

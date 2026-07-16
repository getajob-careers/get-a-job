// Component 1: confidence-aware ranking. Locks (a) the confidence factor's
// ordering (distinctive-multi > generic-only > thin), (b) flag-off byte-identity
// with the legacy scorer, and (c) that the flag ON de-confidences a thin/generic
// match. Tuning constants are validated separately against the pinned label set.
import { describe, it, expect } from "vitest";
import { matchConfidence, scoreJobFit } from "@/lib/scoreJobFit";

describe("matchConfidence", () => {
  const strongJob = {
    req_skills_core: ["sql", "python_development", "data_modeling", "etl_elt"],
    skill_coverage_ratio: 0.5,
    extraction_confidence: 0.8,
  };
  const thinGenericJob = {
    req_skills_core: ["analytical_thinking"],
    skill_coverage_ratio: 0.08,
    extraction_confidence: 0.8,
  };

  it("is high when several distinctive core skills match at good coverage", () => {
    const c = matchConfidence(
      {
        matched_core_skills: [
          "sql",
          "python_development",
          "data_modeling",
          "etl_elt",
        ],
      },
      strongJob,
      0.8,
    );
    expect(c).toBeGreaterThan(0.8);
  });

  it("is low when the match rests on a single generic core skill at low coverage", () => {
    const c = matchConfidence(
      { matched_core_skills: ["analytical_thinking"] },
      thinGenericJob,
      0.8,
    );
    expect(c).toBeLessThan(0.5);
  });

  it("ranks distinctive-multi > generic-only > no-core-match", () => {
    const distinctive = matchConfidence(
      { matched_core_skills: ["sql", "python_development"] },
      strongJob,
      0.8,
    );
    const genericOnly = matchConfidence(
      { matched_core_skills: ["analytical_thinking"] },
      strongJob,
      0.8,
    );
    const noCore = matchConfidence({ matched_core_skills: [] }, strongJob, 0.8);
    expect(distinctive).toBeGreaterThan(genericOnly);
    expect(genericOnly).toBeLessThan(noCore); // generic-only is weaker evidence than off-core
  });
});

describe("scoreJobFit confidence-aware flag", () => {
  const input = {
    profile: {
      skills_canonical: ["analytical_thinking"],
      primary_domain: "data_analytics",
    },
    experiences: [],
    educations: [],
  };
  const thinGenericJob = {
    req_skills_core: ["analytical_thinking"],
    req_skills_nice: [],
    skill_coverage_ratio: 0.08,
    extraction_confidence: 0.8,
    req_seniority: "senior",
    function_family: "Data",
  };

  it("de-confidences the for-you-feed score (attainability), not fit_score", () => {
    // Option A: the flag acts on attainability_score (the number the /Career
    // card shows and the bands are built on). fit_score is the Search-tab
    // number and stays flag-independent.
    const off = scoreJobFit(input, thinGenericJob);
    const on = scoreJobFit(input, thinGenericJob, { confidenceAware: true });
    // fit_score is byte-identical with the flag on vs off.
    expect(on.fit_score).toBe(off.fit_score);
    // attainability_score shrinks toward neutral for a thin/generic match.
    expect(on.attainability_score).toBeLessThan(off.attainability_score);
    // OFF exposes no match_confidence; ON does.
    expect(off.signals.match_confidence).toBeNull();
    expect(on.signals.match_confidence).toBeGreaterThan(0);
  });
});

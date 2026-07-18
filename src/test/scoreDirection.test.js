// Component 2b: direction-aware blend. Locks (a) rank_score == attainability_score
// with the flag off (feed-sort byte-identity), (b) rank_score applies the ×(1+w)
// boost to on-direction (primary) jobs only when the flag is on, (c) non-primary
// jobs are never boosted. w is validated separately on the labels + the live ELI
// Helfy full-candidate test (docs/eval).
import { describe, it, expect } from "vitest";
import { scoreJobFit } from "@/lib/scoreJobFit";

const profile = {
  skills_canonical: [
    "product_strategy",
    "product_discovery",
    "roadmap_prioritization",
  ],
  primary_domain: "product_management",
};
const base = { experiences: [], educations: [] };

// primary: function_family Product maps to the product_management domain.
const primaryJob = {
  req_skills_core: ["product_strategy", "product_discovery"],
  req_skills_nice: [],
  skill_coverage_ratio: 0.5,
  extraction_confidence: 0.8,
  req_seniority: "mid",
  function_family: "Product",
};
// non-primary: no function_family => relevance_match "unknown" (never boosted).
const unknownJob = { ...primaryJob, function_family: null };

describe("scoreJobFit direction blend (rank_score)", () => {
  it("rank_score equals attainability_score with the flag off", () => {
    for (const job of [primaryJob, unknownJob]) {
      const off = scoreJobFit({ profile, ...base }, job);
      expect(off.rank_score).toBe(off.attainability_score);
      const emptyV2 = scoreJobFit({ profile, ...base }, job, {
        confidenceAware: false,
        mustHave: false,
        directionBlend: false,
      });
      expect(emptyV2.rank_score).toBe(emptyV2.attainability_score);
    }
  });

  it("boosts an on-direction (primary) job's rank_score by ~1.25x when on", () => {
    const on = scoreJobFit({ profile, ...base }, primaryJob, {
      directionBlend: true,
    });
    expect(on.relevance_match).toBe("primary");
    expect(on.rank_score).toBeGreaterThan(on.attainability_score);
    expect(on.rank_score).toBeCloseTo(
      Math.round(on.attainability_score * 1.25 * 10000) / 10000,
      6,
    );
  });

  it("does NOT boost a non-primary job", () => {
    const on = scoreJobFit({ profile, ...base }, unknownJob, {
      directionBlend: true,
    });
    expect(on.relevance_match).not.toBe("primary");
    expect(on.rank_score).toBe(on.attainability_score);
  });

  it("honors an explicit w override (harness sweep path)", () => {
    const on = scoreJobFit({ profile, ...base }, primaryJob, {
      directionBlend: { w: 0.1 },
    });
    expect(on.rank_score).toBeCloseTo(
      Math.round(on.attainability_score * 1.1 * 10000) / 10000,
      6,
    );
  });
});

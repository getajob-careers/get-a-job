// Tests for the server-side attainability approximation used by the job-match
// digest. Pins the axis math + the GOOD-tier bar (0.42) so a weight/threshold
// change is a deliberate, test-visible edit. This is the piece Eli validates
// against the client scorer; these cases document its behavior.

import { describe, it, expect } from "vitest";
import { scoreAttainabilityLite, GOOD_TIER_BAR } from "./attainability-lite";

describe("attainability-lite", () => {
  it("exposes the GOOD-tier bar at 0.42", () => {
    expect(GOOD_TIER_BAR).toBe(0.42);
  });

  it("perfect fit → strong (1.0)", () => {
    const r = scoreAttainabilityLite(
      { skills_canonical: ["react", "sql"], qualification_level: "senior", education_level: "master" },
      { req_skills_must_have: ["react", "sql"], req_years_min: 3, req_seniority: "mid", req_education_levels: ["bachelor"] },
    );
    expect(r.score).toBe(1);
    expect(r.band).toBe("strong");
    expect(r.skillCoverage).toBe(1);
  });

  it("zero skill overlap but full non-skill fit → GOOD (0.45), not strong", () => {
    // The three non-skill axes sum to 0.45 (0.22 + 0.115 + 0.115); skill=0.
    const r = scoreAttainabilityLite(
      { skills_canonical: ["excel"], qualification_level: "senior", education_level: "master" },
      { req_skills_must_have: ["react", "sql"], req_years_min: 2, req_seniority: "junior", req_education_levels: ["bachelor"] },
    );
    expect(r.score).toBe(0.45);
    expect(r.band).toBe("good");
    expect(r.score).toBeGreaterThanOrEqual(GOOD_TIER_BAR);
    expect(r.skillCoverage).toBe(0);
  });

  it("weak skill + weak years/edu/seniority → below the bar (stretch)", () => {
    const r = scoreAttainabilityLite(
      { skills_canonical: ["excel"], qualification_level: "mid", education_level: "bachelor" },
      { req_skills_must_have: ["react", "sql", "aws"], req_years_min: 5, req_seniority: "senior", req_education_levels: ["master"] },
    );
    expect(r.score).toBeLessThan(GOOD_TIER_BAR);
    expect(r.band).toBe("stretch");
  });

  it("must-have coverage is the skill axis; half the must-haves → 0.5 coverage", () => {
    const r = scoreAttainabilityLite(
      { skills_canonical: ["react"], qualification_level: "mid", education_level: "bachelor" },
      { req_skills_must_have: ["react", "sql"] },
    );
    expect(r.skillCoverage).toBe(0.5);
  });

  it("falls back to req_skills_core when there are no must-haves", () => {
    const r = scoreAttainabilityLite(
      { skills_canonical: ["react", "sql"] },
      { req_skills_core: ["react", "sql", "aws", "docker"] },
    );
    expect(r.skillCoverage).toBe(0.5); // 2 of 4 core
  });

  it("a job with no stated skill requirements is not a skill barrier (coverage 1)", () => {
    const r = scoreAttainabilityLite({ skills_canonical: [] }, {});
    expect(r.skillCoverage).toBe(1);
  });

  it("is robust to missing/garbage profile + job fields", () => {
    const r = scoreAttainabilityLite(
      { skills_canonical: null as any, qualification_level: null, education_level: null },
      { req_skills_must_have: undefined as any, req_years_min: null, req_seniority: null },
    );
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(["strong", "good", "stretch", "reach"]).toContain(r.band);
  });
});

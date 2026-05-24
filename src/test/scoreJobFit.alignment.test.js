import { describe, it, expect } from "vitest";
import { scoreJobFit } from "../lib/scoreJobFit";

// PR-D additions to scoreJobFit's return shape — exposes goal_alignment_score
// derived from the primary_domain ↔ function_family match. This is the
// signal scoreApplication writes into applications.goal_alignment_score so
// the Tracker UI's 2-axis breakdown works on deterministic rows.

const mkJob = (overrides = {}) => ({
  req_skills_core: [],
  req_skills_nice: [],
  req_years_min: null,
  req_education_levels: [],
  req_education_strict: false,
  req_seniority: null,
  function_family: null,
  extraction_confidence: 0.8,
  ...overrides,
});

describe("scoreJobFit — goal_alignment_score", () => {
  it("returns 1.0 when primary_domain maps to job.function_family", () => {
    const profile = { skills_canonical: [], primary_domain: "product" };
    const job = mkJob({ function_family: "Product" });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.goal_alignment_score).toBe(1.0);
  });

  it("returns 0.35 when domain is set but mismatches the function_family", () => {
    const profile = { skills_canonical: [], primary_domain: "engineering" };
    const job = mkJob({ function_family: "Sales" });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.goal_alignment_score).toBe(0.35);
  });

  it("returns null when the job has no function_family", () => {
    const profile = { skills_canonical: [], primary_domain: "product" };
    const job = mkJob({ function_family: null });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.goal_alignment_score).toBeNull();
  });

  it("returns null when the user has no primary_domain set", () => {
    const profile = { skills_canonical: [], primary_domain: null };
    const job = mkJob({ function_family: "Product" });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.goal_alignment_score).toBeNull();
  });

  it("returns null when domain doesn't appear in DOMAIN_TO_FAMILIES at all", () => {
    const profile = { skills_canonical: [], primary_domain: "totally_made_up" };
    const job = mkJob({ function_family: "Product" });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.goal_alignment_score).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { scoreJobFit } from "../lib/scoreJobFit";

// Helpers for building test fixtures concisely.
const mkProfile = (overrides = {}) => ({
  skills_canonical: [],
  qualification_level: null,
  primary_domain: null,
  ...overrides,
});
const mkExp = (start, end = null) => ({
  type: "full_time",
  start_date: String(start),
  end_date: end ? String(end) : null,
  title: "Engineer",
});
const mkEdu = (degree_level = "bachelors") => ({ degree_level });
const mkJob = (overrides = {}) => ({
  req_skills_core: [],
  req_skills_nice: [],
  req_years_min: null,
  req_years_max: null,
  req_education_levels: [],
  req_education_strict: false,
  req_seniority: null,
  function_family: null,
  extraction_confidence: 0.8,
  ...overrides,
});

describe("scoreJobFit — skill axis", () => {
  it("returns full skill credit on full overlap", () => {
    const profile = mkProfile({ skills_canonical: ["python_data", "sql"] });
    const job = mkJob({ req_skills_core: ["python_data", "sql"] });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.signals.skill_match_pct).toBe(100);
    expect(r.signals.missing_core_skills).toEqual([]);
  });

  it("partial credit when half the core skills match", () => {
    const profile = mkProfile({ skills_canonical: ["python_data"] });
    const job = mkJob({ req_skills_core: ["python_data", "sql"] });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.signals.skill_match_pct).toBe(50);
    expect(r.signals.missing_core_skills).toEqual(["sql"]);
  });

  it("weights core 2x vs nice — high core + low nice still scores well", () => {
    const profile = mkProfile({ skills_canonical: ["python_data", "sql"] });
    const job = mkJob({
      req_skills_core: ["python_data", "sql"],
      req_skills_nice: ["go", "rust", "kotlin"],  // 0/3 nice
    });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    // skill = (1.0 * 2 + 0) / 3 = 0.667
    expect(r.signals.skill_match_pct).toBe(100);  // core %
    expect(r.fit_score).toBeGreaterThan(0.4);
  });

  it("neutral skill score when JD lists zero requirements", () => {
    const profile = mkProfile({ skills_canonical: ["python_data"] });
    const job = mkJob({ req_skills_core: [], req_skills_nice: [] });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.signals.skill_match_pct).toBeNull();
  });
});

describe("scoreJobFit — years axis", () => {
  it("full credit when user_years in range", () => {
    const profile = mkProfile();
    const exps = [mkExp(2020, 2024)];  // 4 yrs
    const job = mkJob({ req_years_min: 3, req_years_max: 5 });
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.signals.years_status).toBe("in_range");
  });

  it("penalty when below req_years_min", () => {
    const profile = mkProfile();
    const exps = [mkExp(2024, 2025)];  // 1 yr
    const job = mkJob({ req_years_min: 5 });
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.signals.years_status).toBe("below");
    expect(r.fit_score).toBeLessThan(0.5);
  });

  it("gentler score when overqualified (above max + 2)", () => {
    const profile = mkProfile();
    const exps = [mkExp(2010, 2025)];  // 15 yrs
    const job = mkJob({ req_years_min: 2, req_years_max: 4 });
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.signals.years_status).toBe("above_max");
  });
});

describe("scoreJobFit — education axis", () => {
  it("full credit when degree meets requirement", () => {
    const profile = mkProfile();
    const eds = [mkEdu("bachelors")];
    const job = mkJob({ req_education_levels: ["bachelors"] });
    const r = scoreJobFit({ profile, experiences: [], educations: eds }, job);
    expect(r.signals.education_match).toBe("met");
  });

  it("heavy penalty when req_education_strict and degree missing", () => {
    const profile = mkProfile();
    const eds = [];  // no degree
    const job = mkJob({
      req_education_levels: ["bachelors"],
      req_education_strict: true,
    });
    const r = scoreJobFit({ profile, experiences: [], educations: eds }, job);
    expect(r.signals.education_match).toBe("gap_strict");
    expect(r.fit_score).toBeLessThan(0.5);
  });

  it("equivalent experience softens non-strict gap", () => {
    const profile = mkProfile({ qualification_level: "equivalent_experience" });
    const eds = [];  // no degree
    const job = mkJob({
      req_education_levels: ["bachelors"],
      req_education_strict: false,
    });
    const r = scoreJobFit({ profile, experiences: [], educations: eds }, job);
    expect(r.signals.education_match).toBe("equivalent");
  });
});

describe("scoreJobFit — seniority axis + track hard-cap", () => {
  it("caps to track_3 when role is above stage ceiling", () => {
    const profile = mkProfile({ skills_canonical: ["python_data", "sql"] });
    const exps = [];  // 0 yrs → early_career → ceiling = Entry_Mid (rank 1)
    const job = mkJob({
      req_skills_core: ["python_data", "sql"],
      req_seniority: "Senior",  // rank 3 → above ceiling
    });
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.signals.seniority_match).toBe("above_ceiling");
    expect(r.track).toBe("track_3");
  });

  it("in-range seniority yields full credit", () => {
    const profile = mkProfile();
    const exps = [];  // early_career
    const job = mkJob({ req_seniority: "Entry" });
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.signals.seniority_match).toBe("in_range");
  });

  // Stretch routing — added 2026-06-03 (jobs-seniority-track-fix).
  // When req_seniority sits AT the user's STAGE_T1_CEILING (the canonical
  // case is Mid-Level + Senior role, where Senior=3 and mid ceiling=3),
  // the seniority axis alone weighs only 10% of fit_score, so a strong
  // skill match would otherwise land the role in track_1 — contradicting
  // Roadmap's track_3 placement for the same role title. We route by
  // goal alignment: on-goal stretch → track_3 (aspirational growth),
  // off-goal stretch → track_2 (qualified-but-off-path detour).

  it("mid_career + on-goal Senior SWE → track_3 (stretch, family matches domain)", () => {
    const profile = mkProfile({
      skills_canonical: ["python_data", "sql", "data_analysis"],
      primary_domain: "engineering",
    });
    const exps = [mkExp(2021, 2025)];  // 4 yrs → mid_career, ceiling = 3
    const eds = [mkEdu("bachelors")];
    const job = mkJob({
      req_skills_core: ["python_data", "sql"],
      req_skills_nice: ["data_analysis"],
      req_education_levels: ["bachelors"],
      req_seniority: "Senior",       // rank 3 === mid ceiling → "stretch"
      function_family: "Engineering",  // matches primary_domain "engineering"
    });
    const r = scoreJobFit({ profile, experiences: exps, educations: eds }, job);
    expect(r.signals.seniority_match).toBe("stretch");
    expect(r.signals.function_family_match).toBe(true);
    expect(r.track).toBe("track_3");
  });

  it("mid_career + off-goal Senior role → track_2 (stretch, off-family)", () => {
    const profile = mkProfile({
      skills_canonical: ["python_data", "sql"],
      primary_domain: "engineering",
    });
    const exps = [mkExp(2021, 2025)];
    const job = mkJob({
      req_skills_core: ["python_data", "sql"],
      req_seniority: "Senior",
      function_family: "Sales",  // off-family relative to engineering domain
    });
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.signals.seniority_match).toBe("stretch");
    expect(r.signals.function_family_match).toBe(false);
    expect(r.track).toBe("track_2");
  });

  it("mid_career + Senior role with unknown function_family → track_2 (stretch, alignment unknown)", () => {
    const profile = mkProfile({
      skills_canonical: ["python_data", "sql"],
      primary_domain: "engineering",
    });
    const exps = [mkExp(2021, 2025)];
    const job = mkJob({
      req_skills_core: ["python_data", "sql"],
      req_seniority: "Senior",
      function_family: null,       // unknown family — alignment unknown
    });
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.signals.seniority_match).toBe("stretch");
    expect(r.track).toBe("track_2");
  });

  it("mid_career + entry-tagged role is eligible for track_1 (Junior SWE flow)", () => {
    // Isaac's "no Junior SWE jobs" regression guard: a Mid-Level user
    // hitting a strong-fit Entry-tagged Junior SWE job should still be
    // able to land in track_1. Composite must clear 0.55 with the
    // standard fit_only thresholds.
    const profile = mkProfile({
      skills_canonical: ["python_data", "sql", "data_analysis"],
      primary_domain: "engineering",
    });
    const exps = [mkExp(2021, 2025)];  // 4 yrs → mid_career
    const eds = [mkEdu("bachelors")];
    const job = mkJob({
      req_skills_core: ["python_data", "sql"],
      req_skills_nice: ["data_analysis"],
      req_years_min: 1,
      req_education_levels: ["bachelors"],
      req_seniority: "Entry",          // rank 0, below mid ceiling → in_range
      function_family: "Engineering",
    });
    const r = scoreJobFit({ profile, experiences: exps, educations: eds }, job);
    expect(r.signals.seniority_match).toBe("in_range");
    expect(r.track).toBe("track_1");
  });
});

describe("scoreJobFit — function family", () => {
  it("bonus when primary_domain matches function_family", () => {
    const profile = mkProfile({ primary_domain: "product" });
    const job = mkJob({ function_family: "Product" });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.signals.function_family_match).toBe(true);
  });

  it("penalty when off-family", () => {
    const profile = mkProfile({ primary_domain: "engineering" });
    const job = mkJob({ function_family: "Sales" });
    const r = scoreJobFit({ profile, experiences: [], educations: [] }, job);
    expect(r.signals.function_family_match).toBe(false);
  });
});

describe("scoreJobFit — composite + extraction confidence", () => {
  it("track_1 emerges from strong overall fit", () => {
    const profile = mkProfile({
      skills_canonical: ["python_data", "sql", "data_analysis"],
      primary_domain: "data",
    });
    const exps = [mkExp(2022, 2025)];  // 3 yrs
    const eds = [mkEdu("bachelors")];
    const job = mkJob({
      req_skills_core: ["python_data", "sql"],
      req_skills_nice: ["data_analysis"],
      req_years_min: 2,
      req_education_levels: ["bachelors"],
      req_seniority: "Mid",
      function_family: "Data",
    });
    const r = scoreJobFit({ profile, experiences: exps, educations: eds }, job);
    // Mid (rank 2) > early_career ceiling (1) → above_ceiling → track_3 by cap.
    // Use mid_career stage instead for this assertion.
    // Re-stage as mid by adding 5 more years.
    const exps2 = [mkExp(2017, 2025)];  // 8 yrs → senior_career
    const r2 = scoreJobFit({ profile, experiences: exps2, educations: eds }, job);
    expect(r2.fit_score).toBeGreaterThanOrEqual(0.55);
    expect(r2.track).toBe("track_1");
  });

  it("low extraction_confidence softens the score 10%", () => {
    const profile = mkProfile({ skills_canonical: ["python_data"] });
    const baseJob = mkJob({ req_skills_core: ["python_data"], extraction_confidence: 0.8 });
    const sparseJob = { ...baseJob, extraction_confidence: 0.2 };
    const a = scoreJobFit({ profile, experiences: [], educations: [] }, baseJob);
    const b = scoreJobFit({ profile, experiences: [], educations: [] }, sparseJob);
    expect(b.fit_score).toBeLessThan(a.fit_score);
  });

  it("returns reasoning strings for the UI", () => {
    const profile = mkProfile({ skills_canonical: ["python_data", "sql", "data_analysis"] });
    const exps = [mkExp(2022, 2025)];
    const eds = [mkEdu("bachelors")];
    const job = mkJob({
      req_skills_core: ["python_data", "sql", "data_analysis"],
      req_years_min: 2,
      req_education_levels: ["bachelors"],
    });
    const r = scoreJobFit({ profile, experiences: exps, educations: eds }, job);
    expect(Array.isArray(r.reasoning.strengths)).toBe(true);
    expect(r.reasoning.strengths.length).toBeGreaterThan(0);
  });
});

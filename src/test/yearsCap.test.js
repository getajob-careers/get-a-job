import { describe, it, expect } from "vitest";
import { applyYearsCap } from "../../supabase/functions/_shared/track-scoring-constants.ts";
import { trackFromScores } from "../lib/scoreApplication";
import { scoreJobFit } from "../lib/scoreJobFit";

// PR-H: years hard cap. Recruiters auto-filter on years; a 1y user
// applying to a 5y-required role doesn't survive the ATS regardless of
// skill match. The cap mirrors the seniority ceiling — downgrade-only,
// applied after the fit-based track assignment.

describe("applyYearsCap (helper)", () => {
  it("no-ops when reqYearsMin is null", () => {
    expect(applyYearsCap("track_1", 1, null)).toBe("track_1");
    expect(applyYearsCap("track_2", 0, null)).toBe("track_2");
  });

  it("no-ops when userYears is null/undefined", () => {
    expect(applyYearsCap("track_1", null, 5)).toBe("track_1");
    expect(applyYearsCap("track_1", undefined, 5)).toBe("track_1");
  });

  it("no cap when gap <= 1y", () => {
    expect(applyYearsCap("track_1", 4, 5)).toBe("track_1"); // gap 1
    expect(applyYearsCap("track_1", 5, 5)).toBe("track_1"); // gap 0
    expect(applyYearsCap("track_1", 6, 5)).toBe("track_1"); // gap -1 (overqualified)
  });

  it("caps Track 1 → Track 2 at gap of 2", () => {
    expect(applyYearsCap("track_1", 1, 3)).toBe("track_2");
    expect(applyYearsCap("track_1", 0, 2)).toBe("track_2");
  });

  it("leaves Track 2/3 unchanged at gap of 2 (downgrade-only)", () => {
    expect(applyYearsCap("track_2", 1, 3)).toBe("track_2");
    expect(applyYearsCap("track_3", 1, 3)).toBe("track_3");
  });

  it("caps to Track 3 at gap of 3+", () => {
    expect(applyYearsCap("track_1", 1, 4)).toBe("track_3"); // gap 3
    expect(applyYearsCap("track_1", 0, 5)).toBe("track_3"); // gap 5
    expect(applyYearsCap("track_2", 1, 4)).toBe("track_3"); // T2 → T3
    expect(applyYearsCap("track_3", 1, 4)).toBe("track_3"); // no-op
  });
});

describe("scoreJobFit — years cap integration", () => {
  const mkExp = (start, end = null) => ({
    type: "full_time",
    start_date: String(start),
    end_date: end ? String(end) : null,
    title: "Engineer",
  });

  it("1y user vs 3y req with high skill match → Track 2 (gap 2 cap)", () => {
    const profile = { skills_canonical: ["python_data", "sql"] };
    const exps = [mkExp(2024, 2025)]; // 1y
    const job = {
      req_skills_core: ["python_data", "sql"], // full match
      req_years_min: 3,
      req_years_max: 5,
      req_education_strict: false,
      req_seniority: "Entry_Mid", // within early_career ceiling
      function_family: null,
      extraction_confidence: 0.8,
    };
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.track).toBe("track_2");
  });

  it("1y user vs 5y req → Track 3 (gap 4 cap)", () => {
    const profile = { skills_canonical: ["python_data", "sql"] };
    const exps = [mkExp(2024, 2025)];
    const job = {
      req_skills_core: ["python_data", "sql"],
      req_years_min: 5,
      req_education_strict: false,
      req_seniority: "Entry_Mid",
      function_family: null,
      extraction_confidence: 0.8,
    };
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.track).toBe("track_3");
  });

  it("2y user vs 3y req (gap 1) → no cap, can still be Track 1", () => {
    const profile = { skills_canonical: ["python_data", "sql"] };
    const exps = [mkExp(2023, 2025)]; // 2y
    const job = {
      req_skills_core: ["python_data", "sql"],
      req_years_min: 3,
      req_education_strict: false,
      req_seniority: "Entry_Mid",
      function_family: null,
      extraction_confidence: 0.8,
    };
    const r = scoreJobFit({ profile, experiences: exps, educations: [] }, job);
    expect(r.track).toBe("track_1");
  });
});

describe("trackFromScores — years cap integration", () => {
  it("caps to Track 2 when LLM fit is high but years gap is 2", () => {
    const t = trackFromScores(0.85, 0.85, {
      userStage: "early",
      roleSeniority: "Entry",
      userYears: 1,
      reqYearsMin: 3,
    });
    expect(t).toBe("track_2");
  });

  it("caps to Track 3 when years gap is 3+", () => {
    const t = trackFromScores(0.85, 0.85, {
      userStage: "early",
      roleSeniority: "Entry",
      userYears: 1,
      reqYearsMin: 5,
    });
    expect(t).toBe("track_3");
  });

  it("legacy callers without userYears/reqYearsMin behave as before", () => {
    const t = trackFromScores(0.85, 0.85, {
      userStage: "early",
      roleSeniority: "Entry",
    });
    expect(t).toBe("track_1");
  });
});

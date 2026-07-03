import { describe, it, expect } from "vitest";
import {
  applyYearsCap,
  applySeniorityFloor,
  isBelowSeniorityFloor,
} from "../../supabase/functions/_shared/track-scoring-constants.ts";
import { trackFromScores } from "../lib/scoreApplication";
import { scoreJobFit } from "../lib/scoreJobFit";

// PR-H.2: years hard cap. Recruiters auto-filter on years; a 1y user
// applying to a 5y-required role doesn't survive the ATS regardless of
// skill match. The cap mirrors the seniority ceiling — downgrade-only,
// applied after the fit-based track assignment. (Re-applied after the
// PR-112 TDZ hotfix moved trackFromScore into the shared .ts file.)

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
    expect(applyYearsCap("track_1", 6, 5)).toBe("track_1"); // gap -1
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
    expect(applyYearsCap("track_2", 1, 4)).toBe("track_3");
    expect(applyYearsCap("track_3", 1, 4)).toBe("track_3");
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
    const exps = [mkExp(2024, 2025)];
    const job = {
      req_skills_core: ["python_data", "sql"],
      req_years_min: 3,
      req_years_max: 5,
      req_education_strict: false,
      req_seniority: "Entry_Mid",
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
    const exps = [mkExp(2023, 2025)];
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

// D1 (QA2): symmetric SOFT seniority floor. Shared definition
// (STAGE_T1_FLOOR + applySeniorityFloor + isBelowSeniorityFloor) imported by
// generate-career-analysis (assignTrackWithGoal), scoreApplication
// (trackFromScores), and scoreJobFit — so no path can drift.
describe("seniority floor — shared helpers", () => {
  it("isBelowSeniorityFloor: senior floor=2 flags Entry(0)+Entry_Mid(1), not Mid(2)+", () => {
    expect(isBelowSeniorityFloor(0, "senior")).toBe(true);
    expect(isBelowSeniorityFloor(1, "senior")).toBe(true);
    expect(isBelowSeniorityFloor(2, "senior")).toBe(false);
    expect(isBelowSeniorityFloor(3, "senior")).toBe(false);
  });
  it("isBelowSeniorityFloor: mid floor=0 flags NOTHING — mid pivoters keep junior roles (Isaac's guard)", () => {
    expect(isBelowSeniorityFloor(0, "mid")).toBe(false);
    expect(isBelowSeniorityFloor(1, "mid")).toBe(false);
    expect(isBelowSeniorityFloor(2, "mid")).toBe(false);
  });
  it("isBelowSeniorityFloor: early floor=0 flags NOTHING — students keep interns", () => {
    expect(isBelowSeniorityFloor(0, "early")).toBe(false);
    expect(isBelowSeniorityFloor(1, "early")).toBe(false);
  });
  it("isBelowSeniorityFloor: null rank / unknown stage → false (silent no-op)", () => {
    expect(isBelowSeniorityFloor(null, "senior")).toBe(false);
    expect(isBelowSeniorityFloor(0, undefined)).toBe(false);
    expect(isBelowSeniorityFloor(0, "bogus")).toBe(false);
  });
  it("applySeniorityFloor: soft-demotes too-junior Track 1 → Track 2, never removes", () => {
    expect(applySeniorityFloor("track_1", 0, "senior")).toBe("track_2");
    expect(applySeniorityFloor("track_1", 1, "senior")).toBe("track_2");
  });
  it("applySeniorityFloor: no-op for students, at/above floor, or non-Track-1", () => {
    expect(applySeniorityFloor("track_1", 0, "early")).toBe("track_1"); // student keeps
    expect(applySeniorityFloor("track_1", 0, "mid")).toBe("track_1"); // mid pivoter keeps (Isaac's guard)
    expect(applySeniorityFloor("track_1", 2, "senior")).toBe("track_1"); // Mid at floor stays
    expect(applySeniorityFloor("track_2", 0, "senior")).toBe("track_2"); // already lower
    expect(applySeniorityFloor("track_3", 0, "senior")).toBe("track_3");
  });
});

// The two-sided guard the reviewer required: a junior role VANISHES from Track 1
// for mid/senior AND PERSISTS for early-career students — both asserted so
// neither side can silently regress. Fixture = Marketing Intern (Entry rank 0,
// the 0.92 smoking-gun fit).
describe("seniority floor — two-sided guard (Marketing-Intern fixture, trackFromScores)", () => {
  const intern = { roleSeniority: "Entry" }; // rank 0, high fit
  it("SENIOR user: high-fit intern demotes out of Track 1 → Track 2", () => {
    expect(trackFromScores(0.92, 0.9, { userStage: "senior", ...intern })).toBe(
      "track_2",
    );
  });
  it("MID user (pivoter): KEEPS the junior role in Track 1 — Isaac's guard, senior-only floor", () => {
    expect(trackFromScores(0.92, 0.9, { userStage: "mid", ...intern })).toBe(
      "track_1",
    );
  });
  it("EARLY-career student: same intern STAYS in Track 1 (interns are legit)", () => {
    expect(trackFromScores(0.92, 0.9, { userStage: "early", ...intern })).toBe(
      "track_1",
    );
  });
  it("SENIOR user: a Mid role (at the floor) is NOT demoted — only too-junior demotes", () => {
    expect(
      trackFromScores(0.92, 0.9, { userStage: "senior", roleSeniority: "Mid" }),
    ).toBe("track_1");
  });
});

// Path #3 (Jobs page): the floor is a symmetric axis penalty (below_floor),
// mirroring above_ceiling. Two-sided: penalizes the over-qualified senior, not
// the early-career user.
describe("scoreJobFit — seniority floor (over-qualification, D1)", () => {
  const mkExp = (start, end) => ({
    type: "full_time",
    start_date: String(start),
    end_date: String(end),
    title: "Engineer",
  });
  const entryJob = {
    req_skills_core: ["python_data", "sql"],
    req_seniority: "Entry",
    req_years_min: null,
    req_education_strict: false,
    function_family: null,
    extraction_confidence: 0.8,
  };
  const profile = { skills_canonical: ["python_data", "sql"] };
  it("SENIOR user scores LOWER than an EARLY user on the same too-junior (Entry) job", () => {
    const senior = scoreJobFit(
      { profile, experiences: [mkExp(2008, 2025)], educations: [] },
      entryJob,
    );
    const early = scoreJobFit(
      { profile, experiences: [mkExp(2024, 2025)], educations: [] },
      entryJob,
    );
    expect(senior.fit_score).toBeLessThan(early.fit_score); // below_floor bites for senior, not early
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

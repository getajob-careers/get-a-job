import { describe, it, expect } from "vitest";
import { combinedScore, scoreTier } from "./CompanyDetailDrawer";

describe("combinedScore", () => {
  it("averages fit + career_compound, rounding half-up", () => {
    expect(combinedScore({ fit_score: 80, career_compound_score: 60 })).toBe(70);
    expect(combinedScore({ fit_score: 85, career_compound_score: 55 })).toBe(70);
    expect(combinedScore({ fit_score: 91, career_compound_score: 90 })).toBe(91);
  });

  it("returns null when pitch is null/undefined", () => {
    expect(combinedScore(null)).toBeNull();
    expect(combinedScore(undefined)).toBeNull();
  });

  it("returns null when either score is missing / non-numeric", () => {
    expect(combinedScore({ fit_score: 80 })).toBeNull();
    expect(combinedScore({ career_compound_score: 60 })).toBeNull();
    expect(combinedScore({ fit_score: "85", career_compound_score: 50 })).toBe(68); // Number("85")=85 → (85+50)/2=67.5 → 68
    expect(combinedScore({ fit_score: NaN, career_compound_score: 70 })).toBeNull();
  });

  it("handles edge cases at the score bounds (0, 100)", () => {
    expect(combinedScore({ fit_score: 0, career_compound_score: 0 })).toBe(0);
    expect(combinedScore({ fit_score: 100, career_compound_score: 100 })).toBe(100);
    expect(combinedScore({ fit_score: 100, career_compound_score: 0 })).toBe(50);
  });
});

describe("scoreTier", () => {
  it("matches the documented thresholds: ≥70 strong, 40-69 soft, <40 weak", () => {
    expect(scoreTier(85)).toBe("strong");
    expect(scoreTier(70)).toBe("strong");
    expect(scoreTier(69)).toBe("soft");
    expect(scoreTier(40)).toBe("soft");
    expect(scoreTier(39)).toBe("weak");
    expect(scoreTier(0)).toBe("weak");
  });

  it("returns 'none' for null / NaN", () => {
    expect(scoreTier(null)).toBe("none");
    expect(scoreTier(undefined)).toBe("none");
    expect(scoreTier(NaN)).toBe("none");
  });
});

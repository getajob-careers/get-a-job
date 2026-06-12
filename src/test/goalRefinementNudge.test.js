// Barabi P1 — pins the isVagueGoal predicate that drives the
// GoalRefinementNudge visibility on Home. The whole point of the nudge
// is correctness on the "single-word like 'Engineer'" case — drift here
// would either spam users with the nudge (over-flagging "Senior Product
// Manager") or silently miss the actual vague cases. The predicate is
// pure, no React dependencies — keep it that way.

import { describe, it, expect } from "vitest";
import { isVagueGoal } from "@/components/dashboard/GoalRefinementNudge";

describe("isVagueGoal — vague (true)", () => {
  it("empty string", () => {
    expect(isVagueGoal("")).toBe(true);
  });
  it("null / undefined", () => {
    expect(isVagueGoal(null)).toBe(true);
    expect(isVagueGoal(undefined)).toBe(true);
  });
  it("whitespace only", () => {
    expect(isVagueGoal("   ")).toBe(true);
    expect(isVagueGoal("\t\n ")).toBe(true);
  });
  it("single-word — the regression case Eli flagged", () => {
    expect(isVagueGoal("Engineer")).toBe(true);
    expect(isVagueGoal("Marketing")).toBe(true);
    expect(isVagueGoal("PM")).toBe(true);
    expect(isVagueGoal("CEO")).toBe(true);
  });
  it("single-word with extra whitespace still vague", () => {
    expect(isVagueGoal("  Engineer  ")).toBe(true);
  });
});

describe("isVagueGoal — sharp (false)", () => {
  it("two-word role passes", () => {
    expect(isVagueGoal("Product Manager")).toBe(false);
    expect(isVagueGoal("Data Analyst")).toBe(false);
  });
  it("seniority-qualified role passes", () => {
    expect(isVagueGoal("Senior Product Manager")).toBe(false);
    expect(isVagueGoal("Lead Data Engineer")).toBe(false);
  });
  it("multi-word library titles pass", () => {
    expect(isVagueGoal("Customer Success Manager")).toBe(false);
    expect(isVagueGoal("Director of Engineering")).toBe(false);
  });
  it("hyphenated still treated as one token (acceptable trade-off)", () => {
    // "Hyphenated-Role" → one token after whitespace-split → flagged
    // vague. The library doesn't use hyphenated titles, so this can't
    // false-flag a real pick from StepCareerDirection. Documented to
    // pin behaviour rather than fix.
    expect(isVagueGoal("Hyphenated-Role")).toBe(true);
  });
});

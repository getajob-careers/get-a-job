// Guards the pipeline-card score badge against the 0-1-vs-percent bug that
// made every card read "1%" or "0%" (qualification_score is a 0-1 fraction;
// rendering Math.round() on the raw value lost the ×100). Same class as the
// Career-rail "1%" regression in tasks/lessons.md 2026-06-11.

import { describe, it, expect } from "vitest";
import { pickDisplayScore } from "@/components/tracker/ApplicationsKanban";

describe("pickDisplayScore", () => {
  it("converts a 0-1 qualification_score fraction to a percent", () => {
    expect(pickDisplayScore({ qualification_score: 0.88 })).toBe(88);
    expect(pickDisplayScore({ qualification_score: 0.65 })).toBe(65);
  });

  it("renders a real 0 score as 0, not as a missing value", () => {
    expect(pickDisplayScore({ qualification_score: 0 })).toBe(0);
  });

  it("treats a 1.0 fraction as 100%", () => {
    expect(pickDisplayScore({ qualification_score: 1 })).toBe(100);
  });

  it("falls back to goal_alignment_score when qualification is absent", () => {
    expect(pickDisplayScore({ goal_alignment_score: 0.72 })).toBe(72);
  });

  it("tolerates legacy rows already stored as 0-100", () => {
    expect(pickDisplayScore({ qualification_score: 84 })).toBe(84);
  });

  it("returns null when no score is present", () => {
    expect(pickDisplayScore({})).toBeNull();
    expect(pickDisplayScore({ qualification_score: null })).toBeNull();
  });
});

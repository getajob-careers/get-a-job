// Tests for finalSeniority — Variant B (title-wins for senior+, years
// refines mid). Locked 2026-05-20 after the 18% cache mis-tag audit.
//
// Co-located with the module (Vitest picks up *.test.ts anywhere).

import { describe, it, expect } from "vitest";
import { detectSeniorityFromTitle, finalSeniority } from "./normalize";

describe("detectSeniorityFromTitle", () => {
  it("flags executive titles", () => {
    expect(detectSeniorityFromTitle("VP of Engineering")).toBe("executive");
    expect(detectSeniorityFromTitle("Chief Marketing Officer")).toBe("executive");
    expect(detectSeniorityFromTitle("Head of Product")).toBe("executive");
  });
  it("flags director titles", () => {
    expect(detectSeniorityFromTitle("Director of Customer Success")).toBe("director");
  });
  it("flags lead/principal/staff/architect titles", () => {
    expect(detectSeniorityFromTitle("Lead Engineer")).toBe("lead");
    expect(detectSeniorityFromTitle("Principal Designer")).toBe("lead");
    expect(detectSeniorityFromTitle("Staff Software Engineer")).toBe("lead");
    expect(detectSeniorityFromTitle("Solutions Architect")).toBe("lead");
  });
  it("flags senior titles", () => {
    expect(detectSeniorityFromTitle("Senior Software Engineer")).toBe("senior");
    expect(detectSeniorityFromTitle("Sr. Product Manager")).toBe("senior");
  });
  it("flags entry-level titles", () => {
    expect(detectSeniorityFromTitle("Junior Analyst")).toBe("entry");
    expect(detectSeniorityFromTitle("Marketing Intern")).toBe("entry");
    expect(detectSeniorityFromTitle("Associate Consultant")).toBe("entry");
    expect(detectSeniorityFromTitle("Graduate Engineer")).toBe("entry");
  });
  it("defaults to mid when no keyword matches", () => {
    expect(detectSeniorityFromTitle("Software Engineer")).toBe("mid");
    expect(detectSeniorityFromTitle("Marketing Manager")).toBe("mid");
  });
});

describe("finalSeniority — Variant B", () => {
  describe("title wins for senior/lead/director/executive (no demotion by years)", () => {
    it("'senior' title stays senior even when years.min=3", () => {
      expect(finalSeniority("senior", { min: 3, max: 5 })).toBe("senior");
    });
    it("'senior' title stays senior with no years signal", () => {
      expect(finalSeniority("senior", { min: null, max: null })).toBe("senior");
    });
    it("'lead' title stays lead even when years.min=4", () => {
      expect(finalSeniority("lead", { min: 4, max: 6 })).toBe("lead");
    });
    it("'director' title stays director even when years.min=4 (was unreachable pre-fix)", () => {
      expect(finalSeniority("director", { min: 4, max: null })).toBe("director");
    });
    it("'executive' title stays executive even when years.min=5 (was unreachable pre-fix)", () => {
      expect(finalSeniority("executive", { min: 5, max: null })).toBe("executive");
    });
  });

  describe("title wins for entry", () => {
    it("'entry' title stays entry even when years.min=4", () => {
      expect(finalSeniority("entry", { min: 4, max: null })).toBe("entry");
    });
  });

  describe("'mid' title (no seniority keyword) — years refines", () => {
    it("years.min ≤ 2 → entry", () => {
      expect(finalSeniority("mid", { min: 0, max: null })).toBe("entry");
      expect(finalSeniority("mid", { min: 2, max: null })).toBe("entry");
    });
    it("years.min 3-5 → mid", () => {
      expect(finalSeniority("mid", { min: 3, max: null })).toBe("mid");
      expect(finalSeniority("mid", { min: 5, max: null })).toBe("mid");
    });
    it("years.min 6-8 → senior", () => {
      expect(finalSeniority("mid", { min: 6, max: null })).toBe("senior");
      expect(finalSeniority("mid", { min: 8, max: null })).toBe("senior");
    });
    it("years.min ≥ 9 → lead", () => {
      expect(finalSeniority("mid", { min: 9, max: null })).toBe("lead");
      expect(finalSeniority("mid", { min: 15, max: null })).toBe("lead");
    });
    it("no years signal → mid (the only bucket-default state)", () => {
      expect(finalSeniority("mid", { min: null, max: null })).toBe("mid");
    });
  });

  describe("regression cases from the 2026-05-20 cache audit", () => {
    it("'Senior Software Engineer, 3-5 yrs' → senior (was: mid)", () => {
      expect(finalSeniority(detectSeniorityFromTitle("Senior Software Engineer"), { min: 3, max: 5 })).toBe(
        "senior",
      );
    });
    it("'Director of CS, 4 yrs' → director (was: mid — unreachable)", () => {
      expect(finalSeniority(detectSeniorityFromTitle("Director of Customer Success"), { min: 4, max: null })).toBe(
        "director",
      );
    });
    it("'VP Marketing, 5 yrs' → executive (was: mid — unreachable)", () => {
      expect(finalSeniority(detectSeniorityFromTitle("VP of Marketing"), { min: 5, max: null })).toBe(
        "executive",
      );
    });
    it("untitled 'Software Engineer, 1 yr' → entry (years refines mid bucket)", () => {
      expect(finalSeniority(detectSeniorityFromTitle("Software Engineer"), { min: 1, max: null })).toBe(
        "entry",
      );
    });
    it("untitled 'Software Engineer, 7 yrs' → senior (years refines mid bucket)", () => {
      expect(finalSeniority(detectSeniorityFromTitle("Software Engineer"), { min: 7, max: null })).toBe(
        "senior",
      );
    });
  });
});

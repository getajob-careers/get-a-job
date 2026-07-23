import { describe, it, expect } from "vitest";
import { buildExtractionObservations } from "./extractionObservations";

describe("buildExtractionObservations", () => {
  it("returns [] for empty/undefined input (empty-safe degrade)", () => {
    expect(buildExtractionObservations()).toEqual([]);
    expect(buildExtractionObservations({})).toEqual([]);
    expect(
      buildExtractionObservations({
        experiences: [],
        educations: [],
        certifications: [],
        profileData: {},
      }),
    ).toEqual([]);
  });

  it("does not pad: a lone blank-company experience yields nothing", () => {
    expect(
      buildExtractionObservations({
        experiences: [{ company: "  ", title: "" }],
      }),
    ).toEqual([]);
  });

  it("restates companies, deduped, most-concrete first", () => {
    const obs = buildExtractionObservations({
      experiences: [
        { company: "Guardio" },
        { company: "Wix" },
        { company: "Guardio" },
      ],
    });
    expect(obs[0]).toBe("You listed roles at Guardio and Wix.");
  });

  it("truncates long company lists to 'N more'", () => {
    const obs = buildExtractionObservations({
      experiences: ["A", "B", "C", "D", "E"].map((c) => ({ company: c })),
    });
    expect(obs[0]).toBe("You listed roles at A, B, C and 2 more.");
  });

  it("restates field of study with tense from is_current", () => {
    expect(
      buildExtractionObservations({
        educations: [
          {
            field_of_study: "Business Administration",
            institution: "Reichman",
            is_current: true,
          },
        ],
      })[0],
    ).toBe("You're studying Business Administration at Reichman.");
    expect(
      buildExtractionObservations({
        educations: [
          { field_of_study: "CS", institution: "TAU", is_current: false },
        ],
      })[0],
    ).toBe("You studied CS at TAU.");
  });

  it("restates a managed-people flag as a fact, naming the company", () => {
    const obs = buildExtractionObservations({
      experiences: [{ company: "Wix", managed_people: true }],
    });
    expect(obs).toContain("You've managed people at Wix.");
  });

  it("restates the extractor domain and proof-signal count", () => {
    const obs = buildExtractionObservations({
      profileData: {
        primary_domain: "product management",
        proof_signals: ["a", "b", "c"],
      },
    });
    expect(obs).toContain("Your experience centers on product management.");
    expect(obs).toContain("We spotted 3 concrete achievements in your CV.");
  });

  it("ignores a null domain and a single proof signal", () => {
    const obs = buildExtractionObservations({
      profileData: { primary_domain: null, proof_signals: ["only one"] },
    });
    expect(obs).toEqual([]);
  });

  it("handles certification singular vs plural", () => {
    expect(
      buildExtractionObservations({ certifications: [{ name: "PMP" }] }),
    ).toContain("You hold a certification: PMP.");
    expect(
      buildExtractionObservations({
        certifications: [{ name: "PMP" }, { name: "CFA" }],
      }),
    ).toContain("You hold 2 certifications.");
  });

  it("caps at 3 observations even when more are grounded", () => {
    const obs = buildExtractionObservations({
      experiences: [{ company: "Guardio", managed_people: true }],
      educations: [{ field_of_study: "CS", institution: "TAU" }],
      certifications: [{ name: "PMP" }],
      profileData: { primary_domain: "data", proof_signals: ["a", "b"] },
    });
    expect(obs).toHaveLength(3);
    // most-concrete first
    expect(obs[0]).toBe("You listed roles at Guardio.");
  });
});

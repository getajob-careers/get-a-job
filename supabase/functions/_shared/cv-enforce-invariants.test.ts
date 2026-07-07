// Unit tests for the CV chokepoint (enforceCvInvariants). One case per invariant
// it composes — proper-noun trace-to-master with no-empty restore, first-person /
// voice strip at position 0, numbers flagged-not-removed, English-only Hebrew
// gate — plus the property that makes the whole rollout safe: IDEMPOTENCE
// (f(f(x)) deep-equals f(x)). No network / no live LLM: the Hebrew gate runs its
// deterministic strip when no translate fn is passed.
import { describe, it, expect } from "vitest";
import { enforceCvInvariants } from "./cv-enforce-invariants.ts";
import { cvHasHebrew } from "./cv-translate.ts";

// A minimal master cv_data: the user's own verified content (the trace corpus and
// the no-empty restore source). "Excel" is present; "Salesforce" is NOT — so a
// bullet inventing Salesforce is a fabrication and one inventing Excel is fine.
const MASTER = {
  header: { name: "Dana Cohen" },
  summary: "Analyst focused on reporting.",
  professional_experiences: [
    {
      title: "Analyst",
      company: "Acme",
      dates: "2023 – Present",
      bullets: ["Built dashboards in Excel", "Ran weekly reports"],
    },
  ],
  military_experiences: [],
  volunteering_experiences: [],
  leadership_experiences: [],
  skills: { domain: [], technical: [], tools: [] },
  languages: ["English"],
};

const clone = (o: unknown) => JSON.parse(JSON.stringify(o));

describe("enforceCvInvariants — proper-noun trace-to-master + no-empty restore", () => {
  it("reverts an experience to master when its ONLY bullet invents a company (not dropped/emptied)", async () => {
    const edited = clone(MASTER);
    edited.professional_experiences[0].bullets = [
      "Managed pipelines in Salesforce", // Salesforce absent from master → fabrication
    ];
    const { cv_data, experiencesRestored } = await enforceCvInvariants(
      edited,
      MASTER,
      null,
    );
    // not dropped / not emptied — restored to the master value
    expect(cv_data.professional_experiences[0].bullets).toEqual([
      "Built dashboards in Excel",
      "Ran weekly reports",
    ]);
    expect(experiencesRestored).toBe(1);
  });

  it("drops only the fabricating bullet when others are sourced (experience keeps content)", async () => {
    const edited = clone(MASTER);
    edited.professional_experiences[0].bullets = [
      "Built dashboards in Excel", // Excel is in master → kept
      "Managed pipelines in Salesforce", // Salesforce fabricated → dropped
    ];
    const { cv_data, bulletsEnforced, experiencesRestored } =
      await enforceCvInvariants(edited, MASTER, null);
    expect(cv_data.professional_experiences[0].bullets).toEqual([
      "Built dashboards in Excel",
    ]);
    expect(bulletsEnforced).toBe(1);
    expect(experiencesRestored).toBe(0); // not emptied, so no restore
  });
});

describe("enforceCvInvariants — first-person / voice normalization at position 0", () => {
  it('strips a leading first-person subject: "I led…" → "Led…"', async () => {
    const edited = clone(MASTER);
    edited.professional_experiences[0].bullets = [
      "I led the reporting team",
      "We built weekly reports", // subject stripped + capitalized
    ];
    const { cv_data, bulletsRevoiced } = await enforceCvInvariants(
      edited,
      MASTER,
      null,
    );
    expect(cv_data.professional_experiences[0].bullets).toEqual([
      "Led the reporting team",
      "Built weekly reports",
    ]);
    expect(bulletsRevoiced).toBe(2);
  });
});

describe("enforceCvInvariants — numbers flagged, never removed", () => {
  it("keeps a bullet with an unsourced number and surfaces it in flags", async () => {
    const edited = clone(MASTER);
    edited.professional_experiences[0].bullets = [
      "Grew reporting coverage by 40% last year", // 40% absent from master
    ];
    const { cv_data, flags, bulletsEnforced } = await enforceCvInvariants(
      edited,
      MASTER,
      null,
    );
    // number NOT removed — bullet survives verbatim (modulo voice, which no-ops here)
    expect(cv_data.professional_experiences[0].bullets).toEqual([
      "Grew reporting coverage by 40% last year",
    ]);
    expect(bulletsEnforced).toBe(0);
    // the quant-token regex captures the bare number ("40"); the point is
    // the bullet is flagged (for review) and NOT removed.
    expect(
      flags.some((f) => f.bullet.includes("40%") && f.tokens.length > 0),
    ).toBe(true);
  });
});

describe("enforceCvInvariants — English-only / Hebrew gate", () => {
  it("strips Hebrew deterministically when no translate fn is provided", async () => {
    const edited = clone(MASTER);
    edited.summary = "מנהל מוצר, analyst";
    edited.professional_experiences[0].bullets = ["הובלתי צוות of 8"];
    const { cv_data, hebrew } = await enforceCvInvariants(edited, MASTER, null);
    expect(cvHasHebrew(cv_data)).toBe(false);
    expect(hebrew).toBe("stripped");
    expect(cv_data.summary).toContain("analyst");
  });

  it("reports hebrew=none for an all-English CV", async () => {
    const { hebrew } = await enforceCvInvariants(clone(MASTER), MASTER, null);
    expect(hebrew).toBe("none");
  });
});

describe("enforceCvInvariants — idempotence (the rollout-safety property)", () => {
  it("f(f(x)) deep-equals f(x) across every invariant at once", async () => {
    const messy = clone(MASTER);
    messy.summary = "מנהל, senior analyst"; // Hebrew
    messy.professional_experiences[0].bullets = [
      "I led the reporting team", // voice
      "Managed pipelines in Salesforce", // fabrication → dropped
      "Grew coverage by 40%", // number → flagged, kept
    ];
    const r1 = await enforceCvInvariants(messy, MASTER, null);
    const r2 = await enforceCvInvariants(r1.cv_data, MASTER, null);
    expect(r2.cv_data).toEqual(r1.cv_data);
  });

  it("does not mutate the caller's input object", async () => {
    const edited = clone(MASTER);
    edited.professional_experiences[0].bullets = ["I led the team"];
    const before = JSON.stringify(edited);
    await enforceCvInvariants(edited, MASTER, null);
    expect(JSON.stringify(edited)).toBe(before);
  });
});

import { describe, it, expect } from "vitest";
import { checkCompleteness } from "../../scripts/cv-harness/completeness-gate.mjs";

// Structural completeness: a generated CV must carry every section the source
// populates. This is the probe that would have caught the fan-out regression
// (tailored CVs rendering with no education section).
describe("checkCompleteness — structural completeness gate", () => {
  const source = {
    education: [
      { institution: "Reichman University", honors: ["Dean's List"] },
    ],
    experiences: [{ awards: ["Excellence Award"] }],
    certifications: [{ id: "c1" }],
    projects: [{ id: "p1" }],
  };

  it("FAILS the dropped section (the fan-out regression signature)", () => {
    const cvData = {
      // education intentionally MISSING — the exact regression
      certifications: [{ name: "AWS" }],
      honors_and_awards: ["Dean's List"],
      projects: [{ name: "Thesis" }],
    };
    const rows = checkCompleteness(source, cvData);
    const edu = rows.find((r) => r.section === "education");
    expect(edu).toBeTruthy();
    expect(edu.pass).toBe(false);
    expect(rows.filter((r) => !r.pass)).toHaveLength(1);
  });

  it("PASSES when every source-populated section is present", () => {
    const cvData = {
      education: [{ institution: "Reichman University" }],
      certifications: [{ name: "AWS" }],
      honors_and_awards: ["Dean's List"],
      projects: [{ name: "Thesis" }],
    };
    const rows = checkCompleteness(source, cvData);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.pass)).toBe(true);
  });

  it("allows trimming WITHIN a section (present with fewer entries still passes)", () => {
    const multi = {
      education: [{ institution: "A" }, { institution: "B" }],
      experiences: [],
      certifications: [],
      projects: [],
    };
    const cvData = { education: [{ institution: "A" }] }; // one of two — still present
    const rows = checkCompleteness(multi, cvData);
    expect(rows.find((r) => r.section === "education").pass).toBe(true);
  });

  it("does not expect a section the source lacks (institution-less edu is excluded)", () => {
    const src = {
      education: [{ institution: "  " }],
      experiences: [],
      certifications: [],
      projects: [],
    };
    const rows = checkCompleteness(src, {});
    // institution-less education is intentionally not renderable -> not expected
    expect(rows).toHaveLength(0);
  });
});

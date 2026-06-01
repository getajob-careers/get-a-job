import { describe, it, expect } from "vitest";
import { withUnifiedSkills } from "../lib/unifiedSkills";

describe("withUnifiedSkills — dual-write helper for P1.2", () => {
  it("experience: union of skills_used + tools_used, deduped, sorted, empties dropped", () => {
    const out = withUnifiedSkills(
      {
        title: "AE",
        skills_used: ["Salesforce", "negotiation", ""],
        tools_used: ["Salesforce", "Outreach", null],
      },
      "experience",
    );
    expect(out.skills).toEqual(["Outreach", "Salesforce", "negotiation"]);
    expect(out.title).toBe("AE");
    expect(out.skills_used).toEqual(["Salesforce", "negotiation", ""]);  // legacy preserved
    expect(out.tools_used).toEqual(["Salesforce", "Outreach", null]);
  });

  it("experience: missing arrays default to empty (no crash)", () => {
    const out = withUnifiedSkills({ title: "AE" }, "experience");
    expect(out.skills).toEqual([]);
  });

  it("education: skills_developed → skills", () => {
    const out = withUnifiedSkills(
      { institution: "Reichman", skills_developed: ["Excel", "Statistics", "Excel"] },
      "education",
    );
    expect(out.skills).toEqual(["Excel", "Statistics"]);
  });

  it("project: skills_demonstrated → skills", () => {
    const out = withUnifiedSkills(
      { name: "Capstone", skills_demonstrated: ["Python"] },
      "project",
    );
    expect(out.skills).toEqual(["Python"]);
  });

  it("certification: no legacy column → skills is empty array", () => {
    const out = withUnifiedSkills({ name: "PMP", issuer: "PMI" }, "certification");
    expect(out.skills).toEqual([]);
  });

  it("trims whitespace and drops blank-after-trim entries", () => {
    const out = withUnifiedSkills(
      { skills_used: ["  Excel  ", "  ", "SQL"] },
      "experience",
    );
    expect(out.skills).toEqual(["Excel", "SQL"]);
  });

  it("unknown entity passes payload through unchanged", () => {
    const out = withUnifiedSkills({ foo: "bar" }, "unknown_entity");
    expect(out).toEqual({ foo: "bar" });
  });
});

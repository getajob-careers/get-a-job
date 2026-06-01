import { describe, it, expect } from "vitest";
import { matchRoleToLibrary, suggestSkillsForTitle } from "../lib/roleSkillsLookup";

describe("matchRoleToLibrary — coverage-gap-A additions", () => {
  // Sample from each bucket: alt-title hits + new-row title hits + an
  // unchanged baseline. Catches regressions in 00_role_library.ts edits
  // or the JSON regen.
  const cases = [
    // Newly added alternate_titles
    ["Growth Associate", "growth_analyst", "alternate_title"],
    ["Recruiter", "talent_acquisition_specialist", "alternate_title"],
    ["Product Owner", "product_manager", "alternate_title"],
    ["Onboarding Specialist", "customer_onboarding_specialist", "alternate_title"],
    ["Operations Manager", "operations_analyst", "alternate_title"],
    // New role rows resolve via standardized_title
    ["Customer Success Operations Manager", "customer_success_operations", "title"],
    ["Renewals Manager", "renewals_manager", "title"],
    ["Revenue Operations Manager", "revops_manager", "title"],
  ];

  for (const [title, expectedId, expectedVia] of cases) {
    it(`resolves "${title}" → ${expectedId} (via ${expectedVia})`, () => {
      const m = matchRoleToLibrary(title);
      expect(m).not.toBeNull();
      expect(m.role.id).toBe(expectedId);
      expect(m.via).toBe(expectedVia);
    });
  }
});

describe("suggestSkillsForTitle — new rows return skill suggestions", () => {
  it("returns non-empty skill list for Customer Success Operations Manager", () => {
    const s = suggestSkillsForTitle("Customer Success Operations Manager");
    expect(s).not.toBeNull();
    expect(s.skillIds.length).toBeGreaterThan(0);
    expect(s.skillIds).toContain("revenue_operations");
  });

  it("returns non-empty skill list for Renewals Manager", () => {
    const s = suggestSkillsForTitle("Renewals Manager");
    expect(s).not.toBeNull();
    expect(s.skillIds.length).toBeGreaterThan(0);
    expect(s.skillIds).toContain("renewal_management");
  });

  it("returns non-empty skill list for newly aliased Growth Associate", () => {
    const s = suggestSkillsForTitle("Growth Associate");
    expect(s).not.toBeNull();
    expect(s.skillIds.length).toBeGreaterThan(0);
    expect(s.roleTitle).toBe("Growth Analyst");
  });
});

import { describe, it, expect } from "vitest";
import { matchRoleToLibrary, suggestSkillsForTitle } from "../lib/roleSkillsLookup";
import roleData from "../lib/roleSkillsGenerated.json";

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

// Gap C — 23 source rows were stored as `{skill_id, importance, notes}`
// objects instead of flat strings. The generator + reader silently spread
// the raw objects, producing broken chips downstream. This test locks in
// that the read path emits flat strings for ALL roles, regardless of how
// the source row is shaped.
describe("suggestSkillsForTitle — object-form normalization (Gap C)", () => {
  // 8 target-student roles flagged in tasks/0c-object-form-rows-fix.md
  const STUDENT_FACING = [
    "junior_consultant_analyst",
    "consultant",
    "senior_consultant",
    "consulting_manager",
    "growth_marketing_manager",
    "performance_marketing_manager",
    "solutions_engineer",
    "solutions_engineer_junior",
  ];

  for (const roleId of STUDENT_FACING) {
    it(`${roleId} returns non-empty flat-string skill list`, () => {
      const s = suggestSkillsForTitle(roleId);
      expect(s).not.toBeNull();
      expect(s.skillIds.length).toBeGreaterThan(0);
      for (const id of s.skillIds) {
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
      }
    });
  }

  // Generalized: NO role in the generated mirror should yield non-string
  // skills via suggestSkillsForTitle. Catches any future object-form regression.
  it("every mapped role yields only flat strings via suggestSkillsForTitle", () => {
    const offenders = [];
    for (const role of roleData.roles) {
      const hasMapping =
        (role.core_skills?.length || 0) + (role.secondary_skills?.length || 0) > 0;
      if (!hasMapping) continue;
      const s = suggestSkillsForTitle(role.id);
      if (!s) {
        offenders.push({ role: role.id, reason: "matcher returned null" });
        continue;
      }
      for (const id of s.skillIds) {
        if (typeof id !== "string" || !id) {
          offenders.push({ role: role.id, badEntry: id });
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

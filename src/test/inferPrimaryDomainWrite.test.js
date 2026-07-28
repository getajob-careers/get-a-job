import { describe, it, expect } from "vitest";
import {
  computeInference,
  roleFamilyForId,
} from "@/lib/inferPrimaryDomainWrite";
import { ROLE_LOOKUP } from "@/lib/roleLookup";

// The direction-screen write decision. Exercises the precedence invariant's
// CLIENT half (extraction wins) and the map-or-record behaviour. The SERVER
// half (the null-or-inferred WHERE guard) is enforced in Postgres and covered
// by the migration comment; here we prove we never even attempt a write when a
// CV already produced a domain.
describe("computeInference (direction-screen inference decision)", () => {
  // A real goal-role id whose family maps to a domain, derived from the live
  // mirror so a library trim can't leave a stale hardcoded id.
  const productRole = ROLE_LOOKUP.find((r) => r.role_family === "Product");

  it("resolves a picked role id to its role_family", () => {
    expect(roleFamilyForId(productRole.id)).toBe("Product");
    expect(roleFamilyForId(null)).toBeNull();
    expect(roleFamilyForId("no_such_role_id")).toBeNull();
  });

  it("writes an inferred domain when a mapped goal role is picked and no CV domain exists", () => {
    const { shouldWrite, skippedReason, record } = computeInference({
      goalRoleId: productRole.id,
      situation: "student",
      extractedDomain: null,
    });
    expect(shouldWrite).toBe(true);
    expect(skippedReason).toBeNull();
    expect(record.primary_domain).toBe("product");
    expect(record.source).toBe("goal_family");
    expect(record.inputs.goalRoleId).toBe(productRole.id);
  });

  it("NEVER writes when CV extraction already produced a domain (invariant: extraction wins)", () => {
    const { shouldWrite, skippedReason, record } = computeInference({
      goalRoleId: productRole.id,
      situation: "student",
      extractedDomain: "engineering", // extracted value present
    });
    expect(shouldWrite).toBe(false);
    expect(skippedReason).toBe("extracted_domain_present");
    expect(record).toBeNull();
  });

  it("does not write, and records the audit reason, when no goal role is picked", () => {
    const { shouldWrite, skippedReason, record } = computeInference({
      goalRoleId: null,
      situation: "looking",
      extractedDomain: null,
    });
    expect(shouldWrite).toBe(false);
    expect(skippedReason).toBe("no_goal_role");
    expect(record).toBeNull();
  });

  it("records an unmapped family without writing (null domain is not a guess)", () => {
    const legalRole = ROLE_LOOKUP.find(
      (r) => r.role_family === "Legal_Compliance",
    );
    // Only assert if the library actually has such a role; otherwise the
    // unmapped path is already covered by inferPrimaryDomain's own test.
    if (legalRole) {
      const { shouldWrite, skippedReason, record } = computeInference({
        goalRoleId: legalRole.id,
        extractedDomain: null,
      });
      expect(shouldWrite).toBe(false);
      expect(skippedReason).toBe("unmapped_family");
      expect(record.primary_domain).toBeNull();
    }
  });
});

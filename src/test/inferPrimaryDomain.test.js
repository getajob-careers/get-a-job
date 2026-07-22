import { describe, it, expect } from "vitest";
import {
  inferPrimaryDomain,
  invalidMappedDomains,
  FAMILY_TO_DOMAIN,
} from "@shared/infer-primary-domain";
import { DOMAIN_TO_FAMILIES } from "@shared/track-scoring-constants";

// The linchpin: a CV-less user's primary_domain, inferred from the goal picker,
// must be byte-compatible with the extracted one (same field, same taxonomy).
describe("inferPrimaryDomain", () => {
  it("only ever maps to REAL primary_domain keys (grounding guarantee)", () => {
    expect(invalidMappedDomains()).toEqual([]);
    for (const d of Object.values(FAMILY_TO_DOMAIN)) {
      expect(Object.keys(DOMAIN_TO_FAMILIES)).toContain(d);
    }
  });

  it("resolves a goal role_family to its domain with high confidence", () => {
    const r = inferPrimaryDomain({
      goalRoleFamily: "Engineering",
      situation: "student",
    });
    expect(r.primary_domain).toBe("engineering");
    expect(r.source).toBe("goal_family");
    expect(r.confidence).toBe("high");
    // situation is carried through for the audit log, not used for the domain
    expect(r.inputs.situation).toBe("student");
  });

  it("covers the common families", () => {
    const cases = [
      ["Sales", "sales"],
      ["Marketing", "marketing"],
      ["Data", "data"],
      ["Finance", "finance"],
      ["HR_People", "hr"],
      ["Design_UX", "design"],
      ["Support", "support"],
      ["Product", "product"],
      ["IT_Security", "cybersecurity"],
      ["AI_ML", "data"],
    ];
    for (const [fam, dom] of cases) {
      expect(inferPrimaryDomain({ goalRoleFamily: fam }).primary_domain).toBe(
        dom,
      );
    }
  });

  it("falls back to the secondary family at medium confidence", () => {
    const r = inferPrimaryDomain({
      goalRoleFamily: "Leadership",
      goalRoleSecondaryFamily: "Sales",
    });
    expect(r.primary_domain).toBe("sales");
    expect(r.source).toBe("goal_secondary_family");
    expect(r.confidence).toBe("medium");
  });

  it("returns null (not a guess) when no family maps — caller leaves it unset", () => {
    const r = inferPrimaryDomain({
      goalRoleFamily: "Legal_Compliance",
      situation: "looking",
    });
    expect(r.primary_domain).toBeNull();
    expect(r.source).toBe("unmapped");
    expect(r.confidence).toBe("none");
  });

  it("handles empty/missing inputs without throwing", () => {
    expect(inferPrimaryDomain({}).primary_domain).toBeNull();
    expect(
      inferPrimaryDomain({ goalRoleFamily: "" }).primary_domain,
    ).toBeNull();
  });
});

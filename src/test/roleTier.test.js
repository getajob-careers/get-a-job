import { describe, it, expect } from "vitest";
import {
  roleTierFromTitle,
  targetTierFromTitles,
  TIER_RANK,
} from "../lib/roleTier";

// Locks the CLAIMS of the C4 spike (docs/eval/scoring-c4-roletier-spike.md, #602)
// against the real classifier. The spike measured 95% on a hand-label that lives
// in session scratch; these tests pin the load-bearing behaviours it promised, so
// a future edit to the exception lists cannot quietly break them.

describe("roleTierFromTitle - the P10 override reproduction (the spike's headline)", () => {
  // 4 of 5 human GOOD->STRETCH overrides must reproduce: each classifies BELOW
  // P10's manager target, so the underleveled penalty fires and the human's
  // downgrade is reproduced.
  it.each([
    "Senior FP&A Analyst",
    "Financial Business Analyst",
    "FP&A Analyst",
    "Financial & Business Analyst",
  ])("%s -> ic (below a manager target, so the penalty fires)", (t) => {
    expect(roleTierFromTitle(t)).toBe("ic");
  });

  it("Senior Finance Manager -> manager (on-tier, correctly stays GOOD)", () => {
    expect(roleTierFromTitle("Senior Finance Manager")).toBe("manager");
  });

  // The 5th override. The spike calls this a conservative MISS, not a misfire —
  // and it must stay a miss. See the note on EXEC_LEADERSHIP_SUBSTRINGS: adding
  // "Partner" to the lexicon would make this "manager" and suppress the very
  // penalty the human override says should fire.
  it("FP&A Business Partner -> abstains (conservative miss, never manager)", () => {
    expect(roleTierFromTitle("FP&A Business Partner")).toBeNull();
  });
});

describe("mitigation 1 - the ambiguous ops/office/quality cluster ABSTAINS", () => {
  // Eli's binding requirement. This is the spike's ONLY error cluster on
  // classifiable titles; the dangerous direction is calling an IC ops role
  // "manager" and over-firing the penalty on an IC-target user.
  it.each([
    "Revenue Operations Manager",
    "Sales Operations Manager",
    "Business Operations Manager",
    "Office Manager",
    "Operations Quality Manager",
  ])("%s -> null (never manager)", (t) => {
    expect(roleTierFromTitle(t)).toBeNull();
  });
});

describe("mitigation 2 - exec/finance leadership lexicon ships from the start", () => {
  it("Assistant Controller -> manager (not ic via 'assistant')", () => {
    expect(roleTierFromTitle("Assistant Controller")).toBe("manager");
  });
  it("Chief Financial Officer -> manager", () => {
    expect(roleTierFromTitle("Chief Financial Officer")).toBe("manager");
  });

  // Regression: as bare substrings "coo" matches "coordinator" and "cro"
  // matches "microsoft"/"macro", classifying IC roles as manager and firing the
  // penalty BACKWARDS. The acronyms must match whole words only.
  it.each([
    ["Marketing Coordinator", "ic"],
    ["Microsoft Dynamics Consultant", "ic"],
    ["Macro Research Analyst", "ic"],
  ])("%s -> %s (acronym substring must not false-positive)", (t, want) => {
    expect(roleTierFromTitle(t)).toBe(want);
  });
});

describe("the IC-trap - 57% of '* Manager' titles are IC-track", () => {
  it.each([
    "Product Manager",
    "Program Manager",
    "Project Manager",
    "Account Manager",
    "Brand Manager",
    "Campaign Manager",
    "Customer Success Manager",
    "Marketing Manager",
  ])("%s -> ic (a naive keyword rule would say manager)", (t) => {
    expect(roleTierFromTitle(t)).toBe("ic");
  });

  it("Engineering Manager -> manager (a real people-manager still lands)", () => {
    expect(roleTierFromTitle("Engineering Manager")).toBe("manager");
  });

  // Regression, caught by this suite on the first run. "account" matched inside
  // "ACCOUNTing Manager", so a finance people-manager classified as ic — the
  // exact inversion the IC-discipline list exists to prevent, on one of P10's
  // OWN target titles. The P10 MAX test passed anyway (other titles in the set
  // still said manager), so only this direct assertion catches it.
  it.each([
    ["Accounting Manager", "manager"],
    ["Account Manager", "ic"],
  ])("%s -> %s (word boundary, not substring)", (t, want) => {
    expect(roleTierFromTitle(t)).toBe(want);
  });

  // Org leadership must win over the IC-discipline exception: "Director of
  // Product" is not an IC product role.
  it.each(["Director of Product", "Head of Marketing", "VP Product"])(
    "%s -> manager (org leadership beats the IC-discipline list)",
    (t) => {
      expect(roleTierFromTitle(t)).toBe("manager");
    },
  );
});

describe("lead track + abstain floor", () => {
  it.each(["Staff Engineer", "Principal Designer", "Team Lead"])(
    "%s -> lead",
    (t) => {
      expect(roleTierFromTitle(t)).toBe("lead");
    },
  );

  it("ranks ic < lead < manager", () => {
    expect(TIER_RANK.ic).toBeLessThan(TIER_RANK.lead);
    expect(TIER_RANK.lead).toBeLessThan(TIER_RANK.manager);
  });

  // ~34% of the corpus has no tier keyword. Abstaining = not penalizing.
  it.each(["Business Partner", "", null, undefined, "Rockstar Ninja"])(
    "%s -> null (abstain, never a guess)",
    (t) => {
      expect(roleTierFromTitle(t)).toBeNull();
    },
  );
});

describe("corpus corroborator - promotes only, never demotes", () => {
  it("promotes a keyword-less title when function_family = Leadership", () => {
    expect(
      roleTierFromTitle("Business Partner", { function_family: "Leadership" }),
    ).toBe("manager");
  });
  it("promotes a keyword-less title on a management seniority band", () => {
    expect(
      roleTierFromTitle("Business Partner", { req_seniority: "Director_Head" }),
    ).toBe("manager");
  });
  // Low recall (39% on clear managers) means it can only ever ADD. It must not
  // override a title that already carried its own tier signal.
  it("does NOT demote an explicit manager title on an IC-ish corpus row", () => {
    expect(
      roleTierFromTitle("Engineering Manager", { req_seniority: "Mid" }),
    ).toBe("manager");
  });
  it("does NOT promote an IC-discipline manager (Product Manager stays ic)", () => {
    expect(
      roleTierFromTitle("Product Manager", { function_family: "Leadership" }),
    ).toBe("ic");
  });
});

describe("targetTierFromTitles - MAX across the set, not the nearest step", () => {
  // The C4 design decision the spike surfaced: a target set is a PATH, not a
  // point. P10's real set mixes IC and manager titles; MAX = manager is what
  // reproduces the overrides. Nearest-step would read P10 as an IC target and
  // fire nothing at all.
  const P10 = [
    "Senior Accountant",
    "Internal Auditor",
    "Forensic Accountant",
    "Accounting Manager",
    "Financial Reporting Manager",
    "AP Manager",
  ];
  it("P10's mixed IC+manager set -> manager", () => {
    expect(targetTierFromTitles(P10)).toBe("manager");
  });
  it("an all-IC set -> ic", () => {
    expect(
      targetTierFromTitles(["Senior Accountant", "Internal Auditor"]),
    ).toBe("ic");
  });
  it("abstaining titles are skipped, not treated as ic", () => {
    expect(targetTierFromTitles(["Rockstar", "Accounting Manager"])).toBe(
      "manager",
    );
  });
  // No target tier => no reference => no penalty.
  it.each([[[]], [null], [undefined], [["Rockstar", "Office Manager"]]])(
    "%s -> null (no target tier means no penalty)",
    (titles) => {
      expect(targetTierFromTitles(titles)).toBeNull();
    },
  );
});

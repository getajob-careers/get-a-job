import { describe, it, expect } from "vitest";
import { resolveSkill, resolveSkillList } from "../lib/skillResolver";

describe("resolveSkill", () => {
  it("returns canonical IDs for direct alias hits", () => {
    // Spot-check labels from the curated chip bank — these are the highest-
    // signal cases the alias map was built to cover.
    expect(resolveSkill("Python").length).toBeGreaterThan(0);
    expect(resolveSkill("Figma")).toContain("figma_mastery");
  });

  it("normalizes case + whitespace before lookup", () => {
    const a = resolveSkill("PYTHON");
    const b = resolveSkill("python");
    const c = resolveSkill("  Python  ");
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("strips parenthetical qualifiers on the second pass", () => {
    // "Figma (basic)" → strip "(basic)" → look up "figma"
    const stripped = resolveSkill("Figma (basic)");
    const direct = resolveSkill("Figma");
    expect(stripped).toEqual(direct);
  });

  it("handles snake_case input by converting to space-form first", () => {
    // Some surfaces (e.g. older LLM extractions) emit "product_management"
    // — should resolve via the space-form alias if present.
    const snake = resolveSkill("product_management");
    expect(snake.length).toBeGreaterThan(0);
  });

  it("returns [] for unknown labels", () => {
    expect(resolveSkill("totally fake skill name xyzqq")).toEqual([]);
  });

  it("returns [] for non-string or empty input", () => {
    expect(resolveSkill(null)).toEqual([]);
    expect(resolveSkill(undefined)).toEqual([]);
    expect(resolveSkill("")).toEqual([]);
    expect(resolveSkill(42)).toEqual([]);
  });
});

describe("resolveSkillList", () => {
  it("dedupes canonical IDs + records unmapped phrases", () => {
    const { canonical, unmapped } = resolveSkillList([
      "Python",
      "python",        // dup — should collapse
      "Figma",
      "Custom Internal Tool",  // unmapped
    ]);
    // canonical contains python_* + figma_mastery at least, deduped
    expect(canonical).toContain("figma_mastery");
    const pythonHits = canonical.filter((id) => id.startsWith("python"));
    expect(pythonHits.length).toBeGreaterThan(0);
    expect(unmapped).toEqual(["custom internal tool"]);
  });

  it("returns empty arrays for empty/null input", () => {
    expect(resolveSkillList([])).toEqual({ canonical: [], unmapped: [] });
    expect(resolveSkillList(null)).toEqual({ canonical: [], unmapped: [] });
    expect(resolveSkillList(undefined)).toEqual({ canonical: [], unmapped: [] });
  });

  it("dedupes unmapped phrases case-insensitively", () => {
    const { unmapped } = resolveSkillList([
      "Made-Up Skill",
      "made-up skill",  // dup of above
      "Another Fake",
    ]);
    expect(unmapped).toHaveLength(2);
    expect(unmapped).toContain("made-up skill");
    expect(unmapped).toContain("another fake");
  });

  it("returns canonical sorted for stable equality across calls", () => {
    const a = resolveSkillList(["Python", "Figma"]);
    const b = resolveSkillList(["Figma", "Python"]);
    expect(a.canonical).toEqual(b.canonical);
  });
});

describe("Phase 0a alias additions (live-unmapped recovery)", () => {
  // One case per alias added in this PR. Each asserts the new key resolves
  // to the expected canonical target so the alias map can't silently drift.
  // Targets were confirmed present in skillIdsGenerated.json before adding.

  it("customer experience & retention → customer_health_management + customer_retention", () => {
    expect(resolveSkill("customer experience & retention")).toEqual(
      expect.arrayContaining(["customer_health_management", "customer_retention"]),
    );
    expect(resolveSkill("customer experience and retention")).toEqual(
      expect.arrayContaining(["customer_health_management", "customer_retention"]),
    );
  });

  it("user-facing operations → customer_support_operations", () => {
    expect(resolveSkill("user-facing operations")).toContain("customer_support_operations");
    expect(resolveSkill("user facing operations")).toContain("customer_support_operations");
  });

  it("stakeholder coordination → stakeholder_management", () => {
    expect(resolveSkill("stakeholder coordination")).toContain("stakeholder_management");
  });

  it("program & project execution → program_management + project_management", () => {
    expect(resolveSkill("program & project execution")).toEqual(
      expect.arrayContaining(["program_management", "project_management"]),
    );
    expect(resolveSkill("program and project execution")).toEqual(
      expect.arrayContaining(["program_management", "project_management"]),
    );
  });

  it("leadership & team management → leadership", () => {
    expect(resolveSkill("leadership & team management")).toContain("leadership");
    expect(resolveSkill("leadership and team management")).toContain("leadership");
  });

  it("customer onboarding strategy → onboarding_training", () => {
    expect(resolveSkill("customer onboarding strategy")).toContain("onboarding_training");
  });

  it("customer relations + common typo → customer_relationship_management", () => {
    expect(resolveSkill("customer relations")).toContain("customer_relationship_management");
    expect(resolveSkill("customer relationship managment")).toContain("customer_relationship_management");
  });

  it("team collaboration → cross_functional_collaboration", () => {
    expect(resolveSkill("team collaboration")).toContain("cross_functional_collaboration");
  });

  it("excel pivot tables + pivot tables → excel_advanced_finance", () => {
    expect(resolveSkill("excel pivot tables")).toContain("excel_advanced_finance");
    expect(resolveSkill("pivot tables")).toContain("excel_advanced_finance");
  });

  it("basic statistical data analysis → statistical_analysis", () => {
    expect(resolveSkill("basic statistical data analysis")).toContain("statistical_analysis");
  });

  it("intentionally-unmapped traits remain unresolved", () => {
    // Per Phase 0a decision: traits aren't skills. Leave them in
    // skills_unmapped rather than forcing a bad canonical mapping.
    expect(resolveSkill("team player")).toEqual([]);
    expect(resolveSkill("continuous learner")).toEqual([]);
  });

  it("modern AI tooling labels → existing canonicals", () => {
    expect(resolveSkill("agentic ai systems")).toContain("agentic_systems");
    expect(resolveSkill("claude / claude code")).toContain("claude_assistant");
    expect(resolveSkill("claude")).toContain("claude_assistant");
    expect(resolveSkill("no-code / low-code ai automation")).toContain("no_code_ai_automation");
  });

  it("operational logistics → logistics_practice", () => {
    expect(resolveSkill("operational logistics")).toContain("logistics_practice");
  });
});

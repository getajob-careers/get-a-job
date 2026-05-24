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

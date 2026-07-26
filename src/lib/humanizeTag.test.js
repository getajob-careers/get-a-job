import { describe, it, expect } from "vitest";
import { deslug, humanizeTag } from "./humanizeTag";

describe("deslug", () => {
  it("turns snake_case into spaced prose, case preserved", () => {
    expect(deslug("software_engineering")).toBe("software engineering");
  });
  it("leaves already-clean input unchanged (idempotent)", () => {
    expect(deslug("product management")).toBe("product management");
  });
  it("collapses hyphens and repeated separators", () => {
    expect(deslug("mid-level")).toBe("mid level");
    expect(deslug("a__b--c")).toBe("a b c");
  });
  it("is null-safe", () => {
    expect(deslug(null)).toBe("");
    expect(deslug(undefined)).toBe("");
  });
});

describe("humanizeTag", () => {
  it("title-cases a standalone snake_case label", () => {
    expect(humanizeTag("equivalent_experience")).toBe("Equivalent Experience");
    expect(humanizeTag("entry")).toBe("Entry");
  });
  it("upper-cases known acronyms", () => {
    expect(humanizeTag("hr")).toBe("HR");
    expect(humanizeTag("ux_design")).toBe("UX Design");
  });
  it("is null-safe", () => {
    expect(humanizeTag(null)).toBe("");
  });
});

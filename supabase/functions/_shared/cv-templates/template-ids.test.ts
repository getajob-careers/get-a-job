import { describe, it, expect } from "vitest";
import {
  normalizeTemplate,
  TEMPLATE_IDS,
  DEFAULT_TEMPLATE,
} from "./template-ids.ts";

describe("normalizeTemplate (render-cv template-id validation)", () => {
  it("passes each of the five known ids through unchanged", () => {
    for (const id of ["modern", "editorial", "sharp", "executive", "refined"]) {
      expect(normalizeTemplate(id)).toBe(id);
    }
    // and the canonical list is exactly those five
    expect([...TEMPLATE_IDS]).toEqual([
      "modern",
      "editorial",
      "sharp",
      "executive",
      "refined",
    ]);
  });

  it("defaults missing/unknown values to modern", () => {
    expect(DEFAULT_TEMPLATE).toBe("modern");
    for (const bad of [undefined, null, "", "classic", "minimal", 123, {}]) {
      expect(normalizeTemplate(bad)).toBe("modern");
    }
  });
});

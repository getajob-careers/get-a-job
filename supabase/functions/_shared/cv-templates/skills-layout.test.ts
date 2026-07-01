import { describe, it, expect } from "vitest";
import { skillGroupTopAdvance, SKILL_GROUP_GAP } from "./skills-layout.ts";

// Mirrors the build-pdf.ts COMFORTABLE density (only the fields the helper
// reads) and SIZE_BODY, so these assertions track the real renderer constants.
// A skill group whose first line advances DOWN by less than the body glyph
// height overlaps the line above it — that was the Technical-over-Domain,
// Tools-over-Technical bug.
const D = { lhBulletGap: 15, lhBody: 13 };
const SIZE_BODY = 10.5;

describe("skillGroupTopAdvance (Skills block overlap fix)", () => {
  it("first group is unchanged: advances by lhBulletGap (gap below the Skills heading)", () => {
    expect(skillGroupTopAdvance(true, D)).toBe(D.lhBulletGap); // 15
  });

  it("a later group advances a full line height + inter-group gap, so it cannot overlap", () => {
    const adv = skillGroupTopAdvance(false, D);
    expect(adv).toBe(D.lhBody + SKILL_GROUP_GAP); // 18
    expect(adv).toBeGreaterThanOrEqual(D.lhBody); // clears a full line
    expect(adv).toBeGreaterThan(SIZE_BODY); // strictly past the glyph height
  });

  it("regression: the old 5pt-only advance was below a line height (the overlap)", () => {
    // Before the fix, later groups advanced by only the 5pt inter-group gap,
    // which is less than the body glyph height, so their first line drew on top
    // of the line above. The fix stacks that gap ON TOP of a full line height.
    expect(SKILL_GROUP_GAP).toBeLessThan(SIZE_BODY);
    expect(skillGroupTopAdvance(false, D)).toBeGreaterThan(SKILL_GROUP_GAP);
  });

  it("a 3-group block (Domain, Technical, Tools) stacks with no overlapping baselines", () => {
    const labelYs: number[] = [];
    let y = 1000; // content-top just below the Skills heading; y flows down
    for (const isFirst of [true, false, false]) {
      y -= skillGroupTopAdvance(isFirst, D);
      labelYs.push(y); // single-line groups: label line is the group's only line
    }
    expect(labelYs).toHaveLength(3);
    for (let i = 1; i < labelYs.length; i++) {
      const gap = labelYs[i - 1] - labelYs[i];
      expect(gap).toBeGreaterThanOrEqual(D.lhBody); // at least one line height
      expect(gap).toBeGreaterThan(SIZE_BODY); // strictly no overlap
    }
  });

  it("a 1-group block places exactly where the heading gap dictates (byte-identical to pre-fix)", () => {
    let y = 1000;
    y -= skillGroupTopAdvance(true, D);
    expect(y).toBe(1000 - D.lhBulletGap); // 985
  });
});

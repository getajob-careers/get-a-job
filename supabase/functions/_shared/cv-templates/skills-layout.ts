// Pure geometry for the Skills block's per-group vertical advance, split out of
// build-pdf.ts so it is unit-testable without pulling the pdf-lib (esm.sh) chain
// the renderer imports. Values are BASE (pre-scale) points; the renderer applies
// the uniform scale via s(ctx, ...).
//
// The Skills section renders one labeled line per non-empty group (Domain /
// Technical / Tools). Before drawing each group's FIRST line the cursor moves
// down by this much:
//   - first group  → lhBulletGap: the gap below the "Skills" section heading.
//   - later groups → a FULL body line height (lhBody) PLUS a small inter-group
//     gap. This is the fix: the prior code advanced later groups by only the
//     inter-group gap (5pt), so their first line landed ~5pt below the line
//     above — less than a line height — and overlapped it (Technical over
//     Domain, Tools over Technical) whenever the skills had ≥2 groups.

export const SKILL_GROUP_GAP = 5; // small visual gap stacked on top of the line advance

export function skillGroupTopAdvance(
  isFirst: boolean,
  d: { lhBulletGap: number; lhBody: number },
): number {
  return isFirst ? d.lhBulletGap : d.lhBody + SKILL_GROUP_GAP;
}

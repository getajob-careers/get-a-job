// Regression test for the #546 -> #547 outage: /CVAgent rendered a permanent
// spinner (blank content) on initial load whenever the selected CV's cv_data was
// already WARM in the react-query cache. Root cause: two effects both keyed on
// selectedCvId wrote `model` — a seed effect (setModel(m)) and a separate reset
// effect (setModel(null)). On a warm cache both fired on the same commit; the
// reset ran after the seed and clobbered model back to null, and no dep changed
// again to re-seed, so the `!model` render guard spun forever. It threw nothing
// (0 exceptions in PostHog), which is why build + unit tests + lint stayed green
// with no page-first-render coverage.
//
// The fix consolidates model ownership into ONE effect (useSeededCvModel). This
// exercises that hook's FIRST COMMIT with a warm, matching row and asserts model
// is seeded (non-null) — the exact condition that hung the page. It also covers
// the anti-stale behavior: switching to a not-yet-loaded selection clears model,
// then re-seeds when the matching row arrives.
//
// NOTE: row objects are created ONCE and reused (stable references). In production
// cvRow comes from react-query, which returns a stable reference across renders;
// creating a fresh object each render would change the effect's [cvRow] dep every
// commit and spin — a test artifact, not a component bug.
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";

import { useSeededCvModel } from "@/components/cv-studio/useSeededCvModel";

const row = (id, name) => ({ id, cv_data: { header: { name } } });

describe("useSeededCvModel — initial load (regression: #546/#547 permanent spinner)", () => {
  it("seeds the model on first commit when the row is already warm and matches the selection", () => {
    // Warm cache: cvRow present and matching selectedCvId on the very first render
    // — the exact state that left model stuck null under the old two-effect code.
    const warm = row("cv-master", "Warm Master");
    const { result } = renderHook(() => useSeededCvModel(warm, "cv-master"));
    expect(result.current.model).not.toBeNull();
    expect(result.current.model.header.name).toBe("Warm Master");
    expect(result.current.modelRef.current).toBe(result.current.model);
  });

  it("clears the model while the newly-selected row hasn't loaded, then re-seeds when it lands", () => {
    const rowA = row("a", "A");
    const rowB = row("b", "B");
    const { result, rerender } = renderHook(
      ({ cvRow, id }) => useSeededCvModel(cvRow, id),
      { initialProps: { cvRow: rowA, id: "a" } },
    );
    expect(result.current.model?.header.name).toBe("A");

    // Selection moved to "b" but cvRow still points at the old "a" row.
    rerender({ cvRow: rowA, id: "b" });
    expect(result.current.model).toBeNull();

    // "b" row arrives.
    rerender({ cvRow: rowB, id: "b" });
    expect(result.current.model?.header.name).toBe("B");
  });

  it("does not seed when there is no row yet (shows the loading state, not stale content)", () => {
    const { result } = renderHook(() => useSeededCvModel(null, "cv-x"));
    expect(result.current.model).toBeNull();
  });
});

// Tests for the CV server-driven experience reconciliation.
//
// The contract these tests lock:
//   1. One output entry per source experience — no entry is ever dropped.
//   2. title / org / dates are stamped from the source, never the LLM.
//   3. Index-based bullet attachment separates same-dated entries cleanly.
//   4. Out-of-range LLM indices fall back to positional attachment + log.
//   5. Missing bullets fall back to source.responsibilities so the
//      experience still renders content.
//   6. Date rendering uses real end-dates for past roles ("Mon YYYY –
//      Mon YYYY") and "Present" only when is_current is true.

import { describe, it, expect, vi } from "vitest";
import {
  fillFromSource,
  formatExperienceDates,
  type ReconcileWarning,
  type SourceExperience,
} from "./reconcile";

const src = (overrides: Partial<SourceExperience> = {}): SourceExperience => ({
  title: "Engineer",
  company: "Acme",
  start_date: "Jan 2024",
  end_date: "",
  is_current: true,
  responsibilities: "",
  ...overrides,
});

describe("fillFromSource — server-driven CV reconciliation", () => {
  it("case 1 — two experiences correctly resolved by index, no cross-contamination", () => {
    const sources = [
      src({ title: "Engineer", company: "Wiz", start_date: "Jan 2024", is_current: true }),
      src({ title: "Manager", company: "Monday", start_date: "Jun 2022", end_date: "Dec 2023", is_current: false }),
    ];
    const llm = [
      { index: 0, bullets: ["built Wiz feature"] },
      { index: 1, bullets: ["led Monday team"] },
    ];

    const result = fillFromSource(sources, llm, "company");

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Engineer");
    expect(result[0].company).toBe("Wiz");
    expect(result[0].bullets).toEqual(["built Wiz feature"]);
    expect(result[1].title).toBe("Manager");
    expect(result[1].company).toBe("Monday");
    expect(result[1].bullets).toEqual(["led Monday team"]);
  });

  it("case 2 — out-of-range LLM index falls back to positional attachment, no experience lost", () => {
    const sources = [
      src({ title: "Soldier", company: "IDF", start_date: "Aug 2018", end_date: "Aug 2021", is_current: false, responsibilities: "Trained recruits." }),
    ];
    const llm = [
      { index: 99, bullets: ["civilian-readable bullet"] },
    ];
    const logger = vi.fn();

    const result = fillFromSource(sources, llm, "unit", { logger });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Soldier");
    expect(result[0].unit).toBe("IDF");
    expect(result[0].bullets).toEqual(["civilian-readable bullet"]);
    expect(logger).toHaveBeenCalledWith(expect.stringContaining("out-of-range index=99"));
  });

  it("case 3 — two current experiences with identical 'Present' dates separated by index", () => {
    const sources = [
      src({ title: "Founder", company: "Startup A", start_date: "Jan 2024", is_current: true }),
      src({ title: "Advisor", company: "Startup B", start_date: "Mar 2025", is_current: true }),
    ];
    const llm = [
      { index: 0, bullets: ["A bullet"] },
      { index: 1, bullets: ["B bullet"] },
    ];

    const result = fillFromSource(sources, llm, "company");

    expect(result).toHaveLength(2);
    expect(result[0].company).toBe("Startup A");
    expect(result[0].bullets).toEqual(["A bullet"]);
    expect(result[0].dates).toBe("Jan 2024 – Present");
    expect(result[1].company).toBe("Startup B");
    expect(result[1].bullets).toEqual(["B bullet"]);
    expect(result[1].dates).toBe("Mar 2025 – Present");
  });

  it("case 4 — DB title that looks like a sentence passes through verbatim (no sanitizer clobber)", () => {
    const sources = [
      src({
        title: "Supervised and trained teams of soldiers",
        company: "IDF — Combat Engineering Corps",
        start_date: "Aug 2018",
        end_date: "Aug 2021",
        is_current: false,
      }),
    ];
    const llm = [{ index: 0, bullets: ["bullet"] }];

    const result = fillFromSource(sources, llm, "unit");

    expect(result[0].title).toBe("Supervised and trained teams of soldiers");
    expect(result[0].unit).toBe("IDF — Combat Engineering Corps");
  });

  it("case 5 — past role with real end_date renders as 'Mar 2020 – Nov 2022', not 'Present'", () => {
    const sources = [
      src({
        title: "Analyst",
        company: "Bank",
        start_date: "Mar 2020",
        end_date: "Nov 2022",
        is_current: false,
      }),
    ];
    const llm = [{ index: 0, bullets: ["bullet"] }];

    const result = fillFromSource(sources, llm, "company");

    expect(result[0].dates).toBe("Mar 2020 – Nov 2022");
    expect(result[0].dates).not.toMatch(/present/i);
  });

  it("case 6 — server-driven fill produces one output per source even with out-of-order / omitted LLM entries; responsibilities fallback when no bullets", () => {
    const sources = [
      src({ title: "Role A", company: "Co A", start_date: "Jan 2024", is_current: true }),
      src({
        title: "Role B",
        company: "Co B",
        start_date: "Jun 2022",
        end_date: "Dec 2023",
        is_current: false,
        responsibilities: "Ran B operations.\nManaged B team of 4.",
      }),
      src({ title: "Role C", company: "Co C", start_date: "Mar 2021", end_date: "May 2022", is_current: false }),
    ];
    // LLM returns C and A (out of order) and omits B entirely.
    const llm = [
      { index: 2, bullets: ["C bullet"] },
      { index: 0, bullets: ["A bullet"] },
    ];

    const result = fillFromSource(sources, llm, "company");

    expect(result).toHaveLength(3);
    expect(result[0].company).toBe("Co A");
    expect(result[0].bullets).toEqual(["A bullet"]);
    expect(result[1].company).toBe("Co B");
    expect(result[1].bullets).toEqual(["Ran B operations.", "Managed B team of 4."]);
    expect(result[2].company).toBe("Co C");
    expect(result[2].bullets).toEqual(["C bullet"]);
  });
});

describe("fillFromSource — reconcile warnings (additive instrumentation, no behavior change)", () => {
  it("emits a positional_fallback warning when an out-of-range index is rescued by slot-j attachment", () => {
    const sources = [src({ title: "Soldier", company: "IDF", responsibilities: "Trained recruits." })];
    const llm = [{ index: 99, bullets: ["civilian-readable bullet"] }];
    const warnings: ReconcileWarning[] = [];

    const result = fillFromSource(sources, llm, "unit", { warnings, bucket: "military_experiences" });

    // Behavior is unchanged — slot 0 still attaches the bullet via positional rescue.
    expect(result[0].bullets).toEqual(["civilian-readable bullet"]);
    // And a structured warning was recorded for the caller to surface.
    expect(warnings).toEqual([
      { bucket: "military_experiences", kind: "positional_fallback", entry_position: 0, llm_index: 99, source_index: 0 },
    ]);
  });

  it("emits an unclaimed_entry warning when an out-of-range index has no positional slot (the agamf123 shape)", () => {
    // The bake-off failure shape: misrouted bucket has zero sources, the LLM's
    // bullets vanish silently from this bucket's render.
    const sources: SourceExperience[] = [];
    const llm = [{ index: 4, bullets: ["Led a team of 6 soldiers in the Tavor Battalion"] }];
    const warnings: ReconcileWarning[] = [];

    const result = fillFromSource(sources, llm, "unit", { warnings, bucket: "military_experiences" });

    // Render: empty bucket (no sources). LLM bullets dropped.
    expect(result).toEqual([]);
    // Warning recorded so the caller can flag the silent drop.
    expect(warnings).toEqual([
      { bucket: "military_experiences", kind: "unclaimed_entry", entry_position: 0, llm_index: 4 },
    ]);
  });

  it("emits an unclaimed_entry warning when the LLM emits a duplicate index (only first claims)", () => {
    const sources = [
      src({ title: "Role A", company: "Co A" }),
      src({ title: "Role B", company: "Co B" }),
    ];
    const llm = [
      { index: 0, bullets: ["first A bullet"] },
      { index: 0, bullets: ["second A bullet — should be lost"] },
    ];
    const warnings: ReconcileWarning[] = [];

    const result = fillFromSource(sources, llm, "company", { warnings });

    // Render: slot 0 has the first claim's bullets; slot 1 falls back to its
    // own (empty) responsibilities. The second LLM entry's bullets are dropped.
    expect(result[0].bullets).toEqual(["first A bullet"]);
    expect(result[1].bullets).toEqual([]);
    // Warning recorded for the silently-dropped duplicate.
    expect(warnings).toEqual([
      { bucket: "company", kind: "unclaimed_entry", entry_position: 1, llm_index: 0 },
    ]);
  });
});

describe("formatExperienceDates", () => {
  it("formats start + Present for current roles", () => {
    expect(formatExperienceDates("Jan 2024", "", true)).toBe("Jan 2024 – Present");
  });
  it("formats start + end for past roles", () => {
    expect(formatExperienceDates("Mar 2020", "Nov 2022", false)).toBe("Mar 2020 – Nov 2022");
  });
  it("normalises long month names", () => {
    expect(formatExperienceDates("October 2025", "December 2025", false)).toBe("Oct 2025 – Dec 2025");
  });
  it("normalises numeric MM/YYYY", () => {
    expect(formatExperienceDates("3/2020", "11/2022", false)).toBe("Mar 2020 – Nov 2022");
  });
  it("year-only passes through", () => {
    expect(formatExperienceDates("2020", "2022", false)).toBe("2020 – 2022");
  });
  it("empty inputs render empty", () => {
    expect(formatExperienceDates("", "", false)).toBe("");
  });
});

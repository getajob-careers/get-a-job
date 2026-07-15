import { describe, it, expect } from "vitest";
import { formatMonthYear, formatDateRange, formatDateString } from "./date-format.ts";

describe("formatMonthYear", () => {
  it("strips the day from an ISO date (the leak this module closes)", () => {
    expect(formatMonthYear("2025-10-19")).toBe("Oct 2025");
    expect(formatMonthYear("2020-03-31")).toBe("Mar 2020");
    expect(formatMonthYear("2023-09")).toBe("Sep 2023");
    expect(formatMonthYear("2025-1")).toBe("Jan 2025");
  });

  it("keeps year-only verbatim — never fabricates a month", () => {
    expect(formatMonthYear("2019")).toBe("2019");
    expect(formatMonthYear("2025")).toBe("2025");
  });

  it("normalises full + abbreviated month names to Mon YYYY", () => {
    expect(formatMonthYear("October 2025")).toBe("Oct 2025");
    expect(formatMonthYear("Sept 2024")).toBe("Sep 2024");
    expect(formatMonthYear("Oct 2025")).toBe("Oct 2025");
    expect(formatMonthYear("January 2020")).toBe("Jan 2020");
  });

  it("normalises numeric month-first M/YYYY and M-YYYY", () => {
    expect(formatMonthYear("10/2025")).toBe("Oct 2025");
    expect(formatMonthYear("11-2024")).toBe("Nov 2024");
    expect(formatMonthYear("1/2025")).toBe("Jan 2025");
  });

  it("passes 'Present'-like tokens through canonically", () => {
    expect(formatMonthYear("Present")).toBe("Present");
    expect(formatMonthYear("current")).toBe("Present");
    expect(formatMonthYear("NOW")).toBe("Present");
  });

  it("leaves genuinely ambiguous shapes verbatim (never corrupts)", () => {
    // A bare year-range in one field: second part 22 is not a valid month,
    // so it must NOT be mangled into "2020".
    expect(formatMonthYear("2020-2022")).toBe("2020-2022");
    expect(formatMonthYear("Summer 2024")).toBe("Summer 2024");
    expect(formatMonthYear("")).toBe("");
    expect(formatMonthYear(null)).toBe("");
    expect(formatMonthYear(undefined)).toBe("");
  });

  it("never emits a day-level token", () => {
    for (const raw of ["2025-10-19", "2020-03-31", "2023-09-01"]) {
      expect(formatMonthYear(raw)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(formatMonthYear(raw)).not.toMatch(/\b(19|31|01)\b/);
    }
  });
});

describe("formatDateRange (separate start/end fields)", () => {
  it("joins two months with an en-dash", () => {
    expect(formatDateRange("2020-03-31", "2022-11-30", false)).toBe("Mar 2020 – Nov 2022");
    expect(formatDateRange("October 2025", "", true)).toBe("Oct 2025 – Present");
    expect(formatDateRange("2019", "2021", false)).toBe("2019 – 2021");
  });

  it("handles single endpoints", () => {
    expect(formatDateRange("2024", "", false)).toBe("2024");
    expect(formatDateRange("", "May 2025", false)).toBe("May 2025");
    expect(formatDateRange("", "", false)).toBe("");
  });

  it("isCurrent wins over any end value", () => {
    expect(formatDateRange("2023-01-15", "2024-06-01", true)).toBe("Jan 2023 – Present");
  });
});

describe("formatDateString (pre-joined range strings)", () => {
  it("normalises each endpoint of an LLM-style range", () => {
    expect(formatDateString("October 2025 – Present")).toBe("Oct 2025 – Present");
    expect(formatDateString("2023 - 2024")).toBe("2023 – 2024");
    expect(formatDateString("Aug 2025 to Present")).toBe("Aug 2025 – Present");
  });

  it("does NOT split an ISO date's internal hyphens (whitespace-guarded)", () => {
    // The separator hyphen carries spaces; the ISO hyphens do not.
    expect(formatDateString("2023-09-01 - 2024-06-01")).toBe("Sep 2023 – Jun 2024");
    expect(formatDateString("2025-10-19")).toBe("Oct 2025");
  });

  it("passes a single normalised value through", () => {
    expect(formatDateString("December 2025")).toBe("Dec 2025");
    expect(formatDateString("")).toBe("");
  });
});

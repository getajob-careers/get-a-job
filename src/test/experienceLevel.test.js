// Drift tests for src/lib/experienceLevel.js.
//
// The algorithm is duplicated server-side in
//   supabase/functions/generate-career-analysis/index.ts
// These tests pin the frontend logic against a fixed fixture so that
// silent divergence between the two implementations gets caught.
//
// If you change either side, update the fixture + assertions here.

import { describe, it, expect } from "vitest";
import {
  reinferType,
  totalYearsOfExperience,
  inferExperienceLevel,
  allowedSenioritiesForLevel,
} from "@/lib/experienceLevel";

describe("reinferType", () => {
  it("classifies military by Hebrew/IDF keywords even when stored as full_time", () => {
    expect(reinferType({ type: "full_time", title: "Combat Soldier", company: "IDF", responsibilities: "Nahal Brigade" })).toBe(
      "military",
    );
  });

  it("classifies volunteering from text patterns", () => {
    expect(reinferType({ type: "full_time", title: "Volunteer Mentor", company: "Make a Wish", responsibilities: "pro bono mentoring" })).toBe(
      "volunteer",
    );
  });

  it("classifies internships from title text even when stored type is missing", () => {
    expect(reinferType({ title: "Summer Internship — Marketing", company: "Wix" })).toBe("internship");
  });

  it("preserves stored full_time when nothing flags otherwise", () => {
    expect(reinferType({ type: "full_time", title: "Product Manager", company: "Lemonade" })).toBe("full_time");
  });

  it("flags student-leadership only when title + context both hit", () => {
    expect(
      reinferType({ type: "full_time", title: "President of Reichman Marketing Club", company: "Reichman University" }),
    ).toBe("leadership");
    expect(reinferType({ type: "full_time", title: "President", company: "Acme Corp" })).toBe("full_time");
  });
});

describe("totalYearsOfExperience", () => {
  const currentYear = new Date().getFullYear();

  it("counts full_time years between start and end", () => {
    expect(
      totalYearsOfExperience([
        { type: "full_time", title: "Analyst", start_date: "2020-01", end_date: "2023-06" },
      ]),
    ).toBe(3);
  });

  it("counts in-progress roles up to the current year", () => {
    expect(
      totalYearsOfExperience([
        { type: "full_time", title: "PM", start_date: `${currentYear - 4}-01`, is_current: true },
      ]),
    ).toBe(4);
  });

  it("excludes military and volunteer experience", () => {
    expect(
      totalYearsOfExperience([
        { type: "military", title: "IDF Service", start_date: "2018", end_date: "2021" },
        { type: "volunteer", title: "Tutor", start_date: "2017", end_date: "2018" },
        { type: "full_time", title: "Analyst", start_date: "2022", end_date: "2024" },
      ]),
    ).toBe(2);
  });

  it("counts internships and freelance", () => {
    expect(
      totalYearsOfExperience([
        { type: "internship", title: "Marketing Intern", start_date: "2022", end_date: "2023" },
        { type: "freelance", title: "Designer", start_date: "2023", end_date: "2024" },
      ]),
    ).toBe(2);
  });

  it("ignores rows without parseable start_date", () => {
    expect(totalYearsOfExperience([{ type: "full_time", title: "Junk", start_date: "" }])).toBe(0);
  });
});

describe("inferExperienceLevel", () => {
  const yr = new Date().getFullYear();

  it("returns early_career for a current student even with significant work history", () => {
    const experiences = [
      { type: "full_time", title: "PM", start_date: "2015", end_date: "2024" },
    ];
    const educations = [{ is_current: true, education_level: "bachelors" }];
    expect(inferExperienceLevel(experiences, educations)).toBe("early_career");
  });

  it("returns early_career when years < 3 and not a student", () => {
    expect(
      inferExperienceLevel(
        [{ type: "full_time", title: "Analyst", start_date: `${yr - 2}`, is_current: true }],
        [],
      ),
    ).toBe("early_career");
  });

  it("returns mid_career when 3 ≤ years < 8", () => {
    expect(
      inferExperienceLevel(
        [{ type: "full_time", title: "PM", start_date: `${yr - 5}`, is_current: true }],
        [],
      ),
    ).toBe("mid_career");
  });

  it("returns senior_career when years ≥ 8", () => {
    expect(
      inferExperienceLevel(
        [{ type: "full_time", title: "Director", start_date: `${yr - 9}`, is_current: true }],
        [],
      ),
    ).toBe("senior_career");
  });

  it("treats empty inputs as early_career (most conservative bucket)", () => {
    expect(inferExperienceLevel([], [])).toBe("early_career");
    expect(inferExperienceLevel(undefined, undefined)).toBe("early_career");
  });
});

describe("allowedSenioritiesForLevel", () => {
  // Buckets locked 2026-05-20. If these change, update the Deno side too.
  it("early_career → entry + mid", () => {
    expect(allowedSenioritiesForLevel("early_career")).toEqual(["entry", "mid"]);
  });
  it("mid_career → mid + senior", () => {
    expect(allowedSenioritiesForLevel("mid_career")).toEqual(["mid", "senior"]);
  });
  it("senior_career → senior + lead + director + executive", () => {
    expect(allowedSenioritiesForLevel("senior_career")).toEqual([
      "senior",
      "lead",
      "director",
      "executive",
    ]);
  });
  it("unknown level falls through to full permissive set", () => {
    expect(allowedSenioritiesForLevel("anything_else")).toEqual([
      "entry",
      "mid",
      "senior",
      "lead",
      "director",
      "executive",
    ]);
  });
});

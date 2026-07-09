import { describe, it, expect } from "vitest";
import { composeBulletFromStory, mergeBulletSkills } from "@/lib/composeBullet";

describe("composeBulletFromStory", () => {
  it("joins action + result with a hyphen separator (no em dash in CV content)", () => {
    expect(
      composeBulletFromStory({
        action: "Rebuilt the onboarding flow",
        result: "cut time-to-first-value from 9 days to 4",
      }),
    ).toBe(
      "Rebuilt the onboarding flow - cut time-to-first-value from 9 days to 4",
    );
  });

  it("keeps a metric verbatim when it is already in the prose", () => {
    const out = composeBulletFromStory({
      action: "Ran 12 user interviews",
      result: "drove 88% adoption in Q1",
      metrics: ["88% adoption", "12 user interviews"],
    });
    // both metrics already present → no trailing clause appended
    expect(out).toBe("Ran 12 user interviews - drove 88% adoption in Q1");
  });

  it("appends a metric NOT present in the prose, verbatim", () => {
    const out = composeBulletFromStory({
      action: "Shipped the billing migration",
      result: "with zero downtime",
      metrics: ["shipped 2 weeks early"],
    });
    expect(out).toBe(
      "Shipped the billing migration - with zero downtime. shipped 2 weeks early",
    );
  });

  it("does not duplicate punctuation when the core already ends with a period", () => {
    const out = composeBulletFromStory({
      result: "Closed the quarter ahead of plan.",
      metrics: ["$1.2M booked"],
    });
    expect(out).toBe("Closed the quarter ahead of plan. $1.2M booked");
  });

  it("falls back to the title when action + result are both empty", () => {
    expect(
      composeBulletFromStory({ title: "Led the campus ambassador program" }),
    ).toBe("Led the campus ambassador program");
  });

  it("returns null when there is nothing usable", () => {
    expect(composeBulletFromStory({})).toBeNull();
    expect(composeBulletFromStory({ action: "  ", result: "" })).toBeNull();
    expect(composeBulletFromStory(null)).toBeNull();
  });

  it("is case-insensitive when checking metric presence", () => {
    const out = composeBulletFromStory({
      action: "Grew the list to 5K Subscribers",
      metrics: ["5k subscribers"],
    });
    expect(out).toBe("Grew the list to 5K Subscribers");
  });
});

describe("mergeBulletSkills", () => {
  it("merges demonstrated skills + tools into existing skills, deduped", () => {
    expect(
      mergeBulletSkills(["Stakeholder Management"], {
        skills_demonstrated: ["Customer Research", "Stakeholder Management"],
        tools_used: ["Figma", "Notion"],
      }),
    ).toEqual([
      "Stakeholder Management",
      "Customer Research",
      "Figma",
      "Notion",
    ]);
  });

  it("dedupes case-insensitively, keeping the first spelling", () => {
    expect(
      mergeBulletSkills(["SQL"], {
        skills_demonstrated: ["sql"],
        tools_used: ["SQL"],
      }),
    ).toEqual(["SQL"]);
  });

  it("handles missing/empty inputs", () => {
    expect(mergeBulletSkills(null, {})).toEqual([]);
    expect(mergeBulletSkills(["A"], null)).toEqual(["A"]);
  });
});

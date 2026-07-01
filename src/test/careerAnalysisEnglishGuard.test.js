// generate-career-analysis English guarantee. The user-facing prose (reasoning,
// action_items, alignment_to_goal, overall_assessment) is shown on the roadmap,
// but a Hebrew profile makes the model write it in Hebrew. The fix gates on Hebrew
// and runs the SHARED faithful translator over the whole response (the #469 /
// render-chokepoint pattern). These tests pin the GUARANTEE on a career-analysis-
// shaped object (no network): the prose that reaches the user is Hebrew-free, and
// the internal scoring fields other consumers read (title, skill IDs, scores,
// tracks) are NEVER touched.
import { describe, it, expect } from "vitest";
import { cvHasHebrew, translateCvToEnglish } from "@shared/cv-translate";

// Shaped like the function's `response`: English titles/skill-IDs/scores + Hebrew
// user-facing prose (as it comes back for a Hebrew profile).
const hebrewResponse = () => ({
  qualification_level: "Mid-Level",
  experience_level: "mid",
  overall_assessment: "יש לך ניסיון חזק בניהול מוצר with 3 years in the field",
  skill_gaps: ["project_management", "sql"],
  roles: [
    {
      title: "Associate Product Manager",
      track: "Track 1",
      readiness_score: 0.78,
      goal_alignment_score: 0.9,
      matched_skills: ["stakeholder_management", "data_analysis"],
      missing_skills: ["roadmapping"],
      reasoning: "יש לך התאמה חזקה בזכות ניסיון אנליטי",
      action_items: ["למד SQL", "בנה תיק מוצר"],
      alignment_to_goal: "מסלול מעבר טבעי",
    },
  ],
  input_hash: "abc123def456",
});

const enTranslateChat = async (messages) => {
  const user = messages.find((m) => m.role === "user")?.content || "{}";
  const { strings } = JSON.parse(user);
  return JSON.stringify({
    translations: strings.map((_, i) => `English text ${i}`),
  });
};

describe("career-analysis English guarantee (deterministic chokepoint reuse)", () => {
  it("translates the Hebrew prose, leaving titles / skill IDs / scores untouched", async () => {
    const r = hebrewResponse();
    expect(cvHasHebrew(r)).toBe(true);
    const out = await translateCvToEnglish(r, enTranslateChat);
    expect(cvHasHebrew(out)).toBe(false); // no Hebrew reaches the roadmap
    // internal fields other consumers of career_roles depend on are unchanged
    expect(out.qualification_level).toBe("Mid-Level");
    expect(out.roles[0].title).toBe("Associate Product Manager");
    expect(out.roles[0].track).toBe("Track 1");
    expect(out.roles[0].readiness_score).toBe(0.78);
    expect(out.roles[0].goal_alignment_score).toBe(0.9);
    expect(out.roles[0].matched_skills).toEqual([
      "stakeholder_management",
      "data_analysis",
    ]);
    expect(out.skill_gaps).toEqual(["project_management", "sql"]);
    expect(out.input_hash).toBe("abc123def456");
    // the user-facing prose is now Hebrew-free
    expect(cvHasHebrew(out.overall_assessment)).toBe(false);
    expect(cvHasHebrew(out.roles[0].reasoning)).toBe(false);
    expect(out.roles[0].action_items.every((a) => !cvHasHebrew(a))).toBe(true);
  });

  it("GUARANTEES no Hebrew even if the translate model fails (strip fallback)", async () => {
    const failChat = async () => {
      throw new Error("model unavailable");
    };
    const out = await translateCvToEnglish(hebrewResponse(), failChat);
    expect(cvHasHebrew(out)).toBe(false);
    expect(out.roles[0].readiness_score).toBe(0.78); // scores still intact
    expect(out.overall_assessment).toContain("3 years in the field"); // English remainder kept
  });

  it("is a no-op for an all-English analysis (zero added cost)", async () => {
    const english = {
      qualification_level: "Junior",
      overall_assessment: "You have a solid analytical foundation.",
      roles: [
        {
          title: "Data Analyst",
          reasoning: "You're a strong fit.",
          action_items: ["Learn SQL"],
        },
      ],
    };
    expect(cvHasHebrew(english)).toBe(false);
    const out = await translateCvToEnglish(english, async () => {
      throw new Error("should not be called");
    });
    expect(out).toBe(english);
  });
});

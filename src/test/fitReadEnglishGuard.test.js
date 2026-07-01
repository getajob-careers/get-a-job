// analyze-job-match fit-read English guarantee. The user-facing fit read (verdict,
// requirements, reasons, gaps, recommendation) is shown in chat but a Hebrew JD
// makes gpt-4o-mini echo Hebrew into those fields. The fix gates on Hebrew and runs
// the SHARED faithful translator over the result (the analysis-surface analogue of
// the CV render chokepoint). These tests pin the GUARANTEE at the composition level
// (no network): whatever the model returns, the fit read that reaches the user is
// Hebrew-free, and the numeric scoring fields are never touched.
import { describe, it, expect } from "vitest";
import { cvHasHebrew, translateCvToEnglish } from "@shared/cv-translate";

// A fit-read result shaped exactly like analyze-job-match's output, with the
// user-facing TEXT in Hebrew (as it comes back for a Hebrew JD) and the internal
// NUMERIC scoring fields set.
const hebrewResult = () => ({
  job_title: "מנהל מוצר",
  company: "חברה",
  match_score: 72,
  goal_alignment_score: 40,
  required_seniority: "Mid",
  req_years_min: 3,
  verdict: "יש לך התאמה חזקה לתפקיד with 3 years of experience",
  matched_requirements: [
    { requirement: "יכולת אנליטית גבוהה", reason: "ניסיון עם SQL ו-Python" },
    { requirement: "עבודה מול ממשקים מרובים", reason: "cross-functional work" },
  ],
  missing_requirements: [
    { requirement: "ניהול פרויקטים", gap: "חסר ניסיון מעשי" },
  ],
  recommendation: "כדאי לך לחזק ניסיון בניהול מוצר",
});

// Same shape, chat replies with same-length English translations.
const enTranslateChat = async (messages) => {
  const user = messages.find((m) => m.role === "user")?.content || "{}";
  const { strings } = JSON.parse(user);
  return JSON.stringify({
    translations: strings.map((_, i) => `English text ${i}`),
  });
};

describe("fit-read English guarantee (deterministic chokepoint reuse)", () => {
  it("translates the Hebrew fit read to English, preserving numeric scores", async () => {
    const r = hebrewResult();
    expect(cvHasHebrew(r)).toBe(true);
    const out = await translateCvToEnglish(r, enTranslateChat);
    expect(cvHasHebrew(out)).toBe(false); // no Hebrew reaches the user
    // internal scoring fields (numbers + enum) are untouched
    expect(out.match_score).toBe(72);
    expect(out.goal_alignment_score).toBe(40);
    expect(out.required_seniority).toBe("Mid");
    expect(out.req_years_min).toBe(3);
    // the user-facing fields are now Hebrew-free
    expect(cvHasHebrew(out.verdict)).toBe(false);
    expect(cvHasHebrew(out.matched_requirements[0].requirement)).toBe(false);
  });

  it("GUARANTEES no Hebrew even if the translate model fails (strip fallback)", async () => {
    const failChat = async () => {
      throw new Error("model unavailable");
    };
    const out = await translateCvToEnglish(hebrewResult(), failChat);
    expect(cvHasHebrew(out)).toBe(false); // Hebrew dropped, never shipped
    expect(out.match_score).toBe(72); // scores still intact
    // English-with-Hebrew mixed strings keep their English remainder
    expect(out.verdict).toContain("3 years of experience");
  });

  it("is a no-op for an all-English fit read (zero added cost)", async () => {
    const english = {
      match_score: 80,
      verdict: "You are a strong match for this role.",
      matched_requirements: [
        { requirement: "Analytical skills", reason: "SQL, Python" },
      ],
      missing_requirements: [
        {
          requirement: "Project management",
          gap: "no hands-on experience yet",
        },
      ],
      recommendation: "You'd strengthen your case with a PM course.",
    };
    expect(cvHasHebrew(english)).toBe(false);
    const out = await translateCvToEnglish(english, async () => {
      throw new Error("should not be called");
    });
    expect(out).toBe(english); // same object, no translate call
  });
});

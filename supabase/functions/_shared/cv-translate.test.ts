import { describe, it, expect, vi } from "vitest";
import {
  cvHasHebrew,
  translateCvToEnglish,
  type ChatFn,
} from "./cv-translate.ts";

const HEB_CV = {
  header: { name: "דנה כהן", subtitle: "מנתחת נתונים", email: "d@x.com" },
  summary: "מנתחת נתונים עם 3 שנות ניסיון.",
  professional_experiences: [
    {
      title: "מנתחת נתונים",
      company: "מכבי שירותי בריאות",
      dates: "2022-2024",
      bullets: [
        "הובלתי פרויקט שהגדיל שימור לקוחות ב-12%.",
        "Wrote SQL queries.",
      ],
    },
  ],
  skills: { domain: ["ניתוח נתונים"], technical: ["SQL"], tools: [] },
};

const ENGLISH_CV = {
  header: { name: "Jane Doe", subtitle: "Analyst", email: "j@x.com" },
  summary: "Analyst with 3 years of experience.",
  professional_experiences: [
    { title: "Analyst", company: "Acme", dates: "2022", bullets: ["Did X."] },
  ],
  skills: { domain: ["Data analysis"], technical: ["SQL"], tools: [] },
};

// A faithful reference translation for the Hebrew strings in HEB_CV.
const REF: Record<string, string> = {
  "דנה כהן": "Dana Cohen",
  "מנתחת נתונים": "Data Analyst",
  "מנתחת נתונים עם 3 שנות ניסיון.": "Data analyst with 3 years of experience.",
  "מכבי שירותי בריאות": "Maccabi Healthcare Services",
  "הובלתי פרויקט שהגדיל שימור לקוחות ב-12%.":
    "Led a project that increased customer retention by 12%.",
  "ניתוח נתונים": "Data analysis",
};
// chat that returns the reference translation, preserving order.
const refChat: ChatFn = async (messages) => {
  const { strings } = JSON.parse(messages[1].content) as { strings: string[] };
  return JSON.stringify({ translations: strings.map((s) => REF[s] ?? s) });
};

describe("cvHasHebrew", () => {
  it("detects Hebrew anywhere in the nested cv_data", () => {
    expect(cvHasHebrew(HEB_CV)).toBe(true);
    expect(cvHasHebrew(ENGLISH_CV)).toBe(false);
    expect(cvHasHebrew({ a: [{ b: "שלום" }] })).toBe(true);
    expect(cvHasHebrew({ a: ["only latin", 5, null] })).toBe(false);
  });
});

describe("translateCvToEnglish", () => {
  it("all-English CV: no-op, returns the SAME object and never calls the model", async () => {
    const chat = vi.fn<ChatFn>();
    const out = await translateCvToEnglish(ENGLISH_CV, chat);
    expect(out).toBe(ENGLISH_CV); // same reference (byte-identical no-op)
    expect(chat).not.toHaveBeenCalled();
  });

  it("translates every Hebrew field to English and preserves structure", async () => {
    const out = await translateCvToEnglish(HEB_CV, refChat);
    expect(cvHasHebrew(out)).toBe(false); // fully English now
    expect(out.header.name).toBe("Dana Cohen");
    expect(out.header.subtitle).toBe("Data Analyst");
    expect(out.professional_experiences[0].company).toBe(
      "Maccabi Healthcare Services",
    );
    // the already-English bullet is untouched; the Hebrew one is translated
    expect(out.professional_experiences[0].bullets).toEqual([
      "Led a project that increased customer retention by 12%.",
      "Wrote SQL queries.",
    ]);
    expect(out.skills.domain).toEqual(["Data analysis"]);
    // untranslated scalars carry through
    expect(out.professional_experiences[0].dates).toBe("2022-2024");
    // the input object is not mutated
    expect(HEB_CV.header.name).toBe("דנה כהן");
  });

  it("the metric (12%) survives translation unchanged (anti-fabrication smoke)", async () => {
    const out = await translateCvToEnglish(HEB_CV, refChat);
    expect(out.professional_experiences[0].bullets[0]).toContain("12%");
  });

  it("model failure: DROP the Hebrew rather than leak it (never ships Hebrew)", async () => {
    const boom: ChatFn = async () => {
      throw new Error("model down");
    };
    const out = await translateCvToEnglish(HEB_CV, boom, { retries: 1 });
    // A generated CV is ALWAYS English: a failed batch strips its Hebrew instead
    // of returning the source verbatim (which used to leak Hebrew to the render).
    expect(cvHasHebrew(out)).toBe(false);
    expect(HEB_CV.header.name).toBe("דנה כהן"); // input not mutated
  });

  it("wrong-length / malformed model output: DROP the Hebrew, never leak", async () => {
    const short: ChatFn = async () =>
      JSON.stringify({ translations: ["only one"] });
    expect(
      cvHasHebrew(await translateCvToEnglish(HEB_CV, short, { retries: 0 })),
    ).toBe(false);
    const junk: ChatFn = async () => "not json at all";
    expect(
      cvHasHebrew(await translateCvToEnglish(HEB_CV, junk, { retries: 0 })),
    ).toBe(false);
  });
});

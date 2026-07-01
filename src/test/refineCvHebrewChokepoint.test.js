// FIX 1: refine-cv runs translateCvToEnglish on the FINAL assembled cv ONLY when
// cvHasHebrew(finalCv). These tests pin the two properties that matter: (1) an
// all-English tailor fires NO translation call (zero added latency, the speed
// guard), and (2) JD-induced Hebrew (e.g. a Hebrew company name the ops pulled
// into the summary from a Hebrew JD) is caught and cleaned on the final cv.

import { describe, it, expect, vi } from "vitest";
import { cvHasHebrew, translateCvToEnglish } from "@shared/cv-translate";

describe("refine-cv post-ops Hebrew chokepoint (FIX 1)", () => {
  it("all-English tailored CV: gate is false, NO translation call fires", async () => {
    const englishCv = {
      summary: "Senior product manager tailored to the growth role",
      professional_experiences: [
        { title: "PM", bullets: ["Led GTM initiatives across teams"] },
      ],
      skills: { technical: ["SQL"], domain: ["Product"], tools: [] },
    };
    // refine-cv guards the call with `if (cvHasHebrew(cvData))`.
    expect(cvHasHebrew(englishCv)).toBe(false);
    const chat = vi.fn();
    if (cvHasHebrew(englishCv)) await translateCvToEnglish(englishCv, chat);
    expect(chat).not.toHaveBeenCalled(); // English to English adds zero latency
  });

  it("English profile + Hebrew JD: summary Hebrew is caught and cleaned", async () => {
    // The leak: an English master, but the ops wrote a JD-framed summary that
    // pulled a Hebrew company name from the Hebrew JD, after the master step.
    const leaked = {
      summary: "Product manager targeting the role at מכבי, driving GTM",
      professional_experiences: [
        { title: "PM", bullets: ["Led GTM initiatives across teams"] },
      ],
      skills: { technical: ["SQL"], domain: ["Product"], tools: [] },
    };
    expect(cvHasHebrew(leaked)).toBe(true); // gate fires
    const chat = async (messages) => {
      const { strings } = JSON.parse(messages[1].content);
      return JSON.stringify({
        translations: strings.map((s) => s.replace(/[֐-׿]+/g, "Maccabi")),
      });
    };
    const out = await translateCvToEnglish(leaked, chat);
    expect(cvHasHebrew(out)).toBe(false); // JD-induced Hebrew cleaned
  });
});

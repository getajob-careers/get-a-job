// cv-translate robustness: a generated CV is ALWAYS English. The old translate
// was one call that returned the SOURCE on any failure, leaking Hebrew on large
// CVs. These tests pin the new contract: chunk so a big CV cannot blow one call,
// retry, and DROP untranslatable Hebrew rather than leak it. The load-bearing
// assertion everywhere is cvHasHebrew(result) === false.

import { describe, it, expect } from "vitest";
import { translateCvToEnglish, cvHasHebrew } from "@shared/cv-translate";

// Configurable mock model. Records the batches it was asked to translate so we
// can assert chunking. `failWhenContains` throws for any batch holding that
// string (models a batch the model cannot handle). `throwOnce` fails the first
// call only (models a transient error). `echoHebrew` returns the source verbatim.
function makeChat({
  failWhenContains = null,
  throwOnce = false,
  echoHebrew = false,
} = {}) {
  const calls = [];
  let thrown = false;
  const chat = async (messages) => {
    const { strings } = JSON.parse(messages[1].content);
    calls.push(strings);
    if (throwOnce && !thrown) {
      thrown = true;
      throw new Error("transient model error");
    }
    if (failWhenContains && strings.includes(failWhenContains)) {
      throw new Error("model error / oversized batch");
    }
    if (echoHebrew) return JSON.stringify({ translations: strings });
    return JSON.stringify({
      translations: strings.map((_, i) => `English phrase ${i}`),
    });
  };
  return { chat, calls };
}

const bigHebrewCv = (n) => ({
  header: { name: "Dana Cohen" }, // Latin, must survive untouched
  summary: "מנהלת מוצר בכירה עם ניסיון רב",
  professional: Array.from({ length: n }, (_, i) => ({
    title: `מנהל פרויקטים ${i}`,
    company: "מכבי שירותי בריאות",
    bullets: [
      `ניהול צוות של ${i} אנשים והובלת תהליכים`,
      `אחריות על תקציב פרויקט`,
    ],
  })),
});

describe("translateCvToEnglish robustness", () => {
  it("is a zero-cost no-op for an all-English CV (no model call)", async () => {
    const { chat, calls } = makeChat();
    const cv = { summary: "Senior product manager", skills: { core: ["SQL"] } };
    const out = await translateCvToEnglish(cv, chat);
    expect(out).toBe(cv); // same object
    expect(calls).toHaveLength(0);
  });

  it("translates a small Hebrew CV to clean English", async () => {
    const { chat } = makeChat();
    const cv = {
      summary: "מנהל מוצר",
      professional: [{ title: "מפתח תוכנה" }],
    };
    const out = await translateCvToEnglish(cv, chat);
    expect(cvHasHebrew(out)).toBe(false);
    expect(out.summary).toMatch(/English phrase/);
  });

  it("CHUNKS a large CV so no single call is oversized", async () => {
    const { chat, calls } = makeChat();
    const cv = bigHebrewCv(60); // ~180+ distinct Hebrew strings
    const out = await translateCvToEnglish(cv, chat, { batchSize: 40 });
    expect(cvHasHebrew(out)).toBe(false);
    expect(calls.length).toBeGreaterThan(1); // batched, not one giant call
    for (const batch of calls) expect(batch.length).toBeLessThanOrEqual(40);
  });

  it("RETRIES a transient batch failure and recovers", async () => {
    const { chat, calls } = makeChat({ throwOnce: true });
    const cv = { summary: "מנהל מוצר בכיר" };
    const out = await translateCvToEnglish(cv, chat, { retries: 2 });
    expect(cvHasHebrew(out)).toBe(false);
    expect(calls.length).toBe(2); // first threw, second succeeded
  });

  it("DROPS untranslatable Hebrew rather than leaking it (the failure case)", async () => {
    // One batch permanently fails; the rest translate. The old code would return
    // the whole source (Hebrew leak). New code must strip the failed batch's
    // Hebrew and still yield a fully-English CV.
    const cv = bigHebrewCv(60);
    const doomed = cv.professional[0].bullets[0]; // a real Hebrew string in the CV
    const { chat } = makeChat({ failWhenContains: doomed });
    const out = await translateCvToEnglish(cv, chat, {
      batchSize: 40,
      retries: 1,
    });

    expect(cvHasHebrew(out)).toBe(false); // <- the guarantee: NO Hebrew anywhere
    expect(out.header.name).toBe("Dana Cohen"); // Latin content preserved
  });

  it("never ships Hebrew even if the model echoes the source back", async () => {
    const { chat } = makeChat({ echoHebrew: true });
    const cv = {
      summary: "ניהול צוות פיתוח",
      professional: [{ title: "אנליסט" }],
    };
    const out = await translateCvToEnglish(cv, chat);
    expect(cvHasHebrew(out)).toBe(false); // echoed Hebrew is stripped, not shipped
  });
});

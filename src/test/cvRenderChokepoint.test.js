// PIECE 4: the render-cv chokepoint. render-cv composes two deterministic guards
// just before render: normalizeCvDataBullets (voice/caps) and the Hebrew gate
// (translateCvToEnglish with a model, or the no-LLM stripCvHebrew fallback). These
// tests pin the guarantee at the composition level (no network): (a) an already-
// normalized English CV is byte-identical through the chokepoint, (b) a raw-voice
// + Hebrew CV is normalized + Hebrew-free, (c) after the chokepoint NO bullet has
// raw first-person voice or Hebrew, whatever the input.
import { describe, it, expect } from "vitest";
import { buildMasterCvData, normalizeCvDataBullets } from "@shared/cv-master";
import { cvHasHebrew, stripCvHebrew } from "@shared/cv-translate";

// The deterministic (no-model) chokepoint, exactly as render-cv runs it when no
// OpenAI key is present: normalize bullets, then strip Hebrew if any remains.
function chokepoint(cvData) {
  const normalized = normalizeCvDataBullets(cvData);
  return cvHasHebrew(normalized) ? stripCvHebrew(normalized) : normalized;
}

const allBullets = (cv) =>
  [
    "professional_experiences",
    "military_experiences",
    "volunteering_experiences",
    "leadership_experiences",
  ].flatMap((k) => (cv[k] || []).flatMap((e) => e.bullets || []));

describe("normalizeCvDataBullets (whole cv_data, all buckets)", () => {
  const raw = {
    header: { name: "Eli" },
    professional_experiences: [
      {
        title: "CS",
        company: "Guardio",
        bullets: [
          "I am comparing Claude in a bake-off",
          "wrote a fetcher in Python",
        ],
      },
    ],
    military_experiences: [
      {
        title: "Soldier",
        unit: "IDF",
        bullets: ["analyzed signals over 3 months"],
      },
    ],
    leadership_experiences: [
      { title: "Lead", organization: "Club", bullets: ["We built 15 events"] },
    ],
    skills: { domain: [], technical: [], tools: [] },
  };

  it("normalizes bullets across every bucket, preserving content/numbers/tools", () => {
    const out = normalizeCvDataBullets(raw);
    expect(out.professional_experiences[0].bullets).toEqual([
      "Comparing Claude in a bake-off",
      "Wrote a fetcher in Python",
    ]);
    expect(out.military_experiences[0].bullets).toEqual([
      "Analyzed signals over 3 months",
    ]);
    expect(out.leadership_experiences[0].bullets).toEqual(["Built 15 events"]);
    // content preserved
    expect(JSON.stringify(out)).toContain("Python");
    expect(JSON.stringify(out)).toContain("3 months");
    expect(JSON.stringify(out)).toContain("15 events");
  });

  it("does not mutate the input object", () => {
    const before = JSON.stringify(raw);
    normalizeCvDataBullets(raw);
    expect(JSON.stringify(raw)).toBe(before);
  });

  it("(a) IDEMPOTENT: a CV already built through buildMasterCvData is deep-equal", () => {
    const master = buildMasterCvData(
      { full_name: "Eli", skills: ["SQL"] },
      [
        {
          id: "e1",
          title: "CS",
          company: "Guardio",
          type: "professional",
          bullets: ["I am comparing Claude", "wrote a fetcher"],
        },
      ],
      [],
      "eli@example.com",
    );
    // master bullets are already normalized at build time
    expect(master.professional_experiences[0].bullets).toEqual([
      "Comparing Claude",
      "Wrote a fetcher",
    ]);
    // running the chokepoint normalizer again changes NOTHING
    expect(normalizeCvDataBullets(master)).toEqual(master);
    expect(normalizeCvDataBullets(normalizeCvDataBullets(master))).toEqual(
      master,
    );
  });
});

describe("stripCvHebrew (deterministic no-LLM Hebrew guarantee)", () => {
  it("removes Hebrew from cv_data, keeping Latin/number remainders", () => {
    const cv = {
      summary: "מנהל מוצר with 5 years", // Hebrew + English + number
      professional_experiences: [
        { title: "PM", company: "Wix", bullets: ["הובלתי צוות of 8"] },
      ],
      skills: { domain: [], technical: [], tools: [] },
    };
    const out = stripCvHebrew(cv);
    expect(cvHasHebrew(out)).toBe(false);
    expect(out.summary).toContain("with 5 years");
    expect(out.professional_experiences[0].bullets[0]).toContain("of 8");
  });

  it("is a no-op (same object) for an all-English CV", () => {
    const cv = {
      summary: "All English",
      skills: { domain: [], technical: [], tools: [] },
    };
    expect(stripCvHebrew(cv)).toBe(cv);
  });
});

describe("render chokepoint composition (the guarantee)", () => {
  it("(a) already-clean English CV passes through byte-identical", () => {
    const clean = {
      header: { name: "Eli" },
      summary: "Product manager with 5 years of experience.",
      professional_experiences: [
        {
          title: "PM",
          company: "Wix",
          bullets: ["Built 15 dashboards", "Led a team of 8"],
        },
      ],
      skills: { domain: ["Product"], technical: ["SQL"], tools: ["Figma"] },
      languages: ["English"],
    };
    expect(chokepoint(clean)).toEqual(clean);
    expect(cvHasHebrew(chokepoint(clean))).toBe(false);
  });

  it("(b) a raw-voice + Hebrew CV comes out normalized AND Hebrew-free", () => {
    const bad = {
      header: { name: "Eli" },
      summary: "מנהל מוצר, product manager",
      professional_experiences: [
        {
          title: "PM",
          company: "Wix",
          bullets: [
            "I am leading the growth team",
            "ניתחתי נתונים over 3 months",
            "wrote a fetcher in Python",
          ],
        },
      ],
      skills: { domain: [], technical: [], tools: [] },
    };
    const out = chokepoint(bad);
    expect(cvHasHebrew(out)).toBe(false);
    const bullets = out.professional_experiences[0].bullets;
    expect(bullets[0]).toBe("Leading the growth team"); // first-person stripped
    expect(bullets[2]).toBe("Wrote a fetcher in Python"); // capitalized
    expect(JSON.stringify(out)).toContain("Python");
    expect(JSON.stringify(out)).toContain("3 months");
  });

  it("(c) NO path leaves raw first-person voice, lowercase starts, or Hebrew", () => {
    const messy = {
      professional_experiences: [
        {
          title: "X",
          company: "Y",
          bullets: ["I am comparing X", "analyzed the funnel", "עברית here"],
        },
      ],
      military_experiences: [
        { title: "S", unit: "IDF", bullets: ["I led 5 missions"] },
      ],
      skills: { domain: [], technical: [], tools: [] },
    };
    const out = chokepoint(messy);
    expect(cvHasHebrew(out)).toBe(false);
    for (const b of allBullets(out)) {
      if (!b) continue;
      expect(b).not.toMatch(/^\s*[a-z]/); // first letter is capitalized
      expect(b).not.toMatch(
        /^\s*I(?:['’]m|['’]ve|\s+am|\s+have|\s+led|\s+built)/,
      ); // no leftover first-person opener
    }
  });
});

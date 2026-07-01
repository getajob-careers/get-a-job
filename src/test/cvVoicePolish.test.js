// PIECE 1 (shared canonical schema) + PIECE 2 (deterministic bullet voice/caps
// polish in buildMasterCvData). Proves:
//   - the polish normalizer is content-preserving and idempotent, fixes the real
//     casually-written bullets, and guards the traps (IT, I/O, proper nouns,
//     possessive+noun);
//   - buildMasterCvData applies it to bullets and leaves every OTHER field
//     byte-identical (header, summary, dates, org keys, education, skills,
//     languages, experience_id);
//   - PIECE 1 is behavior-preserving: already-clean bullets pass through
//     unchanged, so the consolidation changes nothing but the intended voice/caps.
import { describe, it, expect } from "vitest";
import { buildMasterCvData } from "@/lib/cvDataAdapter"; // re-export of @shared/cv-master
import { normalizeBulletVoice } from "@shared/cv-master";
import { MASTER_ORG_KEY, EXPERIENCE_BUCKETS } from "@shared/cv-schema";

// ─────────────────────────── PIECE 1: shared schema ───────────────────────────
describe("cv-schema (PIECE 1: one shared canonical shape, no drift)", () => {
  it("org-key mapping is the single source both sides use (unchanged values)", () => {
    expect(MASTER_ORG_KEY).toEqual({
      professional: "company",
      military: "unit",
      volunteering: "organization",
      leadership: "organization",
    });
  });
  it("bucket keys are canonical and in render order", () => {
    expect(EXPERIENCE_BUCKETS.map((b) => b.cvKey)).toEqual([
      "professional_experiences",
      "military_experiences",
      "volunteering_experiences",
      "leadership_experiences",
    ]);
  });
});

// ───────────────────── PIECE 2: normalizer unit behavior ──────────────────────
describe("normalizeBulletVoice (idempotent, content-preserving)", () => {
  // Eli's real profile bullets (the reported problems)
  const REAL = [
    {
      in: "I am comparing Claude, OpenAI, Gemini, and others in a bake-off using scoring rubrics to measure success for responses.",
      out: "Comparing Claude, OpenAI, Gemini, and others in a bake-off using scoring rubrics to measure success for responses.",
    },
    {
      in: "analyzed all our comments on social media platforms over 3 months and found the gaps in our coverage, made smart keyword triggers through Notion, Claude, and Napoleon Cat — saw our responses jump up 60% within a week and relevance jump up to 98%",
      out: "Analyzed all our comments on social media platforms over 3 months and found the gaps in our coverage, made smart keyword triggers through Notion, Claude, and Napoleon Cat — saw our responses jump up 60% within a week and relevance jump up to 98%",
    },
    {
      in: "wrote a fetcher in Python — to be able to see which of our customers at Guardio was most likely to have issues",
      out: "Wrote a fetcher in Python — to be able to see which of our customers at Guardio was most likely to have issues",
    },
  ];

  it("fixes the real casually-written bullets (person + capitalization)", () => {
    for (const c of REAL) expect(normalizeBulletVoice(c.in)).toBe(c.out);
  });

  it("preserves every number, percentage, and tool name in the rewrite", () => {
    const out = normalizeBulletVoice(REAL[1].in);
    for (const token of [
      "3 months",
      "60%",
      "98%",
      "Notion",
      "Claude",
      "Napoleon Cat",
    ]) {
      expect(out).toContain(token);
    }
    expect(normalizeBulletVoice(REAL[2].in)).toContain("Python");
  });

  it("strips leading first-person openers followed by a verb", () => {
    expect(normalizeBulletVoice("I am comparing X")).toBe("Comparing X");
    expect(normalizeBulletVoice("I'm building Y")).toBe("Building Y");
    expect(normalizeBulletVoice("I've led Z")).toBe("Led Z");
    expect(normalizeBulletVoice("I have overseen W")).toBe("Overseen W");
    expect(normalizeBulletVoice("I led the team")).toBe("Led the team");
    expect(normalizeBulletVoice("I coordinated 3 events")).toBe(
      "Coordinated 3 events",
    );
    expect(normalizeBulletVoice("We built 15 dashboards")).toBe(
      "Built 15 dashboards",
    );
  });

  it("GUARDS the traps: never over-strips", () => {
    // acronym / initialism starting with I
    expect(normalizeBulletVoice("IT operations were consolidated")).toBe(
      "IT operations were consolidated",
    );
    expect(normalizeBulletVoice("I/O throughput improved by 40%")).toBe(
      "I/O throughput improved by 40%",
    );
    // possessive + noun (not a verb) -> subject NOT stripped
    expect(normalizeBulletVoice("My role spanned three teams")).toBe(
      "My role spanned three teams",
    );
    expect(normalizeBulletVoice("Our team delivered 5 features")).toBe(
      "Our team delivered 5 features",
    );
    // proper noun after subject (uppercase) -> not stripped
    expect(normalizeBulletVoice("We Work Remotely was the client")).toBe(
      "We Work Remotely was the client",
    );
    // no meaningful verb -> preserved whole (empty-after-strip guard territory)
    expect(normalizeBulletVoice("I am")).toBe("I am");
  });

  it("only capitalizes when there is no leading subject", () => {
    expect(normalizeBulletVoice("analyzed the funnel")).toBe(
      "Analyzed the funnel",
    );
    expect(normalizeBulletVoice("Already Capitalized bullet")).toBe(
      "Already Capitalized bullet",
    );
  });

  it("is IDEMPOTENT (N runs == 1 run)", () => {
    const inputs = [
      ...REAL.map((c) => c.in),
      "I am comparing X",
      "We built 15 dashboards",
      "IT operations were consolidated",
      "My role spanned three teams",
      "analyzed the funnel",
    ];
    for (const s of inputs) {
      const once = normalizeBulletVoice(s);
      const twice = normalizeBulletVoice(once);
      const thrice = normalizeBulletVoice(twice);
      expect(twice).toBe(once);
      expect(thrice).toBe(once);
    }
  });

  it("never returns empty for a non-empty bullet", () => {
    for (const s of ["I am", "We", "I", "Our", "I am comparing X"]) {
      expect(normalizeBulletVoice(s).trim().length).toBeGreaterThan(0);
    }
  });
});

// ─────────────── PIECE 2: buildMasterCvData applies polish to bullets only ─────
describe("buildMasterCvData applies the polish to bullets and nothing else", () => {
  const profile = {
    full_name: "Eli Englard",
    email: "eli@example.com",
    headline: "Builder",
    summary: "A factual summary that is not a bullet.",
    skills: ["Customer Success", "SQL", "Figma"],
    languages: ["English", "Hebrew"],
  };
  const experiences = [
    {
      id: "e-guardio",
      title: "Customer Success Specialist",
      company: "Guardio",
      type: "professional",
      bullets: [
        "I am comparing Claude, OpenAI, Gemini in a bake-off",
        "analyzed all our comments over 3 months and saw relevance jump to 98%",
        "wrote a fetcher in Python",
      ],
      start_date: "2024-01",
      end_date: "",
      is_current: true,
    },
  ];
  const education = [
    {
      institution: "Reichman University",
      degree_type: "Bachelor's Degree",
      field_of_study: "Business Administration",
      start_date: "2023",
      is_current: true,
    },
  ];

  const master = buildMasterCvData(
    profile,
    experiences,
    education,
    profile.email,
  );
  const exp = master.professional_experiences[0];

  it("normalizes the bullets (voice + caps), preserving claims/numbers/tools", () => {
    expect(exp.bullets).toEqual([
      "Comparing Claude, OpenAI, Gemini in a bake-off",
      "Analyzed all our comments over 3 months and saw relevance jump to 98%",
      "Wrote a fetcher in Python",
    ]);
    expect(exp.bullets[1]).toContain("98%");
    expect(exp.bullets[1]).toContain("3 months");
    expect(exp.bullets[2]).toContain("Python");
  });

  it("leaves every NON-bullet field byte-identical", () => {
    expect(master.header).toEqual({
      name: "Eli Englard",
      subtitle: "Builder",
      email: "eli@example.com",
      phone: "",
      location: "",
      linkedin: "",
    });
    expect(master.summary).toBe("A factual summary that is not a bullet.");
    expect(exp.title).toBe("Customer Success Specialist");
    expect(exp.company).toBe("Guardio"); // org key unchanged (via shared schema)
    expect(exp.dates).toBe("Jan 2024 – Present");
    expect(exp.experience_id).toBe("e-guardio");
    expect(master.education[0]).toEqual({
      institution: "Reichman University",
      degree: "Bachelor's Degree",
      field_of_study: "Business Administration",
      dates: "2023 – Present",
    });
    expect(master.skills).toEqual({
      domain: ["Customer Success", "SQL", "Figma"],
      technical: [],
      tools: [],
    });
    expect(master.languages).toEqual(["English", "Hebrew"]);
  });

  it("PIECE 1 byte-identical: already-clean bullets pass through unchanged", () => {
    const clean = buildMasterCvData(
      profile,
      [{ ...experiences[0], bullets: ["Built things", "Shipped things"] }],
      education,
      profile.email,
    );
    expect(clean.professional_experiences[0].bullets).toEqual([
      "Built things",
      "Shipped things",
    ]);
  });
});

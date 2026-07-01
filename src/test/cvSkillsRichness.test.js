// PIECE 3: deterministic skills categorization (Approach A, no LLM) + restored
// section richness (honors, coursework, academic projects, certifications,
// projects). Proves the categorizer is sensible across several profile shapes
// (business, data, marketing, engineering), dedups case-insensitively, safe-
// defaults unknowns to domain, caps each group, and that buildMasterCvData sources
// skills from profile + experience skills and restores the dropped sections while
// staying byte-identical for callers that pass no extras.
import { describe, it, expect } from "vitest";
import { categorizeSkills } from "@shared/cv-skills";
import { buildMasterCvData } from "@/lib/cvDataAdapter";

describe("categorizeSkills (Approach A dictionary, no LLM)", () => {
  it("business + tech profile: SQL/Python surface in technical, tools split out", () => {
    const s = categorizeSkills([
      "User-facing operations",
      "Customer experience & retention",
      "Process improvement",
      "Excel",
      "Notion",
      "Figma (basic)",
      "SQL",
      "Python",
      "React",
      "typescript",
      "REST APIs",
      "Cursor",
      "Claude / Claude Code",
      "napoleoncat",
    ]);
    expect(s.technical).toEqual(
      expect.arrayContaining([
        "SQL",
        "Python",
        "React",
        "TypeScript",
        "REST APIs",
      ]),
    );
    expect(s.tools).toEqual(
      expect.arrayContaining([
        "Excel",
        "Notion",
        "Figma",
        "Cursor",
        "Claude",
        "Napoleon Cat",
      ]),
    );
    expect(s.domain).toEqual(
      expect.arrayContaining([
        "User-facing operations",
        "Customer experience & retention",
        "Process improvement",
      ]),
    );
    // technical is no longer empty (the whole point)
    expect(s.technical.length).toBeGreaterThan(0);
  });

  it("data-analyst profile: languages + libs -> technical, BI tools -> tools", () => {
    const s = categorizeSkills([
      "Data Analysis",
      "SQL",
      "Python",
      "R",
      "pandas",
      "Tableau",
      "Power BI",
      "Excel",
      "Statistics",
    ]);
    expect(s.technical).toEqual(
      expect.arrayContaining(["SQL", "Python", "R", "Pandas"]),
    );
    expect(s.tools).toEqual(
      expect.arrayContaining(["Tableau", "Power BI", "Excel"]),
    );
    expect(s.domain).toEqual(
      expect.arrayContaining(["Data Analysis", "Statistics"]),
    );
  });

  it("marketing profile (no code): platforms -> tools, rest -> domain, technical empty", () => {
    const s = categorizeSkills([
      "SEO",
      "Content Marketing",
      "HubSpot",
      "Google Analytics",
      "Mailchimp",
      "Brand Strategy",
    ]);
    expect(s.technical).toEqual([]); // not forced to invent technical skills
    expect(s.tools).toEqual(
      expect.arrayContaining(["HubSpot", "Google Analytics", "Mailchimp"]),
    );
    expect(s.domain).toEqual(
      expect.arrayContaining(["SEO", "Content Marketing", "Brand Strategy"]),
    );
  });

  it("dedups case-insensitively and by brand variant (canonical display kept)", () => {
    expect(
      categorizeSkills(["TypeScript", "typescript", "SQL", "sql"]).technical,
    ).toEqual(["TypeScript", "SQL"]);
    expect(
      categorizeSkills(["Claude", "Claude / Claude Code", "claude"]).tools,
    ).toEqual(["Claude"]);
  });

  it("safe-defaults unknown skills to domain (never guesses technical)", () => {
    const s = categorizeSkills([
      "Stakeholder Management",
      "Conflict Resolution",
      "Xylophone Ops",
    ]);
    expect(s.domain).toEqual(
      expect.arrayContaining([
        "Stakeholder Management",
        "Conflict Resolution",
        "Xylophone Ops",
      ]),
    );
    expect(s.technical).toEqual([]);
    expect(s.tools).toEqual([]);
  });

  it("caps each group and preserves profile-first order", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Capability ${i}`);
    const s = categorizeSkills(["Leadership", ...many]);
    expect(s.domain.length).toBeLessThanOrEqual(16);
    expect(s.domain[0]).toBe("Leadership");
  });
});

describe("buildMasterCvData (Piece 3: categorized skills + restored sections)", () => {
  const profile = {
    full_name: "Eli Englard",
    email: "eli@example.com",
    headline: "Builder",
    summary: "A factual summary.",
    skills: ["Customer Success", "Excel"], // one domain, one tool
    languages: ["English"],
  };
  const experiences = [
    {
      id: "e1",
      title: "CS Specialist",
      company: "Guardio",
      type: "professional",
      bullets: ["Analyzed journeys"],
      skills: ["SQL", "Python", "Cursor", "Claude"], // technical + tools live here
      start_date: "2024-01",
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
      honors: ["Dean's List"],
      relevant_coursework: ["Financial Modeling", "Corporate Finance"],
      academic_projects: ["Startup pitch competition"],
    },
  ];

  it("sources skills from profile UNION experience skills, categorized", () => {
    const m = buildMasterCvData(profile, experiences, education, profile.email);
    expect(m.skills.technical).toEqual(
      expect.arrayContaining(["SQL", "Python"]),
    );
    expect(m.skills.tools).toEqual(
      expect.arrayContaining(["Excel", "Cursor", "Claude"]),
    );
    expect(m.skills.domain).toEqual(["Customer Success"]);
  });

  it("restores education richness (coursework, academic projects, honors)", () => {
    const m = buildMasterCvData(profile, experiences, education, profile.email);
    expect(m.education[0].relevant_coursework).toEqual([
      "Financial Modeling",
      "Corporate Finance",
    ]);
    expect(m.education[0].academic_projects).toEqual([
      "Startup pitch competition",
    ]);
    expect(m.honors_and_awards).toEqual(["Dean's List"]);
  });

  it("emits projects + certifications from extras (renderer shape)", () => {
    const m = buildMasterCvData(
      profile,
      experiences,
      education,
      profile.email,
      {
        projects: [
          {
            name: "Get A Job",
            url: "https://getajob.careers",
            description: "career OS",
          },
        ],
        certifications: [
          {
            name: "AWS Cloud Practitioner",
            issuer: "Amazon",
            date_earned: "2024",
          },
        ],
      },
    );
    expect(m.projects).toEqual([
      {
        name: "Get A Job",
        url: "https://getajob.careers",
        description: "career OS",
      },
    ]);
    expect(m.certifications).toEqual([
      { name: "AWS Cloud Practitioner", issuer: "Amazon", date_earned: "2024" },
    ]);
  });

  it("emits NO optional-section keys when the data is absent (lean output)", () => {
    const plainEdu = [
      {
        institution: "X",
        degree_type: "BA",
        field_of_study: "Y",
        start_date: "2023",
        is_current: true,
      },
    ];
    const m = buildMasterCvData(profile, experiences, plainEdu, profile.email);
    expect(m).not.toHaveProperty("honors_and_awards");
    expect(m).not.toHaveProperty("certifications");
    expect(m).not.toHaveProperty("projects");
    expect(m.education[0]).not.toHaveProperty("relevant_coursework");
    expect(m.education[0]).not.toHaveProperty("academic_projects");
  });
});

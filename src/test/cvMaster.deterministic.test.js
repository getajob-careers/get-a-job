import { describe, it, expect } from "vitest";
// Imported via the re-export in cvDataAdapter, which pulls from the shared
// @shared/cv-master module. This also proves the @shared alias resolves under
// vitest and that the client and engine share one builder.
import { buildMasterCvData } from "@/lib/cvDataAdapter";

// The deterministic master builder must preserve structured data faithfully:
// never drop an experience, always carry education field_of_study, and emit the
// canonical skills shape {domain, technical, tools} with no inner languages key.
describe("buildMasterCvData (deterministic master)", () => {
  const profile = {
    full_name: "Test User",
    email: "t@example.com",
    headline: "Builder",
    summary: "A factual summary.",
    skills: ["Customer Success", "SQL", "Figma"],
    languages: ["English", "Hebrew"],
  };
  const experiences = [
    {
      id: "e-pro",
      title: "Engineer",
      company: "Acme",
      type: "professional",
      bullets: ["Built things", "Shipped things"],
      start_date: "2022-01",
      end_date: "",
      is_current: true,
    },
    {
      id: "e-mil",
      title: "Combat Soldier",
      company: "IDF Nahal Brigade",
      type: "military",
      bullets: ["Led a team"],
      start_date: "2018-01",
      end_date: "2021-01",
      is_current: false,
    },
    {
      id: "e-vol",
      title: "Volunteer Mentor",
      company: "Helping Foundation",
      type: "volunteering",
      bullets: ["Mentored students"],
      start_date: "2020",
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
    {
      institution: "Torah Academy",
      degree_type: "",
      field_of_study: "General Studies",
      start_date: "2014",
      end_date: "2018",
    },
  ];

  const master = buildMasterCvData(
    profile,
    experiences,
    education,
    profile.email,
  );

  it("preserves every experience (none dropped), across the right buckets", () => {
    const total =
      master.professional_experiences.length +
      master.military_experiences.length +
      master.volunteering_experiences.length +
      master.leadership_experiences.length;
    expect(total).toBe(experiences.length);
    expect(master.professional_experiences).toHaveLength(1);
    expect(master.military_experiences).toHaveLength(1);
    expect(master.volunteering_experiences).toHaveLength(1);
  });

  it("stamps experience_id from the source rows (so reframe can address bullets)", () => {
    expect(master.professional_experiences[0].experience_id).toBe("e-pro");
    expect(master.military_experiences[0].experience_id).toBe("e-mil");
  });

  it("carries field_of_study on every education entry", () => {
    expect(master.education).toHaveLength(2);
    for (const ed of master.education) {
      expect(ed).toHaveProperty("field_of_study");
    }
    expect(master.education[0].field_of_study).toBe("Business Administration");
    expect(master.education[0].degree).toBe("Bachelor's Degree");
    expect(master.education[1].field_of_study).toBe("General Studies");
  });

  it("emits the canonical skills shape {domain, technical, tools} with no languages key", () => {
    expect(Object.keys(master.skills).sort()).toEqual(
      ["domain", "technical", "tools"].sort(),
    );
    expect(master.skills).not.toHaveProperty("languages");
    // Skills are now CATEGORIZED (Piece 3): SQL -> technical, Figma -> tools,
    // the capability stays in domain.
    expect(master.skills.domain).toEqual(["Customer Success"]);
    expect(master.skills.technical).toEqual(["SQL"]);
    expect(master.skills.tools).toEqual(["Figma"]);
  });
});

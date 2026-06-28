import { describe, it, expect } from "vitest";
import { fromCvData, toCvData } from "@/lib/cvDataAdapter";

// The faithful-shim contract: the CV studio adapter must round-trip the
// CANONICAL application_cvs.cv_data shape (the one generate-tailored-cv /
// refine-cv / render-cv use) without renaming or dropping anything. The only
// permitted transforms are id-injection and bullet string<->{id,text}, both of
// which toCvData reverses — so toCvData(fromCvData(canonical)) must deep-equal
// the original canonical.
//
// This fixture deliberately includes every section that the pre-rewrite adapter
// silently diverged on: military (unit), volunteering/leadership (organization),
// education extras (gpa/coursework/academic_projects/activities), language
// proficiency, skills sub-categories (tools/technical), plus honors / certs /
// projects and a per-entry extra (employment_type).
const CANONICAL = {
  header: {
    name: "Dana Cohen",
    subtitle: "Data Analyst",
    email: "dana@x.com",
    phone: "+972-50-000",
    location: "Tel Aviv",
    linkedin: "linkedin.com/in/dana",
  },
  summary: "Analyst with 3 years in fintech.",
  professional_experiences: [
    {
      title: "Analyst",
      company: "Acme",
      dates: "2023 – Present",
      employment_type: "full_time", // extra: must survive
      bullets: ["Built dashboards", "Cut reporting time 40%"],
    },
  ],
  military_experiences: [
    {
      title: "Sergeant",
      unit: "IDF 8200",
      dates: "2018 – 2021",
      bullets: ["Led a team of 12"],
    },
  ],
  volunteering_experiences: [
    {
      title: "Mentor",
      organization: "Hi-Tech NGO",
      dates: "2022",
      bullets: ["Mentored 5 students"],
    },
  ],
  leadership_experiences: [
    {
      title: "President",
      organization: "Econ Society",
      dates: "2022",
      bullets: ["Ran weekly events"],
    },
  ],
  education: [
    {
      institution: "TAU",
      degree: "B.A.",
      field_of_study: "Economics",
      dates: "2021",
      gpa: "3.8",
      coursework: ["Econometrics", "Statistics"], // extra: must survive
      academic_projects: ["Inflation model"], // extra: must survive
      activities: ["Debate club"], // extra: must survive
    },
  ],
  skills: {
    domain: ["Financial modeling"],
    tools: ["Excel", "Tableau"],
    technical: ["SQL", "Python"],
    languages: ["Hebrew", "English"],
  },
  languages: [
    { language: "Hebrew", proficiency: "Native" }, // proficiency must survive
    { language: "English", proficiency: "Fluent" },
  ],
  honors_and_awards: [{ name: "Dean's List", description: "2021" }],
  certifications: [
    { name: "CFA L1", issuer: "CFA Inst.", date_earned: "2023" },
  ],
  projects: [
    { name: "Budget app", url: "git/x", bullets: ["React + Supabase"] },
  ],
};

describe("cvDataAdapter faithful round-trip", () => {
  it("canonical → fromCvData → toCvData equals canonical (lossless)", () => {
    const out = toCvData(fromCvData(CANONICAL));
    expect(out).toEqual(CANONICAL);
  });

  it("preserves canonical keys explicitly (guards against dialect regressions)", () => {
    const out = toCvData(fromCvData(CANONICAL));
    expect(out.education[0].field_of_study).toBe("Economics"); // not `field`
    expect(out.education[0].gpa).toBe("3.8"); // not dropped
    expect(out.education[0].coursework).toEqual(["Econometrics", "Statistics"]);
    expect(out.military_experiences[0].unit).toBe("IDF 8200"); // not `company`
    expect(out.volunteering_experiences[0].organization).toBe("Hi-Tech NGO");
    expect(out.leadership_experiences[0].organization).toBe("Econ Society");
    expect(out.skills.tools).toEqual(["Excel", "Tableau"]); // not flattened
    expect(out.skills.technical).toEqual(["SQL", "Python"]);
    expect(out.languages[0]).toEqual({
      language: "Hebrew",
      proficiency: "Native",
    });
    expect(out.professional_experiences[0].employment_type).toBe("full_time");
    expect(out.certifications[0]).toEqual(CANONICAL.certifications[0]);
    expect(out.projects[0]).toEqual(CANONICAL.projects[0]);
    expect(out.honors_and_awards[0]).toEqual(CANONICAL.honors_and_awards[0]);
  });

  it("a targeted edit changes ONLY its field, preserving everything else", () => {
    const m = fromCvData(CANONICAL);
    m.experiences[0].bullets[0].text = "Built executive dashboards"; // one edit
    const out = toCvData(m);
    expect(out.professional_experiences[0].bullets[0]).toBe(
      "Built executive dashboards",
    );
    // unrelated sections still byte-identical:
    expect(out.military_experiences).toEqual(CANONICAL.military_experiences);
    expect(out.skills).toEqual(CANONICAL.skills);
    expect(out.education).toEqual(CANONICAL.education);
  });
});

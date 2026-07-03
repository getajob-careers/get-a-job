// QA2 divergence fix B — CV render parity. The downloaded PDF (build-pdf.ts,
// pdf-lib) and the on-screen Studio preview (CVStudioView, React) render the SAME
// cv_data through two different renderers. They drifted: the Studio dropped
// certifications, projects, honors, and skills.tools/technical, so the preview
// looked worse than the download. This test walks every renderable section and
// asserts each is (a) extracted into the Studio model by fromCvData, (b)
// rendered by the PDF builder, and (c) rendered by the Studio view — so no
// section can silently diverge again. When you add a new cv_data section to the
// PDF, add it here and the Studio-side assertion fails until the preview renders it.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { fromCvData } from "@/lib/cvDataAdapter";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pdfSrc = readFileSync(
  resolve(root, "supabase/functions/_shared/cv-templates/build-pdf.ts"),
  "utf8",
);
const viewSrc = readFileSync(
  resolve(root, "src/components/cv-studio/CVStudioView.jsx"),
  "utf8",
);

// cv_data with EVERY renderable section populated.
const FULL_CV = {
  header: { name: "A", subtitle: "H", email: "a@b.c" },
  summary: "Sum",
  professional_experiences: [{ title: "Eng", company: "X", bullets: ["did"] }],
  education: [
    { institution: "Uni", degree: "BSc", field_of_study: "CS", dates: "2020" },
  ],
  skills: { domain: ["Product"], technical: ["SQL"], tools: ["Figma"] },
  languages: ["English"],
  honors_and_awards: [{ name: "Dean's List", description: "top 5%" }],
  certifications: [{ name: "PMP", issuer: "PMI", date_earned: "2023" }],
  projects: [{ name: "Roadmap", url: "x.com", bullets: ["built it"] }],
};

// cv_data key the PDF renders · model field fromCvData surfaces · field the view renders.
const SECTIONS = [
  {
    label: "summary",
    pdfKey: "summary",
    model: (m) => m.summary,
    viewRef: "cv.summary",
  },
  {
    label: "experiences",
    pdfKey: "professional_experiences",
    model: (m) => m.experiences,
    viewRef: "cv.experiences",
  },
  {
    label: "education",
    pdfKey: "renderEducation",
    model: (m) => m.education,
    viewRef: "cv.education",
  },
  {
    label: "skills.domain",
    pdfKey: '"domain"',
    model: (m) => m.skills,
    viewRef: "cv.skills",
  },
  {
    label: "skills.tools",
    pdfKey: '"tools"',
    model: (m) => m.skillsTools,
    viewRef: "cv.skillsTools",
  },
  {
    label: "skills.technical",
    pdfKey: '"technical"',
    model: (m) => m.skillsTechnical,
    viewRef: "cv.skillsTechnical",
  },
  {
    label: "languages",
    pdfKey: "renderLanguages",
    model: (m) => m.languages,
    viewRef: "cv.languages",
  },
  {
    label: "honors",
    pdfKey: "honors_and_awards",
    model: (m) => m.honors,
    viewRef: "cv.honors",
  },
  {
    label: "certifications",
    pdfKey: "certifications",
    model: (m) => m.certifications,
    viewRef: "cv.certifications",
  },
  {
    label: "projects",
    pdfKey: "projects",
    model: (m) => m.projects,
    viewRef: "cv.projects",
  },
];

describe("CV render parity — Studio preview renders every section the PDF renders", () => {
  const model = fromCvData(FULL_CV);
  for (const sec of SECTIONS) {
    it(`${sec.label}: extracted into the model, rendered by PDF AND Studio`, () => {
      const v = sec.model(model);
      expect(Array.isArray(v) ? v.length > 0 : !!v).toBe(true); // (a) survives into the Studio model
      expect(pdfSrc).toContain(sec.pdfKey); // (b) PDF renderer covers it
      expect(viewSrc).toContain(sec.viewRef); // (c) Studio view renders it
    });
  }

  it("the honor object shape ({name, description}) flattens to a display string", () => {
    expect(model.honors[0]).toContain("Dean's List");
  });
  it("certifications carry name + issuer + date", () => {
    expect(model.certifications[0]).toMatchObject({
      name: "PMP",
      issuer: "PMI",
      date: "2023",
    });
  });
  it("projects carry name + url + bullets", () => {
    expect(model.projects[0]).toMatchObject({ name: "Roadmap", url: "x.com" });
    expect(model.projects[0].bullets).toContain("built it");
  });
});

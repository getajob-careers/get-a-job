// Deno: render the harness fixture to a PDF via the REAL buildCvPdf, for a
// given template id. Driven by harness.mjs.
//
//   deno run -A scripts/cv-harness/render-pdf.ts <templateId> <outPath>
//
// STEP B note: buildCvPdf currently ignores the template id (Step A plumbed it
// through as inert). That is exactly what the harness must catch — this script
// renders TODAY's output so the gates can prove they reject it.

import { buildCvPdf } from "../../supabase/functions/_shared/cv-templates/build-pdf.ts";

const [templateId = "modern", outPath = "/tmp/cv-harness.pdf"] = Deno.args;

const fixtureUrl = new URL("./fixture.json", import.meta.url);
const cv = JSON.parse(await Deno.readTextFile(fixtureUrl));

const uc = {
  full_name: cv.header?.name ?? "",
  email: cv.header?.email ?? "",
  phone_number: cv.header?.phone ?? "",
  location: cv.header?.location ?? "",
  linkedin_url: cv.header?.linkedin ?? "",
};

// proCount<2 → education-first; matches render-cv's resolveSectionOrder.
const order = [
  "about",
  "education",
  "professional_experience",
  "military_service",
  "volunteering",
  "leadership",
  "skills",
  "languages",
  "honors",
  "certifications",
  "projects",
];

const bytes = await buildCvPdf(
  cv,
  uc as any,
  {
    style: "ats-optimized",
    // theme is the (currently-unused) sector accent; the TEMPLATE id is what we
    // are validating. Pass a neutral theme.
    theme: {
      key: "tech_business",
      accentHex: "4A6B5D",
      label: "Tech / Business",
    },
    sectionOrder: order as any,
    template: templateId as any,
    photo: null,
  } as any,
);

await Deno.writeFile(outPath, bytes);
console.log(`rendered ${templateId} → ${outPath} (${bytes.length} bytes)`);

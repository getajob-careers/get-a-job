// scripts/test-pdf-poc.mjs — PDF renderer POC for Direction A CV.
//
// Run: `node scripts/test-pdf-poc.mjs` (requires `npm i pdf-lib@1.17.1` in
// a scratch dir; pdf-lib is NOT in the project's package.json yet because
// the renderer hasn't been wired in. This script proves the approach with
// a single page; the full renderer lives at supabase/functions/_shared/
// cv-templates/build-pdf.ts once approved.
//
// What this validates:
//   - 1-page A-style layout: tracked-caps name framed by hairline rules,
//     muted contact, accent rule, tracked-caps section heading, experience
//     entry with right-aligned bold-italic date, hanging-indent bullets
//   - text-selectability (essential for ATS parse fidelity)
//   - per-character text measurement (the killer feature for true 1-page
//     enforcement vs the docx renderer's estimator-based trimming)
//
// Outputs /tmp/cv-poc.pdf — open in Preview to visually inspect.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "fs";

// US Letter dimensions (points)
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;
const CONTENT_W = PAGE_W - 2 * MARGIN;

// Direction A typography (POC v2 — bumped after first round).
const SIZE_NAME = 28;
const SIZE_SECTION = 14;
const SIZE_BODY = 11;
const SIZE_BULLET = 11;
const SIZE_DATE = 10.5;

const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_HAIRLINE = rgb(0.8, 0.8, 0.8);  // #CCCCCC
const COLOR_MUTED = rgb(0.33, 0.33, 0.33);  // #555555

function hexToRgb(hex) {
  const c = hex.replace("#", "");
  return rgb(
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  );
}

// pdf-lib has no native characterSpacing; simulate by drawing each char
// at a measured x-offset. Cheap enough for the name + section labels.
function drawTrackedText(page, text, { x, y, size, font, color, tracking }) {
  let cursor = x;
  for (const ch of text) {
    page.drawText(ch, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(ch, size) + tracking;
  }
}
function measureTrackedText(text, font, size, tracking) {
  let w = 0;
  for (const ch of text) w += font.widthOfTextAtSize(ch, size) + tracking;
  return w - tracking;
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    const trial = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      current = trial;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildPocPdf(cvData, accent = "4A6B5D") {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const accentColor = hexToRgb(accent);

  let y = PAGE_H - MARGIN;

  // Hairline above name
  page.drawLine({
    start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y },
    thickness: 0.5, color: COLOR_HAIRLINE,
  });

  // Name (tracked caps, centered, black)
  y -= 4;
  y -= SIZE_NAME;
  const name = String(cvData.header?.name || "").toUpperCase();
  const tracking = 2;
  const trackedWidth = measureTrackedText(name, helvBold, SIZE_NAME, tracking);
  const nameX = MARGIN + (CONTENT_W - trackedWidth) / 2;
  drawTrackedText(page, name, {
    x: nameX, y, size: SIZE_NAME, font: helvBold, color: COLOR_BLACK, tracking,
  });

  // Hairline below name
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y },
    thickness: 0.5, color: COLOR_HAIRLINE,
  });

  // Contact strip (muted, centered)
  y -= 14;
  const contactBits = [
    cvData.header?.email, cvData.header?.phone,
    cvData.header?.location, cvData.header?.linkedin,
  ].filter(Boolean);
  const contact = contactBits.join("  \u00B7  ");
  const contactWidth = helv.widthOfTextAtSize(contact, SIZE_DATE);
  page.drawText(contact, {
    x: MARGIN + (CONTENT_W - contactWidth) / 2, y,
    size: SIZE_DATE, font: helv, color: COLOR_MUTED,
  });

  // Accent rule (closes header)
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y },
    thickness: 0.75, color: accentColor,
  });

  // Section heading
  y -= 32;
  drawTrackedText(page, "PROFESSIONAL EXPERIENCE", {
    x: MARGIN, y, size: SIZE_SECTION, font: helvBold,
    color: accentColor, tracking: 1.5,
  });

  // Experience entry
  y -= 20;
  const exp = cvData.professional_experiences?.[0] || {};
  const titleLine = exp.company ? `${exp.title}, ${exp.company}` : (exp.title || "");
  page.drawText(titleLine, {
    x: MARGIN, y, size: SIZE_BODY, font: helvBold, color: COLOR_BLACK,
  });
  if (exp.dates) {
    const dateW = helvBoldOblique.widthOfTextAtSize(exp.dates, SIZE_DATE);
    page.drawText(exp.dates, {
      x: PAGE_W - MARGIN - dateW, y,
      size: SIZE_DATE, font: helvBoldOblique, color: COLOR_MUTED,
    });
  }

  // Bullets
  const bullets = exp.bullets || [];
  const bulletIndent = 18;
  const textWidth = CONTENT_W - bulletIndent;
  for (const b of bullets) {
    y -= 16;
    page.drawText("\u2022", {
      x: MARGIN + 4, y, size: SIZE_BULLET, font: helv, color: COLOR_BLACK,
    });
    const lines = wrapText(b, helv, SIZE_BULLET, textWidth);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) y -= 13;
      page.drawText(lines[i], {
        x: MARGIN + bulletIndent, y,
        size: SIZE_BULLET, font: helv, color: COLOR_BLACK,
      });
    }
  }

  return await pdfDoc.save();
}

const sample = {
  header: {
    name: "Elie Englard",
    email: "elie@example.com",
    phone: "+972 50 123 4567",
    location: "Tel Aviv, Israel",
    linkedin: "linkedin.com/in/elie-englard",
  },
  professional_experiences: [
    {
      title: "Customer Success Specialist",
      company: "Heseg Foundation",
      dates: "Aug 2024 \u2013 Present",
      bullets: [
        "Coordinated post-sales onboarding for 12 enterprise accounts, running quarterly business reviews and surfacing renewal risk to the GTM team.",
        "Owned the customer health dashboard in HubSpot, defining 4 leading indicators that lifted Q1 renewal rate from 78% to 91%.",
        "Drove the migration from manual NPS surveys to an automated in-app pulse, cutting response cycle from 14 days to 3 and tripling response volume.",
      ],
    },
  ],
};

const bytes = await buildPocPdf(sample, "4A6B5D");
const outPath = "/tmp/cv-poc.pdf";
writeFileSync(outPath, bytes);
console.log(`OK \u2014 wrote ${bytes.byteLength} bytes to ${outPath}`);

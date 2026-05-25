// build-pdf.ts — PDF CV renderer with measure-then-shrink-to-fit.
//
// Two-pass strategy (the core PDF win over DOCX): render once in a
// MEASURE pass that decrements the y cursor without drawing anything,
// compute usedHeight, derive a scale factor = available / used,
// re-render in a DRAW pass with all sizes + spacing multiplied by
// that scale. Result: content always fits 1 page, sections are NEVER
// dropped. Floor scale at 0.7 so body stays around 7.7pt minimum
// (still readable; below that the CV reads as visibly compressed).
//
// The DOCX renderer (build.ts) couldn't do this — Word handles flow
// layout itself and the edge function could only estimate line counts.
// pdf-lib gives us font.widthOfTextAtSize for true text measurement,
// so we know exactly how tall the document will be at any size.
//
// Visual treatment ("Direction A"): tracked-caps black name framed
// by hairline grey rules, muted contact strip closed by an accent
// hairline, tracked-caps accent-color section labels with no border,
// bold-italic muted dates right-aligned, hanging-indent bullets.
// Cream background (#F9F5EC) covering the full page.
//
// ATS-safety preserved: single column, paragraph-equivalent text flow,
// no tables for body content, text-selectable.
//
// Limitations (deliberate, follow-ups):
//   - Standard Helvetica family. config.theme.font is accepted but
//     not honored. Custom-font path needs @pdf-lib/fontkit + TTF bytes.
//   - Photo header path stubbed (renderer ignores when null).
//   - No margin-reduction fallback when scale would go below 0.7.

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "https://esm.sh/pdf-lib@1.17.1";

import type { TemplateConfig, SectionKey } from "./types.ts";

// ─── Page geometry (US Letter, points) ─────────────────────────────
const PAGE_W = 612;            // 8.5"
const PAGE_H = 792;            // 11"
const MARGIN = 50;             // ~0.7"
const CONTENT_W = PAGE_W - 2 * MARGIN;
const CONTENT_H = PAGE_H - 2 * MARGIN;

// ─── Default typography (multiplied by ctx.scale at draw time) ─────
const SIZE_NAME = 28;
const SIZE_SECTION = 14;
const SIZE_BODY = 11;
const SIZE_BULLET = 11;
const SIZE_DATE = 10.5;
const SIZE_CONTACT = 10;
const SIZE_SUBLINE = 10.5;

// Letter spacing for tracked caps (also multiplied by ctx.scale).
const TRACK_NAME = 2;
const TRACK_SECTION = 1.5;

// ─── Colors ─────────────────────────────────────────────────────────
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_HAIRLINE = rgb(0.8, 0.8, 0.8);    // #CCCCCC
const COLOR_MUTED = rgb(0.33, 0.33, 0.33);    // #555555
const COLOR_CREAM = rgb(0.976, 0.961, 0.925); // #F9F5EC warm cream
const COLOR_BULLET_DOT = rgb(0.3, 0.3, 0.3);

// ─── Line metrics (scaled with ctx.scale) ──────────────────────────
const LH_BODY = 13;            // 11pt × 1.18 — wrap line gap
const LH_BULLET_GAP = 16;      // 11pt × 1.45 — gap between bullets
const SP_SECTION_BEFORE = 22;  // breathing room above section heading
const SP_SECTION_AFTER = 16;   // after heading before first entry
const SP_ENTRY_BEFORE = 12;    // gap between siblings within a section
const SP_AFTER_HEADER = 22;    // after contact + accent rule

// ─── Shrink-to-fit bounds ───────────────────────────────────────────
// SCALE_MIN deliberately low — Eli's directive is "fit everything, never
// drop content." At 0.55 body becomes 6.05pt which is small but still
// printable; at SCALE_WARN below we log a warning so unusually dense
// profiles surface in telemetry without failing.
const SCALE_MIN = 0.55;
const SCALE_MAX = 1.0;
const SCALE_WARN = 0.70;       // body < 7.7pt — borderline; flag in logs

// ─── CV data shape (mirrors build.ts CvData) ───────────────────────
interface CvData {
  header?: {
    name?: string;
    subtitle?: string;
    phone?: string;
    email?: string;
    location?: string;
    linkedin?: string;
  };
  summary?: string;
  about_me?: string;
  professional_experiences?: any[];
  experiences?: any[];
  military_experiences?: any[];
  military_service?: any;
  volunteering_experiences?: any[];
  volunteering?: any[];
  leadership_experiences?: any[];
  education?: any[];
  skills?: {
    domain?: string[];
    tools?: string[];
    technical?: string[];
    languages?: string[];
  };
  languages?: any[];
  honors_and_awards?: any[];
  certifications?: any[];
  projects?: any[];
}

interface UserContext {
  full_name?: string;
  phone_number?: string;
  email?: string;
  location?: string;
  linkedin_url?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
const safeArray = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const trim = (v: unknown): string => String(v ?? "").trim();

function hexToRgb(hex: string) {
  const c = (hex || "000000").replace("#", "");
  return rgb(
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  );
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
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

// ─── Rendering context ──────────────────────────────────────────────
interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}
interface Ctx {
  page: PDFPage;
  fonts: Fonts;
  accent: any;
  y: number;
  // false = measure pass (skip every draw, just decrement y)
  // true  = real render pass (draw at scaled sizes)
  draw: boolean;
  // 1.0 = default sizes. Computed after the measure pass:
  // scale = clamp(SCALE_MIN, SCALE_MAX, CONTENT_H / usedHeight).
  scale: number;
}

// Apply ctx.scale to any base value (font size, line height, tracking).
function s(ctx: Ctx, base: number): number {
  return base * ctx.scale;
}

// pdf-lib has no native characterSpacing — simulate by drawing each
// glyph at a measured x-offset. Acceptable for short tracked strings
// (the name + section headings). When ctx.draw is false, just walks
// the string to advance y/x without rendering.
function drawTracked(
  ctx: Ctx, text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: any; tracking: number },
): number {
  let cursor = opts.x;
  for (const ch of text) {
    if (ctx.draw) {
      ctx.page.drawText(ch, {
        x: cursor, y: opts.y, size: opts.size, font: opts.font, color: opts.color,
      });
    }
    cursor += opts.font.widthOfTextAtSize(ch, opts.size) + opts.tracking;
  }
  return cursor;
}
function measureTracked(text: string, font: PDFFont, size: number, tracking: number): number {
  let w = 0;
  for (const ch of text) w += font.widthOfTextAtSize(ch, size) + tracking;
  return Math.max(0, w - tracking);
}

function drawHairline(ctx: Ctx, y: number, color = COLOR_HAIRLINE, thickness = 0.5) {
  if (!ctx.draw) return;
  ctx.page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness,
    color,
  });
}

function drawSectionHeading(ctx: Ctx, label: string) {
  ctx.y -= s(ctx, SP_SECTION_BEFORE);
  drawTracked(ctx, label.toUpperCase(), {
    x: MARGIN, y: ctx.y,
    size: s(ctx, SIZE_SECTION), font: ctx.fonts.bold,
    color: ctx.accent, tracking: s(ctx, TRACK_SECTION),
  });
  ctx.y -= s(ctx, SP_SECTION_AFTER);
}

function drawEntryTitleLine(
  ctx: Ctx, titleLeft: string, dateRight: string | undefined, isFirst: boolean,
) {
  if (!isFirst) ctx.y -= s(ctx, SP_ENTRY_BEFORE);
  if (ctx.draw) {
    ctx.page.drawText(titleLeft, {
      x: MARGIN, y: ctx.y,
      size: s(ctx, SIZE_BODY), font: ctx.fonts.bold, color: COLOR_BLACK,
    });
  }
  const date = trim(dateRight);
  if (date) {
    const dateSize = s(ctx, SIZE_DATE);
    const dateW = ctx.fonts.boldItalic.widthOfTextAtSize(date, dateSize);
    if (ctx.draw) {
      ctx.page.drawText(date, {
        x: PAGE_W - MARGIN - dateW, y: ctx.y,
        size: dateSize, font: ctx.fonts.boldItalic, color: COLOR_MUTED,
      });
    }
  }
}

function drawSubLine(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, LH_BODY);
  if (ctx.draw) {
    ctx.page.drawText(text, {
      x: MARGIN, y: ctx.y,
      size: s(ctx, SIZE_SUBLINE), font: ctx.fonts.regular, color: COLOR_MUTED,
    });
  }
}

function drawBullet(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, LH_BULLET_GAP);
  const bulletIndent = 18;
  const textWidth = CONTENT_W - bulletIndent;
  const bulletSize = s(ctx, SIZE_BULLET);
  if (ctx.draw) {
    ctx.page.drawText("\u2022", {
      x: MARGIN + 4, y: ctx.y,
      size: bulletSize, font: ctx.fonts.regular, color: COLOR_BULLET_DOT,
    });
  }
  const lines = wrap(text, ctx.fonts.regular, bulletSize, textWidth);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(lines[i], {
        x: MARGIN + bulletIndent, y: ctx.y,
        size: bulletSize, font: ctx.fonts.regular, color: COLOR_BLACK,
      });
    }
  }
}

function drawLabelledLine(ctx: Ctx, label: string, items: string[]) {
  const value = (items || []).map(trim).filter(Boolean).join(", ");
  if (!value) return;
  ctx.y -= s(ctx, LH_BULLET_GAP);
  const bulletSize = s(ctx, SIZE_BULLET);
  const labelText = `${label}: `;
  const labelW = ctx.fonts.bold.widthOfTextAtSize(labelText, bulletSize);
  if (ctx.draw) {
    ctx.page.drawText(labelText, {
      x: MARGIN, y: ctx.y,
      size: bulletSize, font: ctx.fonts.bold, color: COLOR_BLACK,
    });
  }
  const valueLines = wrap(value, ctx.fonts.regular, bulletSize, CONTENT_W - labelW);
  if (valueLines.length === 0) return;
  if (ctx.draw) {
    ctx.page.drawText(valueLines[0], {
      x: MARGIN + labelW, y: ctx.y,
      size: bulletSize, font: ctx.fonts.regular, color: COLOR_BLACK,
    });
  }
  for (let i = 1; i < valueLines.length; i++) {
    ctx.y -= s(ctx, LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(valueLines[i], {
        x: MARGIN, y: ctx.y,
        size: bulletSize, font: ctx.fonts.regular, color: COLOR_BLACK,
      });
    }
  }
}

function drawPlainLine(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, LH_BULLET_GAP);
  const bulletSize = s(ctx, SIZE_BULLET);
  const lines = wrap(text, ctx.fonts.regular, bulletSize, CONTENT_W);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(lines[i], {
        x: MARGIN, y: ctx.y,
        size: bulletSize, font: ctx.fonts.regular, color: COLOR_BLACK,
      });
    }
  }
}

function drawBodyParagraph(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, LH_BULLET_GAP);
  const bodySize = s(ctx, SIZE_BODY);
  const lines = wrap(text, ctx.fonts.regular, bodySize, CONTENT_W);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(lines[i], {
        x: MARGIN, y: ctx.y,
        size: bodySize, font: ctx.fonts.regular, color: COLOR_BLACK,
      });
    }
  }
}

// ─── Header ─────────────────────────────────────────────────────────
function renderHeader(ctx: Ctx, cvData: CvData, userContext: UserContext) {
  const headerName = trim(cvData.header?.name || userContext.full_name);
  const name = headerName.toUpperCase();
  const contactBits = [
    cvData.header?.phone || userContext.phone_number,
    cvData.header?.email || userContext.email,
    cvData.header?.location || userContext.location,
    cvData.header?.linkedin || userContext.linkedin_url,
  ].map((v) => trim(v)).filter(Boolean);

  // Hairline above
  drawHairline(ctx, ctx.y);
  ctx.y -= s(ctx, 4);

  // Name (tracked caps, centered, black)
  const nameSize = s(ctx, SIZE_NAME);
  const nameTrack = s(ctx, TRACK_NAME);
  ctx.y -= nameSize;
  const nameW = measureTracked(name, ctx.fonts.bold, nameSize, nameTrack);
  const nameX = MARGIN + (CONTENT_W - nameW) / 2;
  drawTracked(ctx, name, {
    x: nameX, y: ctx.y, size: nameSize, font: ctx.fonts.bold,
    color: COLOR_BLACK, tracking: nameTrack,
  });

  // Hairline below
  ctx.y -= s(ctx, 8);
  drawHairline(ctx, ctx.y);

  // Contact strip
  if (contactBits.length > 0) {
    ctx.y -= s(ctx, 14);
    const contact = contactBits.join("  \u00B7  ");
    const contactSize = s(ctx, SIZE_CONTACT);
    const contactW = ctx.fonts.regular.widthOfTextAtSize(contact, contactSize);
    if (ctx.draw) {
      ctx.page.drawText(contact, {
        x: MARGIN + (CONTENT_W - contactW) / 2, y: ctx.y,
        size: contactSize, font: ctx.fonts.regular, color: COLOR_MUTED,
      });
    }
  }

  // Accent rule (closes header)
  ctx.y -= s(ctx, 8);
  drawHairline(ctx, ctx.y, ctx.accent, 0.75);

  ctx.y -= s(ctx, SP_AFTER_HEADER);
}

// ─── Per-section renderers ──────────────────────────────────────────
function renderAbout(ctx: Ctx, cvData: CvData) {
  const text = trim(cvData.summary || cvData.about_me);
  if (!text) return;
  drawSectionHeading(ctx, "About Me");
  drawBodyParagraph(ctx, text);
}

function renderExperienceBucket(
  ctx: Ctx, label: string, entries: any[], orgKey: string,
) {
  if (!Array.isArray(entries) || entries.length === 0) return;
  drawSectionHeading(ctx, label);
  entries.forEach((entry, idx) => {
    const title = trim(entry?.title);
    const org = trim(entry?.[orgKey]);
    const titleLine = org ? (title ? `${title}, ${org}` : org) : title;
    drawEntryTitleLine(ctx, titleLine, entry?.dates, idx === 0);
    for (const b of (entry?.bullets || [])) drawBullet(ctx, trim(b));
  });
}

function renderProfessionalExperience(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.professional_experiences)
    ? cvData.professional_experiences
    : (Array.isArray(cvData.experiences) ? cvData.experiences : []);
  renderExperienceBucket(ctx, "Professional Experience", list, "company");
}

function renderMilitaryService(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.military_experiences)
    ? cvData.military_experiences
    : (cvData.military_service && (cvData.military_service as any).unit ? [cvData.military_service] : []);
  renderExperienceBucket(ctx, "Military Service", list, "unit");
}

function renderVolunteering(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.volunteering_experiences)
    ? cvData.volunteering_experiences
    : (Array.isArray(cvData.volunteering) ? cvData.volunteering : []);
  renderExperienceBucket(ctx, "Volunteering", list, "organization");
}

function renderLeadership(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.leadership_experiences) ? cvData.leadership_experiences : [];
  renderExperienceBucket(ctx, "Leadership", list, "organization");
}

function renderEducation(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.education) ? cvData.education : [];
  if (list.length === 0) return;
  drawSectionHeading(ctx, "Education");

  const honorsSet = new Set(
    safeArray(cvData.honors_and_awards)
      .map((h: any) => (h && typeof h === "object") ? trim(h.name) : trim(h))
      .map((str) => str.replace(/\s+/g, " ").toLowerCase())
      .filter(Boolean),
  );

  list.forEach((edu: any, idx: number) => {
    const degree = trim(edu?.degree);
    const field = trim(edu?.field_of_study);
    const institution = trim(edu?.institution);
    let topLine = "";
    if (degree && field) topLine = `${degree} in ${field}`;
    else if (degree) topLine = degree;
    else if (field) topLine = field;
    else topLine = institution;
    const subLine = (degree || field) ? institution : "";
    drawEntryTitleLine(ctx, topLine, edu?.dates, idx === 0);
    drawSubLine(ctx, subLine);

    if (edu?.gpa) drawBullet(ctx, `GPA: ${trim(edu.gpa)}`);

    const coursework = safeArray(edu?.coursework || edu?.relevant_coursework).map(trim).filter(Boolean);
    if (coursework.length > 0) drawBullet(ctx, `Relevant coursework: ${coursework.join(", ")}`);

    const academic = safeArray(edu?.academic_projects).map(trim).filter(Boolean);
    if (academic.length > 0) drawBullet(ctx, `Academic projects: ${academic.join("; ")}`);

    const seen = new Set<string>();
    for (const a of safeArray(edu?.activities)) {
      const raw = trim(a);
      if (!raw) continue;
      const key = raw.replace(/\s+/g, " ").toLowerCase();
      if (seen.has(key) || honorsSet.has(key)) continue;
      seen.add(key);
      drawBullet(ctx, raw);
    }
  });
}

function renderSkills(ctx: Ctx, cvData: CvData) {
  const sk = cvData.skills || {};
  if (!(sk.domain?.length || sk.tools?.length || sk.technical?.length)) return;
  drawSectionHeading(ctx, "Skills & Tools");
  if (sk.domain?.length) drawLabelledLine(ctx, "Domain", sk.domain);
  if (sk.tools?.length) drawLabelledLine(ctx, "Tools", sk.tools);
  if (sk.technical?.length) drawLabelledLine(ctx, "Technical", sk.technical);
}

// Languages — defensively reshape data:
//   - array of objects: standard {language, proficiency} → "English (Native)"
//   - array of strings: take as-is, but split on "·" or ", " if a single
//     item smuggles multiple languages (defensive against LLM output that
//     pre-joined them without a separator)
//   - single string: same defensive split
// Render with mid-dot ("  ·  ") as separator instead of comma — cleaner
// when language names contain commas (e.g. "English, US (Native)") AND
// guaranteed visible even if some upstream stripped commas.
function renderLanguages(ctx: Ctx, cvData: CvData) {
  let rawItems: any[] = [];
  if (Array.isArray(cvData.languages)) {
    rawItems = cvData.languages;
  } else if (typeof cvData.languages === "string") {
    rawItems = [cvData.languages];
  } else if (Array.isArray(cvData.skills?.languages)) {
    rawItems = cvData.skills!.languages!;
  }

  // Normalize each item to a display string.
  const formatted: string[] = [];
  for (const item of rawItems) {
    if (!item) continue;
    if (typeof item === "string") {
      // Split on common multi-language separators in case the LLM
      // packed multiple into one string. The `(?<=\))\s*(?=[A-Z])`
      // alternative handles the no-separator case we hit in production
      // (e.g. "English (Native)Hebrew (Fluent)" — closing paren
      // directly against the next capital letter).
      const splits = item
        .split(/\s*[·,•|]\s*|(?<=\))\s*(?=[A-Z])/g)
        .map(trim)
        .filter(Boolean);
      formatted.push(...splits);
      continue;
    }
    const lang = trim(item.language || item.name);
    const level = trim(item.proficiency || item.level);
    if (!lang) continue;
    formatted.push(level ? `${lang} (${level})` : lang);
  }

  if (formatted.length === 0) return;
  drawSectionHeading(ctx, "Languages");
  // Mid-dot separator — visually unambiguous and survives any prior
  // comma-stripping in upstream data.
  drawPlainLine(ctx, formatted.join("  \u00B7  "));
}

function renderHonors(ctx: Ctx, cvData: CvData) {
  const lines = safeArray(cvData.honors_and_awards).map((h: any) => {
    if (!h) return "";
    if (typeof h === "string") return h;
    const name = trim(h.name);
    const desc = trim(h.description);
    return name && desc ? `${name} \u2014 ${desc}` : name;
  }).filter(Boolean);
  if (lines.length === 0) return;
  drawSectionHeading(ctx, "Honors & Awards");
  for (const line of lines) drawBullet(ctx, line);
}

function renderCertifications(ctx: Ctx, cvData: CvData) {
  const certs = Array.isArray(cvData.certifications) ? cvData.certifications : [];
  if (certs.length === 0) return;
  drawSectionHeading(ctx, "Certifications");
  for (const cert of certs) {
    const parts: string[] = [];
    if (cert?.name) parts.push(trim(cert.name));
    if (cert?.issuer) parts.push(trim(cert.issuer));
    const certDate = trim(cert?.date_earned || cert?.date);
    const line = parts.join(", ") + (certDate ? `  (${certDate})` : "");
    if (line.trim()) drawBullet(ctx, line);
  }
}

function renderProjects(ctx: Ctx, cvData: CvData) {
  const projects = Array.isArray(cvData.projects) ? cvData.projects : [];
  if (projects.length === 0) return;
  drawSectionHeading(ctx, "Projects");
  projects.forEach((proj: any, idx: number) => {
    const name = trim(proj?.name);
    const url = trim(proj?.url);
    const titleLine = url ? `${name}  (${url})` : name;
    drawEntryTitleLine(ctx, titleLine, undefined, idx === 0);
    for (const b of (proj?.bullets || [])) drawBullet(ctx, trim(b));
  });
}

// ─── Render-all helper (runs both measure + draw passes) ────────────
function renderAllSections(ctx: Ctx, cvData: CvData, sectionOrder: SectionKey[]) {
  const dispatch: Record<SectionKey, () => void> = {
    about: () => renderAbout(ctx, cvData),
    professional_experience: () => renderProfessionalExperience(ctx, cvData),
    military_service: () => renderMilitaryService(ctx, cvData),
    volunteering: () => renderVolunteering(ctx, cvData),
    leadership: () => renderLeadership(ctx, cvData),
    education: () => renderEducation(ctx, cvData),
    skills: () => renderSkills(ctx, cvData),
    languages: () => renderLanguages(ctx, cvData),
    honors: () => renderHonors(ctx, cvData),
    certifications: () => renderCertifications(ctx, cvData),
    projects: () => renderProjects(ctx, cvData),
  };
  for (const key of sectionOrder) {
    dispatch[key]?.();
  }
}

// ─── Main entry point ───────────────────────────────────────────────
export async function buildCvPdf(
  cvData: CvData,
  userContext: UserContext,
  config: TemplateConfig,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const fonts: Fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };

  const accent = hexToRgb(config.theme.accentHex || "4A6B5D");

  // ─── Pass 1: MEASURE ───
  // Walk every renderer with draw=false to compute the total y consumed
  // at full size. The same code path that will actually draw later, just
  // gated. No drawing happens on this pass — we only need ctx.y at the end.
  const measureCtx: Ctx = {
    page, fonts, accent,
    y: PAGE_H - MARGIN,
    draw: false,
    scale: SCALE_MAX,
  };
  renderHeader(measureCtx, cvData, userContext);
  renderAllSections(measureCtx, cvData, config.sectionOrder);
  const usedHeight = (PAGE_H - MARGIN) - measureCtx.y;

  // Compute scale: how much we'd need to shrink to fit within CONTENT_H.
  // Clamp to [SCALE_MIN, SCALE_MAX]. Below SCALE_MIN we accept overflow
  // rather than ship microscopic type (rare in practice — would need a
  // ~2x-overflow profile).
  let scale = SCALE_MAX;
  if (usedHeight > CONTENT_H) {
    scale = Math.max(SCALE_MIN, CONTENT_H / usedHeight);
  }
  const fits = (usedHeight * scale) <= CONTENT_H + 0.5; // 0.5pt slop
  const tag = scale < SCALE_WARN ? "[CV-PDF][WARN]" : "[CV-PDF]";
  console.log(`${tag} measure pass: used ${usedHeight.toFixed(1)}pt of ${CONTENT_H}pt available → scale ${scale.toFixed(3)} (fits: ${fits})`);

  // ─── Pass 2: DRAW ───
  // Cream background first, then real render at computed scale.
  page.drawRectangle({
    x: 0, y: 0, width: PAGE_W, height: PAGE_H,
    color: COLOR_CREAM,
  });
  const drawCtx: Ctx = {
    page, fonts, accent,
    y: PAGE_H - MARGIN,
    draw: true,
    scale,
  };
  renderHeader(drawCtx, cvData, userContext);
  renderAllSections(drawCtx, cvData, config.sectionOrder);

  return await pdfDoc.save();
}

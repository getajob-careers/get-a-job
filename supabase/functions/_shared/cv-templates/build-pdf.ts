// build-pdf.ts — PDF CV renderer. Replaces build.ts (DOCX) as the
// default output for generate-tailored-cv. Direction A visual treatment
// preserved (tracked-caps name framed by hairline rules, accent-color
// tracked-caps section labels, bold-italic muted dates, hanging-indent
// bullets), now on cream-tinted A4-equivalent (US Letter) pages.
//
// Why PDF over DOCX:
//   1. Per-character text measurement (font.widthOfTextAtSize) lets us
//      do precise alignment + future measure-render-shrink loop for true
//      1-page enforcement. The DOCX estimator can't see actual layout.
//   2. PDF is universal; Israeli HR can still open it; US tech expects it.
//   3. Single render path (no DOCX→PDF conversion variance).
//
// ATS-safety preserved: single column, paragraph-equivalent text flow,
// no tables for body content, text-selectable (not flattened to image).
// Cream background is purely visual — ATS parsers ignore it.
//
// Build invariants (mirror build.ts):
//   - config.sectionOrder drives rendering order
//   - header always first, photo path opt-in via config.photo
//   - all 11 section types supported with same data shape as DOCX renderer
//   - per-sector accent color from config.theme.accentHex
//
// Limitations (deliberate for first cut):
//   - Standard Helvetica family (no custom font embedding). The
//     theme.font value is accepted but not honored — Helvetica is what
//     ships. Custom-font path is a follow-up (requires fontkit + TTF
//     bytes per sector theme).
//   - No measure-render-shrink overflow loop yet. The existing post-LLM
//     trim in generate-tailored-cv/index.ts is still the line of defense
//     against overflow; this renderer just lays out what it's given.
//   - Photo header path stubbed (returns the same name+contact block
//     when photo is null). Real photo embedding via embedJpg/embedPng is
//     a follow-up.

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

// ─── Typography (POC v2 sizes, validated visually) ──────────────────
const SIZE_NAME = 28;
const SIZE_SECTION = 14;
const SIZE_BODY = 11;          // body / job title / entry-title / coursework
const SIZE_BULLET = 11;        // bullet text — matches body for read comfort
const SIZE_DATE = 10.5;        // bold-italic muted
const SIZE_CONTACT = 10;       // muted strip below name
const SIZE_SUBLINE = 10.5;     // education institution line, etc.

// ─── Tracking (per-character letter spacing) ────────────────────────
const TRACK_NAME = 2;          // ~2pt — fits ~12-15-char names
const TRACK_SECTION = 1.5;     // ~1.5pt — section labels

// ─── Colors ─────────────────────────────────────────────────────────
const COLOR_BLACK = rgb(0, 0, 0);
const COLOR_HAIRLINE = rgb(0.8, 0.8, 0.8);   // #CCCCCC
const COLOR_MUTED = rgb(0.33, 0.33, 0.33);   // #555555
const COLOR_CREAM = rgb(0.976, 0.961, 0.925); // #F9F5EC warm cream
const COLOR_BULLET_DOT = rgb(0.3, 0.3, 0.3);

// ─── Line metrics (scaled to 11pt body) ─────────────────────────────
const LH_BODY = 13;            // 11pt × 1.18 — line gap for prose wraps
const LH_BULLET_GAP = 16;      // 11pt × 1.45 — gap between bullets
const SP_SECTION_BEFORE = 22;  // generous breathing room above section heading
const SP_SECTION_AFTER = 16;   // space after heading before first entry
const SP_ENTRY_BEFORE = 12;    // gap between siblings within a section
const SP_AFTER_HEADER = 22;    // after the contact + accent rule

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

// pdf-lib has no native characterSpacing — simulate by drawing each
// glyph at a measured x-offset. Acceptable for short tracked strings
// (the name + section headings).
function drawTracked(
  page: PDFPage, text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: any; tracking: number },
): number {
  let cursor = opts.x;
  for (const ch of text) {
    page.drawText(ch, { x: cursor, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
    cursor += opts.font.widthOfTextAtSize(ch, opts.size) + opts.tracking;
  }
  return cursor;
}
function measureTracked(text: string, font: PDFFont, size: number, tracking: number): number {
  let w = 0;
  for (const ch of text) w += font.widthOfTextAtSize(ch, size) + tracking;
  return Math.max(0, w - tracking);
}

// Greedy word-wrap. Returns array of lines that all fit within maxWidth.
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

// ─── Rendering primitives ───────────────────────────────────────────
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
  y: number;             // cursor (mutable across renderers — by convention each renderer reads + writes)
}

function drawHairline(page: PDFPage, y: number, color = COLOR_HAIRLINE, thickness = 0.5) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness,
    color,
  });
}

function drawSectionHeading(ctx: Ctx, label: string) {
  ctx.y -= SP_SECTION_BEFORE;
  drawTracked(ctx.page, label.toUpperCase(), {
    x: MARGIN, y: ctx.y, size: SIZE_SECTION, font: ctx.fonts.bold,
    color: ctx.accent, tracking: TRACK_SECTION,
  });
  ctx.y -= SP_SECTION_AFTER;
}

// Title-left / date-right line shared by all experience-style entries
// (professional/military/volunteering/leadership/projects, also education).
function drawEntryTitleLine(
  ctx: Ctx, titleLeft: string, dateRight: string | undefined, isFirst: boolean,
) {
  if (!isFirst) ctx.y -= SP_ENTRY_BEFORE;
  ctx.page.drawText(titleLeft, {
    x: MARGIN, y: ctx.y, size: SIZE_BODY, font: ctx.fonts.bold, color: COLOR_BLACK,
  });
  const date = trim(dateRight);
  if (date) {
    const dateW = ctx.fonts.boldItalic.widthOfTextAtSize(date, SIZE_DATE);
    ctx.page.drawText(date, {
      x: PAGE_W - MARGIN - dateW, y: ctx.y,
      size: SIZE_DATE, font: ctx.fonts.boldItalic, color: COLOR_MUTED,
    });
  }
}

// Secondary line under an entry title (e.g. "Reichman University" under a
// degree line). Muted color, body size, no tab stops.
function drawSubLine(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= LH_BODY;
  ctx.page.drawText(text, {
    x: MARGIN, y: ctx.y, size: SIZE_SUBLINE, font: ctx.fonts.regular, color: COLOR_MUTED,
  });
}

function drawBullet(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= LH_BULLET_GAP;
  const bulletIndent = 18;
  const textWidth = CONTENT_W - bulletIndent;
  ctx.page.drawText("\u2022", {
    x: MARGIN + 4, y: ctx.y, size: SIZE_BULLET, font: ctx.fonts.regular, color: COLOR_BULLET_DOT,
  });
  const lines = wrap(text, ctx.fonts.regular, SIZE_BULLET, textWidth);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= LH_BODY;
    ctx.page.drawText(lines[i], {
      x: MARGIN + bulletIndent, y: ctx.y,
      size: SIZE_BULLET, font: ctx.fonts.regular, color: COLOR_BLACK,
    });
  }
}

// Labelled line for the Skills section: "Domain: a, b, c"
function drawLabelledLine(ctx: Ctx, label: string, items: string[]) {
  const value = (items || []).map((s) => trim(s)).filter(Boolean).join(", ");
  if (!value) return;
  ctx.y -= LH_BULLET_GAP;
  const labelText = `${label}: `;
  const labelW = ctx.fonts.bold.widthOfTextAtSize(labelText, SIZE_BULLET);
  ctx.page.drawText(labelText, {
    x: MARGIN, y: ctx.y, size: SIZE_BULLET, font: ctx.fonts.bold, color: COLOR_BLACK,
  });
  // Wrap value across multiple lines if needed
  const valueLines = wrap(value, ctx.fonts.regular, SIZE_BULLET, CONTENT_W - labelW);
  if (valueLines.length === 0) return;
  ctx.page.drawText(valueLines[0], {
    x: MARGIN + labelW, y: ctx.y, size: SIZE_BULLET, font: ctx.fonts.regular, color: COLOR_BLACK,
  });
  for (let i = 1; i < valueLines.length; i++) {
    ctx.y -= LH_BODY;
    ctx.page.drawText(valueLines[i], {
      x: MARGIN, y: ctx.y, size: SIZE_BULLET, font: ctx.fonts.regular, color: COLOR_BLACK,
    });
  }
}

// Plain body line (used by Languages).
function drawPlainLine(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= LH_BULLET_GAP;
  const lines = wrap(text, ctx.fonts.regular, SIZE_BULLET, CONTENT_W);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= LH_BODY;
    ctx.page.drawText(lines[i], {
      x: MARGIN, y: ctx.y, size: SIZE_BULLET, font: ctx.fonts.regular, color: COLOR_BLACK,
    });
  }
}

// Body paragraph (About Me). Left-aligned ragged-right, slightly looser
// line-height than bullets for prose comfort.
function drawBodyParagraph(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= LH_BULLET_GAP;
  const lines = wrap(text, ctx.fonts.regular, SIZE_BODY, CONTENT_W);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= LH_BODY;
    ctx.page.drawText(lines[i], {
      x: MARGIN, y: ctx.y, size: SIZE_BODY, font: ctx.fonts.regular, color: COLOR_BLACK,
    });
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
  ].map((s) => trim(s)).filter(Boolean);

  // Hairline above
  drawHairline(ctx.page, ctx.y);
  ctx.y -= 4;

  // Name (tracked caps, centered, black)
  ctx.y -= SIZE_NAME;
  const nameW = measureTracked(name, ctx.fonts.bold, SIZE_NAME, TRACK_NAME);
  const nameX = MARGIN + (CONTENT_W - nameW) / 2;
  drawTracked(ctx.page, name, {
    x: nameX, y: ctx.y, size: SIZE_NAME, font: ctx.fonts.bold,
    color: COLOR_BLACK, tracking: TRACK_NAME,
  });

  // Hairline below
  ctx.y -= 8;
  drawHairline(ctx.page, ctx.y);

  // Contact strip
  if (contactBits.length > 0) {
    ctx.y -= 14;
    const contact = contactBits.join("  \u00B7  ");
    const contactW = ctx.fonts.regular.widthOfTextAtSize(contact, SIZE_CONTACT);
    ctx.page.drawText(contact, {
      x: MARGIN + (CONTENT_W - contactW) / 2, y: ctx.y,
      size: SIZE_CONTACT, font: ctx.fonts.regular, color: COLOR_MUTED,
    });
  }

  // Accent rule (closes header)
  ctx.y -= 8;
  drawHairline(ctx.page, ctx.y, ctx.accent, 0.75);

  ctx.y -= SP_AFTER_HEADER;
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

  // Build a set of normalized honor names so coursework/activities that
  // duplicate an honor get suppressed (mirrors build.ts honorsSet dedup).
  const honorsSet = new Set(
    safeArray(cvData.honors_and_awards)
      .map((h: any) => (h && typeof h === "object") ? trim(h.name) : trim(h))
      .map((s) => s.replace(/\s+/g, " ").toLowerCase())
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
  const hasAny = (sk.domain?.length || sk.tools?.length || sk.technical?.length);
  if (!hasAny) return;
  drawSectionHeading(ctx, "Skills & Tools");
  if (sk.domain?.length) drawLabelledLine(ctx, "Domain", sk.domain);
  if (sk.tools?.length) drawLabelledLine(ctx, "Tools", sk.tools);
  if (sk.technical?.length) drawLabelledLine(ctx, "Technical", sk.technical);
}

function renderLanguages(ctx: Ctx, cvData: CvData) {
  let lines: string[] = [];
  if (Array.isArray(cvData.languages)) {
    lines = cvData.languages.map((l: any) => {
      if (!l) return "";
      if (typeof l === "string") return l;
      const lang = trim(l.language || l.name);
      const level = trim(l.proficiency || l.level);
      return lang && level ? `${lang} (${level})` : lang;
    }).filter(Boolean);
  } else if (Array.isArray(cvData.skills?.languages)) {
    lines = cvData.skills!.languages!.map((s: any) => trim(s)).filter(Boolean);
  }
  if (lines.length === 0) return;
  drawSectionHeading(ctx, "Languages");
  drawPlainLine(ctx, lines.join(", "));
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

// ─── Main entry point ───────────────────────────────────────────────
export async function buildCvPdf(
  cvData: CvData,
  userContext: UserContext,
  config: TemplateConfig,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // Cream background — drawn first so all text renders on top.
  page.drawRectangle({
    x: 0, y: 0, width: PAGE_W, height: PAGE_H,
    color: COLOR_CREAM,
  });

  const fonts: Fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };

  const accent = hexToRgb(config.theme.accentHex || "4A6B5D");
  const ctx: Ctx = { page, fonts, accent, y: PAGE_H - MARGIN };

  renderHeader(ctx, cvData, userContext);

  // Dispatch by config.sectionOrder. Empty sections short-circuit
  // inside their own renderer — no extra "is empty?" check needed here.
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
  for (const key of config.sectionOrder) {
    dispatch[key]?.();
  }

  return await pdfDoc.save();
}

// build-pdf.ts — PDF CV renderer. Dark-banner editorial design.
//
// Layout:
//   - Full-width dark slate banner (#2C3E50) at top, ~115pt tall, with
//     cream tracked-caps name + muted-cream contact strip
//   - Cream page background (#F9F5EC) below the banner
//   - 11pt UPPERCASE section headings in slate (#2C3E50) with 2pt
//     tracking, each followed by a full-content-width 1.5pt slate
//     underline (same color as heading) — visual rhythm without
//     heavy borders
//   - Job entries: bold slate title left, italic slate dates right-aligned
//   - Bullets: 10pt slate body, hanging indent
//   - All text on the page (titles, dates, bullets, sub-lines, section
//     headings, bullet dots) shares COLOR_TEXT (#2C3E50). Visual
//     hierarchy comes from weight (bold), style (italic), and size —
//     never from color. The per-sector accentHex is currently unused
//     in render; reserved for future use (photo border, banner stripe).
//   - Skills: 2-column grid (label column + values column) instead of
//     "Domain: a, b, c" labelled lines
//   - Languages: mid-dot inline separator
//
// Shrink-to-fit: same two-pass strategy as before. MEASURE pass walks
// the section render with draw=false and tracks y; we compute scale =
// CONTENT_H / usedHeight clamped to [SCALE_MIN, SCALE_MAX]; DRAW pass
// renders at the scaled size. The dark banner is FIXED-SIZE — does
// not scale — so it remains a stable visual element regardless of
// content density. Only sections below the banner participate in the
// shrink loop.
//
// ATS-safety: single column, text-selectable, no tables for body
// content. The banner is a single drawRectangle (vector primitive,
// not a table), invisible to ATS parsers which only look at text runs.
//
// Limitations (deliberate, follow-ups):
//   - Standard Helvetica family. config.theme.font accepted but not
//     honored (custom-font path needs @pdf-lib/fontkit + TTF bytes).
//   - Photo header path stubbed (renderer ignores photo when null).
//   - No margin-reduction tier when scale would go below SCALE_MIN.

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "https://esm.sh/pdf-lib@1.17.1";

import type { TemplateConfig, SectionKey } from "./types.ts";

// ─── Page geometry (US Letter, points) ─────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_SIDE = 50;
const MARGIN_BOTTOM = 40;
const CONTENT_W = PAGE_W - 2 * MARGIN_SIDE;

// ─── Banner (fixed-size, does NOT scale) ───────────────────────────
const BANNER_H = 118;
const BANNER_TOP_PAD = 28;          // top of banner → name baseline reference
const BANNER_GAP_NAME_CONTACT = 12; // between name baseline and contact line
const SIZE_NAME = 26;               // banner name (fixed)
const SIZE_CONTACT = 10;            // banner contact (fixed)
const TRACK_NAME = 2;               // banner name letter spacing (fixed)
const SP_AFTER_BANNER = 28;         // breathing room before first section

// ─── Default content typography (scaled by ctx.scale) ──────────────
const SIZE_SECTION = 11;            // section heading (UPPERCASE)
const SIZE_BODY = 10.5;             // entry title, body paragraph
const SIZE_BULLET = 10;             // bullet text
const SIZE_DATE = 9.5;              // right-aligned italic
const SIZE_SUBLINE = 10;            // education institution line

// Tracking. Note: pdf-lib has no native characterSpacing — we draw each
// glyph at a measured x-offset and add this gap. The value is in points,
// NOT a percentage of font size, so a 2pt gap at 11pt section text reads
// as ~18% tracking (heavy). 1pt at 11pt = ~9% (subtle but distinct).
const TRACK_SECTION = 1;            // ~9% of 11pt — subtle tracking

// ─── Colors ─────────────────────────────────────────────────────────
// Single unified text color (#2C3E50 dark slate). Body, entry titles,
// dates, bullets, sub-lines, section headings, bullet dots — everything
// rendered on the cream page uses COLOR_TEXT. The banner has its own
// pair of colors (cream name + slightly muted cream contact strip) since
// they read on the dark banner background.
const COLOR_BANNER_BG = rgb(44 / 255, 62 / 255, 80 / 255);      // #2C3E50
const COLOR_NAME = rgb(249 / 255, 245 / 255, 236 / 255);        // #F9F5EC cream
const COLOR_CONTACT = rgb(207 / 255, 216 / 255, 224 / 255);     // #CFD8E0 muted cream
const COLOR_PAGE = rgb(249 / 255, 245 / 255, 236 / 255);        // #F9F5EC cream
const COLOR_TEXT = rgb(44 / 255, 62 / 255, 80 / 255);           // #2C3E50 — primary text on cream

// ─── Line metrics (scale with ctx.scale) ───────────────────────────
const LH_BODY = 12;                 // 10pt × 1.2
const LH_BULLET_GAP = 14;           // 10pt × 1.4 between bullets
const SP_SECTION_BEFORE = 28;       // above section heading — bumped 20→28 for breathing room
const SP_AFTER_ACCENT_LINE = 12;    // after the accent line — bumped 10→12
const SP_ENTRY_BEFORE = 14;         // between sibling entries — bumped 10→14
const SECTION_LINE_OFFSET = 6;      // gap (pt) between heading baseline and the full-width underline
const SECTION_LINE_THICKNESS = 1.5; // pt

// ─── Shrink-to-fit bounds ───────────────────────────────────────────
const SCALE_MIN = 0.55;
const SCALE_MAX = 1.0;
const SCALE_WARN = 0.70;

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
  draw: boolean;
  scale: number;
}

function s(ctx: Ctx, base: number): number {
  return base * ctx.scale;
}

// pdf-lib has no native characterSpacing — simulate by drawing each
// glyph at a measured x-offset. When ctx.draw is false, walks the
// string to advance the cursor without rendering (measure pass).
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

// Section heading: 11pt tracked UPPERCASE in slate, with a full-width
// line underneath. The accent line is the only sector-tinted element on
// the page (besides the per-CV banner top stripe if added later).
function drawSectionHeading(ctx: Ctx, label: string) {
  ctx.y -= s(ctx, SP_SECTION_BEFORE);
  const headSize = s(ctx, SIZE_SECTION);
  const headTrack = s(ctx, TRACK_SECTION);
  drawTracked(ctx, label.toUpperCase(), {
    x: MARGIN_SIDE, y: ctx.y,
    size: headSize, font: ctx.fonts.bold,
    color: COLOR_TEXT, tracking: headTrack,
  });
  // Full-width hairline underline under the heading, drawn in the same
  // slate color as the heading text (NOT the per-sector accent) so the
  // line treatment reads consistently across all sector themes. Spans
  // the entire content width edge-to-edge. The per-sector accent is
  // currently unused in the render; reserved for future use.
  const lineY = ctx.y - s(ctx, SECTION_LINE_OFFSET);
  if (ctx.draw) {
    ctx.page.drawLine({
      start: { x: MARGIN_SIDE, y: lineY },
      end: { x: PAGE_W - MARGIN_SIDE, y: lineY },
      thickness: SECTION_LINE_THICKNESS,
      color: COLOR_TEXT,
    });
  }
  ctx.y = lineY - s(ctx, SP_AFTER_ACCENT_LINE);
}

function drawEntryTitleLine(
  ctx: Ctx, titleLeft: string, dateRight: string | undefined, isFirst: boolean,
) {
  if (!isFirst) ctx.y -= s(ctx, SP_ENTRY_BEFORE);
  if (ctx.draw) {
    ctx.page.drawText(titleLeft, {
      x: MARGIN_SIDE, y: ctx.y,
      size: s(ctx, SIZE_BODY), font: ctx.fonts.bold, color: COLOR_TEXT,
    });
  }
  const date = trim(dateRight);
  if (date) {
    const dateSize = s(ctx, SIZE_DATE);
    const dateW = ctx.fonts.boldItalic.widthOfTextAtSize(date, dateSize);
    if (ctx.draw) {
      ctx.page.drawText(date, {
        x: PAGE_W - MARGIN_SIDE - dateW, y: ctx.y,
        size: dateSize, font: ctx.fonts.boldItalic, color: COLOR_TEXT,
      });
    }
  }
}

function drawSubLine(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, LH_BODY);
  if (ctx.draw) {
    ctx.page.drawText(text, {
      x: MARGIN_SIDE, y: ctx.y,
      size: s(ctx, SIZE_SUBLINE), font: ctx.fonts.regular, color: COLOR_TEXT,
    });
  }
}

function drawBullet(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, LH_BULLET_GAP);
  const bulletIndent = 16;
  const textWidth = CONTENT_W - bulletIndent;
  const bulletSize = s(ctx, SIZE_BULLET);
  if (ctx.draw) {
    ctx.page.drawText("\u2022", {
      x: MARGIN_SIDE + 3, y: ctx.y,
      size: bulletSize, font: ctx.fonts.regular, color: COLOR_TEXT,
    });
  }
  const lines = wrap(text, ctx.fonts.regular, bulletSize, textWidth);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(lines[i], {
        x: MARGIN_SIDE + bulletIndent, y: ctx.y,
        size: bulletSize, font: ctx.fonts.regular, color: COLOR_TEXT,
      });
    }
  }
}

// Skills grid row: bold label in left column, comma-joined values in
// right column. Values wrap to multiple lines if they overflow the
// right column width.
const SKILLS_LABEL_COL_W = 70;
function drawSkillsRow(ctx: Ctx, label: string, items: string[]) {
  const value = (items || []).map(trim).filter(Boolean).join(", ");
  if (!value) return;
  ctx.y -= s(ctx, LH_BULLET_GAP);
  const bulletSize = s(ctx, SIZE_BULLET);
  if (ctx.draw) {
    ctx.page.drawText(label, {
      x: MARGIN_SIDE, y: ctx.y,
      size: bulletSize, font: ctx.fonts.bold, color: COLOR_TEXT,
    });
  }
  const valueX = MARGIN_SIDE + s(ctx, SKILLS_LABEL_COL_W);
  const valueWidth = (PAGE_W - MARGIN_SIDE) - valueX;
  const valueLines = wrap(value, ctx.fonts.regular, bulletSize, valueWidth);
  if (valueLines.length === 0) return;
  if (ctx.draw) {
    ctx.page.drawText(valueLines[0], {
      x: valueX, y: ctx.y,
      size: bulletSize, font: ctx.fonts.regular, color: COLOR_TEXT,
    });
  }
  for (let i = 1; i < valueLines.length; i++) {
    ctx.y -= s(ctx, LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(valueLines[i], {
        x: valueX, y: ctx.y,
        size: bulletSize, font: ctx.fonts.regular, color: COLOR_TEXT,
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
        x: MARGIN_SIDE, y: ctx.y,
        size: bulletSize, font: ctx.fonts.regular, color: COLOR_TEXT,
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
        x: MARGIN_SIDE, y: ctx.y,
        size: bodySize, font: ctx.fonts.regular, color: COLOR_TEXT,
      });
    }
  }
}

// ─── Banner header (fixed-size, no scale) ──────────────────────────
// Draws only when ctx.draw === true. The measure pass skips it; banner
// height is accounted for separately in buildCvPdf().
function renderBanner(ctx: Ctx, cvData: CvData, userContext: UserContext) {
  if (!ctx.draw) return;
  const headerName = trim(cvData.header?.name || userContext.full_name);
  const name = headerName.toUpperCase();
  const contactBits = [
    cvData.header?.phone || userContext.phone_number,
    cvData.header?.email || userContext.email,
    cvData.header?.location || userContext.location,
    cvData.header?.linkedin || userContext.linkedin_url,
  ].map((v) => trim(v)).filter(Boolean);

  // Full-width dark banner
  const bannerY = PAGE_H - BANNER_H;
  ctx.page.drawRectangle({
    x: 0, y: bannerY, width: PAGE_W, height: BANNER_H,
    color: COLOR_BANNER_BG,
  });

  // Name (tracked caps, cream, centered) — baseline at BANNER_TOP_PAD
  // from top of banner.
  const nameBaselineY = PAGE_H - BANNER_TOP_PAD - SIZE_NAME;
  const nameW = measureTracked(name, ctx.fonts.bold, SIZE_NAME, TRACK_NAME);
  const nameX = MARGIN_SIDE + (CONTENT_W - nameW) / 2;
  // Pass a temporary "always draw" ctx for the tracked draw helper.
  // The outer renderBanner is gated already; reuse drawTracked with the
  // same ctx since draw is true here.
  drawTracked(ctx, name, {
    x: nameX, y: nameBaselineY,
    size: SIZE_NAME, font: ctx.fonts.bold,
    color: COLOR_NAME, tracking: TRACK_NAME,
  });

  // Contact strip — centered, muted cream on dark.
  if (contactBits.length > 0) {
    const contactY = nameBaselineY - BANNER_GAP_NAME_CONTACT - SIZE_CONTACT;
    const contact = contactBits.join("  \u00B7  ");
    const contactW = ctx.fonts.regular.widthOfTextAtSize(contact, SIZE_CONTACT);
    ctx.page.drawText(contact, {
      x: MARGIN_SIDE + (CONTENT_W - contactW) / 2, y: contactY,
      size: SIZE_CONTACT, font: ctx.fonts.regular, color: COLOR_CONTACT,
    });
  }
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

// Skills: 2-column grid with bold label column + values column.
function renderSkills(ctx: Ctx, cvData: CvData) {
  const sk = cvData.skills || {};
  if (!(sk.domain?.length || sk.tools?.length || sk.technical?.length)) return;
  drawSectionHeading(ctx, "Skills & Tools");
  if (sk.domain?.length) drawSkillsRow(ctx, "Domain", sk.domain);
  if (sk.tools?.length) drawSkillsRow(ctx, "Tools", sk.tools);
  if (sk.technical?.length) drawSkillsRow(ctx, "Technical", sk.technical);
}

// Languages — defensive normalization (handles the no-separator
// `English (Native)Hebrew (Fluent)` bug we saw in production); inline
// with mid-dot separator.
function renderLanguages(ctx: Ctx, cvData: CvData) {
  let rawItems: any[] = [];
  if (Array.isArray(cvData.languages)) {
    rawItems = cvData.languages;
  } else if (typeof cvData.languages === "string") {
    rawItems = [cvData.languages];
  } else if (Array.isArray(cvData.skills?.languages)) {
    rawItems = cvData.skills!.languages!;
  }

  const formatted: string[] = [];
  for (const item of rawItems) {
    if (!item) continue;
    if (typeof item === "string") {
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

// ─── Section dispatch ──────────────────────────────────────────────
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

  // Content area sits BELOW the fixed-size banner. Available vertical
  // space for sections is calculated from that.
  const contentTopY = PAGE_H - BANNER_H - SP_AFTER_BANNER;
  const contentAvailableH = contentTopY - MARGIN_BOTTOM;

  // ─── Pass 1: MEASURE (sections only — banner is fixed) ───
  const measureCtx: Ctx = {
    page, fonts, accent,
    y: contentTopY,
    draw: false,
    scale: SCALE_MAX,
  };
  renderAllSections(measureCtx, cvData, config.sectionOrder);
  const usedHeight = contentTopY - measureCtx.y;

  let scale = SCALE_MAX;
  if (usedHeight > contentAvailableH) {
    scale = Math.max(SCALE_MIN, contentAvailableH / usedHeight);
  }
  const fits = (usedHeight * scale) <= contentAvailableH + 0.5;
  const tag = scale < SCALE_WARN ? "[CV-PDF][WARN]" : "[CV-PDF]";
  console.log(
    `${tag} measure pass: content used ${usedHeight.toFixed(1)}pt of ${contentAvailableH.toFixed(1)}pt available → scale ${scale.toFixed(3)} (fits: ${fits})`,
  );

  // ─── Pass 2: DRAW ───
  // Cream page background first (covers everything), then dark banner on
  // top of that (covers only the top BANNER_H strip), then content below.
  page.drawRectangle({
    x: 0, y: 0, width: PAGE_W, height: PAGE_H,
    color: COLOR_PAGE,
  });
  const drawCtx: Ctx = {
    page, fonts, accent,
    y: contentTopY,
    draw: true,
    scale,
  };
  renderBanner(drawCtx, cvData, userContext);
  renderAllSections(drawCtx, cvData, config.sectionOrder);

  return await pdfDoc.save();
}

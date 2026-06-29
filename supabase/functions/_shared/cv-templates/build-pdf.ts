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
  rgb,
} from "https://esm.sh/pdf-lib@1.17.1";
// @pdf-lib/fontkit ships CommonJS; esm.sh's default-interop yields the Fontkit
// object at runtime, but its .d.ts declares no default export, so import the
// namespace and take `.default` (falling back to the namespace itself). Typed
// `any` because the runtime object and the .d.ts namespace don't share a shape.
import * as fontkitMod from "https://esm.sh/@pdf-lib/fontkit@1.1.1";
// deno-lint-ignore no-explicit-any
const fontkit: any =
  (fontkitMod as { default?: unknown }).default ?? fontkitMod;

import type { TemplateConfig, SectionKey } from "./types.ts";
import {
  ARIMO_BOLD,
  ARIMO_BOLDITALIC,
  ARIMO_ITALIC,
  ARIMO_REGULAR,
} from "./arimo-fonts.ts";
import { getTemplateRender } from "./template-config.ts";
import {
  GELASIO_REGULAR,
  GELASIO_BOLD,
  GELASIO_ITALIC,
  GELASIO_BOLDITALIC,
} from "./gelasio-fonts.ts";
import {
  TINOS_REGULAR,
  TINOS_BOLD,
  TINOS_ITALIC,
  TINOS_BOLDITALIC,
} from "./tinos-fonts.ts";
import { CARDO_REGULAR, CARDO_BOLD, CARDO_ITALIC } from "./cardo-fonts.ts";

// Embedded font bytes per family. serif:true templates pick their family; the
// rest use Arimo (sans). Cardo has no bold-italic → fall back to Cardo italic
// (the only place boldItalic is used is the right-aligned dates).
const FONT_BYTES: Record<
  string,
  {
    regular: Uint8Array;
    bold: Uint8Array;
    italic: Uint8Array;
    boldItalic: Uint8Array;
  }
> = {
  arimo: {
    regular: ARIMO_REGULAR,
    bold: ARIMO_BOLD,
    italic: ARIMO_ITALIC,
    boldItalic: ARIMO_BOLDITALIC,
  },
  gelasio: {
    regular: GELASIO_REGULAR,
    bold: GELASIO_BOLD,
    italic: GELASIO_ITALIC,
    boldItalic: GELASIO_BOLDITALIC,
  },
  tinos: {
    regular: TINOS_REGULAR,
    bold: TINOS_BOLD,
    italic: TINOS_ITALIC,
    boldItalic: TINOS_BOLDITALIC,
  },
  cardo: {
    regular: CARDO_REGULAR,
    bold: CARDO_BOLD,
    italic: CARDO_ITALIC,
    boldItalic: CARDO_ITALIC,
  },
};

// ─── Page geometry (US Letter, points) ─────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_SIDE = 50;
const MARGIN_BOTTOM = 40;
const CONTENT_W = PAGE_W - 2 * MARGIN_SIDE;

// ─── Default content typography (scaled by ctx.scale) ──────────────
const SIZE_SECTION = 11; // section heading (UPPERCASE)
const SIZE_BODY = 10.5; // entry title, body paragraph
const SIZE_BULLET = 10; // bullet text
const SIZE_DATE = 9.5; // right-aligned italic
const SIZE_SUBLINE = 10; // education institution line

// Tracking. Note: pdf-lib has no native characterSpacing — we draw each
// glyph at a measured x-offset and add this gap. The value is in points,
// NOT a percentage of font size, so a 2pt gap at 11pt section text reads
// as ~18% tracking (heavy). 1pt at 11pt = ~9% (subtle but distinct).
const TRACK_SECTION = 1; // ~9% of 11pt — subtle tracking

// ─── Colors ─────────────────────────────────────────────────────────
// Single unified text color (#2C3E50 dark slate). Body, entry titles,
// dates, bullets, sub-lines, section headings, bullet dots — everything
// rendered on the cream page uses COLOR_TEXT. The banner has its own
// pair of colors (cream name + slightly muted cream contact strip) since
// they read on the dark banner background.
const COLOR_TEXT = rgb(44 / 255, 62 / 255, 80 / 255); // #2C3E50 — primary text on cream

// ─── Clean-white template palette (matches the studio .cv-doc) ──────
// Fixed across all five templates; only accent/case/rule/font vary per token.
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_INK = rgb(26 / 255, 26 / 255, 26 / 255); // #1A1A1A name + entry titles
const COLOR_BODY = rgb(51 / 255, 49 / 255, 46 / 255); // #33312E bullets/body
const COLOR_MUTED = rgb(138 / 255, 135 / 255, 130 / 255); // #8A8782 headline/dates

// Header block (clean white, left-aligned). Fixed-height like the old banner so
// the measure/draw fit only flows the SECTIONS below it.
const HEADER_TOP_MARGIN = 50;
const SIZE_NAME_HEADER = 28;
const SIZE_HEADLINE = 14;
const SIZE_CONTACT_H = 11.5;
const HEADER_NAME_Y = PAGE_H - HEADER_TOP_MARGIN - SIZE_NAME_HEADER;
const HEADER_HEADLINE_Y = HEADER_NAME_Y - 8 - SIZE_HEADLINE;
const HEADER_CONTACT_Y = HEADER_HEADLINE_Y - 7 - SIZE_CONTACT_H;
const SP_AFTER_HEADER = 26;
const HEADER_CONTENT_TOP = HEADER_CONTACT_Y - SP_AFTER_HEADER;

// ─── Line metrics (scale with ctx.scale) ───────────────────────────
const LH_BODY = 12; // 10pt × 1.2
const LH_BULLET_GAP = 14; // 10pt × 1.4 between bullets
const SP_SECTION_BEFORE = 28; // above section heading — bumped 20→28 for breathing room
const SP_AFTER_ACCENT_LINE = 12; // after the accent line — bumped 10→12
const SP_ENTRY_BEFORE = 14; // between sibling entries — bumped 10→14

// ─── Premium ("Classic") design variant ─────────────────────────────
// Gated per-template via tpl.premium (set ONLY on the "modern"/Classic token
// in template-config). Every branch below falls back to the values above when
// premium is false, so the other four templates render byte-identical. This is
// the single-column, ATS-safe typography upgrade: larger name, monochrome
// near-black headings, a full-width 0.75pt rule beneath each heading, a
// two-line role/company hierarchy, and an airier ~1.25 rhythm. See
// docs/engineering/cv-template-rendering-spec.md.
const P_RULE_THICKNESS = 0.75; // section + header rules
const COLOR_RULE = COLOR_INK; // monochrome near-black rules

// Header (absolute Y, not scaled — matches the non-premium header).
const P_SIZE_NAME = 30;
const P_SIZE_HEADLINE = 12.5;
const P_SIZE_CONTACT = 9.5;
const P_HEADER_NAME_Y = PAGE_H - HEADER_TOP_MARGIN - P_SIZE_NAME;
const P_HEADER_HEADLINE_Y = P_HEADER_NAME_Y - 9 - P_SIZE_HEADLINE;
const P_HEADER_CONTACT_Y = P_HEADER_HEADLINE_Y - 7 - P_SIZE_CONTACT;
const P_HEADER_RULE_Y = P_HEADER_CONTACT_Y - 12; // hairline under the contact row
const P_HEADER_CONTENT_TOP = P_HEADER_RULE_Y - 22; // first section starts here

// Section + entry typography (scaled by ctx.scale).
const P_SIZE_ROLE = 11; // bold role title (own line)
const P_SIZE_ORG = 10; // company / org (own line, italic muted)
const P_TRACK_SECTION = 1.5; // ~14% of 11pt — heavier, deliberate
const P_SP_SECTION_BEFORE = 26; // above each section heading
const P_SP_AFTER_RULE = 12; // heading rule → first entry
const P_SP_ENTRY_BEFORE = 16; // between sibling entries
const P_LH_ROLE_TO_ORG = 13; // role line → company line
const P_LH_BODY = 13; // ~1.25 at 10.5 — wrapped-line leading
const P_LH_BULLET_GAP = 15; // gap before each bullet
const P_HEADING_RULE_DROP = 6; // baseline → rule, below the heading

// ─── Shrink-to-fit bounds ───────────────────────────────────────────
// FLOOR is the readable minimum (body 10.5 × 0.72 ≈ 7.6pt). One page only:
// a CV that fits at scale ≥ FLOOR renders as-is (unchanged from before); a CV
// that would need to go below FLOOR is CURATED at clean boundaries to fit at
// exactly FLOOR (see curateToFit) — the old "shrink to 0.55 then paint below
// the page edge" silent-clip path is gone.
const FLOOR = 0.72;
const SCALE_MAX = 1.0;

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
const safeArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const trim = (v: unknown): string => String(v ?? "").trim();

// ─── Unicode sanitize (font-cmap-driven; the crash backstop) ─────────
// Every string that reaches embedFont/widthOfTextAtSize/drawText is run
// through this first (see the chokepoint in buildCvPdf). Per codepoint:
//   • Arimo has a glyph for it → keep as-is (é, ā, ñ, ç all survive).
//   • no glyph → NFKD-decompose and keep the renderable base components,
//     dropping combining marks (pdf-lib does NO mark positioning, so a
//     kept mark would float) — e.g. a missing precomposed char falls back
//     to its base letter.
//   • still nothing renderable (Hebrew, emoji, other scripts) → dropped,
//     not substituted. No tofu boxes, and — because no glyph-less codepoint
//     ever reaches the encoder — structurally no throw, regardless of input.
// Renderability is read from the font's ACTUAL cmap via fontkit, so it
// stays correct if the embedded font is ever changed.
type GlyphFont = {
  hasGlyphForCodePoint?: (cp: number) => boolean;
  characterSet?: number[];
};
const COMBINING_MARK = /\p{M}/u;

// Common typographic punctuation the Latin font subsets OMIT. Without this the
// sanitizer dropped them entirely — e.g. an en-dash date range "2023 – Present"
// rendered as "2023 Present" (no connector), and the honors em-dash vanished.
// Degrade to an always-present ASCII equivalent instead of dropping. Only used
// as a FALLBACK: if a font's subset does include the real glyph, has(cp) is
// true and the original codepoint is kept (so a future re-subset just works).
const PUNCT_FALLBACK: Record<number, string> = {
  0x2013: "-", // en dash
  0x2014: "-", // em dash
  0x2018: "'", // ‘
  0x2019: "'", // ’
  0x201c: '"', // “
  0x201d: '"', // ”
  0x2026: "...", // ellipsis
};
function makeCodepointSanitizer(fk: GlyphFont): (s: string) => string {
  let charset: Set<number> | null = null;
  const has = (cp: number): boolean => {
    if (typeof fk.hasGlyphForCodePoint === "function") {
      try {
        return !!fk.hasGlyphForCodePoint(cp);
      } catch {
        /* fall through */
      }
    }
    if (!charset && Array.isArray(fk.characterSet)) {
      charset = new Set(fk.characterSet);
    }
    // Last resort: keep. A custom (fontkit) font maps missing glyphs to
    // .notdef rather than throwing, so keeping is still crash-safe.
    return charset ? charset.has(cp) : true;
  };
  const cache = new Map<number, string>();
  const repr = (cp: number): string => {
    const cached = cache.get(cp);
    if (cached !== undefined) return cached;
    let out: string;
    if (has(cp)) {
      out = String.fromCodePoint(cp);
    } else if (PUNCT_FALLBACK[cp] !== undefined) {
      // Curated ASCII fallback for subset-omitted punctuation (keep only the
      // fallback chars the font actually has — ASCII basics always present).
      out = [...PUNCT_FALLBACK[cp]]
        .filter((c) => has(c.codePointAt(0)!))
        .join("");
    } else {
      out = "";
      for (const ch of String.fromCodePoint(cp).normalize("NFKD")) {
        if (COMBINING_MARK.test(ch)) continue;
        const dcp = ch.codePointAt(0)!;
        if (has(dcp)) out += ch;
      }
    }
    cache.set(cp, out);
    return out;
  };
  return (s: string): string => {
    let out = "";
    for (const ch of s) out += repr(ch.codePointAt(0)!);
    return out;
  };
}
function deepSanitizeStrings(
  value: unknown,
  sanitize: (s: string) => string,
): unknown {
  if (typeof value === "string") return sanitize(value);
  if (Array.isArray(value)) {
    return value.map((v) => deepSanitizeStrings(v, sanitize));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>)) {
      out[k] = deepSanitizeStrings(
        (value as Record<string, unknown>)[k],
        sanitize,
      );
    }
    return out;
  }
  return value;
}

function hexToRgb(hex: string) {
  const c = (hex || "000000").replace("#", "");
  return rgb(
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  );
}

function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
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
  accent: any; // rgb of the template accent (section labels / rule / bullet dots)
  labelCase: "uppercase" | "capitalize";
  ruleOn: boolean;
  premium: boolean; // the "Classic" typography variant (per-template gate)
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
  ctx: Ctx,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: any;
    tracking: number;
  },
): number {
  let cursor = opts.x;
  for (const ch of text) {
    if (ctx.draw) {
      ctx.page.drawText(ch, {
        x: cursor,
        y: opts.y,
        size: opts.size,
        font: opts.font,
        color: opts.color,
      });
    }
    cursor += opts.font.widthOfTextAtSize(ch, opts.size) + opts.tracking;
  }
  return cursor;
}

function titleCase(label: string): string {
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
}
// 35% accent over white — matches the studio .cv-section-rule tint.
function accentTint(accent: any) {
  return rgb(
    0.35 * accent.red + 0.65,
    0.35 * accent.green + 0.65,
    0.35 * accent.blue + 0.65,
  );
}

// Section heading: tracked label cased per the labelCase token, colored in the
// template accent, with an optional accent-tinted rule line to the RIGHT of the
// label (studio .cv-section-rule), drawn only when the rule token is on.
function drawSectionHeading(ctx: Ctx, label: string) {
  // Premium: monochrome near-black heading + a full-width 0.75pt rule BENEATH
  // the label (margin-to-margin) — the dominant "designed" signal.
  if (ctx.premium) {
    ctx.y -= s(ctx, P_SP_SECTION_BEFORE);
    const headSize = s(ctx, SIZE_SECTION);
    const text =
      ctx.labelCase === "uppercase" ? label.toUpperCase() : titleCase(label);
    drawTracked(ctx, text, {
      x: MARGIN_SIDE,
      y: ctx.y,
      size: headSize,
      font: ctx.fonts.bold,
      color: COLOR_INK,
      tracking: s(ctx, P_TRACK_SECTION),
    });
    const ruleY = ctx.y - s(ctx, P_HEADING_RULE_DROP);
    if (ctx.draw) {
      ctx.page.drawLine({
        start: { x: MARGIN_SIDE, y: ruleY },
        end: { x: PAGE_W - MARGIN_SIDE, y: ruleY },
        thickness: s(ctx, P_RULE_THICKNESS),
        color: COLOR_RULE,
      });
    }
    ctx.y = ruleY - s(ctx, P_SP_AFTER_RULE);
    return;
  }

  ctx.y -= s(ctx, SP_SECTION_BEFORE);
  const headSize = s(ctx, SIZE_SECTION);
  const headTrack = s(ctx, TRACK_SECTION);
  const text =
    ctx.labelCase === "uppercase" ? label.toUpperCase() : titleCase(label);
  const endX = drawTracked(ctx, text, {
    x: MARGIN_SIDE,
    y: ctx.y,
    size: headSize,
    font: ctx.fonts.bold,
    color: ctx.accent,
    tracking: headTrack,
  });
  if (ctx.ruleOn && ctx.draw) {
    const ruleY = ctx.y + headSize * 0.35;
    ctx.page.drawLine({
      start: { x: endX + s(ctx, 10), y: ruleY },
      end: { x: PAGE_W - MARGIN_SIDE, y: ruleY },
      thickness: s(ctx, 1.5),
      color: accentTint(ctx.accent),
    });
  }
  ctx.y -= s(ctx, SP_AFTER_ACCENT_LINE);
}

function drawEntryTitleLine(
  ctx: Ctx,
  titleLeft: string,
  dateRight: string | undefined,
  isFirst: boolean,
) {
  if (!isFirst)
    ctx.y -= s(ctx, ctx.premium ? P_SP_ENTRY_BEFORE : SP_ENTRY_BEFORE);
  const titleSize = s(ctx, ctx.premium ? P_SIZE_ROLE : SIZE_BODY);
  if (ctx.draw) {
    ctx.page.drawText(titleLeft, {
      x: MARGIN_SIDE,
      y: ctx.y,
      size: titleSize,
      font: ctx.fonts.bold,
      color: COLOR_INK,
    });
  }
  const date = trim(dateRight);
  if (date) {
    const dateSize = s(ctx, SIZE_DATE);
    // Premium: quiet regular muted date; non-premium: the existing bold-italic.
    const dateFont = ctx.premium ? ctx.fonts.regular : ctx.fonts.boldItalic;
    const dateW = dateFont.widthOfTextAtSize(date, dateSize);
    if (ctx.draw) {
      ctx.page.drawText(date, {
        x: PAGE_W - MARGIN_SIDE - dateW,
        y: ctx.y,
        size: dateSize,
        font: dateFont,
        color: COLOR_MUTED,
      });
    }
  }
}

// Premium experience entry: bold role title on its own line (date right-aligned
// on that line), company/org on its OWN line in italic muted just beneath.
// Date-only — our cv_data carries no per-entry location.
function drawRoleEntry(
  ctx: Ctx,
  title: string,
  org: string,
  dateRight: string | undefined,
  isFirst: boolean,
) {
  if (!isFirst) ctx.y -= s(ctx, P_SP_ENTRY_BEFORE);
  if (ctx.draw && title) {
    ctx.page.drawText(title, {
      x: MARGIN_SIDE,
      y: ctx.y,
      size: s(ctx, P_SIZE_ROLE),
      font: ctx.fonts.bold,
      color: COLOR_INK,
    });
  }
  const date = trim(dateRight);
  if (date) {
    const dateSize = s(ctx, SIZE_DATE);
    const dateW = ctx.fonts.regular.widthOfTextAtSize(date, dateSize);
    if (ctx.draw) {
      ctx.page.drawText(date, {
        x: PAGE_W - MARGIN_SIDE - dateW,
        y: ctx.y,
        size: dateSize,
        font: ctx.fonts.regular,
        color: COLOR_MUTED,
      });
    }
  }
  if (org) {
    ctx.y -= s(ctx, P_LH_ROLE_TO_ORG);
    if (ctx.draw) {
      ctx.page.drawText(org, {
        x: MARGIN_SIDE,
        y: ctx.y,
        size: s(ctx, P_SIZE_ORG),
        font: ctx.fonts.italic,
        color: COLOR_MUTED,
      });
    }
  }
}

function drawSubLine(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, ctx.premium ? P_LH_ROLE_TO_ORG : LH_BODY);
  if (ctx.draw) {
    ctx.page.drawText(text, {
      x: MARGIN_SIDE,
      y: ctx.y,
      size: s(ctx, SIZE_SUBLINE),
      font: ctx.premium ? ctx.fonts.italic : ctx.fonts.regular,
      color: ctx.premium ? COLOR_MUTED : COLOR_BODY,
    });
  }
}

function drawBullet(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, ctx.premium ? P_LH_BULLET_GAP : LH_BULLET_GAP);
  const bulletIndent = 16;
  const textWidth = CONTENT_W - bulletIndent;
  const bulletSize = s(ctx, ctx.premium ? SIZE_BODY : SIZE_BULLET);
  const lineLead = ctx.premium ? P_LH_BODY : LH_BODY;
  if (ctx.draw) {
    ctx.page.drawCircle({
      x: MARGIN_SIDE + 5,
      y: ctx.y + bulletSize * 0.28,
      size: s(ctx, 1.6),
      color: ctx.accent,
    });
  }
  const lines = wrap(text, ctx.fonts.regular, bulletSize, textWidth);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, lineLead);
    if (ctx.draw) {
      ctx.page.drawText(lines[i], {
        x: MARGIN_SIDE + bulletIndent,
        y: ctx.y,
        size: bulletSize,
        font: ctx.fonts.regular,
        color: COLOR_BODY,
      });
    }
  }
}

function drawPlainLine(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, ctx.premium ? P_LH_BULLET_GAP : LH_BULLET_GAP);
  const bulletSize = s(ctx, ctx.premium ? SIZE_BODY : SIZE_BULLET);
  const lines = wrap(text, ctx.fonts.regular, bulletSize, CONTENT_W);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, ctx.premium ? P_LH_BODY : LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(lines[i], {
        x: MARGIN_SIDE,
        y: ctx.y,
        size: bulletSize,
        font: ctx.fonts.regular,
        color: COLOR_TEXT,
      });
    }
  }
}

function drawBodyParagraph(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, ctx.premium ? P_LH_BULLET_GAP : LH_BULLET_GAP);
  const bodySize = s(ctx, SIZE_BODY);
  const lines = wrap(text, ctx.fonts.regular, bodySize, CONTENT_W);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, ctx.premium ? P_LH_BODY : LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(lines[i], {
        x: MARGIN_SIDE,
        y: ctx.y,
        size: bodySize,
        font: ctx.fonts.regular,
        color: COLOR_BODY,
      });
    }
  }
}

// ─── Banner header (fixed-size, no scale) ──────────────────────────
// Draws only when ctx.draw === true. The measure pass skips it; banner
// height is accounted for separately in buildCvPdf().
// Clean-white header (no banner): name 28pt bold ink, headline 14pt muted,
// mid-dot contact row — all left-aligned at the side margin, matching the
// studio .cv-doc. Fixed position from the top; sections flow below.
function renderHeader(ctx: Ctx, cvData: CvData, userContext: UserContext) {
  if (!ctx.draw) return;
  const name = trim(cvData.header?.name || userContext.full_name);
  const headline = trim(cvData.header?.subtitle);
  const contactBits = [
    cvData.header?.email || userContext.email,
    cvData.header?.linkedin || userContext.linkedin_url,
    cvData.header?.location || userContext.location,
    cvData.header?.phone || userContext.phone_number,
  ]
    .map((v) => trim(v))
    .filter(Boolean);

  // Premium: larger name, quieter headline + contact, and a full-width hairline
  // rule under the contact row separating the header from the body.
  const nameSize = ctx.premium ? P_SIZE_NAME : SIZE_NAME_HEADER;
  const headlineSize = ctx.premium ? P_SIZE_HEADLINE : SIZE_HEADLINE;
  const contactSize = ctx.premium ? P_SIZE_CONTACT : SIZE_CONTACT_H;
  const nameY = ctx.premium ? P_HEADER_NAME_Y : HEADER_NAME_Y;
  const headlineY = ctx.premium ? P_HEADER_HEADLINE_Y : HEADER_HEADLINE_Y;
  const contactY = ctx.premium ? P_HEADER_CONTACT_Y : HEADER_CONTACT_Y;

  ctx.page.drawText(name, {
    x: MARGIN_SIDE,
    y: nameY,
    size: nameSize,
    font: ctx.fonts.bold,
    color: COLOR_INK,
  });
  if (headline) {
    ctx.page.drawText(headline, {
      x: MARGIN_SIDE,
      y: headlineY,
      size: headlineSize,
      font: ctx.fonts.regular,
      color: COLOR_MUTED,
    });
  }
  if (contactBits.length > 0) {
    ctx.page.drawText(contactBits.join("  \u00B7  "), {
      x: MARGIN_SIDE,
      y: contactY,
      size: contactSize,
      font: ctx.fonts.regular,
      color: ctx.premium ? COLOR_MUTED : COLOR_BODY,
    });
  }
  if (ctx.premium) {
    ctx.page.drawLine({
      start: { x: MARGIN_SIDE, y: P_HEADER_RULE_Y },
      end: { x: PAGE_W - MARGIN_SIDE, y: P_HEADER_RULE_Y },
      thickness: P_RULE_THICKNESS,
      color: COLOR_RULE,
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
  ctx: Ctx,
  label: string,
  entries: any[],
  orgKey: string,
) {
  if (!Array.isArray(entries) || entries.length === 0) return;
  drawSectionHeading(ctx, label);
  entries.forEach((entry, idx) => {
    const title = trim(entry?.title);
    const org = trim(entry?.[orgKey]);
    if (ctx.premium) {
      // Two-line hierarchy: bold role + right-aligned date, then company line.
      drawRoleEntry(ctx, title, org, entry?.dates, idx === 0);
    } else {
      const titleLine = org ? (title ? `${title}, ${org}` : org) : title;
      drawEntryTitleLine(ctx, titleLine, entry?.dates, idx === 0);
    }
    for (const b of entry?.bullets || []) drawBullet(ctx, trim(b));
  });
}

function renderProfessionalExperience(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.professional_experiences)
    ? cvData.professional_experiences
    : Array.isArray(cvData.experiences)
      ? cvData.experiences
      : [];
  renderExperienceBucket(ctx, "Professional Experience", list, "company");
}

function renderMilitaryService(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.military_experiences)
    ? cvData.military_experiences
    : cvData.military_service && (cvData.military_service as any).unit
      ? [cvData.military_service]
      : [];
  renderExperienceBucket(ctx, "Military Service", list, "unit");
}

function renderVolunteering(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.volunteering_experiences)
    ? cvData.volunteering_experiences
    : Array.isArray(cvData.volunteering)
      ? cvData.volunteering
      : [];
  renderExperienceBucket(ctx, "Volunteering", list, "organization");
}

function renderLeadership(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.leadership_experiences)
    ? cvData.leadership_experiences
    : [];
  renderExperienceBucket(ctx, "Leadership", list, "organization");
}

function renderEducation(ctx: Ctx, cvData: CvData) {
  const list = Array.isArray(cvData.education) ? cvData.education : [];
  if (list.length === 0) return;
  drawSectionHeading(ctx, "Education");

  const honorsSet = new Set(
    safeArray(cvData.honors_and_awards)
      .map((h: any) => (h && typeof h === "object" ? trim(h.name) : trim(h)))
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
    const subLine = degree || field ? institution : "";
    drawEntryTitleLine(ctx, topLine, edu?.dates, idx === 0);
    drawSubLine(ctx, subLine);

    if (edu?.gpa) drawBullet(ctx, `GPA: ${trim(edu.gpa)}`);

    const coursework = safeArray(edu?.coursework || edu?.relevant_coursework)
      .map(trim)
      .filter(Boolean);
    if (coursework.length > 0)
      drawBullet(ctx, `Relevant coursework: ${coursework.join(", ")}`);

    const academic = safeArray(edu?.academic_projects)
      .map(trim)
      .filter(Boolean);
    if (academic.length > 0)
      drawBullet(ctx, `Academic projects: ${academic.join("; ")}`);

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
  const all = [
    ...(sk.domain || []),
    ...(sk.tools || []),
    ...(sk.technical || []),
  ]
    .map(trim)
    .filter(Boolean);
  if (all.length === 0) return;
  drawSectionHeading(ctx, "Skills");
  drawBodyParagraph(ctx, all.join("  ·  "));
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
  const lines = safeArray(cvData.honors_and_awards)
    .map((h: any) => {
      if (!h) return "";
      if (typeof h === "string") return h;
      const name = trim(h.name);
      const desc = trim(h.description);
      return name && desc ? `${name} \u2014 ${desc}` : name;
    })
    .filter(Boolean);
  if (lines.length === 0) return;
  drawSectionHeading(ctx, "Honors & Awards");
  for (const line of lines) drawBullet(ctx, line);
}

function renderCertifications(ctx: Ctx, cvData: CvData) {
  const certs = Array.isArray(cvData.certifications)
    ? cvData.certifications
    : [];
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
    for (const b of proj?.bullets || []) drawBullet(ctx, trim(b));
  });
}

// ─── Section dispatch ──────────────────────────────────────────────
function renderAllSections(
  ctx: Ctx,
  cvData: CvData,
  sectionOrder: SectionKey[],
) {
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

// ─── One-page curation (clean-boundary, never clips) ───────────────
// When a CV can't fit one page at the readable FLOOR scale, we reduce content
// at clean boundaries instead of clipping it off the page: drop whole trailing
// entries/sections in render order, and trim trailing bullets of the boundary
// entry (always keeping ≥1). Everything dropped is reported in CvFit so the UI
// can tell the user exactly what was hidden — no silent loss.

export interface CvFit {
  trimmed: boolean;
  scale: number;
  lowestY: number; // lowest baseline painted; ≥ MARGIN_BOTTOM ⇒ no clip
  droppedSections: string[];
  droppedEntries: { section: string; title: string }[];
  droppedBulletCount: number;
}
export interface CvPdfResult {
  bytes: Uint8Array;
  fit: CvFit;
}

// The entry array a section renders from (mirrors the per-section renderers),
// or null for non-entry sections. Returns a live reference so popping mutates
// the data the draw pass will read.
function entryArrayFor(cv: CvData, key: string): any[] | null {
  switch (key) {
    case "professional_experience":
      if (Array.isArray(cv.professional_experiences))
        return cv.professional_experiences;
      if (Array.isArray(cv.experiences)) return cv.experiences;
      return null;
    case "military_service":
      return Array.isArray(cv.military_experiences)
        ? cv.military_experiences
        : null;
    case "volunteering":
      if (Array.isArray(cv.volunteering_experiences))
        return cv.volunteering_experiences;
      if (Array.isArray(cv.volunteering)) return cv.volunteering;
      return null;
    case "leadership":
      return Array.isArray(cv.leadership_experiences)
        ? cv.leadership_experiences
        : null;
    case "education":
      return Array.isArray(cv.education) ? cv.education : null;
    case "projects":
      return Array.isArray(cv.projects) ? cv.projects : null;
    case "honors":
      return Array.isArray(cv.honors_and_awards) ? cv.honors_and_awards : null;
    case "certifications":
      return Array.isArray(cv.certifications) ? cv.certifications : null;
    default:
      return null;
  }
}

const SECTION_LABEL: Record<string, string> = {
  about: "About Me",
  professional_experience: "Professional Experience",
  military_service: "Military Service",
  volunteering: "Volunteering",
  leadership: "Leadership",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  honors: "Honors & Awards",
  certifications: "Certifications",
  projects: "Projects",
};

function entryTitle(entry: any, key: string): string {
  if (key === "education") {
    const d = trim(entry?.degree);
    const f = trim(entry?.field_of_study);
    return d || f || trim(entry?.institution) || "entry";
  }
  if (key === "honors" || key === "certifications") {
    return typeof entry === "string" ? entry : trim(entry?.name) || "item";
  }
  const t = trim(entry?.title) || trim(entry?.name);
  const org = trim(
    entry?.company || entry?.unit || entry?.organization || entry?.issuer,
  );
  return t && org ? `${t} (${org})` : t || org || "entry";
}

// Remove the single lowest-priority unit from the tail of the render flow.
// Returns false when nothing removable remains (header + summary always stay).
function removeOneTailUnit(
  cv: CvData,
  order: SectionKey[],
  fit: CvFit,
): boolean {
  for (let i = order.length - 1; i >= 0; i--) {
    const key = order[i];
    const arr = entryArrayFor(cv, key);
    if (arr && arr.length > 0) {
      const last = arr[arr.length - 1];
      const bullets = last && Array.isArray(last.bullets) ? last.bullets : null;
      if (
        key !== "honors" &&
        key !== "certifications" &&
        bullets &&
        bullets.length > 1
      ) {
        bullets.pop();
        fit.droppedBulletCount++;
        return true;
      }
      arr.pop();
      fit.droppedEntries.push({ section: key, title: entryTitle(last, key) });
      if (arr.length === 0 && !fit.droppedSections.includes(SECTION_LABEL[key]))
        fit.droppedSections.push(SECTION_LABEL[key]);
      return true;
    }
    // Whole-section units (no per-entry structure): drop the section.
    if (key === "skills") {
      const sk = cv.skills;
      const has =
        sk &&
        ((sk.domain && sk.domain.length) ||
          (sk.tools && sk.tools.length) ||
          (sk.technical && sk.technical.length));
      if (has) {
        cv.skills = {};
        fit.droppedSections.push(SECTION_LABEL.skills);
        return true;
      }
    }
    if (key === "languages") {
      const hasArr = Array.isArray(cv.languages) && cv.languages.length > 0;
      const hasSk =
        Array.isArray(cv.skills?.languages) && cv.skills!.languages!.length > 0;
      if (hasArr || hasSk) {
        cv.languages = [];
        if (cv.skills) cv.skills.languages = [];
        fit.droppedSections.push(SECTION_LABEL.languages);
        return true;
      }
    }
  }
  return false;
}

// ─── Main entry point ───────────────────────────────────────────────
export async function buildCvPdf(
  cvData: CvData,
  userContext: UserContext,
  config: TemplateConfig,
): Promise<CvPdfResult> {
  // STEP A (template-id plumbing): the selected template id now arrives here.
  // It is INERT in this step — logged only, never read by any measure/draw
  // path — so output is unchanged regardless of value. Later steps map the id
  // to a font/accent/case/rule design. See cv-template-rendering-spec.md.
  console.log(`[CV-PDF] template: ${config.template ?? "(none → default)"}`);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // Resolve the template + its tokens up front: family drives which font bytes
  // we embed; accent/case/rule drive the rendering.
  const tpl = getTemplateRender(config.template);
  const accent = hexToRgb(tpl.accentHex);
  const fb = FONT_BYTES[tpl.family] ?? FONT_BYTES.arimo;

  // Embed the family's weights (Arimo sans for modern/sharp; Gelasio/Tinos/Cardo
  // serif for editorial/executive/refined). subset:true keeps the PDF small.
  const fonts: Fonts = {
    regular: await pdfDoc.embedFont(fb.regular, { subset: true }),
    bold: await pdfDoc.embedFont(fb.bold, { subset: true }),
    italic: await pdfDoc.embedFont(fb.italic, { subset: true }),
    boldItalic: await pdfDoc.embedFont(fb.boldItalic, { subset: true }),
  };

  // Sanitize chokepoint: strip codepoints the EMBEDDED font can't render
  // (cmap-driven) from all drawn strings, so the renderer can't throw on any
  // input. See makeCodepointSanitizer.
  const sanitize = makeCodepointSanitizer(
    fontkit.create(fb.regular) as GlyphFont,
  );
  const cv = deepSanitizeStrings(cvData, sanitize) as CvData;
  const uc = deepSanitizeStrings(userContext, sanitize) as UserContext;

  const premium = tpl.premium === true;

  // Clean-white header is fixed-height; sections flow below it. The premium
  // header is taller (30pt name + hairline rule), so it has its own content top.
  const contentTopY = premium ? P_HEADER_CONTENT_TOP : HEADER_CONTENT_TOP;
  const contentAvailableH = contentTopY - MARGIN_BOTTOM;

  // ─── Pass 1: MEASURE (sections only — banner is fixed) ───
  // A reusable measure: walks the section flow with draw off and returns the
  // content height. Called once up front, then again per curation step.
  const measure = (data: CvData): number => {
    const mc: Ctx = {
      page,
      fonts,
      accent,
      labelCase: tpl.labelCase,
      ruleOn: tpl.rule,
      premium,
      y: contentTopY,
      draw: false,
      scale: SCALE_MAX,
    };
    renderAllSections(mc, data, config.sectionOrder);
    return contentTopY - mc.y;
  };

  const fit: CvFit = {
    trimmed: false,
    scale: SCALE_MAX,
    lowestY: contentTopY,
    droppedSections: [],
    droppedEntries: [],
    droppedBulletCount: 0,
  };

  const usedHeight = measure(cv);
  const fitScale = usedHeight > 0 ? contentAvailableH / usedHeight : SCALE_MAX;
  let scale: number;

  if (fitScale >= FLOOR) {
    // Fits at a readable scale — render as-is (unchanged from before: a CV in
    // [FLOOR, 1.0] gets exactly the scale it always did; ≥1.0 → no shrink).
    scale = Math.min(SCALE_MAX, fitScale);
  } else {
    // Would be unreadable / clip. Curate at clean boundaries until it fits at
    // FLOOR, then render at exactly FLOOR. Budget is the content height we can
    // afford at FLOOR. Guard caps iterations (header + summary never removed).
    scale = FLOOR;
    fit.trimmed = true;
    const budget = contentAvailableH / FLOOR;
    let guard = 0;
    while (measure(cv) > budget && guard++ < 1000) {
      if (!removeOneTailUnit(cv, config.sectionOrder, fit)) break;
    }
  }
  fit.scale = scale;

  const tag = fit.trimmed ? "[CV-PDF][CURATED]" : "[CV-PDF]";
  console.log(
    `${tag} measure: used ${usedHeight.toFixed(1)}pt of ${contentAvailableH.toFixed(1)}pt → scale ${scale.toFixed(3)}` +
      (fit.trimmed
        ? ` (dropped ${fit.droppedEntries.length} entries / ${fit.droppedBulletCount} bullets / sections: ${fit.droppedSections.join(", ") || "none"})`
        : ""),
  );

  // ─── Pass 2: DRAW ───
  // White page (clean-white templates); header + sections drawn on top.
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: COLOR_WHITE,
  });
  const drawCtx: Ctx = {
    page,
    fonts,
    accent,
    labelCase: tpl.labelCase,
    ruleOn: tpl.rule,
    premium,
    y: contentTopY,
    draw: true,
    scale,
  };
  renderHeader(drawCtx, cv, uc);
  renderAllSections(drawCtx, cv, config.sectionOrder);
  fit.lowestY = drawCtx.y;

  const bytes = await pdfDoc.save();
  return { bytes, fit };
}

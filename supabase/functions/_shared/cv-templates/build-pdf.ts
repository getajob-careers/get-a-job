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
import { skillGroupTopAdvance } from "./skills-layout.ts";
import { DAVID_REGULAR, DAVID_BOLD } from "./hebrew-fonts.ts";
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

// Premium spacing is ONE layout (the airy "comfortable" preset). To fit a
// longer CV on one page we scale the WHOLE layout — header sizes/gaps AND every
// section/entry/bullet size+gap — by a single ctx.scale. Because everything
// shrinks by the same factor, all spacing relationships are preserved and lines
// or sections can NEVER overlap; the page just gets smaller. There is no second
// "dense" set of values to collide. See docs/engineering/cv-template-rendering-spec.md.
interface Density {
  nameSize: number;
  headlineSize: number;
  contactSize: number;
  headerHeadlineGap: number; // name baseline → headline
  headerContactGap: number; // headline → contact
  headerRuleGap: number; // contact → hairline rule
  headerContentGap: number; // rule → first section
  roleSize: number;
  orgSize: number;
  trackSection: number;
  spSectionBefore: number;
  spAfterRule: number;
  spEntryBefore: number;
  lhRoleToOrg: number;
  lhBody: number;
  lhBulletGap: number;
  headingRuleDrop: number;
}

const COMFORTABLE: Density = {
  nameSize: 30,
  headlineSize: 12.5,
  contactSize: 9.5,
  headerHeadlineGap: 9,
  headerContactGap: 7,
  headerRuleGap: 12,
  headerContentGap: 22,
  roleSize: 11,
  orgSize: 10,
  trackSection: 1.5,
  spSectionBefore: 26,
  spAfterRule: 12,
  spEntryBefore: 16,
  lhRoleToOrg: 13,
  lhBody: 13, // ~1.24 at 10.5
  lhBulletGap: 15,
  headingRuleDrop: 6,
};

// Header Y positions for the layout at a given uniform scale, anchored at the
// fixed top margin and flowing down. Sizes AND gaps are multiplied by `scale`,
// so the header shrinks in lockstep with the body. Returns the section
// content-top (where the flow begins, below the header rule) and the header
// block height consumed (both at this scale).
function headerYs(d: Density, scale: number) {
  const sc = (v: number) => v * scale;
  const top = PAGE_H - HEADER_TOP_MARGIN;
  const nameY = top - sc(d.nameSize);
  const headlineY = nameY - sc(d.headerHeadlineGap) - sc(d.headlineSize);
  const contactY = headlineY - sc(d.headerContactGap) - sc(d.contactSize);
  const ruleY = contactY - sc(d.headerRuleGap);
  const contentTop = ruleY - sc(d.headerContentGap);
  return {
    nameY,
    headlineY,
    contactY,
    ruleY,
    contentTop,
    height: top - contentTop,
  };
}

// ─── Uniform scale-to-fit ───────────────────────────────────────────
// One layout (comfortable), fit by a single uniform scale. We ALWAYS fit the
// whole CV on one page and NEVER cut content: scale has NO floor — an unusually
// long CV simply keeps scaling down (a smaller-but-complete CV always beats a
// cut one). DENSE_HINT is only the point below which the studio MAY show a calm,
// dismissible "this CV is dense" hint — never an error, never implying a drop.
const SCALE_MAX = 1.0;
const DENSE_HINT = 0.72; // scale below this → optional calm density hint

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
function makeCodepointSanitizer(
  fkArg: GlyphFont | GlyphFont[],
): (s: string) => string {
  // A codepoint is renderable if ANY of the embedded fonts has a glyph for it.
  // The template font is Latin-only; the Hebrew fallback covers Hebrew, so
  // passing both here stops Hebrew from being stripped.
  const fks = Array.isArray(fkArg) ? fkArg : [fkArg];
  const charsets: (Set<number> | null)[] = fks.map(() => null);
  const oneHas = (fk: GlyphFont, i: number, cp: number): boolean => {
    if (typeof fk.hasGlyphForCodePoint === "function") {
      try {
        return !!fk.hasGlyphForCodePoint(cp);
      } catch {
        /* fall through */
      }
    }
    if (!charsets[i] && Array.isArray(fk.characterSet)) {
      charsets[i] = new Set(fk.characterSet);
    }
    // Last resort: keep. A custom (fontkit) font maps missing glyphs to
    // .notdef rather than throwing, so keeping is still crash-safe.
    return charsets[i] ? charsets[i]!.has(cp) : true;
  };
  const has = (cp: number): boolean => fks.some((fk, i) => oneHas(fk, i, cp));
  const cache = new Map<number, string>();
  const repr = (cp: number): string => {
    const cached = cache.get(cp);
    if (cached !== undefined) return cached;
    let out: string;
    if (PUNCT_FALLBACK[cp] !== undefined) {
      // Curated typographic punctuation ALWAYS degrades to ASCII, even when an
      // embedded font has the glyph. Latin text is drawn with the Latin font
      // (Arimo), whose subset omits en/em dashes + smart quotes, so keeping the
      // original renders a tofu box. The Hebrew fallback font added in #456 DOES
      // carry these glyphs, which made has(cp) true and re-enabled the box on date
      // ranges + title separators. Keep only fallback chars the font has (ASCII
      // basics are always present).
      out = [...PUNCT_FALLBACK[cp]]
        .filter((c) => has(c.codePointAt(0)!))
        .join("");
    } else if (has(cp)) {
      out = String.fromCodePoint(cp);
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
    // A single token wider than the column can't wrap on spaces — hard-break it
    // by character so it can never run off the text column (long URLs, compound
    // words, concatenated skills). Otherwise it would overflow the page edge.
    if (font.widthOfTextAtSize(w, size) > maxWidth) {
      if (current) {
        lines.push(current);
        current = "";
      }
      let chunk = "";
      for (const ch of w) {
        if (chunk && font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      current = chunk; // remainder stays on the line; following words append
      continue;
    }
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

// ─── Hebrew / RTL + width-fit helpers ───────────────────────────────
const HEBREW_RE = /[֐-׿יִ-ﭏ]/;
function hasHebrew(s: string): boolean {
  return HEBREW_RE.test(s || "");
}
// pdf-lib has no BiDi engine and draws left-to-right. For a Hebrew-containing
// string, reverse to visual order, then re-reverse the LTR runs (Latin letters,
// digits, and common URL/e-mail punctuation) so numbers and English still read
// left-to-right inside the otherwise right-to-left line. Makes Hebrew readable.
function bidi(s: string): string {
  if (!hasHebrew(s)) return s;
  const rev = [...(s || "")].reverse().join("");
  return rev.replace(/[A-Za-z0-9@._/:+()#&%-]+/g, (m) =>
    [...m].reverse().join(""),
  );
}
// Truncate with a trailing ellipsis so a single line can never exceed maxWidth
// (long titles that would overprint a right-aligned date; long name/contact).
function fitToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  if (!text || maxWidth <= 0) return text;
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ell = "...";
  let lo = 0,
    hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (font.widthOfTextAtSize(text.slice(0, mid) + ell, size) <= maxWidth)
      lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + ell;
}

// ─── Rendering context ──────────────────────────────────────────────
interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  // Hebrew-capable fallback (David Libre). The template fonts are Latin-only, so
  // any string containing Hebrew is drawn (and measured) with these instead —
  // otherwise the sanitizer strips Hebrew and the content renders blank.
  hebRegular: PDFFont;
  hebBold: PDFFont;
}
interface Ctx {
  page: PDFPage;
  fonts: Fonts;
  accent: any; // rgb of the template accent (section labels / rule / bullet dots)
  labelCase: "uppercase" | "capitalize";
  ruleOn: boolean;
  premium: boolean; // the "Classic" typography variant (per-template gate)
  d: Density; // active density tier (comfortable | dense)
  y: number;
  draw: boolean;
  scale: number;
}

function s(ctx: Ctx, base: number): number {
  return base * ctx.scale;
}

// Pick the font for a string: the Hebrew-capable David Libre for any string
// containing Hebrew (it also has Latin, so mixed strings render whole), else the
// template font. Bold maps to hebBold; italic/boldItalic map to hebRegular/
// hebBold (Hebrew has no italic).
function fontFor(
  ctx: Ctx,
  text: string,
  weight: "regular" | "bold" | "italic" | "boldItalic",
): PDFFont {
  if (hasHebrew(text)) {
    return weight === "bold" || weight === "boldItalic"
      ? ctx.fonts.hebBold
      : ctx.fonts.hebRegular;
  }
  return ctx.fonts[weight];
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
    ctx.y -= s(ctx, ctx.d.spSectionBefore);
    const headSize = s(ctx, SIZE_SECTION);
    const text =
      ctx.labelCase === "uppercase" ? label.toUpperCase() : titleCase(label);
    drawTracked(ctx, text, {
      x: MARGIN_SIDE,
      y: ctx.y,
      size: headSize,
      font: ctx.fonts.bold,
      color: COLOR_INK,
      tracking: s(ctx, ctx.d.trackSection),
    });
    const ruleY = ctx.y - s(ctx, ctx.d.headingRuleDrop);
    if (ctx.draw) {
      ctx.page.drawLine({
        start: { x: MARGIN_SIDE, y: ruleY },
        end: { x: PAGE_W - MARGIN_SIDE, y: ruleY },
        thickness: s(ctx, P_RULE_THICKNESS),
        color: COLOR_RULE,
      });
    }
    ctx.y = ruleY - s(ctx, ctx.d.spAfterRule);
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
    ctx.y -= s(ctx, ctx.premium ? ctx.d.spEntryBefore : SP_ENTRY_BEFORE);
  const titleSize = s(ctx, ctx.premium ? ctx.d.roleSize : SIZE_BODY);
  const date = trim(dateRight);
  const dateSize = s(ctx, SIZE_DATE);
  // Premium: quiet regular muted date; non-premium: the existing bold-italic.
  const dateFont = ctx.premium ? ctx.fonts.regular : ctx.fonts.boldItalic;
  const dateW = date ? dateFont.widthOfTextAtSize(date, dateSize) : 0;
  // Cap the title so it cannot reach the right-aligned date (min 8pt gap) — a
  // long title used to overprint the date and run off the page.
  const titleMax = PAGE_W - 2 * MARGIN_SIDE - (date ? dateW + s(ctx, 8) : 0);
  const tFont = fontFor(ctx, titleLeft, "bold");
  if (ctx.draw) {
    ctx.page.drawText(bidi(fitToWidth(titleLeft, tFont, titleSize, titleMax)), {
      x: MARGIN_SIDE,
      y: ctx.y,
      size: titleSize,
      font: tFont,
      color: COLOR_INK,
    });
  }
  if (date && ctx.draw) {
    ctx.page.drawText(bidi(date), {
      x: PAGE_W - MARGIN_SIDE - dateW,
      y: ctx.y,
      size: dateSize,
      font: dateFont,
      color: COLOR_MUTED,
    });
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
  if (!isFirst) ctx.y -= s(ctx, ctx.d.spEntryBefore);
  const roleSize = s(ctx, ctx.d.roleSize);
  const date = trim(dateRight);
  const dateSize = s(ctx, SIZE_DATE);
  const dateW = date ? ctx.fonts.regular.widthOfTextAtSize(date, dateSize) : 0;
  // Cap the title so it cannot reach the right-aligned date (min 8pt gap).
  const titleMax = PAGE_W - 2 * MARGIN_SIDE - (date ? dateW + s(ctx, 8) : 0);
  const tFont = fontFor(ctx, title, "bold");
  if (ctx.draw && title) {
    ctx.page.drawText(bidi(fitToWidth(title, tFont, roleSize, titleMax)), {
      x: MARGIN_SIDE,
      y: ctx.y,
      size: roleSize,
      font: tFont,
      color: COLOR_INK,
    });
  }
  if (date && ctx.draw) {
    ctx.page.drawText(bidi(date), {
      x: PAGE_W - MARGIN_SIDE - dateW,
      y: ctx.y,
      size: dateSize,
      font: ctx.fonts.regular,
      color: COLOR_MUTED,
    });
  }
  if (org) {
    ctx.y -= s(ctx, ctx.d.lhRoleToOrg);
    const orgSize = s(ctx, ctx.d.orgSize);
    const oFont = fontFor(ctx, org, "italic");
    if (ctx.draw) {
      ctx.page.drawText(
        bidi(fitToWidth(org, oFont, orgSize, PAGE_W - 2 * MARGIN_SIDE)),
        {
          x: MARGIN_SIDE,
          y: ctx.y,
          size: orgSize,
          font: oFont,
          color: COLOR_MUTED,
        },
      );
    }
  }
}

function drawSubLine(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, ctx.premium ? ctx.d.lhRoleToOrg : LH_BODY);
  if (ctx.draw) {
    const subSize = s(ctx, SIZE_SUBLINE);
    const sf = fontFor(ctx, text, ctx.premium ? "italic" : "regular");
    ctx.page.drawText(bidi(fitToWidth(text, sf, subSize, CONTENT_W)), {
      x: MARGIN_SIDE,
      y: ctx.y,
      size: subSize,
      font: sf,
      color: ctx.premium ? COLOR_MUTED : COLOR_BODY,
    });
  }
}

function drawBullet(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, ctx.premium ? ctx.d.lhBulletGap : LH_BULLET_GAP);
  const bulletIndent = 16;
  const textWidth = CONTENT_W - bulletIndent;
  const bulletSize = s(ctx, ctx.premium ? SIZE_BODY : SIZE_BULLET);
  const lineLead = ctx.premium ? ctx.d.lhBody : LH_BODY;
  if (ctx.draw) {
    ctx.page.drawCircle({
      x: MARGIN_SIDE + 5,
      y: ctx.y + bulletSize * 0.28,
      size: s(ctx, 1.6),
      color: ctx.accent,
    });
  }
  const bf = fontFor(ctx, text, "regular");
  const lines = wrap(text, bf, bulletSize, textWidth);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, lineLead);
    if (ctx.draw) {
      ctx.page.drawText(bidi(lines[i]), {
        x: MARGIN_SIDE + bulletIndent,
        y: ctx.y,
        size: bulletSize,
        font: bf,
        color: COLOR_BODY,
      });
    }
  }
}

function drawPlainLine(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, ctx.premium ? ctx.d.lhBulletGap : LH_BULLET_GAP);
  const bulletSize = s(ctx, ctx.premium ? SIZE_BODY : SIZE_BULLET);
  const pf = fontFor(ctx, text, "regular");
  const lines = wrap(text, pf, bulletSize, CONTENT_W);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, ctx.premium ? ctx.d.lhBody : LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(bidi(lines[i]), {
        x: MARGIN_SIDE,
        y: ctx.y,
        size: bulletSize,
        font: pf,
        color: COLOR_TEXT,
      });
    }
  }
}

function drawBodyParagraph(ctx: Ctx, text: string) {
  if (!text) return;
  ctx.y -= s(ctx, ctx.premium ? ctx.d.lhBulletGap : LH_BULLET_GAP);
  const bodySize = s(ctx, SIZE_BODY);
  const bpf = fontFor(ctx, text, "regular");
  const lines = wrap(text, bpf, bodySize, CONTENT_W);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= s(ctx, ctx.premium ? ctx.d.lhBody : LH_BODY);
    if (ctx.draw) {
      ctx.page.drawText(bidi(lines[i]), {
        x: MARGIN_SIDE,
        y: ctx.y,
        size: bodySize,
        font: bpf,
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
  // rule under the contact row separating the header from the body. Header sizes
  // AND positions scale by ctx.scale so the header shrinks in lockstep with the
  // body (uniform scale-to-fit) — never disproportionate, never overlapping.
  const hy = headerYs(ctx.d, ctx.scale);
  const nameSize = ctx.premium ? s(ctx, ctx.d.nameSize) : SIZE_NAME_HEADER;
  const headlineSize = ctx.premium ? s(ctx, ctx.d.headlineSize) : SIZE_HEADLINE;
  const contactSize = ctx.premium ? s(ctx, ctx.d.contactSize) : SIZE_CONTACT_H;
  const nameY = ctx.premium ? hy.nameY : HEADER_NAME_Y;
  const headlineY = ctx.premium ? hy.headlineY : HEADER_HEADLINE_Y;
  const contactY = ctx.premium ? hy.contactY : HEADER_CONTACT_Y;

  // Full text column width; fitToWidth truncates so a long name / headline /
  // contact line can never overflow the page edge (was clipped before).
  const headW = PAGE_W - 2 * MARGIN_SIDE;
  const nameFont = fontFor(ctx, name, "bold");
  ctx.page.drawText(bidi(fitToWidth(name, nameFont, nameSize, headW)), {
    x: MARGIN_SIDE,
    y: nameY,
    size: nameSize,
    font: nameFont,
    color: COLOR_INK,
  });
  if (headline) {
    const hlFont = fontFor(ctx, headline, "regular");
    ctx.page.drawText(bidi(fitToWidth(headline, hlFont, headlineSize, headW)), {
      x: MARGIN_SIDE,
      y: headlineY,
      size: headlineSize,
      font: hlFont,
      color: COLOR_MUTED,
    });
  }
  if (contactBits.length > 0) {
    const contact = contactBits.join("  \u00B7  ");
    const cFont = fontFor(ctx, contact, "regular");
    ctx.page.drawText(bidi(fitToWidth(contact, cFont, contactSize, headW)), {
      x: MARGIN_SIDE,
      y: contactY,
      size: contactSize,
      font: cFont,
      color: ctx.premium ? COLOR_MUTED : COLOR_BODY,
    });
  }
  if (ctx.premium) {
    ctx.page.drawLine({
      start: { x: MARGIN_SIDE, y: hy.ruleY },
      end: { x: PAGE_W - MARGIN_SIDE, y: hy.ruleY },
      thickness: s(ctx, P_RULE_THICKNESS),
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

// Most-recent year mentioned in a free-form dates string ("2023 – Present",
// "2014 – 2018"); "Present"/"Current" ranks highest. Used to order education
// reverse-chronologically (university above high school).
function recencyKey(dates: unknown): number {
  const s = String(dates ?? "");
  if (/present|current|now/i.test(s)) return Number.MAX_SAFE_INTEGER;
  const years = (s.match(/\b(19|20)\d{2}\b/g) || []).map(Number);
  return years.length ? Math.max(...years) : 0;
}

function renderEducation(ctx: Ctx, cvData: CvData) {
  const raw = Array.isArray(cvData.education) ? cvData.education : [];
  if (raw.length === 0) return;
  // Reverse-chronological (most recent first). Stable for equal keys.
  const list = raw
    .map((e, i) => ({ e, i }))
    .sort(
      (a, b) => recencyKey(b.e?.dates) - recencyKey(a.e?.dates) || a.i - b.i,
    )
    .map((x) => x.e);
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

// Friendly labels for the stored skill-group keys (the raw keys never show).
const SKILL_GROUP_LABELS: Record<string, string> = {
  domain: "Core Competencies",
  technical: "Technical",
  tools: "Tools",
};

// One compact skill group: a bold inline label, then mid-dot-joined values that
// wrap (continuation lines align under the values, hanging past the label). It's
// reference info, so it's packed denser than prose — groups stack on the body
// line-height with only a small gap between them, no per-group section spacing.
function drawSkillGroup(
  ctx: Ctx,
  label: string,
  valuesText: string,
  isFirst: boolean,
) {
  const size = s(ctx, SIZE_BODY);
  const lead = s(ctx, ctx.d.lhBody);
  // First group: gap below the Skills heading. Later groups: a full line height
  // plus a small inter-group gap so this group's first line clears the previous
  // group's last line (see skills-layout.ts for the fix rationale).
  ctx.y -= s(ctx, skillGroupTopAdvance(isFirst, ctx.d));
  const labelStr = `${label}:  `;
  const labelW = ctx.fonts.bold.widthOfTextAtSize(labelStr, size);
  if (ctx.draw) {
    ctx.page.drawText(labelStr, {
      x: MARGIN_SIDE,
      y: ctx.y,
      size,
      font: ctx.fonts.bold,
      color: COLOR_INK,
    });
  }
  // Wrap the values: first line begins after the label; continuation lines hang
  // at the label's left edge (MARGIN_SIDE + labelW) so the column reads cleanly.
  const hang = MARGIN_SIDE + labelW;
  const avail = PAGE_W - MARGIN_SIDE - hang;
  const vf = fontFor(ctx, valuesText, "regular");
  const lines = wrap(valuesText, vf, size, avail);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ctx.y -= lead;
    if (ctx.draw) {
      ctx.page.drawText(bidi(lines[i]), {
        x: hang,
        y: ctx.y,
        size,
        font: vf,
        color: COLOR_BODY,
      });
    }
  }
}

// Skills rendered BY GROUP (the data is already categorized). Each non-empty
// group gets a labeled, compact line; empty groups are skipped.
// Exported for the skills-overlap regression test (drawSkillGroup vertical
// advance); not part of the public renderer surface.
export function renderSkills(ctx: Ctx, cvData: CvData) {
  const sk = cvData.skills || {};
  const groups = (["domain", "technical", "tools"] as const)
    .map((key) => ({
      label: SKILL_GROUP_LABELS[key],
      values: safeArray((sk as any)[key])
        .map(trim)
        .filter(Boolean),
    }))
    .filter((g) => g.values.length > 0);
  if (groups.length === 0) return;
  drawSectionHeading(ctx, "Skills");
  // Non-premium templates keep the flat blob (byte-identical fallback).
  if (!ctx.premium) {
    drawBodyParagraph(ctx, groups.flatMap((g) => g.values).join("  ·  "));
    return;
  }
  groups.forEach((g, i) =>
    drawSkillGroup(ctx, g.label, g.values.join("  ·  "), i === 0),
  );
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
      // " - " not an em dash (renderer-injected separator; the em dash reads as
      // AI-generated and the cv_data scrub can't reach a render-time string).
      return name && desc ? `${name} - ${desc}` : name;
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

// ─── One-page fit result ───────────────────────────────────────────
// The renderer ALWAYS fits the whole CV on one page and NEVER removes content;
// CvFit just reports HOW it fit so the studio can optionally surface a calm
// density hint. There is no "trimmed"/"dropped" anything.
export interface CvFit {
  scale: number; // uniform scale applied to the whole layout (≤ 1.0)
  dense: boolean; // scale dipped below the comfortable-readability point
  lowestY: number; // lowest baseline painted; ≥ MARGIN_BOTTOM by construction
}
export interface CvPdfResult {
  bytes: Uint8Array;
  fit: CvFit;
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
    // Hebrew-capable serif fallback (David Libre). Latin-only template fonts
    // would otherwise strip Hebrew entirely (see the sanitizer below).
    hebRegular: await pdfDoc.embedFont(DAVID_REGULAR, { subset: true }),
    hebBold: await pdfDoc.embedFont(DAVID_BOLD, { subset: true }),
  };

  // Sanitize chokepoint: strip codepoints NO embedded font can render (cmap-
  // driven) from all drawn strings, so the renderer can't throw on any input.
  // Both the template font AND the Hebrew fallback count as renderable, so
  // Hebrew survives (it is drawn with the Hebrew font at each site). See
  // makeCodepointSanitizer.
  const sanitize = makeCodepointSanitizer([
    fontkit.create(fb.regular) as GlyphFont,
    fontkit.create(DAVID_REGULAR) as GlyphFont,
  ]);
  const cv = deepSanitizeStrings(cvData, sanitize) as CvData;
  const uc = deepSanitizeStrings(userContext, sanitize) as UserContext;

  const premium = tpl.premium === true;
  const d = COMFORTABLE; // one layout; the only fit variable is the scale

  // Section-flow height at a given uniform scale (draw off). wrap() uses the
  // scaled font size, so measuring at the scale we'll draw at makes the fit
  // tight. For premium the header scales too (headerYs(d, scale).height), so the
  // whole page is one uniformly-scaled block.
  const headerHeightAt = (scale: number): number =>
    premium ? headerYs(d, scale).height : PAGE_H - HEADER_CONTENT_TOP;
  const sectionsHeightAt = (scale: number): number => {
    const mc: Ctx = {
      page,
      fonts,
      accent,
      labelCase: tpl.labelCase,
      ruleOn: tpl.rule,
      premium,
      d,
      y: 0,
      draw: false,
      scale,
    };
    renderAllSections(mc, cv, config.sectionOrder);
    return -mc.y; // started at 0, flowed down
  };

  // ─── Uniform scale-to-fit — ALWAYS fits, NEVER cuts ───
  // Find the largest scale ≤ 1 where header + sections fit the page content
  // area. Everything (header + body) scales by this one factor, so spacing
  // relationships are preserved and nothing can overlap. There is NO floor: an
  // unusually long CV just renders smaller. Short fixed-point because measured
  // height depends on scale (wrap); a final guard guarantees it fits.
  // 1pt bottom safety so content never lands exactly on (or float-rounds below)
  // the bottom margin.
  const totalAvail = PAGE_H - HEADER_TOP_MARGIN - MARGIN_BOTTOM - 1;
  const totalAt = (scale: number): number =>
    headerHeightAt(scale) + sectionsHeightAt(scale);
  let scale = SCALE_MAX;
  for (let i = 0; i < 6; i++) {
    const total = totalAt(scale);
    if (total <= 0) break;
    const next = Math.min(SCALE_MAX, (scale * totalAvail) / total);
    if (Math.abs(next - scale) < 0.004) {
      scale = next;
      break;
    }
    scale = next;
  }
  while (scale > 0.05 && totalAt(scale) > totalAvail) scale -= 0.01;

  const contentTopY = premium
    ? headerYs(d, scale).contentTop
    : HEADER_CONTENT_TOP;
  const fit: CvFit = {
    scale,
    dense: scale < DENSE_HINT,
    lowestY: contentTopY,
  };

  console.log(
    `[CV-PDF] fit: total ${totalAt(scale).toFixed(1)}pt of ${totalAvail.toFixed(1)}pt → scale ${scale.toFixed(3)}${fit.dense ? " (dense hint)" : ""}`,
  );

  // ─── DRAW ───
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
    d,
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

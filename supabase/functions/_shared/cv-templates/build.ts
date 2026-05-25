// build.ts — single CV docx orchestrator.
//
// Visual direction "Tracked Caps + Hairline Rules" (2026-05-25). Adopts
// the Debra-Jenkins editorial-resume aesthetic: 28pt tracked-caps name
// between two hairline grey rules, 13pt accent-color tracked-caps section
// headers (no borders — generous spacing-before does the visual work),
// bold-italic muted dates, tightened bullet indent. Sans-serif body
// font flows from the theme (Aptos / Calibri / whatever the sector
// theme provides). Per-sector accent colors preserved.
//
// History:
//   - PR #131 collapsed prior "polished" + "ats-optimized" styles into a
//     single template (both were single-column paragraph-based already;
//     the chrome differences were a UX A/B users didn't want).
//   - 2026-05-25 visual refresh: same architecture, redesigned look.
//
// config.style is accepted for backwards compat with any cached frontend
// bundles but otherwise ignored — every value produces the same output.
//
// Single column is non-negotiable for ATS survival (EDLIGO 1,200-doc
// benchmark + Resume Optimizer Pro 200-400 doc tests + Jobscan 2026
// 1.2M-resume confirmation: 22-point parse-fidelity gap on multi-column
// persists in 2026). All structural decisions here continue to honor
// that constraint.

import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
} from "https://esm.sh/docx@8.5.0";

import type { TemplateConfig, SectionKey } from './types.ts'

// docx unit reminders:
//   - font size in half-points (20 = 10pt, 26 = 13pt, 56 = 28pt)
//   - twips: 1 inch = 1440 twips, 1 mm ≈ 56.7 twips
//   - line: 240 = single, 252 = 1.05x, 276 = 1.15x, 288 = 1.2x
//
// 0.7" margins (research-backed default):
//   1440 * 0.7 = 1008 twips on each side.
const MARGIN_TWIPS = 1008

// A4 page width = 11906 twips. With 1008 left + 1008 right margins,
// usable width = 9890 twips. Right tab stop sits just inside the right
// margin so dates align flush right on the same line as titles.
const PAGE_WIDTH = 11906
const RIGHT_TAB = PAGE_WIDTH - 2 * MARGIN_TWIPS - 16

// Font sizes (half-points). Direction A — tracked-caps editorial.
// Name pulled up to 28pt for the framed-header treatment; sections
// drop to 13pt because tracked caps + accent color already shout.
const SIZE_NAME = 56            // 28pt — tracked caps name
const SIZE_SECTION = 26         // 13pt — tracked caps section labels
const SIZE_BODY = 22            // 11pt
const SIZE_BULLET = 20          // 10pt
const SIZE_ENTRY_TITLE = 22     // 11pt
const SIZE_DATE = 20            // 10pt — bold italic muted, right-tab
const SIZE_CONTACT = 20         // 10pt

// Letter-spacing (twips). 1pt = 20 twips. The "tracked" feel comes
// from these — without character spacing, ALL CAPS looks dense and
// runs together.
const SPACING_NAME_CAPS = 40    // ~2pt extra between letters
const SPACING_SECTION_CAPS = 30 // ~1.5pt — slightly tighter than name

// Colors. COLOR_MUTED for dates + subtitles; HAIRLINE for the framing
// rules around the name (deliberately light grey, not accent, so the
// accent color reads as one focused tone across the document).
const COLOR_MUTED = "555555"
const COLOR_HAIRLINE = "CCCCCC"

// Spacing (twips, 1pt = 20 twips, 1.0 line = 240).
// SP_SECTION_BEFORE bumped from 130 → 240. Direction A drops the
// section-heading border, so the heading needs more breathing room
// above to read as a discrete section break.
const SP_SECTION_BEFORE = 240
const SP_SECTION_AFTER = 80
const SP_ENTRY_BEFORE = 80
const SP_BULLET_AFTER = 20
const LINE_SINGLE = 240
const LINE_BODY = 252  // 1.05x for prose paragraphs (About)

interface CvData {
  header?: { name?: string; subtitle?: string; phone?: string; email?: string; location?: string; linkedin?: string }
  summary?: string
  about_me?: string
  professional_experiences?: any[]
  experiences?: any[]
  military_experiences?: any[]
  military_service?: any
  volunteering_experiences?: any[]
  volunteering?: any[]
  leadership_experiences?: any[]
  education?: any[]
  skills?: { domain?: string[]; tools?: string[]; technical?: string[]; languages?: string[] }
  languages?: any[]
  honors_and_awards?: any[]
  certifications?: any[]
  projects?: any[]
}

interface UserContext {
  full_name?: string
  phone_number?: string
  email?: string
  location?: string
  linkedin_url?: string
}

const safeArray = (val: unknown): unknown[] => Array.isArray(val) ? val : []

export async function buildCV(
  cvData: CvData,
  userContext: UserContext,
  config: TemplateConfig,
): Promise<Uint8Array> {
  // Direction A — "Tracked Caps + Hairline Rules" (2026-05-25). Same
  // unified architecture introduced in PR #131; redesigned visual layer
  // per Eli's editorial-resume reference. config.style is accepted for
  // backwards compat with any cached frontend bundles but otherwise
  // ignored — all values produce the same output.
  const font = config.theme.font
  const accent = config.theme.accentHex
  const sizeName = SIZE_NAME
  const sizeSection = SIZE_SECTION
  const sectionBefore = SP_SECTION_BEFORE

  const paragraphs: Array<Paragraph | Table> = []

  // ---------- Section helpers ----------

  const sectionHeading = (label: string): Paragraph => {
    // Direction A — tracked ALL CAPS in accent color, no border. The
    // generous spacing-before (240 twips = ~12pt) does the visual
    // section-break work that the border did previously. Removing the
    // border + caps treatment together reads as more editorial / less
    // template-y.
    return new Paragraph({
      spacing: { before: sectionBefore, after: SP_SECTION_AFTER },
      children: [new TextRun({
        text: label,
        bold: true,
        allCaps: true,
        characterSpacing: SPACING_SECTION_CAPS,
        size: sizeSection,
        font,
        color: accent,
      })],
    })
  }

  // subsectionHeading helper removed PR #26 — the Experience umbrella
  // was dropped in favor of peer top-level sections, so sub-headers no
  // longer exist. Each bucket (Professional Experience / Military
  // Service / Volunteering / Leadership) emits its own sectionHeading.

  // Experience-style entry: "Role, Organization" bold left, dates as
  // bold italic muted text right. Italics on the date makes it read as
  // metadata (when-it-happened) rather than competing with the role
  // title for attention — borrowed straight from the Debra Jenkins
  // reference's date treatment.
  const experienceEntryLine = (
    title: string, org: string | undefined, dates: string | undefined, withGap: boolean,
  ): Paragraph => {
    const titleText = String(title || "").trim()
    const orgText = String(org || "").trim()
    const combined = orgText ? `${titleText}, ${orgText}` : titleText
    const children: TextRun[] = [
      new TextRun({ text: combined, bold: true, size: SIZE_ENTRY_TITLE, font }),
    ]
    if (dates && String(dates).trim()) {
      children.push(new TextRun({ text: "\t", size: SIZE_ENTRY_TITLE }))
      children.push(new TextRun({
        text: String(dates).trim(),
        bold: true,
        italics: true,
        size: SIZE_DATE,
        color: COLOR_MUTED,
        font,
      }))
    }
    return new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      spacing: { before: withGap ? SP_ENTRY_BEFORE : 0, after: 0 },
      children,
    })
  }

  // Education-style entry: bold degree (or institution if no degree) + dates,
  // institution / location on line 2.
  const educationEntryLines = (
    title: string, subtitle: string | undefined, dates: string | undefined, withGap: boolean,
  ): Paragraph[] => {
    const out: Paragraph[] = []
    const titleChildren: TextRun[] = [
      new TextRun({ text: String(title || "").trim(), bold: true, size: SIZE_ENTRY_TITLE, font }),
    ]
    if (dates && String(dates).trim()) {
      titleChildren.push(new TextRun({ text: "\t", size: SIZE_ENTRY_TITLE }))
      titleChildren.push(new TextRun({
        text: String(dates).trim(),
        bold: true,
        italics: true,
        size: SIZE_DATE,
        color: COLOR_MUTED,
        font,
      }))
    }
    out.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      spacing: { before: withGap ? SP_ENTRY_BEFORE : 0, after: 0 },
      children: titleChildren,
    }))
    const subText = String(subtitle || "").trim()
    if (subText) {
      out.push(new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: subText, size: SIZE_BULLET, color: COLOR_MUTED, font })],
      }))
    }
    return out
  }

  // Direction A — tightened indent: start at 360 twips (0.25"), hanging
  // at 180 twips so the wrap aligns visually under the first-line text
  // (not under the bullet). Default round bullet retained — custom char
  // (square/diamond) requires a Numbering definition with abstractNum,
  // which is more architecture than the marginal visual win warrants.
  const bulletParagraph = (s: string): Paragraph => new Paragraph({
    bullet: { level: 0 },
    indent: { start: 360, hanging: 180 },
    spacing: { before: 0, after: SP_BULLET_AFTER, line: LINE_SINGLE },
    children: [new TextRun({ text: String(s || ""), size: SIZE_BULLET, font })],
  })

  // About Me prose. Left-aligned (not justified) per Eli's design call PR
  // #25 — justified produces stretched word spacing on short lines that
  // reads as dated. Modern CV convention is left-aligned ragged-right,
  // and CDO templates we surveyed all use left-aligned for prose.
  const bodyParagraph = (s: string): Paragraph => new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 0, after: SP_BULLET_AFTER, line: LINE_BODY },
    children: [new TextRun({ text: String(s || ""), size: SIZE_BODY, font })],
  })

  const labelledLine = (label: string, items: string[]): Paragraph | null => {
    const valueText = (items || []).map(s => String(s).trim()).filter(Boolean).join(", ")
    if (!valueText) return null
    return new Paragraph({
      spacing: { before: 0, after: SP_BULLET_AFTER, line: LINE_SINGLE },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: SIZE_BULLET, font }),
        new TextRun({ text: valueText, size: SIZE_BULLET, font }),
      ],
    })
  }

  const plainLine = (s: string): Paragraph => new Paragraph({
    spacing: { before: 0, after: SP_BULLET_AFTER, line: LINE_SINGLE },
    children: [new TextRun({ text: s, size: SIZE_BULLET, font })],
  })

  // ---------- Header ----------

  const header = cvData.header || {}
  const nameText = String(header.name || userContext.full_name || "").toUpperCase()
  // Subtitle removed per Eli's design call (PR #24, 2026-05-06): a 1-line
  // "current identity" subtitle anchored recruiters on the wrong role when
  // the user was applying for a different target. The About Me block does
  // the positioning work; subtitle was duplicative noise. CDO research on
  // "objective deprecated" applies here too. Do not re-add — the data field
  // is preserved on cvData.header for backward-compat but no longer rendered.

  const contactBits: string[] = []
  const pushBit = (v: string | null | undefined) => {
    const s = (v ?? "").toString().trim()
    if (s) contactBits.push(s)
  }
  pushBit(header.phone || userContext.phone_number)
  pushBit(header.email || userContext.email)
  pushBit(header.location || userContext.location)
  pushBit(header.linkedin || userContext.linkedin_url)

  // Photo header: 2-cell table at the top. Cell 1 = name + contact.
  // Cell 2 = image. Opt-in via config.photo (default off). Even when ATS
  // scrambles columns into linear text, the worst case is photo bytes
  // appearing AFTER text — name and contact still parse correctly.
  // Without a photo, fall through to the single-column centered header.
  if (config.photo) {
    paragraphs.push(buildPhotoHeaderTable(
      nameText, contactBits, config.photo, font, accent, sizeName,
    ))
  } else {
    // Direction A — framed name header:
    //   [hairline grey rule above]
    //   NAME (tracked caps, black, centered)
    //   [hairline grey rule below]
    //   contact bits (muted small text, centered)
    //   [thin accent rule below contact]
    // The name itself is BLACK, not accent — the framing rules + the
    // tracking are doing the visual work, and reserving accent for the
    // section labels gives the document one focused color tone.
    paragraphs.push(new Paragraph({
      spacing: { before: 0, after: 100 },
      border: { bottom: { color: COLOR_HAIRLINE, style: BorderStyle.SINGLE, size: 4, space: 1 } },
      children: [new TextRun({ text: "", size: 1 })],
    }))
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({
        text: nameText,
        bold: true,
        allCaps: true,
        characterSpacing: SPACING_NAME_CAPS,
        size: sizeName,
        font,
        color: "000000",
      })],
    }))
    paragraphs.push(new Paragraph({
      spacing: { before: 100, after: 100 },
      border: { bottom: { color: COLOR_HAIRLINE, style: BorderStyle.SINGLE, size: 4, space: 1 } },
      children: [new TextRun({ text: "", size: 1 })],
    }))
    if (contactBits.length > 0) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [new TextRun({
          text: contactBits.join("  \u00B7  "),
          size: SIZE_CONTACT,
          color: COLOR_MUTED,
          font,
        })],
      }))
    }
    // Single thin accent rule under the contact strip — closes the header
    // block before the first section. This is the ONLY accent rule in the
    // document (section headings dropped their borders).
    paragraphs.push(new Paragraph({
      spacing: { before: 40, after: 0 },
      border: { bottom: { color: accent, style: BorderStyle.SINGLE, size: 6, space: 1 } },
      children: [new TextRun({ text: "", size: 1 })],
    }))
  }

  // ---------- Sections ----------

  const renderers: Record<SectionKey, () => void> = {
    about: () => renderAbout(cvData, paragraphs, sectionHeading, bodyParagraph),
    professional_experience: () => renderProfessionalExperience(cvData, paragraphs, sectionHeading, experienceEntryLine, bulletParagraph),
    military_service: () => renderMilitaryService(cvData, paragraphs, sectionHeading, experienceEntryLine, bulletParagraph),
    volunteering: () => renderVolunteering(cvData, paragraphs, sectionHeading, experienceEntryLine, bulletParagraph),
    leadership: () => renderLeadership(cvData, paragraphs, sectionHeading, experienceEntryLine, bulletParagraph),
    education: () => renderEducation(cvData, paragraphs, sectionHeading, educationEntryLines, bulletParagraph),
    skills: () => renderSkills(cvData, paragraphs, sectionHeading, labelledLine),
    languages: () => renderLanguages(cvData, paragraphs, sectionHeading, plainLine),
    honors: () => renderHonors(cvData, paragraphs, sectionHeading, bulletParagraph),
    certifications: () => renderCertifications(cvData, paragraphs, sectionHeading, bulletParagraph),
    projects: () => renderProjects(cvData, paragraphs, sectionHeading, experienceEntryLine, bulletParagraph),
  }
  for (const sectionKey of config.sectionOrder) {
    renderers[sectionKey]?.()
  }

  // ---------- Document assembly ----------

  const docFile = new Document({
    styles: {
      default: { document: { run: { font, size: SIZE_BODY } } },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: MARGIN_TWIPS,
            bottom: MARGIN_TWIPS,
            left: MARGIN_TWIPS,
            right: MARGIN_TWIPS,
          },
        },
      },
      children: paragraphs,
    }],
  })

  const docBase64 = await Packer.toBase64String(docFile)
  return Uint8Array.from(atob(docBase64), c => c.charCodeAt(0))
}

// ---------- Section renderers ----------

function renderAbout(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  bodyParagraph: (s: string) => Paragraph,
): void {
  const aboutText = String(cvData.summary || cvData.about_me || "").trim()
  if (!aboutText) return
  paragraphs.push(sectionHeading("About Me"))
  paragraphs.push(bodyParagraph(aboutText))
}

// Shared block renderer used by the four bucket-specific section
// renderers below. Each bucket emits as a peer top-level section per
// Eli's design call PR #26 — the former "Experience" umbrella stuttered
// visually with the sub-headers below it, so we dropped the umbrella.
function renderExperienceBlock(
  paragraphs: Array<Paragraph | Table>,
  experienceEntryLine: (title: string, org: string | undefined, dates: string | undefined, withGap: boolean) => Paragraph,
  bulletParagraph: (s: string) => Paragraph,
  entries: any[],
  orgKey: string,
): void {
  entries.forEach((exp, idx) => {
    paragraphs.push(experienceEntryLine(exp.title || "", exp[orgKey], exp.dates, idx > 0))
    ;(exp.bullets || []).forEach((b: string) => paragraphs.push(bulletParagraph(b)))
  })
}

function renderProfessionalExperience(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  experienceEntryLine: (title: string, org: string | undefined, dates: string | undefined, withGap: boolean) => Paragraph,
  bulletParagraph: (s: string) => Paragraph,
): void {
  const professional = Array.isArray(cvData.professional_experiences)
    ? cvData.professional_experiences
    : (Array.isArray(cvData.experiences) ? cvData.experiences : [])
  if (professional.length === 0) return
  paragraphs.push(sectionHeading("Professional Experience"))
  renderExperienceBlock(paragraphs, experienceEntryLine, bulletParagraph, professional, "company")
}

function renderMilitaryService(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  experienceEntryLine: (title: string, org: string | undefined, dates: string | undefined, withGap: boolean) => Paragraph,
  bulletParagraph: (s: string) => Paragraph,
): void {
  const military = Array.isArray(cvData.military_experiences)
    ? cvData.military_experiences
    : (cvData.military_service && (cvData.military_service as any).unit ? [cvData.military_service] : [])
  if (military.length === 0) return
  paragraphs.push(sectionHeading("Military Service"))
  renderExperienceBlock(paragraphs, experienceEntryLine, bulletParagraph, military, "unit")
}

function renderVolunteering(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  experienceEntryLine: (title: string, org: string | undefined, dates: string | undefined, withGap: boolean) => Paragraph,
  bulletParagraph: (s: string) => Paragraph,
): void {
  const volunteering = Array.isArray(cvData.volunteering_experiences)
    ? cvData.volunteering_experiences
    : (Array.isArray(cvData.volunteering) ? cvData.volunteering : [])
  if (volunteering.length === 0) return
  paragraphs.push(sectionHeading("Volunteering"))
  renderExperienceBlock(paragraphs, experienceEntryLine, bulletParagraph, volunteering, "organization")
}

function renderLeadership(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  experienceEntryLine: (title: string, org: string | undefined, dates: string | undefined, withGap: boolean) => Paragraph,
  bulletParagraph: (s: string) => Paragraph,
): void {
  const leadership = Array.isArray(cvData.leadership_experiences) ? cvData.leadership_experiences : []
  if (leadership.length === 0) return
  paragraphs.push(sectionHeading("Leadership"))
  renderExperienceBlock(paragraphs, experienceEntryLine, bulletParagraph, leadership, "organization")
}

function renderEducation(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  educationEntryLines: (title: string, subtitle: string | undefined, dates: string | undefined, withGap: boolean) => Paragraph[],
  bulletParagraph: (s: string) => Paragraph,
): void {
  const llmEducation = Array.isArray(cvData.education) ? cvData.education : []
  if (llmEducation.length === 0) return

  paragraphs.push(sectionHeading("Education"))
  const honorsSet = new Set(
    safeArray(cvData.honors_and_awards)
      .map((h: any) => h && (typeof h === 'string' ? h : String(h.name || "").trim()))
      .map((s: any) => String(s).replace(/\s+/g, " ").trim().toLowerCase())
      .filter(Boolean),
  )

  llmEducation.forEach((edu: any, idx) => {
    const degree = String(edu.degree || "").trim()
    const field = String(edu.field_of_study || "").trim()
    const institution = String(edu.institution || "").trim()
    // Top line composes degree + field when both present ("Bachelor's Degree
    // in Business Administration"); falls back to just degree, just field,
    // or institution-as-headline depending on what's available.
    let topLine = ""
    if (degree && field) topLine = `${degree} in ${field}`
    else if (degree) topLine = degree
    else if (field) topLine = field
    else topLine = institution
    const subLine = (degree || field) ? institution : ""
    educationEntryLines(topLine, subLine, edu.dates, idx > 0).forEach(p => paragraphs.push(p))
    if (edu.gpa) paragraphs.push(bulletParagraph(`GPA: ${edu.gpa}`))

    let coursework = safeArray(edu.coursework || edu.relevant_coursework).map(String)
    let activities = safeArray(edu.activities).map(String)
    if (coursework.length === 0 && activities.length === 0) {
      const loose = [...safeArray(edu.details), ...safeArray(edu.highlights)].map(String)
      for (const item of loose) {
        const t = item.trim()
        if (!t) continue
        if (t.length < 30 && !/[.!?:;]/.test(t) && !/\b(club|president|editor|captain|volunteer|led|managed|organized|mentor)\b/i.test(t)) {
          coursework.push(t)
        } else {
          activities.push(t)
        }
      }
    }
    if (coursework.length > 0) {
      paragraphs.push(bulletParagraph(`Relevant coursework: ${coursework.join(", ")}`))
    }
    const academicProjects = safeArray(edu.academic_projects).map(String).filter(s => s.trim())
    if (academicProjects.length > 0) {
      paragraphs.push(bulletParagraph(`Academic projects: ${academicProjects.join("; ")}`))
    }
    const seen = new Set<string>()
    activities.forEach(a => {
      const raw = String(a || "").trim()
      if (!raw) return
      const key = raw.replace(/\s+/g, " ").toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      if (honorsSet.has(key)) return
      paragraphs.push(bulletParagraph(raw))
    })
  })
}

function renderSkills(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  labelledLine: (label: string, items: string[]) => Paragraph | null,
): void {
  const skills = cvData.skills || {}
  if (!(skills.domain?.length || skills.tools?.length || skills.technical?.length)) return
  paragraphs.push(sectionHeading("Skills & Tools"))
  if (skills.domain?.length) { const p = labelledLine("Domain", skills.domain); if (p) paragraphs.push(p) }
  if (skills.tools?.length) { const p = labelledLine("Tools", skills.tools); if (p) paragraphs.push(p) }
  if (skills.technical?.length) { const p = labelledLine("Technical", skills.technical); if (p) paragraphs.push(p) }
}

function renderLanguages(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  plainLine: (s: string) => Paragraph,
): void {
  let lines: string[] = []
  if (Array.isArray(cvData.languages)) {
    lines = cvData.languages.map((l: any) => {
      if (!l) return ""
      if (typeof l === "string") return l
      const lang = String(l.language || "").trim()
      const level = String(l.proficiency || l.level || "").trim()
      return lang && level ? `${lang} (${level})` : lang
    }).filter(s => s.length > 0)
  } else if (Array.isArray(cvData.skills?.languages)) {
    lines = cvData.skills!.languages!.map((s: any) => String(s)).filter(Boolean)
  }
  if (lines.length === 0) return
  paragraphs.push(sectionHeading("Languages"))
  paragraphs.push(plainLine(lines.join(", ")))
}

function renderHonors(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  bulletParagraph: (s: string) => Paragraph,
): void {
  const lines = safeArray(cvData.honors_and_awards).map((h: any) => {
    if (!h) return ""
    if (typeof h === "string") return h
    const name = String(h.name || "").trim()
    const desc = String(h.description || "").trim()
    return name && desc ? `${name} \u2014 ${desc}` : name
  }).filter(s => s.length > 0)
  if (lines.length === 0) return
  paragraphs.push(sectionHeading("Honors & Awards"))
  lines.forEach(h => paragraphs.push(bulletParagraph(h)))
}

function renderCertifications(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  bulletParagraph: (s: string) => Paragraph,
): void {
  const certs = Array.isArray(cvData.certifications) ? cvData.certifications : []
  if (certs.length === 0) return
  paragraphs.push(sectionHeading("Certifications"))
  certs.forEach((cert: any) => {
    const parts: string[] = []
    if (cert.name) parts.push(String(cert.name))
    if (cert.issuer) parts.push(String(cert.issuer))
    // DB column is `date_earned`; the LLM is told to emit `date_earned`; keep
    // `cert.date` fallback in case an older cached payload still uses it.
    const certDate = cert.date_earned || cert.date
    const line = parts.join(", ") + (certDate ? `  (${certDate})` : "")
    if (line.trim()) paragraphs.push(bulletParagraph(line))
  })
}

function renderProjects(
  cvData: CvData,
  paragraphs: Array<Paragraph | Table>,
  sectionHeading: (label: string) => Paragraph,
  experienceEntryLine: (title: string, org: string | undefined, dates: string | undefined, withGap: boolean) => Paragraph,
  bulletParagraph: (s: string) => Paragraph,
): void {
  const projects = Array.isArray(cvData.projects) ? cvData.projects : []
  if (projects.length === 0) return
  paragraphs.push(sectionHeading("Projects"))
  projects.forEach((proj: any, idx) => {
    const titleText = proj.url
      ? `${proj.name || ""}  (${String(proj.url).trim()})`
      : (proj.name || "")
    paragraphs.push(experienceEntryLine(titleText, undefined, undefined, idx > 0))
    ;(proj.bullets || []).forEach((b: string) => paragraphs.push(bulletParagraph(b)))
  })
}

// ---------- Photo header table (Polished + photo only) ----------

// Builds a 2-cell single-row table for the polished+photo header. Cell 1
// = name + contact (left). Cell 2 = photo (right). The table is local to
// the header — it never wraps experience/education content, so the ATS
// column-flatten failure mode (worst case: contact + photo bytes parsed
// in reading order) is acceptable.
function buildPhotoHeaderTable(
  nameText: string, contactBits: string[],
  photo: { bytes: Uint8Array; mime: 'image/jpeg' | 'image/png' },
  font: string, accent: string, sizeName: number,
): Table {
  // Photo cell: ~100pt × 125pt (≈1"×1.25", passport-photo ratio).
  // ImageRun accepts Uint8Array directly; type discriminator picks PNG vs
  // JPEG. PR B adds the storage fetch + bytes loading; the buildCV signature
  // already accepts the loaded photo bytes here.
  const photoPara = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new ImageRun({
      data: photo.bytes,
      transformation: { width: 100, height: 125 },
      type: photo.mime === 'image/png' ? 'png' : 'jpg',
    } as any)],
  })

  // Direction A — photo path mirrors the no-photo header treatment:
  // tracked-caps black name, hairline rule below (no rule above — the
  // photo cell provides the visual anchor on the right), muted contact
  // strip, accent rule closing the block.
  const headerLeftCell = new TableCell({
    width: { size: 75, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({
          text: nameText,
          bold: true,
          allCaps: true,
          characterSpacing: 40,
          size: sizeName,
          font,
          color: "000000",
        })],
      }),
      new Paragraph({
        spacing: { before: 100, after: 80 },
        border: { bottom: { color: "CCCCCC", style: BorderStyle.SINGLE, size: 4, space: 1 } },
        children: [new TextRun({ text: "", size: 1 })],
      }),
      ...(contactBits.length ? [new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [new TextRun({
          text: contactBits.join("  \u00B7  "),
          size: SIZE_CONTACT,
          color: "555555",
          font,
        })],
      })] : []),
      new Paragraph({
        spacing: { before: 40, after: 0 },
        border: { bottom: { color: accent, style: BorderStyle.SINGLE, size: 6, space: 1 } },
        children: [new TextRun({ text: "", size: 1 })],
      }),
    ],
  })

  const headerRightCell = new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [photoPara],
  })

  return new Table({
    rows: [new TableRow({ children: [headerLeftCell, headerRightCell] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
  })
}

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
}

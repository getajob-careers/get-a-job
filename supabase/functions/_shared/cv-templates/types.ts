// types.ts — shared types for the CV template engine.
//
// One CV-build call needs: a theme (font + accent color, sector-derived),
// a style (ATS-Optimized vs Polished — chrome differences only, structure
// is identical), and feature toggles (currently just photo). Templates
// don't diverge structurally; they share the same buildCV() and the same
// section order. The style flag controls visual chrome (border rules,
// label case, header-block layout) without changing what data renders.

import type { TemplateId } from "./template-ids.ts";

export type TemplateStyle = "ats-optimized" | "polished";

export interface SectorTheme {
  // Lowercase identifier used in logs/diagnostics. Kept stable as an
  // enum-string so downstream metrics can group by sector.
  key: "tech_business" | "finance_law" | "engineering";
  // Calibri (tech/business default), Garamond (finance/law), Arial
  // (engineering). Per the visual-design research: each font is on the
  // current ATS-safe whitelist AND signals the right register for the
  // sector without reading as gimmicky.
  font: string;
  // Single subtle accent color. Used ONLY in Polished style — for the
  // thin rule under the name and under section headings. Sector-tinted
  // hex per Design Shack 2025 + Resume Genius recruiter sentiment data
  // (62% say overdesign hurts perception → conservative tones only).
  accentHex: string;
  // Human-readable label for diagnostics ("Tech / Business").
  label: string;
}

export interface TemplateConfig {
  style: TemplateStyle;
  theme: SectorTheme;
  // Studio template id (modern/editorial/sharp/executive/refined). STEP A wires
  // it through; build-pdf accepts it but does NOT yet render per template.
  // Optional so the auto-render callers (generate-tailored-cv/refine-cv) that
  // don't pass it still compile. See template-ids.ts + the rendering spec.
  template?: TemplateId;
  // Section order. Resolved server-side by the handler based on
  // experience count (2+ professional → experience-first, else
  // education-first). Stored as an explicit array so build.ts is
  // declarative — no order logic inside the builder.
  sectionOrder: SectionKey[];
  // Photo embedding. Path within the cv-photos storage bucket.
  // Resolution + bytes loading happen in the handler; the template
  // receives the loaded image bytes (or null when toggle is off).
  // PR A: always null. PR B wires this up.
  photo: { bytes: Uint8Array; mime: "image/jpeg" | "image/png" } | null;
}

// All sections the builder knows about. Order in the page is determined
// by config.sectionOrder, not by the order in this type. Header is always
// first and not in the order array — it's part of the document frame.
//
// PR #26: split the former 'experience' umbrella into four peer top-level
// sections (professional_experience / military_service / volunteering /
// leadership). Each renders as a full section header with its own visual
// treatment, no umbrella above. This removes the visual stutter of
// "Experience" → "Professional Experience" right beneath. Each bucket
// only renders when it has entries — empty ones short-circuit silently.
export type SectionKey =
  | "about"
  | "professional_experience"
  | "military_service"
  | "volunteering"
  | "leadership"
  | "education"
  | "skills"
  | "languages"
  | "honors"
  | "certifications"
  | "projects";

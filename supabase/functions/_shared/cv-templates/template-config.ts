// template-config.ts — render-side tokens for the five CV studio templates,
// used by build-pdf.ts (and resolvable from a template id passed by render-cv).
//
// These MIRROR the studio's source of truth (src/components/cv-studio/
// cvTemplates.js). They can't import it across the frontend/edge boundary, so
// the values are repeated here — but the PDF-vs-preview harness
// (scripts/cv-harness) is the cross-check that catches any drift (its accent
// gate fails if these diverge from cvTemplates.js). See the rendering spec.

export interface TemplateRender {
  accentHex: string; // section labels + rule line + bullet dots
  labelCase: "uppercase" | "capitalize";
  rule: boolean; // accent-tinted rule line beside section labels
  serif: boolean; // font character (informs the harness serif gate)
  family: "arimo" | "gelasio" | "tinos" | "cardo"; // embedded font family
  premium?: boolean; // the "Classic" typography variant (build-pdf.ts gate)
}

const RENDER: Record<string, TemplateRender> = {
  // "Classic" (id kept as "modern" — the system-wide default key). The premium
  // typography variant: Gelasio serif, monochrome near-black headings each with
  // a full-width rule, a two-line role/company hierarchy, and an airier rhythm.
  // Accent stays coral — used ONLY as the bullet dot (the quiet signature).
  modern: {
    accentHex: "#C2603F",
    labelCase: "uppercase",
    rule: false,
    serif: true,
    family: "gelasio",
    premium: true,
  },
  // All five now use the premium typography (full-width heading rules, two-line
  // role hierarchy, monochrome headings, airier rhythm); each stays visually
  // distinct via its own font family + accent (used only as the bullet dot) +
  // heading case. `rule`/`serif` are retained for the studio-preview tokens but
  // the premium PDF path draws its own full-width under-rule regardless.
  editorial: {
    accentHex: "#1F3A5F",
    // Title-Case headings — the one trait that distinguishes Editorial from
    // Classic (both Gelasio serif). Keeps Classic's UPPERCASE look untouched.
    labelCase: "capitalize",
    rule: true,
    serif: true,
    family: "gelasio",
    premium: true,
  },
  sharp: {
    accentHex: "#0F766E",
    labelCase: "uppercase",
    rule: false,
    serif: false,
    family: "arimo",
    premium: true,
  },
  executive: {
    accentHex: "#6D213C",
    labelCase: "uppercase",
    rule: true,
    serif: true,
    family: "tinos",
    premium: true,
  },
  refined: {
    accentHex: "#14532D",
    labelCase: "capitalize",
    rule: true,
    serif: true,
    family: "cardo",
    premium: true,
  },
};

export function getTemplateRender(
  id: string | undefined | null,
): TemplateRender {
  return RENDER[id ?? ""] ?? RENDER.modern;
}

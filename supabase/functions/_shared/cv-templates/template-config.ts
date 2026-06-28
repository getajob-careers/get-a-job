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
  serif: boolean; // font character (embedding lands as its own stage; Arimo sans for now)
}

const RENDER: Record<string, TemplateRender> = {
  modern: {
    accentHex: "#C2603F",
    labelCase: "uppercase",
    rule: false,
    serif: false,
  },
  editorial: {
    accentHex: "#1F3A5F",
    labelCase: "uppercase",
    rule: true,
    serif: true,
  },
  sharp: {
    accentHex: "#0F766E",
    labelCase: "uppercase",
    rule: false,
    serif: false,
  },
  executive: {
    accentHex: "#6D213C",
    labelCase: "uppercase",
    rule: true,
    serif: true,
  },
  refined: {
    accentHex: "#14532D",
    labelCase: "capitalize",
    rule: true,
    serif: true,
  },
};

export function getTemplateRender(
  id: string | undefined | null,
): TemplateRender {
  return RENDER[id ?? ""] ?? RENDER.modern;
}

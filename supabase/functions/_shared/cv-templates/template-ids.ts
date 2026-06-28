// Canonical list of CV studio template ids — the SINGLE source shared by
// render-cv (validation) and build-pdf (rendering), so the two never drift.
// See docs/engineering/cv-template-rendering-spec.md.
//
// STEP A (template-id plumbing) only validates + passes the id through;
// build-pdf does not yet render per template. Later steps map id -> design.

export const TEMPLATE_IDS = [
  "modern",
  "editorial",
  "sharp",
  "executive",
  "refined",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE: TemplateId = "modern";

// Validate an arbitrary value to a known template id; missing/unknown -> modern.
export function normalizeTemplate(value: unknown): TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value as string)
    ? (value as TemplateId)
    : DEFAULT_TEMPLATE;
}

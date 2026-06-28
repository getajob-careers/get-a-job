// cvTemplates.js — the CV studio's template tokens, in a plain (React-free)
// module so BOTH the studio component (CVStudioView) and the PDF-vs-preview
// verification harness (scripts/cv-harness) import the SAME source of truth.
// This is the higher drift risk between preview and PDF; keep it here, not
// hand-copied. (The .cv-* CSS that consumes these tokens still lives in
// CVStudioView's CvStudioStyles — lower drift risk, left in place.)
//
// Each template: { id, name, font (CSS family stack), accent (hex, used on
// section labels + rule + bullet dots), labelCase, rule (accent underline on/off) }.
// See docs/engineering/cv-template-rendering-spec.md.

export const CV_TEMPLATES = [
  {
    id: "modern",
    name: "Modern Sans",
    font: "'Inter', system-ui, sans-serif",
    accent: "#C2603F",
    labelCase: "uppercase",
    rule: false,
  },
  {
    id: "editorial",
    name: "Editorial",
    font: "Georgia, 'Times New Roman', serif",
    accent: "#1F3A5F",
    labelCase: "uppercase",
    rule: true,
  },
  {
    id: "sharp",
    name: "Sharp",
    font: "Arial, Helvetica, sans-serif",
    accent: "#0F766E",
    labelCase: "uppercase",
    rule: false,
  },
  {
    id: "executive",
    name: "Executive",
    font: "'Times New Roman', Times, serif",
    accent: "#6D213C",
    labelCase: "uppercase",
    rule: true,
  },
  {
    id: "refined",
    name: "Refined",
    font: "Garamond, 'EB Garamond', Georgia, serif",
    accent: "#14532D",
    labelCase: "capitalize",
    rule: true,
  },
];

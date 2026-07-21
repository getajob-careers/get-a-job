// CV RED - document surface options (OQ1 amendment). Renders a fixture CV in
// three surface treatments on the canvas ground so Eli picks by eye. DEV-only,
// no auth, self-contained (the .cv-* rules are inlined to mirror the studio).
//
//   (a) White card, distinct on the canvas  - white surface + soft shadow,
//       sitting ON the ground (not paper-print framing). "Download PDF" still
//       names the deliverable.
//   (b) Borderless + active canvas ground    - the shipped flag-on look, with
//       the canvas dot-grid dialed up so the blend reads as intentional.
//   (c) Hybrid inset well                    - borderless content in a faint
//       recessed well (no page edges) that separates doc from ground.

import React, { useState } from "react";
import { Download } from "lucide-react";

const OPTIONS = [
  { id: "a", label: "(a) White card" },
  { id: "b", label: "(b) Borderless" },
  { id: "c", label: "(c) Inset well" },
];

const SURFACE = {
  a: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 12px 44px rgba(40,25,10,0.12)",
    border: "1px solid var(--rd-border)",
    padding: "44px 52px",
  },
  b: { padding: "28px 40px" },
  c: {
    background: "color-mix(in srgb, var(--rd-bg-card) 60%, var(--rd-bg-page))",
    borderRadius: "16px",
    boxShadow: "inset 0 2px 16px rgba(40,25,10,0.07)",
    padding: "36px 44px",
  },
};

const CSS = `
  .cvs-doc { font-family: Rokkitt, serif; color: #33312E; max-width: 720px; margin: 0 auto; }
  .cvs-name { font-size: 28px; font-weight: 700; letter-spacing: -.01em; color: #1A1A1A; line-height: 1.1; }
  .cvs-headline { font-size: 14px; font-weight: 600; color: #8A8782; margin-top: 2px; }
  .cvs-contact { font-size: 12.5px; color: #33312E; margin-top: 8px; }
  .cvs-contact .cvs-dot { color: #8A8782; padding: 0 6px; }
  .cvs-summary { font-size: 12.5px; line-height: 1.55; color: #33312E; }
  .cvs-label { display: flex; align-items: center; gap: 12px; margin: 22px 0 9px; font-size: 11.5px; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; color: var(--acc); }
  .cvs-rule { flex: 1; height: 1px; background: color-mix(in srgb, var(--acc) 35%, transparent); }
  .cvs-entry { padding-left: 20px; margin-bottom: 14px; }
  .cvs-bullet { display: flex; gap: 8px; font-size: 12.5px; line-height: 1.5; margin-top: 4px; }
  .cvs-bullet:before { content: ""; width: 4px; height: 4px; border-radius: 9999px; background: var(--acc); margin-top: 8px; flex-shrink: 0; }
  .cvs-grid { background-image: radial-gradient(rgba(40,25,10,0.10) 1px, transparent 1px); background-size: 22px 22px; }
`;

function FixtureDoc() {
  return (
    <div className="cvs-doc" style={{ "--acc": "#B23A17" }}>
      <div className="cvs-name">Isaac Selig</div>
      <div className="cvs-headline">Business Analyst · AI Evaluation</div>
      <div className="cvs-contact">
        isaacselig@gmail.com <span className="cvs-dot">·</span>{" "}
        LinkedIn/Portfolio <span className="cvs-dot">·</span> Herzliya, Israel
      </div>
      <div className="cvs-label">
        Summary
        <span className="cvs-rule" />
      </div>
      <div className="cvs-summary">
        Business Administration student specializing in Digital Innovation, with
        hands-on experience in AI evaluation and full-stack product work. Strong
        stakeholder communication and a bias toward measurable outcomes.
      </div>
      <div className="cvs-label">
        Experience
        <span className="cvs-rule" />
      </div>
      <div className="cvs-entry">
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1A1A1A" }}>
          AI Research &amp; Evaluation Specialist{" "}
          <span style={{ color: "#8A8782", fontWeight: 400 }}>· Outlier</span>
        </div>
        <div className="cvs-bullet">
          Conducted evaluation and training tasks for advanced AI models,
          ensuring high-quality outputs across reasoning and accuracy.
        </div>
        <div className="cvs-bullet">
          Designed refined prompts and structured feedback loops to improve
          model performance.
        </div>
      </div>
      <div className="cvs-entry">
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1A1A1A" }}>
          Project Manager{" "}
          <span style={{ color: "#8A8782", fontWeight: 400 }}>· Anpr+</span>
        </div>
        <div className="cvs-bullet">
          Led a 60,000-user affiliate project from concept to launch.
        </div>
      </div>
      <div className="cvs-label">
        Skills
        <span className="cvs-rule" />
      </div>
      <div className="cvs-summary">
        SQL · Data Analysis · Stakeholder Management · Process Design · Excel
      </div>
    </div>
  );
}

export default function CvSurfacePreview() {
  const [opt, setOpt] = useState("a");
  return (
    <div className="min-h-screen bg-rd-bg-page">
      <style>{CSS}</style>
      <div className="mx-auto max-w-[900px] px-6 pt-6">
        <h1 className="font-display font-extrabold text-[22px] text-rd-text mb-1">
          CV document surface - pick by eye
        </h1>
        <p className="text-[12.5px] text-rd-text-secondary mb-4">
          Same content, three surfaces on the canvas ground. Toggle and compare.
          The PDF stays the deliverable (Download names it) in every option.
        </p>
        <div className="inline-flex bg-rd-bg-soft rounded-full p-1 mb-6">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOpt(o.id)}
              className={`px-4 py-1.5 rounded-full font-display font-bold text-[12.5px] transition-colors ${
                opt === o.id
                  ? "bg-rd-coral text-white"
                  : "text-rd-text-secondary hover:text-rd-text"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas ground - dot-grid dialed up for (b) so borderless reads as
          intentional; kept subtle behind the framed options. */}
      <div className={`pb-24 pt-2 ${opt === "b" ? "cvs-grid" : ""}`}>
        <div className="mx-auto max-w-[820px] px-6">
          <div style={SURFACE[opt]}>
            <FixtureDoc />
          </div>
          <div className="max-w-[720px] mx-auto mt-4 flex justify-end">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rd-coral text-white text-[12.5px] font-medium">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// PROD ORIGINAL: src/components/cv-studio/CVStudioLive.jsx (canvas clone;
// read-only master-CV render, not the live DB-backed editor)
import React from "react";
import { Mail, Phone, MapPin, Linkedin } from "lucide-react";
import {
  CANVAS_PROFILE,
  CANVAS_EXPERIENCES,
  CANVAS_EDUCATION,
  CANVAS_SKILLS,
} from "../fixtures/canvasHome";

// Read-only fixture "master CV" for the design canvas — a dense, realistic
// document to design the CV-tab layout against. Stands in for the live
// CVStudioLive editor (950 lines, DB-backed, write-heavy), which fixture mode
// can't render without prod writes. Purely presentational, --rd-* tokens.

function SectionLabel({ children }) {
  // Amplitude promotes section labels from quiet eyebrow-brown to the family
  // accent; unset (subtle-off / other palettes) → the eyebrow token.
  return (
    <p
      className="rd-t-micro uppercase tracking-[0.11em] font-mono mb-2"
      style={{ color: "var(--rd-amp-section-fg, var(--rd-text-eyebrow))" }}
    >
      {children}
    </p>
  );
}

export default function CanvasCvDocument() {
  const p = CANVAS_PROFILE;
  return (
    <div className="px-6 py-6 md:px-8 md:py-7 max-w-[720px] mx-auto">
      {/* Header. `cx-cv-*` hooks let BOLD amplitude turn this into a bled-to-edge
          dark ink block (amplitude.css); at subtle/medium the hooks are inert. */}
      <header className="cx-cv-header pb-4 border-b border-rd-border">
        <h1 className="cx-cv-name font-display font-extrabold rd-t-display-l text-rd-text leading-tight">
          {p.full_name}
        </h1>
        <p className="cx-cv-headline rd-t-body-m text-rd-primary font-display font-semibold mt-0.5">
          {p.headline}
        </p>
        <div className="cx-cv-contact flex flex-wrap gap-x-4 gap-y-1 mt-2.5 rd-t-body-s text-rd-text-secondary">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {p.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {p.email}
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {p.phone}
          </span>
          <span className="inline-flex items-center gap-1">
            <Linkedin className="w-3 h-3" />
            {p.linkedin}
          </span>
        </div>
      </header>

      {/* Summary */}
      <section className="py-4 border-b border-rd-border">
        <SectionLabel>Summary</SectionLabel>
        <p className="rd-t-body-m text-rd-text-secondary leading-[1.6]">
          {p.summary}
        </p>
      </section>

      {/* Experience */}
      <section className="py-4 border-b border-rd-border">
        <SectionLabel>Experience</SectionLabel>
        <div className="space-y-4">
          {CANVAS_EXPERIENCES.map((exp) => (
            <div key={exp.id}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display font-bold rd-t-body-m text-rd-text">
                  {exp.title}
                </h3>
                <span className="flex-shrink-0 rd-t-micro font-mono text-rd-text-tertiary">
                  {exp.start} – {exp.end}
                </span>
              </div>
              <p className="rd-t-body-s text-rd-text-secondary">
                {exp.company} · {exp.location}
              </p>
              <ul className="mt-1.5 space-y-1">
                {exp.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rd-t-body-s text-rd-text-secondary leading-[1.5]"
                  >
                    <span className="text-rd-primary mt-[3px] flex-shrink-0">
                      ▪
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section className="py-4 border-b border-rd-border">
        <SectionLabel>Education</SectionLabel>
        <div className="space-y-3">
          {CANVAS_EDUCATION.map((ed) => (
            <div key={ed.id}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display font-bold rd-t-body-m text-rd-text">
                  {ed.school}
                </h3>
                <span className="flex-shrink-0 rd-t-micro font-mono text-rd-text-tertiary">
                  {ed.start} – {ed.end}
                </span>
              </div>
              <p className="rd-t-body-s text-rd-text-secondary">{ed.degree}</p>
              <p className="rd-t-body-s text-rd-text-tertiary mt-0.5 leading-[1.5]">
                {ed.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section className="pt-4">
        <SectionLabel>Skills</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {CANVAS_SKILLS.map((s) => (
            <span
              key={s}
              className="rd-t-body-s rounded-full px-2.5 py-0.5 bg-rd-bg-soft text-rd-text-secondary border border-rd-border"
            >
              {s}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

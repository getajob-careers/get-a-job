// DEV-only preview of the redesigned CV Agent — an editable CV "studio"
// (Templates | editable CV document | CV Agent chat) mounted inside the real
// Get-a-Job shell (sidebar via Layout). Self-contained + fixture-driven: no
// backend wiring. Quality / design proof; real wiring (application_cvs.cv_data,
// refine-cv, render-cv) comes after sign-off. Editing is native contentEditable
// + native selects (the same primitive machar uses); reorder via @hello-pangea/dnd.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  GripVertical, Plus, X, Download, ChevronDown, Sparkles, Send, Check, FileText,
} from "lucide-react";
import { AuthContext } from "@/lib/AuthContext";
import Layout from "@/Layout";

const FIXTURE_UID = "cvagent-fixture-user";

const uid = () => Math.random().toString(36).slice(2, 9);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS = Array.from({ length: 14 }, (_, i) => String(2027 - i));

const TEMPLATES = [
  { id: "modern", name: "Modern Sans", font: "'Inter', system-ui, sans-serif", accent: "#C2603F", labelCase: "uppercase", rule: false },
  { id: "editorial", name: "Editorial", font: "Georgia, 'Times New Roman', serif", accent: "#1F3A5F", labelCase: "uppercase", rule: true },
  { id: "classic", name: "Classic Serif", font: "'Palatino Linotype', Palatino, Georgia, serif", accent: "#7C3A2E", labelCase: "capitalize", rule: true },
  { id: "sharp", name: "Sharp", font: "Arial, Helvetica, sans-serif", accent: "#0F766E", labelCase: "uppercase", rule: false },
  { id: "minimal", name: "Minimal", font: "'Helvetica Neue', Arial, sans-serif", accent: "#2A2A28", labelCase: "uppercase", rule: false },
  { id: "executive", name: "Executive", font: "'Times New Roman', Times, serif", accent: "#6D213C", labelCase: "uppercase", rule: true },
  { id: "technical", name: "Technical", font: "'Courier New', ui-monospace, monospace", accent: "#334155", labelCase: "uppercase", rule: false },
  { id: "warm", name: "Warm", font: "'Trebuchet MS', system-ui, sans-serif", accent: "#B45309", labelCase: "uppercase", rule: false },
  { id: "refined", name: "Refined", font: "Garamond, 'EB Garamond', Georgia, serif", accent: "#14532D", labelCase: "capitalize", rule: true },
];

// The CV the user is editing — master reservoir + per-application tailored copies
// (the real version reads these from application_cvs).
const CV_OPTIONS = [
  { id: "master", label: "Master CV", sub: "Your full, untailored CV", tag: "Master" },
  { id: "pm-wix", label: "Product Manager", sub: "Wix · tailored copy", tag: "Tailored", role: "Product Manager", company: "Wix" },
  { id: "da-monday", label: "Data Analyst", sub: "monday.com · tailored copy", tag: "Tailored", role: "Data Analyst", company: "monday.com" },
];

// New tailored copies cycle through these — mimics "generate a tailored CV for
// a job" appending an application_cvs row, which the dropdown reads from. In the
// real build the dropdown is the list of the user's application_cvs, so a freshly
// generated tailored CV shows up here automatically.
const SAMPLE_TAILORS = [
  { role: "UX Researcher", company: "Fiverr" },
  { role: "Business Analyst", company: "Lemonade" },
  { role: "Product Analyst", company: "Riskified" },
  { role: "Growth Associate", company: "monday.com" },
];

const AGENT_CHIPS = ["Rewrite my summary", "Tighten bullets", "Add keywords", "Tailor to a job"];

const INITIAL_CV = {
  header: {
    name: "Isaac Selig",
    headline: "",
    email: "isaacselig@gmail.com",
    linkedin: "LinkedIn/Portfolio",
    location: "Herzliya, Israel",
  },
  summary:
    "Business Administration student specializing in Digital Innovation with hands-on experience in software development, AI evaluation, and technical project management. Strong background in full-stack web development and working with LLMs in real-world production and QA environments. Comfortable bridging technical and business needs, with a proven ability to learn quickly and a strong drive to explore new technologies.",
  professional_experiences: [
    {
      id: uid(), title: "AI Research & Evaluation Specialist", company: "Outlier",
      start: { m: "Nov", y: "2024" }, end: { m: "", y: "" }, present: true,
      bullets: [
        { id: uid(), text: "Conducted evaluation and training tasks for advanced AI models, ensuring high-quality outputs across reasoning, creativity, and accuracy benchmarks" },
        { id: uid(), text: "Designed and refined prompts, test cases, and structured feedback loops to improve model performance" },
        { id: uid(), text: "Gained hands-on experience with LLMs, prompt engineering, and quality assurance workflows in cutting-edge AI projects" },
      ],
    },
    {
      id: uid(), title: "Project Manager", company: "Anpr+",
      start: { m: "Jul", y: "2022" }, end: { m: "Jun", y: "2023" }, present: false,
      bullets: [
        { id: uid(), text: "Contributed to building the software architecture and laying down the initial coding base for the object-tracking project" },
        { id: uid(), text: "Transitioned into a leadership role, overseeing a small development team working on a parking lot ticketing and ANPR system" },
        { id: uid(), text: "Coordinated task allocation, sprint planning, and delivery milestones, ensuring timely progress and clear communication across stakeholders" },
        { id: uid(), text: "Balanced technical oversight with managerial responsibilities, bridging the gap between developers and business needs" },
      ],
    },
    {
      id: uid(), title: "Junior Developer", company: "Tempus Trade Ltd",
      start: { m: "Apr", y: "2021" }, end: { m: "Nov", y: "2021" }, present: false,
      bullets: [
        { id: uid(), text: "Built an affiliate website targeting a 60,000 user database" },
        { id: uid(), text: "Improved SEO performance and conversion rates, increasing traffic and engagement" },
        { id: uid(), text: "Integrated with partner platforms and automated back-office functions" },
      ],
    },
    {
      id: uid(), title: "Junior Developer", company: "Code Nation",
      start: { m: "Feb", y: "2021" }, end: { m: "May", y: "2021" }, present: false,
      bullets: [
        { id: uid(), text: "Completed a 12-week bootcamp focused on the MERN stack" },
        { id: uid(), text: "Gained practical experience with GitHub, Docker, SQL, and Git Bash" },
        { id: uid(), text: "Worked on collaborative projects, developing teamwork and accountability" },
      ],
    },
  ],
  education: [
    { id: uid(), school: "Reichman University", degree: "B.A. Business Administration in Digital Innovation", end: { m: "", y: "2026" } },
    { id: uid(), school: "King David High School", degree: "A-levels and GCSEs", field: "A in Information Technology", end: { m: "", y: "" } },
    { id: uid(), school: "Aleph Beis Coding Bootcamp", degree: "Coding Bootcamp", end: { m: "", y: "2017" } },
  ],
  skills: ["MERN stack", "HTML", "CSS", "JavaScript", "PHP", "C#", "GitHub", "Docker", "SQL", "Git Bash", "Prompt engineering", "LLMs", "Quality assurance", "Software architecture", "Project management", "Sprint planning", "SEO", "Full-stack web development"],
  languages: ["English", "Hebrew"],
};

// Uncontrolled contentEditable — set once on mount, commit on blur. Keeps the
// caret stable (controlling innerText from state on every keystroke fights the
// cursor).
function Editable({ value, onCommit, className = "", placeholder = "", block = false }) {
  const ref = useRef(null);
  const Tag = block ? "div" : "span";
  useEffect(() => {
    if (ref.current && ref.current.innerText !== (value || "")) {
      ref.current.innerText = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-ph={placeholder}
      onBlur={() => onCommit?.(ref.current.innerText.replace(/\n+/g, " ").trim())}
      className={`cv-edit ${block ? "cv-edit-block" : ""} ${className}`}
    />
  );
}

function DateSelect({ value, onChange, kind }) {
  const opts = kind === "month" ? MONTHS : YEARS;
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="cv-select">
      <option value="">{kind === "month" ? "Mon" : "Year"}</option>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function DateRange({ entry, onPatch }) {
  return (
    <div className="flex items-center gap-1 text-[12px] text-[color:var(--cv-muted)] shrink-0">
      <DateSelect kind="month" value={entry.start?.m} onChange={(m) => onPatch({ start: { ...entry.start, m } })} />
      <DateSelect kind="year" value={entry.start?.y} onChange={(y) => onPatch({ start: { ...entry.start, y } })} />
      <span className="px-0.5">–</span>
      {entry.present ? (
        <span className="font-medium">Present</span>
      ) : (
        <>
          <DateSelect kind="month" value={entry.end?.m} onChange={(m) => onPatch({ end: { ...entry.end, m } })} />
          <DateSelect kind="year" value={entry.end?.y} onChange={(y) => onPatch({ end: { ...entry.end, y } })} />
        </>
      )}
      <label className="flex items-center gap-1 ml-1.5 cursor-pointer select-none">
        <input type="checkbox" checked={!!entry.present} onChange={(e) => onPatch({ present: e.target.checked })} className="cv-check" />
        <span className="text-[11px]">Present</span>
      </label>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="cv-section-label">
      <span>{children}</span>
      <span className="cv-section-rule" />
    </div>
  );
}

function ExperienceEntry({ exp, dragHandleProps, onPatch, onBullet, onAddBullet, onRemoveBullet }) {
  return (
    <div className="group/entry relative pl-5 mb-3.5">
      <button
        {...dragHandleProps}
        tabIndex={-1}
        className="absolute left-[-6px] top-1 opacity-0 group-hover/entry:opacity-100 text-rd-text-tertiary hover:text-rd-text cursor-grab active:cursor-grabbing transition-opacity"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[13.5px] min-w-0">
          <Editable value={exp.title} onCommit={(v) => onPatch({ title: v })} className="font-semibold text-[color:var(--cv-ink)]" placeholder="Role title" />
          <span className="text-[color:var(--cv-muted)] px-1">·</span>
          <Editable value={exp.company} onCommit={(v) => onPatch({ company: v })} className="text-[color:var(--cv-ink)]" placeholder="Company" />
        </div>
        <DateRange entry={exp} onPatch={onPatch} />
      </div>
      <ul className="mt-1.5 space-y-1">
        {exp.bullets.map((b) => (
          <li key={b.id} className="group/bullet flex items-start gap-2 text-[12.5px] leading-[1.5] text-[color:var(--cv-body)]">
            <span className="cv-bullet-dot" />
            <Editable value={b.text} onCommit={(v) => onBullet(b.id, v)} className="flex-1" placeholder="Describe an accomplishment…" block />
            <button
              onClick={() => onRemoveBullet(b.id)}
              className="opacity-0 group-hover/bullet:opacity-100 text-rd-text-tertiary hover:text-rd-coral-dark mt-0.5 transition-opacity"
              aria-label="Remove bullet"
            >
              <X className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onAddBullet} className="mt-1.5 ml-3.5 inline-flex items-center gap-1 text-[11px] text-rd-text-tertiary hover:text-[color:var(--cv-accent)] transition-colors">
        <Plus className="w-3 h-3" /> bullet
      </button>
    </div>
  );
}

// Top-bar CV/job switcher — master reservoir + tailored copies, plus a
// "tailor for a new job" entry. Ours, not machar's completeness/looking-for bar.
function CvSelector({ options, value, onChange, onTailorNew }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value) || options[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 130)}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-rd-border bg-rd-bg-card hover:bg-rd-bg-soft transition-colors"
      >
        <span className="w-6 h-6 rounded-md bg-rd-coral-tint grid place-items-center shrink-0"><FileText className="w-3.5 h-3.5 text-rd-coral" /></span>
        <span className="text-left leading-tight">
          <span className="block text-[13px] font-display font-semibold text-rd-text">{current.label}</span>
          <span className="block text-[10.5px] text-rd-text-tertiary">{current.sub}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-rd-text-tertiary ml-1" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-[272px] bg-rd-bg-card border border-rd-border rounded-xl shadow-rd p-1 z-50">
          {options.map((o) => (
            <button
              key={o.id}
              onMouseDown={(e) => { e.preventDefault(); onChange(o.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${o.id === value ? "bg-rd-coral-tint/60" : "hover:bg-rd-bg-soft"}`}
            >
              <FileText className="w-3.5 h-3.5 text-rd-text-tertiary shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-medium text-rd-text truncate">{o.label}</span>
                <span className="block text-[10.5px] text-rd-text-tertiary truncate">{o.sub}</span>
              </span>
              <span className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 ${o.tag === "Master" ? "bg-rd-golden-tint text-rd-golden-dark" : "bg-rd-teal-tint text-rd-teal-dark"}`}>{o.tag}</span>
            </button>
          ))}
          <div className="border-t border-rd-border my-1" />
          <button
            onMouseDown={(e) => { e.preventDefault(); onTailorNew(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-rd-text-secondary hover:bg-rd-bg-soft transition-colors"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[12.5px]">Tailor for a new job…</span>
          </button>
        </div>
      )}
    </div>
  );
}

function TemplateThumb({ t }) {
  return (
    <div className="tpl-thumb" style={{ fontFamily: t.font }}>
      <div className="tpl-name">Isaac Selig</div>
      <div className="tpl-sub" />
      <div className="tpl-sec" style={{ color: t.accent, textTransform: t.labelCase }}>Experience</div>
      {t.rule && <div className="tpl-secrule" style={{ background: t.accent }} />}
      <div className="tpl-line" style={{ width: "100%" }} />
      <div className="tpl-line" style={{ width: "86%" }} />
      <div className="tpl-line" style={{ width: "70%" }} />
      <div className="tpl-sec" style={{ color: t.accent, textTransform: t.labelCase, marginTop: "7px" }}>Skills</div>
      <div className="tpl-line" style={{ width: "92%" }} />
    </div>
  );
}

function CVStudio() {
  const [cv, setCv] = useState(INITIAL_CV);
  const [templateId, setTemplateId] = useState("modern");
  const [saveState, setSaveState] = useState("saved");
  const [cvList, setCvList] = useState(CV_OPTIONS);
  const [selectedCv, setSelectedCv] = useState("master");
  const savingTimer = useRef(null);

  const template = TEMPLATES.find((t) => t.id === templateId);
  const currentCv = cvList.find((o) => o.id === selectedCv) || cvList[0];

  const touch = () => {
    setSaveState("saving");
    clearTimeout(savingTimer.current);
    savingTimer.current = setTimeout(() => setSaveState("saved"), 650);
  };
  useEffect(() => () => clearTimeout(savingTimer.current), []);

  // "Generate a tailored CV for a job" → append a new copy to the dropdown and
  // switch to it. In the real build this is an application_cvs INSERT.
  const tailorNew = () => {
    const s = SAMPLE_TAILORS[(cvList.length - CV_OPTIONS.length) % SAMPLE_TAILORS.length];
    const id = "t-" + uid();
    setCvList((l) => [...l, { id, label: s.role, sub: `${s.company} · tailored copy`, tag: "Tailored", role: s.role, company: s.company }]);
    setSelectedCv(id);
    touch();
  };

  const patchHeader = (patch) => { setCv((c) => ({ ...c, header: { ...c.header, ...patch } })); touch(); };
  const patchSummary = (v) => { setCv((c) => ({ ...c, summary: v })); touch(); };
  const patchExp = (id, patch) => { setCv((c) => ({ ...c, professional_experiences: c.professional_experiences.map((e) => e.id === id ? { ...e, ...patch } : e) })); touch(); };
  const patchBullet = (expId, bId, text) => { setCv((c) => ({ ...c, professional_experiences: c.professional_experiences.map((e) => e.id === expId ? { ...e, bullets: e.bullets.map((b) => b.id === bId ? { ...b, text } : b) } : e) })); touch(); };
  const addBullet = (expId) => { setCv((c) => ({ ...c, professional_experiences: c.professional_experiences.map((e) => e.id === expId ? { ...e, bullets: [...e.bullets, { id: uid(), text: "" }] } : e) })); touch(); };
  const removeBullet = (expId, bId) => { setCv((c) => ({ ...c, professional_experiences: c.professional_experiences.map((e) => e.id === expId ? { ...e, bullets: e.bullets.filter((b) => b.id !== bId) } : e) })); touch(); };
  const patchEdu = (id, patch) => { setCv((c) => ({ ...c, education: c.education.map((e) => e.id === id ? { ...e, ...patch } : e) })); touch(); };
  const patchSkills = (line) => { setCv((c) => ({ ...c, skills: line.split("·").map((s) => s.trim()).filter(Boolean) })); touch(); };
  const patchLanguages = (line) => { setCv((c) => ({ ...c, languages: line.split("·").map((s) => s.trim()).filter(Boolean) })); touch(); };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    setCv((c) => {
      const next = [...c.professional_experiences];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return { ...c, professional_experiences: next };
    });
    touch();
  };

  const docStyle = {
    "--cv-font": template.font,
    "--cv-accent": template.accent,
    "--cv-ink": "#1A1A1A",
    "--cv-body": "#33312E",
    "--cv-muted": "#8A8782",
    "--cv-label-case": template.labelCase,
  };

  return (
    <div className="h-full flex flex-col bg-rd-bg-page font-body text-rd-text overflow-hidden" style={{ "--cv-accent": template.accent }}>
      <PreviewStyles ruleOn={template.rule} />

      {/* ---------- Studio top bar (ours) ---------- */}
      <header className="h-[52px] shrink-0 border-b border-rd-border bg-rd-bg-card flex items-center px-4 gap-3">
        <CvSelector options={cvList} value={selectedCv} onChange={setSelectedCv} onTailorNew={tailorNew} />
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rd-teal-tint text-rd-teal-dark text-[11px] font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${saveState === "saving" ? "bg-rd-golden-dark animate-pulse" : "bg-rd-teal-dark"}`} />
          {saveState === "saving" ? "saving…" : "saved"}
        </span>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--cv-accent)] text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity">
          <Download className="w-3.5 h-3.5" /> Download
        </button>
      </header>

      {/* ---------- Body: three columns ---------- */}
      <div className="flex-1 flex min-h-0">

        {/* Left rail — Templates */}
        <aside className="w-[216px] shrink-0 border-r border-rd-border bg-rd-bg-card/50 overflow-y-auto cv-scroll">
          <div className="p-4">
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.1em] text-rd-text-eyebrow mb-3">Templates</p>
            <div className="space-y-2.5">
              {TEMPLATES.map((t) => {
                const active = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`w-full text-left rounded-xl border p-2 transition-all ${active ? "border-[color:var(--cv-accent)] ring-1 ring-[color:var(--cv-accent)] bg-rd-bg-soft" : "border-rd-border bg-rd-bg-soft hover:border-rd-text-tertiary"}`}
                    style={{ "--cv-accent": t.accent }}
                  >
                    <TemplateThumb t={t} />
                    <div className="flex items-center justify-between mt-2 px-0.5">
                      <span className="text-[12px] font-display font-semibold text-rd-text">{t.name}</span>
                      {active && <Check className="w-3.5 h-3.5 text-[color:var(--cv-accent)]" style={{ "--cv-accent": t.accent }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center — the CV document */}
        <main className="flex-1 min-w-0 overflow-y-auto cv-scroll bg-rd-bg-page">
          <div className="px-5 pt-3">
            <div className="max-w-[720px] mx-auto flex items-center justify-between gap-3 mb-3 px-1">
              {currentCv?.role ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-rd-teal-dark bg-rd-teal-tint border border-rd-teal/30 rounded-full px-3 py-1">
                  <Check className="w-3.5 h-3.5" /> Tailored for {currentCv.role} · {currentCv.company}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-rd-golden-dark bg-rd-golden-tint border border-rd-golden/40 rounded-full px-3 py-1">
                  <Sparkles className="w-3.5 h-3.5" /> Master CV — the source for every tailored copy
                </span>
              )}
              <span className="text-[11.5px] text-rd-text-tertiary shrink-0">Click any text to edit · saves automatically</span>
            </div>
          </div>

          <div className="px-5 pb-16">
            <div className="cv-doc max-w-[720px] mx-auto bg-white rounded-[6px] shadow-rd border border-rd-border px-12 py-11" style={docStyle}>
              <Editable value={cv.header.name} onCommit={(v) => patchHeader({ name: v })} className="cv-name" block placeholder="Your Name" />
              <Editable value={cv.header.headline} onCommit={(v) => patchHeader({ headline: v })} className="cv-headline" block placeholder="Headline (e.g. Senior Backend Engineer)" />
              <div className="cv-contact">
                <Editable value={cv.header.email} onCommit={(v) => patchHeader({ email: v })} placeholder="email" />
                <span className="cv-dot">·</span>
                <Editable value={cv.header.linkedin} onCommit={(v) => patchHeader({ linkedin: v })} placeholder="LinkedIn/Portfolio" />
                <span className="cv-dot">·</span>
                <Editable value={cv.header.location} onCommit={(v) => patchHeader({ location: v })} placeholder="Location" />
              </div>

              <SectionLabel>Summary</SectionLabel>
              <Editable value={cv.summary} onCommit={patchSummary} className="cv-summary" block placeholder="Write a short professional summary…" />

              <SectionLabel>Experience</SectionLabel>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="prof">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {cv.professional_experiences.map((exp, i) => (
                        <Draggable key={exp.id} draggableId={exp.id} index={i}>
                          {(p, snapshot) => (
                            <div ref={p.innerRef} {...p.draggableProps} className={snapshot.isDragging ? "rounded-md bg-white shadow-rd" : ""}>
                              <ExperienceEntry
                                exp={exp}
                                dragHandleProps={p.dragHandleProps}
                                onPatch={(patch) => patchExp(exp.id, patch)}
                                onBullet={(bId, v) => patchBullet(exp.id, bId, v)}
                                onAddBullet={() => addBullet(exp.id)}
                                onRemoveBullet={(bId) => removeBullet(exp.id, bId)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <SectionLabel>Education</SectionLabel>
              <div className="space-y-1.5">
                {cv.education.map((ed) => (
                  <div key={ed.id} className="flex items-baseline justify-between gap-3">
                    <div className="text-[12.5px] min-w-0">
                      <Editable value={ed.school} onCommit={(v) => patchEdu(ed.id, { school: v })} className="font-semibold text-[color:var(--cv-ink)]" placeholder="Institution" />
                      <span className="text-[color:var(--cv-muted)] px-1">·</span>
                      <Editable value={ed.degree} onCommit={(v) => patchEdu(ed.id, { degree: v })} className="text-[color:var(--cv-body)]" placeholder="Degree" />
                      {ed.field !== undefined && (
                        <>
                          <span className="text-[color:var(--cv-muted)] px-1">·</span>
                          <Editable value={ed.field} onCommit={(v) => patchEdu(ed.id, { field: v })} className="text-[color:var(--cv-muted)]" placeholder="Field" />
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <DateSelect kind="month" value={ed.end?.m} onChange={(m) => patchEdu(ed.id, { end: { ...ed.end, m } })} />
                      <DateSelect kind="year" value={ed.end?.y} onChange={(y) => patchEdu(ed.id, { end: { ...ed.end, y } })} />
                    </div>
                  </div>
                ))}
              </div>

              <SectionLabel>Skills</SectionLabel>
              <Editable value={cv.skills.join(" · ")} onCommit={patchSkills} className="cv-summary" block placeholder="Add skills separated by ·" />

              <SectionLabel>Languages</SectionLabel>
              <Editable value={cv.languages.join(" · ")} onCommit={patchLanguages} className="cv-summary" block placeholder="Languages" />
            </div>
          </div>
        </main>

        {/* Right — CV Agent chat */}
        <aside className="w-[336px] shrink-0 border-l border-rd-border bg-rd-bg-card flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-rd-border flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-rd-coral-tint grid place-items-center">
              <FileText className="w-3.5 h-3.5 text-rd-coral" />
            </div>
            <div className="leading-tight flex-1">
              <p className="text-[13.5px] font-display font-bold text-rd-text">CV Agent</p>
              <p className="text-[11px] text-rd-text-tertiary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rd-teal-dark inline-block" /> Editing this CV with you
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-rd-text-tertiary" />
          </div>

          <div className="flex-1 overflow-y-auto cv-scroll px-4 py-4">
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-rd-coral-tint grid place-items-center shrink-0 mt-0.5">
                <FileText className="w-3 h-3 text-rd-coral" />
              </div>
              <div className="text-[12.5px] text-rd-text-secondary leading-relaxed space-y-2">
                <p>This CV shows strong, relevant experience — the AI evaluation work and the 60,000-user affiliate project stand out. The biggest wins now are tighter, measurable bullets and a one-line headline.</p>
                <p className="font-semibold text-rd-text">A few things I&apos;d fix:</p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>Add a headline (e.g. &quot;Full-Stack Developer &amp; AI Evaluation Specialist&quot;).</li>
                  <li>Rewrite the Outlier and Anpr+ bullets with measurable outcomes, not responsibilities.</li>
                  <li>Lead the Tempus bullet with the result (traffic / conversion lift), then the how.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="px-4 pt-2 pb-4 border-t border-rd-border">
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {AGENT_CHIPS.map((c) => (
                <button key={c} className="px-2.5 py-1 rounded-full border border-rd-border bg-rd-bg-card text-[11.5px] text-rd-text-secondary hover:border-rd-coral hover:text-rd-coral-dark transition-colors">{c}</button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <input placeholder="Ask the CV Agent…" className="flex-1 h-[38px] px-3 rounded-[12px] border border-rd-border bg-rd-bg-card text-[13px] focus:outline-none focus:border-rd-coral" />
              <button className="w-[38px] h-[38px] rounded-full bg-rd-coral text-white grid place-items-center shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Mounts the studio inside the real Get-a-Job shell. Mirrors ShellPreview:
// stub AuthContext + a QueryClient pre-seeded with a signed-in, onboarded
// fixture profile so Layout paints the sidebar (it hides chrome until
// onboarding_complete is true). currentPageName="CVAgent" lights the CV Agent
// nav item + auto-expands the Chat group.
export default function CVAgentPreview() {
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false } } }),
    [],
  );
  useEffect(() => {
    queryClient.setQueryData(["userProfile", FIXTURE_UID], {
      practicum_path: null,
      onboarding_complete: true,
      full_name: "Isaac Selig",
    });
  }, [queryClient]);

  const authValue = useMemo(
    () => ({
      user: { id: FIXTURE_UID, email: "isaacselig@gmail.com" },
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout: () => {},
      navigateToLogin: () => {},
      checkAppState: () => {},
    }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <Layout currentPageName="CVAgent">
          <CVStudio />
        </Layout>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

function PreviewStyles({ ruleOn }) {
  return (
    <style>{`
      .cv-doc { font-family: var(--cv-font); color: var(--cv-body); }
      .cv-edit { outline: none; border-radius: 4px; transition: background .12s ease, box-shadow .12s ease; cursor: text; }
      .cv-edit:hover { background: rgba(0,0,0,.04); box-shadow: 0 0 0 4px rgba(0,0,0,.04); }
      .cv-edit:focus { background: rgba(0,0,0,.05); box-shadow: 0 0 0 4px rgba(0,0,0,.05); }
      .cv-edit-block { display: block; }
      .cv-edit:empty:before { content: attr(data-ph); color: #B5B2AC; font-style: italic; }

      .cv-name { font-size: 28px; font-weight: 700; letter-spacing: -.01em; color: var(--cv-ink); line-height: 1.1; }
      .cv-headline { font-size: 14px; font-weight: 600; color: var(--cv-muted); margin-top: 2px; }
      .cv-contact { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; font-size: 12.5px; color: var(--cv-body); margin-top: 8px; }
      .cv-contact .cv-dot { color: var(--cv-muted); padding: 0 6px; }
      .cv-summary { font-size: 12.5px; line-height: 1.55; color: var(--cv-body); }

      .cv-section-label {
        display: flex; align-items: center; gap: 12px;
        margin: 22px 0 9px;
        font-size: 11.5px; font-weight: 700; letter-spacing: .11em;
        text-transform: var(--cv-label-case); color: var(--cv-accent);
      }
      .cv-section-rule { flex: 1; height: 1px; background: ${ruleOn ? "color-mix(in srgb, var(--cv-accent) 35%, transparent)" : "transparent"}; }

      .cv-bullet-dot { width: 4px; height: 4px; border-radius: 9999px; background: var(--cv-accent); margin-top: 8px; flex-shrink: 0; }

      .cv-select {
        appearance: none; -webkit-appearance: none;
        background: transparent; border: 1px solid transparent; border-radius: 5px;
        padding: 1px 4px; font-size: 12px; color: var(--cv-muted); cursor: pointer;
        transition: border-color .12s ease, background .12s ease;
      }
      .cv-select:hover { border-color: rgba(0,0,0,.12); background: rgba(0,0,0,.02); }
      .cv-select:focus { outline: none; border-color: var(--cv-accent); }

      .cv-check { width: 13px; height: 13px; accent-color: var(--cv-accent); cursor: pointer; }

      .tpl-thumb { background:#fff; border:1px solid #EAE7E1; border-radius:5px; padding:9px 10px 11px; height:104px; overflow:hidden; }
      .tpl-name { font-size:10px; font-weight:700; color:#1A1A1A; line-height:1.1; }
      .tpl-sub { height:2.5px; width:52%; background:#E7E4DE; border-radius:2px; margin-top:3px; }
      .tpl-sec { font-size:5.5px; font-weight:700; letter-spacing:.12em; line-height:1; margin-top:7px; }
      .tpl-secrule { height:1px; margin-top:1.5px; opacity:.55; }
      .tpl-line { height:2.5px; background:#ECE9E3; border-radius:2px; margin-top:2.5px; }

      .cv-scroll::-webkit-scrollbar { width: 9px; }
      .cv-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.14); border-radius: 9999px; border: 2px solid transparent; background-clip: content-box; }
      .cv-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,.24); background-clip: content-box; }
    `}</style>
  );
}

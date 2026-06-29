// CVStudioView — the presentational CV "studio" (Templates rail | editable CV
// document | CV Agent panel). Pure/props-driven: it holds NO data of its own, so
// it renders identically whether fed a fixture (the design mock) or real
// application_cvs data (the live surface / eventual CVAgent page).
//
// Editor model it expects (see cvDataAdapter.fromCvData):
//   { header:{name,headline,email,linkedin,location},
//     summary,
//     experiences / military / volunteering / leadership:
//       [{id,title,company,dates,bullets:[{id,text}]}],
//     education:[{id,institution,degree,dates,field}],
//     skills:[string], languages:[string] }
// Dates are edited as free text (matches the persisted string).

import React, { useEffect, useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  Plus,
  X,
  Download,
  ChevronDown,
  Sparkles,
  Send,
  Check,
  FileText,
  Trash2,
} from "lucide-react";
// Template tokens moved to a React-free module so the verification harness can
// import the same source of truth (see cvTemplates.js). Imported for in-file use
// (default `templates` prop) AND re-exported so existing
// `import { CV_TEMPLATES } from ".../CVStudioView"` call sites keep working.
import { CV_TEMPLATES } from "./cvTemplates";

export { CV_TEMPLATES };

const AGENT_CHIPS = [
  "Rewrite my summary",
  "Tighten bullets",
  "Add keywords",
  "Tailor to a job",
];

// Uncontrolled contentEditable — set once on mount, commit on blur. Keyed by the
// caller (via React key) when the underlying record changes so a CV switch
// re-seeds the text.
function Editable({
  value,
  onCommit,
  className = "",
  placeholder = "",
  block = false,
}) {
  const ref = useRef(null);
  const Tag = block ? "div" : "span";
  useEffect(() => {
    if (ref.current && ref.current.innerText !== (value || ""))
      ref.current.innerText = value || "";
  }, []);
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-ph={placeholder}
      onBlur={() =>
        onCommit?.(ref.current.innerText.replace(/\n+/g, " ").trim())
      }
      className={`cv-edit ${block ? "cv-edit-block" : ""} ${className}`}
    />
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

function ExperienceEntry({
  exp,
  dragHandleProps,
  onPatch,
  onBullet,
  onAddBullet,
  onRemoveBullet,
}) {
  return (
    <div className="group/entry relative pl-5 mb-3.5">
      <button
        {...dragHandleProps}
        tabIndex={-1}
        aria-label="Drag to reorder"
        className="absolute left-[-6px] top-1 opacity-0 group-hover/entry:opacity-100 text-rd-text-tertiary hover:text-rd-text cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[13.5px] min-w-0">
          <Editable
            value={exp.title}
            onCommit={(v) => onPatch({ title: v })}
            className="font-semibold text-[color:var(--cv-ink)]"
            placeholder="Role title"
          />
          <span className="text-[color:var(--cv-muted)] px-1">·</span>
          <Editable
            value={exp.org}
            onCommit={(v) => onPatch({ org: v })}
            className="text-[color:var(--cv-ink)]"
            placeholder="Company"
          />
        </div>
        <Editable
          value={exp.dates}
          onCommit={(v) => onPatch({ dates: v })}
          className="text-[12px] text-[color:var(--cv-muted)] text-right shrink-0 min-w-[120px]"
          placeholder="Dates"
        />
      </div>
      <ul className="mt-1.5 space-y-1">
        {exp.bullets.map((b) => (
          <li
            key={b.id}
            className="group/bullet flex items-start gap-2 text-[12.5px] leading-[1.5] text-[color:var(--cv-body)]"
          >
            <span className="cv-bullet-dot" />
            <Editable
              value={b.text}
              onCommit={(v) => onBullet(b.id, v)}
              className="flex-1"
              placeholder="Describe an accomplishment…"
              block
            />
            <button
              onClick={() => onRemoveBullet(b.id)}
              aria-label="Remove bullet"
              className="opacity-0 group-hover/bullet:opacity-100 text-rd-text-tertiary hover:text-rd-coral-dark mt-0.5 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={onAddBullet}
        className="mt-1.5 ml-3.5 inline-flex items-center gap-1 text-[11px] text-rd-text-tertiary hover:text-[color:var(--cv-accent)] transition-colors"
      >
        <Plus className="w-3 h-3" /> bullet
      </button>
    </div>
  );
}

// One draggable experience bucket (professional / military / volunteering /
// leadership). Handlers are passed the section key so all four share logic.
function ExperienceSection({
  label,
  sectionKey,
  items,
  onDragEnd,
  onPatchExp,
  onPatchBullet,
  onAddBullet,
  onRemoveBullet,
}) {
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      <DragDropContext onDragEnd={(result) => onDragEnd(sectionKey, result)}>
        <Droppable droppableId={sectionKey}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {items.map((exp, i) => (
                <Draggable key={exp.id} draggableId={exp.id} index={i}>
                  {(p, snapshot) => (
                    <div
                      ref={p.innerRef}
                      {...p.draggableProps}
                      className={
                        snapshot.isDragging
                          ? "rounded-md bg-white shadow-rd"
                          : ""
                      }
                    >
                      <ExperienceEntry
                        exp={exp}
                        dragHandleProps={p.dragHandleProps}
                        onPatch={(patch) =>
                          onPatchExp(sectionKey, exp.id, patch)
                        }
                        onBullet={(bId, v) =>
                          onPatchBullet(sectionKey, exp.id, bId, v)
                        }
                        onAddBullet={() => onAddBullet(sectionKey, exp.id)}
                        onRemoveBullet={(bId) =>
                          onRemoveBullet(sectionKey, exp.id, bId)
                        }
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
    </>
  );
}

function TemplateThumb({ t }) {
  return (
    <div className="tpl-thumb" style={{ fontFamily: t.font }}>
      <div className="tpl-name">Your Name</div>
      <div className="tpl-sub" />
      <div
        className="tpl-sec"
        style={{ color: t.accent, textTransform: t.labelCase }}
      >
        Experience
      </div>
      {t.rule && (
        <div className="tpl-secrule" style={{ background: t.accent }} />
      )}
      <div className="tpl-line" style={{ width: "100%" }} />
      <div className="tpl-line" style={{ width: "86%" }} />
      <div className="tpl-line" style={{ width: "70%" }} />
      <div
        className="tpl-sec"
        style={{
          color: t.accent,
          textTransform: t.labelCase,
          marginTop: "7px",
        }}
      >
        Skills
      </div>
      <div className="tpl-line" style={{ width: "92%" }} />
    </div>
  );
}

function CvSelector({ options, value, onChange, onTailorNew, onDelete }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value) || options[0];
  if (!current) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 130)}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-rd-border bg-rd-bg-card hover:bg-rd-bg-soft transition-colors"
      >
        <span className="w-6 h-6 rounded-md bg-rd-coral-tint grid place-items-center shrink-0">
          <FileText className="w-3.5 h-3.5 text-rd-coral" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[13px] font-display font-semibold text-rd-text">
            {current.label}
          </span>
          <span className="block text-[10.5px] text-rd-text-tertiary">
            {current.sub}
          </span>
        </span>
        <ChevronDown className="w-4 h-4 text-rd-text-tertiary ml-1" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-[272px] bg-rd-bg-card border border-rd-border rounded-xl shadow-rd p-1 z-50">
          {options.map((o) => (
            <div
              key={o.id}
              className={`group/cvopt w-full flex items-center rounded-lg transition-colors ${o.id === value ? "bg-rd-coral-tint/60" : "hover:bg-rd-bg-soft"}`}
            >
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.id);
                  setOpen(false);
                }}
                className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2 text-left"
              >
                <FileText className="w-3.5 h-3.5 text-rd-text-tertiary shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-medium text-rd-text truncate">
                    {o.label}
                  </span>
                  <span className="block text-[10.5px] text-rd-text-tertiary truncate">
                    {o.sub}
                  </span>
                </span>
              </button>
              <span
                className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0 mr-1.5 ${onDelete ? "group-hover/cvopt:hidden" : ""} ${o.tag === "Master" ? "bg-rd-golden-tint text-rd-golden-dark" : "bg-rd-teal-tint text-rd-teal-dark"}`}
              >
                {o.tag}
              </span>
              {onDelete && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onDelete(o);
                  }}
                  aria-label={`Delete ${o.label}`}
                  className="hidden group-hover/cvopt:inline-flex items-center justify-center w-7 h-7 mr-1 rounded-md text-rd-text-tertiary hover:text-rd-coral-dark hover:bg-rd-coral-tint shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {onTailorNew && (
            <>
              <div className="border-t border-rd-border my-1" />
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  onTailorNew();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-rd-text-secondary hover:bg-rd-bg-soft transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[12.5px]">Tailor for a new job…</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function CVStudioView({
  cv,
  onPatchHeader,
  onPatchSummary,
  onPatchExp,
  onPatchBullet,
  onAddBullet,
  onRemoveBullet,
  onDragEnd,
  onPatchEdu,
  onPatchSkills,
  onPatchLanguages,
  templates = CV_TEMPLATES,
  templateId = "modern",
  onTemplateChange,
  cvOptions = [],
  selectedCvId,
  onSelectCv,
  onTailorNew,
  onDeleteCv,
  currentCv,
  saveState = "saved",
  onDownload,
  coach,
  chatMessages = [],
  onSendMessage,
  chatBusy = false,
}) {
  const template = templates.find((t) => t.id === templateId) || templates[0];
  const docStyle = {
    "--cv-font": template.font,
    "--cv-accent": template.accent,
    "--cv-ink": "#1A1A1A",
    "--cv-body": "#33312E",
    "--cv-muted": "#8A8782",
    "--cv-label-case": template.labelCase,
  };
  const savePill =
    saveState === "error"
      ? {
          cls: "bg-rd-coral-tint text-rd-coral-dark",
          dot: "bg-rd-coral-dark",
          text: "save failed",
        }
      : saveState === "saving"
        ? {
            cls: "bg-rd-golden-tint text-rd-golden-dark",
            dot: "bg-rd-golden-dark animate-pulse",
            text: "saving…",
          }
        : {
            cls: "bg-rd-teal-tint text-rd-teal-dark",
            dot: "bg-rd-teal-dark",
            text: "saved",
          };

  const handleDelete = (o) => {
    if (!o || !onDeleteCv) return;
    const msg = o.isMaster
      ? "Delete your Master CV? It's the source for your tailored copies — you can regenerate it later."
      : `Delete "${o.label}"? This can't be undone.`;
    if (window.confirm(msg)) onDeleteCv(o.id);
  };

  const [chatInput, setChatInput] = useState("");
  const sendChat = (text) => {
    const t = (text ?? chatInput).trim();
    if (!t || chatBusy || !onSendMessage) return;
    onSendMessage(t);
    setChatInput("");
  };

  return (
    <div
      className="h-full flex flex-col bg-rd-bg-page font-body text-rd-text overflow-hidden"
      style={{ "--cv-accent": template.accent }}
    >
      <CvStudioStyles ruleOn={template.rule} />

      <header className="h-[52px] shrink-0 border-b border-rd-border bg-rd-bg-card flex items-center px-4 gap-3">
        <CvSelector
          options={cvOptions}
          value={selectedCvId}
          onChange={onSelectCv}
          onTailorNew={onTailorNew}
          onDelete={onDeleteCv ? handleDelete : null}
        />
        <div className="flex-1" />
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${savePill.cls}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${savePill.dot}`} />{" "}
          {savePill.text}
        </span>
        {onDeleteCv && currentCv && (
          <button
            onClick={() => handleDelete(currentCv)}
            aria-label="Delete this CV"
            title="Delete this CV"
            className="w-8 h-8 grid place-items-center rounded-lg text-rd-text-tertiary hover:text-rd-coral-dark hover:bg-rd-coral-tint transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--cv-accent)] text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Templates */}
        <aside className="w-[216px] shrink-0 border-r border-rd-border bg-rd-bg-card/50 overflow-y-auto cv-scroll">
          <div className="p-4">
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.1em] text-rd-text-eyebrow mb-3">
              Templates
            </p>
            <div className="space-y-2.5">
              {templates.map((t) => {
                const active = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    onClick={() => onTemplateChange?.(t.id)}
                    style={{ "--cv-accent": t.accent }}
                    className={`w-full text-left rounded-xl border p-2 transition-all ${active ? "border-[color:var(--cv-accent)] ring-1 ring-[color:var(--cv-accent)] bg-rd-bg-soft" : "border-rd-border bg-rd-bg-soft hover:border-rd-text-tertiary"}`}
                  >
                    <TemplateThumb t={t} />
                    <div className="flex items-center justify-between mt-2 px-0.5">
                      <span className="text-[12px] font-display font-semibold text-rd-text">
                        {t.name}
                      </span>
                      {active && (
                        <Check
                          className="w-3.5 h-3.5 text-[color:var(--cv-accent)]"
                          style={{ "--cv-accent": t.accent }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Document */}
        <main className="flex-1 min-w-0 overflow-y-auto cv-scroll bg-rd-bg-page">
          <div className="px-5 pt-3">
            <div className="max-w-[720px] mx-auto flex items-center justify-between gap-3 mb-3 px-1">
              {currentCv?.role ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-rd-teal-dark bg-rd-teal-tint border border-rd-teal/30 rounded-full px-3 py-1">
                  <Check className="w-3.5 h-3.5" /> Tailored for{" "}
                  {currentCv.role}
                  {currentCv.company ? ` · ${currentCv.company}` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-rd-golden-dark bg-rd-golden-tint border border-rd-golden/40 rounded-full px-3 py-1">
                  <Sparkles className="w-3.5 h-3.5" /> Master CV — the source
                  for every tailored copy
                </span>
              )}
              <span className="text-[11.5px] text-rd-text-tertiary shrink-0">
                Click any text to edit · saves automatically
              </span>
            </div>
          </div>

          <div className="px-5 pb-16">
            <div
              className="cv-doc max-w-[720px] mx-auto bg-white rounded-[6px] shadow-rd border border-rd-border px-12 py-11"
              style={docStyle}
            >
              <Editable
                value={cv.header.name}
                onCommit={(v) => onPatchHeader({ name: v })}
                className="cv-name"
                block
                placeholder="Your Name"
              />
              <Editable
                value={cv.header.headline}
                onCommit={(v) => onPatchHeader({ headline: v })}
                className="cv-headline"
                block
              />
              <div className="cv-contact">
                <Editable
                  value={cv.header.email}
                  onCommit={(v) => onPatchHeader({ email: v })}
                  placeholder="email"
                />
                <span className="cv-dot">·</span>
                <Editable
                  value={cv.header.linkedin}
                  onCommit={(v) => onPatchHeader({ linkedin: v })}
                  placeholder="LinkedIn/Portfolio"
                />
                <span className="cv-dot">·</span>
                <Editable
                  value={cv.header.location}
                  onCommit={(v) => onPatchHeader({ location: v })}
                  placeholder="Location"
                />
              </div>

              <SectionLabel>Summary</SectionLabel>
              <Editable
                value={cv.summary}
                onCommit={onPatchSummary}
                className="cv-summary"
                block
                placeholder="Write a short professional summary…"
              />

              <ExperienceSection
                label="Experience"
                sectionKey="experiences"
                items={cv.experiences}
                onDragEnd={onDragEnd}
                onPatchExp={onPatchExp}
                onPatchBullet={onPatchBullet}
                onAddBullet={onAddBullet}
                onRemoveBullet={onRemoveBullet}
              />
              {cv.military?.length > 0 && (
                <ExperienceSection
                  label="Military Service"
                  sectionKey="military"
                  items={cv.military}
                  onDragEnd={onDragEnd}
                  onPatchExp={onPatchExp}
                  onPatchBullet={onPatchBullet}
                  onAddBullet={onAddBullet}
                  onRemoveBullet={onRemoveBullet}
                />
              )}
              {cv.volunteering?.length > 0 && (
                <ExperienceSection
                  label="Volunteering"
                  sectionKey="volunteering"
                  items={cv.volunteering}
                  onDragEnd={onDragEnd}
                  onPatchExp={onPatchExp}
                  onPatchBullet={onPatchBullet}
                  onAddBullet={onAddBullet}
                  onRemoveBullet={onRemoveBullet}
                />
              )}
              {cv.leadership?.length > 0 && (
                <ExperienceSection
                  label="Leadership"
                  sectionKey="leadership"
                  items={cv.leadership}
                  onDragEnd={onDragEnd}
                  onPatchExp={onPatchExp}
                  onPatchBullet={onPatchBullet}
                  onAddBullet={onAddBullet}
                  onRemoveBullet={onRemoveBullet}
                />
              )}

              <SectionLabel>Education</SectionLabel>
              <div className="space-y-1.5">
                {cv.education.map((ed) => (
                  <div
                    key={ed.id}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <div className="text-[12.5px] min-w-0">
                      <Editable
                        value={ed.institution}
                        onCommit={(v) => onPatchEdu(ed.id, { institution: v })}
                        className="font-semibold text-[color:var(--cv-ink)]"
                        placeholder="Institution"
                      />
                      <span className="text-[color:var(--cv-muted)] px-1">
                        ·
                      </span>
                      <Editable
                        value={ed.degree}
                        onCommit={(v) => onPatchEdu(ed.id, { degree: v })}
                        className="text-[color:var(--cv-body)]"
                        placeholder="Degree"
                      />
                      {ed.field ? (
                        <>
                          <span className="text-[color:var(--cv-muted)] px-1">
                            ·
                          </span>
                          <Editable
                            value={ed.field}
                            onCommit={(v) => onPatchEdu(ed.id, { field: v })}
                            className="text-[color:var(--cv-muted)]"
                            placeholder="Field"
                          />
                        </>
                      ) : null}
                    </div>
                    <Editable
                      value={ed.dates}
                      onCommit={(v) => onPatchEdu(ed.id, { dates: v })}
                      className="text-[12px] text-[color:var(--cv-muted)] text-right shrink-0 min-w-[80px]"
                      placeholder="Year"
                    />
                  </div>
                ))}
              </div>

              <SectionLabel>Skills</SectionLabel>
              <Editable
                value={cv.skills.join(" · ")}
                onCommit={onPatchSkills}
                className="cv-summary"
                block
                placeholder="Add skills separated by ·"
              />

              <SectionLabel>Languages</SectionLabel>
              <Editable
                value={cv.languages.join(" · ")}
                onCommit={onPatchLanguages}
                className="cv-summary"
                block
                placeholder="Languages"
              />
            </div>
          </div>
        </main>

        {/* CV Agent panel */}
        <aside className="w-[336px] shrink-0 border-l border-rd-border bg-rd-bg-card flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-rd-border flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-rd-coral-tint grid place-items-center">
              <FileText className="w-3.5 h-3.5 text-rd-coral" />
            </div>
            <div className="leading-tight flex-1">
              <p className="text-[13.5px] font-display font-bold text-rd-text">
                CV Agent
              </p>
              <p className="text-[11px] text-rd-text-tertiary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rd-teal-dark inline-block" />{" "}
                Editing this CV with you
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-rd-text-tertiary" />
          </div>
          <div className="flex-1 overflow-y-auto cv-scroll px-4 py-4 space-y-3">
            {chatMessages.length === 0 &&
              (coach || (
                <p className="text-[12.5px] text-rd-text-secondary leading-relaxed">
                  Ask me to rewrite a section, tighten your bullets, or tailor
                  this CV to a specific job — I&apos;ll edit the document
                  directly.
                </p>
              ))}
            {chatMessages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}
              >
                {m.role !== "user" && (
                  <div className="w-6 h-6 rounded-full bg-rd-coral-tint grid place-items-center shrink-0 mt-0.5">
                    <FileText className="w-3 h-3 text-rd-coral" />
                  </div>
                )}
                <div
                  className={`text-[12.5px] leading-relaxed rounded-[12px] px-3 py-2 max-w-[82%] ${m.role === "user" ? "bg-rd-coral text-white" : "bg-rd-bg-soft text-rd-text-secondary"}`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatBusy && (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-rd-coral-tint grid place-items-center shrink-0 mt-0.5">
                  <FileText className="w-3 h-3 text-rd-coral" />
                </div>
                <div className="inline-flex gap-1 items-center px-3 py-2.5 bg-rd-bg-soft rounded-[12px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rd-text-tertiary animate-chat-typing" />
                  <span className="w-1.5 h-1.5 rounded-full bg-rd-text-tertiary animate-chat-typing [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-rd-text-tertiary animate-chat-typing [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>
          <div className="px-4 pt-2 pb-4 border-t border-rd-border">
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {AGENT_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => sendChat(c)}
                  disabled={chatBusy}
                  className="px-2.5 py-1 rounded-full border border-rd-border bg-rd-bg-card text-[11.5px] text-rd-text-secondary hover:border-rd-coral hover:text-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                placeholder="Ask the CV Agent…"
                disabled={chatBusy}
                className="flex-1 h-[38px] px-3 rounded-[12px] border border-rd-border bg-rd-bg-card text-[13px] focus:outline-none focus:border-rd-coral disabled:opacity-60"
              />
              <button
                onClick={() => sendChat()}
                disabled={chatBusy || !chatInput.trim()}
                aria-label="Send message"
                className="w-[38px] h-[38px] rounded-full bg-rd-coral text-white grid place-items-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CvStudioStyles({ ruleOn }) {
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
      .cv-section-label { display: flex; align-items: center; gap: 12px; margin: 22px 0 9px; font-size: 11.5px; font-weight: 700; letter-spacing: .11em; text-transform: var(--cv-label-case); color: var(--cv-accent); }
      .cv-section-rule { flex: 1; height: 1px; background: ${ruleOn ? "color-mix(in srgb, var(--cv-accent) 35%, transparent)" : "transparent"}; }
      .cv-bullet-dot { width: 4px; height: 4px; border-radius: 9999px; background: var(--cv-accent); margin-top: 8px; flex-shrink: 0; }
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

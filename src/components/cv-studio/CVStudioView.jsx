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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Send,
  Check,
  FileText,
  Trash2,
  Loader2,
  RotateCcw,
} from "lucide-react";
// Template tokens moved to a React-free module so the verification harness can
// import the same source of truth (see cvTemplates.js). Imported for in-file use
// (default `templates` prop) AND re-exported so existing
// `import { CV_TEMPLATES } from ".../CVStudioView"` call sites keep working.
import { CV_TEMPLATES } from "./cvTemplates";
import CvGenerationProgress, {
  GENERATION_ETA,
} from "@/components/cv-studio/CvGenerationProgress";
import { isNextDesign } from "@/lib/nextDesign";

export { CV_TEMPLATES };

// Flag-on Templates rail collapse state, persisted across remounts (tab
// switches unmount the studio) so the choice sticks. Default expanded.
let templatesOpenPref = true;

const AGENT_CHIPS = [
  "Rewrite my summary",
  "Tighten bullets",
  "Add keywords",
  "Tailor to a job",
];

const REVISE_PRESETS = [
  {
    id: "tighten",
    label: "Tighten",
    instr: "Make it more concise and punchy without losing any real detail.",
  },
  {
    id: "rewrite",
    label: "Rewrite",
    instr: "Rewrite it to read more strongly and specifically.",
  },
  {
    id: "keywords",
    label: "Add keywords",
    instr:
      "Surface relevant skills and keywords already implied by the content - do not invent anything new.",
  },
];

// Piece-targeted "Revise with AI" affordance (the LinkedIn-optimizer pattern):
// the user targets ONE bullet or the summary, optionally picks a preset verb
// and/or says what's off, and the edit lands in place - undoable like any manual
// edit. Renders NOTHING when onRevise is absent (the flag-off /CVAgent surface),
// so it never changes that DOM. onRevise(target, {preset, feedback}) returns a
// promise; this owns the in-progress + error state so the piece never looks
// frozen during the (whole-document) regen.
function PieceRevise({ onRevise, target }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  if (!onRevise) return null;

  const run = async (preset) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onRevise(target, {
        preset: preset?.instr || "",
        feedback: feedback.trim(),
      });
      setOpen(false);
      setFeedback("");
    } catch {
      setError("Couldn't revise that - try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-label="Revise with AI"
        title="Revise with AI"
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium transition-opacity ${busy ? "opacity-100 text-rd-primary-dark" : "opacity-0 group-hover/bullet:opacity-100 group-hover/piece:opacity-100 focus:opacity-100 text-rd-text-tertiary hover:text-rd-primary-dark"}`}
      >
        {busy ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        {busy ? "Revising…" : "Revise"}
      </button>
      {open && !busy && (
        <div
          className="absolute right-0 top-full mt-1 w-[244px] bg-rd-bg-card border border-rd-border rounded-xl shadow-rd p-2.5 z-50 text-left"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap gap-1.5 mb-2">
            {REVISE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  run(p);
                }}
                className="px-2 py-0.5 rounded-full border border-rd-border bg-rd-bg-card text-[11px] text-rd-text-secondary hover:border-rd-primary hover:text-rd-primary-dark transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            placeholder="What's off? e.g. too generic, doesn't show impact"
            className="w-full text-[12px] rounded-lg border border-rd-border bg-rd-bg-card px-2 py-1.5 focus:outline-none focus:border-rd-primary resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
              className="text-[11.5px] text-rd-text-tertiary hover:text-rd-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                run(null);
              }}
              disabled={!feedback.trim()}
              className="inline-flex items-center gap-1 rounded-full bg-rd-primary text-white text-[11.5px] font-display font-semibold px-2.5 py-1 hover:bg-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-3 h-3" /> Revise
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-rd-primary-dark mt-1.5">{error}</p>
          )}
        </div>
      )}
    </span>
  );
}

// Uncontrolled contentEditable — set once on mount, commit on blur. Keyed by the
// caller (via React key) when the underlying record changes so a CV switch
// re-seeds the text.
function Editable({
  value,
  onCommit,
  className = "",
  placeholder = "",
  block = false,
  readOnly = false,
  hint = "",
}) {
  const ref = useRef(null);
  const Tag = block ? "div" : "span";
  // Seed the contentEditable from `value`, and RE-seed when `value` changes
  // (e.g. the profile-backed headerFallback resolving after this mounts) - but
  // only while the field is not focused, so an in-progress edit is never
  // clobbered. Deps were [] (mount-only), which froze a placeholder in place
  // if the real value arrived async.
  useEffect(() => {
    const el = ref.current;
    if (readOnly || !el) return;
    const next = value || "";
    if (document.activeElement !== el && el.innerText !== next)
      el.innerText = next;
  }, [value, readOnly]);
  // Read-only-from-source (master dates / email): render the value, never
  // contentEditable, with a pointer hint. A would-be edit can't silently no-op
  // here - the exact bug class the write-through arc kills - because there is no
  // editable surface to type into; the hint points at where the value is owned.
  if (readOnly) {
    return (
      <Tag
        title={hint || undefined}
        data-ph={placeholder}
        className={`cv-edit cv-edit-ro ${block ? "cv-edit-block" : ""} ${className}`}
      >
        {value || ""}
      </Tag>
    );
  }
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
  onDelete,
  onRevisePiece,
  sectionKey,
  isMaster = false,
}) {
  return (
    <div className="group/entry relative pl-5 mb-3.5" data-entry-id={exp.id}>
      <button
        {...dragHandleProps}
        aria-label="Drag to reorder"
        className="absolute left-[-6px] top-1 opacity-0 group-hover/entry:opacity-100 text-rd-text-tertiary hover:text-rd-text cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete this experience"
          title="Delete this experience"
          className="absolute right-[-28px] top-0 opacity-0 group-hover/entry:opacity-100 text-rd-text-tertiary hover:text-rd-primary-dark transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
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
          readOnly={isMaster}
          hint={
            isMaster
              ? "Dates come from your profile - edit them in your profile."
              : ""
          }
          className="text-[12px] text-[color:var(--cv-muted)] text-right shrink-0 min-w-[120px]"
          placeholder="Add dates"
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
            <PieceRevise
              onRevise={onRevisePiece}
              target={{
                kind: "bullet",
                section: sectionKey,
                expId: exp.id,
                bulletId: b.id,
              }}
            />
            <button
              onClick={() => onRemoveBullet(b.id)}
              aria-label="Remove bullet"
              className="opacity-0 group-hover/bullet:opacity-100 text-rd-text-tertiary hover:text-rd-primary-dark mt-0.5 transition-opacity"
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
  onDeleteExperience,
  onAddExperience,
  onRevisePiece,
  isMaster = false,
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
                        isMaster={isMaster}
                        onRevisePiece={onRevisePiece}
                        sectionKey={sectionKey}
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
                        onDelete={
                          onDeleteExperience
                            ? () => onDeleteExperience(sectionKey, exp.id)
                            : undefined
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
      {onAddExperience && (
        <button
          onClick={onAddExperience}
          className="mt-1 ml-5 inline-flex items-center gap-1 text-[11.5px] text-rd-text-tertiary hover:text-[color:var(--cv-accent)] transition-colors"
        >
          <Plus className="w-3 h-3" /> Add role
        </button>
      )}
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

// CvMiniature (CV RED Phase 1) - a live read-only miniature of the user's OWN
// CV in a given template, for the Templates picker. A STATIC twin of the
// document: same model, same .cv-* classes + docStyle vars, but NO Editable /
// handlers / DragDropContext - so 4 of these mount light (no contentEditable,
// no dnd contexts) and never steal editing focus. Scaled into a fixed crop
// window (top of the document) via CSS transform; body text is a silhouette,
// not readable copy - resemblance, not a pixel promise (OQ1); the PDF is the
// deliverable. Memoized on (cv ref, template.id): re-renders only on a field
// blur-commit (model gets a new ref), never per keystroke.
const CvMiniature = React.memo(
  /** @param {{ cv: any, template: any }} props */
  function CvMiniature({ cv, template }) {
    const style = {
      "--cv-font": template.font,
      "--cv-accent": template.accent,
      "--cv-ink": "#1A1A1A",
      "--cv-body": "#33312E",
      "--cv-muted": "#8A8782",
      "--cv-label-case": template.labelCase,
    };
    const Label = ({ children }) => (
      <div className="cv-section-label">
        {children}
        <span className="cv-section-rule" />
      </div>
    );
    const contact = [
      cv.header.linkedin,
      cv.header.location,
      cv.header.phone,
    ].filter(Boolean);
    return (
      <div className="cvm-window" aria-hidden="true">
        <div className="cvm-page cv-doc" style={style}>
          <div className="cv-name">{cv.header.name || "Your Name"}</div>
          {cv.header.headline && (
            <div className="cv-headline">{cv.header.headline}</div>
          )}
          <div className="cv-contact">
            {cv.header.email && <span>{cv.header.email}</span>}
            {contact.map((c, i) => (
              <React.Fragment key={i}>
                <span className="cv-dot">·</span>
                <span>{c}</span>
              </React.Fragment>
            ))}
          </div>

          {cv.summary && (
            <>
              <Label>Summary</Label>
              <div className="cv-summary">{cv.summary}</div>
            </>
          )}

          {cv.experiences?.length > 0 && (
            <>
              <Label>Experience</Label>
              {cv.experiences.slice(0, 4).map((exp) => (
                <div key={exp.id} className="pl-5 mb-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-[13.5px] min-w-0">
                      <span className="font-semibold text-[color:var(--cv-ink)]">
                        {exp.title}
                      </span>
                      {exp.org && (
                        <>
                          <span className="text-[color:var(--cv-muted)] px-1">
                            ·
                          </span>
                          <span className="text-[color:var(--cv-ink)]">
                            {exp.org}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[12px] text-[color:var(--cv-muted)] shrink-0">
                      {exp.dates}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {exp.bullets.slice(0, 4).map((b) => (
                      <li
                        key={b.id}
                        className="flex items-start gap-2 text-[12.5px] leading-[1.5] text-[color:var(--cv-body)]"
                      >
                        <span className="cv-bullet-dot" />
                        <span>{b.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}

          {cv.education?.length > 0 && (
            <>
              <Label>Education</Label>
              <div className="space-y-1.5">
                {cv.education.slice(0, 3).map((ed) => (
                  <div
                    key={ed.id}
                    className="flex items-baseline justify-between gap-3 text-[12.5px]"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-[color:var(--cv-ink)]">
                        {ed.institution}
                      </span>
                      {ed.degree && (
                        <>
                          <span className="text-[color:var(--cv-muted)] px-1">
                            ·
                          </span>
                          <span className="text-[color:var(--cv-body)]">
                            {ed.degree}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[12px] text-[color:var(--cv-muted)] shrink-0">
                      {ed.dates}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {cv.skills?.length > 0 && (
            <>
              <Label>Skills</Label>
              <div className="cv-summary">{cv.skills.join(" · ")}</div>
            </>
          )}
        </div>
      </div>
    );
  },
  /** @type {(a: any, b: any) => boolean} */
  (prev, next) => prev.template.id === next.template.id && prev.cv === next.cv,
);

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
        <span className="w-6 h-6 rounded-md bg-rd-primary-tint grid place-items-center shrink-0">
          <FileText className="w-3.5 h-3.5 text-rd-primary" />
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
          {/* Cap the CV list and let it scroll so a long list (many tailored
              copies) can't run past the viewport with items unreachable below
              the fold. The "Tailor for a new job…" footer stays pinned outside
              this scroll area. */}
          <div className="max-h-[min(60vh,320px)] overflow-y-auto cv-scroll">
            {options.map((o) => (
              <div
                key={o.id}
                className={`group/cvopt w-full flex items-center rounded-lg transition-colors ${o.id === value ? "bg-rd-primary-tint/60" : "hover:bg-rd-bg-soft"}`}
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
                    className="hidden group-hover/cvopt:inline-flex items-center justify-center w-11 h-11 mr-1 rounded-md text-rd-text-tertiary hover:text-rd-primary-dark hover:bg-rd-primary-tint shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
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
                <span className="text-[12.5px]">
                  {isNextDesign()
                    ? "Generate for a new job…"
                    : "Tailor for a new job…"}
                </span>
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
  onPatchCert,
  onPatchProject,
  onAddExperience,
  onDeleteExperience,
  onAddEducation,
  onDeleteEducation,
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
  isMaster = false, // master = live view (writes through to profile); tailored = document
  canUndo = false,
  onUndo,
  saveState = "saved",
  onDownload,
  coach,
  chatMessages = [],
  onSendMessage,
  chatBusy = false,
  tailorContext = null, // { role, company } when on master with a pending tailor target
  onTailorContext, // banner CTA → tailor the pending target
  tailoring = false, // the refine-cv select+reword call is running (~16s)
  tailorLabel = "this job",
  tailorResult = null, // { cvId, role, company } — the just-finished tailored CV
  onViewTailored, // outcome card "View it" → load the new CV in the editor
  onDownloadTailored, // outcome card "Download" → re-render the new CV's PDF
  // Flag-on (home CV tab) only. rightRail replaces the CV Agent panel with the
  // matched-roles rail; onRevisePiece enables the per-piece "Revise with AI"
  // affordance on bullets + the summary. Both default null → the /CVAgent
  // surface renders exactly as before (byte-identical).
  rightRail = null,
  onRevisePiece = null,
  // Profile-backed header fallback ({ name, email, linkedin, location, phone }),
  // mirrors the PDF renderHeader cascade so the on-screen preview shows the same
  // real contact data the download carries instead of template placeholders.
  headerFallback = { name: "", email: "", linkedin: "", location: "", phone: "" },
}) {
  // Flag-on gates the Batch-D redesign additions (doc-top unified header, the
  // collapse-to-strip Templates rail). Flag off -> today's pill + always-open
  // rail, byte-identical.
  const alive = isNextDesign();
  const [templatesOpen, setTemplatesOpen] = useState(templatesOpenPref);
  const template = templates.find((t) => t.id === templateId) || templates[0];
  // Template picker list, shared by the flag-off aside and the flag-on
  // expanded rail so there's one definition.
  const templateButtons = (
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
            {/* Flag-on: a live miniature of the user's own CV in this template
                (resemblance, not a pixel promise). Flag off: the generic
                skeleton, byte-identical. */}
            {alive ? (
              <CvMiniature cv={cv} template={t} />
            ) : (
              <TemplateThumb t={t} />
            )}
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
  );
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
          cls: "bg-rd-error-bg text-rd-error",
          dot: "bg-rd-error",
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
      ? "Delete your Master CV? It's the source for your tailored copies - you can regenerate it later."
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
      className={
        rightRail
          ? // Three self-framed lanes on the canvas ground (RULED item 2): the
            // document lane (this + the header band) and the matched-roles lane
            // (below) are separate cards with a gap; the coach lane is the shell
            // sidebar. Flag off keeps the single-surface layout, byte-identical.
            "h-full flex flex-col xl:flex-row bg-rd-bg-page font-body text-rd-text gap-3 p-3 overflow-hidden"
          : "h-full flex flex-col bg-rd-bg-page font-body text-rd-text overflow-hidden"
      }
      style={{ "--cv-accent": template.accent }}
    >
      <CvStudioStyles ruleOn={template.rule} />

      <DocLane framed={!!rightRail}>
        <header className="h-[52px] shrink-0 border-b border-rd-border bg-rd-bg-card flex items-center px-4 gap-3">
          {/* Pure switcher — tailoring is initiated by the dedicated CTA, not from
            inside the CV list. */}
          <CvSelector
            options={cvOptions}
            value={selectedCvId}
            onChange={onSelectCv}
            onDelete={onDeleteCv ? handleDelete : null}
          />
          <div className="flex-1" />
          {isMaster && onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo your last change to your profile"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] text-rd-text-secondary hover:bg-rd-bg-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo
            </button>
          )}
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
              className="w-11 h-11 grid place-items-center rounded-lg text-rd-text-tertiary hover:text-rd-primary-dark hover:bg-rd-primary-tint transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDownload}
            className={
              alive
                ? // Flag-on: rd- palette coral (not the template accent), so the
                  // primary action matches the canvas tokens.
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rd-primary text-white text-[12.5px] font-medium hover:bg-rd-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary-dark/50 transition-colors"
                : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--cv-accent)] text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity"
            }
          >
            {/* Flag-on: the workspace isn't the artifact - name the deliverable. */}
            <Download className="w-3.5 h-3.5" />{" "}
            {alive ? "Download PDF" : "Download"}
          </button>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* Templates. Flag-on: collapses to a ~40px strip (active thumbnail +
            expand chevron), persisted, default expanded. Flag off: the
            always-open aside, byte-identical. */}
          {alive && !templatesOpen ? (
            <aside className="w-11 shrink-0 border-r border-rd-border bg-rd-bg-card/50 flex flex-col items-center gap-2.5 py-3">
              <button
                type="button"
                onClick={() =>
                  setTemplatesOpen(() => {
                    templatesOpenPref = true;
                    return true;
                  })
                }
                aria-label="Expand templates"
                aria-expanded={false}
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-soft transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {/* Active template, designed for the 40px strip: an accent-tinted
                document glyph + the template name as a vertical label - not a
                clipped card. */}
              <button
                type="button"
                onClick={() =>
                  setTemplatesOpen(() => {
                    templatesOpenPref = true;
                    return true;
                  })
                }
                title={`Template: ${template.name}`}
                aria-label={`Template ${template.name} - expand to change`}
                className="flex flex-col items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-rd-bg-soft transition-colors"
              >
                <span
                  className="w-7 h-7 rounded-md grid place-items-center ring-1 ring-[color:var(--cv-accent)]"
                  style={{
                    "--cv-accent": template.accent,
                    background: `color-mix(in srgb, ${template.accent} 14%, var(--rd-bg-card))`,
                  }}
                >
                  <FileText
                    className="w-3.5 h-3.5"
                    style={{ color: template.accent }}
                  />
                </span>
                <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-display font-semibold text-rd-text-secondary tracking-[0.04em]">
                  {template.name}
                </span>
              </button>
            </aside>
          ) : (
            <aside className="w-[216px] shrink-0 border-r border-rd-border bg-rd-bg-card/50 overflow-y-auto cv-scroll">
              <div className="p-4">
                {alive ? (
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-display font-bold uppercase tracking-[0.1em] text-rd-text-eyebrow">
                      Templates
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setTemplatesOpen(() => {
                          templatesOpenPref = false;
                          return false;
                        })
                      }
                      aria-label="Collapse templates"
                      aria-expanded={true}
                      className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-soft transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] font-display font-bold uppercase tracking-[0.1em] text-rd-text-eyebrow mb-3">
                    Templates
                  </p>
                )}
                {templateButtons}
              </div>
            </aside>
          )}

          {/* Document */}
          <main
            className={
              rightRail
                ? // Document lane reads as a distinct WHITE card (RULED item 2):
                  // the lane surface is white, the document sits borderless on it.
                  "flex-1 min-w-0 min-h-0 overflow-y-auto cv-scroll bg-rd-bg-card"
                : "flex-1 min-w-0 overflow-y-auto cv-scroll bg-rd-bg-page"
            }
          >
            {/* Tailoring progress - refine-cv is a single blocking call, so the
              ring runs HONEST-INDETERMINATE (no fake timed stages). It goes
              determinate automatically once the CV lane wires progress emission. */}
            {tailoring && (
              <div className="max-w-[720px] mx-auto mt-3 px-1">
                <div className="bg-rd-primary-tint border border-rd-primary/30 rounded-lg px-3 py-2.5">
                  <CvGenerationProgress
                    compact
                    label={`Tailoring your CV to ${tailorLabel}…`}
                    hint={GENERATION_ETA}
                  />
                </div>
              </div>
            )}
            {/* Outcome state — a deliberate "it's ready" moment with explicit
              View / Download choices, instead of silently switching the view. */}
            {!tailoring && tailorResult && (
              <div className="max-w-[720px] mx-auto mt-3 px-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-rd-teal-tint border border-rd-teal/30 rounded-xl px-4 py-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-rd-teal/20 grid place-items-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-rd-teal-dark" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-display font-bold text-rd-teal-dark leading-tight">
                        Your{tailorResult.role ? ` ${tailorResult.role}` : ""}{" "}
                        CV is ready
                      </p>
                      {tailorResult.company && (
                        <p className="text-[12px] text-rd-teal-dark/80 mt-0.5 truncate">
                          Tailored for {tailorResult.company}
                        </p>
                      )}
                      {tailorResult.fit && (
                        <p className="text-[12px] text-rd-teal-dark/80 mt-1 leading-snug">
                          {tailorResult.fit}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Generation now auto-selects the new row, so by the time this
                      card shows the CV is already rendered below. In that case
                      "View it" was a no-op that just collapsed the card, so label
                      the button "Done" (it dismisses the card); only offer "View
                      it" in the defensive case where the row isn't the current one. */}
                    <button
                      onClick={() => onViewTailored?.(tailorResult.cvId)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rd-teal-dark text-white text-[13px] font-display font-semibold hover:opacity-90 transition-opacity"
                    >
                      {currentCv?.id === tailorResult.cvId ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Done
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" /> View it
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onDownloadTailored?.(tailorResult.cvId)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rd-bg-card border border-rd-teal/40 text-rd-teal-dark text-[13px] font-display font-semibold hover:bg-rd-bg-soft transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="px-5 pt-3">
              <div
                className={
                  alive
                    ? "max-w-[720px] mx-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3 px-1"
                    : "max-w-[720px] mx-auto flex items-center justify-between gap-3 mb-3 px-1"
                }
              >
                {alive ? (
                  // Treatment B (flag-on): a unified contextual header - the
                  // document's identity plus ONE shared "Generate a job-specific
                  // version" doorway (same verb + flow as the rail's Generate CV).
                  // No second quiet pill competing.
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-display font-semibold text-rd-text min-w-0">
                      {currentCv?.role ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-rd-teal-dark shrink-0" />
                          <span className="truncate">
                            Tailored for {currentCv.role}
                            {currentCv.company ? ` · ${currentCv.company}` : ""}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-rd-golden-dark shrink-0" />
                          <span>Master CV · your full CV</span>
                        </>
                      )}
                    </span>
                    {(tailorContext || onTailorNew) && (
                      <button
                        onClick={() =>
                          tailorContext ? onTailorContext?.() : onTailorNew()
                        }
                        disabled={tailoring}
                        className="inline-flex items-center gap-1.5 text-[12px] font-display font-semibold text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-3.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        {tailorContext
                          ? `Tailor for ${tailorContext.role}`
                          : "Tailor to a job"}
                      </button>
                    )}
                  </div>
                ) : currentCv?.role ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-rd-teal-dark bg-rd-teal-tint border border-rd-teal/30 rounded-full px-3 py-1">
                    <Check className="w-3.5 h-3.5" /> Tailored for{" "}
                    {currentCv.role}
                    {currentCv.company ? ` · ${currentCv.company}` : ""}
                  </span>
                ) : tailorContext ? (
                  // Master shown as the base for a pending tailor target: make it
                  // explicit this is the master and offer the tailor CTA.
                  <span className="inline-flex items-center gap-2 text-[12px] text-rd-golden-dark bg-rd-golden-tint border border-rd-golden/40 rounded-full pl-3 pr-1.5 py-1">
                    <Sparkles className="w-3.5 h-3.5" /> This is your master CV
                    <button
                      onClick={() => onTailorContext?.()}
                      disabled={tailoring}
                      className="inline-flex items-center gap-1 rounded-full bg-rd-primary text-white text-[11.5px] font-display font-semibold px-2.5 py-0.5 hover:bg-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Tailor it to {tailorContext.role}
                    </button>
                  </span>
                ) : (
                  // Plain master, no pending target: keep the informational pill but
                  // always offer the soft "Tailor to a job…" CTA (never hidden).
                  <span className="inline-flex items-center gap-2 text-[12px] text-rd-golden-dark bg-rd-golden-tint border border-rd-golden/40 rounded-full pl-3 pr-1.5 py-1">
                    <Sparkles className="w-3.5 h-3.5" /> Master CV
                    {onTailorNew && (
                      <button
                        onClick={() => onTailorNew()}
                        disabled={tailoring}
                        className="inline-flex items-center gap-1 rounded-full bg-rd-bg-card border border-rd-golden/40 text-rd-golden-dark text-[11.5px] font-display font-semibold px-2.5 py-0.5 hover:bg-rd-bg-soft disabled:opacity-50 transition-colors"
                      >
                        Tailor to a job…
                      </button>
                    )}
                  </span>
                )}
                <span className="text-[11.5px] text-rd-text-tertiary shrink-0">
                  {isMaster
                    ? "Click any text to edit · changes save to your profile"
                    : "Click any text to edit · changes stay in this copy"}
                </span>
              </div>
            </div>

            <div className="px-5 pb-16">
              {/* Document surface (RULED item 2). In the three-lane home the
                DOCUMENT LANE itself is the white card, so the document renders
                borderless on it. Flag-on /CVAgent (no lanes): the standalone
                white card on the canvas. Flag off: the paper sheet, byte-identical. */}
              <div
                className={
                  rightRail
                    ? "cv-doc max-w-[720px] mx-auto px-10 py-8"
                    : alive
                      ? "cv-doc max-w-[720px] mx-auto bg-white rounded-xl shadow-rd border border-rd-border px-12 py-11"
                      : "cv-doc max-w-[720px] mx-auto bg-white rounded-[6px] shadow-rd border border-rd-border px-12 py-11"
                }
                style={docStyle}
              >
                <Editable
                  value={cv.header.name || headerFallback.name}
                  onCommit={(v) => onPatchHeader({ name: v })}
                  className="cv-name"
                  block
                  placeholder="Add your name"
                />
                <Editable
                  value={cv.header.headline}
                  onCommit={(v) => onPatchHeader({ headline: v })}
                  className="cv-headline"
                  block
                />
                <div className="cv-contact">
                  <Editable
                    value={cv.header.email || headerFallback.email}
                    onCommit={(v) => onPatchHeader({ email: v })}
                    readOnly={isMaster}
                    hint={
                      isMaster
                        ? "Email comes from your account and can't be edited here."
                        : ""
                    }
                    placeholder="Add email"
                  />
                  <span className="cv-dot">·</span>
                  <Editable
                    value={cv.header.linkedin || headerFallback.linkedin}
                    onCommit={(v) => onPatchHeader({ linkedin: v })}
                    placeholder="Add LinkedIn or portfolio"
                  />
                  <span className="cv-dot">·</span>
                  <Editable
                    value={cv.header.location || headerFallback.location}
                    onCommit={(v) => onPatchHeader({ location: v })}
                    placeholder="Add location"
                  />
                  <span className="cv-dot">·</span>
                  <Editable
                    value={cv.header.phone || headerFallback.phone}
                    onCommit={(v) => onPatchHeader({ phone: v })}
                    placeholder="Add phone"
                  />
                </div>

                <SectionLabel>Summary</SectionLabel>
                {onRevisePiece ? (
                  <div className="group/piece relative flex items-start gap-1.5">
                    <Editable
                      value={cv.summary}
                      onCommit={onPatchSummary}
                      className="cv-summary flex-1"
                      block
                      placeholder="Write a short professional summary…"
                    />
                    <PieceRevise
                      onRevise={onRevisePiece}
                      target={{ kind: "summary" }}
                    />
                  </div>
                ) : (
                  <Editable
                    value={cv.summary}
                    onCommit={onPatchSummary}
                    className="cv-summary"
                    block
                    placeholder="Write a short professional summary…"
                  />
                )}

                <ExperienceSection
                  label="Experience"
                  sectionKey="experiences"
                  items={cv.experiences}
                  isMaster={isMaster}
                  onRevisePiece={onRevisePiece}
                  onDragEnd={onDragEnd}
                  onPatchExp={onPatchExp}
                  onPatchBullet={onPatchBullet}
                  onAddBullet={onAddBullet}
                  onRemoveBullet={onRemoveBullet}
                  onDeleteExperience={onDeleteExperience}
                  onAddExperience={onAddExperience}
                />
                {cv.military?.length > 0 && (
                  <ExperienceSection
                    label="Military Service"
                    sectionKey="military"
                    items={cv.military}
                    isMaster={isMaster}
                    onRevisePiece={onRevisePiece}
                    onDragEnd={onDragEnd}
                    onPatchExp={onPatchExp}
                    onPatchBullet={onPatchBullet}
                    onAddBullet={onAddBullet}
                    onRemoveBullet={onRemoveBullet}
                    onDeleteExperience={onDeleteExperience}
                  />
                )}
                {cv.volunteering?.length > 0 && (
                  <ExperienceSection
                    label="Volunteering"
                    sectionKey="volunteering"
                    items={cv.volunteering}
                    isMaster={isMaster}
                    onRevisePiece={onRevisePiece}
                    onDragEnd={onDragEnd}
                    onPatchExp={onPatchExp}
                    onPatchBullet={onPatchBullet}
                    onAddBullet={onAddBullet}
                    onRemoveBullet={onRemoveBullet}
                    onDeleteExperience={onDeleteExperience}
                  />
                )}
                {cv.leadership?.length > 0 && (
                  <ExperienceSection
                    label="Leadership"
                    sectionKey="leadership"
                    items={cv.leadership}
                    isMaster={isMaster}
                    onRevisePiece={onRevisePiece}
                    onDragEnd={onDragEnd}
                    onPatchExp={onPatchExp}
                    onPatchBullet={onPatchBullet}
                    onAddBullet={onAddBullet}
                    onRemoveBullet={onRemoveBullet}
                    onDeleteExperience={onDeleteExperience}
                  />
                )}

                <SectionLabel>Education</SectionLabel>
                <div className="space-y-1.5">
                  {cv.education.map((ed) => (
                    <div
                      key={ed.id}
                      data-entry-id={ed.id}
                      className="group/edu relative flex items-baseline justify-between gap-3 pr-5"
                    >
                      {onDeleteEducation && (
                        <button
                          onClick={() => onDeleteEducation(ed.id)}
                          aria-label="Delete this education entry"
                          title="Delete this education entry"
                          className="absolute right-[-4px] top-0 opacity-0 group-hover/edu:opacity-100 text-rd-text-tertiary hover:text-rd-primary-dark transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="text-[12.5px] min-w-0">
                        <Editable
                          value={ed.institution}
                          onCommit={(v) =>
                            onPatchEdu(ed.id, { institution: v })
                          }
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
                        readOnly={isMaster}
                        hint={
                          isMaster
                            ? "Dates come from your profile - edit them in your profile."
                            : ""
                        }
                        className="text-[12px] text-[color:var(--cv-muted)] text-right shrink-0 min-w-[80px]"
                        placeholder="Year"
                      />
                    </div>
                  ))}
                </div>
                {onAddEducation && (
                  <button
                    onClick={onAddEducation}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-rd-text-tertiary hover:text-[color:var(--cv-accent)] transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add education entry
                  </button>
                )}

                <SectionLabel>Skills</SectionLabel>
                <Editable
                  value={cv.skills.join(" · ")}
                  onCommit={onPatchSkills}
                  className="cv-summary"
                  block
                  placeholder="Add skills separated by ·"
                />

                {cv.skillsTools?.length > 0 && (
                  <p className="cv-summary">
                    <span className="font-semibold">Tools:</span>{" "}
                    {cv.skillsTools.join(" · ")}
                  </p>
                )}
                {cv.skillsTechnical?.length > 0 && (
                  <p className="cv-summary">
                    <span className="font-semibold">Technical:</span>{" "}
                    {cv.skillsTechnical.join(" · ")}
                  </p>
                )}

                <SectionLabel>Languages</SectionLabel>
                <Editable
                  value={cv.languages.join(" · ")}
                  onCommit={onPatchLanguages}
                  className="cv-summary"
                  block
                  placeholder="Languages"
                />

                {cv.honors?.length > 0 && (
                  <>
                    <SectionLabel>Honors &amp; Awards</SectionLabel>
                    <ul className="cv-summary list-disc pl-4 space-y-0.5">
                      {cv.honors.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </>
                )}
                {cv.certifications?.length > 0 && (
                  <>
                    <SectionLabel>Certifications</SectionLabel>
                    <div className="space-y-0.5">
                      {cv.certifications.map((ct) => (
                        <div
                          key={ct.id}
                          className="cv-summary flex items-baseline gap-1 flex-wrap"
                        >
                          <Editable
                            value={ct.name}
                            onCommit={(v) => onPatchCert(ct.id, { name: v })}
                            className="font-medium text-[color:var(--cv-ink)]"
                            placeholder="Certification"
                          />
                          <span className="text-[color:var(--cv-muted)]">
                            ·
                          </span>
                          <Editable
                            value={ct.issuer}
                            onCommit={(v) => onPatchCert(ct.id, { issuer: v })}
                            placeholder="Issuer"
                          />
                          <Editable
                            value={ct.date}
                            onCommit={(v) => onPatchCert(ct.id, { date: v })}
                            className="text-[color:var(--cv-muted)]"
                            placeholder="Year"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {cv.projects?.length > 0 && (
                  <>
                    <SectionLabel>Projects</SectionLabel>
                    <div className="space-y-1.5">
                      {cv.projects.map((p) => (
                        <div key={p.id} className="text-[12.5px]">
                          <Editable
                            value={p.name}
                            onCommit={(v) => onPatchProject(p.id, { name: v })}
                            className="font-semibold text-[color:var(--cv-ink)]"
                            placeholder="Project"
                          />
                          <span className="text-[color:var(--cv-muted)]">
                            {" "}
                            ·{" "}
                          </span>
                          <Editable
                            value={p.url}
                            onCommit={(v) => onPatchProject(p.id, { url: v })}
                            className="text-[color:var(--cv-muted)]"
                            placeholder="Link"
                          />
                          {p.bullets.length > 0 && (
                            <ul className="cv-summary list-disc pl-4 space-y-0.5 mt-0.5">
                              {p.bullets.map((b, j) => (
                                <li key={j}>
                                  <Editable
                                    value={b}
                                    onCommit={(v) =>
                                      onPatchProject(p.id, {
                                        bullets: p.bullets.map((x, k) =>
                                          k === j ? v : x,
                                        ),
                                      })
                                    }
                                    placeholder="Detail"
                                    block
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </main>

          {/* Flag-on home tab: the matched-roles rail is its OWN framed lane
            (rendered below, outside the document lane), so the document lane has
            no right panel. Flag off: the CV Agent panel, byte-identical. */}
          {rightRail ? null : (
            <aside className="w-[336px] shrink-0 border-l border-rd-border bg-rd-bg-card flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-rd-border flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-rd-primary-tint grid place-items-center">
                  <FileText className="w-3.5 h-3.5 text-rd-primary" />
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
                      Ask me to rewrite a section or tighten your bullets - I
                      edit this document directly. To build a version aimed at a
                      specific job, use Tailor to a job and I&apos;ll author a
                      separate tailored copy from the job description.
                    </p>
                  ))}
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}
                  >
                    {m.role !== "user" && (
                      <div className="w-6 h-6 rounded-full bg-rd-primary-tint grid place-items-center shrink-0 mt-0.5">
                        <FileText className="w-3 h-3 text-rd-primary" />
                      </div>
                    )}
                    <div
                      className={`text-[12.5px] leading-relaxed rounded-[12px] px-3 py-2 max-w-[82%] ${m.role === "user" ? "bg-rd-primary text-white" : "bg-rd-bg-soft text-rd-text-secondary"}`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatBusy && (
                  <div className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-rd-primary-tint grid place-items-center shrink-0 mt-0.5">
                      <FileText className="w-3 h-3 text-rd-primary" />
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
                      // "Tailor to a job" opens the tailoring flow (refine-cv select+
                      // reword), NOT edit-cv - that engine can't tailor. Others stay edit-cv.
                      onClick={() =>
                        c === "Tailor to a job" ? onTailorNew?.() : sendChat(c)
                      }
                      disabled={
                        chatBusy || (c === "Tailor to a job" && tailoring)
                      }
                      className="px-2.5 py-1 rounded-full border border-rd-border bg-rd-bg-card text-[11.5px] text-rd-text-secondary hover:border-rd-primary hover:text-rd-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className="flex-1 h-[38px] px-3 rounded-[12px] border border-rd-border bg-rd-bg-card text-[13px] focus:outline-none focus:border-rd-primary disabled:opacity-60"
                  />
                  <button
                    onClick={() => sendChat()}
                    disabled={chatBusy || !chatInput.trim()}
                    aria-label="Send message"
                    className="w-[38px] h-[38px] rounded-full bg-rd-primary text-white grid place-items-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </DocLane>
      {/* Matched-roles lane: its own framed card on the ground, beside the
          document lane on wide (>=xl) and stacked BELOW it under 1280px (item 3 -
          the document stays the hero). Its "Your matched roles" banner is the
          lane header. */}
      {rightRail && (
        <aside className="w-full xl:w-[336px] shrink-0 max-h-[45vh] xl:max-h-none flex flex-col min-h-0 rd-lift rd-r-lg overflow-hidden">
          {rightRail}
        </aside>
      )}
    </div>
  );
}

// The document lane: header band + templates + document. With a rail present it
// is a self-framed card on the canvas ground (rd-lift, its own header band);
// with no rail (flag off) it is a Fragment so header + body stay direct children
// of the single-surface root and the flag-off layout is byte-identical.
function DocLane({ framed, children }) {
  if (!framed) return <>{children}</>;
  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col rd-lift rd-r-lg overflow-hidden">
      {children}
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
      .cv-edit-ro { cursor: help; }
      .cv-edit-ro:hover { background: transparent; box-shadow: none; text-decoration: underline dotted rgba(0,0,0,.28); text-underline-offset: 3px; }
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
      .cvm-window { position:relative; width:100%; height:116px; overflow:hidden; background:#fff; border-radius:5px; border:1px solid #EAE7E1; }
      .cvm-window:after { content:""; position:absolute; left:0; right:0; bottom:0; height:24px; background:linear-gradient(to top, #fff, rgba(255,255,255,0)); pointer-events:none; }
      .cvm-page { width:720px; padding:44px 48px; transform:scale(0.2333); transform-origin:top left; pointer-events:none; }
      .cv-scroll::-webkit-scrollbar { width: 9px; }
      .cv-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.14); border-radius: 9999px; border: 2px solid transparent; background-clip: content-box; }
      .cv-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,.24); background-clip: content-box; }
    `}</style>
  );
}

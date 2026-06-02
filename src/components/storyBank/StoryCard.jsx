import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Pencil, Loader2, BookText } from "lucide-react";

// PR 3G — restyled on rd-* tokens. Restyle-only on behavior: expand
// state, edit dispatch, two-step delete confirmation, and the
// truncated-preview logic are all unchanged.
//
// StoryCard — one row in the StoryBank list. Collapsed shows title +
// one-line summary + experience link + capture date. Expanded shows the
// full STAR breakdown, metrics, skills, and tools.
//
// One-line summary preview: result if present (more compelling), else
// situation, else nothing. Truncated to ~140 chars.

function previewLine(story) {
  const source = (story.result || story.situation || "").trim();
  if (!source) return null;
  return source.length > 140 ? source.slice(0, 138).trimEnd() + "…" : source;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const RD_BTN_GHOST = "inline-flex items-center gap-1.5 text-[12px] text-rd-text-secondary hover:text-rd-text hover:bg-rd-bg-soft rounded-full px-2.5 py-1.5 transition-colors";
const RD_BTN_DANGER = "inline-flex items-center justify-center gap-1.5 text-[12px] font-display font-semibold text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 rounded-full px-3 py-1.5 transition-colors";

export default function StoryCard({ story, experienceLabel, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const summary = previewLine(story);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(story.id);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <div
      data-story-id={story.id}
      className="rounded-[18px] border border-rd-border bg-rd-bg-card shadow-rd hover:border-rd-border-hover transition-colors"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        data-story-toggle={story.id}
        aria-expanded={expanded}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3.5 cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-[14.5px] text-rd-text leading-[1.3]">
            {story.title || "Untitled story"}
          </p>
          {summary && (
            <p className="text-[12.5px] text-rd-text-secondary mt-1 leading-[1.5]">
              {summary}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap mt-2 text-[11.5px] text-rd-text-tertiary">
            {experienceLabel ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rd-coral-tint text-rd-coral-dark font-display font-semibold text-[11px]">
                <BookText className="w-3 h-3" />
                from {experienceLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rd-bg-soft text-rd-text-tertiary font-display font-semibold text-[11px]">
                general
              </span>
            )}
            <span>Captured {formatDate(story.created_at)}</span>
            {story.source && <span>· {story.source.replace(/_/g, " ")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(story); }}
            className={RD_BTN_GHOST}
            aria-label="Edit story"
            title="Edit story"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                className={RD_BTN_DANGER}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
                className={RD_BTN_GHOST}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              data-story-delete={story.id}
              className={RD_BTN_GHOST}
              aria-label="Delete story"
              title="Delete story"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-rd-text-tertiary mt-1.5" />
            : <ChevronDown className="w-4 h-4 text-rd-text-tertiary mt-1.5" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pt-1 pb-5 border-t border-rd-border-subtle flex flex-col gap-3.5">
          <div className="flex flex-col gap-2.5 mt-3">
            {story.situation && <StarRow label="Situation" value={story.situation} />}
            {story.task && <StarRow label="Task" value={story.task} />}
            {story.action && <StarRow label="Action" value={story.action} />}
            {story.result && <StarRow label="Result" value={story.result} />}
          </div>

          {(story.metrics?.length > 0 || story.skills_demonstrated?.length > 0 || story.tools_used?.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {story.metrics?.map((m, i) => (
                <Tag key={`m-${i}`} kind="metric">{m}</Tag>
              ))}
              {story.skills_demonstrated?.map((s, i) => (
                <Tag key={`s-${i}`} kind="skill">{s}</Tag>
              ))}
              {story.tools_used?.map((t, i) => (
                <Tag key={`t-${i}`} kind="tool">{t}</Tag>
              ))}
            </div>
          )}

          {story.relevance_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {story.relevance_tags.map((r, i) => (
                <Tag key={`r-${i}`} kind="tag">#{r}</Tag>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StarRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-rd-text-eyebrow font-mono">
        {label}
      </span>
      <span className="text-[13px] text-rd-text leading-[1.55] whitespace-pre-wrap">
        {value}
      </span>
    </div>
  );
}

function Tag({ kind, children }) {
  // Mockup-aligned palette: metric = neutral, skill = teal, tool = golden,
  // relevance tag (no kind) = neutral.
  const tone = kind === "skill"
    ? "bg-rd-teal-tint text-rd-teal-dark"
    : kind === "tool"
    ? "bg-rd-golden-tint text-rd-golden-dark"
    : kind === "metric"
    ? "bg-rd-coral-tint text-rd-coral-dark"
    : "bg-rd-bg-soft text-rd-text-secondary";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-display font-semibold ${tone}`}>
      {children}
    </span>
  );
}

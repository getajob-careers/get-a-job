import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Pencil, Loader2, BookText } from "lucide-react";

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
    <div className="p-story-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="p-story-card-row"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <p className="p-story-card-title">{story.title || "Untitled story"}</p>
          {summary && <p className="p-story-card-summary">{summary}</p>}
          <div className="p-story-card-meta">
            {experienceLabel ? (
              <span className="p-story-experience-chip">
                <BookText className="w-3 h-3" />{experienceLabel}
              </span>
            ) : (
              <span className="p-story-experience-chip" data-general="true">General</span>
            )}
            <span>Captured {formatDate(story.created_at)}</span>
            {story.source && <span>· {story.source.replace(/_/g, " ")}</span>}
          </div>
        </div>
        <div className="p-story-card-actions">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(story); }}
            className="p-btn p-btn-ghost p-btn-sm"
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
                className="p-btn p-btn-danger p-btn-sm"
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
                className="p-btn p-btn-ghost p-btn-sm"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              className="p-btn p-btn-ghost p-btn-sm"
              aria-label="Delete story"
              title="Delete story"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-[#9C9DA1] mt-1" />
            : <ChevronDown className="w-4 h-4 text-[#9C9DA1] mt-1" />}
        </div>
      </button>

      {expanded && (
        <div className="p-story-card-body">
          <div className="p-story-card-star">
            {story.situation && (
              <div className="p-story-card-star-row">
                <span className="label">Situation</span>
                <span className="value">{story.situation}</span>
              </div>
            )}
            {story.task && (
              <div className="p-story-card-star-row">
                <span className="label">Task</span>
                <span className="value">{story.task}</span>
              </div>
            )}
            {story.action && (
              <div className="p-story-card-star-row">
                <span className="label">Action</span>
                <span className="value">{story.action}</span>
              </div>
            )}
            {story.result && (
              <div className="p-story-card-star-row">
                <span className="label">Result</span>
                <span className="value">{story.result}</span>
              </div>
            )}
          </div>

          {(story.metrics?.length > 0 || story.skills_demonstrated?.length > 0 || story.tools_used?.length > 0) && (
            <div className="p-story-card-tags">
              {story.metrics?.map((m, i) => (
                <span key={`m-${i}`} className="p-story-card-tag" data-kind="metric">{m}</span>
              ))}
              {story.skills_demonstrated?.map((s, i) => (
                <span key={`s-${i}`} className="p-story-card-tag" data-kind="skill">{s}</span>
              ))}
              {story.tools_used?.map((t, i) => (
                <span key={`t-${i}`} className="p-story-card-tag" data-kind="tool">{t}</span>
              ))}
            </div>
          )}

          {story.relevance_tags?.length > 0 && (
            <div className="p-story-card-tags">
              {story.relevance_tags.map((r, i) => (
                <span key={`r-${i}`} className="p-story-card-tag">#{r}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

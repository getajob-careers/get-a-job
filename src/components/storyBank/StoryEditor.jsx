import React, { useState, useEffect } from "react";
import { Loader2, X, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// PR 3G — restyled on rd-* tokens. Restyle-only: handleSave behaviour,
// title-required validation, comma-split for array fields, and the
// onSave / onClose contracts are all unchanged.
//
// StoryEditor — modal for editing an EXISTING story. Direct field edits
// (no AI re-extraction), commits via the parent's onSave handler which
// runs an UPDATE.
//
// Companion to StorySaveCard, which handles the CREATE flow (paste text
// → AI extraction → confirm). Different shapes warrant different
// components: create needs the extraction step, edit doesn't.
//
// Array fields (metrics / skills / tools / tags) edit as comma-separated
// text and split on save.

const STAR_FIELDS = [
  ["situation", "Situation"],
  ["task",      "Task"],
  ["action",    "Action"],
  ["result",    "Result"],
];

const ARRAY_FIELDS = [
  ["metrics",             "Metrics"],
  ["skills_demonstrated", "Skills"],
  ["tools_used",          "Tools"],
  ["relevance_tags",      "Tags"],
];

const RD_LABEL       = "block text-[11px] font-display font-semibold text-rd-text mb-1.5";
const RD_INPUT       = "w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-tertiary outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]";
const RD_BTN_PRIMARY = "inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-4 py-2.5 transition-colors";
const RD_BTN_GHOST   = "inline-flex items-center gap-1.5 text-[12px] text-rd-text-secondary hover:text-rd-text hover:bg-rd-bg-soft rounded-full px-3 py-1.5 transition-colors";

export default function StoryEditor({ story, experienceLabel, open, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({
    title: story?.title || "",
    situation: story?.situation || "",
    task: story?.task || "",
    action: story?.action || "",
    result: story?.result || "",
    metrics: (story?.metrics || []).join(", "),
    skills_demonstrated: (story?.skills_demonstrated || []).join(", "),
    tools_used: (story?.tools_used || []).join(", "),
    relevance_tags: (story?.relevance_tags || []).join(", "),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Reset draft when a different story comes in (modal re-open).
  useEffect(() => {
    if (!story) return;
    setDraft({
      title: story.title || "",
      situation: story.situation || "",
      task: story.task || "",
      action: story.action || "",
      result: story.result || "",
      metrics: (story.metrics || []).join(", "),
      skills_demonstrated: (story.skills_demonstrated || []).join(", "),
      tools_used: (story.tools_used || []).join(", "),
      relevance_tags: (story.relevance_tags || []).join(", "),
    });
    setError(null);
  }, [story]);

  if (!story) return null;

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const patch = {
      title: draft.title.trim(),
      situation: draft.situation.trim() || null,
      task: draft.task.trim() || null,
      action: draft.action.trim() || null,
      result: draft.result.trim() || null,
      metrics: draft.metrics.split(",").map((s) => s.trim()).filter(Boolean),
      skills_demonstrated: draft.skills_demonstrated.split(",").map((s) => s.trim()).filter(Boolean),
      tools_used: draft.tools_used.split(",").map((s) => s.trim()).filter(Boolean),
      relevance_tags: draft.relevance_tags.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const ok = await onSave(story.id, patch);
    setSaving(false);
    if (!ok) {
      setError("Save failed. Please try again.");
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-rd-bg-card border border-rd-border rounded-[18px]">
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-[18px] text-rd-text flex items-center gap-2">
            <Pencil className="w-4 h-4 text-rd-coral" />
            Edit story
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 pt-2">
          {experienceLabel && (
            <p className="text-[11.5px] text-rd-text-secondary">
              Linked to: <span className="font-display font-semibold text-rd-text">{experienceLabel}</span>
            </p>
          )}

          <div>
            <label className={RD_LABEL}>Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className={RD_INPUT}
              placeholder="Short, scannable title"
            />
          </div>

          {STAR_FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className={RD_LABEL}>{label}</label>
              <textarea
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                rows={2}
                className={`${RD_INPUT} resize-y min-h-[60px]`}
                placeholder={`Add ${label.toLowerCase()}…`}
              />
            </div>
          ))}

          {ARRAY_FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className={RD_LABEL}>
                {label}{" "}
                <span className="text-rd-text-tertiary font-normal normal-case tracking-normal">
                  (comma-separated)
                </span>
              </label>
              <input
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                className={RD_INPUT}
                placeholder="value, value, value"
              />
            </div>
          ))}

          {error && (
            <p className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.55] bg-rd-coral-tint border border-rd-coral/30 text-rd-coral-dark">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={RD_BTN_GHOST}
              disabled={saving}
            >
              <X className="w-3.5 h-3.5" />Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={RD_BTN_PRIMARY}
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

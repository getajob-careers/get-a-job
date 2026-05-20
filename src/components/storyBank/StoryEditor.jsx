import React, { useState, useEffect } from "react";
import { Loader2, X, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[#DDDDDB]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Pencil className="w-4 h-4 text-[#6B4FBF]" />
            Edit story
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 pt-2">
          {experienceLabel && (
            <p className="text-[11px] text-[#52545A]">
              Linked to: <span className="font-medium">{experienceLabel}</span>
            </p>
          )}

          <div>
            <label className="p-label">Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="p-input"
              placeholder="Short, scannable title"
            />
          </div>

          {STAR_FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className="p-label">{label}</label>
              <textarea
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                rows={2}
                className="p-input"
                style={{ resize: "vertical", minHeight: 60 }}
                placeholder={`Add ${label.toLowerCase()}…`}
              />
            </div>
          ))}

          {ARRAY_FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className="p-label">{label} <span className="text-[#9C9DA1] font-normal normal-case tracking-normal">(comma-separated)</span></label>
              <input
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                className="p-input"
                placeholder="value, value, value"
              />
            </div>
          ))}

          {error && (
            <p className="p-banner p-banner-warning">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="p-btn p-btn-ghost" disabled={saving}>
              <X className="w-3.5 h-3.5" />Cancel
            </button>
            <button onClick={handleSave} className="p-btn p-btn-primary" disabled={saving}>
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

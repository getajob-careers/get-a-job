import React, { useState } from "react";
import { Loader2, BookText, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

// StorySaveCard — Wk 2 Day 3. Two-stage capture flow:
//   1. REVIEW   — agent's captured text in an editable textarea + experience
//                 chip; user clicks Extract & preview.
//   2. EXTRACTING — calls extract-story-from-text via parent's onExtract.
//   3. PREVIEW  — STAR fields + tag arrays editable; extraction_notes shown
//                 italic so the user understands the anti-fabrication
//                 discipline (which fields were left blank and why).
//   4. SAVING   — parent's onSave inserts to stories.
//   5. SAVED    — success state.
//
// The two-stage split is the design's safety mechanism: the agent's verbatim
// capture is one thing the user can correct; the LLM's STAR extraction is a
// second thing they can correct; only after both confirms does the row land
// in the DB.

const PHASE = {
  REVIEW: "review",
  EXTRACTING: "extracting",
  PREVIEW: "preview",
  SAVING: "saving",
  SAVED: "saved",
};

const STAR_FIELDS = [
  ["situation", "Situation"],
  ["task", "Task"],
  ["action", "Action"],
  ["result", "Result"],
];

const ARRAY_FIELDS = [
  ["metrics", "Metrics"],
  ["skills_demonstrated", "Skills"],
  ["tools_used", "Tools"],
  ["relevance_tags", "Tags"],
];

export default function StorySaveCard({
  capture,            // { text, experience_id, framing } from ai-chat suggested_story_capture
  experienceLabel,    // "Role at Company" if experience_id resolves; null otherwise
  onExtract,          // async (text) => { story, extraction_notes } | null
  onSave,             // async (editedStory, capture) => boolean
}) {
  const [phase, setPhase] = useState(PHASE.REVIEW);
  const [text, setText] = useState(capture?.text || "");
  const [extractError, setExtractError] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [story, setStory] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const handleExtract = async () => {
    setExtractError(null);
    if (!text.trim()) {
      setExtractError("Add some text before extracting.");
      return;
    }
    setPhase(PHASE.EXTRACTING);
    const result = await onExtract(text);
    if (!result || !result.story) {
      setExtractError("Extraction failed. Please try again.");
      setPhase(PHASE.REVIEW);
      return;
    }
    setExtracted(result);
    // Deep-clone arrays so user edits don't mutate the response object.
    setStory({
      ...result.story,
      metrics: [...(result.story.metrics || [])],
      skills_demonstrated: [...(result.story.skills_demonstrated || [])],
      tools_used: [...(result.story.tools_used || [])],
      relevance_tags: [...(result.story.relevance_tags || [])],
    });
    setPhase(PHASE.PREVIEW);
  };

  const handleSave = async () => {
    if (!story?.title?.trim()) {
      setSaveError("Title is required.");
      return;
    }
    setSaveError(null);
    setPhase(PHASE.SAVING);
    const ok = await onSave(story, capture);
    if (ok) {
      setPhase(PHASE.SAVED);
    } else {
      setSaveError("Save failed. Please try again.");
      setPhase(PHASE.PREVIEW);
    }
  };

  // PR 3K — migrated from violet hex (#E7E0F5 / #C2B0E0 / #4E36A0 /
  // #6B4FBF) to rd-primary + warm white-card surface. The "story = distinct
  // concept" was a Direction-3 era differentiation; in the rd system the
  // distinctiveness comes from the BookText icon + slab heading + warm
  // shadow, not from a separate hue.
  //
  // Cross-page constraint: this component is ALSO rendered inside the
  // StoryBank quick-add Dialog (StoryBank.jsx:428). The white-card
  // treatment reads cleanly in both contexts.

  // SAVED — success badge, persistent
  if (phase === PHASE.SAVED) {
    return (
      <div className="ml-10 mt-2 bg-rd-teal-tint border border-rd-teal/30 rounded-[14px] p-4 max-w-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-rd-teal-dark" />
          <p className="text-xs font-display font-bold text-rd-teal-dark">Story saved to your Story Bank</p>
        </div>
        {story?.title && (
          <p className="text-[11px] text-rd-teal-dark mt-1">{story.title}</p>
        )}
      </div>
    );
  }

  // PREVIEW / SAVING — editable STAR fields + arrays
  if (phase === PHASE.PREVIEW || phase === PHASE.SAVING) {
    return (
      <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
        <div className="flex items-center gap-2 mb-2">
          <BookText className="w-3.5 h-3.5 text-rd-primary" />
          <p className="text-[13.5px] font-display font-bold text-rd-text">Review extracted story</p>
        </div>

        {extracted?.extraction_notes && (
          <p className="text-[11px] italic text-rd-text-secondary mb-3">{extracted.extraction_notes}</p>
        )}

        <div className="space-y-2 mb-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-0.5">Title</label>
            <Input
              value={story.title || ""}
              onChange={(e) => setStory({ ...story, title: e.target.value })}
              className="text-xs h-8 border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text"
            />
          </div>

          {STAR_FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className="block text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-0.5">
                {label}
                {!story[key] && (
                  <span className="text-rd-text-tertiary normal-case font-normal tracking-normal"> · left blank by extractor</span>
                )}
              </label>
              <Textarea
                value={story[key] || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setStory({ ...story, [key]: v.trim() ? v : null });
                }}
                rows={2}
                className="text-xs resize-none border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text"
                placeholder={`Add ${label.toLowerCase()}…`}
              />
            </div>
          ))}

          {ARRAY_FIELDS.map(([key, label]) => (
            <div key={key}>
              <label className="block text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-0.5">{label}</label>
              <Input
                value={(story[key] || []).join(", ")}
                onChange={(e) =>
                  setStory({
                    ...story,
                    [key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="comma, separated"
                className="text-xs h-8 border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text"
              />
            </div>
          ))}
        </div>

        {saveError && (
          <p className="text-[11px] text-rd-primary-dark bg-rd-primary-tint border border-rd-primary/30 rounded-[8px] px-2 py-1 mb-2">{saveError}</p>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={phase === PHASE.SAVING}
            className="h-8 text-xs bg-rd-primary hover:bg-rd-primary-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
          >
            {phase === PHASE.SAVING ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
            ) : (
              <>Save to Story Bank</>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPhase(PHASE.REVIEW)}
            className="h-8 text-xs text-rd-text-secondary hover:text-rd-text rounded-full gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to text
          </Button>
        </div>
      </div>
    );
  }

  // REVIEW (default) — editable text + Extract button
  return (
    <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
      <div className="flex items-center gap-2 mb-2">
        <BookText className="w-3.5 h-3.5 text-rd-primary" />
        <p className="text-[13.5px] font-display font-bold text-rd-text">
          {capture?.framing || "Save this to your Story Bank?"}
        </p>
      </div>

      {experienceLabel && (
        <p className="text-[11px] text-rd-text-secondary mb-2">
          → Linked to: <strong className="font-display font-semibold text-rd-text">{experienceLabel}</strong>
        </p>
      )}

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="text-xs resize-none mb-2 bg-rd-bg-card border border-rd-border rounded-[10px] text-rd-text focus-visible:border-rd-primary focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_var(--rd-primary-tint)]"
      />

      {extractError && (
        <p className="text-[11px] text-rd-primary-dark bg-rd-primary-tint border border-rd-primary/30 rounded-[8px] px-2 py-1 mb-2">{extractError}</p>
      )}

      <Button
        size="sm"
        onClick={handleExtract}
        disabled={phase === PHASE.EXTRACTING}
        className="h-8 text-xs bg-rd-primary hover:bg-rd-primary-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
      >
        {phase === PHASE.EXTRACTING ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Extracting…</>
        ) : (
          <>Extract & preview</>
        )}
      </Button>
    </div>
  );
}

import React, { useState } from "react";
import {
  Loader2,
  ListChecks,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// BulletSaveCard — Phase 1b. The chat-capture card for experience bullets,
// the bullet-writer counterpart of StorySaveCard (which stays in StoryBank).
// Flow:
//   1. REVIEW     — agent's verbatim text (editable) + an EXPERIENCE PICKER
//                   pre-selected to the agent's best-guess experience_id; the
//                   user confirms/changes the target. Draft is disabled until
//                   an experience is chosen.
//   2. EXTRACTING — calls extract-experience-bullets via onExtract(text, expId).
//   3. PREVIEW    — proposed STAR bullets (editable / removable) + the
//                   anti-fab extraction_notes; user confirms.
//   4. SAVING     — onSave appends to experiences.bullets (snapshotting prior).
//   5. SAVED      — "Added to {experience}" with a persistent UNDO that
//                   restores the snapshot.
//
// A saved bullet lands in the Profile experience ONLY — it does NOT flow into
// the CV / LinkedIn / internship / daily-action output yet (Phase 4), which is
// why there is no post-save CV-regen offer here.

const PHASE = {
  REVIEW: "review",
  EXTRACTING: "extracting",
  PREVIEW: "preview",
  SAVING: "saving",
  SAVED: "saved",
};

export default function BulletSaveCard({
  capture, // { text, experience_id, framing }
  experiences = [], // [{ id, title, company }]
  onExtract, // async (text, experienceId) => { bullets, skills, extraction_notes } | null
  onSave, // async ({ bullets, skills, experienceId }) => { ok, snapshot } | { error }
  onUndo, // async ({ snapshot, experienceId }) => boolean
}) {
  const [phase, setPhase] = useState(PHASE.REVIEW);
  const [text, setText] = useState(capture?.text || "");
  const [experienceId, setExperienceId] = useState(
    capture?.experience_id || "",
  );
  const [extractError, setExtractError] = useState(null);
  const [notes, setNotes] = useState("");
  const [bullets, setBullets] = useState([]);
  const [skills, setSkills] = useState([]);
  const [saveError, setSaveError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);

  const expLabel = (id) => {
    const e = experiences.find((x) => x.id === id);
    return e
      ? `${e.title || "(untitled)"}${e.company ? ` at ${e.company}` : ""}`
      : null;
  };

  const handleExtract = async () => {
    setExtractError(null);
    if (!text.trim()) return setExtractError("Add some text first.");
    if (!experienceId)
      return setExtractError("Pick which experience this belongs to.");
    setPhase(PHASE.EXTRACTING);
    const res = await onExtract(text, experienceId);
    if (!res || !Array.isArray(res.bullets) || res.bullets.length === 0) {
      setExtractError(
        "Couldn't draft a bullet from that — add a concrete detail and retry.",
      );
      setPhase(PHASE.REVIEW);
      return;
    }
    setBullets([...res.bullets]);
    setSkills(Array.isArray(res.skills) ? res.skills : []);
    setNotes(res.extraction_notes || "");
    setPhase(PHASE.PREVIEW);
  };

  const handleSave = async () => {
    const cleaned = bullets.map((b) => b.trim()).filter(Boolean);
    if (cleaned.length === 0) return setSaveError("Add at least one bullet.");
    if (!experienceId) return setSaveError("Pick an experience.");
    setSaveError(null);
    setPhase(PHASE.SAVING);
    const res = await onSave({ bullets: cleaned, skills, experienceId });
    if (!res?.ok) {
      setSaveError(res?.error || "Save failed. Please try again.");
      setPhase(PHASE.PREVIEW);
      return;
    }
    setSnapshot(res.snapshot || null);
    setSavedCount(cleaned.length);
    setPhase(PHASE.SAVED);
  };

  const handleUndo = async () => {
    if (!snapshot) return;
    setUndoing(true);
    const ok = await onUndo({ snapshot, experienceId });
    setUndoing(false);
    if (ok) setUndone(true);
  };

  // SAVED — success + persistent Undo
  if (phase === PHASE.SAVED) {
    return (
      <div className="ml-10 mt-2 bg-rd-teal-tint border border-rd-teal/30 rounded-[14px] p-4 max-w-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-rd-teal-dark" />
          <p className="text-xs font-display font-bold text-rd-teal-dark">
            {undone
              ? "Undone — bullets removed"
              : `Added ${savedCount} bullet${savedCount === 1 ? "" : "s"} to ${expLabel(experienceId) || "your experience"}`}
          </p>
        </div>
        {!undone && snapshot && (
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoing}
            className="inline-flex items-center gap-1 mt-2 text-[11px] font-display font-semibold text-rd-teal-dark hover:text-rd-text transition-colors disabled:opacity-60"
          >
            {undoing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Undoing…
              </>
            ) : (
              <>
                <RotateCcw className="w-3 h-3" /> Undo
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // PREVIEW / SAVING — editable bullet lines
  if (phase === PHASE.PREVIEW || phase === PHASE.SAVING) {
    return (
      <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-3.5 h-3.5 text-rd-coral" />
          <p className="text-[13.5px] font-display font-bold text-rd-text">
            Review bullets for {expLabel(experienceId) || "your experience"}
          </p>
        </div>
        {notes && (
          <p className="text-[11px] italic text-rd-text-secondary mb-2.5">
            {notes}
          </p>
        )}

        <div className="flex flex-col gap-1.5 mb-2">
          {bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <Textarea
                value={b}
                onChange={(e) =>
                  setBullets((d) =>
                    d.map((x, idx) => (idx === i ? e.target.value : x)),
                  )
                }
                rows={2}
                className="text-xs resize-y border-rd-border rounded-[10px] bg-rd-bg-card text-rd-text"
              />
              <button
                type="button"
                onClick={() =>
                  setBullets((d) => d.filter((_, idx) => idx !== i))
                }
                aria-label="Remove bullet"
                className="p-0.5 mt-1 text-rd-text-tertiary hover:text-rd-coral flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setBullets((d) => [...d, ""])}
            className="inline-flex items-center gap-1 text-[11px] font-display font-semibold text-rd-text-secondary hover:text-rd-text self-start"
          >
            <Plus className="w-3 h-3" /> Add bullet
          </button>
        </div>

        {saveError && (
          <p className="text-[11px] text-rd-coral-dark bg-rd-coral-tint border border-rd-coral/30 rounded-[8px] px-2 py-1 mb-2">
            {saveError}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={phase === PHASE.SAVING}
            className="h-8 text-xs bg-rd-coral hover:bg-rd-coral-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
          >
            {phase === PHASE.SAVING ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </>
            ) : (
              <>
                Add to{" "}
                {expLabel(experienceId)?.split(" at ")[0] || "experience"}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPhase(PHASE.REVIEW)}
            className="h-8 text-xs text-rd-text-secondary hover:text-rd-text rounded-full gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </Button>
        </div>
      </div>
    );
  }

  // REVIEW (default) — text + experience picker
  if (experiences.length === 0) {
    return (
      <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
        <p className="text-[12.5px] text-rd-text-secondary">
          Add an experience under Profile → Experience first, then I can save
          bullets to it.
        </p>
      </div>
    );
  }

  return (
    <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
      <div className="flex items-center gap-2 mb-2">
        <ListChecks className="w-3.5 h-3.5 text-rd-coral" />
        <p className="text-[13.5px] font-display font-bold text-rd-text">
          {capture?.framing || "Save this as a bullet?"}
        </p>
      </div>

      <label className="block text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-0.5">
        Experience
      </label>
      <select
        value={experienceId}
        onChange={(e) => setExperienceId(e.target.value)}
        className="w-full mb-2 bg-rd-bg-card border border-rd-border rounded-[10px] px-2.5 py-1.5 text-xs text-rd-text focus:outline-none focus:border-rd-coral"
      >
        <option value="">Choose an experience…</option>
        {experiences.map((e) => (
          <option key={e.id} value={e.id}>
            {e.title || "(untitled)"}
            {e.company ? ` at ${e.company}` : ""}
          </option>
        ))}
      </select>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="text-xs resize-none mb-2 bg-rd-bg-card border border-rd-border rounded-[10px] text-rd-text focus-visible:border-rd-coral focus-visible:ring-0"
      />

      {extractError && (
        <p className="text-[11px] text-rd-coral-dark bg-rd-coral-tint border border-rd-coral/30 rounded-[8px] px-2 py-1 mb-2">
          {extractError}
        </p>
      )}

      <Button
        size="sm"
        onClick={handleExtract}
        disabled={phase === PHASE.EXTRACTING}
        className="h-8 text-xs bg-rd-coral hover:bg-rd-coral-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
      >
        {phase === PHASE.EXTRACTING ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" /> Drafting…
          </>
        ) : (
          <>Draft bullets</>
        )}
      </Button>
    </div>
  );
}

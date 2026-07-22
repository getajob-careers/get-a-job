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

// BulletSaveCard — the chat-capture card for bullets on an experience OR an
// education entry (Story Bank → experiences/education). The bullet-writer
// counterpart of StorySaveCard (which stays in StoryBank). Flow:
//   1. REVIEW     — agent's verbatim text (editable) + a TARGET PICKER spanning
//                   Experiences + Education, pre-selected to the agent's
//                   best-guess target. Draft is disabled until a target is set.
//   2. EXTRACTING — calls extract-bullets via onExtract(text, targetType, targetId).
//   3. PREVIEW    — proposed STAR bullets (editable / removable) + extraction_notes.
//   4. SAVING     — onSave appends to the entry's bullets (snapshotting prior).
//   5. SAVED      — "Added to {entry}" with a persistent UNDO that restores it.
//
// A saved bullet lands in the user's Profile entry and is read by CV generation
// (experience bullets now flow into the tailored CV per PR #377 / #378). On the
// post-save follow-up turn the agent acknowledges the save verbally, noting the
// bullet will be available for future CV generations. There is no clickable
// regen card here, and LinkedIn / internship / daily actions still do not read
// bullets.

const PHASE = {
  REVIEW: "review",
  EXTRACTING: "extracting",
  PREVIEW: "preview",
  SAVING: "saving",
  SAVED: "saved",
};

const eduLabel = (e) => {
  const head = e.degree_type || e.field_of_study || "Studies";
  const field =
    e.field_of_study && e.degree_type ? ` in ${e.field_of_study}` : "";
  const at = e.institution ? ` at ${e.institution}` : "";
  return `${head}${field}${at}`;
};

export default function BulletSaveCard({
  capture, // { text, target: { type, id } | null, framing }
  experiences = [], // [{ id, title, company }]
  educations = [], // [{ id, degree_type, field_of_study, institution }]
  onExtract, // async (text, targetType, targetId) => { bullets, skills, extraction_notes } | null
  onSave, // async ({ bullets, skills, targetType, targetId }) => { ok, snapshot } | { error }
  onUndo, // async ({ snapshot, targetType, targetId }) => boolean
}) {
  const [phase, setPhase] = useState(PHASE.REVIEW);
  const [text, setText] = useState(capture?.text || "");
  // The picker value encodes "type:id"; targetType / targetId derive from it.
  const [selected, setSelected] = useState(
    capture?.target?.type && capture?.target?.id
      ? `${capture.target.type}:${capture.target.id}`
      : "",
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

  const colon = selected.indexOf(":");
  const targetType = colon > 0 ? selected.slice(0, colon) : "";
  const targetId = colon > 0 ? selected.slice(colon + 1) : "";

  const labelFor = (type, id) => {
    if (type === "experience") {
      const e = experiences.find((x) => x.id === id);
      return e
        ? `${e.title || "(untitled)"}${e.company ? ` at ${e.company}` : ""}`
        : null;
    }
    if (type === "education") {
      const e = educations.find((x) => x.id === id);
      return e ? eduLabel(e) : null;
    }
    return null;
  };

  const handleExtract = async () => {
    setExtractError(null);
    if (!text.trim()) return setExtractError("Add some text first.");
    if (!targetType || !targetId)
      return setExtractError("Pick which entry this belongs to.");
    setPhase(PHASE.EXTRACTING);
    const res = await onExtract(text, targetType, targetId);
    if (!res || !Array.isArray(res.bullets) || res.bullets.length === 0) {
      setExtractError(
        "Couldn't draft a bullet from that - add a concrete detail and retry.",
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
    if (!targetType || !targetId) return setSaveError("Pick an entry.");
    setSaveError(null);
    setPhase(PHASE.SAVING);
    const res = await onSave({
      bullets: cleaned,
      skills,
      targetType,
      targetId,
    });
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
    const ok = await onUndo({ snapshot, targetType, targetId });
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
              ? "Undone - bullets removed"
              : `Added ${savedCount} bullet${savedCount === 1 ? "" : "s"} to ${labelFor(targetType, targetId) || "your entry"}`}
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
          <ListChecks className="w-3.5 h-3.5 text-rd-primary" />
          <p className="text-[13.5px] font-display font-bold text-rd-text">
            Review bullets for {labelFor(targetType, targetId) || "your entry"}
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
                className="p-0.5 mt-1 text-rd-text-tertiary hover:text-rd-primary flex-shrink-0"
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
          <p className="text-[11px] text-rd-primary-dark bg-rd-primary-tint border border-rd-primary/30 rounded-[8px] px-2 py-1 mb-2">
            {saveError}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={phase === PHASE.SAVING}
            className="h-8 text-xs bg-rd-primary hover:bg-rd-primary-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
          >
            {phase === PHASE.SAVING ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </>
            ) : (
              <>
                Add to{" "}
                {labelFor(targetType, targetId)?.split(" at ")[0] || "entry"}
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

  // REVIEW (default) — text + target picker (Experiences + Education)
  if (experiences.length === 0 && educations.length === 0) {
    return (
      <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
        <p className="text-[12.5px] text-rd-text-secondary">
          Add an experience or an education entry under Profile first, then I
          can save bullets to it.
        </p>
      </div>
    );
  }

  return (
    <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
      <div className="flex items-center gap-2 mb-2">
        <ListChecks className="w-3.5 h-3.5 text-rd-primary" />
        <p className="text-[13.5px] font-display font-bold text-rd-text">
          {capture?.framing || "Save this as a bullet?"}
        </p>
      </div>

      <label className="block text-[10px] uppercase tracking-[0.09em] font-mono font-medium text-rd-text-eyebrow mb-0.5">
        Where it belongs
      </label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full mb-2 bg-rd-bg-card border border-rd-border rounded-[10px] px-2.5 py-1.5 text-xs text-rd-text focus:outline-none focus:border-rd-primary"
      >
        <option value="">Choose where this belongs…</option>
        {experiences.length > 0 && (
          <optgroup label="Experience">
            {experiences.map((e) => (
              <option key={`experience:${e.id}`} value={`experience:${e.id}`}>
                {e.title || "(untitled)"}
                {e.company ? ` at ${e.company}` : ""}
              </option>
            ))}
          </optgroup>
        )}
        {educations.length > 0 && (
          <optgroup label="Education">
            {educations.map((e) => (
              <option key={`education:${e.id}`} value={`education:${e.id}`}>
                {eduLabel(e)}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="text-xs resize-none mb-2 bg-rd-bg-card border border-rd-border rounded-[10px] text-rd-text focus-visible:border-rd-primary focus-visible:ring-0"
      />

      {extractError && (
        <p className="text-[11px] text-rd-primary-dark bg-rd-primary-tint border border-rd-primary/30 rounded-[8px] px-2 py-1 mb-2">
          {extractError}
        </p>
      )}

      <Button
        size="sm"
        onClick={handleExtract}
        disabled={phase === PHASE.EXTRACTING}
        className="h-8 text-xs bg-rd-primary hover:bg-rd-primary-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
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

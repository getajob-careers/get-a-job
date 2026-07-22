import React, { useState } from "react";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// AddSkillCard — confirm-before-persist card for the add-skill-to-
// experience capability (the second of the two ADD-ONLY profile writes).
// Shows EXACTLY what will be written — "Add [skill] to your [experience]
// experience" — and persists nothing until the user taps the button.
//
// Mirrors StorySaveCard's contract: a pure presentational component that
// takes an async onConfirm and renders idle / saving / saved / error
// states. The actual write goes through the centralized
// applyAddSkillToExperience handler (src/lib/coachActionHandlers.js),
// wired identically from every agent surface.

const PHASE = { IDLE: "idle", SAVING: "saving", SAVED: "saved" };

export default function AddSkillCard({
  skill, // the exact skill string the user stated
  experienceLabel, // "Role at Company" resolved from experience_id
  onConfirm, // async () => { ok, alreadyPresent?, experienceLabel? } | { error }
}) {
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [error, setError] = useState(null);
  const [savedNote, setSavedNote] = useState(null);

  const handleConfirm = async () => {
    setError(null);
    setPhase(PHASE.SAVING);
    const res = await onConfirm();
    if (res?.error) {
      setError(res.error);
      setPhase(PHASE.IDLE);
      return;
    }
    setSavedNote(res?.alreadyPresent ? "Already on that experience" : null);
    setPhase(PHASE.SAVED);
  };

  if (phase === PHASE.SAVED) {
    return (
      <div className="ml-10 mt-2 bg-rd-teal-tint border border-rd-teal/30 rounded-[14px] p-4 max-w-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-rd-teal-dark" />
          <p className="text-xs font-display font-bold text-rd-teal-dark">
            {savedNote || `Added “${skill}” to your profile`}
          </p>
        </div>
        {experienceLabel && (
          <p className="text-[11px] text-rd-teal-dark mt-1">
            {experienceLabel}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="ml-10 mt-2 bg-rd-bg-card border border-rd-border rounded-[14px] p-4 max-w-xl shadow-rd">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-rd-primary" />
        <p className="text-[13.5px] font-display font-bold text-rd-text">
          Add a skill to your profile?
        </p>
      </div>

      <p className="text-xs text-rd-text-secondary mb-3 leading-snug">
        Add{" "}
        <strong className="font-display font-semibold text-rd-text">
          {skill}
        </strong>{" "}
        to your{" "}
        <strong className="font-display font-semibold text-rd-text">
          {experienceLabel || "experience"}
        </strong>{" "}
        experience.
      </p>

      {error && (
        <p className="text-[11px] text-rd-primary-dark bg-rd-primary-tint border border-rd-primary/30 rounded-[8px] px-2 py-1 mb-2">
          {error}
        </p>
      )}

      <Button
        size="sm"
        onClick={handleConfirm}
        disabled={phase === PHASE.SAVING}
        className="h-8 text-xs bg-rd-primary hover:bg-rd-primary-dark text-white font-display font-bold rounded-full px-4 gap-1.5"
      >
        {phase === PHASE.SAVING ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" /> Adding…
          </>
        ) : (
          <>Add to profile</>
        )}
      </Button>
    </div>
  );
}

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Loader2,
  X,
  Check,
} from "lucide-react";
import {
  extractBullets,
  setBullets,
} from "@/lib/coachActionHandlers";

// BulletsEditor — per-entry editor for an experience's OR education entry's
// bullets[] (Story Bank → experiences/education). Each bullet is one
// STAR-disciplined achievement line the user can add / edit / reorder / delete,
// plus an AI-assist that turns a sentence of free text into proposed bullets
// via the anti-fab-gated extract-bullets edge function (target_type-aware).
// Nothing the AI proposes is written until the user accepts it + saves.
export default function BulletsEditor({
  targetType, // "experience" | "education"
  entity,
  userId,
  onChanged,
}) {
  const entityId = entity?.id;
  const [draft, setDraft] = useState(() =>
    Array.isArray(entity?.bullets) ? [...entity.bullets] : [],
  );
  // Skills the user accepted from AI proposals, merged into the entry's
  // skills on save (deduped server-side).
  const [pendingSkills, setPendingSkills] = useState([]);
  const [saving, setSaving] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [proposed, setProposed] = useState(null); // { bullets, skills, extraction_notes }

  const original = Array.isArray(entity?.bullets) ? entity.bullets : [];
  const dirty =
    JSON.stringify(draft.map((b) => b.trim()).filter(Boolean)) !==
      JSON.stringify(original) || pendingSkills.length > 0;

  const editBullet = (i, val) =>
    setDraft((d) => d.map((b, idx) => (idx === i ? val : b)));
  const deleteBullet = (i) => setDraft((d) => d.filter((_, idx) => idx !== i));
  const moveBullet = (i, dir) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const addBlank = () => setDraft((d) => [...d, ""]);

  const save = async () => {
    if (!userId || !entityId) return;
    setSaving(true);
    const cleaned = draft.map((b) => b.trim()).filter(Boolean);
    const skills =
      pendingSkills.length > 0
        ? [...(entity?.skills || []), ...pendingSkills]
        : undefined; // undefined → leave skills untouched
    const res = await setBullets({
      user: { id: userId },
      targetType,
      targetId: entityId,
      bullets: cleaned,
      skills,
    });
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    setDraft(cleaned);
    setPendingSkills([]);
    toast.success("Bullets saved.");
    onChanged?.();
  };

  const cancel = () => {
    setDraft([...original]);
    setPendingSkills([]);
  };

  const runAi = async () => {
    const text = aiText.trim();
    if (!text || !entityId) return;
    setAiBusy(true);
    setProposed(null);
    const res = await extractBullets({ text, targetType, targetId: entityId });
    setAiBusy(false);
    if (!res || !Array.isArray(res.bullets) || res.bullets.length === 0) {
      toast.error("Couldn't draft a bullet from that - try adding a detail.");
      return;
    }
    setProposed(res);
  };

  const acceptProposed = () => {
    if (!proposed) return;
    setDraft((d) => [...d, ...proposed.bullets]);
    if (Array.isArray(proposed.skills) && proposed.skills.length > 0)
      setPendingSkills((s) => [...s, ...proposed.skills]);
    setProposed(null);
    setAiText("");
    setAiOpen(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-rd-border-subtle">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          Achievements
        </p>
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-display font-semibold text-rd-coral-dark hover:text-rd-coral transition-colors"
        >
          <Sparkles className="w-3 h-3" /> Add with AI
        </button>
      </div>

      {draft.length === 0 && !aiOpen && (
        <p className="text-[11.5px] text-rd-text-tertiary mb-2">
          No achievement bullets yet. Add a STAR-style line (what you did + what
          changed, with a real number when you have one), or draft one with AI.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {draft.map((b, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <textarea
              value={b}
              onChange={(e) => editBullet(i, e.target.value)}
              rows={2}
              placeholder="e.g. Rebuilt onboarding, cutting time-to-first-value from 9 days to 4"
              className="flex-1 bg-rd-bg-card border border-rd-border rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-rd-text placeholder:text-rd-text-tertiary focus:outline-none focus:border-rd-coral resize-y min-h-[44px]"
            />
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => moveBullet(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="p-0.5 text-rd-text-tertiary hover:text-rd-text disabled:opacity-30"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveBullet(i, 1)}
                disabled={i === draft.length - 1}
                aria-label="Move down"
                className="p-0.5 text-rd-text-tertiary hover:text-rd-text disabled:opacity-30"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => deleteBullet(i)}
              aria-label="Delete bullet"
              className="p-0.5 mt-0.5 text-rd-text-tertiary hover:text-rd-coral flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBlank}
        className="inline-flex items-center gap-1 mt-1.5 text-[11.5px] font-display font-semibold text-rd-text-secondary hover:text-rd-text transition-colors"
      >
        <Plus className="w-3 h-3" /> Add bullet
      </button>

      {aiOpen && (
        <div className="mt-2.5 rounded-[10px] bg-rd-bg-soft p-2.5">
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            rows={3}
            placeholder="Describe something you did here, in your own words. The AI keeps your real numbers and tools and never invents any."
            className="w-full bg-rd-bg-card border border-rd-border rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-rd-text placeholder:text-rd-text-tertiary focus:outline-none focus:border-rd-coral resize-y"
          />
          <div className="flex items-center gap-2 mt-1.5">
            <button
              type="button"
              onClick={runAi}
              disabled={aiBusy || !aiText.trim()}
              className="inline-flex items-center gap-1.5 bg-rd-coral text-white font-display font-semibold text-[12px] rounded-full px-3.5 py-1.5 disabled:opacity-60"
            >
              {aiBusy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Draft bullets
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setAiOpen(false);
                setProposed(null);
                setAiText("");
              }}
              className="inline-flex items-center gap-1 text-[12px] text-rd-text-secondary hover:text-rd-text"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>

          {proposed && (
            <div className="mt-2.5 rounded-[8px] bg-rd-bg-card border border-rd-border p-2.5">
              <ul className="flex flex-col gap-1">
                {proposed.bullets.map((b, i) => (
                  <li
                    key={i}
                    className="text-[12.5px] text-rd-text leading-[1.4] flex gap-1.5"
                  >
                    <span className="text-rd-coral-dark flex-shrink-0">•</span>
                    {b}
                  </li>
                ))}
              </ul>
              {proposed.extraction_notes && (
                <p className="text-[10.5px] italic text-rd-text-tertiary mt-1.5 leading-[1.4]">
                  {proposed.extraction_notes}
                </p>
              )}
              <button
                type="button"
                onClick={acceptProposed}
                className="inline-flex items-center gap-1.5 mt-2 bg-rd-bg-soft text-rd-text font-display font-semibold text-[12px] rounded-full px-3.5 py-1.5 hover:bg-rd-border transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Add to bullets
              </button>
            </div>
          )}
        </div>
      )}

      {dirty && (
        <div className="flex items-center gap-2 mt-2.5">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-rd-coral text-white font-display font-semibold text-[12px] rounded-full px-4 py-1.5 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </>
            ) : (
              "Save bullets"
            )}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="text-[12px] text-rd-text-secondary hover:text-rd-text"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

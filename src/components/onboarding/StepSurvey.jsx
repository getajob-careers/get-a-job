import React, { useState } from "react";
import { X, ArrowRight } from "lucide-react";
import RdButton from "@/components/redesign/RdButton";

// Phase 1 onboarding trim: three load-bearing questions only —
//   1. role_clarity_score   (drives task-count cap in generate-tasks)
//   2. biggest_challenge[]  (sparse-profile fallback anchor in generate-tasks)
//   3. cv_tailoring_strategy (anti-fabrication anchor in generate-tailored-cv)
//
// Dropped from capture: linkedin_outreach_strategy, job_search_efforts,
// referral_source. DB columns stay; the post-onboarding profile editor
// may still surface them.
//
// onNext still triggers the wrapper's handleSurveyNext, which is the
// terminal call into finalise() in Onboarding.jsx. The finalise pipeline
// itself is not touched here.

const CHALLENGES = [
  "I don't know which roles to target",
  "I apply but get no responses",
  "I get interviews but no offers",
  "I don't know how to network effectively",
  "My CV doesn't stand out",
  "I don't know how to negotiate salary",
  "I'm not sure if my skills are relevant",
];

const CV_OPTIONS = [
  { value: "always",    label: "Yes, I tailor it for most applications" },
  { value: "sometimes", label: "Sometimes, for roles I really want" },
  { value: "rarely",    label: "Rarely - I mostly use one version" },
  { value: "never",     label: "Never - I use the same CV for everything" },
];

const CLARITY_OPTIONS = [
  { value: 1, label: "No idea" },
  { value: 2, label: "Vague idea" },
  { value: 3, label: "Some clarity" },
  { value: 4, label: "Fairly clear" },
  { value: 5, label: "Very clear" },
];

const INPUT_CLS =
  "w-full px-3.5 py-2.5 rounded-[10px] border border-rd-border bg-rd-bg-card text-rd-text text-[13.5px] placeholder:text-rd-text-secondary/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-rd-coral focus:shadow-[0_0_0_3px_var(--rd-coral-tint)]";

const OPTION_BTN = (isSelected) =>
  [
    "w-full text-left text-[13.5px] px-4 py-3 rounded-[12px] border transition-[border-color,background-color,box-shadow] duration-150",
    isSelected
      ? "border-rd-coral bg-rd-coral-tint text-rd-text shadow-[0_0_0_3px_var(--rd-coral-tint)]"
      : "border-rd-border bg-rd-bg-card text-rd-text-secondary hover:border-rd-border-hover hover:text-rd-text",
  ].join(" ");

export default function StepSurvey({ data, onChange, onNext, onBack }) {
  const [customChallenge, setCustomChallenge] = useState("");
  const [customCVStrategy, setCustomCVStrategy] = useState("");

  const set = (key, val) => onChange({ ...data, [key]: val });

  const selectedChallenges = data.biggest_challenge || [];
  const toggleChallenge = (challenge) => {
    const updated = selectedChallenges.includes(challenge)
      ? selectedChallenges.filter((c) => c !== challenge)
      : [...selectedChallenges, challenge];
    set("biggest_challenge", updated);
  };
  const removeChallenge = (c) => set("biggest_challenge", selectedChallenges.filter((x) => x !== c));
  const commitCustomChallenge = () => {
    const v = customChallenge.trim();
    if (!v) return;
    if (!selectedChallenges.includes(v)) set("biggest_challenge", [...selectedChallenges, v]);
    setCustomChallenge("");
  };

  const commitCustom = (key, raw) => {
    const v = raw.trim();
    if (!v) return;
    set(key, v);
  };

  const isCustomCV = data.cv_tailoring_strategy && !CV_OPTIONS.some((o) => o.value === data.cv_tailoring_strategy);

  const customChallenges = selectedChallenges.filter((c) => !CHALLENGES.includes(c));

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
          step 6 of 6 · reality check
        </p>
        <h1 className="font-display font-extrabold text-[26px] sm:text-[28px] leading-[1.1] tracking-tight text-rd-text mt-2">
          Quick reality check.
        </h1>
        <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-3">
          Your honest answers help us calibrate. Where you actually are - not where you want to be.
        </p>
      </div>

      <div className="bg-rd-bg-soft border border-rd-border rounded-[14px] px-4 py-3">
        <p className="text-[12.5px] text-rd-text-secondary leading-snug">
          All questions are optional. Click a suggestion, type your own, or leave blank.
        </p>
      </div>

      <div className="space-y-7">
        {/* 1. Role clarity — 5-button row with bigger touch targets */}
        <div>
          <label className="block text-[12px] font-semibold text-rd-text mb-2.5">
            How clear are you about which specific roles you&apos;re targeting?
          </label>
          <div className="grid grid-cols-5 gap-2">
            {CLARITY_OPTIONS.map((o) => {
              const isSelected = data.role_clarity_score === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set("role_clarity_score", o.value)}
                  className={[
                    "flex flex-col items-center justify-center gap-1 py-4 px-1 rounded-[14px] border transition-[border-color,background-color,box-shadow] duration-150",
                    isSelected
                      ? "border-rd-coral bg-rd-coral-tint text-rd-text shadow-[0_0_0_3px_var(--rd-coral-tint)]"
                      : "border-rd-border bg-rd-bg-card text-rd-text-secondary hover:border-rd-border-hover hover:text-rd-text",
                  ].join(" ")}
                >
                  <span className="font-display text-[20px] font-bold leading-none text-rd-text">
                    {o.value}
                  </span>
                  <span className="text-[10.5px] leading-tight text-center">
                    {o.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11.5px] text-rd-text-secondary mt-2 leading-snug">
            Scale of 1–5. Leave blank if you&apos;re not sure.
          </p>
        </div>

        {/* 2. Biggest challenges — multi select */}
        <div>
          <label className="block text-[12px] font-semibold text-rd-text mb-2.5">
            Your biggest job search challenges
            <span className="text-rd-text-tertiary font-normal ml-1.5">(select all that apply)</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            {CHALLENGES.map((c) => {
              const isSelected = selectedChallenges.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChallenge(c)}
                  className={OPTION_BTN(isSelected)}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {customChallenges.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {customChallenges.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 text-[12px] bg-rd-bg-soft text-rd-text px-2.5 py-1 rounded-md border border-rd-border font-medium"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => removeChallenge(c)}
                    className="text-rd-text-secondary hover:text-rd-coral transition-colors"
                    aria-label={`Remove ${c}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            value={customChallenge}
            onChange={(e) => setCustomChallenge(e.target.value)}
            onBlur={commitCustomChallenge}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitCustomChallenge(); } }}
            placeholder="Or type your own - press Enter to add"
            className={`${INPUT_CLS} mt-2.5`}
          />
        </div>

        {/* 3. CV tailoring */}
        <SingleSelect
          label="Do you tailor your CV for each application?"
          options={CV_OPTIONS}
          selected={data.cv_tailoring_strategy}
          onSelect={(v) => set("cv_tailoring_strategy", v)}
          isCustom={isCustomCV}
          customValue={customCVStrategy}
          setCustomValue={setCustomCVStrategy}
          onCommit={() => { commitCustom("cv_tailoring_strategy", customCVStrategy); setCustomCVStrategy(""); }}
          onClear={() => set("cv_tailoring_strategy", null)}
        />
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors"
        >
          ← Back
        </button>
        <RdButton onClick={onNext}>
          Continue <ArrowRight className="w-4 h-4" />
        </RdButton>
      </div>
    </div>
  );
}

function SingleSelect({
  label,
  options,
  selected,
  onSelect,
  isCustom,
  customValue,
  setCustomValue,
  onCommit,
  onClear,
  customPlaceholder = "Or type your own answer",
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-rd-text mb-2.5">
        {label}
      </label>
      <div className="space-y-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className={OPTION_BTN(selected === o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {isCustom && (
        <div className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] bg-rd-bg-soft text-rd-text px-2.5 py-1 rounded-md border border-rd-border font-medium">
          Your answer: {selected}
          <button
            type="button"
            onClick={onClear}
            className="text-rd-text-secondary hover:text-rd-coral transition-colors"
            aria-label="Remove custom answer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <input
        value={customValue}
        onChange={(e) => setCustomValue(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onCommit(); } }}
        placeholder={customPlaceholder}
        className={`${INPUT_CLS} mt-2.5`}
      />
    </div>
  );
}

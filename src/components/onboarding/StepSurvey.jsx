import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { X, ArrowRight } from "lucide-react";

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
  { value: "rarely",    label: "Rarely — I mostly use one version" },
  { value: "never",     label: "Never — I use the same CV for everything" },
];

const LINKEDIN_OPTIONS = [
  { value: "often",     label: "Yes, often — I message recruiters or employees regularly" },
  { value: "sometimes", label: "Sometimes — I've tried it a few times" },
  { value: "rarely",    label: "Rarely — I find it awkward" },
  { value: "never",     label: "Never — I haven't tried" },
];

// 5-button row with bigger touch targets (per Eli's decision #4 on the
// onboarding redesign brief). Number + label both visible.
const CLARITY_OPTIONS = [
  { value: 1, label: "No idea" },
  { value: 2, label: "Vague idea" },
  { value: 3, label: "Some clarity" },
  { value: 4, label: "Fairly clear" },
  { value: 5, label: "Very clear" },
];

const REFERRAL_OPTIONS = [
  { value: "reichman_practicum", label: "Reichman practicum" },
  { value: "school_whatsapp",    label: "School WhatsApp" },
  { value: "friends",            label: "Friends" },
  { value: "community",          label: "Community" },
];

export default function StepSurvey({ data, onChange, onNext, onBack }) {
  const [customChallenge, setCustomChallenge] = useState("");
  const [customCVStrategy, setCustomCVStrategy] = useState("");
  const [customLinkedInStrategy, setCustomLinkedInStrategy] = useState("");
  const [customReferralSource, setCustomReferralSource] = useState("");

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
  const isCustomLinkedIn = data.linkedin_outreach_strategy && !LINKEDIN_OPTIONS.some((o) => o.value === data.linkedin_outreach_strategy);
  const isCustomReferral = data.referral_source && !REFERRAL_OPTIONS.some((o) => o.value === data.referral_source);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="onb-h1">Quick reality check.</h1>
        <p className="onb-sub">
          Your honest answers help us calibrate. Where you actually are — not where you want to be.
        </p>
      </div>

      <div className="onb-banner onb-banner-info">
        All questions are optional. Click a suggestion, type your own, or leave blank.
      </div>

      <div className="space-y-7">

        {/* Biggest challenges — multi select */}
        <div>
          <label className="onb-eyebrow">Your biggest job search challenges (select all that apply)</label>
          <div className="mt-2.5 grid grid-cols-1 gap-2">
            {CHALLENGES.map((c) => {
              const isSelected = selectedChallenges.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChallenge(c)}
                  className={`text-left text-sm px-4 py-3 rounded-[14px] border transition-all ${
                    isSelected
                      ? "bg-[#0E1014] text-white border-[#0E1014]"
                      : "bg-white text-[#52545A] border-[#DDDDDB] hover:border-[#52545A]"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {selectedChallenges.filter((c) => !CHALLENGES.includes(c)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedChallenges.filter((c) => !CHALLENGES.includes(c)).map((c) => (
                <span key={c} className="inline-flex items-center gap-1 bg-[#0E1014] text-white text-xs px-2.5 py-1 rounded-md">
                  {c}
                  <button type="button" onClick={() => removeChallenge(c)} className="hover:text-[#F87060]">
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
            placeholder="Or type your own — press Enter to add"
            className="onb-input mt-2"
          />
        </div>

        {/* CV tailoring */}
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

        {/* LinkedIn outreach */}
        <SingleSelect
          label="Have you messaged people on LinkedIn as part of your job search?"
          options={LINKEDIN_OPTIONS}
          selected={data.linkedin_outreach_strategy}
          onSelect={(v) => set("linkedin_outreach_strategy", v)}
          isCustom={isCustomLinkedIn}
          customValue={customLinkedInStrategy}
          setCustomValue={setCustomLinkedInStrategy}
          onCommit={() => { commitCustom("linkedin_outreach_strategy", customLinkedInStrategy); setCustomLinkedInStrategy(""); }}
          onClear={() => set("linkedin_outreach_strategy", null)}
        />

        {/* Role clarity — 5-button row with bigger touch targets */}
        <div>
          <label className="onb-eyebrow">How clear are you about which specific roles you&apos;re targeting?</label>
          <div className="mt-2.5 grid grid-cols-5 gap-2">
            {CLARITY_OPTIONS.map((o) => {
              const isSelected = data.role_clarity_score === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set("role_clarity_score", o.value)}
                  className={`flex flex-col items-center justify-center gap-1 py-4 rounded-[14px] border transition-all ${
                    isSelected
                      ? "bg-[#0E1014] text-white border-[#0E1014]"
                      : "bg-white text-[#52545A] border-[#DDDDDB] hover:border-[#52545A]"
                  }`}
                >
                  <span className="text-xl font-bold leading-none">{o.value}</span>
                  <span className="text-[11px] leading-tight text-center px-1">{o.label}</span>
                </button>
              );
            })}
          </div>
          <p className="onb-help">Scale of 1–5. Leave blank if you&apos;re not sure.</p>
        </div>

        {/* What have you tried */}
        <div>
          <label className="onb-eyebrow">What have you already tried to improve your job search? <span className="text-[#9C9DA1] font-normal normal-case tracking-normal">(optional)</span></label>
          <Textarea
            value={data.job_search_efforts || ""}
            onChange={(e) => set("job_search_efforts", e.target.value)}
            placeholder="e.g. Applied to 50+ roles, attended career fairs, updated my LinkedIn…"
            className="text-sm min-h-[88px] border-[#DDDDDB] mt-2.5 rounded-[14px]"
          />
        </div>

        {/* Referral source */}
        <SingleSelect
          label="How did you hear about us?"
          options={REFERRAL_OPTIONS}
          selected={data.referral_source}
          onSelect={(v) => set("referral_source", v)}
          isCustom={isCustomReferral}
          customValue={customReferralSource}
          setCustomValue={setCustomReferralSource}
          onCommit={() => { commitCustom("referral_source", customReferralSource); setCustomReferralSource(""); }}
          onClear={() => set("referral_source", null)}
          customPlaceholder="Other — type your own"
        />
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="onb-btn onb-btn-outline">Back</button>
        <button onClick={onNext} className="onb-btn onb-btn-primary onb-btn-lg">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SingleSelect({ label, options, selected, onSelect, isCustom, customValue, setCustomValue, onCommit, onClear, customPlaceholder = "Or type your own answer" }) {
  return (
    <div>
      <label className="onb-eyebrow">{label}</label>
      <div className="mt-2.5 space-y-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className={`w-full text-left text-sm px-4 py-3 rounded-[14px] border transition-all ${
              selected === o.value
                ? "bg-[#0E1014] text-white border-[#0E1014]"
                : "bg-white text-[#52545A] border-[#DDDDDB] hover:border-[#52545A]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {isCustom && (
        <div className="mt-2 inline-flex items-center gap-1 bg-[#0E1014] text-white text-xs px-2.5 py-1 rounded-md">
          Your answer: {selected}
          <button type="button" onClick={onClear} className="hover:text-[#F87060]">
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
        className="onb-input mt-2"
      />
    </div>
  );
}

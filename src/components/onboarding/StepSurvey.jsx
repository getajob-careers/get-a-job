import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

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
  { value: "always", label: "Yes, I tailor it for most applications" },
  { value: "sometimes", label: "Sometimes, for roles I really want" },
  { value: "rarely", label: "Rarely — I mostly use one version" },
  { value: "never", label: "Never — I use the same CV for everything" },
];

const LINKEDIN_OPTIONS = [
  { value: "often", label: "Yes, often — I message recruiters or employees regularly" },
  { value: "sometimes", label: "Sometimes — I've tried it a few times" },
  { value: "rarely", label: "Rarely — I find it awkward" },
  { value: "never", label: "Never — I haven't tried" },
];

const CLARITY_OPTIONS = [
  { value: 1, label: "1 — No idea" },
  { value: 2, label: "2 — Vague idea" },
  { value: 3, label: "3 — Some clarity" },
  { value: 4, label: "4 — Fairly clear" },
  { value: 5, label: "5 — Very clear" },
];

// Canonical snake_case values for the predefined options; "Other" path
// writes the user's free text. Stored in profiles.referral_source (text).
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

  // ─ biggest_challenge (multi-select array) ───────────────────────────
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

  // ─ single-value fields (CV / LinkedIn / Clarity) — commit custom on blur OR Enter ─
  const commitCustom = (key, raw, normalise) => {
    const v = raw.trim();
    if (!v) return;
    set(key, normalise ? normalise(v) : v);
  };

  const isCustomCV = data.cv_tailoring_strategy && !CV_OPTIONS.some((o) => o.value === data.cv_tailoring_strategy);
  const isCustomLinkedIn = data.linkedin_outreach_strategy && !LINKEDIN_OPTIONS.some((o) => o.value === data.linkedin_outreach_strategy);
  const isCustomReferral = data.referral_source && !REFERRAL_OPTIONS.some((o) => o.value === data.referral_source);

  // All survey questions are optional — no canProceed gate.
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Job Search Reality Check</h2>
        <p className="text-sm text-[#525252] mt-1">
          Your answers help us understand where you actually are — not where you want to be. Be honest.
        </p>
      </div>

      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3 text-sm text-[#92400E]">
        💡 All questions are optional. Click a suggestion, type your own answer, or leave blank.
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-6">

        {/* Biggest challenge — multi select with chips for custom entries */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">
            What are your biggest job search challenges right now? (Select all that apply)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {CHALLENGES.map((c) => {
              const isSelected = selectedChallenges.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChallenge(c)}
                  className={`text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
                    isSelected
                      ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                      : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {/* Custom chips (entries not in the suggestion list) */}
          {selectedChallenges.filter((c) => !CHALLENGES.includes(c)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedChallenges.filter((c) => !CHALLENGES.includes(c)).map((c) => (
                <span key={c} className="inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-xs px-2.5 py-1 rounded-md">
                  {c}
                  <button type="button" onClick={() => removeChallenge(c)} className="hover:text-red-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="mt-2">
            <Input
              value={customChallenge}
              onChange={(e) => setCustomChallenge(e.target.value)}
              onBlur={commitCustomChallenge}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitCustomChallenge(); } }}
              placeholder="Or type your own — press Enter or click outside to save"
              className="text-sm"
            />
          </div>
        </div>

        {/* CV tailoring — single value */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">
            Do you tailor your CV for each application?
          </label>
          <div className="space-y-2">
            {CV_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => set("cv_tailoring_strategy", o.value)}
                className={`w-full text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
                  data.cv_tailoring_strategy === o.value
                    ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                    : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {isCustomCV && (
            <div className="mt-2 inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-xs px-2.5 py-1 rounded-md">
              Your answer: {data.cv_tailoring_strategy}
              <button type="button" onClick={() => set("cv_tailoring_strategy", null)} className="hover:text-red-300">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="mt-2">
            <Input
              value={customCVStrategy}
              onChange={(e) => setCustomCVStrategy(e.target.value)}
              onBlur={() => { commitCustom("cv_tailoring_strategy", customCVStrategy); setCustomCVStrategy(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitCustom("cv_tailoring_strategy", customCVStrategy); setCustomCVStrategy(""); } }}
              placeholder="Or type your own answer"
              className="text-sm"
            />
          </div>
        </div>

        {/* LinkedIn outreach */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">
            Have you messaged people on LinkedIn as part of your job search?
          </label>
          <div className="space-y-2">
            {LINKEDIN_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => set("linkedin_outreach_strategy", o.value)}
                className={`w-full text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
                  data.linkedin_outreach_strategy === o.value
                    ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                    : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {isCustomLinkedIn && (
            <div className="mt-2 inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-xs px-2.5 py-1 rounded-md">
              Your answer: {data.linkedin_outreach_strategy}
              <button type="button" onClick={() => set("linkedin_outreach_strategy", null)} className="hover:text-red-300">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="mt-2">
            <Input
              value={customLinkedInStrategy}
              onChange={(e) => setCustomLinkedInStrategy(e.target.value)}
              onBlur={() => { commitCustom("linkedin_outreach_strategy", customLinkedInStrategy); setCustomLinkedInStrategy(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitCustom("linkedin_outreach_strategy", customLinkedInStrategy); setCustomLinkedInStrategy(""); } }}
              placeholder="Or type your own answer"
              className="text-sm"
            />
          </div>
        </div>

        {/* Role clarity score — integer */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">
            How clear are you about which specific roles you're targeting?
          </label>
          <div className="flex gap-2 flex-wrap">
            {CLARITY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => set("role_clarity_score", o.value)}
                className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                  data.role_clarity_score === o.value
                    ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                    : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#A3A3A3] mt-2">Scale of 1–5. Leave blank if you&apos;re not sure.</p>
        </div>

        {/* What have you tried */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">
            What have you already tried to improve your job search? (optional)
          </label>
          <Textarea
            value={data.job_search_efforts || ""}
            onChange={(e) => set("job_search_efforts", e.target.value)}
            placeholder="e.g. Applied to 50+ roles, attended career fairs, updated my LinkedIn..."
            className="text-sm min-h-[80px]"
          />
        </div>

        {/* How did you hear about us — single-value, same pattern as CV / LinkedIn */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium mb-2">
            How did you hear about us?
          </label>
          <div className="space-y-2">
            {REFERRAL_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => set("referral_source", o.value)}
                className={`w-full text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
                  data.referral_source === o.value
                    ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                    : "bg-white text-[#525252] border-[#E5E5E5] hover:border-[#A3A3A3]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {isCustomReferral && (
            <div className="mt-2 inline-flex items-center gap-1 bg-[#0A0A0A] text-white text-xs px-2.5 py-1 rounded-md">
              Your answer: {data.referral_source}
              <button type="button" onClick={() => set("referral_source", null)} className="hover:text-red-300">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="mt-2">
            <Input
              value={customReferralSource}
              onChange={(e) => setCustomReferralSource(e.target.value)}
              onBlur={() => { commitCustom("referral_source", customReferralSource); setCustomReferralSource(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitCustom("referral_source", customReferralSource); setCustomReferralSource(""); } }}
              placeholder="Other — type your own"
              className="text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="text-sm">Back</Button>
        <Button onClick={onNext} className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-6">
          Continue
        </Button>
      </div>
    </div>
  );
}

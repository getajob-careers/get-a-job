import React from "react";

// Step 8 ("Your Roles") used to be the StepTierReveal page; it was replaced
// by the OnboardingTutorial which renders full-screen outside this shell.
// The shell is now only used for steps 0-7 (data-entry); step 8 reads as
// "Almost done" if a hard reload puts the user back into the shell for any
// reason (it shouldn't — Onboarding.jsx renders the tutorial above).
const STEPS = [
  "CV Upload",
  "Education",
  "Practicum",
  "Experience",
  "Skills",
  "Career Direction",
  "Constraints",
  "Survey",
  "Almost done",
];

export default function OnboardingShell({ currentStep, children }) {
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#0A0A0A]">Get A Job</h1>
            <p className="text-[11px] text-[#A3A3A3] tracking-wide uppercase mt-0.5">
              Profile Setup — Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-[#0A0A0A]">{STEPS[currentStep]}</p>
            <p className="text-[11px] text-[#A3A3A3] mt-0.5">{Math.round(progress)}% complete</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-3">
          <div className="h-1 bg-[#F0F0F0] rounded-full">
            <div
              className="h-1 bg-[#0A0A0A] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {/* Step labels */}
        <div className="max-w-2xl mx-auto mt-3 flex justify-between">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`text-[10px] font-medium uppercase tracking-wider ${
                i <= currentStep ? "text-[#0A0A0A]" : "text-[#D4D4D4]"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
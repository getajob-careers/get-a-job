import React from "react";

// Direction 3 brand tokens live on Onboarding.jsx (the parent injects the
// shared <style> block and wraps every render branch in .onb). This shell
// just lays out the chrome for steps 0-7 (data entry); step 8 renders the
// tutorial outside this shell.
const STEPS = [
  "CV upload",
  "Education",
  "Practicum",
  "Experience",
  "Skills",
  "Career direction",
  "Constraints",
  "Reality check",
];

export default function OnboardingShell({ currentStep, children }) {
  const total = STEPS.length;
  const stepLabel = STEPS[currentStep] || "";
  const progress = Math.min(100, ((currentStep + 1) / total) * 100);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar — brand mark + step counter. Dropped the cramped 8-label
          rail; single "Step X of 8 · {label}" reads better at every width. */}
      <header className="bg-[#FFFFFF] border-b border-[#DDDDDB]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="onb-brand">
            <span className="onb-brand-mark">getajob</span>
            <span className="onb-brand-dot" />
          </div>
          <div className="text-right">
            <p className="onb-eyebrow">Step {currentStep + 1} of {total}</p>
            <p className="text-sm font-semibold text-[#0E1014] mt-0.5">{stepLabel}</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-6 pb-3">
          <div className="onb-progress-track">
            <div className="onb-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      {/* Content area — generous padding, max-w-2xl content column. */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

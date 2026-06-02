import React from "react";
import { Link } from "react-router-dom";

// OnboardingShell — visual redesign (PR 2A).
//
// Chrome for steps 0-8 (data capture); step 9 (tutorial) renders
// full-screen outside this shell. Step counter reads "Step X of 9";
// the tutorial is intentionally NOT counted.
//
// Visual structure: cream page background → peach outer frame
// (signature for the onboarding-only flow, per the mockups in
// docs/design/redesign/getajob_onboarding_*.html) → white inner card
// containing the brand row, progress hairline, and the step content.
//
// STEPS array MUST stay in lockstep with the render block in
// Onboarding.jsx — every step from 0 to STEPS.length-1 needs a label
// here or the shell shows a blank header. Lesson 2026-05-25: when
// renumbering, grep this array too. Lesson 2026-06-02 (PR #213):
// import paths matter — keep imports identical to the prior file so
// existing test selectors (role/text-based) still resolve.
const STEPS = [
  "CV upload",
  "Education",
  "Internship",
  "Experience",
  "Role skills",      // index 4 — added in PR #136 (StepRoleSkills)
  "Other skills",     // index 5 — was "Skills"; matches the "Any other skills?" framing
  "Career direction",
  "Constraints",
  "Reality check",
];

function BrandMark() {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      <div className="grid grid-cols-2 gap-[3px]">
        <span className="w-[7px] h-[7px] rounded-full bg-rd-coral" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-golden" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-teal" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-text" />
      </div>
      <span className="font-display font-bold text-[17px] tracking-tight text-rd-text">
        Get A Job
      </span>
    </div>
  );
}

export default function OnboardingShell({ currentStep, children }) {
  const total = STEPS.length;
  const stepLabel = STEPS[currentStep] || "";
  const progress = Math.min(100, ((currentStep + 1) / total) * 100);

  return (
    <div className="min-h-screen bg-rd-bg-page font-body text-rd-text px-4 py-6 sm:px-6 sm:py-8">
      {/* Peach outer frame — onboarding-only signature from the mockups. */}
      <div
        className="max-w-2xl mx-auto rounded-[26px] p-[13px]"
        style={{ background: "var(--rd-peach)" }}
      >
        <div className="bg-rd-bg-card rounded-[18px] overflow-hidden">
          {/* Top bar — brand mark + "About Get A Job" link. */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <BrandMark />
              <Link
                to="/Landing"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline text-[12px] text-rd-text-secondary hover:text-rd-text transition-colors"
              >
                About Get A Job
              </Link>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow">
                Step {currentStep + 1} of {total}
              </p>
              <p className="font-display font-semibold text-[14px] text-rd-text mt-0.5">
                {stepLabel}
              </p>
            </div>
          </div>

          {/* Progress hairline. */}
          <div
            className="h-[5px]"
            style={{ background: "var(--rd-border-subtle)" }}
          >
            <div
              className="h-full transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%`, background: "var(--rd-coral)" }}
            />
          </div>

          {/* Step content. */}
          <main className="px-6 py-8 sm:px-8 sm:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

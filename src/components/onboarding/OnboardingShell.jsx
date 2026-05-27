import React from "react";
import { ExternalLink } from "lucide-react";

// Direction 3 brand tokens live on Onboarding.jsx (the parent injects the
// shared <style> block and wraps every render branch in .onb). This shell
// just lays out the chrome for steps 0-8 (data entry); step 9 renders the
// tutorial outside this shell.
//
// STEPS array MUST stay in lockstep with the render block in
// Onboarding.jsx — every step from 0 to STEPS.length-1 needs a label
// here or the shell shows a blank header. Lesson 2026-05-25: when
// renumbering, grep this array too — easy to miss alongside DB writes.
const STEPS = [
  "CV upload",
  "Education",
  "Internship",
  "Experience",
  "Role skills",      // index 4 — added in PR #136 (StepRoleSkills)
  "Other skills",     // index 5 — was "Skills"; renamed to match the page's "Any other skills?" framing
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
          <div className="flex items-baseline gap-4">
            <div className="onb-brand">
              <span className="onb-brand-mark">getajob</span>
              <span className="onb-brand-dot" />
            </div>
            {/* Opens the marketing page in a new tab so onboarding state
                stays intact in this tab. */}
            <a
              href="/Landing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#9C9DA1] hover:text-[#52545A] inline-flex items-center gap-1 transition-colors"
            >
              About Get A Job <ExternalLink className="w-3 h-3" />
            </a>
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

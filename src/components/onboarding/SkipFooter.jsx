import React from "react";
import { ArrowRight } from "lucide-react";

// Shared footer for optional onboarding steps. Two buttons + coaching
// text explaining why filling beats skipping. Used by StepRoleSkills
// and StepSkills (the catch-all renamed to "Any other skills?").
//
// onBack is optional — for the first step in a section we hide it.
export default function SkipFooter({ onSkip, onContinue, onBack, continueLabel = "Continue" }) {
  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-[#E8E8E5]">
      <p className="text-[11px] text-[#9C9DA1] leading-snug text-center">
        Skip — tagging skills helps generate better CVs and job matches.
      </p>
      <div className="flex items-center justify-between">
        {onBack ? (
          <button onClick={onBack} className="onb-btn onb-btn-outline">Back</button>
        ) : <span />}
        <div className="flex items-center gap-3">
          <button onClick={onSkip} className="onb-btn onb-btn-ghost">
            Skip
          </button>
          <button onClick={onContinue} className="onb-btn onb-btn-primary onb-btn-lg">
            {continueLabel} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

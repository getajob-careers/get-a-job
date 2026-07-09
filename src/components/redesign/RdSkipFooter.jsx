import React from "react";
import { ArrowRight } from "lucide-react";
import RdButton from "./RdButton";

// RdSkipFooter — redesign fork of SkipFooter.
//
// Behaviour parity with the canonical SkipFooter is intentional:
//   - Same three-button shape (Back / Skip / Continue)
//   - `onBack` optional — hidden when not provided
//   - `continueLabel` overrides "Continue"
//
// Visual changes:
//   - Coral pill CTA via RdButton
//   - Skip + Back as text-tertiary inline buttons
//   - Hairline top border in --rd-border-subtle
export default function RdSkipFooter({
  onSkip,
  onContinue,
  onBack,
  continueLabel = "Continue",
}) {
  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-rd-border-subtle">
      <p className="text-[11.5px] text-rd-text-secondary leading-snug text-center">
        Skip - tagging skills helps generate better CVs and job matches.
      </p>
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors"
          >
            ← Back
          </button>
        ) : <span />}
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors"
          >
            Skip
          </button>
          <RdButton onClick={onContinue}>
            {continueLabel} <ArrowRight className="w-4 h-4" />
          </RdButton>
        </div>
      </div>
    </div>
  );
}

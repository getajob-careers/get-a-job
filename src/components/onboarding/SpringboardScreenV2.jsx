import React from "react";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  RotateCcw,
  Rocket,
} from "lucide-react";

// Onboarding V2 — springboard (screen 3). Not a destination: its only job is to
// LAUNCH the user into Home (redesign brief, "Springboard, not destination").
// Light by design — a CSS-only entrance, no anime.js; the real payoff is the
// Home arrival, not this screen. The launch tap runs the final persistence
// (entity rows + onboarding_complete, via the shared onboardingPersist helper),
// so this control owns the loading + error states for that write.
export default function SpringboardScreenV2({
  onLaunch,
  finalising,
  error,
  hasCv,
}) {
  return (
    <div className="onbv2-springboard">
      <div className="rounded-[18px] border border-rd-border bg-rd-bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rd-primary-tint">
          <Rocket className="h-5 w-5 text-rd-primary" aria-hidden="true" />
        </div>
        <h1 className="font-display font-bold text-[24px] leading-tight text-rd-text mt-5 text-balance">
          You&apos;re all set.
        </h1>
        <p className="text-[13.5px] text-rd-text-secondary mt-2 max-w-[360px] mx-auto">
          {hasCv
            ? "Your profile is ready. We'll match you to roles, tailor your CV, and map your skill gaps — it's all waiting in your workspace."
            : "Your profile is ready. Add your CV any time to unlock job matches and a tailored CV — you can start exploring now."}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-[14px] border border-rd-primary/40 bg-rd-primary-tint/50 p-3.5 text-left flex items-start gap-2.5"
          >
            <AlertCircle
              className="w-4 h-4 text-rd-primary-dark flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-[12.5px] text-rd-text-secondary">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onLaunch}
          disabled={finalising}
          className="mt-6 inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark active:bg-rd-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-2 rounded-full px-5 py-2.5 min-h-[44px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {finalising ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Setting up your workspace…
            </>
          ) : error ? (
            <>
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Try again
            </>
          ) : (
            <>
              Go to my workspace
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
      <style>{`
        .onbv2-springboard { animation: onbv2-rise 200ms ease-out both; }
        @keyframes onbv2-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .onbv2-springboard { animation: none; }
        }
      `}</style>
    </div>
  );
}

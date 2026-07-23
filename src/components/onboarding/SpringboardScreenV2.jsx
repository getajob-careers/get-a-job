import React, { useEffect, useRef } from "react";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  RotateCcw,
  Rocket,
} from "lucide-react";

// Onboarding V2 - springboard (screen 3). Not a destination: its only job is to
// LAUNCH the user into Home (redesign brief, "Springboard, not destination").
// This is the payoff beat, so the arrival is PROMOTED to an anime.js timeline
// (character-craft: arrivals get anime.js, simple state changes get CSS):
//   - the rocket pops in with a spring overshoot, then the copy + CTA lift in
//     on a short stagger.
//   - anime is CODE-SPLIT (dynamic import on mount) so it never weighs the main
//     bundle, and it only touches the inner elements after it loads.
//   - the wrapper keeps the CSS `onbv2-rise` card rise as the load-bearing
//     FALLBACK: if anime is slow or fails to load, the card still arrives and
//     every element is already at its final state (nothing is left hidden).
//   - reduced-motion => fully STATIC (the CSS keyframe self-disables and the JS
//     timeline is skipped), so the screen renders complete with no motion.
// The launch tap runs the final persistence (entity rows + onboarding_complete,
// via the shared onboardingPersist helper), so this control owns the loading +
// error states for that write.
export default function SpringboardScreenV2({
  onLaunch,
  finalising,
  error,
  hasCv,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    // Code-split: anime only loads when the springboard mounts. The .catch
    // leaves every element at its already-rendered final state (the fallback).
    import("animejs/animation")
      .then(({ animate }) => {
        if (cancelled || !root) return;
        const rocket = root.querySelector("[data-onbv2-rocket]");
        const items = root.querySelectorAll("[data-onbv2-item]");
        if (rocket) {
          animate(rocket, {
            scale: [0.4, 1],
            rotate: [-10, 0],
            duration: 600,
            delay: 120,
            ease: "outBack",
          });
        }
        if (items.length) {
          animate(items, {
            opacity: [0, 1],
            translateY: [10, 0],
            duration: 440,
            delay: (_el, i) => 260 + i * 90,
            ease: "outQuad",
          });
        }
      })
      .catch(() => {
        /* fallback: elements stay at their final rendered state */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="onbv2-springboard" ref={rootRef}>
      <div className="rd-r-lg border border-rd-border bg-rd-bg-card p-8 text-center">
        <div
          data-onbv2-rocket
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rd-primary-tint"
        >
          <Rocket className="h-5 w-5 text-rd-primary" aria-hidden="true" />
        </div>
        {/* Mascot slot (reserved, empty beat): the celebration pose lands beside
            the rocket in the later additive character PR - nothing renders now
            (handoff: mascot slots render nothing). */}
        <h1
          data-onbv2-item
          className="font-display font-bold rd-t-display-l text-rd-text mt-5 text-balance"
        >
          You&apos;re all set.
        </h1>
        <p
          data-onbv2-item
          className="rd-t-body-m text-rd-text-secondary mt-2 max-w-[360px] mx-auto"
        >
          {hasCv
            ? "Your profile is ready. We'll match you to roles, tailor your CV, and map your skill gaps - it's all waiting in your workspace."
            : "Your profile is ready. Add your CV any time to unlock job matches and a tailored CV - you can start exploring now."}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rd-r-md border border-rd-primary/40 bg-rd-primary-tint/50 p-3.5 text-left flex items-start gap-2.5"
          >
            <AlertCircle
              className="w-4 h-4 text-rd-primary-dark flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-[12.5px] text-rd-text-secondary">{error}</p>
          </div>
        )}

        <button
          data-onbv2-item
          type="button"
          onClick={onLaunch}
          disabled={finalising}
          className="rd-press mt-6 inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark active:bg-rd-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-2 rounded-full px-5 py-2.5 min-h-[44px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

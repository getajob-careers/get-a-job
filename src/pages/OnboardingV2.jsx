import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { track, EVENTS } from "@/lib/analytics";

// Onboarding V2 — the reordered 4-screen shell (behind the ONBOARDING_V2 flag).
//
// This PR is the SCAFFOLD: the flag, the reordered screen sequence, the shell
// chrome, and the born-instrumented event wiring. Each screen's real body +
// data/persistence + motion lands in its own scoped PR (per the build plan).
// Flag-off, the legacy Onboarding renders byte-identically (see OnboardingEntry).
//
// Sequence + step_index follow the ACCEPTED reorder so extraction can overlap
// the direction pickers (review needs extraction, direction does not):
//   0 cv_upload -> 1 direction -> 2 review -> 3 springboard
// step_index is the position in THIS sequence; `name` carries the semantics.
const SCREENS = [
  {
    index: 0,
    name: "cv_upload",
    eyebrow: "your CV",
    title: "Let’s start with your CV.",
    sub: "Drop your CV and we’ll extract everything from it — no manual entry.",
  },
  {
    index: 1,
    name: "direction",
    eyebrow: "direction & preferences",
    title: "Where do you want to go?",
    sub: "Your goal anchors every recommendation. We’re reading your CV in the background while you answer.",
  },
  {
    index: 2,
    name: "review",
    eyebrow: "review what we found",
    title: "Review and confirm.",
    sub: "Here’s what we pulled from your CV. Confirm or fix, then continue.",
  },
  {
    index: 3,
    name: "springboard",
    eyebrow: "you’re set",
    title: "Your workspace is ready.",
    sub: "We’ve built your profile. Jump in.",
  },
];

export default function OnboardingV2() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const screen = SCREENS[step];
  const isLast = step === SCREENS.length - 1;

  // onboarding_started once, on mount (mirrors the legacy flow's first event).
  useEffect(() => {
    track(EVENTS.ONBOARDING_STARTED, { flow: "v2" });
  }, []);

  // onboarding_screen_viewed on every screen arrival — the born-instrumented
  // rule (viewed on arrival, completed on advance) that makes within-step
  // abandonment measurable, unlike the legacy completed-only signal.
  useEffect(() => {
    track(EVENTS.ONBOARDING_SCREEN_VIEWED, {
      screen: screen.name,
      step_index: screen.index,
      flow: "v2",
    });
  }, [screen.name, screen.index]);

  const advance = () => {
    track(EVENTS.ONBOARDING_STEP_COMPLETED, {
      step_index: screen.index,
      name: screen.name,
      flow: "v2",
    });
    if (isLast) {
      track(EVENTS.ONBOARDING_LAUNCHED_TO_HOME, { flow: "v2" });
      // ?welcome=1 is the cross-lane arrival handoff; today's Home ignores it,
      // the Home-redesign lane reads it to play the first-landing entrance.
      navigate("/Home?welcome=1", { replace: true });
      return;
    }
    setStep((s) => s + 1);
  };

  const counter = useMemo(
    () => `Step ${step + 1} of ${SCREENS.length}`,
    [step],
  );

  return (
    <div className="min-h-screen bg-rd-bg-page text-rd-text flex flex-col">
      <div className="mx-auto w-full max-w-[560px] px-5 py-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <span className="font-display font-bold text-[13px] text-rd-text">
            Get A Job
          </span>
          <span className="text-[11px] font-medium text-rd-text-tertiary uppercase tracking-wide">
            {counter}
          </span>
        </div>

        {/* progress rail */}
        <div className="flex gap-1.5 mb-8" aria-hidden="true">
          {SCREENS.map((s) => (
            <div
              key={s.name}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s.index <= step ? "bg-rd-coral" : "bg-rd-border"
              }`}
            />
          ))}
        </div>

        <div className="flex-1">
          <p className="text-[11px] font-medium text-rd-coral uppercase tracking-wide mb-2">
            {screen.eyebrow}
          </p>
          <h1 className="font-display font-bold text-[24px] leading-tight text-rd-text text-balance">
            {screen.title}
          </h1>
          <p className="text-[13.5px] text-rd-text-secondary mt-2">
            {screen.sub}
          </p>

          {/* Scaffold placeholder — the real screen body lands in its own PR. */}
          <div className="mt-8 rounded-[18px] border border-dashed border-rd-border bg-rd-bg-card p-8 text-center">
            <p className="text-[12.5px] text-rd-text-tertiary">
              {screen.name} content — built in a later scoped PR.
            </p>
          </div>
        </div>

        <div className="pt-8 flex justify-end">
          <button
            type="button"
            onClick={advance}
            className="inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-5 py-2.5 transition-colors"
          >
            {isLast ? "Go to my workspace" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

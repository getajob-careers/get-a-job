import React, { useEffect, useRef } from "react";
import { animate } from "animejs/animation";
import { createTimeline } from "animejs/timeline";
import MascotFigure from "@/components/redesign/mascot/MascotFigure";

// SHOW_PREVIEW_ROUTES-gated eye-pick packet for the mascot arc (Step 2). Three
// "working" motion variants on anime.js timelines + the static pose-vocabulary
// grid, so Eli picks the character AND blesses the vocabulary in one pass.
// prefers-reduced-motion -> the figures render static (timelines never start).
// This route folds out of the production bundle as dead code (App.jsx gate), so
// anime.js adds ~0 to prod here; the ~16KB adoption cost lands when the mascot
// ships into loaders/onboarding (a later PR).

const REDUCE =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Pivot the forearm about the elbow (top-left of its bbox) so rotation reads as
// a hinge, not a slide.
function rigForearm(root) {
  const fa = root?.querySelector('[data-part="forearm"]');
  if (fa) {
    fa.style.transformBox = "fill-box";
    fa.style.transformOrigin = "8% 8%";
  }
  return fa;
}

// Variant 1 — TYPING: the forearm ticks at the elbow while the screen glow
// pulses in sync (a keystroke feel). One timeline orchestrates both parts.
function useTyping(ref) {
  useEffect(() => {
    if (REDUCE) return;
    const root = ref.current;
    const forearm = rigForearm(root);
    const glow = root?.querySelector('[data-part="glow"]');
    if (!forearm || !glow) return;
    const tl = createTimeline({ loop: true });
    tl.add(
      forearm,
      { rotate: [0, -4, 0], duration: 260, ease: "inOut(2)" },
      0,
    ).add(
      glow,
      { opacity: [0.5, 0.82, 0.5], duration: 260, ease: "inOut(2)" },
      0,
    );
    return () => {
      tl.revert();
    };
  }, [ref]);
}

// Variant 2 — FOCUS: the screen glow breathes slowly and the head leans a few
// degrees toward the screen. Calm, "reading the output" energy.
function useFocus(ref) {
  useEffect(() => {
    if (REDUCE) return;
    const root = ref.current;
    const glow = root?.querySelector('[data-part="glow"]');
    const head = root?.querySelector('[data-part="head"]');
    const anims = [];
    if (glow)
      anims.push(
        animate(glow, {
          opacity: [0.42, 0.7, 0.42],
          scale: [1, 1.08, 1],
          duration: 1800,
          loop: true,
          ease: "inOutSine",
        }),
      );
    if (head)
      anims.push(
        animate(head, {
          rotate: [0, 4, 0],
          duration: 1800,
          loop: true,
          ease: "inOutSine",
        }),
      );
    return () => anims.forEach((a) => a.revert());
  }, [ref]);
}

// Variant 3 — BOB: the whole figure breathes (a gentle vertical bob) with a tiny
// counter-tilt of the head. Ambient "alive" idle — the sign-up / loader register.
function useBob(ref) {
  useEffect(() => {
    if (REDUCE) return;
    const root = ref.current;
    const figure = root?.querySelector('[data-part="figure"]');
    const head = root?.querySelector('[data-part="head"]');
    const anims = [];
    if (figure)
      anims.push(
        animate(figure, {
          translateY: [0, -5, 0],
          duration: 2400,
          loop: true,
          ease: "inOutSine",
        }),
      );
    if (head)
      anims.push(
        animate(head, {
          rotate: [0, -3, 0],
          duration: 2400,
          loop: true,
          ease: "inOutSine",
        }),
      );
    return () => anims.forEach((a) => a.revert());
  }, [ref]);
}

function HeroCard({ label, blurb, hook }) {
  const ref = useRef(null);
  hook(ref);
  return (
    <div className="flex flex-col items-center rounded-lg border border-rd-border bg-rd-bg-card p-6 shadow-rd">
      <div ref={ref} className="mb-4">
        <MascotFigure pose="working" size={220} />
      </div>
      <p className="font-display text-[15px] font-semibold text-rd-text">
        {label}
      </p>
      <p className="mt-1 max-w-[22ch] text-center text-[12px] text-rd-text-secondary">
        {blurb}
      </p>
    </div>
  );
}

const POSES = [
  { pose: "working", label: "Working", note: "the anchor / idle" },
  { pose: "read", label: "Upload-read", note: "scanning a CV while it parses" },
  { pose: "review", label: "Review-pen", note: "confirming extracted fields" },
  { pose: "present", label: "Tutorial-guide", note: "pointing at the feature" },
  { pose: "celebrate", label: "Springboard", note: "the completion payoff" },
  { pose: "horizon", label: "Horizon-goal", note: "looking up the 5-yr path" },
  { pose: "empty", label: "Empty-page nudge", note: "“let’s add more”" },
  { pose: "loader", label: "Loader-tick", note: "honest in-flight indicator" },
  {
    pose: "signup",
    label: "Sign-up ambient",
    note: "calm, claims no progress",
  },
];

export default function MascotPreview() {
  return (
    <div className="min-h-[100dvh] bg-rd-bg-page px-6 py-10 font-body text-rd-text">
      <div className="mx-auto max-w-[1100px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-rd-text-eyebrow">
          Mascot arc · Step 2 · eye-pick packet
        </p>
        <h1 className="mt-2 font-display text-[30px] font-bold">
          The working figure &mdash; pick the motion, bless the vocabulary
        </h1>
        <p className="mt-2 max-w-[64ch] text-[13.5px] text-rd-text-secondary">
          Refined hero-scale figure in the logo&rsquo;s own material (glaze +
          lift shadow). Three &ldquo;working&rdquo; motion variants on anime.js
          timelines below, then the recurring-character pose vocabulary.
          Reduced- motion renders every figure static.
        </p>

        <h2 className="mt-9 font-display text-[18px] font-semibold">
          1 &middot; Working-motion variants
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <HeroCard
            label="Typing"
            blurb="Forearm ticks at the elbow; the screen glow pulses in sync."
            hook={useTyping}
          />
          <HeroCard
            label="Focus"
            blurb="The glow breathes slowly; the head leans toward the screen."
            hook={useFocus}
          />
          <HeroCard
            label="Bob"
            blurb="A gentle whole-body breath. The ambient / idle register."
            hook={useBob}
          />
        </div>

        <h2 className="mt-11 font-display text-[18px] font-semibold">
          2 &middot; Pose vocabulary (static sketches)
        </h2>
        <p className="mt-1 max-w-[64ch] text-[12.5px] text-rd-text-secondary">
          One character, one silhouette &mdash; the working arm + a held prop
          swap per scene. Each illustrates a REAL state; none fakes progress.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {POSES.map(({ pose, label, note }) => (
            <div
              key={pose}
              className="flex flex-col items-center rounded-lg border border-rd-border bg-rd-bg-card p-4 shadow-rd"
            >
              <MascotFigure pose={pose} size={130} />
              <p className="mt-2 font-display text-[13px] font-semibold text-rd-text">
                {label}
              </p>
              <p className="text-center text-[11px] text-rd-text-secondary">
                {note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

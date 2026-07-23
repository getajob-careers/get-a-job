import React, { useEffect, useRef } from "react";
import { animate } from "animejs/animation";
import MascotFigure from "@/components/redesign/mascot/MascotFigure";

// SHOW_PREVIEW_ROUTES-gated eye-pick packet — MASCOT ROUND 1 (reference-board
// redraw). The board's language (solid masses, exaggerated proportions,
// signature nose, minimal face, in-figure grain) is now in MascotFigure; this
// route proves the CHARACTER at hero scale AND the MICRO-LIFE LAYER that round 0
// lacked: the SIGN-UP AMBIENT IDLE (breathing + random blinks + weight shifts +
// a periodic coffee sip), every sub-motion on its own randomized cycle so
// nothing metronomes. The other three registers (landing scroll-journey,
// onboarding state-acting, tutorial guide) are storyboarded in
// docs/design/mascot-motion-registers.md — built later.
//
// Honest + reduced-motion: on prefers-reduced-motion the idle never starts, so
// the figure holds its static end-state. anime.js folds out of prod here (dead
// code behind the App.jsx SHOW_PREVIEW_ROUTES gate); the ~16KB adoption cost
// lands when the mascot ships into a real surface (a later PR).
//
// This route stamps data-next-design while mounted so the canvas tokens
// (slate/mauve/brown/skin, defined under [data-next-design]) resolve exactly as
// on the real flag-on surface — round 0 forgot this and rendered coral.

const REDUCE =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const rand = (min, max) => min + Math.random() * (max - min);

// Drive the full sign-up ambient idle on one figure. Each sub-motion runs on an
// independent, self-rescheduling random timer — the anti-metronome guarantee.
function useSignupIdle(ref) {
  useEffect(() => {
    if (REDUCE) return;
    const root = ref.current;
    if (!root) return;
    const q = (s) => root.querySelector(`[data-part="${s}"]`);
    const figure = q("figure");
    const torso = q("torso");
    const head = q("head");
    const eyes = q("eyes");
    const mugArm = q("mugArm");
    const steam = q("steam");

    // rig transform pivots that aren't set on the element itself
    if (torso) {
      torso.style.transformBox = "fill-box";
      torso.style.transformOrigin = "50% 100%";
    }
    if (mugArm) {
      mugArm.style.transformBox = "fill-box";
      mugArm.style.transformOrigin = "6% 4%"; // the elbow
    }

    const loopAnims = [];
    const timers = [];
    let alive = true;
    const later = (fn, ms) => {
      const id = window.setTimeout(fn, ms);
      timers.push(id);
      return id;
    };

    // BREATHING — continuous, the base sign of life
    if (figure)
      loopAnims.push(
        animate(figure, {
          translateY: [0, -4, 0],
          duration: 3600,
          loop: true,
          ease: "inOutSine",
        }),
      );
    if (torso)
      loopAnims.push(
        animate(torso, {
          scaleY: [1, 1.02, 1],
          scaleX: [1, 1.008, 1],
          duration: 3600,
          loop: true,
          ease: "inOutSine",
        }),
      );
    if (steam)
      loopAnims.push(
        animate(steam, {
          translateY: [0, -6, 0],
          opacity: [0.6, 0.15, 0.6],
          duration: 4200,
          loop: true,
          ease: "inOutSine",
        }),
      );

    // BLINK — quick, on a 2.6–6.4s random cadence, occasionally a double
    const blink = () => {
      if (!alive || !eyes) return;
      const dbl = Math.random() < 0.22;
      animate(eyes, {
        scaleY: dbl ? [1, 0.1, 1, 0.1, 1] : [1, 0.1, 1],
        duration: dbl ? 340 : 150,
        ease: "inOut(2)",
      });
      later(blink, rand(2600, 6400));
    };
    later(blink, rand(900, 2200));

    // WEIGHT SHIFT — slow head tilt/settle, 7–15s random cadence
    const shift = () => {
      if (!alive || !head) return;
      const dir = Math.random() < 0.5 ? -1 : 1;
      animate(head, {
        rotate: [0, dir * rand(2, 3.4), dir * rand(2, 3.4), 0],
        translateX: [0, dir * rand(1, 2.2), dir * rand(1, 2.2), 0],
        duration: rand(2600, 3600),
        ease: "inOutSine",
      });
      later(shift, rand(7000, 15000));
    };
    later(shift, rand(4000, 8000));

    // COFFEE SIP — lifts the mug toward the mouth, holds, lowers; 16–30s cadence
    const sip = () => {
      if (!alive || !mugArm) return;
      animate(mugArm, {
        rotate: [0, -46, -50, -50, 0],
        translateX: [0, -6, -8, -8, 0],
        translateY: [0, -6, -9, -9, 0],
        duration: 2600,
        ease: "inOut(3)",
      });
      later(sip, rand(16000, 30000));
    };
    later(sip, rand(6000, 11000));

    return () => {
      alive = false;
      timers.forEach((id) => window.clearTimeout(id));
      loopAnims.forEach((a) => a.revert?.());
    };
  }, [ref]);
}

function LivingHero() {
  const ref = useRef(null);
  useSignupIdle(ref);
  return (
    <div
      ref={ref}
      className="flex items-end justify-center"
      style={{ minHeight: 340 }}
    >
      <MascotFigure size={280} />
    </div>
  );
}

const REGISTERS = [
  {
    k: "signup",
    name: "Sign-up ambient",
    state: "LIVE ↑",
    blurb:
      "Breathing + random blinks + weight shifts + a periodic coffee sip. Calm; claims no progress.",
  },
  {
    k: "landing",
    name: "Landing scroll-journey",
    state: "storyboard",
    blurb:
      "Rises out of the logotype's “A”, then walks the page down with the scroll — hero → practice → celebration at the final CTA.",
  },
  {
    k: "onboarding",
    name: "Onboarding state-acting",
    state: "storyboard",
    blurb:
      "Reads during REAL extraction, pen-checks on review confirms, horizon-gaze on the goal screen, springboard celebration.",
  },
  {
    k: "tutorial",
    name: "Tutorial guide",
    state: "storyboard",
    blurb:
      "Entrance hop, points at each slide's highlight, idles while the user reads.",
  },
];

export default function MascotPreview() {
  // Stamp the canvas flag so [data-next-design] tokens resolve on this route.
  useEffect(() => {
    const el = document.documentElement;
    const had = el.hasAttribute("data-next-design");
    el.setAttribute("data-next-design", "");
    return () => {
      if (!had) el.removeAttribute("data-next-design");
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-rd-bg-page px-6 py-10 font-body text-rd-text">
      <div className="mx-auto max-w-[900px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-rd-text-eyebrow">
          Mascot arc · Round 1 · reference-board redraw
        </p>
        <h1 className="mt-2 font-display text-[30px] font-bold">
          The character &mdash; solid masses, a real face, and micro-life
        </h1>
        <p className="mt-2 max-w-[64ch] text-[13.5px] text-rd-text-secondary">
          Redrawn against the board: oversized head + chunky torso + small
          limbs, the signature rounded nose, a minimal face (brows + dot eyes +
          a simple mouth), a soft grain tooth inside the figure, and a grounded
          shadow. The brand equity holds &mdash; he&rsquo;s still the person at
          the A-frame desk from the logotype&rsquo;s &ldquo;A&rdquo;. The idle
          below is running live; reduced-motion holds it static.
        </p>

        <div className="mt-6 rounded-lg border border-rd-border bg-rd-bg-card p-8 shadow-rd">
          <LivingHero />
          <p className="mt-2 text-center font-display text-[15px] font-semibold text-rd-text">
            Sign-up ambient idle
          </p>
          <p className="mx-auto mt-1 max-w-[46ch] text-center text-[12px] text-rd-text-secondary">
            Breathing, blinks, weight shifts and a periodic sip &mdash; each on
            its own randomized cycle, so nothing metronomes.
          </p>
        </div>

        <h2 className="mt-11 font-display text-[18px] font-semibold">
          Four energy registers &middot; one character
        </h2>
        <p className="mt-1 max-w-[64ch] text-[12.5px] text-rd-text-secondary">
          Micro-life is always on; the register changes the ENERGY, not the
          character. Sign-up is built (above); the other three are storyboarded
          in{" "}
          <code className="text-[11.5px]">
            docs/design/mascot-motion-registers.md
          </code>
          .
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REGISTERS.map((r) => (
            <div
              key={r.k}
              className="rounded-lg border border-rd-border bg-rd-bg-card p-4 shadow-rd"
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-[14px] font-semibold text-rd-text">
                  {r.name}
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-rd-text-eyebrow">
                  {r.state}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-rd-text-secondary">
                {r.blurb}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

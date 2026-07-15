import React, { useEffect, useRef, useState } from "react";
import { Wand2, CheckCircle2, Loader2, Circle, RotateCcw } from "lucide-react";
import CanvasCvDocument from "./CanvasCvDocument";

// CV-generation moment (idea #19; kokonutUI AILoadingState, rethemed). Honest
// theater: every status line maps to a real stage of the production tailoring
// pipeline. Fixture-mode — no LLM, no writes; a timed sequence + a hand-rolled
// SVG progress ring, ending with the (fixture) CV sliding in. Reduced-motion
// skips straight to the CV.
const STAGES = [
  "Reading the job's requirements",
  "Selecting your strongest experience",
  "Grounding every number against your profile",
  "Matching voice rules",
  "Final anti-fabrication check",
];
const STAGE_MS = 950;

// Hand-rolled progress ring (SVG, no deps).
function ProgressRing({ progress, size = 84, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--rd-border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--rd-coral)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        style={{
          transition: "stroke-dashoffset .5s cubic-bezier(.22,.61,.36,1)",
        }}
      />
    </svg>
  );
}

export default function CanvasCvGeneration() {
  const [phase, setPhase] = useState("idle"); // idle | generating | done
  const [stage, setStage] = useState(0);
  const timers = useRef([]);
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (reduce) {
      setStage(STAGES.length);
      setPhase("done");
      return;
    }
    setPhase("generating");
    setStage(0);
    STAGES.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => setStage(i + 1), STAGE_MS * (i + 1)),
      );
    });
    timers.current.push(
      setTimeout(() => setPhase("done"), STAGE_MS * STAGES.length + 500),
    );
  };

  const progress = phase === "done" ? 1 : stage / STAGES.length;
  const pct = Math.round(progress * 100);

  if (phase === "generating") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="relative inline-flex items-center justify-center">
          <ProgressRing progress={progress} />
          <span className="absolute font-display font-extrabold text-[18px] text-rd-text tabular-nums">
            {pct}%
          </span>
        </div>
        <p className="mt-5 text-[10px] uppercase tracking-[0.1em] font-mono text-rd-text-eyebrow">
          Generating tailored CV
        </p>
        <ul className="mt-3 w-full max-w-[340px] space-y-1.5 text-left">
          {STAGES.map((label, i) => {
            const state =
              i < stage ? "done" : i === stage ? "active" : "pending";
            return (
              <li
                key={label}
                className={`flex items-center gap-2 text-[12.5px] transition-colors ${
                  state === "pending" ? "text-rd-text-tertiary" : "text-rd-text"
                }`}
              >
                {state === "done" ? (
                  <CheckCircle2 className="w-4 h-4 text-rd-teal flex-shrink-0" />
                ) : state === "active" ? (
                  <Loader2 className="w-4 h-4 text-rd-coral flex-shrink-0 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4 text-rd-text-tertiary flex-shrink-0" />
                )}
                <span
                  className={state === "done" ? "text-rd-text-secondary" : ""}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[10.5px] text-rd-text-tertiary italic max-w-[320px] leading-[1.5]">
          Prototype theater — but every line is a real stage of the production
          tailoring pipeline.
        </p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="h-full flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-rd-border-subtle">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-display font-bold text-rd-teal-dark">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tailored to Lemonade ·
            Business Analyst, Growth
          </span>
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1 text-[11px] font-display font-semibold text-rd-text-secondary hover:text-rd-text transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Regenerate
          </button>
        </div>
        <div className="cx-cv-slidein flex-1 min-h-0 overflow-y-auto">
          <CanvasCvDocument />
        </div>
        <style>{`
          @keyframes cxCvSlide { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
          .cx-cv-slidein { animation: cxCvSlide .5s cubic-bezier(.22,.61,.36,1) both; }
          @media (prefers-reduced-motion: reduce) { .cx-cv-slidein { animation: none; } }
        `}</style>
      </div>
    );
  }

  // idle
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-rd-border-subtle">
        <span className="text-[10px] uppercase tracking-[0.1em] font-mono text-rd-text-eyebrow">
          Your master CV
        </span>
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-1.5 font-display font-semibold text-[11.5px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-3 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-1"
        >
          <Wand2 className="w-3.5 h-3.5" /> Generate tailored CV
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <CanvasCvDocument />
      </div>
    </div>
  );
}

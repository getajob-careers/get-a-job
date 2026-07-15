import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

// Shared CV-generation flow (wave-2 feedback #4). Any trigger — the CV-tab hero
// button, a job-card "Tailor CV" action, the coach — calls start(label). The
// theater then plays as a FIXED, viewport-anchored overlay (not down-page,
// where the user is looking), switches to the CV tab, and on completion lands
// the view on the tailored CV. Honest stages = real pipeline steps. Fixture
// timers only; prefers-reduced-motion jumps straight to the tailored CV.
const STAGES = [
  "Reading the job's requirements",
  "Selecting your strongest experience",
  "Grounding every number against your profile",
  "Matching voice rules",
  "Final anti-fabrication check",
];
const STAGE_MS = 950;

const CvGenContext = createContext(null);
export const useCvGen = () => useContext(CvGenContext);

function ProgressRing({ progress, size = 96, stroke = 7 }) {
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

export function CvGenProvider({ onStart, onDone, children }) {
  const [phase, setPhase] = useState("idle"); // idle | generating | done
  const [stage, setStage] = useState(0);
  const [label, setLabel] = useState("Lemonade · Business Analyst, Growth");
  const timers = useRef([]);
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = (lbl) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (lbl) setLabel(lbl);
    onStart?.(); // e.g. switch to the CV tab
    if (reduce) {
      setStage(STAGES.length);
      setPhase("done");
      onDone?.();
      return;
    }
    setStage(0);
    setPhase("generating");
    STAGES.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => setStage(i + 1), STAGE_MS * (i + 1)),
      );
    });
    timers.current.push(
      setTimeout(
        () => {
          setPhase("done");
          onDone?.();
        },
        STAGE_MS * STAGES.length + 500,
      ),
    );
  };
  const reset = () => setPhase("idle");

  const progress = stage / STAGES.length;
  const pct = Math.round(progress * 100);

  return (
    <CvGenContext.Provider value={{ phase, label, start, reset }}>
      {children}
      {phase === "generating" &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-[rgba(40,25,10,0.45)]">
            <div className="w-full max-w-[380px] rounded-[20px] bg-rd-bg-card border border-rd-border shadow-[0_24px_60px_rgba(40,25,10,0.28)] px-6 py-7 text-center">
              <div className="relative inline-flex items-center justify-center">
                <ProgressRing progress={progress} />
                <span className="absolute font-display font-extrabold text-[20px] text-rd-text tabular-nums">
                  {pct}%
                </span>
              </div>
              <p className="mt-4 text-[10px] uppercase tracking-[0.1em] font-mono text-rd-text-eyebrow">
                Generating tailored CV
              </p>
              <ul className="mt-3 space-y-1.5 text-left">
                {STAGES.map((s, i) => {
                  const st =
                    i < stage ? "done" : i === stage ? "active" : "pending";
                  return (
                    <li
                      key={s}
                      className={`flex items-center gap-2 text-[12.5px] ${
                        st === "pending"
                          ? "text-rd-text-tertiary"
                          : "text-rd-text"
                      }`}
                    >
                      {st === "done" ? (
                        <CheckCircle2 className="w-4 h-4 text-rd-teal flex-shrink-0" />
                      ) : st === "active" ? (
                        <Loader2 className="w-4 h-4 text-rd-coral flex-shrink-0 animate-spin" />
                      ) : (
                        <Circle className="w-4 h-4 text-rd-text-tertiary flex-shrink-0" />
                      )}
                      <span
                        className={
                          st === "done" ? "text-rd-text-secondary" : ""
                        }
                      >
                        {s}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-[10.5px] text-rd-text-tertiary italic leading-[1.5]">
                Prototype theater — but every line is a real stage of the
                production tailoring pipeline.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </CvGenContext.Provider>
  );
}

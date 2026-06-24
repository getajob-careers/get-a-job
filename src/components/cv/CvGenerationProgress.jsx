import { useEffect, useRef, useState } from "react";

// Simulated-but-honest CV generation progress.
//
// CV generation is a single LLM call with NO streamed progress (~18-36s observed),
// so this is a paced simulation, not a real backend percentage. It eases toward
// ~90% over a 35s baseline (decelerating, so it slows as it nears 90), HOLDS at 90
// with the stage label still rotating, then SNAPS to 100% when the real response
// lands (jumping from wherever it is on an early finish). Past ~45s it swaps to a
// "still working" label + shimmer so it never looks stalled. It must never sit at a
// fabricated 100% before the response arrives.
//
// The pacing math (easedPct / stageLabel) is exported + unit-tested, and is mirrored
// verbatim by the extension's vanilla implementation so the two surfaces match.

export const BASELINE_MS = 35000;
export const LONGTAIL_MS = 45000;
export const HOLD_PCT = 90;

export const STAGES = [
  { t: 0, label: "Scanning the job description" },
  { t: 5000, label: "Finding your relevant experience" },
  { t: 13000, label: "Selecting your strongest stories" },
  { t: 22000, label: "Tailoring your CV to this role" },
  { t: 32000, label: "Finalizing" },
];
export const LONGTAIL_LABEL = "Still working, almost there";

// Decelerating ease-out 0 -> 90 over the baseline, then hold at 90.
export function easedPct(elapsedMs) {
  const x = Math.min(Math.max(elapsedMs, 0) / BASELINE_MS, 1);
  return HOLD_PCT * (1 - Math.pow(1 - x, 2.2));
}

export function stageLabel(elapsedMs) {
  if (elapsedMs >= LONGTAIL_MS) return LONGTAIL_LABEL;
  let label = STAGES[0].label;
  for (const s of STAGES) if (elapsedMs >= s.t) label = s.label;
  return label;
}

// status: 'idle' | 'loading' | 'success' | 'error'
//  - loading : ease toward 90 and hold, rotating labels.
//  - success : snap from wherever it is to 100, then dismiss (calls onIdle).
//  - error   : clear immediately (calls onIdle) — never leaves the bar hanging.
export default function CvGenerationProgress({ status, onIdle }) {
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState(STAGES[0].label);
  const [longtail, setLongtail] = useState(false);
  const [done, setDone] = useState(false);
  const pctRef = useRef(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  // Loading: rAF loop easing toward 90 and holding.
  useEffect(() => {
    if (status !== "loading") return;
    setDone(false);
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = easedPct(elapsed);
      pctRef.current = p;
      setPct(p);
      setLabel(stageLabel(elapsed));
      setLongtail(elapsed >= LONGTAIL_MS);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status]);

  // Success -> smooth snap to 100, then dismiss. Error -> clear immediately.
  useEffect(() => {
    if (status === "success") {
      cancelAnimationFrame(rafRef.current);
      setLongtail(false);
      setDone(true);
      setLabel("Done");
      const from = pctRef.current;
      const t0 = Date.now();
      const DUR = 450;
      const snap = () => {
        const k = Math.min((Date.now() - t0) / DUR, 1);
        const p = from + (100 - from) * k;
        pctRef.current = p;
        setPct(p);
        if (k < 1) rafRef.current = requestAnimationFrame(snap);
        else {
          const id = setTimeout(() => onIdle && onIdle(), 350);
          rafRef.current = -id; // store for cleanup
        }
      };
      rafRef.current = requestAnimationFrame(snap);
      return () => {
        if (rafRef.current < 0) clearTimeout(-rafRef.current);
        else cancelAnimationFrame(rafRef.current);
      };
    }
    if (status === "error") {
      cancelAnimationFrame(rafRef.current);
      if (onIdle) onIdle();
    }
    // onIdle/pctRef are stable refs/callbacks; intentionally keyed on status only.
  }, [status]);

  if (status === "idle") return null;

  const shown = Math.round(pct);
  return (
    <div
      className="rounded-lg border border-[#E4DBCB] bg-[#FBF7F1] p-3"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[13px] text-[#211D18]"
          style={{
            fontFamily: "var(--rd-font-display, 'Rokkitt', Georgia, serif)",
          }}
        >
          {label}
        </span>
        <span className="text-[11px] tabular-nums text-[#857F74]">
          {shown}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#E8E8E5] overflow-hidden">
        <div
          className={`h-full rounded-full bg-[#F87060] transition-[width] duration-150 ease-out ${
            longtail && !done ? "cv-progress-shimmer" : ""
          }`}
          style={{ width: `${Math.max(2, shown)}%` }}
        />
      </div>
    </div>
  );
}

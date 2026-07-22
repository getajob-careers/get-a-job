import React, { useEffect, useRef } from "react";
import { Wand2, CheckCircle2, RotateCcw, ChevronDown } from "lucide-react";
import CanvasCvDocument from "./CanvasCvDocument";
import { useCvGen } from "./CvGenContext";

// CV-tab center. The generation THEATER now lives in a shared, viewport-anchored
// overlay (CvGenContext) so it plays where the user is looking and fires from any
// trigger. This component owns the always-visible header row: a Master CV
// selector + the "Generate tailored CV" hero button (idea #4a). On done it shows
// the tailored CV and lands the scroll on its top.
export default function CanvasCvGeneration() {
  const gen = useCvGen();
  const done = gen?.phase === "done";
  const scrollRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (done) {
      // Land the view on the tailored CV (scroll the panel into view for the
      // stacked layout) and reset its own scroll to the top.
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [done]);

  return (
    <div ref={rootRef} className="md:h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-rd-border-subtle">
        {done ? (
          <span className="inline-flex items-center gap-1.5 rd-t-body-s font-display font-bold text-rd-teal-dark min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Tailored to {gen?.label}</span>
          </span>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rd-t-body-s font-display font-semibold text-rd-text hover:text-rd-primary transition-colors"
          >
            Master CV · Noa Ben-David
            <ChevronDown className="w-3.5 h-3.5 text-rd-text-tertiary" />
          </button>
        )}
        <button
          type="button"
          onClick={() => gen?.start(done ? gen.label : undefined)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 font-display font-semibold rd-t-body-s text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-3.5 py-1.5 shadow-rd rd-press rd-btn-sheen focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-1"
        >
          {done ? (
            <RotateCcw className="w-3.5 h-3.5" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )}
          {done ? "Regenerate" : "Generate tailored CV"}
        </button>
      </div>

      <div
        ref={scrollRef}
        className={`cx-fade-y flex-1 min-h-0 md:overflow-y-auto ${done ? "cx-cv-slidein" : ""}`}
      >
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

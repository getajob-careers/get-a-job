// PROD ORIGINAL: src/components/tracker/ApplicationDetailDrawer.jsx →
// ApplicationRow.jsx (canvas clone; read-only stand-in for the 9-tab detail)
import React, { useEffect } from "react";
import { X, MapPin, CircleCheck, Circle } from "lucide-react";

// Read-only fixture stand-in for ApplicationDetailDrawer (which wraps the
// write-heavy ApplicationRow / 9 tabs). The design canvas only needs to show
// what an opened application looks like; nothing here writes. Right-docked
// panel, --rd-* tokens, Esc + backdrop to close.

const STEPS = [
  "Qualify yourself for the role",
  "Dissect the job description",
  "Tailor your CV",
  "Map your skill evidence",
  "Find a referral contact",
  "Submit the application",
  "Prep for the interview (STAR)",
];

// How many steps read as "done", by pipeline stage — purely illustrative.
const DONE_BY_STATUS = {
  interested: 1,
  preparing: 3,
  applied: 6,
  interviewing: 7,
  offer: 7,
  accepted: 7,
  rejected: 6,
};

export default function CanvasAppDrawer({ app, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!app) return null;
  const done = DONE_BY_STATUS[app.status] ?? 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-[rgba(40,25,10,0.35)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-md h-full bg-rd-bg-soft border-l border-rd-border overflow-y-auto shadow-[0_0_60px_rgba(40,25,10,0.25)]">
        <div className="sticky top-0 flex items-start justify-between gap-3 px-5 pt-5 pb-4 bg-rd-bg-soft border-b border-rd-border">
          <div className="min-w-0">
            <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow">
              {app.status}
            </p>
            <h2 className="font-display font-extrabold rd-t-display-s text-rd-text leading-[1.15] mt-0.5 break-words">
              {app.role_title}
            </h2>
            <p className="rd-t-body-s text-rd-text-secondary mt-1 inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              {[app.company, app.location].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-card transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {app.note && (
            <div className="rd-r-md bg-rd-bg-card border border-rd-border-subtle p-3.5">
              <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1.5">
                Your note
              </p>
              <p className="rd-t-body-m text-rd-text-secondary leading-[1.55]">
                {app.note}
              </p>
            </div>
          )}

          <div>
            <p className="rd-t-micro uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-2">
              7-step process
            </p>
            <ul className="space-y-1.5">
              {STEPS.map((step, i) => {
                const complete = i < done;
                return (
                  <li key={i} className="flex items-center gap-2 rd-t-body-s">
                    {complete ? (
                      <CircleCheck
                        className="w-4 h-4 text-rd-teal flex-shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="w-4 h-4 text-rd-text-tertiary flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={
                        complete
                          ? "text-rd-text-tertiary line-through"
                          : "text-rd-text"
                      }
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="rd-t-micro text-rd-text-tertiary leading-[1.5] italic">
            Prototype: this detail view is read-only fixture data. The live app
            opens the full steps checklist here.
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect } from "react";
import { Check, X, ExternalLink, Plus } from "lucide-react";
import { deriveJobDisplay } from "@/lib/jobCardDisplay";

// Fixture-safe clone of JobDetailModal for the design canvas. Same
// deriveJobDisplay()-driven band/chips/strengths/gaps as prod so the visual
// matches, but: Track calls the local onTrack (no addJobToTracker / DB write),
// and the description comes from the fixture job (no useJobDescription query).

export default function CanvasJobModal({
  job,
  scoreResult,
  tracked,
  onTrack,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!job) return null;
  const d = deriveJobDisplay(job, scoreResult, { showAttainabilityBand: true });
  const subLine = [
    job.company_name,
    job.location_city,
    job.is_remote ? "Remote" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(40,25,10,0.45)]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${job.title} at ${job.company_name || "company"}`}
    >
      <div
        className="bg-rd-bg-card rounded-[20px] w-full max-w-[540px] max-h-[88vh] flex flex-col overflow-hidden shadow-[0_24px_60px_rgba(40,25,10,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3.5 border-b border-rd-border flex items-start gap-3">
          <span
            className="flex-shrink-0 inline-flex items-center justify-center w-[46px] h-[46px] rounded-[11px] font-display font-extrabold text-[18px]"
            style={{
              background: "var(--rd-bg-soft)",
              color: "var(--rd-text-secondary)",
            }}
            aria-hidden="true"
          >
            {job.company_name?.[0] || "?"}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-extrabold text-[19px] leading-[1.15] text-rd-text break-words">
              {job.title}
            </h2>
            <p className="text-[12px] text-rd-text-secondary mt-0.5 break-words">
              {subLine}
            </p>
            {job.is_agency && (
              <span className="inline-flex items-center mt-1 text-[10px] bg-rd-golden-tint text-rd-golden-dark rounded-full px-1.5 py-0.5">
                via staffing agency
              </span>
            )}
          </div>
          {d.bandMeta && (
            <span
              className="flex-shrink-0 inline-flex items-baseline gap-1 font-display rounded-full px-2.5 py-1"
              style={{ background: d.bandMeta.bg, color: d.bandMeta.fg }}
            >
              <span className="font-extrabold text-[12px]">
                {d.bandMeta.label}
              </span>
              {d.attainPct != null && (
                <span className="font-semibold text-[10.5px] opacity-70">
                  {d.attainPct}%
                </span>
              )}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 p-1 rounded-md text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-soft transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto">
          {d.reasonText && (
            <p className="text-[12.5px] text-rd-text-secondary leading-[1.55] mb-4">
              {d.reasonText}
            </p>
          )}

          {d.matchedSkills.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1.5">
                Your strengths
              </p>
              <div className="flex flex-wrap gap-1.5">
                {d.matchedSkills.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11.5px] px-2.5 py-0.5 rounded-full bg-rd-teal-tint text-rd-teal-dark"
                  >
                    <Check className="w-2.5 h-2.5" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {d.missingCoreSkills.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1.5">
                Skill gaps
              </p>
              <div className="flex flex-wrap gap-1.5">
                {d.missingCoreSkills.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11.5px] px-2.5 py-0.5 rounded-full bg-rd-bg-soft text-rd-text-tertiary border border-rd-border"
                  >
                    <X className="w-2.5 h-2.5" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] uppercase tracking-[0.09em] font-mono text-rd-text-eyebrow mb-1.5">
            Job description
          </p>
          <p className="text-[12.5px] text-rd-text-secondary leading-[1.65] whitespace-pre-line">
            {job.description || "No description provided."}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-rd-border bg-rd-bg-page flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onTrack?.(job)}
            disabled={tracked}
            className="inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] rounded-full px-4 py-2 transition-colors disabled:cursor-not-allowed"
            style={
              tracked
                ? {
                    background: "var(--rd-teal-tint)",
                    color: "var(--rd-teal-dark)",
                  }
                : { background: "var(--rd-bg-soft)", color: "var(--rd-text)" }
            }
          >
            {tracked ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {tracked ? "Tracked" : "Track"}
          </button>
          <a
            href={job.apply_url || "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-4 py-2 transition-colors"
          >
            Apply <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

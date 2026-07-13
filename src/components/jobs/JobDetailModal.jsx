import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, ExternalLink, Plus, Loader2 } from "lucide-react";
import CompanyLogo from "@/components/jobs/CompanyLogo";
import AgencyBadge from "@/components/jobs/AgencyBadge";
import { useCompanyDomains, companyDomainFor } from "@/lib/queries/useCompanyDomains";
import { useJobDescription } from "@/lib/queries/useJobDescription";
import { addJobToTracker } from "@/components/jobs/JobCard";
import { deriveJobDisplay, RD_TRACK_STYLES } from "@/lib/jobCardDisplay";

// Full job detail in a centered modal, opened by clicking a JobGridCard.
// Holds everything the compact card omits: the band/score, the matchedreason,
// all strengths + gaps, the full description (fetched on demand, usually
// already warm from the card's hover-prefetch), and Track / Apply.
export default function JobDetailModal({ job, scoreResult = null, trackColor = null, unified = false, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: companyDomains } = useCompanyDomains();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const { data: description, isLoading: loadingDesc } = useJobDescription(job.id, { seed: job.description });

  // Close on Esc + lock background scroll while open.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const d = deriveJobDisplay(job, scoreResult, { showAttainabilityBand: unified, trackColor });
  const styles = trackColor ? RD_TRACK_STYLES[trackColor] : null;
  const companyDomain = companyDomainFor(companyDomains, job);
  const subLine = [
    job.company_name,
    job.location_city || job.location_raw,
    job.is_remote ? "Remote" : null,
    ...d.chips.slice(2), // posted-date chip
  ].filter(Boolean).join(" · ");

  const handleAdd = async () => {
    setAdding(true);
    setAdded(true);
    const res = await addJobToTracker({ user, queryClient, job, scoreResult });
    setAdding(false);
    if (res?.error) {
      setAdded(false);
      toast.error("Couldn't add to your pipeline. Try again.");
    }
  };

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
          <CompanyLogo
            domain={companyDomain}
            companyName={job.company_name}
            fallbackStyle={styles ? { background: styles.tint, color: styles.accent } : { background: "var(--rd-bg-soft)", color: "var(--rd-text-secondary)" }}
            size={46}
            radius={11}
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-extrabold text-[19px] leading-[1.15] text-rd-text break-words">
              {job.title}
            </h2>
            <p className="text-[12px] text-rd-text-secondary mt-0.5 break-words">{subLine}</p>
            {job.is_agency && (
              <div className="mt-1.5">
                <AgencyBadge isAgency />
              </div>
            )}
          </div>
          {d.scored && (d.bandMeta || d.badgeStyle) && (
            <span
              className="flex-shrink-0 inline-flex items-baseline gap-1 font-display rounded-full px-2.5 py-1"
              style={d.bandMeta ? { background: d.bandMeta.bg, color: d.bandMeta.fg } : d.badgeStyle}
            >
              <span className="font-extrabold text-[12px]">{d.bandMeta ? d.bandMeta.label : `${d.score}%`}</span>
              {d.bandMeta && d.attainPct != null && <span className="font-semibold text-[10.5px] opacity-70">{d.attainPct}%</span>}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 p-1 rounded-md text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-soft transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto">
          {d.scored && d.reasonText && (
            <p className="text-[12.5px] text-rd-text-secondary leading-[1.55] mb-4">{d.reasonText}</p>
          )}

          {d.matchedSkills.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1.5">Your strengths</p>
              <div className="flex flex-wrap gap-1.5">
                {d.matchedSkills.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11.5px] px-2.5 py-0.5 rounded-full bg-rd-teal-tint text-rd-teal-dark">
                    <Check className="w-2.5 h-2.5" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {d.missingCoreSkills.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1.5">Skill gaps</p>
              <div className="flex flex-wrap gap-1.5">
                {d.missingCoreSkills.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[11.5px] px-2.5 py-0.5 rounded-full bg-rd-bg-soft text-rd-text-tertiary border border-rd-border">
                    <X className="w-2.5 h-2.5" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1.5">Job description</p>
          {loadingDesc ? (
            <p className="text-[12px] text-rd-text-tertiary inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </p>
          ) : (
            <p className="text-[12.5px] text-rd-text-secondary leading-[1.65] whitespace-pre-line">
              {description || "No description provided."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-rd-border bg-rd-bg-page flex justify-end gap-2.5">
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || added}
            className="inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] rounded-full px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={added ? { background: "var(--rd-teal-tint)", color: "var(--rd-teal-dark)" } : { background: "var(--rd-bg-soft)", color: "var(--rd-text)" }}
          >
            {added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {added ? "Tracked" : "Track"}
          </button>
          {job.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-4 py-2 transition-colors"
            >
              Apply <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

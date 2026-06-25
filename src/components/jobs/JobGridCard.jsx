import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import CompanyLogo from "@/components/jobs/CompanyLogo";
import { useCompanyDomains, companyDomainFor } from "@/lib/queries/useCompanyDomains";
import { prefetchJobDescription } from "@/lib/queries/useJobDescription";
import { deriveJobDisplay, RD_TRACK_STYLES } from "@/lib/jobCardDisplay";

// Compact job card for the 3-across grid. The whole card is one click target
// that opens the JobDetailModal; hovering prefetches the description so the
// modal opens instantly. Heavy content (full description, all strengths/gaps,
// Track/Apply) lives in the modal — the card face stays light.
export default function JobGridCard({ job, scoreResult = null, trackColor = null, unified = false, onOpen }) {
  const queryClient = useQueryClient();
  const { data: companyDomains } = useCompanyDomains();
  const companyDomain = companyDomainFor(companyDomains, job);

  const d = deriveJobDisplay(job, scoreResult, { showAttainabilityBand: unified, trackColor });
  const styles = trackColor ? RD_TRACK_STYLES[trackColor] : null;
  const fallbackStyle = styles
    ? { background: styles.tint, color: styles.accent }
    : { background: "var(--rd-bg-soft)", color: "var(--rd-text-secondary)" };

  const open = () => onOpen?.(job, scoreResult);
  const warm = () => prefetchJobDescription(queryClient, job.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onMouseEnter={warm}
      onFocus={warm}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="group cursor-pointer bg-rd-bg-card border border-rd-border rounded-[14px] p-3 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-rd-border-hover hover:shadow-rd focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2"
    >
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <CompanyLogo
          domain={companyDomain}
          companyName={job.company_name}
          fallbackStyle={fallbackStyle}
          size={34}
          radius={8}
        />
        {d.scored && d.bandMeta ? (
          <span
            className="flex-shrink-0 inline-flex items-baseline gap-1 font-display rounded-full px-2 py-0.5"
            style={{ background: d.bandMeta.bg, color: d.bandMeta.fg }}
          >
            <span className="font-extrabold text-[11px]">{d.bandMeta.label}</span>
            {d.attainPct != null && <span className="font-semibold text-[10px] opacity-70">{d.attainPct}%</span>}
          </span>
        ) : d.scored && d.badgeStyle ? (
          <span
            className="flex-shrink-0 inline-flex items-center font-display font-extrabold text-[11px] rounded-full px-2 py-0.5"
            style={d.badgeStyle}
          >
            {d.score}%
          </span>
        ) : null}
      </div>

      <h3 className="font-display font-bold text-[13.5px] leading-[1.18] text-rd-text line-clamp-2 break-words">
        {job.title}
      </h3>
      <p className="text-[10.5px] text-rd-text-secondary mt-0.5 truncate">
        {[job.company_name, job.location_city || job.location_raw].filter(Boolean).join(" · ")}
      </p>

      {d.chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {d.chips.map((c, i) => (
            <span key={i} className="text-[10px] bg-rd-bg-soft text-rd-text-tertiary rounded-[5px] px-1.5 py-0.5">
              {c}
            </span>
          ))}
        </div>
      )}

      {d.matchedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {d.matchedSkills.slice(0, 2).map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 text-[10px] bg-rd-teal-tint text-rd-teal-dark rounded-full px-1.5 py-0.5 whitespace-nowrap"
            >
              <Check className="w-2.5 h-2.5" />
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

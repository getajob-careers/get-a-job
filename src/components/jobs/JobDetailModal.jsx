import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, ExternalLink, Plus, Loader2, Wand2 } from "lucide-react";
import useJobCardActions from "@/hooks/useJobCardActions";
import CompanyLogo from "@/components/jobs/CompanyLogo";
import AgencyBadge from "@/components/jobs/AgencyBadge";
import ScoreRing, { ScoreBreakdown } from "@/components/jobs/ScoreRing";
import {
  useCompanyDomains,
  companyDomainFor,
} from "@/lib/queries/useCompanyDomains";
import { useJobDescription } from "@/lib/queries/useJobDescription";
import { addJobToTracker } from "@/components/jobs/JobCard";
import { deriveJobDisplay, RD_TRACK_STYLES } from "@/lib/jobCardDisplay";
import { isNextDesign } from "@/lib/nextDesign";

// Flag-on enter/exit for the modal. 200ms is in the approved motion set; the
// exit is deferred-unmount (the panel plays the reverse, THEN the parent
// unmounts it), so closing never snaps.
const MODAL_ANIM_MS = 200;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Full job detail in a centered modal, opened by clicking a JobGridCard.
// Holds everything the compact card omits: the band/score, the matchedreason,
// all strengths + gaps, the full description (fetched on demand, usually
// already warm from the card's hover-prefetch), and Track / Apply.
export default function JobDetailModal({
  job,
  scoreResult = null,
  trackColor = null,
  unified = false,
  onClose,
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: companyDomains } = useCompanyDomains();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const { data: description, isLoading: loadingDesc } = useJobDescription(
    job.id,
    { seed: job.description },
  );

  // Flag-on enter/exit. `alive` gates the richer visuals (ring header, tint);
  // `animated` additionally requires no reduced-motion preference and gates the
  // fade+scale + deferred-unmount. Flag-off both are false -> byte-identical.
  const alive = isNextDesign();
  const animated = alive && !prefersReducedMotion();
  // Flag-on: the same #635 idempotent Generate-CV flow the card hover-action
  // and rail use, so the modal offers the product's primary verb at the exact
  // decision point. `enabled` gates the applications fetch to flag-on only.
  const { tailoring: generating, onGenerateCv } = useJobCardActions(
    job,
    scoreResult,
    { enabled: alive },
  );
  // Tightened section-eyebrow recipe (flag-on): crisper + denser than the old
  // label - smaller, a touch more tracking, semibold, tighter bottom margin.
  // Batch D applies this same recipe to the CV-rail headers. Flag off ->
  // the original eyebrow, byte-identical.
  const eyebrow = alive
    ? "text-[9.5px] uppercase tracking-[0.12em] font-semibold text-rd-text-eyebrow font-mono mb-1"
    : "text-[10px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1.5";
  // shown drives the enter/exit transition; starts false when animated so the
  // panel mounts hidden then flips visible on the next frame.
  const [shown, setShown] = useState(!animated);
  const closeTimer = useRef(null);

  // Deferred-unmount close: play the exit, THEN call the parent onClose (which
  // unmounts). Flag-off / reduced motion closes immediately.
  const requestClose = useCallback(() => {
    if (!animated) {
      onClose?.();
      return;
    }
    setShown(false);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => onClose?.(), MODAL_ANIM_MS);
  }, [animated, onClose]);

  // Enter: flip to shown on the next frame after mount.
  useEffect(() => {
    if (!animated) return undefined;
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [animated]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Close on Esc + lock background scroll while open.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [requestClose]);

  const d = deriveJobDisplay(job, scoreResult, {
    showAttainabilityBand: unified,
    trackColor,
  });
  const styles = trackColor ? RD_TRACK_STYLES[trackColor] : null;
  const companyDomain = companyDomainFor(companyDomains, job);
  // Flag-on: a faint band-tinted header wash + the always-visible Match
  // breakdown pinned below the title row (needs a band to colour + read from).
  const headerTint =
    alive && d.bandMeta?.bg
      ? {
          background: `color-mix(in srgb, ${d.bandMeta.bg} 22%, var(--rd-bg-card))`,
        }
      : undefined;
  const showBreakdown = alive && d.scored && !!d.bandMeta;
  const subLine = [
    job.company_name,
    job.location_city || job.location_raw,
    job.is_remote ? "Remote" : null,
    ...d.chips.slice(2), // posted-date chip
  ]
    .filter(Boolean)
    .join(" · ");

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
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(40,25,10,0.45)]${
        animated
          ? ` transition-opacity duration-200 ease-out ${shown ? "opacity-100" : "opacity-0"}`
          : ""
      }`}
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${job.title} at ${job.company_name || "company"}`}
    >
      <div
        className={`bg-rd-bg-card rounded-[20px] w-full max-w-[540px] max-h-[88vh] flex flex-col overflow-hidden shadow-[0_24px_60px_rgba(40,25,10,0.28)]${
          animated
            ? ` transition-[opacity,transform] duration-200 ease-out ${shown ? "opacity-100 scale-100" : "opacity-0 scale-95"}`
            : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header. Flag-on: a faint band-tinted wash for depth. When the
            breakdown block follows (flag-on), the border-b moves to it so the
            header + breakdown read as one pinned unit. */}
        <div
          className={
            showBreakdown
              ? "flex-shrink-0 px-5 pt-4 pb-3.5 flex items-start gap-3"
              : "flex-shrink-0 px-5 pt-4 pb-3.5 border-b border-rd-border flex items-start gap-3"
          }
          style={headerTint}
        >
          <CompanyLogo
            domain={companyDomain}
            companyName={job.company_name}
            fallbackStyle={
              styles
                ? { background: styles.tint, color: styles.accent }
                : {
                    background: "var(--rd-bg-soft)",
                    color: "var(--rd-text-secondary)",
                  }
            }
            size={46}
            radius={11}
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-extrabold text-[19px] leading-[1.15] text-rd-text break-words">
              {job.title}
            </h2>
            <p className="text-[12px] text-rd-text-secondary mt-0.5 break-words">
              {subLine}
            </p>
            {job.is_agency && (
              <div className="mt-1.5">
                <AgencyBadge isAgency />
              </div>
            )}
          </div>
          {/* Score. Flag-on: the ScoreRing the cards use (with the band label
              beneath) so the modal reads as the same object, enlarged. Flag
              off: the original text badge, byte-identical. */}
          {alive && d.scored && d.bandMeta ? (
            <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
              <ScoreRing
                pct={d.attainPct ?? d.score ?? 0}
                fg={d.bandMeta.fg}
                bg={d.bandMeta.bg}
                size={46}
                animate={animated}
              />
              <span
                className="font-display font-bold text-[10px] uppercase tracking-[0.06em]"
                style={{ color: d.bandMeta.fg }}
              >
                {d.bandMeta.label}
              </span>
            </div>
          ) : (
            d.scored &&
            (d.bandMeta || d.badgeStyle) && (
              <span
                className="flex-shrink-0 inline-flex items-baseline gap-1 font-display rounded-full px-2.5 py-1"
                style={
                  d.bandMeta
                    ? { background: d.bandMeta.bg, color: d.bandMeta.fg }
                    : d.badgeStyle
                }
              >
                <span className="font-extrabold text-[12px]">
                  {d.bandMeta ? d.bandMeta.label : `${d.score}%`}
                </span>
                {d.bandMeta && d.attainPct != null && (
                  <span className="font-semibold text-[10.5px] opacity-70">
                    {d.attainPct}%
                  </span>
                )}
              </span>
            )
          )}
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex-shrink-0 p-1 rounded-md text-rd-text-tertiary hover:text-rd-text hover:bg-rd-bg-soft transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Flag-on: the Skills / Experience / Seniority breakdown, VISIBLE BY
            DEFAULT (no hover) - the modal is where the decision happens. Same
            ScoreBreakdown the card's ring-hover uses, so numbers + treatment
            are identical. Pinned (flex-shrink-0) with the header wash. */}
        {showBreakdown && (
          <div
            className="flex-shrink-0 px-5 pb-4 border-b border-rd-border"
            style={headerTint}
          >
            <ScoreBreakdown scoreResult={scoreResult} color={d.bandMeta.fg} />
          </div>
        )}

        {/* Body. flex-1 + min-h-0 so it can shrink inside the flex-col panel
            (max-h-[88vh], overflow-hidden) and its own overflow-y-auto engages -
            without min-h-0 the flexbox min-height:auto floor keeps it at content
            height and long descriptions get clipped unscrollably. Pre-existing
            on main; fixed here for both flag states. */}
        <div className="flex-1 min-h-0 px-5 py-4 overflow-y-auto">
          {d.scored && d.reasonText && (
            <p className="text-[12.5px] text-rd-text-secondary leading-[1.55] mb-4">
              {d.reasonText}
            </p>
          )}

          {d.matchedSkills.length > 0 && (
            <div className="mb-4">
              <p className={eyebrow}>Your strengths</p>
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
              <p className={eyebrow}>Skill gaps</p>
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

          <p className={eyebrow}>Job description</p>
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
        <div className="flex-shrink-0 px-5 py-3 border-t border-rd-border bg-rd-bg-page flex justify-end gap-2.5">
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || added}
            className="inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] rounded-full px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={
              added
                ? {
                    background: "var(--rd-teal-tint)",
                    color: "var(--rd-teal-dark)",
                  }
                : { background: "var(--rd-bg-soft)", color: "var(--rd-text)" }
            }
          >
            {added ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {added ? "Tracked" : "Track"}
          </button>
          {job.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className={
                alive
                  ? "inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] text-rd-text bg-rd-bg-card border border-rd-border hover:border-rd-border-hover rounded-full px-4 py-2 transition-colors"
                  : "inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-4 py-2 transition-colors"
              }
            >
              Apply <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {alive && (
            <button
              type="button"
              onClick={onGenerateCv}
              disabled={generating}
              className="inline-flex items-center gap-1.5 font-display font-semibold text-[12.5px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              Generate CV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

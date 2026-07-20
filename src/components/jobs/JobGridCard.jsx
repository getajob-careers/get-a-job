import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import CompanyLogo from "@/components/jobs/CompanyLogo";
import AgencyBadge from "@/components/jobs/AgencyBadge";
import {
  useCompanyDomains,
  companyDomainFor,
} from "@/lib/queries/useCompanyDomains";
import {
  prefetchJobDescription,
  useJobDescription,
} from "@/lib/queries/useJobDescription";
import { deriveJobDisplay, RD_TRACK_STYLES } from "@/lib/jobCardDisplay";
import { scoringV2Enabled } from "@/lib/flags";
import { useCountUp } from "@/hooks/useCountUp";
import { isNextDesign } from "@/lib/nextDesign";
import ScoreRing from "@/components/jobs/ScoreRing";

// Compact job card for the 2-up grid. The whole card is one click target that
// opens the full JobDetailModal. Hovering prefetches the description; dwelling
// ~450ms shows a lightweight, non-blocking PEEK popover (more strengths + a
// description snippet) so a browsing user can scan without opening the modal.
const PEEK_DELAY_MS = 450;
const PEEK_SNIPPET_CHARS = 200;
// Hover-intent is shared across all cards: the FIRST peek requires a dwell,
// but once a peek has been shown, subsequent hovers open instantly — until
// the user idles briefly (PEEK_REARM_MS with no hovering), which re-arms the
// dwell. Module-level so it's shared between card instances.
const PEEK_REARM_MS = 1500;
let peekArmed = false;
let peekRearmTimer = null;

// While the list is scrolling, cards slide under a stationary cursor and the
// browser fires spurious mouseenter events — which (when armed) would pop peeks
// open just to be dismissed on the next wheel tick, a flicker loop. Track the
// last wheel/scroll time globally and refuse to open a peek until the list has
// been quiet for SCROLL_QUIET_MS, so scrolling stays smooth and peeks only
// appear on a deliberate, settled hover.
const SCROLL_QUIET_MS = 220;
let lastScrollAt = 0;
let scrollTrackerInstalled = false;
function installScrollTracker() {
  if (scrollTrackerInstalled || typeof window === "undefined") return;
  scrollTrackerInstalled = true;
  const mark = () => {
    lastScrollAt = Date.now();
  };
  window.addEventListener("wheel", mark, { passive: true, capture: true });
  window.addEventListener("scroll", mark, { passive: true, capture: true });
}

export default function JobGridCard({
  job,
  scoreResult = null,
  trackColor = null,
  unified = false,
  onOpen,
  // Aliveness pass: passed only by the flag-on jobs grid (capped to the first
  // rows). className/style carry the stagger entrance; animateScore ramps the
  // match badge. All default to no-op, so flag-off callers stay byte-identical.
  className = "",
  style = undefined,
  animateScore = false,
}) {
  const queryClient = useQueryClient();
  const { data: companyDomains } = useCompanyDomains();
  const companyDomain = companyDomainFor(companyDomains, job);

  const d = deriveJobDisplay(job, scoreResult, {
    showAttainabilityBand: unified,
    trackColor,
  });
  // Count-up the CARD match badge only (not the peek popover). enabled:false
  // returns the value immediately, so flag-off / uncapped cards are byte-identical.
  const attainShown = useCountUp(
    typeof d.attainPct === "number" ? d.attainPct : 0,
    { enabled: animateScore && typeof d.attainPct === "number" },
  );
  const scoreShown = useCountUp(typeof d.score === "number" ? d.score : 0, {
    enabled: animateScore && typeof d.score === "number",
  });
  const styles = trackColor ? RD_TRACK_STYLES[trackColor] : null;
  // Batch A (Jobs card material): flag-on, the card adopts the canvas warm
  // paper-lift (resting + hover elevation, borderless) using the current --rd-*
  // tokens - palette locked. Flag-off keeps the flat bordered card verbatim
  // (byte-identical). Applies wherever the card renders flag-on (feed, rail, search).
  const alive = isNextDesign();
  const fallbackStyle = styles
    ? { background: styles.tint, color: styles.accent }
    : { background: "var(--rd-bg-soft)", color: "var(--rd-text-secondary)" };

  const wrapRef = useRef(null);
  const peekRef = useRef(null);
  const dwellRef = useRef(null);
  const [peek, setPeek] = useState(false);
  // Viewport rect of the card, captured when the peek opens. The peek is
  // portaled to <body> and positioned with `fixed` from this rect so it
  // escapes the jobs column's overflow-y-auto clip (which was cutting the
  // popover off near the bottom of the scroll area).
  const [rect, setRect] = useState(null);
  // Spotlight cursor-glow (flag-on): track the pointer over the card and write
  // --sx/--sy for the .cx-spot radial. rAF-throttled, and onMouseMove is per-card
  // so only the hovered card's handler runs - a long feed stays cheap.
  const cardRef = useRef(null);
  const spotRafRef = useRef(0);
  const onCardMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(spotRafRef.current);
    spotRafRef.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--sx", `${clientX - r.left}px`);
      el.style.setProperty("--sy", `${clientY - r.top}px`);
    });
  };
  useEffect(() => {
    installScrollTracker();
    return () => {
      clearTimeout(dwellRef.current);
      cancelAnimationFrame(spotRafRef.current);
    };
  }, []);

  // Description only needed for the peek snippet — read it once we're peeking
  // (warm from the hover prefetch by then). Seeded if the row carried it.
  const { data: description } = useJobDescription(job.id, {
    enabled: peek,
    seed: job.description,
  });

  const open = () => {
    setPeek(false);
    onOpen?.(job, scoreResult);
  };

  const openPeek = () => {
    if (wrapRef.current) setRect(wrapRef.current.getBoundingClientRect());
    setPeek(true);
    peekArmed = true;
  };
  // Open after the dwell — but if the list is mid-scroll, WAIT it out and open
  // once it settles rather than bailing. That keeps scrolling flicker-free yet
  // still pops the peek for the card the cursor ends up resting on, without
  // making the user move off and back onto it.
  const tryOpenPeek = () => {
    const sinceScroll = Date.now() - lastScrollAt;
    if (sinceScroll < SCROLL_QUIET_MS) {
      dwellRef.current = setTimeout(
        tryOpenPeek,
        SCROLL_QUIET_MS - sinceScroll + 20,
      );
      return;
    }
    openPeek();
  };
  const handleEnter = () => {
    prefetchJobDescription(queryClient, job.id);
    clearTimeout(peekRearmTimer);
    clearTimeout(dwellRef.current);
    // No delay once the user is "armed" from a prior peek; full dwell first time.
    dwellRef.current = setTimeout(tryOpenPeek, peekArmed ? 0 : PEEK_DELAY_MS);
  };
  // Leaving the card only cancels a PENDING open — closing an already-open
  // peek is owned by the global hit-test below (mouseleave is unreliable for a
  // body-portaled popover that can appear under a stationary cursor).
  const handleLeave = () => clearTimeout(dwellRef.current);

  // Close the peek when the pointer is outside BOTH the card and the popover,
  // or as soon as the user scrolls. Driven by a window-level hit-test rather
  // than enter/leave so a peek that opens directly under the cursor doesn't
  // immediately flicker shut.
  useEffect(() => {
    if (!peek) return undefined;
    const close = () => {
      setPeek(false);
      clearTimeout(peekRearmTimer);
      peekRearmTimer = setTimeout(() => {
        peekArmed = false;
      }, PEEK_REARM_MS);
    };
    const TOL = 6;
    const inside = (r, x, y) =>
      r &&
      x >= r.left - TOL &&
      x <= r.right + TOL &&
      y >= r.top - TOL &&
      y <= r.bottom + TOL;
    const onMove = (e) => {
      const cardR = wrapRef.current?.getBoundingClientRect();
      const peekR = peekRef.current?.getBoundingClientRect();
      if (
        !inside(cardR, e.clientX, e.clientY) &&
        !inside(peekR, e.clientX, e.clientY)
      )
        close();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", close, true);
    // The peek is portaled out of the scrolling jobs column, so wheeling over
    // it scrolls nothing and would trap the user. Dismiss on wheel — the next
    // wheel tick then scrolls the jobs as normal.
    window.addEventListener("wheel", close, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("wheel", close);
    };
  }, [peek]);

  const snippet = (description || "").trim().slice(0, PEEK_SNIPPET_CHARS);

  // Position the peek over the card, flipping to open upward when there isn't
  // room below; cap its height to the available space (it scrolls internally
  // if its content is taller, so it's never cut off by the viewport edge).
  let peekStyle = null;
  if (rect) {
    const GAP = 12;
    const spaceBelow = window.innerHeight - rect.top;
    const spaceAbove = rect.bottom;
    const downward = spaceBelow >= 280 || spaceBelow >= spaceAbove;
    peekStyle = downward
      ? {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          maxHeight: Math.max(160, spaceBelow - GAP),
        }
      : {
          left: rect.left,
          bottom: window.innerHeight - rect.bottom,
          width: rect.width,
          maxHeight: Math.max(160, spaceAbove - GAP),
        };
  }

  return (
    <div
      ref={wrapRef}
      className={className ? `relative h-full ${className}` : "relative h-full"}
      style={style}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onClick={open}
        onMouseMove={alive ? onCardMove : undefined}
        onFocus={() => prefetchJobDescription(queryClient, job.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        className={
          alive
            ? "group relative isolate cursor-pointer h-full flex flex-col bg-rd-bg-card rounded-[14px] p-3 rd-lift rd-lift-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2"
            : "group cursor-pointer h-full flex flex-col bg-rd-bg-card border border-rd-border rounded-[14px] p-3 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-rd-border-hover hover:shadow-rd focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-coral focus-visible:ring-offset-2"
        }
      >
        {alive && <span className="cx-spot" aria-hidden="true" />}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <CompanyLogo
            domain={companyDomain}
            companyName={job.company_name}
            fallbackStyle={fallbackStyle}
            size={34}
            radius={8}
          />
          {alive && d.scored && (d.bandMeta || d.badgeStyle) ? (
            <ScoreRing
              pct={
                d.bandMeta
                  ? typeof d.attainPct === "number"
                    ? d.attainPct
                    : (d.score ?? 0)
                  : (d.score ?? 0)
              }
              fg={d.bandMeta ? d.bandMeta.fg : d.badgeStyle?.color}
              bg={d.bandMeta ? d.bandMeta.bg : d.badgeStyle?.background}
              animate={animateScore}
            />
          ) : d.scored && d.bandMeta ? (
            <span
              className="flex-shrink-0 inline-flex items-baseline gap-1 font-display rounded-full px-2 py-0.5"
              style={{ background: d.bandMeta.bg, color: d.bandMeta.fg }}
            >
              <span className="font-extrabold text-[11px]">
                {d.bandMeta.label}
              </span>
              {d.attainPct != null && (
                <span className="font-semibold text-[10px] opacity-70">
                  {attainShown}%
                </span>
              )}
            </span>
          ) : d.scored && d.badgeStyle ? (
            <span
              className="flex-shrink-0 inline-flex items-center font-display font-extrabold text-[11px] rounded-full px-2 py-0.5"
              style={d.badgeStyle}
            >
              {scoreShown}%
            </span>
          ) : null}
        </div>

        <h3 className="font-display font-bold text-[13.5px] leading-[1.18] text-rd-text line-clamp-2 break-words">
          {job.title}
        </h3>
        <p className="text-[10.5px] text-rd-text-secondary mt-0.5 truncate">
          {[job.company_name, job.location_city || job.location_raw]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {/* Component 2b: quiet direction tag. Shown only in the unified for-you
            feed AND only with ?scoring_v2, so the direction axis appears in
            lockstep with the rank_score re-rank it explains, never the re-rank
            without the reason. A small dot + label, not a redesign; the full
            visual treatment is the canvas port's job (same d.direction). */}
        {unified && scoringV2Enabled() && d.direction && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-rd-text-secondary">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: d.direction.dot }}
              aria-hidden="true"
            />
            {d.direction.label}
          </span>
        )}

        {job.is_agency && (
          <div className="mt-1">
            <AgencyBadge isAgency />
          </div>
        )}

        {d.chips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {d.chips.map((c, i) => (
              <span
                key={i}
                className="text-[10px] bg-rd-bg-soft text-rd-text-tertiary rounded-[5px] px-1.5 py-0.5"
              >
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

      {/* Delayed-hover peek — an expanded version of the card, overlaid OVER
          it, portaled to <body> and positioned with `fixed` so the jobs
          column's overflow scroll can't clip it. Clickable: opens the modal. */}
      {peek &&
        peekStyle &&
        createPortal(
          <div
            ref={peekRef}
            onClick={open}
            style={{ position: "fixed", zIndex: 60, ...peekStyle }}
            className="cursor-pointer overflow-y-auto bg-rd-bg-card border border-rd-border-hover rounded-[14px] shadow-[0_18px_40px_rgba(40,25,10,0.20)] p-3"
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
                  <span className="font-extrabold text-[11px]">
                    {d.bandMeta.label}
                  </span>
                  {d.attainPct != null && (
                    <span className="font-semibold text-[10px] opacity-70">
                      {d.attainPct}%
                    </span>
                  )}
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
            <h3 className="font-display font-bold text-[13.5px] leading-[1.18] text-rd-text break-words">
              {job.title}
            </h3>
            <p className="text-[10.5px] text-rd-text-secondary mt-0.5 truncate">
              {[job.company_name, job.location_city || job.location_raw]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {job.is_agency && (
              <div className="mt-1 mb-2">
                <AgencyBadge isAgency />
              </div>
            )}
            {!job.is_agency && <div className="mb-2" />}

            {d.matchedSkills.length > 0 && (
              <>
                <p className="text-[9px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1">
                  Your strengths
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {d.matchedSkills.slice(0, 5).map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 text-[10px] bg-rd-teal-tint text-rd-teal-dark rounded-full px-1.5 py-0.5"
                    >
                      <Check className="w-2.5 h-2.5" />
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}
            {d.missingCoreSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {d.missingCoreSkills.slice(0, 3).map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 text-[10px] bg-rd-bg-soft text-rd-text-tertiary border border-rd-border rounded-full px-1.5 py-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                    {s}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[9px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono mb-1">
              Description
            </p>
            <p className="text-[11px] text-rd-text-secondary leading-[1.55]">
              {snippet
                ? `${snippet}${(description || "").length > PEEK_SNIPPET_CHARS ? "…" : ""}`
                : "Loading preview…"}
            </p>
            <p className="text-[10px] text-rd-coral-dark font-medium mt-2">
              Click for full details →
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}

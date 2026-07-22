import React, { useEffect, useRef, useState } from "react";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  ClipboardList,
  BookText,
  Linkedin,
  FileText,
  MessageCircle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { track, EVENTS } from "@/lib/analytics";
import { useFakeProgress } from "@/lib/useFakeProgress";
import { TRACKS } from "@/lib/trackConfig";

// Restyled for PR 2C — behaviour identical to the Direction-3 version.
// All 4 render states preserved: skip-pending + setup running, skip-pending +
// setup complete, returning-user gate, and the slide carousel. All 6 slides
// keep their copy 1:1 (product copy — restyle only). useFakeProgress runs
// against EXPECTED_SETUP_MS to drive the setup percent, and skipFiredRef
// still guards against double-fire of onTutorialEnd. All 4 analytics events
// (STARTED, SLIDE_VIEWED, COMPLETED, SKIPPED) fire as before.
//
// Visual changes:
//   - Peach outer frame around a white inner card (signature onboarding
//     chrome from the mockups).
//   - 4-dot brand logo + "Get A Job" wordmark in the header.
//   - Cream-tinted preview panel that surfaces the slide icon + copy.
//   - Coral primary CTA, soft-beige secondary, 6-dot carousel indicator.

const SLIDES = [
  {
    name: "browse_jobs",
    title: "Browse jobs",
    description:
      "Score any role for a personalised fit breakdown. Your 5-year goal anchors every match score - sharper goal, sharper signal.",
    Icon: Briefcase,
  },
  {
    name: "application_tracker",
    title: "Application tracker",
    description:
      "Track every application, follow-up, and interview in one place. Status updates, notes, and reminder dates - nothing falls through the cracks.",
    Icon: ClipboardList,
  },
  {
    name: "story_bank",
    title: "Story bank",
    description:
      "Capture the stories behind your experiences. Reusable across CVs, interviews, and LinkedIn posts - written once, reused everywhere.",
    Icon: BookText,
  },
  {
    name: "linkedin_hub",
    title: "LinkedIn hub",
    description:
      "Optimize your profile, draft posts in your voice, and run networking outreach with AI assist. Needs your LinkedIn data export - request it now if you haven't.",
    Icon: Linkedin,
  },
  {
    name: "cv_generation",
    title: "CV generation",
    description:
      "Tailored CVs per job application in seconds. AI matches your story bank against the job description and produces a one-page CV ready to send.",
    Icon: FileText,
  },
  {
    name: "chat_agents",
    title: "Chat agents",
    description:
      "Specialist AI agents for career strategy, application reviews, interview prep, and skill building. Each one knows your full profile.",
    Icon: MessageCircle,
  },
];

// Setup work takes ~80s worst case (analysis 40s + finalise 40s).
const EXPECTED_SETUP_MS = 80_000;

/**
 * Onboarding tutorial — user-paced slide carousel. Background career-analysis
 * + task-generation run in the parent. "Go to platform" enables once (a) the
 * user reaches the final slide AND (b) setupComplete is true.
 *
 * If analysis fails, the parent falls back to handleFinalise silently — the
 * tutorial never surfaces an error. Home's self-heal useEffect retries on
 * next visit.
 *
 * Props:
 *   isReturningUser  — true when has_seen_onboarding_tutorial && !onboarding_complete
 *   setupComplete    — true once handleSurveyNext + handleFinalise are done
 *   onTutorialEnd    — fires on "Go to platform" or Skip
 */
export default function OnboardingTutorial({
  isReturningUser,
  setupComplete,
  onTutorialEnd,
}) {
  const [gateAcknowledged, setGateAcknowledged] = useState(!isReturningUser);
  const [slideIndex, setSlideIndex] = useState(0);
  const [allSlidesSeen, setAllSlidesSeen] = useState(false);
  // True when a returning user clicks Skip BEFORE setupComplete. Holds them
  // on a "Finishing setup…" view until the background pipeline finishes so
  // Home doesn't bounce them back. Guarded by a ref so onTutorialEnd's
  // changing identity across renders can't re-fire the navigation.
  const [skipPending, setSkipPending] = useState(false);
  // True once the user finishes the tour: holds them on the completion beat
  // until they click through to the platform.
  const [showComplete, setShowComplete] = useState(false);
  const skipFiredRef = useRef(false);
  const startedAtRef = useRef(Date.now());
  const startedEventRef = useRef(false);
  const seenSlidesRef = useRef(new Set());

  const setupPercent = useFakeProgress(setupComplete, EXPECTED_SETUP_MS);

  useEffect(() => {
    if (!gateAcknowledged) return;
    if (startedEventRef.current) return;
    startedEventRef.current = true;
    startedAtRef.current = Date.now();
    track(EVENTS.ONBOARDING_TUTORIAL_STARTED, {
      is_returning_user: !!isReturningUser,
      total_slides: SLIDES.length,
    });
  }, [gateAcknowledged, isReturningUser]);

  useEffect(() => {
    if (!gateAcknowledged) return;
    const key = SLIDES[slideIndex]?.name;
    if (!key || seenSlidesRef.current.has(key)) return;
    seenSlidesRef.current.add(key);
    track(EVENTS.ONBOARDING_TUTORIAL_SLIDE_VIEWED, {
      slide_index: slideIndex,
      slide_name: key,
    });
    if (slideIndex >= SLIDES.length - 1) {
      setAllSlidesSeen(true);
    }
  }, [slideIndex, gateAcknowledged]);

  const goPrev = () => {
    if (slideIndex > 0) setSlideIndex((i) => i - 1);
  };
  const goNext = () => {
    if (slideIndex < SLIDES.length - 1) setSlideIndex((i) => i + 1);
  };

  const handleGoToPlatform = () => {
    const slidesSeen = seenSlidesRef.current.size;
    const durationMs = Date.now() - startedAtRef.current;
    track(EVENTS.ONBOARDING_TUTORIAL_COMPLETED, {
      slides_seen: slidesSeen,
      duration_ms: durationMs,
    });
    // Final onboarding beat: a completion screen before handing off to the
    // platform. Navigation happens from the completion step's onDone.
    setShowComplete(true);
  };

  const fireSkip = () => {
    if (skipFiredRef.current) return;
    skipFiredRef.current = true;
    track(EVENTS.ONBOARDING_TUTORIAL_SKIPPED, {
      reason: "returning_user_skip_gate",
    });
    onTutorialEnd({ skipped: true });
  };

  const handleSkipGate = () => {
    // If setup is still running, hand off to the "Finishing setup…" view.
    // The user clicks again from the "Setup complete" view to navigate —
    // we never auto-navigate while they may be on another tab.
    if (!setupComplete) {
      setSkipPending(true);
      return;
    }
    fireSkip();
  };

  // ───── Skip flow: pending (waiting for setup) → ready (explicit click) ─
  // We never auto-fire onTutorialEnd from a useEffect — that caused the
  // tab-switching navigation race where setupComplete flipping in the
  // background navigated to Home without the user looking.
  if (skipPending && !skipFiredRef.current) {
    if (!setupComplete) {
      return (
        <FullScreenShell>
          <div className="max-w-md mx-auto text-center space-y-6">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-rd-primary" />
            <div>
              <h2 className="font-display font-extrabold text-[24px] leading-[1.15] tracking-tight text-rd-text">
                Finishing setup…
              </h2>
              <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-2">
                We&apos;re wrapping up your career analysis in the background.
                We&apos;ll let you know as soon as it&apos;s ready.
              </p>
            </div>
            <ProgressBar percent={setupPercent} />
            <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
              Setup {setupPercent}%
            </p>
          </div>
        </FullScreenShell>
      );
    }
    return (
      <FullScreenShell>
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-rd-primary-tint text-rd-primary flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-[24px] leading-[1.15] tracking-tight text-rd-text">
              Setup complete
            </h2>
            <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-2">
              Your dashboard is ready when you are.
            </p>
          </div>
          <PrimaryButton onClick={fireSkip}>
            Continue to platform <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        </div>
      </FullScreenShell>
    );
  }

  // ───── Completion step (final onboarding beat) ─────
  if (showComplete) {
    return (
      <OnboardingCompleteStep
        onDone={() => onTutorialEnd({ skipped: false })}
      />
    );
  }

  // ───── Returning-user gate ─────
  if (!gateAcknowledged) {
    return (
      <FullScreenShell>
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-rd-primary-tint text-rd-primary flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-[24px] leading-[1.15] tracking-tight text-rd-text">
              Welcome back
            </h2>
            <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-2">
              You&apos;ve been through the platform tour before. Skip it and
              head straight in, or watch it again if you&apos;d like a
              refresher.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <PrimaryButton onClick={handleSkipGate}>
              Skip tutorial - I&apos;ve seen this before
            </PrimaryButton>
            <SecondaryButton onClick={() => setGateAcknowledged(true)}>
              Show me again
            </SecondaryButton>
          </div>
        </div>
      </FullScreenShell>
    );
  }

  // ───── Tutorial render ─────
  const isFinalSlide = slideIndex === SLIDES.length - 1;
  const goToPlatformEnabled = allSlidesSeen && setupComplete;
  const slide = SLIDES[slideIndex];

  return (
    <FullScreenShell>
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Slide {slideIndex + 1} of {SLIDES.length}
          </p>
          <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
            Setup {setupPercent}%
          </p>
        </div>

        <ProgressBar percent={setupPercent} />

        <div className="mt-7">
          <Slide slide={slide} isFirstSlide={slideIndex === 0} />
        </div>

        <div className="mt-7 flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={[
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                i === slideIndex
                  ? "w-7 bg-rd-primary"
                  : "w-1.5 bg-rd-border hover:bg-rd-border-hover",
              ].join(" ")}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <SecondaryButton
            onClick={goPrev}
            disabled={slideIndex === 0}
            aria-label="Previous slide"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </SecondaryButton>

          {isFinalSlide ? (
            <PrimaryButton
              onClick={handleGoToPlatform}
              disabled={!goToPlatformEnabled}
            >
              {goToPlatformEnabled ? (
                <>
                  Go to platform <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finalising…
                </>
              )}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={goNext} aria-label="Next slide">
              Next <ArrowRight className="w-4 h-4" />
            </PrimaryButton>
          )}
        </div>
      </div>
    </FullScreenShell>
  );
}

// Final onboarding step: a completion beat that hands off to the platform.
// It's the only "you're all set" moment in the flow — the last tutorial slide
// is a feature slide, not a celebration — so it stays even though the extension
// promo it once carried has been removed. onDone drives navigation.
export function OnboardingCompleteStep({ onDone }) {
  return (
    <FullScreenShell>
      <div className="max-w-md mx-auto text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-rd-primary-tint text-rd-primary flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-extrabold text-[24px] leading-[1.15] tracking-tight text-rd-text">
            You&apos;re all set!
          </h2>
          <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-2">
            Your workspace is ready - your career analysis, tailored tracks, and
            first actions are waiting inside.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <PrimaryButton onClick={() => onDone()}>
            Go to platform <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        </div>
      </div>
    </FullScreenShell>
  );
}

// Track cards on the Browse Jobs slide source from @/lib/trackConfig so the
// labels and copy can't drift from the Roadmap's TRACK_CONFIG. Single source
// of truth for track vocabulary across onboarding + roadmap + role cards.

function Slide({ slide, isFirstSlide }) {
  const { Icon, title, description, name } = slide;
  const isBrowseJobs = name === "browse_jobs";
  const isLinkedinHub = name === "linkedin_hub";

  return (
    <div className="text-center">
      {isFirstSlide && (
        <p className="font-display font-bold text-[13px] text-rd-primary-dark mb-3.5">
          You&apos;re all set 🎉
        </p>
      )}

      <div className="bg-rd-bg-soft border border-rd-border rounded-[18px] px-5 py-7 sm:px-7">
        <div className="w-14 h-14 rounded-2xl bg-rd-bg-card border border-rd-border flex items-center justify-center mx-auto shadow-[0_10px_28px_rgba(40,25,10,0.07)]">
          <Icon className="w-6 h-6 text-rd-primary" />
        </div>
        {isBrowseJobs && (
          <div className="mt-5 max-w-md mx-auto bg-rd-bg-card border border-rd-border rounded-[13px] px-3.5 py-3 text-left shadow-[0_10px_28px_rgba(40,25,10,0.07)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-rd-text flex items-center justify-center flex-shrink-0">
                <span className="font-display font-bold text-white text-[15px]">
                  m
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-[13.5px] text-rd-text truncate">
                  Associate Product Manager
                </div>
                <div className="text-[11px] text-rd-text-tertiary">
                  monday.com · Tel Aviv
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display font-extrabold text-[18px] text-rd-primary-dark leading-none">
                  88%
                </div>
                <div className="text-[9px] tracking-[0.04em] uppercase text-rd-text-tertiary mt-0.5">
                  Match
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2.5">
              <span className="text-[10px] text-rd-text-secondary bg-rd-bg-soft rounded-md px-2 py-0.5">
                Entry-level
              </span>
              <span className="text-[10px] text-rd-text-secondary bg-rd-bg-soft rounded-md px-2 py-0.5">
                Hybrid
              </span>
            </div>
          </div>
        )}
      </div>

      <h3 className="font-display font-extrabold text-[25px] sm:text-[26px] leading-[1.15] tracking-tight text-rd-text mt-5">
        {title}
      </h3>
      <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-2 max-w-md mx-auto">
        {description}
      </p>

      {isBrowseJobs && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5 max-w-xl mx-auto">
          {TRACKS.map((t) => (
            <div
              key={t.number}
              className="bg-rd-bg-card border border-rd-border rounded-[12px] p-3 text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rd-bg-soft text-rd-text flex items-center justify-center font-display font-bold text-[12px]">
                  {t.number}
                </div>
                <div className="font-display font-semibold text-[12px] text-rd-text">
                  Track {t.number} · {t.name}
                </div>
              </div>
              <p className="text-[11px] text-rd-text-secondary leading-snug mt-1.5">
                {t.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {isLinkedinHub && (
        <a
          href="https://www.linkedin.com/mypreferences/d/download-my-data"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-display font-semibold text-rd-text bg-rd-bg-card border border-rd-border rounded-full px-4 py-2 hover:border-rd-border-hover transition-colors"
        >
          Request data export now <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div
      className="h-[5px] rounded-full overflow-hidden"
      style={{ background: "var(--rd-border-subtle)" }}
    >
      <div
        className="h-full transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%`, background: "var(--rd-primary)" }}
      />
    </div>
  );
}

function BrandMark() {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      <div className="grid grid-cols-2 gap-[3px]">
        <span className="w-[7px] h-[7px] rounded-full bg-rd-primary" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-golden" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-teal" />
        <span className="w-[7px] h-[7px] rounded-full bg-rd-text" />
      </div>
      <span className="font-display font-bold text-[17px] tracking-tight text-rd-text">
        Get A Job
      </span>
    </div>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-5 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center gap-1.5 font-display font-semibold text-[13px] text-rd-text-secondary bg-rd-bg-soft hover:bg-rd-bg-card hover:text-rd-text rounded-full px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function FullScreenShell({ children }) {
  return (
    <div className="min-h-screen bg-rd-bg-page font-body text-rd-text px-4 py-6 sm:px-6 sm:py-8">
      <div
        className="max-w-2xl mx-auto rounded-[26px] p-[13px]"
        style={{ background: "var(--rd-peach)" }}
      >
        <div className="bg-rd-bg-card rounded-[18px] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <BrandMark />
              <Link
                to="/Landing"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline text-[12px] text-rd-text-secondary hover:text-rd-text transition-colors"
              >
                About Get A Job
              </Link>
            </div>
            <p className="text-[10.5px] uppercase tracking-[0.09em] font-medium text-rd-text-eyebrow font-mono">
              Platform tour
            </p>
          </div>
          <main className="px-6 py-8 sm:px-8 sm:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

// Re-export for testability.
export { SLIDES, EXPECTED_SETUP_MS };

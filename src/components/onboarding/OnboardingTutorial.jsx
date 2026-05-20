import React, { useEffect, useRef, useState } from "react";
import { Loader2, ArrowRight, ArrowLeft, Briefcase, ClipboardList, BookText, Linkedin, FileText, MessageCircle, RotateCcw, CheckCircle2, ExternalLink } from "lucide-react";
import { track, EVENTS } from "@/lib/analytics";
import { useFakeProgress } from "@/lib/useFakeProgress";

// Slide content. User navigates manually via arrow buttons — no auto-advance.
// Visuals are placeholder icons + descriptions until real screenshots land.
const SLIDES = [
  {
    name: "browse_jobs",
    title: "Browse jobs",
    description: "Score any role for a personalised fit breakdown.",
    Icon: Briefcase,
  },
  {
    name: "application_tracker",
    title: "Application tracker",
    description:
      "Track every application, follow-up, and interview in one place. Status updates, notes, and reminder dates — nothing falls through the cracks.",
    Icon: ClipboardList,
  },
  {
    name: "story_bank",
    title: "Story bank",
    description:
      "Capture the stories behind your experiences. Reusable across CVs, interviews, and LinkedIn posts — written once, reused everywhere.",
    Icon: BookText,
  },
  {
    name: "linkedin_hub",
    title: "LinkedIn hub",
    description:
      "Optimize your profile, draft posts in your voice, and run networking outreach with AI assist. Needs your LinkedIn data export — request it now if you haven't.",
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
      "Specialist AI agents for career strategy, application reviews, interview prep, and salary negotiation. Each one knows your full profile.",
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

  const goPrev = () => { if (slideIndex > 0) setSlideIndex((i) => i - 1); };
  const goNext = () => { if (slideIndex < SLIDES.length - 1) setSlideIndex((i) => i + 1); };

  const handleGoToPlatform = () => {
    const slidesSeen = seenSlidesRef.current.size;
    const durationMs = Date.now() - startedAtRef.current;
    track(EVENTS.ONBOARDING_TUTORIAL_COMPLETED, {
      slides_seen: slidesSeen,
      duration_ms: durationMs,
    });
    onTutorialEnd({ skipped: false });
  };

  const fireSkip = () => {
    if (skipFiredRef.current) return;
    skipFiredRef.current = true;
    track(EVENTS.ONBOARDING_TUTORIAL_SKIPPED, { reason: "returning_user_skip_gate" });
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
      // Still waiting for the background pipeline.
      return (
        <FullScreenShell>
          <div className="max-w-md text-center space-y-6">
            <Loader2 className="w-9 h-9 animate-spin mx-auto text-[#F87060]" />
            <div>
              <h2 className="onb-h1" style={{ fontSize: 24 }}>Finishing setup…</h2>
              <p className="onb-sub">
                We&apos;re wrapping up your career analysis in the background. We&apos;ll let you know as soon as it&apos;s ready.
              </p>
            </div>
            <div className="onb-progress-track" style={{ maxWidth: 240, margin: "0 auto" }}>
              <div className="onb-progress-fill" style={{ width: `${setupPercent}%` }} />
            </div>
            <p className="onb-eyebrow">Setup {setupPercent}%</p>
          </div>
        </FullScreenShell>
      );
    }
    // Setup finished while user was waiting — show a "ready, click to
    // continue" view. Explicit click only. No auto-navigation.
    return (
      <FullScreenShell>
        <div className="max-w-md text-center space-y-6">
          <CheckCircle2 className="w-12 h-12 text-[#1D7556] mx-auto" />
          <div>
            <h2 className="onb-h1" style={{ fontSize: 24 }}>Setup complete</h2>
            <p className="onb-sub">Your dashboard is ready when you are.</p>
          </div>
          <button onClick={fireSkip} className="onb-btn onb-btn-primary">
            Continue to platform <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </FullScreenShell>
    );
  }

  // ───── Returning-user gate ─────
  if (!gateAcknowledged) {
    return (
      <FullScreenShell>
        <div className="max-w-md text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-[#FDE7E3] text-[#F87060] flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="onb-h1" style={{ fontSize: 24 }}>Welcome back</h2>
            <p className="onb-sub">
              You&apos;ve been through the platform tour before. Skip it and head straight in, or watch it again if you&apos;d like a refresher.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={handleSkipGate} className="onb-btn onb-btn-primary">
              Skip tutorial — I&apos;ve seen this before
            </button>
            <button onClick={() => setGateAcknowledged(true)} className="onb-btn onb-btn-outline">
              Show me again
            </button>
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
      <div className="w-full max-w-2xl mx-auto space-y-7">
        <div className="flex items-center justify-between">
          <p className="onb-eyebrow">Slide {slideIndex + 1} of {SLIDES.length}</p>
          <p className="onb-eyebrow">Setup {setupPercent}%</p>
        </div>

        <div className="onb-progress-track">
          <div className="onb-progress-fill" style={{ width: `${setupPercent}%` }} />
        </div>

        <Slide slide={slide} />

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={slideIndex === 0}
            className="onb-btn onb-btn-outline"
            aria-label="Previous slide"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === slideIndex
                    ? "w-8 bg-[#F87060]"
                    : "w-1.5 bg-[#DDDDDB] hover:bg-[#52545A]"
                }`}
              />
            ))}
          </div>

          {isFinalSlide ? (
            <button
              onClick={handleGoToPlatform}
              disabled={!goToPlatformEnabled}
              className="onb-btn onb-btn-primary"
            >
              {goToPlatformEnabled ? (
                <>Go to platform <ArrowRight className="w-4 h-4" /></>
              ) : (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finalising…</>
              )}
            </button>
          ) : (
            <button onClick={goNext} className="onb-btn onb-btn-outline" aria-label="Next slide">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </FullScreenShell>
  );
}

// Tier cards on the Browse Jobs slide — explicit "what this tier means
// for YOU" framing keyed to what the user just told us in onboarding
// (Career Direction). Each line uses "you" / "your" language and tells
// the user what to DO with the tier, not just what it means.
const TIER_CARDS = [
  {
    number: 1,
    name: "Sweet spot",
    color: "green",
    description: "Roles you're qualified for that match where you want your career to go. Apply to these first.",
  },
  {
    number: 2,
    name: "Detour",
    color: "gray",
    description: "Roles you're qualified for, but they'd take your career in a different direction. Good fallbacks if Tier 1 isn't hiring.",
  },
  {
    number: 3,
    name: "Growth",
    color: "amber",
    description: "Roles that match your direction, but you need more experience or skills first. Use these to plan what to learn next.",
  },
];

function Slide({ slide }) {
  const { Icon, title, description, name } = slide;
  const isBrowseJobs = name === "browse_jobs";
  const isLinkedinHub = name === "linkedin_hub";
  return (
    <div className="onb-slide">
      <div className="onb-slide-icon">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="onb-slide-title">{title}</h3>
      <p className="onb-slide-desc">{description}</p>
      {isBrowseJobs && (
        <div className="onb-tier-cards">
          {TIER_CARDS.map((tier) => (
            <div key={tier.number} className="onb-tier-card" data-tier={tier.color}>
              <div className="onb-tier-badge">{tier.number}</div>
              <div className="onb-tier-name">Tier {tier.number} · {tier.name}</div>
              <p className="onb-tier-desc">{tier.description}</p>
            </div>
          ))}
        </div>
      )}
      {isLinkedinHub && (
        <a
          href="https://www.linkedin.com/mypreferences/d/download-my-data"
          target="_blank"
          rel="noopener noreferrer"
          className="onb-btn onb-btn-outline"
          style={{ marginTop: 18 }}
        >
          Request data export now <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

function FullScreenShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-[#DDDDDB]">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <div className="onb-brand">
              <span className="onb-brand-mark">getajob</span>
              <span className="onb-brand-dot" />
            </div>
            <a
              href="/Landing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#9C9DA1] hover:text-[#52545A] inline-flex items-center gap-1 transition-colors"
            >
              About Get A Job <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="onb-eyebrow">Platform tour</p>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center py-10 px-4">
        {children}
      </div>
    </div>
  );
}

// Re-export for testability.
export { SLIDES, EXPECTED_SETUP_MS };

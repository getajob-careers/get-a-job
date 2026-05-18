import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Briefcase, ClipboardList, BookText, Linkedin, FileText, MessageCircle, RotateCcw } from "lucide-react";
import { track, EVENTS } from "@/lib/analytics";
import { useFakeProgress } from "@/lib/useFakeProgress";

// Slide content. Each is 5-10 seconds visible; total ~45-60s.
// Visuals are placeholder icons + descriptions until Eli captures
// real screenshots in a follow-up PR.
const SLIDES = [
  {
    name: "browse_jobs",
    title: "Browse Jobs",
    description:
      "Israeli jobs filtered to your tier. Score any role for a personalized fit breakdown and see what's missing before you apply.",
    Icon: Briefcase,
    durationMs: 8000,
  },
  {
    name: "application_tracker",
    title: "Application Tracker",
    description:
      "Track every application, follow-up, and interview in one place. Stage transitions, notes, and reminder dates — no more lost threads.",
    Icon: ClipboardList,
    durationMs: 7000,
  },
  {
    name: "story_bank",
    title: "Story Bank",
    description:
      "Capture the stories behind your experiences. Reusable across CVs, interviews, and LinkedIn posts — written once, deployed everywhere.",
    Icon: BookText,
    durationMs: 8000,
  },
  {
    name: "linkedin_hub",
    title: "LinkedIn Hub",
    description:
      "Optimize your profile, draft posts in your voice, and run networking outreach with AI assist. Needs your LinkedIn data export — request it now if you haven't.",
    Icon: Linkedin,
    durationMs: 9000,
  },
  {
    name: "cv_generation",
    title: "CV Generation",
    description:
      "Tailored CVs per job application in seconds. AI matches your story bank against the JD and produces a one-page CV ready to send.",
    Icon: FileText,
    durationMs: 8000,
  },
  {
    name: "chat_agents",
    title: "Chat Agents",
    description:
      "Specialist AI agents for career strategy, application reviews, interview prep, and salary negotiation. Each one knows your full profile.",
    Icon: MessageCircle,
    durationMs: 9000,
  },
];

const TOTAL_TUTORIAL_MS = SLIDES.reduce((s, x) => s + x.durationMs, 0);
// Setup work takes ~80s in the worst case (analysis 40s + finalise 40s).
// The fake-progress bar paces itself to feel honest against that window.
const EXPECTED_SETUP_MS = 80_000;

/**
 * The onboarding tutorial that replaces the old "Your Roles" page. Plays
 * 6 auto-advancing slides while career-analysis + task-generation run
 * in the background. Exposes a "Go to platform" button that enables
 * only when (a) all slides have been seen AND (b) the parent's
 * setupComplete flag is true.
 *
 * Props:
 *   isReturningUser  — true when has_seen_onboarding_tutorial && !onboarding_complete
 *   setupComplete    — parent flag; true once handleSurveyNext + handleFinalise are done
 *   setupError       — null OR { kind: "analysis_failed" | "analysis_unrecoverable", retry?, skipToEmpty? }
 *   onTutorialEnd    — called when the user clicks "Go to platform" OR clicks "Skip" on the gate. parent persists has_seen flag + navigates.
 */
export default function OnboardingTutorial({
  isReturningUser,
  setupComplete,
  setupError,
  onTutorialEnd,
}) {
  // Returning-user gate: render the skip-or-watch screen instead of the slides
  // until the user picks one. New users skip this gate entirely.
  const [gateAcknowledged, setGateAcknowledged] = useState(!isReturningUser);

  const [slideIndex, setSlideIndex] = useState(0);
  // True once the LAST slide has been displayed (i.e. user has "seen all slides").
  // Doesn't require the slide to finish — reaching it counts.
  const [allSlidesSeen, setAllSlidesSeen] = useState(false);
  const startedAtRef = useRef(Date.now());
  const startedEventRef = useRef(false);
  const seenSlidesRef = useRef(new Set());

  const setupPercent = useFakeProgress(setupComplete, EXPECTED_SETUP_MS);

  // Fire ONBOARDING_TUTORIAL_STARTED once when the slide deck begins.
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

  // Fire ONBOARDING_TUTORIAL_SLIDE_VIEWED once per slide (de-duped via ref).
  useEffect(() => {
    if (!gateAcknowledged) return;
    const key = SLIDES[slideIndex]?.name;
    if (!key || seenSlidesRef.current.has(key)) return;
    seenSlidesRef.current.add(key);
    track(EVENTS.ONBOARDING_TUTORIAL_SLIDE_VIEWED, {
      slide_index: slideIndex,
      slide_name: key,
    });
  }, [slideIndex, gateAcknowledged]);

  // Auto-advance the slide carousel.
  useEffect(() => {
    if (!gateAcknowledged) return;
    if (slideIndex >= SLIDES.length - 1) {
      // Reached the final slide — record it but stop advancing.
      setAllSlidesSeen(true);
      return undefined;
    }
    const id = setTimeout(() => setSlideIndex((i) => i + 1), SLIDES[slideIndex].durationMs);
    return () => clearTimeout(id);
  }, [slideIndex, gateAcknowledged]);

  const handleGoToPlatform = () => {
    const slidesSeen = seenSlidesRef.current.size;
    const durationMs = Date.now() - startedAtRef.current;
    track(EVENTS.ONBOARDING_TUTORIAL_COMPLETED, {
      slides_seen: slidesSeen,
      duration_ms: durationMs,
    });
    onTutorialEnd({ skipped: false });
  };

  const handleSkipGate = () => {
    track(EVENTS.ONBOARDING_TUTORIAL_SKIPPED, {
      // Skip happened before any slide rendered — slides_seen is always 0.
      reason: "returning_user_skip_gate",
    });
    onTutorialEnd({ skipped: true });
  };

  // ───── Returning-user gate ─────
  if (!gateAcknowledged) {
    return (
      <FullScreenShell>
        <div className="max-w-md text-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6 text-[#525252]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">Welcome back</h2>
            <p className="text-sm text-[#525252] mt-2 leading-relaxed">
              You&apos;ve been through the platform tour before. You can skip it and head straight in,
              or watch it again if you&apos;d like a refresher.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSkipGate}
              className="bg-[#0A0A0A] hover:bg-[#262626] text-sm"
            >
              Skip tutorial — I&apos;ve seen this before
            </Button>
            <Button
              onClick={() => setGateAcknowledged(true)}
              variant="outline"
              className="text-sm"
            >
              Show me again
            </Button>
          </div>
        </div>
      </FullScreenShell>
    );
  }

  // ───── Setup-error states (analysis failed) ─────
  // These overlay the tutorial — the slides keep playing underneath but a
  // banner at the top surfaces the error + recovery affordances.
  const errorBanner = renderErrorBanner(setupError);

  // ───── Final-slide "Finalising" state ─────
  // When user reaches the last slide and setup isn't done, show the
  // prominent finalising panel instead of slide content.
  const isFinalSlide = slideIndex === SLIDES.length - 1;
  const showFinalisingPanel = isFinalSlide && allSlidesSeen && !setupComplete;
  const goToPlatformEnabled = allSlidesSeen && setupComplete && !setupError;

  const slide = SLIDES[slideIndex];

  return (
    <FullScreenShell>
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {errorBanner}

        {/* Slide indicator + setup progress */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">
            Slide {slideIndex + 1} of {SLIDES.length}
          </p>
          <p className="text-[11px] tracking-wider text-[#A3A3A3]">
            Setup {setupPercent}%
          </p>
        </div>

        {/* Progress bar — subtle during tutorial, prominent on finalising panel */}
        <div className={`h-1 bg-[#F0F0F0] rounded-full overflow-hidden ${showFinalisingPanel ? "h-2" : ""}`}>
          <div
            className="h-full bg-[#0A0A0A] transition-all duration-500 ease-out"
            style={{ width: `${setupPercent}%` }}
          />
        </div>

        {/* Slide content OR finalising panel */}
        {showFinalisingPanel ? (
          <FinalisingPanel percent={setupPercent} />
        ) : (
          <Slide
            slideIndex={slideIndex}
            slide={slide}
            totalSlides={SLIDES.length}
            onDotClick={(i) => {
              // Manual nav allowed only to slides already seen — prevents
              // skipping ahead before the auto-advance has reached them.
              if (i <= slideIndex) setSlideIndex(i);
            }}
          />
        )}

        {/* "Go to platform" button — visible only on the last slide */}
        {allSlidesSeen && (
          <div className="flex justify-center">
            <Button
              onClick={handleGoToPlatform}
              disabled={!goToPlatformEnabled}
              className="bg-[#0A0A0A] hover:bg-[#262626] text-sm px-8 flex items-center gap-2"
            >
              {goToPlatformEnabled ? (
                <>Go to platform <ArrowRight className="w-4 h-4" /></>
              ) : setupError ? (
                <>Finishing up...</>
              ) : (
                <><Loader2 className="w-3 h-3 animate-spin" /> Finalising your profile...</>
              )}
            </Button>
          </div>
        )}
      </div>
    </FullScreenShell>
  );
}

function renderErrorBanner(setupError) {
  if (!setupError) return null;
  if (setupError.kind === "analysis_failed") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          Career analysis is taking longer than expected.{" "}
          <button
            onClick={setupError.retry}
            className="font-semibold underline underline-offset-2 hover:text-amber-900"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }
  if (setupError.kind === "analysis_unrecoverable") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
        <p className="text-sm text-amber-800">
          We couldn&apos;t generate your career analysis right now. Please email{" "}
          <a
            href="mailto:support@getajob.careers"
            className="font-semibold underline underline-offset-2"
          >
            support@getajob.careers
          </a>{" "}
          and we&apos;ll fix this. You can continue using the rest of the platform — your roadmap will be empty for now.
        </p>
        {setupError.skipToEmpty && (
          <button
            onClick={setupError.skipToEmpty}
            className="text-xs font-medium text-amber-800 underline underline-offset-2 mt-1"
          >
            Continue to platform anyway
          </button>
        )}
      </div>
    );
  }
  return null;
}

function Slide({ slideIndex, slide, totalSlides, onDotClick }) {
  const { Icon, title, description } = slide;
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-10 min-h-[280px] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#0A0A0A] flex items-center justify-center mb-5">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-[#0A0A0A] tracking-tight">{title}</h3>
        <p className="text-sm text-[#525252] mt-3 leading-relaxed max-w-sm">{description}</p>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: totalSlides }, (_, i) => (
          <button
            key={i}
            onClick={() => onDotClick(i)}
            aria-label={`Go to slide ${i + 1}`}
            disabled={i > slideIndex}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === slideIndex
                ? "w-8 bg-[#0A0A0A]"
                : i < slideIndex
                  ? "w-1.5 bg-[#525252] cursor-pointer hover:bg-[#0A0A0A]"
                  : "w-1.5 bg-[#E5E5E5] cursor-not-allowed"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function FinalisingPanel({ percent }) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl p-10 min-h-[280px] flex flex-col items-center justify-center text-center">
      <Loader2 className="w-10 h-10 animate-spin text-[#525252] mb-5" />
      <h3 className="text-lg font-bold text-[#0A0A0A] tracking-tight">Finalising your profile...</h3>
      <p className="text-sm text-[#525252] mt-3 leading-relaxed max-w-sm">
        Generating tasks, configuring your AI agents, and building your dashboard.
      </p>
      <p className="text-xs text-[#A3A3A3] mt-5 tabular-nums">{percent}% complete</p>
    </div>
  );
}

function FullScreenShell({ children }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <div className="bg-white border-b border-[#E5E5E5] px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-sm font-bold tracking-tight text-[#0A0A0A]">Get A Job</h1>
          <p className="text-[11px] text-[#A3A3A3] tracking-wide uppercase mt-0.5">
            Platform tour
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center py-10 px-4">
        {children}
      </div>
    </div>
  );
}

// Re-export the constants for testability (slide count, expected duration).
export { SLIDES, TOTAL_TUTORIAL_MS, EXPECTED_SETUP_MS };

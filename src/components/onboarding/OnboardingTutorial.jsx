import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ArrowLeft, Briefcase, ClipboardList, BookText, Linkedin, FileText, MessageCircle, RotateCcw } from "lucide-react";
import { track, EVENTS } from "@/lib/analytics";
import { useFakeProgress } from "@/lib/useFakeProgress";

// Slide content. User navigates manually via arrow buttons — no auto-advance.
// Visuals are placeholder icons + descriptions until real screenshots land.
const SLIDES = [
  {
    // Slide 1 has a custom layout (TierQuadrantGrid below the title) — the
    // description is rendered as the closing line BELOW the grid.
    name: "browse_jobs",
    title: "Browse Jobs",
    description: "Score any role for a personalized fit breakdown.",
    Icon: Briefcase,
  },
  {
    name: "application_tracker",
    title: "Application Tracker",
    description:
      "Track every application, follow-up, and interview in one place. Status updates, notes, and reminder dates — nothing falls through the cracks.",
    Icon: ClipboardList,
  },
  {
    name: "story_bank",
    title: "Story Bank",
    description:
      "Capture the stories behind your experiences. Reusable across CVs, interviews, and LinkedIn posts — written once, reused everywhere.",
    Icon: BookText,
  },
  {
    name: "linkedin_hub",
    title: "LinkedIn Hub",
    description:
      "Optimize your profile, draft posts in your voice, and run networking outreach with AI assist. Needs your LinkedIn data export — request it now if you haven't.",
    Icon: Linkedin,
  },
  {
    name: "cv_generation",
    title: "CV Generation",
    description:
      "Tailored CVs per job application in seconds. AI matches your story bank against the job description and produces a one-page CV ready to send.",
    Icon: FileText,
  },
  {
    name: "chat_agents",
    title: "Chat Agents",
    description:
      "Specialist AI agents for career strategy, application reviews, interview prep, and salary negotiation. Each one knows your full profile.",
    Icon: MessageCircle,
  },
];

// Setup work takes ~80s in the worst case (analysis 40s + finalise 40s).
// The fake-progress bar paces itself to feel honest against that window.
const EXPECTED_SETUP_MS = 80_000;

/**
 * Onboarding tutorial — user-paced slide carousel. Background career-analysis
 * + task-generation run in the parent. The "Go to platform" button enables
 * once (a) the user has reached the final slide AND (b) setupComplete is true.
 *
 * If analysis fails, the parent falls back to handleFinalise silently — the
 * tutorial never surfaces an error. Home's self-heal useEffect retries the
 * analysis on the next visit. This keeps the tutorial focused on orientation
 * instead of mixing error UX into the platform tour.
 *
 * Props:
 *   isReturningUser  — true when has_seen_onboarding_tutorial && !onboarding_complete
 *   setupComplete    — parent flag; true once handleSurveyNext + handleFinalise are done
 *   onTutorialEnd    — called when the user clicks "Go to platform" or "Skip" on the gate
 */
export default function OnboardingTutorial({
  isReturningUser,
  setupComplete,
  onTutorialEnd,
}) {
  // Returning-user gate: render the skip-or-watch screen until the user picks
  // one. New users skip this gate entirely.
  const [gateAcknowledged, setGateAcknowledged] = useState(!isReturningUser);

  const [slideIndex, setSlideIndex] = useState(0);
  // Flips true the first time the user lands on the last slide. Doesn't
  // require them to dwell — reaching it is enough.
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
  // Also flip allSlidesSeen when the user reaches the last slide.
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
    onTutorialEnd({ skipped: false });
  };

  const handleSkipGate = () => {
    track(EVENTS.ONBOARDING_TUTORIAL_SKIPPED, {
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

  // ───── Tutorial render ─────
  const isFinalSlide = slideIndex === SLIDES.length - 1;
  const showFinalisingPanel = isFinalSlide && allSlidesSeen && !setupComplete;
  const goToPlatformEnabled = allSlidesSeen && setupComplete;
  const slide = SLIDES[slideIndex];

  return (
    <FullScreenShell>
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {/* Slide indicator + setup progress */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3] font-medium">
            Slide {slideIndex + 1} of {SLIDES.length}
          </p>
          <p className="text-[11px] tracking-wider text-[#A3A3A3]">
            Setup {setupPercent}%
          </p>
        </div>

        {/* Progress bar — subtle during slides, taller on the finalising panel */}
        <div className={`bg-[#F0F0F0] rounded-full overflow-hidden ${showFinalisingPanel ? "h-2" : "h-1"}`}>
          <div
            className="h-full bg-[#0A0A0A] transition-all duration-500 ease-out"
            style={{ width: `${setupPercent}%` }}
          />
        </div>

        {/* Slide content always renders; FinalisingPanel stacks below when
            the user reaches the last slide before setup is done. The slide
            stays readable while setup finishes. */}
        <Slide slide={slide} />
        {showFinalisingPanel && <FinalisingPanel percent={setupPercent} />}

        {/* Arrow navigation + dot indicators */}
        <div className="flex items-center justify-between">
          <Button
            onClick={goPrev}
            disabled={slideIndex === 0}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            aria-label="Previous slide"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === slideIndex
                    ? "w-8 bg-[#0A0A0A]"
                    : "w-1.5 bg-[#D4D4D4] hover:bg-[#525252]"
                }`}
              />
            ))}
          </div>

          {isFinalSlide ? (
            <Button
              onClick={handleGoToPlatform}
              disabled={!goToPlatformEnabled}
              className="bg-[#0A0A0A] hover:bg-[#262626] text-sm flex items-center gap-2"
            >
              {goToPlatformEnabled ? (
                <>Go to platform <ArrowRight className="w-4 h-4" /></>
              ) : (
                <><Loader2 className="w-3 h-3 animate-spin" /> Finalising...</>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5"
              aria-label="Next slide"
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </FullScreenShell>
  );
}

function Slide({ slide }) {
  const { Icon, title, description, name } = slide;
  // Slide 1 (Browse Jobs) gets a tier-explainer bullet list above the
  // closing description line. Other slides render description only.
  const isTierExplainerSlide = name === "browse_jobs";
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl p-10 min-h-[280px] flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-[#0A0A0A] flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-bold text-[#0A0A0A] tracking-tight">{title}</h3>
      {isTierExplainerSlide && <TierBullets />}
      <p className="text-sm text-[#525252] mt-3 leading-relaxed max-w-sm">{description}</p>
    </div>
  );
}

/**
 * Tier explainer — three plain-text bullets. Replaces the original 2x2
 * quadrant grid (the visual didn't land for testers; bullets are clearer
 * within the slide's 5-10s read window). Same content also lives on the
 * Career Roadmap "Why these tiers" tab.
 */
function TierBullets() {
  return (
    <ul className="mt-4 max-w-sm text-left space-y-2">
      <li className="text-sm text-[#525252] leading-relaxed">
        <span className="font-semibold text-emerald-700">Tier 1 — your sweet spot:</span>{" "}
        qualified now AND on your goal path.
      </li>
      <li className="text-sm text-[#525252] leading-relaxed">
        <span className="font-semibold text-[#525252]">Tier 2 — a detour:</span>{" "}
        qualified now, but off your goal path.
      </li>
      <li className="text-sm text-[#525252] leading-relaxed">
        <span className="font-semibold text-amber-700">Tier 3 — your next role:</span>{" "}
        on your goal path, not qualified yet.
      </li>
    </ul>
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

// Re-export for testability.
export { SLIDES, EXPECTED_SETUP_MS };

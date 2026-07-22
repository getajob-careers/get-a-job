import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  GraduationCap,
  Briefcase,
  Search,
  Ban,
  Sparkles,
} from "lucide-react";
import { track, EVENTS } from "@/lib/analytics";
import { useAuth } from "@/lib/AuthContext";
import StepResumeUpload from "@/components/onboarding/StepResumeUpload";
import DirectionScreenV2 from "@/components/onboarding/DirectionScreenV2";
import { runPrimaryDomainInference } from "@/lib/inferPrimaryDomainWrite";

// Onboarding V2 — the 4-screen shell (behind the ONBOARDING_V2 flag).
//
// Sequence + step_index follow the MOCKUP order (the reorder was tried and
// reverted — see the redesign brief's decision log): upload -> immediate reveal
// is the tighter reward loop, and with proof-signals decoupled the blocking wait
// is small enough for the stroke-draw affordance to carry, so the reorder's
// cross-screen complexity no longer paid for itself.
//   0 cv_upload -> 1 review -> 2 direction -> 3 springboard
//
// Extraction resolves on the REVIEW screen's watch (no cross-screen CV-ready
// signal): review shows the animated wait, then the counting-numbers marquee on
// success or the "couldn't read your CV" retry + manual-entry framing on failure.
//
// Screen 0 (cv_upload) is BUILT here: situation selector + the reused
// StepResumeUpload (with deferProofSignals per decision (a) — proof-signals run
// in the background so we never block on their p90-25s/p99-48s tail) + a zero-dep
// stroke-draw reading affordance + the born-instrumented events. Screens 1-3
// remain scaffold placeholders (their PRs follow). Persistence of the extracted
// data lands with the review-screen PR; here it is held in shell state.
const SCREENS = [
  { index: 0, name: "cv_upload", eyebrow: "your CV" },
  { index: 1, name: "review", eyebrow: "review what we found" },
  { index: 2, name: "direction", eyebrow: "direction & preferences" },
  { index: 3, name: "springboard", eyebrow: "you’re set" },
];

const SITUATIONS = [
  { value: "student", label: "Student", Icon: GraduationCap },
  { value: "have_job", label: "Have a job", Icon: Briefcase },
  { value: "looking", label: "Looking", Icon: Search },
  { value: "unemployed", label: "Unemployed", Icon: Ban },
  { value: "freelancing", label: "Freelancing", Icon: Sparkles },
];

// Zero-dep "reading your CV" affordance: an SVG ring that draws itself via
// stroke-dashoffset (per the motion treatment — stroke-draw, no library).
// prefers-reduced-motion removes the animation (see the inline <style>).
function ReadingAffordance() {
  return (
    <div className="flex items-center justify-center py-2" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 40 40" className="onbv2-draw">
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="var(--rd-coral)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset="100"
        />
      </svg>
      <style>{`
        .onbv2-draw circle { animation: onbv2-draw 1.4s ease-in-out infinite; }
        @keyframes onbv2-draw {
          0% { stroke-dashoffset: 100; }
          60% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
        @media (prefers-reduced-motion: reduce) {
          .onbv2-draw circle { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

export default function OnboardingV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  // Minimal profile-shape state so StepResumeUpload's onChange/profileData
  // contract is satisfied; full persistence lands with the review-screen PR.
  const [profileData, setProfileData] = useState(
    /** @type {Record<string, any>} */ ({}),
  );
  // `extracted` is read on the direction screen: its primary_domain (if CV
  // extraction found one) is the CV-first guard for the inference write.
  const [extracted, setExtracted] = useState(null);

  const screen = SCREENS[step];
  const isLast = step === SCREENS.length - 1;

  useEffect(() => {
    track(EVENTS.ONBOARDING_STARTED, { flow: "v2" });
  }, []);

  useEffect(() => {
    track(EVENTS.ONBOARDING_SCREEN_VIEWED, {
      screen: screen.name,
      step_index: screen.index,
      flow: "v2",
    });
  }, [screen.name, screen.index]);

  const advance = () => {
    track(EVENTS.ONBOARDING_STEP_COMPLETED, {
      step_index: screen.index,
      name: screen.name,
      flow: "v2",
    });
    if (isLast) {
      track(EVENTS.ONBOARDING_LAUNCHED_TO_HOME, { flow: "v2" });
      navigate("/Home?welcome=1", { replace: true });
      return;
    }
    setStep((s) => s + 1);
  };

  // Direction-screen advance. The goal pick drives the primary_domain inference
  // write (the CV-less / no-domain fallback) under the precedence invariant —
  // extraction wins (CV-first client guard) and the DB write only lands in a
  // null-or-previously-inferred value (server guard). Fires exactly one
  // audit event carrying the full inference record. The write is a soft gate:
  // a failure never blocks onboarding, so we advance regardless.
  const advanceFromDirection = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      const result = await runPrimaryDomainInference({
        userId: user?.id,
        goalRoleId: profileData.five_year_goal_role_id,
        situation,
        extractedDomain: extracted?.primary_domain || null,
      });
      if (result.record) {
        track(EVENTS.ONBOARDING_PRIMARY_DOMAIN_INFERRED, {
          step_index: 2,
          flow: "v2",
          primary_domain: result.record.primary_domain,
          source: result.record.source,
          confidence: result.record.confidence,
          goal_role_id: result.record.inputs.goalRoleId || null,
          goal_role_family: result.record.inputs.goalRoleFamily || null,
          situation: result.record.inputs.situation || null,
          applied: result.applied,
          skipped_reason: result.skippedReason,
        });
      }
    } finally {
      setAdvancing(false);
    }
    advance();
  };

  const counter = useMemo(
    () => `Step ${step + 1} of ${SCREENS.length}`,
    [step],
  );

  return (
    <div className="min-h-screen bg-rd-bg-page text-rd-text flex flex-col">
      <div className="mx-auto w-full max-w-[560px] px-5 py-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <span className="font-display font-bold text-[13px] text-rd-text">
            Get A Job
          </span>
          <span className="text-[11px] font-medium text-rd-text-tertiary uppercase tracking-wide">
            {counter}
          </span>
        </div>
        <div className="flex gap-1.5 mb-8" aria-hidden="true">
          {SCREENS.map((s) => (
            <div
              key={s.name}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s.index <= step ? "bg-rd-coral" : "bg-rd-border"
              }`}
            />
          ))}
        </div>

        <div className="flex-1">
          <p className="text-[11px] font-medium text-rd-coral uppercase tracking-wide mb-2">
            {screen.eyebrow}
          </p>

          {screen.name === "cv_upload" ? (
            <>
              <h1 className="font-display font-bold text-[24px] leading-tight text-rd-text text-balance">
                Let’s start with your CV.
              </h1>
              <p className="text-[13.5px] text-rd-text-secondary mt-2">
                Drop your CV and we’ll extract everything from it — no manual
                entry. You can also skip and fill in the essentials yourself.
              </p>

              {/* Situation selector — sets employment context (feeds the domain
                  inference + track classification later). */}
              <div className="mt-6">
                <p className="text-[11px] font-medium text-rd-text-tertiary uppercase tracking-wide mb-2.5">
                  Your current situation
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {SITUATIONS.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSituation(value)}
                      className={`flex flex-col items-center gap-1.5 rounded-[14px] border p-2.5 transition-colors ${
                        situation === value
                          ? "border-rd-coral bg-rd-coral-tint"
                          : "border-rd-border bg-rd-bg-card hover:border-rd-border-hover"
                      }`}
                    >
                      <Icon className="w-4 h-4 text-rd-coral" />
                      <span className="text-[10.5px] font-medium text-rd-text text-center leading-tight">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <ReadingAffordance />
                {/* Reuse the hardened upload + extraction pipeline. deferProofSignals
                    (decision (a)) runs proof-signals in the background so we don't
                    block on their tail; onNext advances to direction while
                    extraction may still be finishing. */}
                <StepResumeUpload
                  profileData={profileData}
                  onChange={(patch) =>
                    setProfileData((p) => ({ ...p, ...patch }))
                  }
                  onExtracted={(data) => setExtracted(data)}
                  deferProofSignals
                  onProofSignals={(signals) =>
                    setExtracted((prev) => ({ ...(prev || {}), ...signals }))
                  }
                  onNext={advance}
                />
              </div>
            </>
          ) : screen.name === "direction" ? (
            <>
              <h1 className="font-display font-bold text-[24px] leading-tight text-rd-text text-balance">
                Where are you headed?
              </h1>
              <p className="text-[13.5px] text-rd-text-secondary mt-2">
                A few preferences that shape every recommendation — your goal,
                where you want to work, and your internship track.
              </p>

              <div className="mt-6">
                <DirectionScreenV2
                  data={profileData}
                  onChange={(patch) => setProfileData(patch)}
                />
              </div>

              <div className="pt-8 flex justify-end">
                <button
                  type="button"
                  onClick={advanceFromDirection}
                  disabled={advancing}
                  className="inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-5 py-2.5 transition-colors disabled:opacity-60"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-[24px] leading-tight text-rd-text text-balance">
                {screen.name} screen
              </h1>
              <div className="mt-8 rounded-[18px] border border-dashed border-rd-border bg-rd-bg-card p-8 text-center">
                <p className="text-[12.5px] text-rd-text-tertiary">
                  {screen.name} content — built in a later scoped PR.
                </p>
              </div>
              <div className="pt-8 flex justify-end">
                <button
                  type="button"
                  onClick={advance}
                  className="inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-coral hover:bg-rd-coral-dark rounded-full px-5 py-2.5 transition-colors"
                >
                  {isLast ? "Go to my workspace" : "Continue"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

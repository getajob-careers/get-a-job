import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import ReviewScreenV2 from "@/components/onboarding/ReviewScreenV2";
import SpringboardScreenV2 from "@/components/onboarding/SpringboardScreenV2";
import { runPrimaryDomainInference } from "@/lib/inferPrimaryDomainWrite";
import { persistReviewProfile } from "@/lib/persistOnboardingProfileV2";
import { saveEducations, handleFinalise } from "@/lib/onboardingPersist";
import { mapExtractedToOnboardingState } from "@/lib/mapExtractedToOnboarding";

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

// Map the V2 single-select situation to V1's employment_status enum so V2 writes
// the same profiles column V1 does. In V1 the writer is StepResumeUpload's own
// situation selector, which the chromeless embed suppresses — so V2's row takes
// over that write. Values mirror StepResumeUpload's EMPLOYMENT_OPTIONS.
const SITUATION_TO_EMPLOYMENT = {
  student: "student",
  have_job: "employed",
  looking: "looking_for_job",
  unemployed: "unemployed",
  freelancing: "freelance",
};

export default function OnboardingV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState(null);
  const [advancing, setAdvancing] = useState(false);
  // Springboard finalise state — drives the shared handleFinalise write + the
  // launch button's loading/error UI. setupComplete flips true once the write
  // lands, and the navigation effect below hands off to Home.
  const [finalising, setFinalising] = useState(false);
  const [finaliseError, setFinaliseError] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const queryClient = useQueryClient();
  // Minimal profile-shape state so StepResumeUpload's onChange/profileData
  // contract is satisfied; full persistence lands with the review-screen PR.
  const [profileData, setProfileData] = useState(
    /** @type {Record<string, any>} */ ({}),
  );
  // `extracted` is read on the direction screen: its primary_domain (if CV
  // extraction found one) is the CV-first guard for the inference write.
  const [extracted, setExtracted] = useState(null);
  // Entity state seeded from extraction on screen 0, edited on the review
  // screen (reusing StepReview). Entity-TABLE persistence is a later slice
  // (PR 6); here they feed the review UI + skills_canonical on the profiles
  // persist.
  const [educations, setEducations] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [projects, setProjects] = useState([]);
  const [certifications, setCertifications] = useState([]);
  // Extraction status drives the review screen's watch: null (no upload yet →
  // treated as skipped on review) | 'extracting' | 'success' | 'failed'.
  const [extractionStatus, setExtractionStatus] = useState(null);

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

  // Springboard success: handleFinalise flips setupComplete once the entity
  // rows + onboarding_complete have landed. Emit the springboard step-completed
  // + launched events (onboarding_completed itself fires inside handleFinalise)
  // and hand off to Home with ?welcome=1. That handoff no-ops on the current
  // Home by design — a forward-looking arrival signal for the redesign lane; it
  // must never gate this navigation.
  useEffect(() => {
    if (!setupComplete) return;
    track(EVENTS.ONBOARDING_STEP_COMPLETED, {
      step_index: 3,
      name: "springboard",
      flow: "v2",
    });
    track(EVENTS.ONBOARDING_LAUNCHED_TO_HOME, { flow: "v2" });
    navigate("/Home?welcome=1", { replace: true });
  }, [setupComplete, navigate]);

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
      // Backfill an APPLIED inference into shell state so the springboard's
      // finalise write re-writes the SAME domain instead of clobbering it to
      // null. On the CV-less path profileData.primary_domain is null (the
      // inference landed in the DB via its own guarded write, not React state),
      // and handleFinalise's final profiles update writes profileData.
      // primary_domain verbatim. The provenance stamp is untouched either way —
      // cleanProfilePayload never emits primary_domain_source — so the
      // 'inferred' (or 'extracted') source stands.
      if (result.applied && result.record?.primary_domain) {
        setProfileData((prev) => ({
          ...prev,
          primary_domain: result.record.primary_domain,
        }));
      }
    } finally {
      setAdvancing(false);
    }
    advance();
  };

  // Seed profile + entity state from a successful extraction (shared transform
  // with V1). Merged over prior so a re-extract (retry) overwrites with the new
  // CV without dropping unrelated shell state.
  const seedFromExtraction = (data) => {
    setExtracted(data);
    setExtractionStatus("success");
    const mapped = mapExtractedToOnboardingState(data);
    setProfileData((prev) => ({ ...prev, ...mapped.profilePatch }));
    setEducations(mapped.educations);
    setExperiences(mapped.experiences);
    setProjects(mapped.projects);
    setCertifications(mapped.certifications);
  };

  // Review-screen advance. Persists the profiles ROW (scalar fields +
  // skills_canonical) and, when a domain was extracted, stamps
  // primary_domain_source='extracted' — the keystone that makes the direction
  // screen's inference leave an extracted domain untouched. Soft gate: a write
  // failure never blocks onboarding. (Entity-TABLE persistence is PR 6.)
  const advanceFromReview = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      await persistReviewProfile({
        userId: user?.id,
        profileData,
        experiences,
        educations,
        projects,
      });
    } finally {
      setAdvancing(false);
    }
    advance();
  };

  // Build the ctx bag the shared onboardingPersist helper closes over — same
  // shape V1's buildPersistCtx produces, built fresh per call so the snapshot
  // matches the invoking render. V2 only drives the finalise slice, so the
  // handleSurveyNext-only fields (setStep / generatingRoles / mountedRef /
  // STEP_NAMES) are intentionally absent.
  const buildV2PersistCtx = () => ({
    user,
    profileData,
    experiences,
    educations,
    projects,
    certifications,
    // The profiles row is pre-created at signup by handle_new_user (#666), so it
    // always exists with id === user.id. Seeding existingProfileId keeps
    // handleFinalise on its UPDATE path and off the INSERT fallback (which would
    // PK-conflict on the existing row). setExistingProfileId is a no-op — V2
    // never needs to capture a freshly-inserted id.
    existingProfileId: user?.id || null,
    setExistingProfileId: () => {},
    setEducations,
    finalising,
    setFinalising,
    setFinaliseError,
    setSetupComplete,
    queryClient,
  });

  // Springboard launch = the V2 finalise. Persists the entity rows through the
  // SAME shared helper V1 uses so both flows write identically:
  //   - education rows via saveEducations (update-or-insert; handleFinalise does
  //     NOT touch education),
  //   - experiences / projects / certifications + the final profiles update
  //     (onboarding_complete, skills_canonical, goal, background tasks) via
  //     handleFinalise.
  // handleFinalise signals success via setSetupComplete(true) (→ the navigation
  // effect) and failure via setFinaliseError; it never throws to the caller. The
  // 'extracted' primary_domain_source stamp set on the review screen survives —
  // handleFinalise's final update runs through cleanProfilePayload, which never
  // emits primary_domain_source.
  const finaliseAndLaunch = async () => {
    if (finalising) return;
    setFinaliseError(null);
    const ctx = buildV2PersistCtx();
    try {
      await saveEducations(ctx);
    } catch (err) {
      // Non-fatal: education can be re-added post-onboarding. handleFinalise
      // still runs so the user completes and reaches Home.
      console.error("[onboardingV2] saveEducations failed (non-fatal):", err);
    }
    await handleFinalise(ctx);
  };

  // Retry = go back to the upload screen to try another file.
  const retryUpload = () => {
    setExtractionStatus(null);
    setStep(0);
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
                s.index <= step ? "bg-rd-primary" : "bg-rd-border"
              }`}
            />
          ))}
        </div>

        <div className="flex-1">
          <p className="text-[11px] font-medium text-rd-primary uppercase tracking-wide mb-2">
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
                      onClick={() => {
                        setSituation(value);
                        setProfileData((p) => ({
                          ...p,
                          employment_status: [SITUATION_TO_EMPLOYMENT[value]],
                        }));
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-[14px] border p-2.5 transition-colors ${
                        situation === value
                          ? "border-rd-primary bg-rd-primary-tint"
                          : "border-rd-border bg-rd-bg-card hover:border-rd-border-hover"
                      }`}
                    >
                      <Icon className="w-4 h-4 text-rd-primary" />
                      <span className="text-[10.5px] font-medium text-rd-text text-center leading-tight">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                {/* Reuse the hardened upload + extraction pipeline in a
                    chromeless embed — the shell above already provides the
                    header, progress, and situation row, so StepResumeUpload
                    renders only the dropzone. deferProofSignals (decision (a))
                    runs proof-signals in the background so we don't block on
                    their tail; onNext advances to direction while extraction
                    may still be finishing. */}
                <StepResumeUpload
                  chromeless
                  profileData={profileData}
                  onChange={(patch) =>
                    setProfileData((p) => ({ ...p, ...patch }))
                  }
                  onExtractStart={() => setExtractionStatus("extracting")}
                  onExtracted={seedFromExtraction}
                  onExtractFailed={(reason) => {
                    setExtractionStatus("failed");
                    track(EVENTS.ONBOARDING_CV_EXTRACT_FAILED, {
                      step_index: 0,
                      flow: "v2",
                      reason: reason || "unknown",
                    });
                  }}
                  deferProofSignals
                  onProofSignals={(signals) => {
                    setExtracted((prev) => ({ ...(prev || {}), ...signals }));
                    // Backfill the domain into profileData so the review persist
                    // stamps 'extracted' and the direction guard sees it.
                    setProfileData((prev) => ({
                      ...prev,
                      primary_domain:
                        signals.primary_domain || prev.primary_domain || null,
                      proof_signals:
                        signals.proof_signals || prev.proof_signals || [],
                      adjacent_fields:
                        signals.adjacent_fields || prev.adjacent_fields || [],
                    }));
                  }}
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
                  className="inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-5 py-2.5 transition-colors disabled:opacity-60"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : screen.name === "review" ? (
            <div className="mt-2">
              <ReviewScreenV2
                status={extractionStatus || "skipped"}
                profileData={profileData}
                onChange={(next) => setProfileData(next)}
                educations={educations}
                setEducations={setEducations}
                experiences={experiences}
                setExperiences={setExperiences}
                projects={projects}
                setProjects={setProjects}
                certifications={certifications}
                setCertifications={setCertifications}
                onContinue={advanceFromReview}
                onBack={() => setStep(0)}
                onRetry={retryUpload}
              />
            </div>
          ) : (
            <div className="mt-2">
              <SpringboardScreenV2
                onLaunch={finaliseAndLaunch}
                finalising={finalising}
                error={finaliseError}
                hasCv={extractionStatus === "success"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

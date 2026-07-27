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
import { supabase } from "@/api/supabaseClient";
import StepResumeUpload from "@/components/onboarding/StepResumeUpload";
import DirectionScreenV2 from "@/components/onboarding/DirectionScreenV2";
import ReviewScreenV2 from "@/components/onboarding/ReviewScreenV2";
import SpringboardScreenV2 from "@/components/onboarding/SpringboardScreenV2";
import { runPrimaryDomainInference } from "@/lib/inferPrimaryDomainWrite";
import { persistReviewProfile } from "@/lib/persistOnboardingProfileV2";
import { saveEducations, handleFinalise } from "@/lib/onboardingPersist";
import { runCareerAnalysisAndReplaceRoles } from "@/lib/careerAnalysis";
import OnboardingTutorial from "@/components/onboarding/OnboardingTutorial";
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

// V1's employment-status XOR rules, ported to the V2 situation vocab: selecting
// a value drops any it conflicts with (mirrors StepResumeUpload's
// toggleEmploymentStatus). student + freelancing stack with anything.
const SITUATION_CONFLICTS = {
  unemployed: ["have_job", "looking"],
  have_job: ["unemployed", "looking"],
  looking: ["unemployed", "have_job"],
};

// Priority for deriving the single audit `situation` from a multi-pick — ranks
// job-search intent first. Mirrors the employment order looking_for_job >
// unemployed > employed > freelance > student.
const SITUATION_PRIORITY = [
  "looking",
  "unemployed",
  "have_job",
  "freelancing",
  "student",
];

export default function OnboardingV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  // Situation is MULTI-select with V1's XOR rules (see SITUATION_CONFLICTS).
  const [situations, setSituations] = useState([]);
  const [advancing, setAdvancing] = useState(false);
  // Springboard finalise state — drives the shared handleFinalise write + the
  // launch button's loading/error UI. setupComplete flips true once the write
  // lands, and the navigation effect below hands off to Home.
  const [finalising, setFinalising] = useState(false);
  const [finaliseError, setFinaliseError] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  // Tutorial takes over after the springboard launch (Commit B). Fresh V2
  // completions always see it; has_seen persistence is in handleTutorialEnd.
  const [showTutorial, setShowTutorial] = useState(false);
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

  // 0A: scope the canvas palette to the V2 onboarding surface only. The rd-*
  // tokens resolve to their canvas values under :root[data-next-design]; V1
  // (Onboarding.jsx, a separate component) is never mounted here, so it stays
  // byte-identical flag-off. Stamp <html> (the tokens live at :root level), and
  // on unmount remove it only if we added it (had guard) so we never strip a
  // stamp a real canvas shell set.
  useEffect(() => {
    const el = document.documentElement;
    const had = el.hasAttribute("data-next-design");
    el.setAttribute("data-next-design", "");
    return () => {
      if (!had) el.removeAttribute("data-next-design");
    };
  }, []);

  // Completed-user guard (mirrors V1 Onboarding.jsx checkExistingProfile:226): a
  // user who already finished onboarding must not see the flow again. V2 reads no
  // profile on mount otherwise, so a completed user re-entering
  // /Onboarding?onboarding_v2=1 lands back on screen 0. Redirect them to Home.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data?.onboarding_complete) {
        navigate("/Home", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, navigate]);

  // Toggle a situation with V1's XOR rules, mirroring the full multi-pick into
  // profileData.employment_status (mapped to the V1 enum). The single
  // priority-derived value feeds the inference audit; the full array feeds the
  // profiles column + the LLM prompts.
  const toggleSituation = (value) => {
    const conflicts = SITUATION_CONFLICTS[value] || [];
    const next = situations.includes(value)
      ? situations.filter((s) => s !== value)
      : [...situations.filter((s) => !conflicts.includes(s)), value];
    setSituations(next);
    setProfileData((p) => ({
      ...p,
      employment_status: next.map((s) => SITUATION_TO_EMPLOYMENT[s]),
    }));
  };

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

  // Navigation is driven by the tutorial (handleTutorialEnd) now, not by a
  // setupComplete effect: on launch we render OnboardingTutorial immediately and
  // hold there while the finalise writes run. setupComplete only enables the
  // tutorial's exit; LAUNCHED_TO_HOME + the /Home?welcome=1 handoff fire when the
  // user leaves the tutorial.

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
      // Single priority-derived value for the audit `situation` (back-compat);
      // the full multi-pick rides alongside as `situations`.
      const primarySituation =
        SITUATION_PRIORITY.find((s) => situations.includes(s)) || null;
      const result = await runPrimaryDomainInference({
        userId: user?.id,
        goalRoleId: profileData.five_year_goal_role_id,
        situation: primarySituation,
        situations,
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
          situations: result.record.inputs.situations || [],
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
    // Show the tutorial immediately — it renders the setup-progress bar while
    // the finalise writes run, then enables "Go to platform" once setupComplete
    // flips. Springboard STEP_COMPLETED fires here (launch clicked);
    // LAUNCHED_TO_HOME fires when the user leaves the tutorial.
    track(EVENTS.ONBOARDING_STEP_COMPLETED, {
      step_index: 3,
      name: "springboard",
      flow: "v2",
    });
    setShowTutorial(true);
    const ctx = buildV2PersistCtx();
    try {
      await saveEducations(ctx);
    } catch (err) {
      // Non-fatal: education can be re-added post-onboarding. handleFinalise
      // still runs so the user completes and reaches Home.
      console.error("[onboardingV2] saveEducations failed (non-fatal):", err);
    }
    await handleFinalise(ctx);

    // Self-heal / roadmap producer: V2 has no survey step, so nothing else
    // writes career_roles. Fire the shared analysis helper in the BACKGROUND
    // (non-blocking) so the user lands on Home with the roadmap building →
    // populating. handleFinalise already stamped last_reality_check_date, so
    // Home's self-heal won't double-fire — this helper IS the V2 roadmap
    // producer. Failure is non-fatal: Roadmap's manual Generate is the backstop.
    runCareerAnalysisAndReplaceRoles({
      userId: user.id,
      dreamRoles: profileData.five_year_role
        ? [profileData.five_year_role]
        : [],
      force: true,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["careerRoles"] }))
      .catch((err) =>
        console.error("[onboardingV2] background career analysis failed:", err),
      );
  };

  // Tutorial finished (Go to platform, tour-complete, or Skip tour). Persist
  // has_seen so it doesn't re-show next session (mirrors V1), emit the launched
  // event, and hand off to Home with ?welcome=1.
  const handleTutorialEnd = async () => {
    if (user?.id) {
      const { error: flagErr } = await supabase
        .from("profiles")
        .update({ has_seen_onboarding_tutorial: true })
        .eq("id", user.id);
      if (flagErr) {
        console.warn(
          "[onboardingV2] could not persist has_seen_onboarding_tutorial:",
          flagErr.message,
        );
      }
    }
    track(EVENTS.ONBOARDING_LAUNCHED_TO_HOME, { flow: "v2" });
    navigate("/Home?welcome=1", { replace: true });
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

  // Tutorial takes over the screen once the user launches from the springboard.
  // It shows the setup-progress bar while the finalise writes settle, then
  // enables the exit. isReturningUser={false}: V2 completions are always
  // first-time (the completed-user mount guard redirects returners to Home).
  if (showTutorial) {
    return (
      <>
        {finaliseError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
            <div className="bg-rd-primary-tint border border-rd-primary/40 rounded-[14px] px-4 py-3 text-[13px] text-rd-primary-dark">
              <p>{finaliseError}</p>
              <button
                onClick={finaliseAndLaunch}
                className="mt-2 text-[12px] font-semibold text-rd-primary hover:text-rd-primary-dark underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <OnboardingTutorial
          isReturningUser={false}
          setupComplete={setupComplete}
          onTutorialEnd={handleTutorialEnd}
        />
      </>
    );
  }

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

        {/* Back-nav (RULED Option A): only from direction (2) and springboard
            (3), each stepping back one screen. Screen values are lifted into
            this component, so a return preserves them; re-advancing re-runs the
            same idempotent/guarded persist. No back from review (1) to upload
            (0) - that step is not a meaningful return target. */}
        {step >= 2 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="self-start -mt-4 mb-5 px-1 py-1.5 text-[13px] font-semibold text-rd-text-tertiary hover:text-rd-text transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-2"
          >
            ← Back
          </button>
        )}

        <div className="flex-1">
          <p className="text-[11px] font-medium text-rd-primary uppercase tracking-wide mb-2">
            {screen.eyebrow}
          </p>

          {screen.name === "cv_upload" ? (
            <>
              <h1 className="font-display font-bold rd-t-display-l text-rd-text text-balance">
                Let’s start with your CV.
              </h1>
              <p className="rd-t-body-m text-rd-text-secondary mt-2">
                Drop your CV and we’ll extract everything from it — no manual
                entry. You can also skip and fill in the essentials yourself.
              </p>

              {/* Situation selector — sets employment context (feeds the domain
                  inference + track classification later). */}
              <div className="mt-6">
                <p className="text-[11px] font-medium text-rd-text-tertiary uppercase tracking-wide mb-2.5">
                  Your current situation — pick all that apply
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {SITUATIONS.map(({ value, label, Icon }) => {
                    const isSelected = situations.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleSituation(value)}
                        aria-pressed={isSelected}
                        className={`rd-press flex flex-col items-center gap-1.5 rd-r-md border p-2.5 transition-[border-color,background-color,box-shadow] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-2 ${
                          isSelected
                            ? "border-rd-primary bg-rd-primary-tint"
                            : "border-rd-border bg-rd-bg-card hover:border-rd-border-hover"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-rd-primary text-white"
                              : "bg-rd-bg-soft text-rd-text-secondary"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="rd-t-micro font-medium text-rd-text text-center">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mascot slot (reserved, empty beat): the upload-read pose lands
                  beside this dropzone in the later additive character PR - no
                  placeholder art renders now (handoff: mascot slots render
                  nothing). The calm single-card dropzone treatment (0-i) lives
                  in StepResumeUpload's chromeless branch. */}
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
              <h1 className="font-display font-bold rd-t-display-l text-rd-text text-balance">
                Where are you headed?
              </h1>
              <p className="rd-t-body-m text-rd-text-secondary mt-2">
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
                  disabled={advancing || !profileData.five_year_goal_role_id}
                  className="rd-press inline-flex items-center justify-center gap-1.5 font-display font-bold text-[13px] text-white bg-rd-primary hover:bg-rd-primary-dark rounded-full px-5 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
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

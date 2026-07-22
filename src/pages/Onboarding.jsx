import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";
import {
  EMPTY_PROFILE,
  cleanProfilePayload,
  ALLOWED_EXPERIENCE_TYPES,
  inferExperienceType,
} from "@/lib/onboardingPayload";
import {
  normalizeEducationLevel,
  parseEducationDateRange,
} from "@/lib/educationPolicy";
import { track, EVENTS } from "@/lib/analytics";

// Step index → snake_case name for the onboarding_step_completed event
// property. Order matches the new 7-step machine post-Phase-3 collapse:
// 0=Resume, 1=Review (Education + Experience + Projects + Certs + skills),
// 2=Practicum gate, 3=Career direction, 4=Constraints, 5=Survey, 6=Tutorial.
const STEP_NAMES = [
  "cv",
  "review",
  "internship",
  "career_direction",
  "constraints",
  "survey",
  "tier_reveal",
];

import OnboardingShell from "../components/onboarding/OnboardingShell";
import OnboardingTutorial from "../components/onboarding/OnboardingTutorial";
import StepResumeUpload from "../components/onboarding/StepResumeUpload";
import StepReview from "../components/onboarding/StepReview";
import StepInternship from "../components/onboarding/StepInternship";
import StepCareerDirection from "../components/onboarding/StepCareerDirection";
import StepConstraints from "../components/onboarding/StepConstraints";
import StepSurvey from "../components/onboarding/StepSurvey";
import {
  saveProgress as persistSaveProgress,
  handleSurveyNext as persistHandleSurveyNext,
  handleFinalise as persistHandleFinalise,
} from "@/lib/onboardingPersist";

// DB chk_experiences_type allows only these values
// ALLOWED_EXPERIENCE_TYPES + inferExperienceType moved to
// src/lib/onboardingPayload.js for direct unit testing. See that file.

// Steps (post-Phase-3 collapse, 7-step machine):
//   0 = CV upload
//   1 = Review what we extracted (Education + Experience + Projects + Certs + catch-all skills)
//   2 = Internship gate (practicum_path) — sits AFTER Review so the
//       institution-detection in StepInternship can read educations[]
//   3 = Career direction (structured pick — Phase 2)
//   4 = Constraints
//   5 = Survey (reality check)
//   6 = TierReveal / tutorial
//
// Pre-Phase-3 users with onboarding_step >= 1 stored from the old 9-step
// machine: their stored index may be off by N, but they can navigate
// forward without data loss — every entity table is hydrated in
// checkExistingProfile and the saveProgress writes their current step
// on the next Continue.
export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [profileData, setProfileData] = useState(EMPTY_PROFILE);
  const [experiences, setExperiences] = useState([]);
  const [projects, setProjects] = useState([]);
  const [certifications, setCertifications] = useState([]);
  // Education state — array of education rows for the user, matching the
  // education table schema. Phase B (2026-05-14) moved education off the
  // profiles flat columns into its own table. Hydrated on mount; written
  // via UPSERT in saveProgress and on the track-reveal transition.
  const [educations, setEducations] = useState([]);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [existingProfileId, setExistingProfileId] = useState(null);

  // Track reveal state — kept for the analysis pipeline; the visual track-
  // reveal page was replaced by the OnboardingTutorial in step 8.
  const [generatingRoles, setGeneratingRoles] = useState(false);
  // True when handleFinalise has completed — gates the tutorial's
  // "Go to platform" button. Replaces the old click-driven navigation.
  const [setupComplete, setSetupComplete] = useState(false);
  // True when has_seen_onboarding_tutorial=true on the profile row. The
  // tutorial gates on this to show the "skip — I've seen this" screen.
  const [isReturningUser, setIsReturningUser] = useState(false);

  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const [saving, setSaving] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [finaliseError, setFinaliseError] = useState(null);

  // Run checkExistingProfile ONCE per mount. Without this ref guard, the
  // effect re-fires whenever AuthContext re-creates the user object —
  // which happens on every Supabase auth event including TOKEN_REFRESHED
  // (fired on tab visibility change and ~50min token refresh). The re-run
  // re-reads the profile; if handleFinalise has set onboarding_complete=
  // true since the initial check, the navigate(Home) below auto-navigates
  // out from under the user mid-tutorial. The tab-switching nav race
  // reported after PR #87 traces here, not to the tutorial component
  // (which has no auto-nav left).
  const profileCheckedRef = useRef(false);
  useEffect(() => {
    if (!user) {
      setCheckingProfile(false);
      return;
    }
    if (profileCheckedRef.current) return;
    profileCheckedRef.current = true;
    checkExistingProfile();
  }, [user]);

  // Recovery: if the user closed the browser mid-analysis and reopens at
  // step 9 (their stored onboarding_step — TierReveal), nothing is running
  // and the tutorial would sit with setupComplete=false forever.
  // Auto-trigger handleSurveyNext to re-drive the pipeline.
  // handleSurveyNext is safe to re-run — its experiences/projects inserts
  // use a snapshot-and-delete-old-after-success pattern so the user's
  // data isn't lost.
  const recoveryFiredRef = useRef(false);
  useEffect(() => {
    if (recoveryFiredRef.current) return;
    if (step !== 6) return;
    if (checkingProfile) return;
    if (!existingProfileId) return;
    if (generatingRoles || finalising) return;
    if (setupComplete) return;
    recoveryFiredRef.current = true;
    handleSurveyNext();
  }, [
    step,
    checkingProfile,
    existingProfileId,
    generatingRoles,
    finalising,
    setupComplete,
  ]);

  // Debounced auto-save of profileData. Prevents edits being lost when the user
  // navigates away mid-typing before clicking Continue. Skips:
  //  - before hydration completes (otherwise we'd overwrite DB with empty defaults)
  //  - before a profile row exists (created on first Continue via saveProgress)
  //  - while saving/finalising is already in flight (avoids duplicate writes)
  useEffect(() => {
    if (checkingProfile) return;
    if (!existingProfileId) return;
    if (saving || finalising || generatingRoles) return;
    const handle = setTimeout(() => {
      const payload = cleanProfilePayload({
        ...profileData,
        experiences,
        educations,
        projects,
      });
      // saveProgress is the single source of truth for onboarding_step;
      // letting the debounced auto-save write it too would clobber a newly
      // advanced step with whatever profileData was hydrated with on mount.
      delete payload.onboarding_step;
      delete payload.onboarding_complete;
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k],
      );
      supabase
        .from("profiles")
        .update(payload)
        .eq("id", existingProfileId)
        .then(({ error }) => {
          if (error) console.warn("Auto-save failed:", error.message);
        })
        .catch((err) => {
          // Network error etc. — log so it doesn't surface as an unhandled rejection.
          console.warn("Auto-save network error:", err?.message || err);
        });
    }, 800);
    return () => clearTimeout(handle);

    // 2026-05-28 Eli-incident fix: experiences/educations/projects MUST be
    // in the dep array. Previously the closure captured these state arrays
    // when the effect ran AFTER profileData hydrated, but BEFORE
    // checkExistingProfile's parallel queries had setExperiences/etc.
    // → the 800ms timer fired with empty arrays → cleanProfilePayload
    // produced a skills_canonical computed from JUST profile.skills →
    // clobbered the existing rich canonical set. Adding these as deps
    // re-schedules the timer (cleanup cancels stale ones) whenever
    // hydration completes for any source, so the last save always sees
    // complete data. Cache pollution on ["experiences", uid] was the
    // primary cause for Eli, but this race could still bite anyone who
    // edits profileData during onboarding hydration.
  }, [
    profileData,
    experiences,
    educations,
    projects,
    existingProfileId,
    checkingProfile,
    saving,
    finalising,
    generatingRoles,
  ]);

  const checkExistingProfile = async () => {
    if (!user) {
      setCheckingProfile(false);
      return;
    }
    const { data: profiles, error: profileCheckError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id);
    if (profileCheckError)
      console.error("Error checking existing profile:", profileCheckError);
    if (profiles?.[0]?.onboarding_complete) {
      navigate(createPageUrl("Home"));
      return;
    }
    if (profiles?.[0]) {
      const p = profiles[0];
      setExistingProfileId(p.id);
      setIsReturningUser(!!p.has_seen_onboarding_tutorial);
      setProfileData((prev) => ({
        ...prev,
        ...p,
        volunteering: p.volunteering || [],
      }));
      setStep(p.onboarding_step || 0);

      // Hydrate experiences/projects/certifications/education from DB so a
      // user resuming partway through sees and can edit their existing
      // records. Without this, the finalization step would DELETE old
      // records and INSERT nothing (React state started empty), silently
      // wiping their data.
      const [expRes, projRes, certRes, eduRes] = await Promise.all([
        supabase.from("experiences").select("*").eq("user_id", user.id),
        supabase.from("projects").select("*").eq("user_id", user.id),
        supabase.from("certifications").select("*").eq("user_id", user.id),
        supabase
          .from("education")
          .select("*")
          .eq("user_id", user.id)
          .order("display_order", { ascending: true, nullsLast: true })
          .order("created_at", { ascending: true }),
      ]);
      if (eduRes.data?.length) {
        setEducations(
          eduRes.data.map((e) => ({
            id: e.id,
            institution: e.institution || "",
            education_level: e.education_level || "",
            degree_type: e.degree_type || "",
            field_of_study: e.field_of_study || "",
            start_date: e.start_date || "",
            end_date: e.end_date || "",
            is_current: e.is_current ?? false,
            gpa: e.gpa || "",
            honors: e.honors || [],
            relevant_coursework: e.relevant_coursework || [],
            academic_projects: e.academic_projects || [],
            location: e.location || "",
            display_order: e.display_order ?? 0,
          })),
        );
      }
      if (expRes.data?.length) {
        setExperiences(
          expRes.data.map((e) => ({
            title: e.title || "",
            company: e.company || "",
            type: ALLOWED_EXPERIENCE_TYPES.has(e.type) ? e.type : "full_time",
            start_date: e.start_date || "",
            end_date: e.end_date || "",
            is_current: e.is_current || false,
            responsibilities: Array.isArray(e.responsibilities)
              ? e.responsibilities.join("\n")
              : e.responsibilities || "",
            skills: e.skills || [],
            managed_people: e.managed_people ?? false,
            cross_functional: e.cross_functional ?? false,
          })),
        );
      }
      if (projRes.data?.length) {
        setProjects(
          projRes.data.map((p) => ({
            name: p.name || "",
            description: p.description || "",
            url: p.url || "",
            skills: p.skills || [],
          })),
        );
      }
      if (certRes.data?.length) {
        setCertifications(
          certRes.data.map((c) => ({
            name: c.name || "",
            issuer: c.issuer || "",
            date_earned: c.date_earned || "",
          })),
        );
      }
    }
    setCheckingProfile(false);

    // onboarding_started — one-shot per user per device. The localStorage
    // timestamp doubles as the start-time reference for the duration_ms
    // property on onboarding_completed.
    if (!profiles?.[0]?.onboarding_complete) {
      try {
        const flagKey = `gaj.onb_start.${user.id}`;
        if (!localStorage.getItem(flagKey)) {
          localStorage.setItem(flagKey, String(Date.now()));
          track(EVENTS.ONBOARDING_STARTED, {});
        }
      } catch {
        /* localStorage unavailable */
      }
    }
  };

  // Called from StepResumeUpload — pre-fill profile from resume extraction
  const handleResumeExtracted = (extracted) => {
    const edu = extracted.education?.[0] || {};
    // Education level normalization defends against the LLM returning
    // off-enum strings ("Bachelor's Degree", "BA", "Undergraduate"). The
    // dropdown's SelectItems use the canonical enum, so an off-enum value
    // would render blank. normalizeEducationLevel maps known variants down
    // and returns "" for unknowns rather than silently mismapping.
    const normalizedLevel = normalizeEducationLevel(extracted.education_level);
    setProfileData((prev) => ({
      ...prev,
      full_name: extracted.full_name || prev.full_name,
      phone_number: extracted.phone_number || prev.phone_number,
      location: extracted.location || prev.location,
      linkedin_url: extracted.linkedin_url || prev.linkedin_url,
      summary: extracted.summary || prev.summary,
      languages: extracted.languages || prev.languages || [],
      // Single flat skills array — categories dropped in Bug 3 fix. The
      // extractor returns one combined list; StepSkills writes here too.
      skills: extracted.skills || prev.skills || [],
      volunteering: extracted.volunteering || prev.volunteering || [],
      proof_signals: extracted.proof_signals?.length
        ? extracted.proof_signals
        : prev.proof_signals || [],
      primary_domain: extracted.primary_domain || prev.primary_domain || null,
      adjacent_fields: extracted.adjacent_fields?.length
        ? extracted.adjacent_fields
        : prev.adjacent_fields || [],
    }));

    // Education rows — write to the new education table state instead of
    // flat profile columns (Phase B, 2026-05-14). Build a primary row from
    // root-level extraction fields + optional secondary row from the
    // secondary_education object.
    const primaryEdu = {
      id: undefined,
      institution: extracted.institution || edu.institution || "",
      education_level: normalizedLevel || "",
      degree_type: extracted.degree || edu.degree || "",
      field_of_study: extracted.field_of_study || edu.field_of_study || "",
      start_date: parseEducationDateRange(extracted.education_dates).start,
      end_date: parseEducationDateRange(extracted.education_dates).end,
      is_current: parseEducationDateRange(extracted.education_dates).is_current,
      gpa: extracted.gpa || edu.gpa || "",
      honors: extracted.honors || edu.honors || [],
      relevant_coursework: [],
      academic_projects: extracted.academic_projects || [],
      location: "",
      display_order: 0,
    };
    const newEducations = [primaryEdu];

    // Secondary education (high school) — silently created if the LLM
    // returned one. Per design decision Q2, NOT shown in StepEducation
    // (single-entry onboarding) — user can edit via AddInformation post-
    // onboarding.
    if (
      extracted.secondary_education &&
      typeof extracted.secondary_education === "object"
    ) {
      const sec = extracted.secondary_education;
      const secDates = parseEducationDateRange(sec.dates);
      newEducations.push({
        id: undefined,
        institution: sec.institution || "",
        education_level: "high_school",
        degree_type: "",
        field_of_study: "",
        start_date: secDates.start,
        end_date: secDates.end,
        is_current: false,
        gpa: "",
        honors: Array.isArray(sec.highlights) ? sec.highlights : [],
        relevant_coursework: [],
        academic_projects: [],
        location: sec.location || "",
        display_order: 1,
      });
    }

    setEducations((prev) => {
      // Preserve existing row ids when re-extracting — keeps UPSERT clean.
      const merged = [...newEducations];
      for (let i = 0; i < merged.length; i++) {
        if (prev[i]?.id) merged[i].id = prev[i].id;
      }
      return merged;
    });

    // Pre-fill experiences from resume
    const exps = extracted.experiences || extracted.experience || [];
    if (exps.length > 0) {
      setExperiences(
        exps.map((e) => ({
          title: e.title || "",
          company: e.company || "",
          // Accept whatever the extractor returned; fall back to keyword inference.
          type: inferExperienceType(e),
          start_date: e.start_date || "",
          end_date: e.end_date || "",
          is_current: e.is_current || false,
          responsibilities: Array.isArray(e.responsibilities)
            ? e.responsibilities.join("\n")
            : e.responsibilities || "",
          skills: e.skills || [],
        })),
      );
    }

    const projs = extracted.projects || [];
    if (projs.length > 0) {
      setProjects(extracted.projects);
    }

    if (extracted.certifications?.length > 0) {
      setCertifications(extracted.certifications);
    }
  };

  // The four onboarding persist functions live in @/lib/onboardingPersist
  // (extracted VERBATIM in PR 6a — zero behavior change). V1 builds a ctx
  // snapshot of the state/setters they used to close over and delegates.
  // buildPersistCtx runs at each call, so the snapshot matches the render
  // that invoked it — exactly as the inline closures did. saveEducations is
  // not wrapped here: it is only ever called from inside saveProgress
  // (module-internal), so V1 never needs an entry point for it.
  const buildPersistCtx = () => ({
    user,
    profileData,
    experiences,
    educations,
    projects,
    certifications,
    existingProfileId,
    setExistingProfileId,
    setEducations,
    generatingRoles,
    setGeneratingRoles,
    setStep,
    finalising,
    setFinalising,
    setFinaliseError,
    setSetupComplete,
    mountedRef,
    queryClient,
    STEP_NAMES,
  });

  const saveProgress = (stepNum) =>
    persistSaveProgress(buildPersistCtx(), stepNum);

  const goTo = async (nextStep) => {
    setSaveError(null);
    setSaving(true);
    try {
      await saveProgress(nextStep);
      // Track forward-progress only — skips Back-button noise.
      if (nextStep > step) {
        track(EVENTS.ONBOARDING_STEP_COMPLETED, {
          step_index: step,
          step_name: STEP_NAMES[step] || `step_${step}`,
        });
      }
      setStep(nextStep);
    } catch (err) {
      console.error("Failed to save onboarding progress:", err);
      setSaveError("Could not save your progress. Please try again.");
    }
    setSaving(false);
  };

  const handleSurveyNext = () => persistHandleSurveyNext(buildPersistCtx());

  const handleFinalise = () => persistHandleFinalise(buildPersistCtx());

  // Called when the tutorial finishes (user clicked "Go to platform" or
  // skipped via the returning-user gate). Persists has_seen flag, clears
  // query cache, navigates to Home.
  const handleTutorialEnd = async ({ skipped }) => {
    if (existingProfileId) {
      const { error: flagErr } = await supabase
        .from("profiles")
        .update({ has_seen_onboarding_tutorial: true })
        .eq("id", existingProfileId);
      if (flagErr) {
        // Non-fatal — the user can still proceed. The flag is for future
        // sessions; missing it means they see the tutorial again next time.
        console.warn(
          "[onboarding] could not persist has_seen_onboarding_tutorial:",
          flagErr.message,
        );
      }
    }
    // If the user skipped via the returning-user gate, we still need to
    // make sure handleFinalise has run (or is running). If setupComplete
    // is false at this point, the navigation below would land them on
    // Home with onboarding_complete still false → bounce back to
    // onboarding. Guard: wait for setupComplete or finalise to settle.
    if (!setupComplete && !finalising && skipped) {
      await handleFinalise();
    }
    navigate(createPageUrl("Home"));
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rd-bg-page">
        <Loader2 className="w-6 h-6 animate-spin text-rd-primary" />
      </div>
    );
  }

  // Step 6 → render the OnboardingTutorial full-screen (no OnboardingShell).
  // handleSurveyNext now chains to handleFinalise on BOTH success and
  // failure paths, so setupComplete reliably flips true and the tutorial's
  // "Go to platform" button enables. No setupError prop — error UX moved
  // out of the tutorial; Home self-heal recovers in the background.
  if (step === 6) {
    return (
      <>
        {finaliseError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
            <div className="bg-rd-primary-tint border border-rd-primary/40 rounded-[14px] px-4 py-3 text-[13px] text-rd-primary-dark">
              <p>{finaliseError}</p>
              <button
                onClick={handleFinalise}
                className="mt-2 text-[12px] font-semibold text-rd-primary hover:text-rd-primary-dark underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <OnboardingTutorial
          isReturningUser={isReturningUser}
          setupComplete={setupComplete}
          onTutorialEnd={handleTutorialEnd}
        />
      </>
    );
  }

  if (finalising) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-rd-bg-page px-6">
        <Loader2 className="w-9 h-9 animate-spin text-rd-primary" />
        <div className="text-center">
          <p className="font-display font-extrabold text-[22px] leading-tight text-rd-text">
            Initialising your platform…
          </p>
          <p className="text-[13.5px] leading-[1.6] text-rd-text-secondary mt-2 max-w-[380px] mx-auto">
            Generating tasks, configuring agents, building your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingShell currentStep={step}>
      {saveError && (
        <div className="mb-4 bg-rd-primary-tint border border-rd-primary/40 rounded-[14px] px-3.5 py-2.5 text-[13px] text-rd-primary-dark">
          {saveError}
        </div>
      )}
      {finaliseError && (
        <div className="mb-4 bg-rd-primary-tint border border-rd-primary/40 rounded-[14px] px-3.5 py-2.5 text-[13px] text-rd-primary-dark">
          <p>{finaliseError}</p>
          <button
            onClick={handleFinalise}
            className="mt-2 text-[12px] font-semibold text-rd-primary hover:text-rd-primary-dark underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}
      {step === 0 && (
        <StepResumeUpload
          onExtracted={handleResumeExtracted}
          onNext={() => goTo(1)}
          profileData={profileData}
          onChange={(patch) =>
            setProfileData((prev) => ({ ...prev, ...patch }))
          }
        />
      )}
      {step === 1 && (
        <StepReview
          data={profileData}
          onChange={setProfileData}
          educations={educations}
          setEducations={setEducations}
          experiences={experiences}
          setExperiences={setExperiences}
          projects={projects}
          setProjects={setProjects}
          certifications={certifications}
          setCertifications={setCertifications}
          onNext={() => goTo(2)}
          onBack={() => goTo(0)}
        />
      )}
      {step === 2 && (
        <StepInternship
          data={profileData}
          onChange={setProfileData}
          educations={educations}
          onNext={() => goTo(3)}
          onBack={() => goTo(1)}
        />
      )}
      {step === 3 && (
        <StepCareerDirection
          data={profileData}
          onChange={setProfileData}
          onNext={() => goTo(4)}
          onBack={() => goTo(2)}
        />
      )}
      {step === 4 && (
        <StepConstraints
          data={profileData}
          onChange={setProfileData}
          onSubmit={() => goTo(5)}
          onBack={() => goTo(3)}
          submitting={saving}
        />
      )}
      {step === 5 && (
        <StepSurvey
          data={profileData}
          onChange={setProfileData}
          onNext={handleSurveyNext}
          onBack={() => goTo(4)}
        />
      )}
      {/* step === 6 is rendered above via OnboardingTutorial — no entry here. */}
    </OnboardingShell>
  );
}

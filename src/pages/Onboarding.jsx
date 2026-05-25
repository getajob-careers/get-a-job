import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";
import { EMPTY_PROFILE, cleanProfilePayload, ALLOWED_EXPERIENCE_TYPES, inferExperienceType } from "@/lib/onboardingPayload";
import { normalizeEducationLevel, parseEducationDateRange } from "@/lib/educationPolicy";
import { resolveDueDate } from "@/lib/taskDueDate";
import { track, EVENTS } from "@/lib/analytics";
import { ONB_CSS } from "../components/onboarding/onboardingStyles";

// Step index → snake_case name for the onboarding_step_completed event
// property. Order matches the step constant at the top of this file.
const STEP_NAMES = [
  "cv",
  "education",
  "practicum",
  "experience",
  "role_skills",
  "skills",
  "career_direction",
  "constraints",
  "survey",
  "tier_reveal",
];

import OnboardingShell from "../components/onboarding/OnboardingShell";
import OnboardingTutorial from "../components/onboarding/OnboardingTutorial";
import StepResumeUpload from "../components/onboarding/StepResumeUpload";
import StepEducation from "../components/onboarding/StepEducation";
import StepPracticum from "../components/onboarding/StepPracticum";
import StepExperience from "../components/onboarding/StepExperience";
import StepRoleSkills from "../components/onboarding/StepRoleSkills";
import StepSkills from "../components/onboarding/StepSkills";
import StepCareerDirection from "../components/onboarding/StepCareerDirection";
import StepConstraints from "../components/onboarding/StepConstraints";
import StepSurvey from "../components/onboarding/StepSurvey";

// DB chk_experiences_type allows only these values
// ALLOWED_EXPERIENCE_TYPES + inferExperienceType moved to
// src/lib/onboardingPayload.js for direct unit testing. See that file.

// Steps: 0=CV, 1=Education, 2=Practicum, 3=Experience, 4=RoleSkills (batched per-object tagging), 5=Skills (catch-all), 6=CareerDirection, 7=Constraints, 8=Survey, 9=TierReveal
//
// Practicum (Wk 4) inserted at index 2 after Education (we have the
// institution by then). Existing in-flight users with onboarding_step
// stored from before the insert may see a slightly different step on
// reload — they can navigate forward without data loss.
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
  useEffect(() => () => { mountedRef.current = false; }, []);

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
    if (!user) { setCheckingProfile(false); return; }
    if (profileCheckedRef.current) return;
    profileCheckedRef.current = true;
    checkExistingProfile();
  }, [user]);

  // Recovery: if the user closed the browser mid-analysis and reopens at
  // step 8 (their stored onboarding_step), nothing is running and the
  // tutorial would sit with setupComplete=false forever. Auto-trigger
  // handleSurveyNext to re-drive the pipeline. handleSurveyNext is safe to
  // re-run — its experiences/projects inserts use a snapshot-and-delete-
  // old-after-success pattern so the user's data isn't lost.
  const recoveryFiredRef = useRef(false);
  useEffect(() => {
    if (recoveryFiredRef.current) return;
    if (step !== 8) return;
    if (checkingProfile) return;
    if (!existingProfileId) return;
    if (generatingRoles || finalising) return;
    if (setupComplete) return;
    recoveryFiredRef.current = true;
    handleSurveyNext();

  }, [step, checkingProfile, existingProfileId, generatingRoles, finalising, setupComplete]);

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
      const payload = cleanProfilePayload({ ...profileData, experiences, educations, projects });
      // saveProgress is the single source of truth for onboarding_step;
      // letting the debounced auto-save write it too would clobber a newly
      // advanced step with whatever profileData was hydrated with on mount.
      delete payload.onboarding_step;
      delete payload.onboarding_complete;
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
      supabase.from("profiles").update(payload).eq("id", existingProfileId)
        .then(({ error }) => {
          if (error) console.warn("Auto-save failed:", error.message);
        })
        .catch((err) => {
          // Network error etc. — log so it doesn't surface as an unhandled rejection.
          console.warn("Auto-save network error:", err?.message || err);
        });
    }, 800);
    return () => clearTimeout(handle);
     
  }, [profileData, existingProfileId, checkingProfile, saving, finalising, generatingRoles]);

  const checkExistingProfile = async () => {
    if (!user) { setCheckingProfile(false); return; }
    const { data: profiles, error: profileCheckError } = await supabase.from("profiles").select("*").eq("id", user.id);
    if (profileCheckError) console.error("Error checking existing profile:", profileCheckError);
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
        supabase.from("education").select("*").eq("user_id", user.id)
          .order("display_order", { ascending: true, nullsLast: true })
          .order("created_at", { ascending: true }),
      ]);
      if (eduRes.data?.length) {
        setEducations(eduRes.data.map((e) => ({
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
        })));
      }
      if (expRes.data?.length) {
        setExperiences(expRes.data.map((e) => ({
          title: e.title || "",
          company: e.company || "",
          type: ALLOWED_EXPERIENCE_TYPES.has(e.type) ? e.type : "full_time",
          start_date: e.start_date || "",
          end_date: e.end_date || "",
          is_current: e.is_current || false,
          responsibilities: Array.isArray(e.responsibilities) ? e.responsibilities.join("\n") : (e.responsibilities || ""),
          skills_used: e.skills_used || [],
          tools_used: e.tools_used || [],
          managed_people: e.managed_people ?? false,
          cross_functional: e.cross_functional ?? false,
        })));
      }
      if (projRes.data?.length) {
        setProjects(projRes.data.map((p) => ({
          name: p.name || "",
          description: p.description || "",
          url: p.url || "",
          skills_demonstrated: p.skills_demonstrated || [],
        })));
      }
      if (certRes.data?.length) {
        setCertifications(certRes.data.map((c) => ({
          name: c.name || "",
          issuer: c.issuer || "",
          date_earned: c.date_earned || "",
        })));
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
      } catch { /* localStorage unavailable */ }
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
      proof_signals: extracted.proof_signals?.length ? extracted.proof_signals : prev.proof_signals || [],
      primary_domain: extracted.primary_domain || prev.primary_domain || null,
      adjacent_fields: extracted.adjacent_fields?.length ? extracted.adjacent_fields : prev.adjacent_fields || [],
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
    if (extracted.secondary_education && typeof extracted.secondary_education === "object") {
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
      setExperiences(exps.map((e) => ({
        title: e.title || "",
        company: e.company || "",
        // Accept whatever the extractor returned; fall back to keyword inference.
        type: inferExperienceType(e),
        start_date: e.start_date || "",
        end_date: e.end_date || "",
        is_current: e.is_current || false,
        responsibilities: Array.isArray(e.responsibilities)
          ? e.responsibilities.join("\n")
          : (e.responsibilities || ""),
        skills_used: e.skills_used || [],
        tools_used: [],
      })));
    }

    const projs = extracted.projects || [];
    if (projs.length > 0) {
      setProjects(extracted.projects);
    }

    if (extracted.certifications?.length > 0) {
      setCertifications(extracted.certifications);
    }
  };

  // Persist any education rows that have been touched. Rows with an id
  // get UPDATEd in place; rows without an id get INSERTed and their new
  // id is written back into local state for subsequent saves. Empty rows
  // (no institution, no level, no degree_type) are skipped so initial
  // blank state during onboarding doesn't write garbage. We do NOT delete
  // rows here — only AddInformation's editor (post-onboarding) can delete.
  const saveEducations = async () => {
    if (!Array.isArray(educations) || educations.length === 0) return;
    const updatedById = {};
    for (let i = 0; i < educations.length; i++) {
      const e = educations[i];
      const hasContent =
        (e.institution || "").trim() !== "" ||
        (e.education_level || "").trim() !== "" ||
        (e.degree_type || "").trim() !== "" ||
        (e.field_of_study || "").trim() !== "";
      if (!hasContent) continue;
      const row = {
        user_id: user.id,
        institution: e.institution || null,
        education_level: e.education_level || null,
        degree_type: e.degree_type || null,
        field_of_study: e.field_of_study || null,
        start_date: e.start_date || null,
        end_date: e.end_date || null,
        is_current: !!e.is_current,
        gpa: e.gpa || null,
        honors: e.honors || [],
        relevant_coursework: e.relevant_coursework || [],
        academic_projects: e.academic_projects || [],
        skills_developed: e.skills_developed || [],
        location: e.location || null,
        display_order: e.display_order ?? i,
      };
      if (e.id) {
        const { error: updErr } = await supabase
          .from("education")
          .update(row)
          .eq("id", e.id)
          .eq("user_id", user.id);
        if (updErr) throw updErr;
      } else {
        const { data, error: insErr } = await supabase
          .from("education")
          .insert(row)
          .select("id")
          .single();
        if (insErr) throw insErr;
        if (data?.id) updatedById[i] = data.id;
      }
    }
    if (Object.keys(updatedById).length > 0) {
      setEducations((prev) => prev.map((e, i) => updatedById[i] ? { ...e, id: updatedById[i] } : e));
    }
  };

  const saveProgress = async (stepNum) => {
    // skills is a single flat array now (Bug 3 fix dropped categories).
    // Dedupe to guard against accidental duplicate adds in the UI.
    const rawPayload = {
      ...profileData,
      experiences,
      educations,
      projects,
      onboarding_step: stepNum,
      skills: [...new Set(profileData.skills || [])],
    };
    const payload = cleanProfilePayload(rawPayload);

    // Remove undefined values so we don't accidentally overwrite DB fields with null/undefined unnecessarily
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    if (existingProfileId) {
      const { error: updateError } = await supabase.from("profiles").update(payload).eq("id", existingProfileId);
      if (updateError) throw updateError;
    } else {
      const { data, error } = await supabase.from("profiles").insert({
        id: user.id,
        ...payload,
        full_name: profileData.full_name || user.user_metadata?.full_name || "User",
      }).select();
      if (error) throw error;
      if (data?.[0]) {
        setExistingProfileId(data[0].id);
      }
    }

    // Persist education rows to the new table (Phase B). Done AFTER the
    // profile UPSERT because the FK on education.user_id depends on the
    // auth user existing — profiles.id and auth.users.id are 1:1.
    await saveEducations();
  };

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

  // Step 7→8: Run the AI track analysis (was 6→7 pre-practicum step).
  //
  // PR onboarding-tutorial refactor: the visual "Your Roles" page (step 8)
  // was replaced by the OnboardingTutorial. The pipeline is now:
  //
  //   1. handleSurveyNext: pre-analysis DB writes + analysis API call
  //   2. handleSurveyNext chains to handleFinalise on BOTH success and
  //      failure paths — so the user always reaches setupComplete=true.
  //   3. handleFinalise: task generation + final writes + set setupComplete
  //   4. User clicks "Go to platform" in tutorial → navigate to Home
  //
  // Analysis failure (e.g., transient session-refresh blip) does NOT block
  // the user — they reach Home with an empty Career Roadmap, and Home's
  // self-heal useEffect retries the analysis on next visit.
  const handleSurveyNext = async () => {
    if (generatingRoles) return;
    // Step 7 (Survey) → 8 (TierReveal) bypasses goTo, so emit the step-
    // completed event explicitly here. Without this we'd miss "survey" in
    // the funnel.
    track(EVENTS.ONBOARDING_STEP_COMPLETED, {
      step_index: 7,
      step_name: STEP_NAMES[7],
    });
    setStep(8);
    setGeneratingRoles(true);

    try {
      // Persist step 8 to DB before the career analysis reads the row.
      // skills is already a single flat array (Bug 3 fix dropped categories);
      // no merge needed.
      if (existingProfileId) {
        await supabase.from("profiles").update({
          onboarding_step: 9,
          skills: [...new Set(profileData.skills || [])],
        }).eq("id", existingProfileId);
      }

      // Write experiences/projects/certs to DB so the career analysis can read
      // them. Mirrors handleFinalise's snapshot → insert → delete-old pattern
      // so a partial failure can't wipe the user's data: if any insert errors
      // we roll back the inserts that did succeed and leave the existing rows
      // intact. Worst case the analysis runs against the user's previous DB
      // state instead of their newest edits — strictly better than empty.
      try {
        const [existingExpRes, existingProjRes, existingCertRes] = await Promise.all([
          supabase.from("experiences").select("id").eq("user_id", user.id),
          supabase.from("projects").select("id").eq("user_id", user.id),
          supabase.from("certifications").select("id").eq("user_id", user.id),
        ]);
        const oldExpIds = existingExpRes.data?.map((r) => r.id) || [];
        const oldProjIds = existingProjRes.data?.map((r) => r.id) || [];
        const oldCertIds = existingCertRes.data?.map((r) => r.id) || [];

        const insertedIds = { exp: [], proj: [], cert: [] };
        try {
          if (experiences.length > 0) {
            const { data, error } = await supabase.from("experiences").insert(experiences.map((e) => ({
              user_id: user.id,
              title: e.title,
              company: e.company,
              type: e.type,
              start_date: e.start_date,
              end_date: e.end_date,
              is_current: e.is_current,
              responsibilities: e.responsibilities,
              skills_used: e.skills_used,
              tools_used: e.tools_used,
              managed_people: e.managed_people ?? false,
              cross_functional: e.cross_functional ?? false,
            }))).select("id");
            if (error) throw error;
            insertedIds.exp = (data || []).map((r) => r.id);
          }
          if (projects.length > 0) {
            const { data, error } = await supabase.from("projects").insert(projects.map((p) => ({
              user_id: user.id,
              name: p.name,
              description: p.description,
              url: p.url,
              skills_demonstrated: p.skills_demonstrated || [],
            }))).select("id");
            if (error) throw error;
            insertedIds.proj = (data || []).map((r) => r.id);
          }
          if (certifications.length > 0) {
            const { data, error } = await supabase.from("certifications").insert(certifications.map((c) => ({
              user_id: user.id,
              name: c.name,
              issuer: c.issuer,
              date_earned: c.date_earned,
            }))).select("id");
            if (error) throw error;
            insertedIds.cert = (data || []).map((r) => r.id);
          }
        } catch (insertErr) {
          // Roll back partial inserts so the next attempt starts clean and
          // existing rows stay untouched.
          const rollbacks = [];
          if (insertedIds.exp.length > 0) rollbacks.push(supabase.from("experiences").delete().in("id", insertedIds.exp));
          if (insertedIds.proj.length > 0) rollbacks.push(supabase.from("projects").delete().in("id", insertedIds.proj));
          if (insertedIds.cert.length > 0) rollbacks.push(supabase.from("certifications").delete().in("id", insertedIds.cert));
          if (rollbacks.length > 0) await Promise.all(rollbacks);
          throw insertErr;
        }

        // All inserts succeeded — now safe to remove the previous rows by ID.
        const deleteOps = [];
        if (oldExpIds.length > 0) deleteOps.push(supabase.from("experiences").delete().in("id", oldExpIds));
        if (oldProjIds.length > 0) deleteOps.push(supabase.from("projects").delete().in("id", oldProjIds));
        if (oldCertIds.length > 0) deleteOps.push(supabase.from("certifications").delete().in("id", oldCertIds));
        if (deleteOps.length > 0) await Promise.all(deleteOps);
      } catch (preAnalysisErr) {
        console.error("Pre-analysis data save failed (non-blocking):", preAnalysisErr);
      }

      // Refresh session so we don't invoke with an expired access token
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      const accessToken = sessionData?.session?.access_token;
      if (sessionError || !accessToken) {
        throw new Error("Session expired. Please log out and log back in.");
      }

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-career-analysis`;
      const response = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          dream_roles: profileData.five_year_role ? [profileData.five_year_role] : [],
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error("Career analysis: non-JSON response", { status: response.status, body: responseText });
        throw new Error(`HTTP ${response.status}: invalid response`);
      }
      if (!response.ok) {
        console.error("Career analysis: HTTP error", { status: response.status, body: data });
        const httpErr = new Error(data?.error || data?.msg || `HTTP ${response.status}`);
        httpErr.status = response.status;
        throw httpErr;
      }
      if (data?.error) {
        console.error("Career analysis: function error", { body: data });
        throw new Error(data.error);
      }

      const analysisRoles = data?.roles || [];
      if (!mountedRef.current) return;

      // Atomically replace career roles using a DB transaction via RPC
      if (user && analysisRoles.length > 0) {
        const rolesPayload = analysisRoles.map((r) => ({
          title: r.title,
          track: r.track,
          match_score: r.readiness_score,
          readiness_score: r.readiness_score,
          goal_alignment_score: r.goal_alignment_score ?? null,
          matched_skills: r.matched_skills || [],
          missing_skills: r.missing_skills || [],
          skills_gap: r.missing_skills || [],
          alignment_to_goal: r.alignment_to_goal || "",
          alignment_reason: r.alignment_reason || "",
          reasoning: r.reasoning || "",
          action_items: r.action_items || [],
        }));

        const { error: rpcError } = await supabase.rpc("replace_career_roles", {
          p_user_id: user.id,
          p_roles: rolesPayload,
        });

        if (rpcError) throw rpcError;
      }

      if (existingProfileId) {
        // Capture the error explicitly — this write previously had no error
        // handling, which let it fail silently. We've seen real users land
        // with onboarding_complete=true but qualification_level=null +
        // last_reality_check_date=null + skill_gaps=[] (empty), the exact
        // shape this write should have populated. Don't throw on failure —
        // the analysis is still cached in local state for the track reveal,
        // and Home.jsx has a self-healing useEffect that re-runs the
        // analysis if it detects this null pattern on next visit.
        const { error: persistErr } = await supabase.from("profiles").update({
          skill_gaps: data?.skill_gaps || [],
          qualification_level: data?.qualification_level || null,
          overall_assessment: data?.overall_assessment || null,
          last_reality_check_date: new Date().toISOString(),
          onboarding_step: 9,
        }).eq("id", existingProfileId);
        if (persistErr) {
          console.error("[onboarding] career analysis persist failed:", persistErr, {
            existingProfileId,
            qualification_level: data?.qualification_level,
            skill_gaps_count: data?.skill_gaps?.length || 0,
            overall_assessment_len: data?.overall_assessment?.length || 0,
          });
        }
      }

      // Analysis succeeded — auto-chain to handleFinalise in the same async
      // flow so the user reaches setupComplete without a manual click.
      // handleFinalise handles its own errors via setFinaliseError, so the
      // outer catch only fires for analysis failures.
      if (mountedRef.current) {
        setGeneratingRoles(false);
        await handleFinalise();
      }
      return;
    } catch (err) {
      // Analysis failed. Don't block the user — fall through to handleFinalise
      // so they reach Home with an empty Career Roadmap. Home.jsx's
      // self-heal useEffect detects the missing qualification_level and
      // re-runs the analysis in the background on next visit. This keeps
      // the tutorial focused on orientation instead of branching into a
      // retry / error-banner UX that confused users when the underlying
      // throw was a transient session-refresh blip.
      console.error("Career analysis error (continuing to handleFinalise):", err?.message || err, err);
    }

    if (!mountedRef.current) return;
    setGeneratingRoles(false);
    // Always chain to handleFinalise — success path OR error path. Without
    // this, an analysis failure left setupComplete=false and the tutorial's
    // "Go to platform" button stuck disabled forever.
    await handleFinalise();
  };

  // Final step: save everything, mark complete, navigate
  const handleFinalise = async () => {
    if (finalising) return;
    setFinalising(true);

    // skills is now a single flat array (Bug 3 fix dropped categories).
    // Dedupe before the final write.
    const allSkills = [...new Set(profileData.skills || [])];

    let targetProfileId = existingProfileId;

    if (!targetProfileId) {
      // The user somehow reached the end without a profile row saved!
      // Attempt to save it now explicitly.
      const rawPayload = { ...profileData, experiences, educations, projects, onboarding_step: 8 };
      const payload = cleanProfilePayload(rawPayload);
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      const { data, error } = await supabase.from("profiles").insert({
        id: user.id,
        ...payload,
        full_name: profileData.full_name || user.user_metadata?.full_name || "User",
      }).select();

      if (error || !data?.[0]) {
        console.error("Critical error saving profile on finalise:", error);
        setFinaliseError("Could not create your profile. Please try again.");
        setFinalising(false);
        return;
      }
      
      targetProfileId = data[0].id;
      setExistingProfileId(targetProfileId);
    }

    // Capture existing IDs before inserting new data — delete only after inserts succeed
    const [existingExpRes, existingProjRes, existingCertRes, existingTaskRes] = await Promise.all([
      supabase.from("experiences").select("id").eq("user_id", user.id),
      supabase.from("projects").select("id").eq("user_id", user.id),
      supabase.from("certifications").select("id").eq("user_id", user.id),
      supabase.from("tasks").select("id").eq("user_id", user.id),
    ]);
    const oldExpIds = existingExpRes.data?.map((r) => r.id) || [];
    const oldProjIds = existingProjRes.data?.map((r) => r.id) || [];
    const oldCertIds = existingCertRes.data?.map((r) => r.id) || [];
    const oldTaskIds = existingTaskRes.data?.map((r) => r.id) || [];

    // Sequential inserts with per-type rollback tracking — prevents duplicate data on retry
    // if a partial failure occurs (e.g. experiences saved but certifications failed).
    const insertedIds = { exp: [], proj: [], cert: [], task: [] };

    try {
      if (experiences.length > 0) {
        // Whitelist columns that exist in the experiences schema. Spreading
        // raw React state can include UI-only fields and break the entire
        // insert with PGRST204 — see 20260425_experiences_managed_people.sql.
        const sanitisedExperiences = experiences.map((e) => ({
          user_id: user.id,
          title: e.title,
          company: e.company,
          type: e.type,
          start_date: e.start_date,
          end_date: e.end_date,
          is_current: e.is_current,
          responsibilities: e.responsibilities,
          skills_used: e.skills_used,
          tools_used: e.tools_used,
          managed_people: e.managed_people ?? false,
          cross_functional: e.cross_functional ?? false,
        }));
        const { data, error } = await supabase.from("experiences")
          .insert(sanitisedExperiences)
          .select("id");
        if (error) throw error;
        insertedIds.exp = (data || []).map((r) => r.id);
      }

      if (projects.length > 0) {
        const { data, error } = await supabase.from("projects")
          .insert(projects.map((proj) => ({
            name: proj.name,
            description: proj.description,
            url: proj.url,
            skills_demonstrated: proj.skills_demonstrated || [],
            user_id: user.id,
          })))
          .select("id");
        if (error) throw error;
        insertedIds.proj = (data || []).map((r) => r.id);
      }

      if (certifications.length > 0) {
        const { data, error } = await supabase.from("certifications")
          .insert(certifications.map((cert) => ({
            name: cert.name,
            issuer: cert.issuer,
            date_earned: cert.date_earned,
            user_id: user.id,
          })))
          .select("id");
        if (error) throw error;
        insertedIds.cert = (data || []).map((r) => r.id);
      }

      // Generate personalized tasks via Edge Function
      let tasksToInsert = [];
      // Map the edge function's richer taxonomy → the DB's chk constraints
      // (chk_tasks_priority: low|medium|high · chk_tasks_category: application|project|networking|skill|cv)
      const PRIORITY_MAP = { urgent_now: "high", this_week: "medium", longer_term: "low", high: "high", medium: "medium", low: "low" };
      const CATEGORY_MAP = { application: "application", cv: "cv", skill: "skill", project: "project", networking: "networking", interview_prep: "application", clarity_positioning: "application" };
      const normPriority = (p) => PRIORITY_MAP[p] || "medium";
      const normCategory = (c) => CATEGORY_MAP[c] || "application";
      try {
        const { data: taskData, error: taskInvokeError } = await supabase.functions.invoke("generate-tasks", {
          body: { context: "onboarding initial tasks" },
        });
        if (taskInvokeError) throw taskInvokeError;
        if (taskData?.tasks?.length > 0) {
          tasksToInsert = taskData.tasks.map((t) => {
            const priority = normPriority(t.priority);
            // Only honor LLM-provided dates when they validate. resolveDueDate
            // returns null when missing/invalid — no priority-based auto-
            // fallback. Tasks land with null due_date and the user sets one
            // explicitly via the Tasks-page UI when they want pressure.
            return {
              title: t.title,
              description: t.description,
              category: normCategory(t.category),
              priority,
              role_title: t.role_title || null,
              due_date: resolveDueDate(t.due_date),
              is_complete: false,
              user_id: user.id,
            };
          });
        }
      } catch (err) {
        console.error("Task generation error during onboarding:", err);
      }
      if (tasksToInsert.length === 0) {
        tasksToInsert = [
          { title: "Update your CV for target roles", description: "Tailor your CV based on skill gaps.", category: "cv", priority: "high", is_complete: false, user_id: user.id },
          { title: "Research target companies", description: "Find active job postings.", category: "application", priority: "high", is_complete: false, user_id: user.id },
        ];
      }
      const { data: taskInsertData, error: taskInsertError } = await supabase.from("tasks")
        .insert(tasksToInsert)
        .select("id");
      if (taskInsertError) throw taskInsertError;
      insertedIds.task = (taskInsertData || []).map((r) => r.id);

    } catch (err) {
      console.error("Error saving onboarding data:", err);
      // Roll back any inserts that succeeded in this attempt so retry starts clean
      const rollbacks = [];
      if (insertedIds.exp.length > 0) rollbacks.push(supabase.from("experiences").delete().in("id", insertedIds.exp));
      if (insertedIds.proj.length > 0) rollbacks.push(supabase.from("projects").delete().in("id", insertedIds.proj));
      if (insertedIds.cert.length > 0) rollbacks.push(supabase.from("certifications").delete().in("id", insertedIds.cert));
      if (insertedIds.task.length > 0) rollbacks.push(supabase.from("tasks").delete().in("id", insertedIds.task));
      if (rollbacks.length > 0) await Promise.all(rollbacks);
      setFinaliseError("Some data could not be saved. Please try again.");
      setFinalising(false);
      return;
    }

    // Delete old records by ID — only after new data is safely inserted
    const deleteOps = [];
    if (oldExpIds.length > 0) deleteOps.push(supabase.from("experiences").delete().in("id", oldExpIds));
    if (oldProjIds.length > 0) deleteOps.push(supabase.from("projects").delete().in("id", oldProjIds));
    if (oldCertIds.length > 0) deleteOps.push(supabase.from("certifications").delete().in("id", oldCertIds));
    if (oldTaskIds.length > 0) deleteOps.push(supabase.from("tasks").delete().in("id", oldTaskIds));
    if (deleteOps.length > 0) {
      const deleteResults = await Promise.all(deleteOps);
      const deleteError = deleteResults.find((r) => r.error)?.error;
      if (deleteError) {
        console.error("Error cleaning up old records:", deleteError);
        // Non-fatal: new data was already saved. Log and continue.
      }
    }

    // Mark onboarding complete
    const finalRawPayload = {
      ...profileData,
      experiences,
      educations,
      projects,
      skills: allSkills,
      onboarding_complete: true,
      onboarding_step: 9,
    };
    const finalPayload = cleanProfilePayload(finalRawPayload);
    Object.keys(finalPayload).forEach(key => finalPayload[key] === undefined && delete finalPayload[key]);

    // handleSurveyNext (step 8) already wrote these fields from the live
    // career-analysis output. profileData (the React state) is stale —
    // it never received the analysis values, so cleanProfilePayload would
    // include them as null and clobber the real values from step 7.
    // Strip them here so handleFinalise can't overwrite step 7's writes.
    delete finalPayload.qualification_level;
    delete finalPayload.skill_gaps;
    delete finalPayload.overall_assessment;
    delete finalPayload.last_reality_check_date;

    const { error: finalUpdateError } = await supabase.from("profiles").update(finalPayload).eq("id", targetProfileId);
    if (finalUpdateError) {
      console.error("Failed to mark onboarding complete:", finalUpdateError);
      setFinaliseError("Could not complete setup. Please try again.");
      setFinalising(false);
      return;
    }

    // onboarding_completed — compute duration_ms from the localStorage
    // timestamp set in checkExistingProfile when onboarding_started fired.
    // Falls back to null if the flag was missing (resumed across devices,
    // localStorage cleared, etc.) — better than a misleading 0.
    try {
      const flagKey = `gaj.onb_start.${user.id}`;
      const startStr = localStorage.getItem(flagKey);
      const durationMs = startStr ? Date.now() - parseInt(startStr, 10) : null;
      track(EVENTS.ONBOARDING_COMPLETED, { duration_ms: durationMs });
      localStorage.removeItem(flagKey);
    } catch { /* localStorage unavailable */ }

    // Remove cached query data so Home fetches fresh — invalidateQueries only
    // marks stale but leaves old data visible, which can trigger the onboarding
    // redirect guard. Critically, profile_layout_chrome is what Layout.jsx
    // reads to decide whether to render the sidebar — without invalidating it,
    // the user lands on Home with no nav until they hard-refresh, because
    // Layout stays mounted across the onboarding→Home navigation and its
    // 5-min staleTime keeps serving the pre-onboarding "onboarding_complete:
    // false" snapshot. projects/certifications/daily_action have the same
    // problem on a smaller scale (Home renders empty arrays until refresh).
    queryClient.removeQueries({ queryKey: ["userProfile"] });
    queryClient.removeQueries({ queryKey: ["careerRoles"] });
    queryClient.removeQueries({ queryKey: ["tasks"] });
    queryClient.removeQueries({ queryKey: ["applications"] });
    queryClient.removeQueries({ queryKey: ["experiences"] });
    queryClient.removeQueries({ queryKey: ["profile_layout_chrome"] });
    queryClient.removeQueries({ queryKey: ["projects"] });
    queryClient.removeQueries({ queryKey: ["certifications"] });
    queryClient.removeQueries({ queryKey: ["daily_action"] });

    setFinalising(false);
    // PR onboarding-tutorial: instead of navigating to Home directly, flip
    // setupComplete and let the tutorial's "Go to platform" button drive
    // navigation. handleTutorialEnd persists has_seen_onboarding_tutorial
    // before navigating.
    setSetupComplete(true);
  };

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
        console.warn("[onboarding] could not persist has_seen_onboarding_tutorial:", flagErr.message);
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
      <>
        <style>{ONB_CSS}</style>
        <div className="onb min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#52545A]" />
        </div>
      </>
    );
  }

  // Step 8 → render the OnboardingTutorial full-screen (no OnboardingShell).
  // handleSurveyNext now chains to handleFinalise on BOTH success and
  // failure paths, so setupComplete reliably flips true and the tutorial's
  // "Go to platform" button enables. No setupError prop — error UX moved
  // out of the tutorial; Home self-heal recovers in the background.
  if (step === 9) {
    return (
      <>
        <style>{ONB_CSS}</style>
        <div className="onb">
          {finaliseError && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full">
              <div className="onb-banner onb-banner-error">
                <p>{finaliseError}</p>
                <button onClick={handleFinalise} className="mt-2 text-xs font-semibold underline underline-offset-2">
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
        </div>
      </>
    );
  }

  if (finalising) {
    return (
      <>
        <style>{ONB_CSS}</style>
        <div className="onb min-h-screen flex flex-col items-center justify-center gap-5">
          <Loader2 className="w-9 h-9 animate-spin text-[#F87060]" />
          <div className="text-center">
            <p className="onb-h1" style={{ fontSize: 22 }}>Initialising your platform…</p>
            <p className="onb-sub" style={{ maxWidth: 380 }}>Generating tasks, configuring agents, building your dashboard.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{ONB_CSS}</style>
      <div className="onb">
    <OnboardingShell currentStep={step}>
      {saveError && (
        <div className="mb-4 onb-banner onb-banner-error">{saveError}</div>
      )}
      {finaliseError && (
        <div className="mb-4 onb-banner onb-banner-error">
          <p>{finaliseError}</p>
          <button onClick={handleFinalise} className="mt-2 text-xs font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      )}
      {step === 0 && (
        <StepResumeUpload
          onExtracted={handleResumeExtracted}
          onNext={() => goTo(1)}
          profileData={profileData}
          onChange={(patch) => setProfileData(prev => ({ ...prev, ...patch }))}
        />
      )}
      {step === 1 && (
        <StepEducation
          data={profileData}
          onChange={setProfileData}
          educations={educations}
          setEducations={setEducations}
          onNext={() => goTo(2)}
          onBack={() => goTo(0)}
        />
      )}
      {step === 2 && (
        <StepPracticum
          data={profileData}
          onChange={setProfileData}
          educations={educations}
          onNext={() => goTo(3)}
          onBack={() => goTo(1)}
        />
      )}
      {step === 3 && (
        <StepExperience
          experiences={experiences}
          onChange={setExperiences}
          onNext={() => goTo(4)}
          onBack={() => goTo(2)}
        />
      )}
      {step === 4 && (
        <StepRoleSkills
          experiences={experiences}
          setExperiences={setExperiences}
          educations={educations}
          setEducations={setEducations}
          projects={projects}
          setProjects={setProjects}
          onNext={() => goTo(5)}
          onBack={() => goTo(3)}
        />
      )}
      {step === 5 && (
        <StepSkills
          data={profileData}
          onChange={setProfileData}
          onNext={() => goTo(6)}
          onBack={() => goTo(4)}
        />
      )}
      {step === 6 && (
        <StepCareerDirection
          data={profileData}
          onChange={setProfileData}
          onNext={() => goTo(7)}
          onBack={() => goTo(5)}
        />
      )}
      {step === 7 && (
        <StepConstraints
          data={profileData}
          onChange={setProfileData}
          onSubmit={() => goTo(8)}
          onBack={() => goTo(6)}
          submitting={saving}
        />
      )}
      {step === 8 && (
        <StepSurvey
          data={profileData}
          onChange={setProfileData}
          onNext={handleSurveyNext}
          onBack={() => goTo(7)}
        />
      )}
      {/* step === 9 is rendered above via OnboardingTutorial — no entry here. */}
    </OnboardingShell>
      </div>
    </>
  );
}
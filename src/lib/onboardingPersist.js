import { supabase } from "@/api/supabaseClient";
import { cleanProfilePayload } from "@/lib/onboardingPayload";
import { resolveDueDate } from "@/lib/taskDueDate";
import { ONBOARDING_FALLBACK_TASKS } from "@/lib/onboardingFallbackTasks";
import { track, EVENTS } from "@/lib/analytics";
import { prewarmMasterCv } from "@/lib/prewarmMasterCv";
import { runCareerAnalysisAndReplaceRoles } from "@/lib/careerAnalysis";

// Shared onboarding persist helper — the four DB-write functions lifted
// VERBATIM out of the V1 Onboarding.jsx component (PR 6a). This is a pure
// mechanical extraction: zero behavior change. Every function body below is
// character-for-character identical to its former inline definition; the ONLY
// edits are (1) a `ctx` destructure line at the top of each function that
// re-binds the state/setters/refs the body used to close over, and (2) the two
// intra-module call sites — `saveEducations()` and `handleFinalise()` — now
// thread the same `ctx` through (`saveEducations(ctx)`, `handleFinalise(ctx)`).
//
// The stable module imports above (supabase singleton, cleanProfilePayload,
// resolveDueDate, ONBOARDING_FALLBACK_TASKS, prewarmMasterCv, track, EVENTS)
// were already top-level imports in Onboarding.jsx — re-importing them here is
// behavior-identical. Everything that varies per render (user, the entity
// state arrays + their setters, existingProfileId, mountedRef, queryClient,
// STEP_NAMES) arrives via `ctx`, which V1 builds fresh at each call so the
// snapshot matches the render that invoked it — exactly as the closures did.
//
// V1 wires these via thin wrappers (see Onboarding.jsx). PR 6b will call the
// SAME helper from the V2 flow. Touches the LIVE signup path — do not "tidy"
// any body here; faithfulness is the whole contract.

// Persist any education rows that have been touched. Rows with an id
// get UPDATEd in place; rows without an id get INSERTed and their new
// id is written back into local state for subsequent saves. Rows with no
// institution are skipped — an institution-less education row would render
// as an "[Institution Name Missing]" placeholder on the CV, and it's also
// the initial blank onboarding state we don't want to persist. We do NOT
// delete rows here — only AddInformation's editor (post-onboarding) can.
export const saveEducations = async (ctx) => {
  const { educations, user, setEducations } = ctx;
  if (!Array.isArray(educations) || educations.length === 0) return;
  const updatedById = {};
  for (let i = 0; i < educations.length; i++) {
    const e = educations[i];
    // Root prevention: an education row without an institution is NOT
    // persisted — it would surface downstream as an "[Institution Name
    // Missing]" placeholder on the generated CV. The final review step
    // hard-gates institution, but saveEducations also runs on every
    // per-step advance; this closes that path so an extracted row carrying
    // a degree/field but no school never gets written.
    if (!(e.institution || "").trim()) continue;
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
      skills: e.skills || [],
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
    setEducations((prev) =>
      prev.map((e, i) => (updatedById[i] ? { ...e, id: updatedById[i] } : e)),
    );
  }
};

export const saveProgress = async (ctx, stepNum) => {
  const {
    profileData,
    experiences,
    educations,
    projects,
    existingProfileId,
    user,
    setExistingProfileId,
  } = ctx;
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
  Object.keys(payload).forEach(
    (key) => payload[key] === undefined && delete payload[key],
  );

  if (existingProfileId) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", existingProfileId);
    if (updateError) throw updateError;
  } else {
    // Stamp invite_code + cohort_label from user_metadata at first
    // profile insert (set during auth.signUp in Login.jsx). Null-
    // tolerant: users who signed up before the pilot gate landed
    // have no metadata fields → both stay null. Backwards-compatible.
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        ...payload,
        full_name:
          profileData.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "User",
        invite_code: user.user_metadata?.invite_code ?? null,
        cohort_label: user.user_metadata?.cohort_label ?? null,
      })
      .select();
    if (error) throw error;
    if (data?.[0]) {
      setExistingProfileId(data[0].id);
      // Fire-and-forget welcome email on the FIRST successful profile
      // insert. Idempotent server-side via Resend Idempotency-Key
      // (welcome:<user_id>) — even if the user reloads mid-onboarding
      // and saveProfile runs again, the second call would only fire
      // if a profile DIDN'T exist (because of the existingProfileId
      // branch above), so this naturally fires once per user.
      // Failure is non-fatal and logged in edge function metrics.
      supabase.functions
        .invoke("send-welcome-email", { body: {} })
        .catch((emailErr) => {
          console.warn(
            "[onboarding] welcome email failed (non-fatal):",
            emailErr,
          );
        });
    }
  }

  // Persist education rows to the new table (Phase B). Done AFTER the
  // profile UPSERT because the FK on education.user_id depends on the
  // auth user existing — profiles.id and auth.users.id are 1:1.
  await saveEducations(ctx);
};

// Step 7→8: Run the AI track analysis (was 6→7 pre-internship step).
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
export const handleSurveyNext = async (ctx) => {
  const {
    generatingRoles,
    setStep,
    setGeneratingRoles,
    existingProfileId,
    profileData,
    experiences,
    projects,
    certifications,
    user,
    mountedRef,
    STEP_NAMES,
  } = ctx;
  if (generatingRoles) return;
  // Step 5 (Survey) → 6 (TierReveal) bypasses goTo, so emit the step-
  // completed event explicitly here. Without this we'd miss "survey"
  // in the funnel. Step indices shifted in Phase 3 — Survey is now
  // index 5, TierReveal index 6.
  track(EVENTS.ONBOARDING_STEP_COMPLETED, {
    step_index: 5,
    step_name: STEP_NAMES[5],
  });
  setStep(6);
  setGeneratingRoles(true);

  try {
    // Persist step 6 to DB before the career analysis reads the row.
    // skills is already a single flat array (Bug 3 fix dropped categories);
    // no merge needed.
    if (existingProfileId) {
      await supabase
        .from("profiles")
        .update({
          onboarding_step: 6,
          skills: [...new Set(profileData.skills || [])],
        })
        .eq("id", existingProfileId);
    }

    // Write experiences/projects/certs to DB so the career analysis can read
    // them. Mirrors handleFinalise's snapshot → insert → delete-old pattern
    // so a partial failure can't wipe the user's data: if any insert errors
    // we roll back the inserts that did succeed and leave the existing rows
    // intact. Worst case the analysis runs against the user's previous DB
    // state instead of their newest edits — strictly better than empty.
    try {
      const [existingExpRes, existingProjRes, existingCertRes] =
        await Promise.all([
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
          const { data, error } = await supabase
            .from("experiences")
            .insert(
              experiences.map((e) => ({
                user_id: user.id,
                title: e.title,
                company: e.company,
                type: e.type,
                start_date: e.start_date,
                end_date: e.end_date,
                is_current: e.is_current,
                responsibilities: e.responsibilities,
                skills: e.skills || [],
                managed_people: e.managed_people ?? false,
                cross_functional: e.cross_functional ?? false,
              })),
            )
            .select("id");
          if (error) throw error;
          insertedIds.exp = (data || []).map((r) => r.id);
        }
        if (projects.length > 0) {
          const { data, error } = await supabase
            .from("projects")
            .insert(
              projects.map((p) => ({
                user_id: user.id,
                name: p.name,
                description: p.description,
                url: p.url,
                skills: p.skills || [],
              })),
            )
            .select("id");
          if (error) throw error;
          insertedIds.proj = (data || []).map((r) => r.id);
        }
        if (certifications.length > 0) {
          const { data, error } = await supabase
            .from("certifications")
            .insert(
              certifications.map((c) => ({
                user_id: user.id,
                name: c.name,
                issuer: c.issuer,
                date_earned: c.date_earned,
              })),
            )
            .select("id");
          if (error) throw error;
          insertedIds.cert = (data || []).map((r) => r.id);
        }
      } catch (insertErr) {
        // Roll back partial inserts so the next attempt starts clean and
        // existing rows stay untouched.
        const rollbacks = [];
        if (insertedIds.exp.length > 0)
          rollbacks.push(
            supabase.from("experiences").delete().in("id", insertedIds.exp),
          );
        if (insertedIds.proj.length > 0)
          rollbacks.push(
            supabase.from("projects").delete().in("id", insertedIds.proj),
          );
        if (insertedIds.cert.length > 0)
          rollbacks.push(
            supabase.from("certifications").delete().in("id", insertedIds.cert),
          );
        if (rollbacks.length > 0) await Promise.all(rollbacks);
        throw insertErr;
      }

      // All inserts succeeded — now safe to remove the previous rows by ID.
      const deleteOps = [];
      if (oldExpIds.length > 0)
        deleteOps.push(
          supabase.from("experiences").delete().in("id", oldExpIds),
        );
      if (oldProjIds.length > 0)
        deleteOps.push(supabase.from("projects").delete().in("id", oldProjIds));
      if (oldCertIds.length > 0)
        deleteOps.push(
          supabase.from("certifications").delete().in("id", oldCertIds),
        );
      if (deleteOps.length > 0) await Promise.all(deleteOps);
    } catch (preAnalysisErr) {
      console.error(
        "Pre-analysis data save failed (non-blocking):",
        preAnalysisErr,
      );
    }

    // Career analysis + atomic role replace, via the shared helper. Passing
    // shouldContinue preserves the original `if (!mountedRef.current) return`
    // skip: the helper aborts BEFORE the RPC when the component has unmounted,
    // and we bail below on result.aborted so the profiles update + finalise
    // chain are skipped exactly as before.
    const result = await runCareerAnalysisAndReplaceRoles({
      userId: user.id,
      dreamRoles: profileData.five_year_role
        ? [profileData.five_year_role]
        : [],
      shouldContinue: () => mountedRef.current,
    });
    const data = result.data;
    if (result.aborted) return;
    // Cached path: onboarding never expects this (first run for the user), but
    // defensively no-op if the server hits cache for some reason — career_roles
    // for these inputs is already in DB (the helper already skipped the RPC).
    if (data?.cached) {
      console.warn(
        "[onboarding] unexpected cached:true on first analysis run — skipping RPC",
      );
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
      const { error: persistErr } = await supabase
        .from("profiles")
        .update({
          skill_gaps: data?.skill_gaps || [],
          qualification_level: data?.qualification_level || null,
          overall_assessment: data?.overall_assessment || null,
          // last_reality_check_date is stamped on the final profile update
          // in handleFinalise — AFTER the experiences/projects/certs
          // re-insert succeeds — so it's >= every fresh `created_at`.
          // Stamping it here would predate the inserts by ~1s and trip
          // isAnalysisStale() on every new user's first Home load.
          onboarding_step: 6,
        })
        .eq("id", existingProfileId);
      if (persistErr) {
        console.error(
          "[onboarding] career analysis persist failed:",
          persistErr,
          {
            existingProfileId,
            qualification_level: data?.qualification_level,
            skill_gaps_count: data?.skill_gaps?.length || 0,
            overall_assessment_len: data?.overall_assessment?.length || 0,
          },
        );
      }
    }

    // Analysis succeeded — auto-chain to handleFinalise in the same async
    // flow so the user reaches setupComplete without a manual click.
    // handleFinalise handles its own errors via setFinaliseError, so the
    // outer catch only fires for analysis failures.
    if (mountedRef.current) {
      setGeneratingRoles(false);
      await handleFinalise(ctx);
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
    console.error(
      "Career analysis error (continuing to handleFinalise):",
      err?.message || err,
      err,
    );
  }

  if (!mountedRef.current) return;
  setGeneratingRoles(false);
  // Always chain to handleFinalise — success path OR error path. Without
  // this, an analysis failure left setupComplete=false and the tutorial's
  // "Go to platform" button stuck disabled forever.
  await handleFinalise(ctx);
};

// Final step: save everything, mark complete, navigate
export const handleFinalise = async (ctx) => {
  const {
    finalising,
    setFinalising,
    profileData,
    existingProfileId,
    experiences,
    educations,
    projects,
    certifications,
    user,
    setExistingProfileId,
    setFinaliseError,
    queryClient,
    setSetupComplete,
  } = ctx;
  if (finalising) return;
  setFinalising(true);

  // skills is now a single flat array (Bug 3 fix dropped categories).
  // Dedupe before the final write.
  const allSkills = [...new Set(profileData.skills || [])];

  let targetProfileId = existingProfileId;

  if (!targetProfileId) {
    // The user somehow reached the end without a profile row saved!
    // Attempt to save it now explicitly.
    const rawPayload = {
      ...profileData,
      experiences,
      educations,
      projects,
      onboarding_step: 5,
    };
    const payload = cleanProfilePayload(rawPayload);
    Object.keys(payload).forEach(
      (key) => payload[key] === undefined && delete payload[key],
    );

    // Same cohort-stamp pattern as the primary insert site above —
    // this is the defensive finalise-fallback path that runs only
    // when the per-step saveProfile didn't land a profile row.
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        ...payload,
        full_name:
          profileData.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "User",
        invite_code: user.user_metadata?.invite_code ?? null,
        cohort_label: user.user_metadata?.cohort_label ?? null,
      })
      .select();

    if (!error && data?.[0]) {
      // First profile row created via the finalise fallback. Same
      // fire-and-forget welcome email pattern as the primary path.
      // Resend idempotency key prevents double-sends if both paths
      // somehow fire for the same user.
      supabase.functions
        .invoke("send-welcome-email", { body: {} })
        .catch((emailErr) => {
          console.warn(
            "[onboarding] welcome email failed (non-fatal):",
            emailErr,
          );
        });
    }

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
  const [existingExpRes, existingProjRes, existingCertRes, existingTaskRes] =
    await Promise.all([
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
        skills: e.skills || [],
        managed_people: e.managed_people ?? false,
        cross_functional: e.cross_functional ?? false,
      }));
      const { data, error } = await supabase
        .from("experiences")
        .insert(sanitisedExperiences)
        .select("id");
      if (error) throw error;
      insertedIds.exp = (data || []).map((r) => r.id);
    }

    if (projects.length > 0) {
      const { data, error } = await supabase
        .from("projects")
        .insert(
          projects.map((proj) => ({
            name: proj.name,
            description: proj.description,
            url: proj.url,
            skills: proj.skills || [],
            user_id: user.id,
          })),
        )
        .select("id");
      if (error) throw error;
      insertedIds.proj = (data || []).map((r) => r.id);
    }

    if (certifications.length > 0) {
      const { data, error } = await supabase
        .from("certifications")
        .insert(
          certifications.map((cert) => ({
            name: cert.name,
            issuer: cert.issuer,
            date_earned: cert.date_earned,
            user_id: user.id,
          })),
        )
        .select("id");
      if (error) throw error;
      insertedIds.cert = (data || []).map((r) => r.id);
    }

    // Generate personalized tasks in the BACKGROUND — don't block
    // onboarding completion. Saves ~20s of perceived latency before the
    // track reveal screen. Tasks land in the DB ~10-20s after navigation;
    // by the time the user clicks through to the Tasks page (typically
    // after exploring Roadmap first) they're already there.
    //
    // Failure layers:
    // 1. Server: openaiChatCompletionWithRetry retries 3x with exp
    //    backoff on transient errors (PR R1).
    // 2. Client: this .catch inserts the 2 ONBOARDING_FALLBACK_TASKS so
    //    the user never lands with an empty Tasks page. Tasks page
    //    detects all-fallback state via allTasksAreOnboardingFallback
    //    and surfaces a "Generate personalized tasks" banner the user
    //    can click to upgrade to real LLM-generated tasks.
    // 3. Browser closes mid-flight: neither path runs. Tasks page's
    //    empty-state still surfaces the same banner.
    //
    // No `insertedIds.task` push — the outer-catch rollback is for
    // synchronous onboarding failures. Anything inserted async after
    // onboarding finalises is out of rollback scope; the Layer-2 banner
    // is the safety net for any orphan outcomes.
    (async () => {
      try {
        const PRIORITY_MAP = {
          urgent_now: "high",
          this_week: "medium",
          longer_term: "low",
          high: "high",
          medium: "medium",
          low: "low",
        };
        const CATEGORY_MAP = {
          application: "application",
          cv: "cv",
          skill: "skill",
          project: "project",
          networking: "networking",
          interview_prep: "application",
          clarity_positioning: "application",
        };
        const normPriority = (p) => PRIORITY_MAP[p] || "medium";
        const normCategory = (c) => CATEGORY_MAP[c] || "application";

        const { data: taskData, error: taskInvokeError } =
          await supabase.functions.invoke("generate-tasks", {
            body: { context: "onboarding initial tasks" },
          });
        if (taskInvokeError) throw taskInvokeError;
        const aiTasks = (taskData?.tasks || []).map((t) => ({
          title: t.title,
          description: t.description,
          category: normCategory(t.category),
          priority: normPriority(t.priority),
          role_title: t.role_title || null,
          due_date: resolveDueDate(t.due_date),
          is_complete: false,
          user_id: user.id,
        }));
        if (aiTasks.length === 0)
          throw new Error("generate-tasks returned no tasks");
        const { error: insertErr } = await supabase
          .from("tasks")
          .insert(aiTasks);
        if (insertErr) throw insertErr;
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      } catch (err) {
        console.error("Background onboarding task generation failed:", err);
        try {
          await supabase.from("tasks").insert(
            ONBOARDING_FALLBACK_TASKS.map((t) => ({
              ...t,
              is_complete: false,
              user_id: user.id,
            })),
          );
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        } catch (fallbackErr) {
          // Both AI and fallback insert failed. Tasks page's empty-state
          // banner is the final recovery — user clicks Generate, gets tasks.
          console.error(
            "Onboarding fallback task insert also failed:",
            fallbackErr,
          );
        }
      }
    })();
  } catch (err) {
    console.error("Error saving onboarding data:", err);
    // Roll back any inserts that succeeded in this attempt so retry starts clean
    const rollbacks = [];
    if (insertedIds.exp.length > 0)
      rollbacks.push(
        supabase.from("experiences").delete().in("id", insertedIds.exp),
      );
    if (insertedIds.proj.length > 0)
      rollbacks.push(
        supabase.from("projects").delete().in("id", insertedIds.proj),
      );
    if (insertedIds.cert.length > 0)
      rollbacks.push(
        supabase.from("certifications").delete().in("id", insertedIds.cert),
      );
    if (insertedIds.task.length > 0)
      rollbacks.push(
        supabase.from("tasks").delete().in("id", insertedIds.task),
      );
    if (rollbacks.length > 0) await Promise.all(rollbacks);
    setFinaliseError("Some data could not be saved. Please try again.");
    setFinalising(false);
    return;
  }

  // Delete old records by ID — only after new data is safely inserted
  const deleteOps = [];
  if (oldExpIds.length > 0)
    deleteOps.push(supabase.from("experiences").delete().in("id", oldExpIds));
  if (oldProjIds.length > 0)
    deleteOps.push(supabase.from("projects").delete().in("id", oldProjIds));
  if (oldCertIds.length > 0)
    deleteOps.push(
      supabase.from("certifications").delete().in("id", oldCertIds),
    );
  if (oldTaskIds.length > 0)
    deleteOps.push(supabase.from("tasks").delete().in("id", oldTaskIds));
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
    onboarding_step: 6,
  };
  const finalPayload = cleanProfilePayload(finalRawPayload);
  Object.keys(finalPayload).forEach(
    (key) => finalPayload[key] === undefined && delete finalPayload[key],
  );

  // handleSurveyNext (step 8) already wrote these fields from the live
  // career-analysis output. profileData (the React state) is stale —
  // it never received the analysis values, so cleanProfilePayload would
  // include them as null and clobber the real values from step 7.
  // Strip them here so handleFinalise can't overwrite step 7's writes.
  delete finalPayload.qualification_level;
  delete finalPayload.skill_gaps;
  delete finalPayload.overall_assessment;
  delete finalPayload.last_reality_check_date;

  // Stamp last_reality_check_date HERE — AFTER the experiences/projects/
  // certifications re-insert above. Postgres sets each new row's
  // created_at at INSERT time; stamping the freshness marker earlier
  // (e.g. in handleSurveyNext, where this used to live) predates those
  // rows by ~1s and trips isAnalysisStale() on the user's first Home
  // load. Stamping it last guarantees marker >= every fresh created_at.
  finalPayload.last_reality_check_date = new Date().toISOString();

  const { error: finalUpdateError } = await supabase
    .from("profiles")
    .update(finalPayload)
    .eq("id", targetProfileId);
  if (finalUpdateError) {
    console.error("Failed to mark onboarding complete:", finalUpdateError);
    setFinaliseError("Could not complete setup. Please try again.");
    setFinalising(false);
    return;
  }

  // Pre-warm the master CV in the background (speed regression fix). Without it,
  // a new user's FIRST tailor pays refine-cv's cold inline master authoring
  // (~40-60s, Sonnet); building the master here (deterministic, no LLM, same as
  // the studio) means refine-cv finds a warm master and goes straight to the
  // ~16-23s select-and-reword. Fire-and-forget (not awaited): it must never block
  // or fail onboarding. Idempotent — skips when a master already exists — and the
  // refine-cv self-heal is the backstop if the tab closes before this runs.
  prewarmMasterCv({ supabase, user });

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
  } catch {
    /* localStorage unavailable */
  }

  // Remove cached query data so Home fetches fresh — invalidateQueries
  // only marks stale but leaves old data visible, which can trigger the
  // onboarding redirect guard. After PR cache-consolidation-p0, all
  // four profile cache shapes (userProfile, profile_layout_chrome,
  // userProfileFullName, profile_practicum) collapse to the single
  // ["userProfile", uid] key, so one removeQueries fans out to Layout,
  // LinkedIn ProfileTab, and Internship without further calls.
  queryClient.removeQueries({ queryKey: ["userProfile"] });
  queryClient.removeQueries({ queryKey: ["careerRoles"] });
  queryClient.removeQueries({ queryKey: ["tasks"] });
  queryClient.removeQueries({ queryKey: ["applications"] });
  queryClient.removeQueries({ queryKey: ["experiences"] });
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

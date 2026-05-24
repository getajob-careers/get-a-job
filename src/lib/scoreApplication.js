// Background scoring of applications.
//
// Fire-and-forget pattern — the caller does NOT await this function.
//
// PR-D rewrote the scoring flow into three paths, tried in order:
//   1. application.job_id present → run scoreJobFit against the linked
//      jobs row (deterministic, instant, same answer as Jobs page)
//   2. No job_id but JD text present → call extract-job-requirements in
//      stateless mode for v4 fields → scoreJobFit (deterministic, ~5-30s)
//   3. Both fail → fall back to analyze-job-match LLM (legacy, ~3-8s)
//
// applications.score_source records which path produced the number so the
// UI can flag the difference + ops can audit drift.
//
// Previously: EVERY scoring call went straight to analyze-job-match.
//
// Track comes from BOTH match_score (JD fit) and goal_alignment_score
// (does this role advance the 5-year target?), mirroring the goal-aware
// formula in generate-career-analysis. Without alignment, a high-fit
// off-path role like an SDR for a Product Manager target wrongly landed
// in track_1. When the user has no 5-year goal set, analyze-job-match
// omits goal_alignment_score and we fall back to fit-only thresholds.
//
// Wired into every code path that inserts an application (JobSuggestions,
// Tracker manual add, chat agent's Path B handler) plus the JD-save
// handler on ApplicationRow (so updating a JD re-scores). JobMatchChecker
// computes synchronously and uses the same trackFromScores helper.
//
// Failure semantics: on any error reaching analyze-job-match or writing
// the result, we set applications.track_scoring_failed_at so the row's UI
// can swap "Calculating track…" for a Retry button. Successful runs clear
// the field. Pre-2026-04-28 behavior was console.warn-only — silent
// failures left rows stuck on the placeholder forever.

import { scoreJobFit } from "./scoreJobFit";

// Persist a deterministic scoreJobFit result onto an application row.
// Shared between the linked-job path (1) and the extracted-JD path (2).
async function writeDeterministic(supabase, applicationId, result, userId, queryClient) {
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      qualification_score: result.fit_score,
      goal_alignment_score: result.goal_alignment_score,
      required_seniority: null,
      track: result.track,
      track_scoring_failed_at: null,
      score_source: "deterministic",
    })
    .eq("id", applicationId);
  if (updateError) throw updateError;
  queryClient?.invalidateQueries({
    queryKey: userId ? ["applications", userId] : ["applications"],
  });
}

// Fit-only fallback — used when the user has no 5-year goal so the LLM
// can't return alignment. Thresholds match FIT_ONLY_THRESHOLDS in
// generate-career-analysis (0.55/0.40/0.25). Exported as the inline
// helper for JobMatchChecker too, in case alignment is missing.
export function trackFromScore(score) {
  if (score >= 0.55) return "track_1";
  if (score >= 0.40) return "track_2";
  if (score >= 0.25) return "track_3";
  return "track_3";
}

// Seniority ceiling per career stage — mirrors T1_SENIORITY_CEILING in
// generate-career-analysis but stricter for early_career, because the
// LLM-based fit score doesn't apply seniorityGapPenalty (it gives full
// credit on topical skill overlap regardless of experience gap). For an
// early-career student a 4-years-required Mid role still scored 0.70+
// match and landed in track_1 — wrong, since they can't be hired NOW.
// Stricter ceiling pushes those to track_3 (Work Toward).
const STAGE_T1_CEILING = {
  early: 1,   // Entry + Entry_Mid only — Mid+ is "Work Toward" for a student
  mid: 3,     // up to Mid_Senior
  senior: 6,  // unbounded
};

const SENIORITY_RANK = {
  Entry: 0,
  Entry_Mid: 1,
  Mid: 2,
  Mid_Senior: 3,
  Senior: 3,
  Lead: 4,
  Manager: 4,
  Principal: 4,
  Staff: 4,
  Director: 5,
  VP: 6,
};

// Goal-aware track derivation. Combines three signals from analyze-job-match:
//   fit             — JD skill/topic match (0-1)
//   alignment       — how this role advances the 5-year goal (0-1, may be null)
//   roleSeniority   — JD's required experience level (string, may be null)
//   userStage       — user's career stage: "early" | "mid" | "senior"
//
// Layered logic:
//   1. Seniority cap: if the role is above the user's stage ceiling, force
//      track_3 (Work Toward) regardless of fit/alignment. A student can't be
//      hired into a Senior role today.
//   2. Goal-aware bands (when alignment is provided):
//        T1: strong fit + strong alignment  OR  adequate fit + very strong alignment
//        T2: viable fit but off-path
//        T3: aspirational — some skill foundation + on-path
//   3. Fallback to trackFromScore when alignment is null (no goal set).
//
// Thresholds are stricter than generate-career-analysis (0.70 vs 0.60 for
// T1 alignment) because LLM-derived alignment is noisier than the
// deterministic skill_transfer matrix and gpt-4o-mini tends to pick
// middle-of-rubric scores. See the SDR-for-PM bug for the calibration story.
export function trackFromScores(fit, alignment, options = {}) {
  const { userStage, roleSeniority } = options;
  const roleRank = roleSeniority != null ? (SENIORITY_RANK[roleSeniority] ?? null) : null;
  const ceiling = userStage && STAGE_T1_CEILING[userStage] != null
    ? STAGE_T1_CEILING[userStage]
    : Infinity;
  const canHireNow = roleRank == null || roleRank <= ceiling;
  const hasAlignment = alignment != null && Number.isFinite(alignment);

  // Above seniority ceiling — capped at track_3 (Work Toward). Even a strong-fit
  // Senior role for a student is aspirational, not viable today.
  if (!canHireNow) return "track_3";

  if (!hasAlignment) return trackFromScore(fit);

  if (fit >= 0.50 && alignment >= 0.70) return "track_1";
  if (fit >= 0.40 && alignment >= 0.80) return "track_1";
  if (fit >= 0.50) return "track_2";
  if (fit >= 0.20 && alignment >= 0.60) return "track_3";
  return trackFromScore(fit);
}

// Async per-application scoring. Three paths, tried in order:
//   1. application.job_id present + linked jobs row has v4 fields →
//      deterministic scoreJobFit (instant, free, same answer as Jobs page)
//   2. JD text present but no job_id → call extract-job-requirements in
//      stateless mode to get v4 fields → deterministic scoreJobFit
//   3. (1) and (2) both fail (extractor errored, JD too short) → fall back
//      to analyze-job-match (LLM, legacy raw-text path)
//
// Sets applications.score_source so the UI can flag which path produced the
// number (deterministic vs llm) and ops can audit drift after the fact.
export async function scoreApplication(supabase, queryClient, applicationId, jobDescription, userId) {
  if (!applicationId) return;
  try {
    // Load the application + linked job (if any). The Tracker UI calls this
    // immediately after insert, so the row exists by the time we get here.
    const { data: appRow } = await supabase
      .from("applications")
      .select("id, job_id, role_title")
      .eq("id", applicationId)
      .maybeSingle();

    // Load profile context — same shape scoreJobFit expects on the client.
    const [profileRes, expsRes, edusRes] = await Promise.all([
      supabase.from("profiles").select("skills_canonical, qualification_level, primary_domain").eq("id", userId).maybeSingle(),
      supabase.from("experiences").select("type, start_date, end_date, is_current, title, company, responsibilities").eq("user_id", userId),
      supabase.from("education").select("degree_level").eq("user_id", userId),
    ]);
    const profile = profileRes?.data;
    const experiences = expsRes?.data || [];
    const educations = edusRes?.data || [];

    // ── Path 1: linked job, run scoreJobFit directly against jobs row ──
    if (appRow?.job_id && profile) {
      const { data: jobRow } = await supabase
        .from("jobs")
        .select("id, title, req_skills_core, req_skills_nice, req_years_min, req_years_max, req_education_levels, req_education_strict, req_seniority, function_family, extraction_confidence")
        .eq("id", appRow.job_id)
        .maybeSingle();
      if (jobRow) {
        const result = scoreJobFit({ profile, experiences, educations }, jobRow);
        await writeDeterministic(supabase, applicationId, result, userId, queryClient);
        return;
      }
    }

    // ── Path 2: no linked job — extract requirements from pasted JD ──
    if (jobDescription && typeof jobDescription === "string" && jobDescription.trim().length >= 200 && profile) {
      try {
        const { data: extractResp, error: exErr } = await supabase.functions.invoke("extract-job-requirements", {
          body: { jd_text: jobDescription, title: appRow?.role_title || "" },
        });
        if (!exErr && extractResp?.extraction) {
          const syntheticJob = { id: applicationId, ...extractResp.extraction };
          const result = scoreJobFit({ profile, experiences, educations }, syntheticJob);
          await writeDeterministic(supabase, applicationId, result, userId, queryClient);
          return;
        }
        // Extractor returned but said skipped/failed — fall through to LLM.
      } catch (exCatch) {
        console.warn("[scoreApplication] stateless extractor failed:", exCatch?.message || exCatch);
      }
    }

    // ── Path 3: LLM fallback (legacy raw-text path) ──
    if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
      // No JD at all → can't score. Leave the row unscored, no failure marker.
      return;
    }
    const { data, error } = await supabase.functions.invoke("analyze-job-match", {
      body: { job_description: jobDescription, mode: "text" },
    });
    if (error) throw error;
    if (data?.match_score == null) {
      throw new Error("analyze-job-match returned no match_score");
    }
    const fit = Math.max(0, Math.min(1, Number(data.match_score) / 100));
    if (!Number.isFinite(fit)) {
      throw new Error(`analyze-job-match returned non-finite match_score: ${data.match_score}`);
    }
    const alignmentRaw = data?.goal_alignment_score;
    const alignment = alignmentRaw == null
      ? null
      : Math.max(0, Math.min(1, Number(alignmentRaw) / 100));
    const roleSeniority = data?.required_seniority || null;
    const userStage = data?.user_stage || null;
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        qualification_score: fit,
        goal_alignment_score: alignment,
        required_seniority: roleSeniority,
        track: trackFromScores(fit, alignment, { userStage, roleSeniority }),
        track_scoring_failed_at: null,
        score_source: "llm",
      })
      .eq("id", applicationId);
    if (updateError) throw updateError;
    // userId is required for the queryKey to match the useQuery in
    // Tracker / Home / etc. (which scope by user.id). Pre-2026-04-28
    // we invalidated ["applications"] alone — the cache layer treats
    // that as a different key from ["applications", userId], so the
    // stale UI never refetched after scoring completed.
    queryClient?.invalidateQueries({ queryKey: userId ? ["applications", userId] : ["applications"] });
  } catch (err) {
    console.warn("[scoreApplication] background scoring failed:", err?.message || err);
    // Surface the failure on the row so the UI can show a Retry button.
    // Best-effort — if even this update fails, the row stays stuck (same
    // pre-fix outcome), but we've already logged.
    try {
      await supabase
        .from("applications")
        .update({ track_scoring_failed_at: new Date().toISOString() })
        .eq("id", applicationId);
      queryClient?.invalidateQueries({ queryKey: userId ? ["applications", userId] : ["applications"] });
    } catch (markErr) {
      console.warn("[scoreApplication] could not mark track_scoring_failed_at:", markErr?.message || markErr);
    }
  }
}

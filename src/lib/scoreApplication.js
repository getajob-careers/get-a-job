// Background scoring of applications via analyze-job-match.
//
// Fire-and-forget pattern — the caller does NOT await this function.
// The flow is: user adds an application, it appears in Tracker
// immediately with no AI Confidence and no track shown, and ~3-8s later
// both fill in once analyze-job-match returns.
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

export async function scoreApplication(supabase, queryClient, applicationId, jobDescription, userId) {
  if (!applicationId || !jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
    return;
  }
  try {
    const { data, error } = await supabase.functions.invoke("analyze-job-match", {
      body: { job_description: jobDescription, mode: "text" },
    });
    if (error) throw error;
    if (data?.match_score == null) {
      // analyze-job-match returned 200 but no usable score (rare —
      // typically means the LLM emitted unexpected JSON). Treat as
      // failure so the user can retry rather than seeing an indefinite
      // spinner.
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

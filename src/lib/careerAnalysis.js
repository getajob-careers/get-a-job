import { supabase } from "@/api/supabaseClient";

// Shared career-analysis invocation + atomic role replace (self-heal PR).
//
// The refresh-session → POST generate-career-analysis → parse → replace_career_roles
// RPC sequence was duplicated verbatim in THREE places: onboardingPersist.js's
// handleSurveyNext, Roadmap.jsx's handleGenerate, and (newly) the V2 finalise
// background-fire. This helper is the single producer of career_roles.
//
// Faithfulness contract (#680 discipline): both existing callers must stay
// behavior-identical. Everything caller-specific — the cached-path console.warn
// + CAREER_ANALYSIS_REFRESHED event (Roadmap), the profiles stamp
// (qualification_level / skill_gaps / overall_assessment), and the chain to
// handleFinalise (handleSurveyNext) — stays in the caller. This helper owns only
// the invoke + the RPC, and returns `data` + `rolesWritten` so callers branch.
//
// shouldContinue preserves handleSurveyNext's `if (!mountedRef.current) return`
// skip: it is checked BEFORE the RPC so an unmounted onboarding never writes
// roles. When it returns false the helper returns `{ aborted: true }` and does
// no RPC — the caller then skips its own downstream writes, exactly as the
// original early-return did.
/**
 * @param {Object} params
 * @param {string} params.userId
 * @param {string[]} [params.dreamRoles]
 * @param {boolean} [params.force]
 * @param {() => boolean} [params.shouldContinue]
 * @returns {Promise<{ data: any, rolesWritten: number, aborted: boolean }>}
 */
export async function runCareerAnalysisAndReplaceRoles({
  userId,
  dreamRoles,
  force = false,
  shouldContinue,
}) {
  // Refresh session so we don't invoke with an expired access token.
  const { data: sessionData, error: sessionError } =
    await supabase.auth.refreshSession();
  const accessToken = sessionData?.session?.access_token;
  if (sessionError || !accessToken) {
    throw new Error("Session expired. Please log out and log back in.");
  }

  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-career-analysis`;
  const response = await fetch(fnUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      dream_roles: dreamRoles || [],
      ...(force ? { force: true } : {}),
    }),
  });

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    console.error("Career analysis: non-JSON response", {
      status: response.status,
      body: responseText,
    });
    throw new Error(`HTTP ${response.status}: invalid response`);
  }
  if (!response.ok) {
    console.error("Career analysis: HTTP error", {
      status: response.status,
      body: data,
    });
    const httpErr = new Error(
      data?.error || data?.msg || `HTTP ${response.status}`,
    );
    httpErr.status = response.status;
    throw httpErr;
  }
  if (data?.error) {
    console.error("Career analysis: function error", { body: data });
    throw new Error(data.error);
  }

  // CONSERVATION: preserve handleSurveyNext's unmount-skip — abort BEFORE the
  // RPC so a component that unmounted mid-analysis never writes career_roles.
  if (shouldContinue && !shouldContinue()) {
    return { data, rolesWritten: 0, aborted: true };
  }

  const analysisRoles = data?.roles || [];
  let rolesWritten = 0;
  // Cached path is a no-op here (career_roles for these inputs already in DB);
  // callers own the cached-path console.warn / event.
  if (!data?.cached && analysisRoles.length > 0) {
    // Atomically replace career roles via the DB transaction RPC. The 12-field
    // payload is identical across all callers — do NOT drift it.
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
      p_user_id: userId,
      p_roles: rolesPayload,
      // Edge function returns the hash of inputs that drove this analysis.
      // Forwarded so the RPC writes function_cache atomically with the
      // career_roles rows, letting subsequent calls skip regeneration when
      // inputs haven't changed.
      p_input_hash: data?.input_hash || null,
    });
    if (rpcError) throw rpcError;
    rolesWritten = rolesPayload.length;
  }

  return { data, rolesWritten, aborted: false };
}

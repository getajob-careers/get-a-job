// Pure helpers for the drawer's combined match score. Extracted out
// of CompanyDetailDrawer.jsx so unit tests don't transitively import
// supabaseClient.js (which throws at module load when
// VITE_SUPABASE_URL isn't set — CI has no .env.local).

/**
 * Average of fit_score + career_compound_score, rounded half-up.
 * Returns null when either score is missing or non-numeric.
 * Simple average per PR4 P1 — weighted scheme deferred until pilot
 * signal tells us if it matters.
 */
export function combinedScore(pitch) {
  if (!pitch) return null;
  const f = Number(pitch.fit_score);
  const c = Number(pitch.career_compound_score);
  if (!Number.isFinite(f) || !Number.isFinite(c)) return null;
  return Math.round((f + c) / 2);
}

/**
 * Tier label for a score on the 0-100 scale. Mirrors the matcher's
 * rubric (≥85 strong, 70-84 real, 50-69 stretch) but collapsed for
 * a single-tile UI: ≥70 strong, 40-69 soft, <40 weak.
 *
 * 'none' when the score is null/NaN (used while the LLM call is
 * still in flight, or when the call failed).
 */
export function scoreTier(s) {
  if (s == null || Number.isNaN(s)) return "none";
  if (s >= 70) return "strong";
  if (s >= 40) return "soft";
  return "weak";
}

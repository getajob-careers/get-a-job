// Phase 0 score-coverage honesty gate.
//
// Our hand-curated skill library covers only a few domains. For roles/jobs
// outside them the LLM extracts the real required skills but they fail to
// resolve to a library ID, so the scorer intersects against whatever generic
// skills did map ("technical documentation", "research writing") and emits a
// falsely confident match. The coverage ratio (resolved / total extracted) is
// computed at the resolve sites and persisted (jobs.skill_coverage_ratio,
// career_roles.skill_coverage_ratio). This gate reads it and, when coverage is
// thin, the UI shows an honest "limited data" state instead of a confident
// percentage.
//
// Opt-in via ?coverage_gate=1 so it can be verified on a branch before it
// becomes the default (per the PR #156 lesson: flag a risky scoring change so
// its impact is observable before fan-out). ?coverage_threshold=0.5 tunes the
// cutoff live, without a rebuild. Off by default => every caller behaves
// exactly as before.
import { SKILL_COVERAGE_LOW_THRESHOLD } from "../../supabase/functions/_shared/track-scoring-constants.ts";

export function coverageGateEnabled() {
  try {
    return (
      new URLSearchParams(window.location.search).get("coverage_gate") === "1"
    );
  } catch {
    return false;
  }
}

export function coverageThreshold() {
  try {
    const raw = new URLSearchParams(window.location.search).get(
      "coverage_threshold",
    );
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 1
      ? n
      : SKILL_COVERAGE_LOW_THRESHOLD;
  } catch {
    return SKILL_COVERAGE_LOW_THRESHOLD;
  }
}

// True only when the gate is ON and a known coverage ratio is below the
// threshold. A null/unknown ratio is never "low" (we do not suppress scores
// for jobs we have not measured) and the gate being off always returns false.
export function isLowCoverage(ratio) {
  return (
    coverageGateEnabled() &&
    typeof ratio === "number" &&
    ratio < coverageThreshold()
  );
}

// Scoring redesign, Component 1: confidence-aware ranking. Shrinks a match's
// fit_score toward a neutral prior when the evidence is thin/generic/low-
// coverage (see scoreJobFit.matchConfidence). Opt-in via ?scoring_confidence=1
// so its impact is verified on the pinned label set before it becomes default
// (PR #156 lesson: flag a scoring change before fan-out). Off by default =>
// every caller behaves exactly as before.
export function scoringConfidenceEnabled() {
  try {
    return (
      new URLSearchParams(window.location.search).get("scoring_confidence") ===
      "1"
    );
  } catch {
    return false;
  }
}

// Scoring redesign, combined flag. `?scoring_v2=1` ships the validated re-rank
// as ONE bundle: Component 1 (confidence-aware shrink) + Component 2a (must-have
// weighting). Opt-in, default OFF, verified on the pinned labels before it
// becomes default (PR #156 lesson). The old `?scoring_confidence=1` still works
// and enables C1 alone (transition alias); scoring_v2 additionally turns on 2a.
export function scoringV2Enabled() {
  try {
    return (
      new URLSearchParams(window.location.search).get("scoring_v2") === "1"
    );
  } catch {
    return false;
  }
}

// The scoreJobFit opts the Jobs surfaces pass. Centralizes how the two flags
// compose so every call site stays in lockstep: C1 turns on under EITHER flag
// (scoring_confidence is the C1-only alias); 2a turns on under scoring_v2 only.
// Both off => opts are empty and scoreJobFit is byte-identical to legacy.
export function scoringOpts() {
  const v2 = scoringV2Enabled();
  return {
    confidenceAware: v2 || scoringConfidenceEnabled(),
    mustHave: v2,
    directionBlend: v2,
  };
}

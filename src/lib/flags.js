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

// Scoring redesign, combined flag. Bundles the fully-validated re-rank:
// Component 1 (confidence-aware shrink) + 2a (must-have weighting) + 2b
// (direction-aware rank_score) + the direction card tag. **Default ON** as of
// the v2 default-on flip - every user gets the validated stack. The card tag
// and the re-rank both read this one function, so they flip together by
// construction (the tag can never show without the re-rank, or vice versa).
// **Kill switch:** `?scoring_v2=0` forces the legacy path (byte-identical to
// pre-v2). The old `?scoring_confidence=1` still enables C1 alone when paired
// with the kill switch (`?scoring_v2=0&scoring_confidence=1`), a diagnostic path.
export function scoringV2Enabled() {
  try {
    return (
      new URLSearchParams(window.location.search).get("scoring_v2") !== "0"
    );
  } catch {
    return true;
  }
}

// Scoring redesign, Component 4: role-tier underleveled signal. Penalizes a job
// whose IC/lead/manager tier differs from the user's target tier, in BOTH
// directions (an IC job for a manager target, or a manager job for an IC
// target). Its OWN opt-in `?scoring_c4=1`, default OFF, DELIBERATELY separate
// from the now-default-on scoring_v2: a component ships dark until its harness +
// Eli's live check validate it, so no user ever sees an unvalidated signal
// (Eli's standing rule once v2 went default-on). Off => byte-identical to v2.
export function scoringC4Enabled() {
  try {
    return (
      new URLSearchParams(window.location.search).get("scoring_c4") === "1"
    );
  } catch {
    return false;
  }
}

// The scoreJobFit opts the Jobs surfaces pass. Centralizes how the flags compose
// so every call site stays in lockstep: C1 turns on under EITHER flag
// (scoring_confidence is the C1-only alias); 2a/2b turn on under scoring_v2; C4
// turns on ONLY under its own scoring_c4 (never folded into v2 until validated).
// All off => opts are empty and scoreJobFit is byte-identical to legacy.
export function scoringOpts() {
  const v2 = scoringV2Enabled();
  return {
    confidenceAware: v2 || scoringConfidenceEnabled(),
    mustHave: v2,
    directionBlend: v2,
    roleTier: scoringC4Enabled(),
  };
}

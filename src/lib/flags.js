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

// Onboarding redesign (V2). Launch-1 flip 2026-07-23: ON by default -> the
// reordered 4-screen flow (OnboardingV2: upload -> direction -> review ->
// springboard) renders. Only reaches users who have NOT completed onboarding
// (Layout's routing gate never sends onboarding_complete users to /Onboarding),
// so existing completed users are untouched by the flip.
// KILL SWITCH: set the build env flag VITE_FLAG_ONBOARDING_V2="off" (redeploy)
// to revert every signup to the legacy V1 flow. Per-request overrides for
// verification: ?onboarding_v2=1 forces V2, ?onboarding_v2=0 forces legacy V1.
export function onboardingV2Enabled() {
  try {
    const q = new URLSearchParams(window.location.search).get("onboarding_v2");
    if (q === "1") return true; // force V2 (branch verification)
    if (q === "0") return false; // force legacy V1 (verification / local kill)
  } catch {
    /* no window (SSR/test) - fall through to the env default */
  }
  return import.meta.env.VITE_FLAG_ONBOARDING_V2 !== "off";
}

// Honest match-labels (display-only). The card breakdown mislabels its rows -
// "Experience" actually shows attainability (the whole composite) and "Seniority"
// shows fit_score - and scoreJobFit pushes an "Experience matches" strength
// whenever the YEARS axis is in_range, even for an off-goal-path role the user has
// zero field experience in (the field-mismatch audit's "100% experience match on a
// different profession" symptom). This flag makes those labels truthful. It is
// DISPLAY-ONLY: no score, band, track, rank, or selection changes - only which
// words/labels the card shows. Opt-in via ?honest_match_labels=1 for verification
// before any default flip. Off by default => labels are byte-identical to today.
export function honestMatchLabelsEnabled() {
  try {
    return (
      new URLSearchParams(window.location.search).get("honest_match_labels") ===
      "1"
    );
  } catch {
    return false;
  }
}

// The scoreJobFit opts the Jobs surfaces pass. Centralizes how the two flags
// compose so every call site stays in lockstep: C1 turns on under EITHER flag
// (scoring_confidence is the C1-only alias); 2a turns on under scoring_v2 only.
// Both off => opts are empty and scoreJobFit is byte-identical to legacy.
// honestLabels only gates a reasoning STRING (display copy), never a number.
export function scoringOpts() {
  const v2 = scoringV2Enabled();
  return {
    confidenceAware: v2 || scoringConfidenceEnabled(),
    mustHave: v2,
    directionBlend: v2,
    honestLabels: honestMatchLabelsEnabled(),
  };
}

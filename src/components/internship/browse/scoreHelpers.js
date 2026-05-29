// Pure helpers for internship-flow score display. Extracted out of
// CompanyDetailDrawer.jsx so unit tests don't transitively import
// supabaseClient.js (which throws at module load when
// VITE_SUPABASE_URL isn't set — CI has no .env.local).
//
// PR5 (score-display unification): all internship surfaces now show
// High / Med / Low bands instead of raw numbers. Two scales, two
// threshold sets:
//
//   RULE-BASED SCORE (5-85 range, used by browse cards)
//     - Floor 5 (W_BASE)
//     - Geo: +10 IL / +5 US
//     - Stage match: +30
//     - Sector match: +25
//     - Signal match: 0-15 (capped)
//     - Realistic max: ~85 for a perfect-fit IL company
//
//   LLM-BASED SCORE (0-100 range, used by drawer combined + kanban)
//     - Rubric from the matcher prompt:
//         85+ obvious / 70+ real / 50+ stretch / 0-49 weak
//     - Combined = round((fit + career_compound) / 2)
//
// The thresholds intentionally diverge — rule_score can't reliably
// reach 70+ without all four signals aligning, while LLM scores spread
// naturally across the rubric bands. Calling both surfaces "High" when
// one needs 60 and the other needs 70 is the whole point of the band
// abstraction: students see a consistent judgment ("High"), the model
// underneath uses scale-appropriate cutoffs.

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

/** High/Med/Low band labels — the only strings the UI should display. */
export const BAND_LABELS = {
  high: "High match",
  med:  "Medium match",
  low:  "Low match",
  none: "—",
};

/** Short labels for tight spaces (cards). */
export const BAND_LABELS_SHORT = {
  high: "High",
  med:  "Med",
  low:  "Low",
  none: "—",
};

// ─── Thresholds (PR5, calibrated per scale) ──────────────────────────

/** Rule-score band cutoffs for the browse card chip. Scale 5-85. */
export const RULE_BAND_THRESHOLDS = {
  high: 60,   // 5 floor + 30 stage + 25 sector ≥ 60 → genuine alignment
  med:  30,   // 5 + 25 sector OR 5 + 30 stage ≥ 30 → one strong signal
  // <30 → only geo or no signals → Low
};

/** LLM-score band cutoffs for browse drawer + kanban surfaces. Scale 0-100. */
export const LLM_BAND_THRESHOLDS = {
  high: 70,   // matcher rubric: "Real fit" or "Obvious fit"
  med:  50,   // matcher rubric: "Stretch fit"
  // <50 → matcher rubric "Weak fit" → Low
};

// ─── Band classifiers ────────────────────────────────────────────────

/**
 * Band for a rule-based score (browse card). Returns one of:
 *   "high" | "med" | "low" | "none"
 * "none" is returned for null/NaN (used when the student has no
 * internship_profile yet — the chip then shows "—").
 */
export function bandForRuleScore(s) {
  if (s == null || Number.isNaN(s)) return "none";
  if (s >= RULE_BAND_THRESHOLDS.high) return "high";
  if (s >= RULE_BAND_THRESHOLDS.med) return "med";
  return "low";
}

/**
 * Band for an LLM-based score (drawer combined, kanban card + drawer).
 * Same return shape as bandForRuleScore. Uses the matcher rubric
 * thresholds (see top-of-file table) — these are NOT the same as the
 * rule-score cutoffs; both scales are calibrated to "High = aligned,
 * Med = stretch, Low = weak" but the underlying numbers differ.
 */
export function bandForLlmScore(s) {
  if (s == null || Number.isNaN(s)) return "none";
  if (s >= LLM_BAND_THRESHOLDS.high) return "high";
  if (s >= LLM_BAND_THRESHOLDS.med) return "med";
  return "low";
}

// ─── Deprecated PR4 helpers — kept as thin shims so unrelated code
//     doesn't break, but new surfaces should use bandForLlmScore /
//     bandForRuleScore directly. Numbers are computed but no longer
//     displayed per the PR5 user spec.

/**
 * @deprecated Use bandForLlmScore instead. Kept for legacy import
 *   sites until they migrate.
 */
export function scoreTier(s) {
  const b = bandForLlmScore(s);
  if (b === "high") return "strong";
  if (b === "med")  return "soft";
  if (b === "low")  return "weak";
  return "none";
}

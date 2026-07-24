// selectDigestJobs — the job-match digest's top-N selection, using the REAL
// client scorer (src/lib/scoreJobFit.js) with the live scoring_v2 opts. Pure,
// deterministic, no I/O — so it is unit-testable and importable by both the
// GitHub Actions digest script (Node, via tsx) and the vitest suite.
//
// This REPLACES the retired server-side attainability-lite approximation. The
// edge-function bundling constraint that forced that proxy does not apply in the
// Actions runner, which can import scoreJobFit directly. See
// docs/handoffs/email-automation-arc.md for the arc context.
//
// It mirrors the live for-you feed exactly:
//   • membership gate  — relevance_match !== "off" (off-direction roles dropped)
//   • quality bar      — attainability_score >= GOOD tier (0.42)
//   • sort key         — rank_score desc (direction-boosted), the feed's sort
//   • display number   — attainability_score (the badge the feed shows)

import { scoreJobFit } from "./scoreJobFit.js";
import { ATTAINABILITY_BAND_THRESHOLDS } from "../../supabase/functions/_shared/track-scoring-constants.ts";

// Live scoring_v2 stack (default-ON; kill switch is ?scoring_v2=0). Mirrors
// flags.js scoringOpts() with v2 on: C1 confidence shrink + 2a must-have + 2b
// direction blend. Hard-coded here because flags.js reads window.location and is
// browser-only; the digest always runs the validated default stack.
export const DIGEST_SCORING_OPTS = Object.freeze({
  confidenceAware: true,
  mustHave: true,
  directionBlend: true,
});

// GOOD-tier bar — the same threshold the feed's band labelling uses.
export const GOOD_TIER_BAR = ATTAINABILITY_BAND_THRESHOLDS.good; // 0.42

export const DEFAULT_TOP_N = 5;

/**
 * Score every candidate for one user and return the top-N above the GOOD bar,
 * sorted the way the live feed sorts. Never pads: returns fewer than N (or an
 * empty array) when that few clear the bar.
 *
 * @param {{profile:object, experiences?:array, educations?:array}} userInput
 * @param {Array<object>} candidates  jobs rows with the v4 requirement fields
 * @param {{bar?:number, topN?:number, opts?:object}} [cfg]
 * @returns {Array<{job:object, attainability_score:number, attainability_band:string,
 *                  rank_score:number, relevance_match:string}>}
 */
export function selectTopJobsForUser(userInput, candidates, cfg = {}) {
  const bar = typeof cfg.bar === "number" ? cfg.bar : GOOD_TIER_BAR;
  const topN = typeof cfg.topN === "number" ? cfg.topN : DEFAULT_TOP_N;
  const opts = cfg.opts ?? DIGEST_SCORING_OPTS;

  const scored = [];
  for (const job of Array.isArray(candidates) ? candidates : []) {
    const r = scoreJobFit(userInput, job, opts);
    // Feed membership: off-direction roles are dropped from the for-you list.
    if (r.relevance_match === "off") continue;
    if (r.attainability_score < bar) continue;
    scored.push({
      job,
      attainability_score: r.attainability_score,
      attainability_band: r.attainability_band,
      rank_score: r.rank_score,
      relevance_match: r.relevance_match,
    });
  }

  // Live sort: rank_score desc (direction-boosted), then attainability desc, then
  // a stable id tiebreak so repeated runs are byte-identical.
  scored.sort(
    (a, b) =>
      b.rank_score - a.rank_score ||
      b.attainability_score - a.attainability_score ||
      String(a.job?.id ?? "").localeCompare(String(b.job?.id ?? "")),
  );

  return scored.slice(0, topN);
}

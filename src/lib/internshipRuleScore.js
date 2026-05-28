// Thin re-export of the shared Deno + browser rule scorer + the score-chip
// threshold helper used by Browse cards.
//
// The actual scoring logic lives in
//   supabase/functions/_shared/internship-rule-score.ts
// and is imported by BOTH this file and the match-internship-companies
// edge function. Same import pattern as src/lib/skillResolver.js → the
// shared file is .ts but esbuild handles the tree-shake fine for the
// React app. NEVER reimplement scoring here — touch the shared file.

export {
  ruleScore,
  W_BASE,
  W_STAGE,
  W_SECTOR,
  W_SIGNAL,
  W_GEO,
} from "../../supabase/functions/_shared/internship-rule-score.ts";

/**
 * Three-tier score chip styling per the PR2 spec (D5):
 *   ≥70 = 'strong'  → coral solid background
 *   40-69 = 'soft'  → warm-slate outline
 *   <40 = 'weak'    → muted text only
 *   null = 'none'   → "—" placeholder (used when the student has no
 *                     internship_profile yet)
 *
 * Floor + four hits caps around 85 with current weights (W_BASE +
 * W_STAGE + W_SECTOR + W_SIGNAL + W_GEO = 85), so most non-zero scores
 * land in the 40-70 band. 'strong' is the meaningful "this is a real
 * fit" signal; 'weak' is "barely matches anything."
 */
export function scoreTier(score) {
  if (score == null || Number.isNaN(score)) return "none";
  if (score >= 70) return "strong";
  if (score >= 40) return "soft";
  return "weak";
}

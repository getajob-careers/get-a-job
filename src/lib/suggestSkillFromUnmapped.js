// suggestSkillFromUnmapped.js — fuzzy "did you mean?" for the Profile
// "Skills we couldn't match" remediation UI.
//
// Phase 0a. Walks the 595 canonical skill display names, returns up to N
// closest matches by Levenshtein distance. Cheap (one pass per call), no
// memoization needed for the volumes involved (~100 unmapped labels max,
// triggered only on Profile-tab open).

import skillIdsData from "./skillIdsGenerated.json";

const CANONICAL_NAMES = Object.values(skillIdsData.names ?? {});

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length,
    n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  // Two-row DP — O(min(m,n)) memory.
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Suggest the top N canonical skill display names closest to a raw unmapped
 * label. This is a TYPO catcher, not a semantic matcher: it fires ONLY when a
 * candidate is within Levenshtein distance 2 AND shares the same first
 * character as the label. Anything else returns nothing, so the UI shows the
 * honest "No close match" copy rather than an absurd guess.
 *
 * Sanity floor (Eli ruling 2026-07-26): the prior gate rejected only
 * `distance / max(len) > 0.5`, which let "vercel" -> "Perl" through (distance 3,
 * maxLen 6, ratio exactly 0.5, and the boundary was `>` not `>=`). A ratio floor
 * is the wrong tool for user labels: pure edit distance only catches near-
 * spellings, never long descriptive phrases. So despite this function's old
 * docstring claim, "leadership & team management" does NOT (and never did) match
 * "Leadership" - the edit distance is ~19, far past any threshold; that case
 * correctly yields no suggestion. The `distance <= 2 AND same first char` floor
 * keeps genuine typos ("figma"->"Figma", "javascript"->"JavaScript") and drops
 * the cross-family collisions.
 *
 * Returns an array of { name, distance } sorted by distance ascending.
 * Empty array when nothing clears the floor.
 */
const MAX_SUGGEST_DISTANCE = 2;

export function suggestSkillsFromUnmapped(rawLabel, { limit = 3 } = {}) {
  if (!rawLabel || typeof rawLabel !== "string") return [];
  const norm = rawLabel.toLowerCase().replace(/\s+/g, " ").trim();
  if (!norm) return [];

  const scored = [];
  for (const name of CANONICAL_NAMES) {
    const normName = String(name).toLowerCase().replace(/\s+/g, " ").trim();
    if (!normName) continue;
    // Sanity floor: same first character is a cheap guard against cross-family
    // collisions ("vercel" vs "perl"), and distance <= 2 keeps it to real typos.
    if (norm[0] !== normName[0]) continue;
    const d = levenshtein(norm, normName);
    if (d > MAX_SUGGEST_DISTANCE) continue;
    scored.push({ name, distance: d });
  }
  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, limit);
}

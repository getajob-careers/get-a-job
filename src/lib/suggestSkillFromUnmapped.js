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
  const m = a.length, n = b.length;
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
 * Suggest the top N canonical skill display names closest to a raw
 * unmapped label. Match-strength threshold: distance must be ≤ half the
 * length of the longer string (so "leadership & team management" matches
 * "Leadership", "Stakeholder Management" without dragging in unrelated
 * short names).
 *
 * Returns an array of { name, distance } sorted by distance ascending.
 * Empty array when no suggestion clears the threshold.
 */
export function suggestSkillsFromUnmapped(rawLabel, { limit = 3 } = {}) {
  if (!rawLabel || typeof rawLabel !== "string") return [];
  const norm = rawLabel.toLowerCase().replace(/\s+/g, " ").trim();
  if (!norm) return [];

  const scored = [];
  for (const name of CANONICAL_NAMES) {
    const normName = String(name).toLowerCase().replace(/\s+/g, " ").trim();
    const d = levenshtein(norm, normName);
    const maxLen = Math.max(norm.length, normName.length);
    if (maxLen === 0) continue;
    // Reject anything farther than half the longer string. Keeps the
    // suggestions tight — better to show "no suggestion" than a random
    // long string.
    if (d / maxLen > 0.5) continue;
    scored.push({ name, distance: d });
  }
  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, limit);
}

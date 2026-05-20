// Mirror of the server-side resolveGoalRoleId scoring, but returns the top-N
// matches so the user can confirm their intent. Deliberately simple — this
// runs on every keystroke (after debounce) so keep it O(roles).

import { ROLE_LOOKUP } from "./roleLookup";

const SENIORITY_RANK = {
  Entry: 0,
  Entry_Mid: 1,
  Mid: 2,
  mid_to_senior: 3,
  Senior: 3,
  Lead_Manager: 4,
  Director_Head: 5,
  VP_Executive: 6,
};

// Threshold scales with input length: short 2–3 char abbreviations like "HR"
// or "UX" would otherwise be filtered out of all titles they appear in
// (score = 2 / 13 = 0.15 against "ux researcher"). Longer inputs use the
// stricter 0.30 to filter noise.
function minScoreFor(inputLen) {
  if (inputLen <= 3) return 0.10;
  return 0.30;
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s_\-]+/g, " ")
    .trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns `{ exact: {id, title} | null, suggestions: [{id, title, score}, ...] }`.
 * - `exact` is set when the input exactly matches a canonical title or alternate title.
 * - `suggestions` contains top-N scored partial matches (excluding the exact if present).
 */
export function matchRoles(input, limit = 5) {
  const norm = normalize(input);
  if (!norm || norm.length < 2) return { exact: null, suggestions: [] };

  // Pass 1 — exact normalized match on standardized title or any alternate title
  for (const role of ROLE_LOOKUP) {
    const titles = [role.title, ...(role.alternate_titles || [])]
      .filter(Boolean)
      .map(normalize);
    if (titles.includes(norm)) {
      return { exact: { id: role.id, title: role.title }, suggestions: [] };
    }
  }

  // Pass 2 — scored prefix-within-a-word match. The leading \b anchors to
  // a word boundary so "p" matches "Product" but not "Apple"; no trailing
  // \b so incremental typing ("p", "pr", "pro") surfaces matches before the
  // user finishes a complete word. The minScoreFor() length-ratio threshold
  // below still filters noise for very short inputs.
  const pattern = new RegExp(`\\b${escapeRegex(norm)}`);
  const inputLen = norm.length;

  const scored = [];
  for (const role of ROLE_LOOKUP) {
    const candidateTitles = [];
    if (role.title) candidateTitles.push(normalize(role.title));
    for (const alt of role.alternate_titles || []) {
      const a = normalize(alt);
      if (a.length >= 5) candidateTitles.push(a);
    }

    let best = 0;
    for (const t of candidateTitles) {
      if (pattern.test(t)) {
        const s = inputLen / t.length;
        if (s > best) best = s;
      }
    }

    if (best >= minScoreFor(inputLen)) {
      scored.push({
        id: role.id,
        title: role.title,
        score: best,
        seniorityRank: SENIORITY_RANK[role.seniority] ?? 2,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || b.seniorityRank - a.seniorityRank);
  return { exact: null, suggestions: scored.slice(0, limit) };
}

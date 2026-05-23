// Auto-classify a manually-added application by matching its role_title
// against the user's existing career_roles entries. Used by Tracker.jsx so
// new rows pick up a track rather than persisting as null and rendering as
// "Unclassified" in the UI.
//
// Two-pass match. Both case-insensitive, both keyed off a small token set
// that drops seniority modifiers ("senior", "junior") so "Senior Product
// Manager" can match a career_roles entry titled "Product Manager".
//
// Conservative on purpose: requires at least 2 distinct non-stopword tokens
// for the fuzzy pass so single generic tokens like "Manager" or "Analyst"
// don't match every role with that word in it. Returns null on no
// confident match — the caller stores null and the UI shows "Unclassified",
// which the user can refine by re-running Career Roadmap analysis.

const STOPWORDS = new Set([
  "senior", "junior", "lead", "associate", "principal", "staff",
  "the", "and", "of", "for", "at", "a", "an",
]);

function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function normalize(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchTier(title, careerRoles) {
  if (!title || !Array.isArray(careerRoles) || careerRoles.length === 0) return null;

  const inputNorm = normalize(title);
  const inputTokens = tokenize(title);
  if (inputTokens.length === 0) return null;

  // Pass 1 — exact normalized match.
  for (const r of careerRoles) {
    if (!r?.title || !r?.track) continue;
    if (normalize(r.title) === inputNorm) return r.track;
  }

  // Pass 2 — token subset, requiring at least 2 distinct non-stopword tokens.
  if (inputTokens.length < 2) return null;
  for (const r of careerRoles) {
    if (!r?.title || !r?.track) continue;
    const roleTokens = tokenize(r.title);
    if (roleTokens.length < 2) continue;
    const inputSet = new Set(inputTokens);
    const roleSet = new Set(roleTokens);
    const inputSubsetOfRole = inputTokens.every((t) => roleSet.has(t));
    const roleSubsetOfInput = roleTokens.every((t) => inputSet.has(t));
    if (inputSubsetOfRole || roleSubsetOfInput) return r.track;
  }

  return null;
}

const TRACK_RANK = { track_1: 0, track_2: 1, track_3: 2 };

// Sort career_roles so the highest-track candidate wins ties when two roles
// match the same input. Within a track, higher readiness wins. Used at the
// caller boundary so matchTier itself stays a pure function.
export function sortCareerRolesForMatching(careerRoles) {
  return [...(careerRoles || [])].sort((a, b) => {
    const ra = TRACK_RANK[a?.track] ?? 99;
    const rb = TRACK_RANK[b?.track] ?? 99;
    if (ra !== rb) return ra - rb;
    return (Number(b?.readiness_score) || 0) - (Number(a?.readiness_score) || 0);
  });
}

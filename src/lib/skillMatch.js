// Pure set-intersection of a job's required skills against a user's
// canonical skill IDs. Mirrors the intersection block in
// src/lib/scoreJobFit.js (the Jobs page strengths/gaps), kept identical
// so the Tracker Skills tab and Jobs page card surface the same
// matched/missing answer.
//
// Inputs:
//   required      — { core: string[], nice: string[] } (the
//                   applications.skills_required jsonb shape, or a
//                   job's req_skills_core / req_skills_nice arrays
//                   merged into the same shape)
//   userCanonical — string[] of the user's canonical skill IDs
//                   (profile.skills_canonical)
//
// Output:
//   { matchedCore[], matchedNice[], missingCore[], missingNice[] }
//
// Non-array / undefined inputs are tolerated and treated as empty —
// the caller is expected to render an empty-state when both required
// arrays are empty.
//
// NOTE — when scoreJobFit.js is next touched, it should import this
// helper instead of duplicating the intersection inline. Held back
// from doing it here to keep that file's diff zero in PR #236's
// stabilization window.

export function computeSkillMatch(required, userCanonical) {
  const core = Array.isArray(required?.core) ? required.core : [];
  const nice = Array.isArray(required?.nice) ? required.nice : [];
  const userSet = new Set(Array.isArray(userCanonical) ? userCanonical : []);

  const matchedCore = core.filter((id) => userSet.has(id));
  const matchedNice = nice.filter((id) => userSet.has(id));
  const missingCore = core.filter((id) => !userSet.has(id));
  const missingNice = nice.filter((id) => !userSet.has(id));

  return { matchedCore, matchedNice, missingCore, missingNice };
}

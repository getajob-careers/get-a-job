// skillAggregation.js — single source of truth for "every skill this user
// has across every domain object", used at profile-save time to populate
// profiles.skills_canonical.
//
// The onboarding redesign moved skill capture from one flat StepSkills
// screen to per-experience + per-education + per-project tagging. To
// keep downstream consumers (scoreJobFit, generate-tailored-cv,
// generate-career-analysis) unchanged, we union every source into a
// single canonical array at save time. Both Onboarding.jsx and
// Profile.jsx call this helper so the union is computed identically
// across both surfaces.

import { resolveSkillList } from "./skillResolver";

/**
 * Walk every domain object that carries a skill array and collect
 * every label. Order:
 *   1. profile.skills (catch-all from StepSkills)
 *   2. experiences[].skills_used + experiences[].tools_used
 *   3. educations[].skills_developed
 *   4. projects[].skills_demonstrated
 *
 * Returns the raw labels deduplicated by case-insensitive comparison.
 * Pass the result to resolveSkillList() to get the canonical ID set.
 */
export function collectAllSkillLabels({ profileSkills, experiences, educations, projects }) {
  const out = new Set();
  const addAll = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (typeof item === "string" && item.trim().length > 0) {
        out.add(item.trim());
      }
    }
  };

  addAll(profileSkills);

  if (Array.isArray(experiences)) {
    for (const e of experiences) {
      addAll(e?.skills_used);
      addAll(e?.tools_used);
    }
  }

  if (Array.isArray(educations)) {
    for (const e of educations) {
      addAll(e?.skills_developed);
    }
  }

  if (Array.isArray(projects)) {
    for (const p of projects) {
      addAll(p?.skills_demonstrated);
    }
  }

  // Case-insensitive dedup. Same approach as SkillTagInput's add() guard:
  // collapse to lowercased keys, then re-emit the first-seen original casing.
  const seen = new Set();
  const result = [];
  for (const label of out) {
    const key = label.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(label);
    }
  }
  return result;
}

/**
 * Convenience wrapper: aggregate labels + resolve to canonical IDs in
 * one call. Returns { canonical, unmapped } in the same shape as
 * resolveSkillList(). Both Onboarding's cleanProfilePayload and
 * Profile's saveProfile call this.
 */
export function aggregateProfileSkills({ profileSkills, experiences, educations, projects }) {
  const labels = collectAllSkillLabels({ profileSkills, experiences, educations, projects });
  return resolveSkillList(labels);
}

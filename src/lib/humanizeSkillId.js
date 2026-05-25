// Convert a canonical snake_case skill ID to its human-readable display
// name from the skill library (e.g., "customer_health_management" →
// "Customer Health Management & Retention").
//
// The lookup table is generated from supabase/functions/_shared/libraries/01_skill_library.ts
// via scripts/regen-skill-ids.mjs and committed at src/lib/skillIdsGenerated.json.
// Run that script after editing the skill library.
//
// Fallback: Title-Case the snake_case ID if no library entry exists. This
// keeps the UI sensible if a job's extracted skill drifts ahead of the
// library (e.g., a new skill the v4 extractor surfaced before promotion).

import skillIdsData from "./skillIdsGenerated.json";

const NAME_BY_ID = skillIdsData.names ?? {};

function titleCaseFromId(id) {
  return String(id)
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeSkillId(id) {
  if (!id) return "";
  const canonical = NAME_BY_ID[id];
  if (canonical) return canonical;
  return titleCaseFromId(id);
}

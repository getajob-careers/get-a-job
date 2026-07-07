// Client-side canonical skill resolution.
//
// THIN re-export of the ONE shared resolver in
// supabase/functions/_shared/skill-aliases.ts (consolidated in step 2, #511).
// The 4-step fallback logic lives there and nowhere else; this file only
// injects the browser's ID set so the frontend, the extractor, and
// generate-career-analysis all resolve a phrase identically.
//
// ID-set source: skillIdsGenerated.json — a GENERATED MIRROR of
// 01_skill_library.ts (regen via `node scripts/regen-skill-ids.mjs`; a
// drift-guard test asserts the two hold the same IDs). The browser reads the
// 15KB JSON rather than bundling the whole Deno library file.
//
// Used by cleanProfilePayload at save time so the deterministic scorer
// (scoreJobFit) has a stable canonical skill set per profile.

import {
  resolveSkill as resolveSkillShared,
  resolveSkillList as resolveSkillListShared,
} from "../../supabase/functions/_shared/skill-aliases.ts";
import skillIdsData from "./skillIdsGenerated.json";

const SKILL_ID_SET = new Set(skillIdsData.ids);

export function resolveSkill(label) {
  return resolveSkillShared(label, SKILL_ID_SET);
}

export function resolveSkillList(labels) {
  return resolveSkillListShared(labels, SKILL_ID_SET);
}

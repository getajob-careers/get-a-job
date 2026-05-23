// Client-side canonical skill resolution.
//
// Same 4-step fallback as the extractor's resolveSkill (extract-job-requirements/index.ts):
//   1. Direct alias-map match on lowercased + whitespace-collapsed form
//   2. Strip parenthetical content and retry
//   3. Snake_case → space normalization (handles user inputs like
//      "product_management" that should resolve via "product management")
//   4. Snake-case direct ID match
//
// Used by cleanProfilePayload at save time so the deterministic scorer
// (scoreJobFit, PR-C) has a stable canonical skill set per profile rather
// than parsing free-text on every job comparison.
//
// Bundle cost: SKILL_ALIASES (~40KB minified) + SKILL_IDS (~15KB JSON).
// Tree-shaking from the shared TS file is fine — esbuild handles it.

import { SKILL_ALIASES } from "../../supabase/functions/_shared/skill-aliases.ts";
import skillIdsData from "./skillIdsGenerated.json";

const SKILL_ID_SET = new Set(skillIdsData.ids);

export function resolveSkill(label) {
  if (!label || typeof label !== "string") return [];
  const norm = label.toLowerCase().replace(/\s+/g, " ").trim();
  if (!norm) return [];

  const direct = SKILL_ALIASES[norm];
  if (direct) return direct.filter((id) => SKILL_ID_SET.has(id));

  const stripped = norm.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  if (stripped !== norm && stripped.length > 0) {
    const aliased = SKILL_ALIASES[stripped];
    if (aliased) return aliased.filter((id) => SKILL_ID_SET.has(id));
  }

  if (norm.includes("_")) {
    const unsnaked = norm.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
    if (unsnaked !== norm && unsnaked.length > 0) {
      const aliased = SKILL_ALIASES[unsnaked];
      if (aliased) return aliased.filter((id) => SKILL_ID_SET.has(id));
    }
  }

  const snake = norm.replace(/[\s-]+/g, "_");
  if (SKILL_ID_SET.has(snake)) return [snake];
  return [];
}

// Resolve a list of raw skill labels to canonical IDs + capture unmapped
// phrases. Returns deduped arrays:
//   { canonical: ["python", "figma_mastery"], unmapped: ["my custom skill"] }
//
// Used by cleanProfilePayload — input is profiles.skills, output feeds
// profiles.skills_canonical + profiles.skills_unmapped.
export function resolveSkillList(labels) {
  if (!Array.isArray(labels) || labels.length === 0) {
    return { canonical: [], unmapped: [] };
  }
  const canonical = new Set();
  const unmapped = [];
  const seenUnmapped = new Set();
  for (const raw of labels) {
    if (typeof raw !== "string") continue;
    const ids = resolveSkill(raw);
    if (ids.length > 0) {
      for (const id of ids) canonical.add(id);
    } else {
      const norm = raw.toLowerCase().replace(/\s+/g, " ").trim();
      if (norm && !seenUnmapped.has(norm)) {
        seenUnmapped.add(norm);
        unmapped.push(norm);
      }
    }
  }
  return { canonical: Array.from(canonical).sort(), unmapped };
}

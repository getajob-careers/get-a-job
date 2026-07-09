#!/usr/bin/env node
// Regenerate src/lib/roleSkillsGenerated.json from the canonical TS
// libraries. Generated file contains:
//   - one entry per role (all roles in 00_role_library.ts) with id, title, alternate_titles
//   - core_skills + secondary_skills per role (joined from role_skill_mapping)
//   - Skip differentiator_skills (too specialized for onboarding suggestions)
//
// Mirrors the pattern of regen-skill-ids.mjs (PR #124) — server-side
// canonical, client-side mirror.
//
// Run after edits to 00_role_library.ts or 04_role_skill_mapping.ts.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ROLE_LIBRARY = resolve(
  ROOT,
  "supabase/functions/_shared/libraries/00_role_library.ts",
);
const ROLE_SKILL_MAP = resolve(
  ROOT,
  "supabase/functions/_shared/libraries/04_role_skill_mapping.ts",
);
const OUT = resolve(ROOT, "src/lib/roleSkillsGenerated.json");

function parseTsExport(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error(`Could not locate JSON body in ${filePath}`);
  }
  const body = raw.slice(jsonStart, jsonEnd + 1).replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(body);
}

const lib = parseTsExport(ROLE_LIBRARY);
const map = parseTsExport(ROLE_SKILL_MAP);

const mappingById = new Map();
for (const m of map.role_skill_mapping || []) {
  if (m?.role_id) mappingById.set(m.role_id, m);
}

// Source 04_role_skill_mapping.ts mixes two shapes: 147 flat-string rows
// + 23 object-form rows that carry `{skill_id, importance, notes}` for
// future role↔requirement weighting. The generated mirror is consumed by
// roleSkillsLookup.suggestSkillsForTitle which expects flat strings, so
// flatten here. Source stays object-form to preserve tier data.
function unwrapSkillId(entry) {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry.skill_id === "string") return entry.skill_id;
  return null;
}
function flattenBucket(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(unwrapSkillId).filter(Boolean);
}

const roles = (lib.roles || [])
  .map((r) => {
    const m = mappingById.get(r.id) || mappingById.get(r.role_id) || {};
    return {
      id: r.id || r.role_id,
      title: r.title || r.standardized_title || "",
      alternate_titles: Array.isArray(r.alternate_titles)
        ? r.alternate_titles
        : [],
      core_skills: flattenBucket(m.core_skills),
      secondary_skills: flattenBucket(m.secondary_skills),
    };
  })
  .filter((r) => r.id && r.title);

const withMappings = roles.filter(
  (r) => r.core_skills.length > 0 || r.secondary_skills.length > 0,
).length;

writeFileSync(
  OUT,
  JSON.stringify(
    {
      generated_from: [
        "supabase/functions/_shared/libraries/00_role_library.ts",
        "supabase/functions/_shared/libraries/04_role_skill_mapping.ts",
      ],
      // No generated_at date — this file is CI-staleness-checked
      // (git diff --exit-code), so the output must be a deterministic
      // function of the source libraries only.
      count: roles.length,
      with_skill_mapping: withMappings,
      roles,
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `Wrote ${roles.length} roles (${withMappings} with skill mappings) to src/lib/roleSkillsGenerated.json`,
);

#!/usr/bin/env node
// Regenerate src/lib/roleLookup.js from the canonical role library.
// roleLookup.js is the client-side title-resolution mirror consumed by
// src/lib/roleMatch.js (goal-role autocomplete). It had drifted badly
// (159 roles vs 195 canonical) because its original generator pointed at
// a now-defunct path (functions/data/00_role_library.json) and it was
// being hand-maintained. This restores a real generator + is guarded by a
// CI staleness check (.github/workflows/ci.yml) so it can't drift again.
//
// Emits { id, title, alternate_titles, seniority, role_family } per role
// — exactly the fields roleMatch.js reads. Run after edits to
// 00_role_library.ts. Mirrors scripts/regen-role-skills.mjs.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ROLE_LIBRARY = resolve(
  ROOT,
  "supabase/functions/_shared/libraries/00_role_library.ts",
);
const OUT = resolve(ROOT, "src/lib/roleLookup.js");

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

const roles = (lib.roles || [])
  .map((r) => ({
    id: r.id || r.role_id,
    title: r.standardized_title || r.title || "",
    alternate_titles: Array.isArray(r.alternate_titles)
      ? r.alternate_titles
      : [],
    seniority: r.seniority ?? null,
    role_family: r.role_family ?? null,
  }))
  .filter((r) => r.id && r.title);

const header = `// Auto-generated from supabase/functions/_shared/libraries/00_role_library.ts
// by scripts/regen-role-lookup.mjs. DO NOT EDIT BY HAND.
// Slim role lookup for client-side title resolution (src/lib/roleMatch.js).
// Regenerate with \`node scripts/regen-role-lookup.mjs\` after role-library edits;
// CI fails if this file is stale (see the role-mirror-staleness job).
`;

writeFileSync(
  OUT,
  header +
    "\nexport const ROLE_LOOKUP = " +
    JSON.stringify(roles, null, 2) +
    ";\n",
);

console.log(`Wrote ${roles.length} roles to src/lib/roleLookup.js`);

#!/usr/bin/env node
// Regenerate src/lib/skillIdsGenerated.json from the canonical TS library.
//
// Run after edits to supabase/functions/_shared/libraries/01_skill_library.ts.
// CI re-runs this in the "Generated-mirror staleness check" step (ci.yml) and
// fails the build via `git diff --exit-code` if the committed file is stale.
// The output carries NO timestamp so that check is stable across days.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(
  ROOT,
  "supabase/functions/_shared/libraries/01_skill_library.ts",
);
const OUT = resolve(ROOT, "src/lib/skillIdsGenerated.json");

const raw = readFileSync(SRC, "utf-8");

// Strip the `export const skillLibrary = ` wrapper to get pure JSON. The
// schema validator already proves this file is parseable as JSON.
const jsonStart = raw.indexOf("{");
const jsonEnd = raw.lastIndexOf("}");
if (jsonStart < 0 || jsonEnd <= jsonStart) {
  console.error("Could not locate JSON body in", SRC);
  process.exit(1);
}
const body = raw.slice(jsonStart, jsonEnd + 1);

// Strip JS line comments — the validator does the same.
const cleaned = body.replace(/^\s*\/\/.*$/gm, "");

let lib;
try {
  lib = JSON.parse(cleaned);
} catch (e) {
  console.error("Parse failed:", e.message);
  process.exit(1);
}

const items = lib.skill_library || [];
const ids = items
  .map((s) => s.id || s.skill_id)
  .filter(Boolean)
  .sort();

// Build id → human-readable-name map. Used by humanizeSkillId.js to render
// "customer_health_management" as "Customer Health Management" anywhere
// the UI displays a raw canonical ID (job cards, role cards, CV preview).
const names = {};
for (const s of items) {
  const id = s.id || s.skill_id;
  const name = s.name;
  if (id && name) names[id] = name;
}

writeFileSync(
  OUT,
  JSON.stringify(
    {
      generated_from:
        "supabase/functions/_shared/libraries/01_skill_library.ts",
      count: ids.length,
      ids,
      names,
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `Wrote ${ids.length} IDs + ${Object.keys(names).length} names to src/lib/skillIdsGenerated.json`,
);

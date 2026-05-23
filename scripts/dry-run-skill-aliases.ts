// Dry-run for PR-D3 Layer 1 (alias map) impact.
//
// What this measures: how many additional library skill IDs each user gains
// when the new alias-aware resolver runs against their stored skills, vs the
// old strict snake_case matcher. This is the only measurable component
// pre-deploy — Layer 2 (LLM semantic credits) requires actual OpenAI calls.
//
// Usage:
//   pnpm tsx scripts/dry-run-skill-aliases.ts /tmp/d3-users.json
//
// Input JSON shape: array of { id, full_name, skills: string[] }.
// Output: per-user before/after stats + per-skill alias hits, ASCII-friendly.

import { readFileSync } from "node:fs";
import { resolveSkillAliases, SKILL_ALIASES } from "../supabase/functions/_shared/skill-aliases.ts";

// Library skill IDs — extracted from supabase/functions/_shared/libraries/01_skill_library.ts
// via `grep '"id":' | sort -u`. Kept inline so the dry-run is self-contained
// and doesn't pull in the 6k-line Deno library file.
const SKILL_ID_LIST: string[] = readFileSync(
  process.env.SKILL_IDS_FILE || "/tmp/skill_ids_list.txt",
  "utf8",
).split("\n").filter(Boolean);

type User = {
  id: string;
  full_name: string;
  qualification_level: string;
  skills: string[];
  tier_1_count: number;
  tier_2_count: number;
  tier_3_count: number;
};

const OLD_MATCH = (label: string, ids: Set<string>): string[] => {
  // Reproduce the previous matcher exactly (the loop at index.ts:805-808 pre-D3)
  const norm = label.toLowerCase().replace(/[\s-]+/g, "_");
  return ids.has(norm) ? [norm] : [];
};

function main(): void {
  const inputPath = process.argv[2] || "/tmp/d3-users.json";
  const users: User[] = JSON.parse(readFileSync(inputPath, "utf8"));
  const skillIdSet = new Set(SKILL_ID_LIST);

  console.log(`Loaded ${users.length} users, ${SKILL_ID_LIST.length} library skill IDs`);
  console.log(`Alias map has ${Object.keys(SKILL_ALIASES).length} entries\n`);

  const rows: Array<{
    name: string;
    skills: number;
    oldHits: number;
    newHits: number;
    delta: number;
    currentTier1: number;
    addedSkillIds: string[];
  }> = [];

  for (const u of users) {
    const oldIds = new Set<string>();
    const newIds = new Set<string>();
    for (const s of u.skills) {
      for (const sid of OLD_MATCH(s, skillIdSet)) oldIds.add(sid);
      for (const sid of resolveSkillAliases(s, skillIdSet)) newIds.add(sid);
    }
    const added = [...newIds].filter(id => !oldIds.has(id));
    rows.push({
      name: u.full_name,
      skills: u.skills.length,
      oldHits: oldIds.size,
      newHits: newIds.size,
      delta: newIds.size - oldIds.size,
      currentTier1: u.tier_1_count,
      addedSkillIds: added,
    });
  }

  // Sort by impact
  rows.sort((a, b) => b.delta - a.delta);

  console.log("Per-user impact (sorted by delta):");
  console.log("─".repeat(110));
  console.log(
    "Name".padEnd(22),
    "Skills".padStart(7),
    "Old".padStart(5),
    "New".padStart(5),
    "Δ".padStart(5),
    "Tier1".padStart(6),
    "  Newly matched IDs (sample)",
  );
  console.log("─".repeat(110));
  for (const r of rows) {
    const sample = r.addedSkillIds.slice(0, 8).join(", ");
    const more = r.addedSkillIds.length > 8 ? ` +${r.addedSkillIds.length - 8}` : "";
    console.log(
      r.name.slice(0, 22).padEnd(22),
      String(r.skills).padStart(7),
      String(r.oldHits).padStart(5),
      String(r.newHits).padStart(5),
      String(r.delta).padStart(5),
      String(r.currentTier1).padStart(6),
      `  ${sample}${more}`,
    );
  }
  console.log("─".repeat(110));

  // Aggregate stats
  const totals = rows.reduce(
    (acc, r) => ({
      skills: acc.skills + r.skills,
      old: acc.old + r.oldHits,
      new: acc.new + r.newHits,
    }),
    { skills: 0, old: 0, new: 0 },
  );
  console.log();
  console.log("Totals across all users:");
  console.log(`  Skills declared: ${totals.skills}`);
  console.log(`  Old matched IDs: ${totals.old} (${((totals.old / totals.skills) * 100).toFixed(1)}% hit rate)`);
  console.log(`  New matched IDs: ${totals.new} (${((totals.new / totals.skills) * 100).toFixed(1)}% hit rate)`);
  console.log(`  Net increase: ${totals.new - totals.old} skill IDs (${(((totals.new - totals.old) / Math.max(1, totals.old)) * 100).toFixed(0)}% over current)`);

  // Coverage of users with zero Track 1 today
  const zeroTier1 = rows.filter(r => r.currentTier1 === 0);
  if (zeroTier1.length > 0) {
    console.log();
    console.log(`Users with 0 Track 1 today (${zeroTier1.length}):`);
    for (const r of zeroTier1) {
      console.log(`  ${r.name.padEnd(22)} ${r.oldHits} → ${r.newHits} matched IDs (+${r.delta})`);
    }
    console.log("  → after redeploy, these users get a richer skill set; Layer 2 (LLM credits) adds more on top");
  }

  console.log();
  console.log("Note: this measures Layer 1 (alias map) only. Layer 2 (LLM semantic");
  console.log("credits) requires actual OpenAI calls and is not simulated here.");
}

main();

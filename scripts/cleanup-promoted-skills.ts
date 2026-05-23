// scripts/cleanup-promoted-skills.ts
//
// One-shot cleanup: stamp jd_unmapped_skill_counts rows whose phrase is now
// resolvable through the alias map. Collapses the stale cumulative counter
// so subsequent "what's still unmapped?" audits return signal, not noise.
//
// Why:
//   The counter accumulates every unresolved skill phrase the extractor sees,
//   forever. Each time we expand the alias map, hundreds of old phrases
//   become resolvable — but their rows still show up in the unmapped report
//   until we explicitly mark them. This script does that pass.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/cleanup-promoted-skills.ts
//
// Flags:
//   --dry-run        list what would change without writing
//   --limit=N        cap to N updates (debug)

import { createClient } from "@supabase/supabase-js";
import { SKILL_ALIASES } from "../supabase/functions/_shared/skill-aliases.ts";
import { skillLibrary } from "../supabase/functions/_shared/libraries/01_skill_library.ts";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT_ARG = args.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : null;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Library skill IDs — used to validate that an alias resolves to something real.
const SKILL_ID_SET: Set<string> = new Set(
  ((skillLibrary as any).skill_library as any[])
    .map((s) => s.id || s.skill_id)
    .filter(Boolean),
);

// Mirror the extractor's resolveSkill normalisation steps so phrases stamped
// here would also resolve at extraction-time.
function resolveSkill(label: string): string[] {
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

async function fetchPendingPromotion(): Promise<Array<{ skill_phrase: string; job_count: number }>> {
  const PAGE = 1000;
  const all: Array<{ skill_phrase: string; job_count: number }> = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("jd_unmapped_skill_counts")
      .select("skill_phrase, job_count")
      .or("promoted_to_library.is.null,promoted_to_library.eq.false")
      .order("job_count", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error("Query failed:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function main() {
  const t0 = Date.now();
  console.log(`cleanup-promoted-skills — dry_run=${DRY_RUN} limit=${LIMIT ?? "none"}`);
  console.log(`Loaded ${Object.keys(SKILL_ALIASES).length} aliases, ${SKILL_ID_SET.size} skill IDs.\n`);

  const pending = await fetchPendingPromotion();
  console.log(`Found ${pending.length} unmapped rows to evaluate.`);

  const toPromote: Array<{ skill_phrase: string; job_count: number; skill_id: string; matched_ids: string[] }> = [];
  let stillUnmapped = 0;
  for (const row of pending) {
    const ids = resolveSkill(row.skill_phrase);
    if (ids.length > 0) {
      toPromote.push({
        skill_phrase: row.skill_phrase,
        job_count: row.job_count,
        skill_id: ids[0],
        matched_ids: ids,
      });
    } else {
      stillUnmapped++;
    }
  }

  console.log(`  Now resolvable:    ${toPromote.length}`);
  console.log(`  Still unmapped:    ${stillUnmapped}\n`);

  const target = LIMIT ? toPromote.slice(0, LIMIT) : toPromote;
  if (target.length === 0) {
    console.log("Nothing to promote — exiting.");
    return;
  }

  // Top-N preview so a dry-run is informative.
  console.log("Top promotions (first 20 by job_count):");
  for (const p of target.slice(0, 20)) {
    console.log(`  [${String(p.job_count).padStart(4)}x] ${p.skill_phrase.padEnd(50)} → ${p.skill_id}${p.matched_ids.length > 1 ? ` (+${p.matched_ids.length - 1} more)` : ""}`);
  }

  if (DRY_RUN) {
    console.log("\n--dry-run set — no writes performed.");
    return;
  }

  // Write in chunks of 100 to keep individual UPDATE roundtrips small.
  console.log(`\nWriting ${target.length} promotions...`);
  const stamped = new Date().toISOString();
  let written = 0;
  for (let i = 0; i < target.length; i += 100) {
    const batch = target.slice(i, i + 100);
    await Promise.all(batch.map(async (p) => {
      const { error } = await supabase
        .from("jd_unmapped_skill_counts")
        .update({
          promoted_to_library: true,
          promoted_to_skill_id: p.skill_id,
          promoted_at: stamped,
        })
        .eq("skill_phrase", p.skill_phrase);
      if (error) console.error(`  FAIL: ${p.skill_phrase} — ${error.message}`);
      else written++;
    }));
    if ((i + batch.length) % 500 === 0 || (i + batch.length) === target.length) {
      console.log(`  ${i + batch.length}/${target.length} stamped`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("CLEANUP SUMMARY");
  console.log("=".repeat(60));
  console.log(`Evaluated:         ${pending.length}`);
  console.log(`Promoted:          ${written}`);
  console.log(`Still unmapped:    ${stillUnmapped}`);
  console.log(`Wall:              ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

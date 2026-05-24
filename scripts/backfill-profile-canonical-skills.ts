// scripts/backfill-profile-canonical-skills.ts
//
// One-shot backfill: resolve every existing profile's free-text skills
// into the new skills_canonical + skills_unmapped columns. After PR-B
// ships, all NEW saves populate these columns automatically; this script
// catches the pre-existing rows.
//
// Deterministic, no LLM, no cost. ~100 profiles → seconds.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/backfill-profile-canonical-skills.ts
//
// Flags:
//   --dry-run         print what would change without writing
//   --limit=N         cap to N profiles
//   --only-empty      only process rows where skills_canonical IS NULL
//                     (default true — re-runs are safe + cheap)

import { createClient } from "@supabase/supabase-js";
import { resolveSkillList } from "../src/lib/skillResolver.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (name: string, fallback: string): string =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const DRY_RUN = args.includes("--dry-run");
const LIMIT = arg("limit", "0") === "0" ? null : Number(arg("limit", "0"));
const ONLY_EMPTY = arg("only-empty", "true") === "true";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function main() {
  const t0 = Date.now();
  console.log(`backfill-profile-canonical-skills — dry_run=${DRY_RUN} only_empty=${ONLY_EMPTY} limit=${LIMIT ?? "none"}`);

  let q = supabase.from("profiles").select("id, full_name, skills, skills_canonical");
  if (ONLY_EMPTY) q = q.is("skills_canonical", null);
  const { data, error } = await q;
  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }
  const rows = (LIMIT ? data?.slice(0, LIMIT) : data) ?? [];
  console.log(`Picked ${rows.length} profiles.\n`);
  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let ok = 0, skipped = 0, errored = 0;
  let totalCanonical = 0, totalUnmapped = 0;

  for (const row of rows) {
    const skills = Array.isArray(row.skills) ? row.skills : [];
    if (skills.length === 0) {
      skipped++;
      continue;
    }
    const { canonical, unmapped } = resolveSkillList(skills);
    totalCanonical += canonical.length;
    totalUnmapped += unmapped.length;

    if (DRY_RUN) {
      console.log(`  ${row.id} (${row.full_name ?? "unnamed"}): skills=${skills.length} → canonical=${canonical.length} unmapped=${unmapped.length}`);
      ok++;
      continue;
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        skills_canonical: canonical.length > 0 ? canonical : null,
        skills_unmapped: unmapped.length > 0 ? unmapped : null,
      })
      .eq("id", row.id);
    if (updErr) {
      console.error(`  FAIL ${row.id} — ${updErr.message}`);
      errored++;
    } else {
      ok++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("BACKFILL SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total:                ${rows.length}`);
  console.log(`Ok:                   ${ok}`);
  console.log(`Skipped (no skills):  ${skipped}`);
  console.log(`Errored:              ${errored}`);
  console.log(`Canonical IDs total:  ${totalCanonical}`);
  console.log(`Unmapped phrases:     ${totalUnmapped}`);
  console.log(`Wall:                 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

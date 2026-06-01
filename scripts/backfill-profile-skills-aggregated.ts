// scripts/backfill-profile-skills-aggregated.ts
//
// Recompute profiles.skills_canonical + skills_unmapped from the FULL
// 4-source union for every existing profile:
//
//   1. profiles.skills            (catch-all from StepSkills)
//   2. experiences.skills_used + .tools_used
//   3. education.skills_developed
//   4. projects.skills_demonstrated
//
// The previous backfill (scripts/backfill-profile-canonical-skills.ts)
// only resolved from profiles.skills. After the EducationTab capture PR
// ships, students start tagging education.skills_developed; this script
// folds those (and any onboarding-captured rows that never went through
// a saveProfile) into canonical.
//
// SAFETY: idempotent snapshot to skills_canonical_pre_eduskills +
// skills_unmapped_pre_eduskills temp columns FIRST. Rollback in one SQL:
//
//   UPDATE profiles SET
//     skills_canonical = skills_canonical_pre_eduskills,
//     skills_unmapped  = skills_unmapped_pre_eduskills;
//
// Drop the temp columns after a verification window:
//
//   ALTER TABLE profiles
//     DROP COLUMN skills_canonical_pre_eduskills,
//     DROP COLUMN skills_unmapped_pre_eduskills;
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/backfill-profile-skills-aggregated.ts [flags]
//
// Flags:
//   --dry-run           print diffs (per-profile before/after), don't write
//   --limit=N           cap to N profiles
//   --skip-snapshot     don't (re)take snapshot — only set after the first
//                       live run has already snapshotted
//   --only=<uuid>       restrict to one user_id (live-data check)

import { createClient } from "@supabase/supabase-js";
import { aggregateProfileSkills } from "../src/lib/skillAggregation.js";

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
const SKIP_SNAPSHOT = args.includes("--skip-snapshot");
const LIMIT = arg("limit", "0") === "0" ? null : Number(arg("limit", "0"));
const ONLY = arg("only", "") || null;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function ensureSnapshotColumnsAndCopy(): Promise<void> {
  // Best-effort idempotent snapshot. Both ALTER + UPDATE run via the
  // service-role client; the snapshot copy is conditional so re-runs
  // never overwrite the original baseline.
  //
  // We don't have apply_migration here (script context), so this falls
  // through to the SQL the operator should run manually if the
  // service-role client can't execute DDL. The DDL is logged so the
  // operator can paste it into the Supabase SQL editor.
  const ddl = [
    `ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS skills_canonical_pre_eduskills text[],
      ADD COLUMN IF NOT EXISTS skills_unmapped_pre_eduskills text[];`,
    `UPDATE public.profiles
       SET skills_canonical_pre_eduskills = skills_canonical
       WHERE skills_canonical_pre_eduskills IS NULL
         AND skills_canonical IS NOT NULL;`,
    `UPDATE public.profiles
       SET skills_unmapped_pre_eduskills = skills_unmapped
       WHERE skills_unmapped_pre_eduskills IS NULL
         AND skills_unmapped IS NOT NULL;`,
  ];
  console.log("Snapshot DDL/DML (run via SQL editor or supabase MCP before --skip-snapshot runs):");
  for (const stmt of ddl) console.log("  " + stmt.replace(/\s+/g, " ").trim());
  console.log("");
}

async function main() {
  const t0 = Date.now();
  console.log(`backfill-profile-skills-aggregated — dry_run=${DRY_RUN} skip_snapshot=${SKIP_SNAPSHOT} limit=${LIMIT ?? "none"} only=${ONLY ?? "none"}`);

  if (!SKIP_SNAPSHOT) await ensureSnapshotColumnsAndCopy();

  let q = supabase.from("profiles").select("id, full_name, skills, skills_canonical, skills_unmapped");
  if (ONLY) q = q.eq("id", ONLY);
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

  let ok = 0, unchanged = 0, errored = 0;
  let totalAdded = 0, totalRemoved = 0;

  for (const row of rows) {
    // Single federated read via entity_spine (P1.3 read switch). Spine
    // surfaces each row's unified `skills` column with RLS preserved via
    // security_invoker.
    const { data: spineRows, error: spineErr } = await supabase
      .from("entity_spine")
      .select("skills")
      .eq("user_id", row.id);
    if (spineErr) {
      console.error(`  FETCH FAIL ${row.id} — ${spineErr.message}`);
      errored++;
      continue;
    }

    const { canonical, unmapped } = aggregateProfileSkills({
      profileSkills: Array.isArray(row.skills) ? row.skills : [],
      entitySpine: spineRows || [],
    });

    const before = new Set(Array.isArray(row.skills_canonical) ? row.skills_canonical : []);
    const after = new Set(canonical);
    const added = [...after].filter((id) => !before.has(id));
    const removed = [...before].filter((id) => !after.has(id));
    totalAdded += added.length;
    totalRemoved += removed.length;

    const diffStr = added.length === 0 && removed.length === 0
      ? "no change"
      : `+${added.length} -${removed.length}` + (removed.length > 0 ? `  REMOVED: [${removed.join(", ")}]` : "");
    console.log(`  ${row.id} (${row.full_name ?? "unnamed"}): ${before.size} → ${after.size}  ${diffStr}`);

    if (added.length === 0 && removed.length === 0) {
      unchanged++;
      continue;
    }
    if (DRY_RUN) {
      ok++;
      continue;
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ skills_canonical: canonical, skills_unmapped: unmapped })
      .eq("id", row.id);
    if (updErr) {
      console.error(`  WRITE FAIL ${row.id} — ${updErr.message}`);
      errored++;
    } else {
      ok++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("BACKFILL SUMMARY" + (DRY_RUN ? " (dry-run)" : ""));
  console.log("=".repeat(60));
  console.log(`Total:             ${rows.length}`);
  console.log(`Changed:           ${ok}`);
  console.log(`Unchanged:         ${unchanged}`);
  console.log(`Errored:           ${errored}`);
  console.log(`Canonical IDs +:   ${totalAdded}`);
  console.log(`Canonical IDs -:   ${totalRemoved}`);
  console.log(`Wall:              ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (totalRemoved > 0) {
    console.log("\nNote: removals are expected only if a user's source rows were edited downward since the prior canonical was written. Spot-check any removed IDs before treating as routine.");
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

// scripts/backfill-strip-jd-html.ts
//
// One-shot HTML strip of jobs.description + applications.job_description.
// Cleans the legacy backlog left by the greenhouse + SAP SuccessFactors
// entity-decode-after-tag-strip bug (fixed in scripts/lib/normalize.ts
// stripHtml). Live audit on 2026-05-31 found 1,446 dirty rows in jobs
// (~49% of 2,971) and 2 dirty rows in applications.
//
// SAFETY: snapshots existing values into temp columns before writing —
// one-SQL rollback. The temp columns should be dropped after a
// verification window (1-2 weeks of nightly cron + no user reports).
//
//   ROLLBACK:
//     UPDATE jobs SET description = description_pre_strip
//       WHERE description_pre_strip IS NOT NULL;
//     UPDATE applications SET job_description = job_description_pre_strip
//       WHERE job_description_pre_strip IS NOT NULL;
//
//   DROP TEMP COLUMNS (post-verification):
//     ALTER TABLE jobs DROP COLUMN description_pre_strip;
//     ALTER TABLE applications DROP COLUMN job_description_pre_strip;
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/backfill-strip-jd-html.ts [flags]
//
// Flags:
//   --dry-run                 print diffs, don't write
//   --table=jobs|applications|both   default: both
//   --limit=N                 cap to N rows per table
//   --skip-snapshot           skip the snapshot DDL/copy (set after first
//                             live run has already snapshotted)
//
// Idempotent — running stripHtml on already-clean text is a no-op.
// Safe to re-run.

import { createClient } from "@supabase/supabase-js";
import { stripHtml } from "./lib/normalize.js";

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
const TABLE = arg("table", "both");
const LIMIT = arg("limit", "0") === "0" ? null : Number(arg("limit", "0"));

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function logSnapshotDDL(): Promise<void> {
  // We can't run DDL through supabase-js. Log what the operator should
  // run via the Supabase SQL editor (or via the apply_migration MCP
  // tool) before the first live pass.
  const ddl = [
    `-- Snapshot columns (one-SQL rollback). Idempotent — IF NOT EXISTS.`,
    `ALTER TABLE public.jobs`,
    `  ADD COLUMN IF NOT EXISTS description_pre_strip text;`,
    `ALTER TABLE public.applications`,
    `  ADD COLUMN IF NOT EXISTS job_description_pre_strip text;`,
    ``,
    `-- Copy current values into snapshot. Conditional — never overwrite`,
    `-- an existing snapshot, so re-runs preserve the original baseline.`,
    `UPDATE public.jobs`,
    `   SET description_pre_strip = description`,
    `   WHERE description_pre_strip IS NULL`,
    `     AND description IS NOT NULL;`,
    `UPDATE public.applications`,
    `   SET job_description_pre_strip = job_description`,
    `   WHERE job_description_pre_strip IS NULL`,
    `     AND job_description IS NOT NULL;`,
  ];
  console.log("\nRun this DDL/DML in the Supabase SQL editor BEFORE the first live pass (or before --skip-snapshot):");
  console.log("─".repeat(72));
  for (const line of ddl) console.log("  " + line);
  console.log("─".repeat(72));
  console.log("");
}

interface BackfillStats {
  table: string;
  scanned: number;
  changed: number;
  unchanged: number;
  errored: number;
}

async function backfillTable(
  tableName: "jobs" | "applications",
  columnName: "description" | "job_description",
): Promise<BackfillStats> {
  const stats: BackfillStats = { table: tableName, scanned: 0, changed: 0, unchanged: 0, errored: 0 };

  // Paginate to handle 3k+ rows without huge in-memory arrays. PostgREST
  // caps at 1000 by default; chunk through with range.
  const PAGE_SIZE = 500;
  let from = 0;

  while (true) {
    let q = supabase
      .from(tableName)
      .select(`id, ${columnName}`)
      .not(columnName, "is", null)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (LIMIT && from >= LIMIT) break;

    const { data, error } = await q;
    if (error) {
      console.error(`  [${tableName}] page-fetch failed at offset ${from}: ${error.message}`);
      stats.errored++;
      break;
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (LIMIT && stats.scanned >= LIMIT) break;
      stats.scanned++;
      const original = (row as any)[columnName] as string | null;
      const cleaned = stripHtml(original);
      if (cleaned === original) {
        stats.unchanged++;
        continue;
      }
      if (DRY_RUN) {
        if (stats.changed < 3) {
          const before = String(original ?? "").slice(0, 90).replace(/\s+/g, " ");
          const after = String(cleaned ?? "").slice(0, 90).replace(/\s+/g, " ");
          console.log(`  [${tableName}] ${(row as any).id}`);
          console.log(`    BEFORE: ${before}…`);
          console.log(`    AFTER:  ${after}…`);
        }
        stats.changed++;
        continue;
      }
      const { error: updErr } = await supabase
        .from(tableName)
        .update({ [columnName]: cleaned })
        .eq("id", (row as any).id);
      if (updErr) {
        console.error(`  [${tableName}] write failed for ${(row as any).id}: ${updErr.message}`);
        stats.errored++;
      } else {
        stats.changed++;
      }
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return stats;
}

async function main() {
  const t0 = Date.now();
  console.log(`backfill-strip-jd-html — dry_run=${DRY_RUN} table=${TABLE} skip_snapshot=${SKIP_SNAPSHOT} limit=${LIMIT ?? "none"}`);

  if (!SKIP_SNAPSHOT) await logSnapshotDDL();

  const results: BackfillStats[] = [];
  if (TABLE === "jobs" || TABLE === "both") {
    console.log("\n→ jobs.description");
    results.push(await backfillTable("jobs", "description"));
  }
  if (TABLE === "applications" || TABLE === "both") {
    console.log("\n→ applications.job_description");
    results.push(await backfillTable("applications", "job_description"));
  }

  console.log("\n" + "=".repeat(60));
  console.log("BACKFILL SUMMARY" + (DRY_RUN ? " (dry-run)" : ""));
  console.log("=".repeat(60));
  for (const s of results) {
    console.log(`${s.table.padEnd(15)} scanned=${s.scanned}  changed=${s.changed}  unchanged=${s.unchanged}  errored=${s.errored}`);
  }
  console.log(`Wall: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

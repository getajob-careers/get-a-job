// scripts/backfill-job-requirements.ts
//
// One-shot backfill: walk every active job in the cache, invoke
// extract-job-requirements for each. Idempotent — the function skips
// already-extracted-and-unchanged rows, so re-runs after partial
// completion are cheap.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/backfill-job-requirements.ts
//
// Flags:
//   --concurrency=8       parallel extractor calls (default 8 — gpt-4o-mini
//                         is rate-limited generously, but we're polite)
//   --limit=N             cap to N jobs (debug / smoke)
//   --skip-already        only process rows with extracted_at IS NULL
//                         (defaults to true; pass --skip-already=false to
//                         force re-extraction across the full table)
//   --ats=greenhouse,lever scope to specific ATSs
//   --progress-every=50   print a checkpoint every N jobs
//
// At ~$0.005/job and 3,187 jobs, full backfill costs ~$16 and runs ~30
// minutes at concurrency 8.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (name: string, fallback: string): string =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;

const CONCURRENCY = Number(arg("concurrency", "8"));
const LIMIT = arg("limit", "0") === "0" ? null : Number(arg("limit", "0"));
const SKIP_ALREADY = arg("skip-already", "true") === "true";
const ATS_FILTER = arg("ats", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// Targeted re-extract: bypass the picker entirely and process just these IDs.
// Useful for verifying behaviour on JDs known to contain a specific signal
// without running the full backfill.
const ID_FILTER = arg("ids", "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const PROGRESS_EVERY = Number(arg("progress-every", "50"));
// Schema-version gate. When SKIP_ALREADY=true (default) the picker also
// includes rows whose extraction_schema_version is below the target — this is
// how a schema bump (v3 → v4) triggers re-extraction without spending on rows
// already at the new version. Set to the current EXTRACTION_SCHEMA_VERSION in
// the edge function so the two stay in lockstep.
const TARGET_SCHEMA_VERSION = Number(arg("target-schema-version", "4"));

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function pickJobs(): Promise<Array<{ id: string; title: string; ats_source: string }>> {
  // ID filter bypasses the rest of the picker — used for targeted re-extract.
  if (ID_FILTER.length > 0) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, ats_source")
      .in("id", ID_FILTER);
    if (error) {
      console.error("Query failed:", error.message);
      process.exit(1);
    }
    return data ?? [];
  }
  // Paginate — PostgREST defaults to 1000 row cap so we walk in batches.
  const PAGE = 1000;
  const all: Array<{ id: string; title: string; ats_source: string }> = [];
  let offset = 0;
  for (;;) {
    let q = supabase
      .from("jobs")
      .select("id, title, ats_source")
      .eq("is_active", true)
      .order("first_seen_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (SKIP_ALREADY) {
      // Re-extract any row that's never been extracted OR is stuck below the
      // target schema version. Already-at-target rows skip on the function
      // side too (description_hash idempotency), so this gives us full
      // resumability across an interrupted backfill.
      q = q.or(`extracted_at.is.null,extraction_schema_version.lt.${TARGET_SCHEMA_VERSION}`);
    }
    if (ATS_FILTER.length > 0) q = q.in("ats_source", ATS_FILTER);
    const { data, error } = await q;
    if (error) {
      console.error("Query failed:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return LIMIT ? all.slice(0, LIMIT) : all;
}

async function invokeExtractor(jobId: string, attempt = 1): Promise<any> {
  // Network-layer errors (ETIMEDOUT, ECONNRESET, AbortError) used to kill the
  // whole batch — fatal in a 3,000-job run. We catch them here and retry up
  // to 3 times with exponential backoff, then return a soft error so the
  // batch continues. Real HTTP errors (4xx/5xx) still propagate as
  // { error: "HTTP N" } and count toward the batch error count.
  const MAX_ATTEMPTS = 3;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/extract-job-requirements`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_id: jobId, force: !SKIP_ALREADY }),
      // 60s overall timeout — function p99 is ~30s under load, this gives
      // 2x safety margin without holding workers indefinitely.
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      return { error: `HTTP ${res.status}`, body: await res.text() };
    }
    return await res.json();
  } catch (e: any) {
    const transient =
      e?.name === 'AbortError' ||
      e?.cause?.code === 'ETIMEDOUT' ||
      e?.cause?.code === 'ECONNRESET' ||
      e?.cause?.code === 'ENOTFOUND' ||
      e?.cause?.code === 'EAI_AGAIN' ||
      String(e?.message ?? '').includes('fetch failed');
    if (transient && attempt < MAX_ATTEMPTS) {
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delayMs));
      return invokeExtractor(jobId, attempt + 1);
    }
    return { error: `network:${e?.cause?.code || e?.name || 'unknown'}`, body: String(e?.message ?? '') };
  }
}

async function pMap<T, R>(items: T[], n: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const t0 = Date.now();
  console.log(`Backfill — concurrency=${CONCURRENCY} skip-already=${SKIP_ALREADY} ats=${ATS_FILTER.join(",") || "all"} limit=${LIMIT ?? "none"}`);
  const jobs = await pickJobs();
  console.log(`Picked ${jobs.length} jobs to process.\n`);
  if (jobs.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let ok = 0;
  let skipped = 0;
  let errored = 0;
  const errors: Array<{ job_id: string; title: string; error: string }> = [];

  await pMap(jobs, CONCURRENCY, async (job, idx) => {
    const result = await invokeExtractor(job.id);
    if (result.error) {
      errored++;
      errors.push({ job_id: job.id, title: job.title, error: String(result.error) });
    } else if (result.skipped) {
      skipped++;
    } else {
      ok++;
    }
    const done = ok + skipped + errored;
    if (done % PROGRESS_EVERY === 0 || done === jobs.length) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      const rate = (done / Math.max(1, Number(elapsed))).toFixed(2);
      const eta = jobs.length > done ? `${(((jobs.length - done) / Math.max(0.01, done / Number(elapsed))) / 60).toFixed(1)}m` : "0m";
      console.log(`[${done}/${jobs.length}] ${elapsed}s elapsed | ${rate}/s | ok=${ok} skipped=${skipped} errored=${errored} | ETA ${eta}`);
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log("BACKFILL SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total:    ${jobs.length}`);
  console.log(`Ok:       ${ok}`);
  console.log(`Skipped:  ${skipped}  (already extracted or null description)`);
  console.log(`Errored:  ${errored}`);
  console.log(`Wall:     ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (errored > 0) {
    console.log("\nFirst 10 errors:");
    errors.slice(0, 10).forEach((e) => console.log(`  ${e.job_id} (${e.title}) — ${e.error}`));
  }

  // Quick coverage stats after backfill
  const { data: extractedCounts } = await supabase
    .from("jobs")
    .select("extraction_confidence, extracted_at")
    .eq("is_active", true)
    .not("extracted_at", "is", null);
  const total = extractedCounts?.length ?? 0;
  const detailed = extractedCounts?.filter((r: any) => Number(r.extraction_confidence) >= 0.9).length ?? 0;
  const solid = extractedCounts?.filter((r: any) => Number(r.extraction_confidence) >= 0.7 && Number(r.extraction_confidence) < 0.9).length ?? 0;
  const partial = extractedCounts?.filter((r: any) => Number(r.extraction_confidence) >= 0.5 && Number(r.extraction_confidence) < 0.7).length ?? 0;
  const sparse = extractedCounts?.filter((r: any) => Number(r.extraction_confidence) >= 0.3 && Number(r.extraction_confidence) < 0.5).length ?? 0;
  const poor = extractedCounts?.filter((r: any) => Number(r.extraction_confidence) < 0.3).length ?? 0;
  console.log(`\nGlobal confidence distribution across all extracted active jobs (n=${total}):`);
  console.log(`  detailed (0.9+):  ${detailed}`);
  console.log(`  solid (0.7-0.89): ${solid}`);
  console.log(`  partial (0.5-0.69): ${partial}`);
  console.log(`  sparse (0.3-0.49):  ${sparse}`);
  console.log(`  poor (<0.3):       ${poor}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

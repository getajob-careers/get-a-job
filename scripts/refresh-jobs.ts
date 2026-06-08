// scripts/refresh-jobs.ts
//
// Nightly job-cache refresh. Reads the verified-company registry, fetches
// each company's full job board via its ATS API, filters to Israeli
// locations, classifies seniority, and UPSERTs into public.jobs. Closes
// the loop with a soft-delete sweep for rows not seen in 2+ days.
//
// Usage:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/refresh-jobs.ts
//   npx tsx scripts/refresh-jobs.ts --dry-run    # fetch + classify + log, no DB writes
//
// Exit codes:
//   0  — success (or <20% of companies failed)
//   1  — fatal config error OR >20% of companies failed (alerts the GHA run)

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { FETCHERS, enrichDescriptions } from "./lib/ats-fetchers.js";
import {
  CompanyEntry,
  CompanyRegistry,
  NormalizedJob,
  RawJob,
  classifyLocation,
  detectMgmtSignalFromTitle,
  detectSeniorityFromTitle,
  finalSeniority,
  parseExplicitJuniorSignal,
  isJunkTitle,
  normalizeJobTitle,
  parseYearsOfExperience,
  stripHtml,
} from "./lib/normalize.js";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const REGISTRY_PATH = join(SCRIPT_DIR, "..", "supabase", "functions", "_shared", "libraries", "companies_il.json");

const CONCURRENCY_LIMIT = 20;
const FAILURE_THRESHOLD_PCT = 20;   // exit 1 if >20% of companies fail
const STALE_DAYS = 2;
const UPSERT_BATCH_SIZE = 200;

// ATSs to actually process. The registry contains comeet/recruitee/custom
// entries we don't have fetchers for yet; skip them silently.
// "jooble" is intentionally excluded — the Jooble API has no IL coverage
// (verified 2026-05: "Israel" location matched US towns in OH/IL/IN). The
// fetcher stays in the repo in case Jooble adds IL inventory later.
const ENABLED_ATSS = new Set(["greenhouse", "lever", "ashby", "workday", "smartrecruiters", "comeet", "successfactors", "workable", "iai"]);

// ───── Types ──────────────────────────────────────────────────────────

interface CompanyResult {
  company: string;
  ats: string;
  total_fetched: number;
  il_jobs: number;
  status: "ok" | "fetch_error" | "upsert_error" | "no_slug";
  error?: string;
  elapsed_ms: number;
}

// ───── Concurrency control ────────────────────────────────────────────

/**
 * Run `fn` against each item in `items` with at most `limit` running at
 * once. Returns settled results in input order. Per-item failures land in
 * the result array as `rejected` — they don't crash the orchestrator.
 */
async function runWithConcurrency<T, R>(
  limit: number,
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      try {
        results[idx] = { status: "fulfilled", value: await fn(items[idx]) };
      } catch (err) {
        results[idx] = { status: "rejected", reason: err };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// ───── Per-company processing ─────────────────────────────────────────

async function processCompany(
  company: CompanyEntry,
  supabase: SupabaseClient | null,
  dryRun: boolean,
): Promise<CompanyResult> {
  const t0 = Date.now();
  const ats = company.ats;
  if (!company.slug) {
    return { company: company.name, ats, total_fetched: 0, il_jobs: 0, status: "no_slug", elapsed_ms: Date.now() - t0 };
  }
  const fetcher = FETCHERS[ats];
  if (!fetcher) {
    return { company: company.name, ats, total_fetched: 0, il_jobs: 0, status: "fetch_error", error: `no fetcher for ats=${ats}`, elapsed_ms: Date.now() - t0 };
  }

  let raw;
  try {
    raw = await fetcher(company);
  } catch (err) {
    return {
      company: company.name,
      ats,
      total_fetched: 0,
      il_jobs: 0,
      status: "fetch_error",
      error: (err as Error).message,
      elapsed_ms: Date.now() - t0,
    };
  }

  const totalFetched = raw.length;

  // Two-pass to keep detail-fetch off non-IL rows. Pass 1 filters; the
  // enrichment step (Workday/SR only) populates description_html
  // in-place for the IL-passing rows; pass 2 normalizes for the DB.
  // Pass 1: filter to IL-passing RawJobs (no normalization yet).
  const ilRaws: RawJob[] = [];
  const ilLocs: ReturnType<typeof classifyLocation>[] = [];
  for (const r of raw) {
    // Drop placeholder/junk titles (talent-network ghosts, "future
    // opportunities" stubs, etc.) before any further processing.
    if (isJunkTitle(r.title)) continue;
    const loc = classifyLocation(r.location_raw, r.structured_country);
    if (!loc.is_il) continue;
    ilRaws.push(r);
    ilLocs.push(loc);
  }

  // Enrichment: Workday + SmartRecruiters list endpoints don't include
  // descriptions (or include them inconsistently). For IL-passing rows
  // only, fetch the per-job detail to populate r.description_html.
  // Silent degradation on per-call failure (row keeps description_html
  // = null → extraction skips it server-side via the jd_too_short
  // guard, same outcome as today). See enrichDescriptions docstring.
  await enrichDescriptions(ats, company.slug, ilRaws);

  // Pass 2: normalize the (now-enriched) RawJobs into NormalizedJobs.
  const ilRows: NormalizedJob[] = [];
  for (let i = 0; i < ilRaws.length; i++) {
    const r = ilRaws[i];
    const loc = ilLocs[i];
    const cleanTitle = normalizeJobTitle(r.title);
    const descPlain = stripHtml(r.description_html);
    const years = parseYearsOfExperience(descPlain);
    const titleBucket = detectSeniorityFromTitle(cleanTitle);
    const titleHasMgmtSignal = detectMgmtSignalFromTitle(cleanTitle);
    const explicitJunior = parseExplicitJuniorSignal(descPlain);
    ilRows.push({
      ats_source:           ats,
      external_id:          r.external_id,
      company_slug:         company.slug!,
      company_name:         company.name,
      title:                cleanTitle,
      description:          descPlain,
      apply_url:            r.apply_url,
      location_raw:         r.location_raw,
      location_city:        loc.city,
      is_il:                true,
      is_remote:            r.is_remote,
      salary_min:           r.salary_min,
      salary_max:           r.salary_max,
      salary_currency:      r.salary_currency,
      seniority:            finalSeniority(titleBucket, years, { explicitJunior, titleHasMgmtSignal }),
      years_experience_min: years.min,
      years_experience_max: years.max,
      industry:             company.industry,
      date_posted:          r.date_posted,
      raw_payload:          r.raw_payload,
    });
  }

  if (dryRun || ilRows.length === 0 || !supabase) {
    return { company: company.name, ats, total_fetched: totalFetched, il_jobs: ilRows.length, status: "ok", elapsed_ms: Date.now() - t0 };
  }

  // UPSERT in batches to avoid huge single requests
  try {
    for (let i = 0; i < ilRows.length; i += UPSERT_BATCH_SIZE) {
      const batch = ilRows.slice(i, i + UPSERT_BATCH_SIZE).map((j) => ({
        ...j,
        last_seen_at: new Date().toISOString(),
        fetched_at:   new Date().toISOString(),
        is_active:    true,
      }));
      const { error } = await supabase
        .from("jobs")
        .upsert(batch, { onConflict: "ats_source,external_id" });
      if (error) throw new Error(error.message);
    }
  } catch (err) {
    return {
      company: company.name,
      ats,
      total_fetched: totalFetched,
      il_jobs: ilRows.length,
      status: "upsert_error",
      error: (err as Error).message,
      elapsed_ms: Date.now() - t0,
    };
  }

  return { company: company.name, ats, total_fetched: totalFetched, il_jobs: ilRows.length, status: "ok", elapsed_ms: Date.now() - t0 };
}

// ───── Soft-delete sweep ──────────────────────────────────────────────

async function softDeleteStale(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("jobs")
    .update({ is_active: false })
    .lt("last_seen_at", cutoff)
    .eq("is_active", true)
    .select("id");
  if (error) throw new Error(`soft-delete sweep failed: ${error.message}`);
  return (data ?? []).length;
}

// ───── Main ───────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const startedAt = Date.now();

  // Load registry — fail fast if it's missing or malformed
  let registry: CompanyRegistry;
  try {
    registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as CompanyRegistry;
  } catch (err) {
    console.error(`FATAL: could not read registry at ${REGISTRY_PATH}: ${(err as Error).message}`);
    process.exit(1);
  }

  const companies = registry.companies.filter(
    (c) => c.verified && c.api_url && ENABLED_ATSS.has(c.ats),
  );
  console.log(`Loaded registry: ${registry.companies.length} total, ${companies.length} processable (verified + supported ATS).`);

  // Initialize Supabase client (skipped in dry-run mode)
  let supabase: SupabaseClient | null = null;
  if (!dryRun) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run).");
      process.exit(1);
    }
    supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  } else {
    console.log("DRY RUN — no DB writes will happen.");
  }

  // Fan out across companies
  console.log(`\nFetching ${companies.length} companies with concurrency=${CONCURRENCY_LIMIT}...`);
  const settled = await runWithConcurrency(CONCURRENCY_LIMIT, companies, (c) =>
    processCompany(c, supabase, dryRun),
  );

  // Inspect results
  const results: CompanyResult[] = settled.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : {
          company: "(unknown)",
          ats: "(unknown)",
          total_fetched: 0,
          il_jobs: 0,
          status: "fetch_error",
          error: String((r as PromiseRejectedResult).reason),
          elapsed_ms: 0,
        },
  );

  // Per-company log
  for (const r of results) {
    const mark = r.status === "ok" ? "✓" : r.status === "no_slug" ? "·" : "✗";
    const detail =
      r.status === "ok"
        ? `${r.il_jobs} IL / ${r.total_fetched} total (${r.elapsed_ms}ms)`
        : `${r.status}${r.error ? `: ${r.error.slice(0, 120)}` : ""}`;
    console.log(`  ${mark} ${r.company.padEnd(30)} ${r.ats.padEnd(15)} ${detail}`);
  }

  const totalCompanies = results.length;
  const successful = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "fetch_error" || r.status === "upsert_error").length;
  const totalIl = results.reduce((acc, r) => acc + r.il_jobs, 0);
  const totalFetched = results.reduce((acc, r) => acc + r.total_fetched, 0);

  // Soft-delete sweep
  let staleMarked = 0;
  if (!dryRun && supabase) {
    try {
      staleMarked = await softDeleteStale(supabase);
    } catch (err) {
      console.error(`WARN: soft-delete sweep failed: ${(err as Error).message}`);
    }
  }

  // Aggregate report
  console.log("\n" + "=".repeat(70));
  console.log("REFRESH SUMMARY");
  console.log("=".repeat(70));
  console.log(`Companies processed:  ${totalCompanies}`);
  console.log(`Successful:           ${successful}`);
  console.log(`Failed:               ${failed}`);
  console.log(`Total jobs fetched:   ${totalFetched}`);
  console.log(`Total IL jobs:        ${totalIl}`);
  console.log(`Stale marked inactive:${staleMarked}`);
  console.log(`Wall time:            ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`Mode:                 ${dryRun ? "DRY RUN" : "LIVE WRITES"}`);

  // Exit code — fail the GHA run if too many companies broke
  const failurePct = totalCompanies > 0 ? (failed / totalCompanies) * 100 : 0;
  if (failurePct > FAILURE_THRESHOLD_PCT) {
    console.error(`\nEXIT 1: ${failurePct.toFixed(0)}% of companies failed (threshold: ${FAILURE_THRESHOLD_PCT}%).`);
    process.exit(1);
  }
  console.log(`\nEXIT 0: ${failurePct.toFixed(0)}% failure rate within ${FAILURE_THRESHOLD_PCT}% threshold.`);
}

main().catch((err) => {
  console.error("UNHANDLED:", err);
  process.exit(1);
});

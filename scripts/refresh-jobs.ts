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
  dedupByExternalId,
  detectMgmtSignalFromTitle,
  detectSeniorityFromTitle,
  finalSeniority,
  parseExplicitJuniorSignal,
  isJunkTitle,
  normalizeJobTitle,
  parseYearsOfExperience,
  stripHtml,
} from "./lib/normalize.js";
import {
  computePerAtsBreakdown,
  selectOverThreshold,
} from "./lib/per-ats-thresholds.js";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const REGISTRY_PATH = join(
  SCRIPT_DIR,
  "..",
  "supabase",
  "functions",
  "_shared",
  "libraries",
  "companies_il.json",
);

// Lowered 20 -> 16 (2026-07-27 supply-growth P1) to cut peak concurrent
// writers on the heavy-GIN jobs table, the documented contention source
// behind the 07-26/27 upsert-timeout storm. Governs fetch AND write
// concurrency, so it modestly lengthens the nightly; the per-company upsert
// retry below is the real safety net. Hub-tunable.
const CONCURRENCY_LIMIT = 16;
// Global backstop: exit 1 if >20% of ALL companies fail. Catches the
// "everything is on fire" case (registry-wide outage, env-var typo).
const FAILURE_THRESHOLD_PCT = 20;
// Per-ATS isolation: exit 1 if any SINGLE ATS family has >50% failures,
// even when the global rate stays under FAILURE_THRESHOLD_PCT. The
// canonical scenario this guards: Greenhouse goes dark overnight (199
// of 891 companies) — global rate stays at 22% (borderline ok), but
// Greenhouse alone is 100% failed. The student opens an empty tracker
// the next morning. Per-ATS isolation surfaces it in the GHA run
// summary instead. See PR-N1 plan §4.5.
const PER_ATS_FAILURE_THRESHOLD_PCT = 50;
// Minimum family size for the per-ATS percentage gate to trip exit 1. A
// percentage needs a big-enough denominator to be a real signal: a
// single-company family (iai, amazon_jobs, pwc_heroku, adamtotal_agency)
// hits "100% failed" on ONE transient error, which is noise — yet
// pre-guard it tripped exit 1 nightly and skipped the entire extraction
// stage (the 2026-06-13 regression). 5 is the floor where ">50% failed"
// means ≥3 real failures, not one flaky fetch; every family the gate is
// meant to catch going dark (greenhouse ~176, comeet ~203, lever ~25,
// ashby ~69, workday ~32, successfactors ~7) clears it. Smaller families
// stay covered by the global FAILURE_THRESHOLD_PCT backstop and still
// print their health row below, just without tripping exit 1.
const PER_ATS_MIN_SAMPLE = 5;
const STALE_DAYS = 2;
// Halved 200 -> 100 (2026-07-27 supply-growth P1): a smaller batch holds
// page/index locks for less time, reducing the lock-wait that pushed the two
// largest boards (NVIDIA/PANW) past the 120s statement_timeout.
const UPSERT_BATCH_SIZE = 100;

// ATSs to actually process. The registry contains comeet/recruitee/custom
// entries we don't have fetchers for yet; skip them silently.
// "jooble" is intentionally excluded — the Jooble API has no IL coverage
// (verified 2026-05: "Israel" location matched US towns in OH/IL/IN). The
// fetcher stays in the repo in case Jooble adds IL inventory later.
const ENABLED_ATSS = new Set([
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "smartrecruiters",
  "comeet",
  "successfactors",
  "workable",
  "iai",
  "adamtotal",
  "adamtotal_agency",
  "pwc_heroku",
  "amazon_jobs",
  "bezeq_native",
  "hot_native",
]);

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
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) return;
        try {
          results[idx] = { status: "fulfilled", value: await fn(items[idx]) };
        } catch (err) {
          results[idx] = { status: "rejected", reason: err };
        }
      }
    },
  );
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
    return {
      company: company.name,
      ats,
      total_fetched: 0,
      il_jobs: 0,
      status: "no_slug",
      elapsed_ms: Date.now() - t0,
    };
  }
  const fetcher = FETCHERS[ats];
  if (!fetcher) {
    return {
      company: company.name,
      ats,
      total_fetched: 0,
      il_jobs: 0,
      status: "fetch_error",
      error: `no fetcher for ats=${ats}`,
      elapsed_ms: Date.now() - t0,
    };
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
      ats_source: ats,
      external_id: r.external_id,
      company_slug: company.slug!,
      company_name: company.name,
      title: cleanTitle,
      description: descPlain,
      apply_url: r.apply_url,
      location_raw: r.location_raw,
      location_city: loc.city,
      is_il: true,
      is_remote: r.is_remote,
      is_agency: company.is_agency ?? false,
      salary_min: r.salary_min,
      salary_max: r.salary_max,
      salary_currency: r.salary_currency,
      seniority: finalSeniority(titleBucket, years, {
        explicitJunior,
        titleHasMgmtSignal,
      }),
      years_experience_min: years.min,
      years_experience_max: years.max,
      industry: company.industry,
      date_posted: r.date_posted,
      raw_payload: r.raw_payload,
    });
  }

  // Dedup by the upsert conflict key before writing: a board that lists the
  // same external_id twice (observed on JoVE / Workable) makes the batch upsert
  // fail and lose every IL role for that company. See dedupByExternalId.
  const dedupedRows = dedupByExternalId(ilRows);
  const dupDropped = ilRows.length - dedupedRows.length;
  if (dupDropped > 0) {
    console.warn(
      `[refresh-jobs] ${company.name} (${ats}): dropped ${dupDropped} duplicate external_id row(s) before upsert`,
    );
  }

  if (dryRun || dedupedRows.length === 0 || !supabase) {
    return {
      company: company.name,
      ats,
      total_fetched: totalFetched,
      il_jobs: dedupedRows.length,
      status: "ok",
      elapsed_ms: Date.now() - t0,
    };
  }

  // UPSERT in batches to avoid huge single requests
  try {
    for (let i = 0; i < dedupedRows.length; i += UPSERT_BATCH_SIZE) {
      const batch = dedupedRows.slice(i, i + UPSERT_BATCH_SIZE).map((j) => ({
        ...j,
        last_seen_at: new Date().toISOString(),
        fetched_at: new Date().toISOString(),
        is_active: true,
      }));
      // Retry on Postgres 57014 (statement timeout) under nightly write
      // contention, mirroring the sweep's withTimeoutRetry. Without this a
      // single transient timeout lost the whole company for the night; the
      // two largest boards (NVIDIA/PANW) failed two nights running and the
      // 2-day sweep then deactivated all their rows (2026-07-26/27 incident).
      const { error } = await withTimeoutRetry(`upsert ${company.name}`, () =>
        supabase
          .from("jobs")
          .upsert(batch, { onConflict: "ats_source,external_id" }),
      );
      if (error) throw new Error(error.message);
    }
  } catch (err) {
    return {
      company: company.name,
      ats,
      total_fetched: totalFetched,
      il_jobs: dedupedRows.length,
      status: "upsert_error",
      error: (err as Error).message,
      elapsed_ms: Date.now() - t0,
    };
  }

  return {
    company: company.name,
    ats,
    total_fetched: totalFetched,
    il_jobs: dedupedRows.length,
    status: "ok",
    elapsed_ms: Date.now() - t0,
  };
}

// ───── Soft-delete sweep ──────────────────────────────────────────────

// Chunk size for the batched soft-delete UPDATE. A single unbounded UPDATE over
// the whole stale backlog hit the 2-min Postgres statement_timeout under nightly
// lock contention and silently skipped the sweep (2026-07-26/27 incident);
// small chunks keep each statement well under budget.
const SWEEP_CHUNK = 200;

// Under nightly lock contention the maintenance-tail statements (sweep id-scan,
// chunk UPDATEs, landing count) surface Postgres 57014 (`canceling statement due
// to statement timeout`) as a returned error. Bounded retry with linear backoff
// so a transient timeout doesn't skip the tail. Retries ONLY on timeout; any
// other error is returned to the caller on the first attempt.
async function withTimeoutRetry<T extends { error: unknown }>(
  label: string,
  fn: () => PromiseLike<T>,
  tries = 3,
  backoffMs = 2000,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fn();
    const msg = (res.error as { message?: string } | null)?.message ?? "";
    const isTimeout = /statement timeout|57014|canceling statement/i.test(msg);
    if (!res.error || !isTimeout || attempt >= tries) return res;
    console.error(
      `WARN: ${label} timed out (attempt ${attempt}/${tries}), retrying in ${backoffMs * attempt}ms`,
    );
    await new Promise((r) => setTimeout(r, backoffMs * attempt));
  }
}

async function softDeleteStale(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
  // Collect eligible ids first (paginated, single cheap column), then deactivate
  // in small chunks. Each chunk UPDATE re-asserts the FULL predicate so a row
  // that changed between the scan and the write is never wrongly touched.
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await withTimeoutRetry("sweep id-scan", () =>
      supabase
        .from("jobs")
        .select("id")
        .lt("last_seen_at", cutoff)
        .eq("is_active", true)
        .range(from, from + 999),
    );
    if (error) throw new Error(`soft-delete sweep failed: ${error.message}`);
    for (const r of data ?? []) ids.push(r.id);
    if (!data || data.length < 1000) break;
  }

  let deactivated = 0;
  for (let i = 0; i < ids.length; i += SWEEP_CHUNK) {
    const chunk = ids.slice(i, i + SWEEP_CHUNK);
    const { data, error } = await withTimeoutRetry("sweep update", () =>
      supabase
        .from("jobs")
        .update({ is_active: false })
        .in("id", chunk)
        .lt("last_seen_at", cutoff)
        .eq("is_active", true)
        .select("id"),
    );
    if (error) throw new Error(`soft-delete sweep failed: ${error.message}`);
    deactivated += (data ?? []).length;
  }
  return deactivated;
}

// ───── Landing page Hero stats ────────────────────────────────────────

const LANDING_STATS_PAGE_SIZE = 1000;

// Mirrors the EXACT is_il/is_active filter used by search_jobs_by_role_titles
// and count_active_jobs_by_role_titles (see supabase/migrations/20260708_
// create_landing_stats.sql for the full cross-reference) — no naive
// count(*) over the whole table, no role-title trigram filtering (that
// part of those RPCs is for personalized track matching and doesn't apply
// to this sitewide anonymous-visitor stat).
async function computeLandingStats(
  supabase: SupabaseClient,
): Promise<{ liveRolesCount: number; companiesHiringCount: number }> {
  const { count, error: countError } = await withTimeoutRetry(
    "landing count",
    () =>
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("is_il", true)
        .eq("is_active", true),
  );
  if (countError) {
    throw new Error(
      `landing_stats live-roles count failed: ${countError.message}`,
    );
  }

  // PostgREST has no COUNT(DISTINCT ...) — page through company_slug only
  // (cheap: single column, already filtered to active IL rows) and dedupe
  // in-process instead of standing up a dedicated RPC for one nightly read.
  const slugs = new Set<string>();
  for (let from = 0; ; from += LANDING_STATS_PAGE_SIZE) {
    const { data, error } = await withTimeoutRetry("landing company-scan", () =>
      supabase
        .from("jobs")
        .select("company_slug")
        .eq("is_il", true)
        .eq("is_active", true)
        .range(from, from + LANDING_STATS_PAGE_SIZE - 1),
    );
    if (error) {
      throw new Error(`landing_stats company count failed: ${error.message}`);
    }
    for (const row of data ?? []) slugs.add(row.company_slug);
    if (!data || data.length < LANDING_STATS_PAGE_SIZE) break;
  }

  return {
    liveRolesCount: count ?? 0,
    companiesHiringCount: slugs.size,
  };
}

// UPSERTs the single landing_stats row consumed by the marketing Hero
// (src/pages/_preview/LandingV2Preview.jsx). Must run AFTER softDeleteStale
// so is_active reflects tonight's sweep, not last night's.
async function refreshLandingStats(supabase: SupabaseClient): Promise<void> {
  const { liveRolesCount, companiesHiringCount } =
    await computeLandingStats(supabase);
  const { error } = await supabase.from("landing_stats").upsert(
    {
      id: 1,
      live_roles_count: liveRolesCount,
      companies_hiring_count: companiesHiringCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`landing_stats upsert failed: ${error.message}`);
  console.log(
    `Landing stats refreshed: ${liveRolesCount} live roles, ${companiesHiringCount} companies hiring.`,
  );
}

// ───── Main ───────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const startedAt = Date.now();

  // Load registry — fail fast if it's missing or malformed
  let registry: CompanyRegistry;
  try {
    registry = JSON.parse(
      readFileSync(REGISTRY_PATH, "utf8"),
    ) as CompanyRegistry;
  } catch (err) {
    console.error(
      `FATAL: could not read registry at ${REGISTRY_PATH}: ${(err as Error).message}`,
    );
    process.exit(1);
  }

  const companies = registry.companies.filter(
    (c) => c.verified && c.api_url && ENABLED_ATSS.has(c.ats),
  );
  console.log(
    `Loaded registry: ${registry.companies.length} total, ${companies.length} processable (verified + supported ATS).`,
  );

  // Initialize Supabase client (skipped in dry-run mode)
  let supabase: SupabaseClient | null = null;
  if (!dryRun) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error(
        "FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run).",
      );
      process.exit(1);
    }
    supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  } else {
    console.log("DRY RUN — no DB writes will happen.");
  }

  // Fan out across companies
  console.log(
    `\nFetching ${companies.length} companies with concurrency=${CONCURRENCY_LIMIT}...`,
  );
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
    console.log(
      `  ${mark} ${r.company.padEnd(30)} ${r.ats.padEnd(15)} ${detail}`,
    );
  }

  const totalCompanies = results.length;
  const successful = results.filter((r) => r.status === "ok").length;
  const failed = results.filter(
    (r) => r.status === "fetch_error" || r.status === "upsert_error",
  ).length;
  const totalIl = results.reduce((acc, r) => acc + r.il_jobs, 0);
  const totalFetched = results.reduce((acc, r) => acc + r.total_fetched, 0);

  // Soft-delete sweep
  let staleMarked = 0;
  let sweepOk = false;
  if (!dryRun && supabase) {
    try {
      staleMarked = await softDeleteStale(supabase);
      sweepOk = true;
    } catch (err) {
      console.error(
        `::warning::soft-delete sweep failed: ${(err as Error).message}`,
      );
    }
  }

  // Landing page Hero stats — must run AFTER the soft-delete sweep above so
  // is_active reflects tonight's run. A single missed night is absorbed by the
  // frontend fallback (HERO_STATS_FALLBACK + staleness check), so one failure
  // stays non-fatal, but the two-night loudness gate below reds the run.
  let statsOk = false;
  if (!dryRun && supabase) {
    try {
      await refreshLandingStats(supabase);
      statsOk = true;
    } catch (err) {
      console.error(
        `::warning::landing_stats refresh failed: ${(err as Error).message}`,
      );
    }
  }

  // LOUDNESS - never two silent green nights (2026-07-26/27: sweep + stats were
  // skipped two nights running while the run stayed green). landing_stats.updated_at
  // is the persistent cross-run signal: if this run failed to refresh the tail AND
  // that row is already >40h stale, the prior night failed too, red the run
  // (enforced at the EXIT gate below, after the fetch-health checks).
  let maintenanceTailAlarm = false;
  if (!dryRun && supabase && (!sweepOk || !statsOk)) {
    const { data } = await supabase
      .from("landing_stats")
      .select("updated_at")
      .eq("id", 1)
      .maybeSingle();
    const ageH = data?.updated_at
      ? (Date.now() - new Date(data.updated_at).getTime()) / 3_600_000
      : Infinity;
    if (ageH > 40) {
      console.error(
        `::error::refresh maintenance tail failed >=2 consecutive nights ` +
          `(landing_stats ${Number.isFinite(ageH) ? Math.round(ageH) + "h" : "never"} stale, ` +
          `sweepOk=${sweepOk} statsOk=${statsOk}). Investigate jobs-table statement timeouts.`,
      );
      maintenanceTailAlarm = true;
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
  console.log(
    `Wall time:            ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
  );
  console.log(`Mode:                 ${dryRun ? "DRY RUN" : "LIVE WRITES"}`);

  // Per-ATS isolation runs BEFORE the global backstop. Print the
  // per-family breakdown unconditionally so a GHA run summary always
  // shows the per-ATS health table — even on a clean run — and trips
  // (with the offending row first) when any one family breaks its
  // PER_ATS_FAILURE_THRESHOLD_PCT budget.
  const perAtsBreakdown = computePerAtsBreakdown(results);
  console.log(
    `\nPer-ATS health (failurePct > ${PER_ATS_FAILURE_THRESHOLD_PCT}% AND ≥${PER_ATS_MIN_SAMPLE} companies trips exit 1):`,
  );
  for (const b of perAtsBreakdown) {
    // ✗ trips exit 1; ⚠ is over the % but below the sample floor — a real
    // failure worth seeing in the log, but too small a denominator to
    // alarm on (e.g. a 1/1 single-company family); · is healthy.
    const overPct = b.failurePct > PER_ATS_FAILURE_THRESHOLD_PCT;
    const mark = overPct ? (b.total >= PER_ATS_MIN_SAMPLE ? "✗" : "⚠") : "·";
    console.log(
      `  ${mark} ${b.ats.padEnd(20)} ${b.failed}/${b.total} failed (${b.failurePct.toFixed(0)}%)`,
    );
  }
  const perAtsOver = selectOverThreshold(
    perAtsBreakdown,
    PER_ATS_FAILURE_THRESHOLD_PCT,
    PER_ATS_MIN_SAMPLE,
  );
  if (perAtsOver.length > 0) {
    const offenders = perAtsOver
      .map((b) => `${b.ats}@${b.failurePct.toFixed(0)}%`)
      .join(", ");
    console.error(
      `\nEXIT 1: per-ATS isolation tripped — ${offenders} (threshold: ${PER_ATS_FAILURE_THRESHOLD_PCT}%).`,
    );
    process.exit(1);
  }

  // Global backstop — catches the registry-wide outage case the per-ATS
  // check would miss (e.g. EVERY ATS limps along at 30% failure, no
  // single family trips the 50% gate, but the corpus as a whole is
  // 30% down).
  const failurePct = totalCompanies > 0 ? (failed / totalCompanies) * 100 : 0;
  if (failurePct > FAILURE_THRESHOLD_PCT) {
    console.error(
      `\nEXIT 1: ${failurePct.toFixed(0)}% of companies failed (threshold: ${FAILURE_THRESHOLD_PCT}%).`,
    );
    process.exit(1);
  }
  if (maintenanceTailAlarm) {
    console.error(
      `\nEXIT 1: refresh maintenance tail (soft-delete + landing_stats) has failed >=2 consecutive nights. Ingestion was healthy; the corpus-freshness sweep is not.`,
    );
    process.exit(1);
  }

  console.log(
    `\nEXIT 0: ${failurePct.toFixed(0)}% failure rate within ${FAILURE_THRESHOLD_PCT}% global threshold; no ATS family ≥${PER_ATS_MIN_SAMPLE} companies over ${PER_ATS_FAILURE_THRESHOLD_PCT}%.`,
  );
}

main().catch((err) => {
  console.error("UNHANDLED:", err);
  process.exit(1);
});

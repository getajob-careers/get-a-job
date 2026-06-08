// scripts/probe-dormant-companies.ts
//
// One-shot dormant audit. For every registry company that has a slug
// for a supported ATS but yields ZERO active rows in public.jobs, hit
// its fetcher once and classify the outcome:
//
//   - returned_il_jobs    fetcher worked, jobs include IL rows — refresh-jobs
//                         just hasn't picked them up yet (or our IL filter
//                         is rejecting them). Fix the IL classifier or
//                         re-run refresh-jobs.
//   - returned_non_il     fetcher worked, jobs returned but none IL.
//                         Genuinely no IL hiring right now — keep registry
//                         entry, no action.
//   - empty_board         fetcher worked, zero jobs at all. Either truly
//                         empty or wrong tenant. Archive candidate.
//   - http_404            slug is wrong / tenant moved. Drop or re-slug.
//   - http_other          transient or auth issue. Retry later.
//   - timeout / network   transient. Retry later.
//   - fetcher_threw       code-level bug (e.g. parser crash). Investigate.
//
// Usage:
//   npx tsx scripts/probe-dormant-companies.ts \
//     --baseline /tmp/dormant-slugs.json \
//     --out      /tmp/dormant-probe.json
//
// The --baseline is a JSON list of { slug, ats } produced by an
// out-of-band SQL query (so we don't hit the DB from this script).
// The --out is a JSON report grouped by outcome.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FETCHERS } from "./lib/ats-fetchers.js";
import type { CompanyEntry, CompanyRegistry } from "./lib/normalize.js";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const REGISTRY_PATH = join(SCRIPT_DIR, "..", "supabase", "functions", "_shared", "libraries", "companies_il.json");
const CONCURRENCY = 8;
const TIMEOUT_MS = 15_000;

type Outcome =
  | "returned_il_jobs"
  | "returned_non_il"
  | "empty_board"
  | "http_404"
  | "http_other"
  | "timeout"
  | "network"
  | "fetcher_threw";

interface ProbeResult {
  name: string;
  ats: string;
  slug: string | null;
  api_url: string | null;
  outcome: Outcome;
  detail?: string;
  total_jobs?: number;
  il_jobs?: number;
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function looksIsraeli(locationRaw: string | null | undefined): boolean {
  if (!locationRaw) return false;
  const lower = locationRaw.toLowerCase();
  if (/\bisrael\b/i.test(locationRaw)) return true;
  if (/ישראל|תל|חיפה|ירוש|הרצליה|פתח|רחובות/.test(locationRaw)) return true;
  if (
    /(tel\s*aviv|telaviv|tlv|herzliya|ramat\s*gan|petah|tikva|rehovot|haifa|jerusalem|netanya|raanana|ra'anana|ashdod|holon|modiin|kfar\s*saba|yokneam|caesarea|eilat|beer\s*sheva)/.test(
      lower,
    )
  ) {
    return true;
  }
  return false;
}

async function probeOne(c: CompanyEntry): Promise<ProbeResult> {
  const fetcher = FETCHERS[c.ats];
  if (!fetcher) {
    return { name: c.name, ats: c.ats, slug: c.slug, api_url: c.api_url, outcome: "fetcher_threw", detail: "no fetcher for this ats" };
  }
  const t0 = Date.now();
  try {
    // Wrap in our own timeout — the fetchers have internal timeouts but
    // they vary; this normalises the probe.
    const racing = Promise.race<unknown>([
      fetcher(c),
      new Promise((_, rej) => setTimeout(() => rej(new Error("probe_timeout")), TIMEOUT_MS)),
    ]);
    const jobs = (await racing) as Array<{ location_raw?: string | null; structured_country?: string | null }>;
    const total = Array.isArray(jobs) ? jobs.length : 0;
    if (total === 0) return { name: c.name, ats: c.ats, slug: c.slug, api_url: c.api_url, outcome: "empty_board", total_jobs: 0, il_jobs: 0 };
    const il = jobs.filter((j) => {
      const sc = (j.structured_country ?? "").toString().trim().toUpperCase();
      if (sc === "IL" || sc === "ISRAEL") return true;
      return looksIsraeli(j.location_raw);
    }).length;
    return {
      name: c.name,
      ats: c.ats,
      slug: c.slug,
      api_url: c.api_url,
      outcome: il > 0 ? "returned_il_jobs" : "returned_non_il",
      total_jobs: total,
      il_jobs: il,
      detail: `${Date.now() - t0}ms`,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    let outcome: Outcome;
    if (msg === "probe_timeout") outcome = "timeout";
    else if (/404|not\s+found/i.test(msg)) outcome = "http_404";
    else if (/HTTP\s+\d/i.test(msg)) outcome = "http_other";
    else if (/ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed/i.test(msg)) outcome = "network";
    else outcome = "fetcher_threw";
    return { name: c.name, ats: c.ats, slug: c.slug, api_url: c.api_url, outcome, detail: msg.slice(0, 200) };
  }
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<ProbeResult>): Promise<ProbeResult[]> {
  const out: ProbeResult[] = [];
  let i = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      const r = await fn(items[idx]);
      out.push(r);
      if (out.length % 20 === 0) console.error(`  probed ${out.length}/${items.length}`);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  const baselinePath = arg("--baseline");
  const outPath = arg("--out", "/tmp/dormant-probe.json")!;
  if (!baselinePath) {
    console.error("FATAL: pass --baseline /path/to/dormant-slugs.json");
    process.exit(1);
  }
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as Array<{ slug: string; ats: string }>;
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as CompanyRegistry;
  const byKey = new Map<string, CompanyEntry>();
  for (const c of registry.companies) if (c.slug) byKey.set(`${c.ats}:${c.slug}`, c);
  const targets: CompanyEntry[] = [];
  for (const b of baseline) {
    const c = byKey.get(`${b.ats}:${b.slug}`);
    if (c && FETCHERS[c.ats]) targets.push(c);
  }
  console.error(`Probing ${targets.length} dormant companies @ concurrency ${CONCURRENCY}...`);
  const results = await pool(targets, CONCURRENCY, probeOne);

  // Bucket counts
  const buckets: Record<Outcome, number> = {
    returned_il_jobs: 0,
    returned_non_il: 0,
    empty_board: 0,
    http_404: 0,
    http_other: 0,
    timeout: 0,
    network: 0,
    fetcher_threw: 0,
  };
  for (const r of results) buckets[r.outcome]++;

  const report = {
    probed_at: new Date().toISOString(),
    total: results.length,
    buckets,
    by_ats: results.reduce((acc, r) => {
      const k = `${r.ats}:${r.outcome}`;
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    actionable: results.filter((r) =>
      r.outcome === "returned_il_jobs" || r.outcome === "http_404" || r.outcome === "fetcher_threw" || r.outcome === "http_other",
    ),
    full: results.sort((a, b) => a.outcome.localeCompare(b.outcome) || a.ats.localeCompare(b.ats) || a.name.localeCompare(b.name)),
  };
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.error(`\nWrote ${outPath}`);
  console.error(`Buckets: ${JSON.stringify(buckets, null, 2)}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

// scripts/import-companies-from-registry.ts
//
// Internship redesign PR1. Imports companies_il.json (832 entries / 819 unique
// normalized domains) into public.companies:
//
//   - Existing rows (matched by normalized domain): UPDATE ats / ats_slug /
//     api_url / verified / origin. Only fills NULL slots — never overwrites a
//     hand-curated value. Source stays 'research'.
//   - Missing rows: INSERT name + domain + industry + careers_url + ats fields +
//     origin with source='registry'. Description / stage / size / founded / hq
//     stay NULL by design (filled by a later research pass with cited sources).
//
// Always writes tasks/companies-fuzzy-match-review.txt — the side channel for
// JSON entries whose normalized domain isn't in companies but whose name (case-
// insensitive) matches an existing companies.name. These rows are NOT merged
// automatically; they're listed for human review (possible rebrand, alternate
// domain, or unrelated namesake).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-companies-from-registry.ts --dry-run
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-companies-from-registry.ts          # live
//
// Exit codes: 0 = success, 1 = fatal config / fetch / write error.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Resolve paths lazily — fileURLToPath crashes under vitest's non-file URL
// when these are evaluated at module-import time.
function scriptDir(): string {
  return fileURLToPath(new URL(".", import.meta.url));
}
function registryPath(): string {
  return join(scriptDir(), "..", "supabase", "functions", "_shared", "libraries", "companies_il.json");
}
function fuzzyReportPath(): string {
  return join(scriptDir(), "..", "tasks", "companies-fuzzy-match-review.txt");
}
const INSERT_BATCH_SIZE = 100;

// ───── Types ──────────────────────────────────────────────────────────

export interface RegistryEntry {
  name: string;
  type: "israeli_founded" | "international_il_rd" | "israeli_subsidiary" | "aggregator";
  industry: string;
  domain: string;
  careers_url: string | null;
  ats: string;
  slug: string | null;
  api_url: string | null;
  verified: boolean;
  notes: string;
}

interface CompanyRow {
  id: string;
  name: string;
  domain: string | null;
  ats: string | null;
  ats_slug: string | null;
  api_url: string | null;
  verified: boolean | null;
  origin: string | null;
}

export interface PlannedUpdate {
  id: string;
  domain: string;
  name: string;
  patch: Partial<Pick<CompanyRow, "ats" | "ats_slug" | "api_url" | "verified" | "origin">>;
}

export interface PlannedInsert {
  name: string;
  domain: string;
  industry: string | null;
  careers_url: string | null;
  ats: string | null;
  ats_slug: string | null;
  api_url: string | null;
  verified: boolean | null;
  origin: string | null;
  source: "registry";
}

// ───── Pure helpers (exported for tests) ──────────────────────────────

export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const stripped = trimmed.startsWith("www.") ? trimmed.slice(4) : trimmed;
  return stripped || null;
}

export function nameKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.trim().toLowerCase().replace(/\s+/g, " ") || null;
}

/**
 * Dedupe registry entries by normalized domain. When the JSON has multiple
 * entries on the same domain (13 cases as of May 2026), prefer the one with
 * verified=true; otherwise keep the first.
 */
export function dedupeByDomain(entries: RegistryEntry[]): {
  unique: Array<RegistryEntry & { normDomain: string }>;
  duplicates: Array<{ normDomain: string; kept: string; dropped: string[] }>;
} {
  const byDomain = new Map<string, RegistryEntry[]>();
  for (const e of entries) {
    const nd = normalizeDomain(e.domain);
    if (!nd) continue;
    const list = byDomain.get(nd);
    if (list) list.push(e);
    else byDomain.set(nd, [e]);
  }
  const unique: Array<RegistryEntry & { normDomain: string }> = [];
  const duplicates: Array<{ normDomain: string; kept: string; dropped: string[] }> = [];
  for (const [nd, list] of byDomain) {
    if (list.length === 1) {
      unique.push({ ...list[0], normDomain: nd });
      continue;
    }
    const verified = list.find((x) => x.verified);
    const kept = verified ?? list[0];
    const dropped = list.filter((x) => x !== kept).map((x) => x.name);
    unique.push({ ...kept, normDomain: nd });
    duplicates.push({ normDomain: nd, kept: kept.name, dropped });
  }
  return { unique, duplicates };
}

/**
 * Build the UPDATE patch for an existing row: only fill ats / ats_slug /
 * api_url / verified / origin when the existing slot is NULL. Never overwrite
 * hand-curated values; never touch industry/description/etc.
 */
export function buildUpdatePatch(
  existing: CompanyRow,
  entry: RegistryEntry,
): PlannedUpdate["patch"] {
  const patch: PlannedUpdate["patch"] = {};
  if (existing.ats == null && entry.ats) patch.ats = entry.ats;
  if (existing.ats_slug == null && entry.slug) patch.ats_slug = entry.slug;
  if (existing.api_url == null && entry.api_url) patch.api_url = entry.api_url;
  if (existing.verified == null) patch.verified = Boolean(entry.verified);
  if (existing.origin == null && entry.type) patch.origin = entry.type;
  return patch;
}

export function buildInsertRow(entry: RegistryEntry & { normDomain: string }): PlannedInsert {
  return {
    name:        entry.name,
    domain:      entry.normDomain,
    industry:    entry.industry || null,
    careers_url: entry.careers_url || null,
    ats:         entry.ats || null,
    ats_slug:    entry.slug || null,
    api_url:     entry.api_url || null,
    verified:    Boolean(entry.verified),
    origin:      entry.type || null,
    source:      "registry",
  };
}

/**
 * Find JSON entries whose normalized domain isn't in the DB but whose name
 * (case-insensitive) matches an existing companies.name. These are the rows
 * we surface for human review (possible rebrand / alternate domain / unrelated
 * namesake) instead of auto-merging.
 */
export function findNameOnlyMatches(
  unique: Array<RegistryEntry & { normDomain: string }>,
  existing: CompanyRow[],
): Array<{ json_name: string; json_domain: string; db_id: string; db_name: string; db_domain: string | null }> {
  const dbByName = new Map<string, CompanyRow[]>();
  for (const row of existing) {
    const k = nameKey(row.name);
    if (!k) continue;
    const list = dbByName.get(k);
    if (list) list.push(row);
    else dbByName.set(k, [row]);
  }
  const dbDomains = new Set(
    existing.map((r) => normalizeDomain(r.domain)).filter((d): d is string => !!d),
  );
  const out: ReturnType<typeof findNameOnlyMatches> = [];
  for (const e of unique) {
    if (dbDomains.has(e.normDomain)) continue;
    const k = nameKey(e.name);
    if (!k) continue;
    const matches = dbByName.get(k);
    if (!matches || matches.length === 0) continue;
    for (const m of matches) {
      out.push({
        json_name: e.name,
        json_domain: e.normDomain,
        db_id: m.id,
        db_name: m.name,
        db_domain: m.domain,
      });
    }
  }
  return out;
}

// ───── IO ─────────────────────────────────────────────────────────────

function loadRegistry(): RegistryEntry[] {
  const path = registryPath();
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`could not read registry at ${path}: ${(err as Error).message}`);
  }
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.companies)) {
    throw new Error("registry JSON missing top-level .companies array");
  }
  return parsed.companies as RegistryEntry[];
}

async function loadExistingCompanies(supabase: SupabaseClient): Promise<CompanyRow[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, domain, ats, ats_slug, api_url, verified, origin");
  if (error) throw new Error(`failed to read companies: ${error.message}`);
  return (data ?? []) as CompanyRow[];
}

function writeFuzzyReport(
  matches: ReturnType<typeof findNameOnlyMatches>,
): void {
  const header = [
    "# Name-only fuzzy matches between companies_il.json and public.companies",
    "#",
    "# Generated by scripts/import-companies-from-registry.ts.",
    "# These JSON entries had no domain match in companies but had a",
    "# case-insensitive name match. They were NOT auto-merged — review each one",
    "# and decide: same company under different domains (merge by hand), or",
    "# unrelated namesake (leave both rows distinct).",
    "#",
    `# Generated at: ${new Date().toISOString()}`,
    `# Match count:  ${matches.length}`,
    "",
    "json_name\tjson_domain\tdb_id\tdb_name\tdb_domain",
  ].join("\n");
  const lines = matches.map(
    (m) => `${m.json_name}\t${m.json_domain}\t${m.db_id}\t${m.db_name}\t${m.db_domain ?? ""}`,
  );
  writeFileSync(fuzzyReportPath(), header + "\n" + lines.join("\n") + "\n", "utf8");
}

// ───── Main ───────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const startedAt = Date.now();

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const raw = loadRegistry();
  console.log(`Loaded registry: ${raw.length} raw entries.`);

  const { unique, duplicates } = dedupeByDomain(raw);
  console.log(`After dedupe-by-domain: ${unique.length} unique (${duplicates.length} domain collisions, kept verified-preferred).`);
  if (duplicates.length > 0 && duplicates.length <= 25) {
    for (const d of duplicates) {
      console.log(`  · ${d.normDomain}: kept "${d.kept}", dropped [${d.dropped.join(", ")}]`);
    }
  }

  const existing = await loadExistingCompanies(supabase);
  console.log(`Existing companies in DB: ${existing.length}.`);

  // Index existing rows by normalized domain.
  const existingByDomain = new Map<string, CompanyRow>();
  for (const row of existing) {
    const nd = normalizeDomain(row.domain);
    if (nd) existingByDomain.set(nd, row);
  }

  // Plan updates + inserts.
  const updates: PlannedUpdate[] = [];
  const updatesNoop: number = 0;
  let noopCount = 0;
  const inserts: PlannedInsert[] = [];
  for (const e of unique) {
    const hit = existingByDomain.get(e.normDomain);
    if (hit) {
      const patch = buildUpdatePatch(hit, e);
      if (Object.keys(patch).length === 0) {
        noopCount++;
      } else {
        updates.push({ id: hit.id, domain: e.normDomain, name: e.name, patch });
      }
    } else {
      inserts.push(buildInsertRow(e));
    }
  }

  // Fuzzy-match audit file (always written, even in dry-run).
  const fuzzy = findNameOnlyMatches(unique, existing);
  writeFuzzyReport(fuzzy);
  console.log(`Wrote fuzzy-match review: ${fuzzyReportPath()} (${fuzzy.length} entries).`);

  // ── Report ────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log(dryRun ? "DRY RUN — no DB writes" : "LIVE — applying changes");
  console.log("=".repeat(70));
  console.log(`Registry raw entries:           ${raw.length}`);
  console.log(`Unique normalized domains:      ${unique.length}`);
  console.log(`Domain duplicates collapsed:    ${duplicates.length}`);
  console.log(`Existing rows matched:          ${updates.length + noopCount} (${updates.length} need patch, ${noopCount} already complete)`);
  console.log(`New rows to insert:             ${inserts.length}`);
  console.log(`Name-only fuzzy matches:        ${fuzzy.length} (audit file, NOT merged)`);

  if (updates.length > 0) {
    console.log("\nSample UPDATE plans (first 5):");
    for (const u of updates.slice(0, 5)) {
      const keys = Object.keys(u.patch).join(", ");
      console.log(`  · ${u.name.padEnd(35)} ${u.domain.padEnd(30)} → fill { ${keys} }`);
    }
  }
  if (inserts.length > 0) {
    console.log("\nSample INSERT plans (first 5):");
    for (const i of inserts.slice(0, 5)) {
      console.log(`  · ${i.name.padEnd(35)} ${i.domain.padEnd(30)} ats=${i.ats ?? "—"} origin=${i.origin ?? "—"} verified=${i.verified}`);
    }
  }

  if (dryRun) {
    console.log(`\nDRY RUN complete in ${((Date.now() - startedAt) / 1000).toFixed(1)}s. Re-run without --dry-run to apply.`);
    return;
  }

  // ── Live writes ───────────────────────────────────────────────────────
  let updatedOk = 0;
  let updateErr = 0;
  for (const u of updates) {
    const { error } = await supabase.from("companies").update(u.patch).eq("id", u.id);
    if (error) {
      console.error(`UPDATE failed for ${u.name} (${u.id}): ${error.message}`);
      updateErr++;
    } else {
      updatedOk++;
    }
  }

  let insertedOk = 0;
  let insertErr = 0;
  for (let i = 0; i < inserts.length; i += INSERT_BATCH_SIZE) {
    const batch = inserts.slice(i, i + INSERT_BATCH_SIZE);
    const { error, data } = await supabase.from("companies").insert(batch).select("id");
    if (error) {
      console.error(`INSERT batch failed at offset ${i}: ${error.message}`);
      insertErr += batch.length;
    } else {
      insertedOk += data?.length ?? batch.length;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(`UPDATE: ${updatedOk} ok, ${updateErr} failed`);
  console.log(`INSERT: ${insertedOk} ok, ${insertErr} failed`);
  console.log(`Elapsed: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  if (updateErr > 0 || insertErr > 0) process.exit(1);
}

// Skip main() when imported by tests.
const isMain = process.argv[1] && process.argv[1].endsWith("import-companies-from-registry.ts");
if (isMain) {
  main().catch((err) => {
    console.error("UNHANDLED:", err);
    process.exit(1);
  });
}

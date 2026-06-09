// scripts/derive-hebrew-seniority.ts
//
// Final stage of the nightly refresh pipeline. Derives jobs.seniority
// (lowercase regex vocab) from jobs.req_seniority (LLM Hebrew-aware
// vocab) for Hebrew-language rows where the title-regex classifier
// landed the default 'mid'.
//
// Why this exists:
//   `seniority` is set at ingest by finalSeniority() in
//   scripts/lib/normalize.ts. The detectSeniorityFromTitle regex it
//   relies on is English-only — `intern|junior|graduate|trainee|sdr|
//   coordinator|representative|...`. Hebrew titles like
//   `מתמחה` (intern), `ג'וניור` (junior), `סטודנט/ית` (student),
//   `נציג/ת` (representative), `רכז/ת` (coordinator) all fall through
//   to the `mid` default. This used to silently bury ~150
//   Hebrew-language entry roles per nightly cron under a `mid` badge —
//   AND remove them from the Jobs-page "Entry" filter, which reads
//   from `seniority` (not `req_seniority`).
//
//   Adding Hebrew patterns to the regex was rejected (PR review
//   2026-06-09): re-creates the #270 over-promotion blast radius at
//   the wrong layer, since the regex has no JD-text context to
//   disambiguate (`רכז פרויקטים בכיר` is a SENIOR coordinator).
//   The LLM extractor already reads Hebrew correctly and sets
//   `req_seniority` on the same row. Cleaner fix: trust the LLM,
//   derive `seniority` from `req_seniority` on the rows where the
//   regex fell through.
//
// Scope (defensive):
//   - jd_language IN ('he','iw','mixed')  — Hebrew rows only
//   - seniority = 'mid'                   — regex's default bucket only
//   - req_seniority IS NOT NULL           — LLM produced a value
//   - derived value <> current value      — no-op if unchanged
//
//   Critical: never overrides a regex-asserted 'entry'/'senior'/'lead'/
//   'director'/'executive'. The regex is conservative and trustworthy
//   on those (#270-validated). We only refine the default.
//
//   English rows untouched. PwC English JDs + Greenhouse/Lever/Ashby
//   stay on the #270 regex.
//
// Mapping (req_seniority → seniority):
//   Entry         → entry
//   Entry_Mid     → mid     (NOT entry — sample showed Entry_Mid contains
//                            real-Mid borderlines like fund managers,
//                            engineers; mapping to mid keeps them visible
//                            to early_career via the [entry,mid] gate
//                            without inflating the Entry bucket)
//   Mid           → mid
//   Senior        → senior
//   Lead_Manager  → lead
//   Director_Head → director
//   VP_Executive  → executive
//
// Idempotent — re-runs are safe (the `derived <> current` predicate
// skips already-flipped rows). Returns exit 0 on zero updates.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/derive-hebrew-seniority.ts
//
// First-run audit lives in public._seniority_derive_rollback_2026_06_09
// (148 rows, captured 2026-06-09 during the one-shot derive before this
// pipeline stage existed). Drop it after this stage has stabilised over
// a cron or two.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const MAPPING: Record<string, string> = {
  Entry: "entry",
  Entry_Mid: "mid",
  Mid: "mid",
  Senior: "senior",
  Lead_Manager: "lead",
  Director_Head: "director",
  VP_Executive: "executive",
};

interface PickedRow {
  id: string;
  req_seniority: string;
  title: string;
  ats_source: string;
}

async function pickCandidates(): Promise<PickedRow[]> {
  // Page through every Hebrew row currently at seniority='mid' with a
  // non-null req_seniority. PostgREST hard-caps at 1000 per call.
  const PAGE = 1000;
  const all: PickedRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, req_seniority, title, ats_source")
      .eq("is_active", true)
      .in("jd_language", ["he", "iw", "mixed"])
      .eq("seniority", "mid")
      .not("req_seniority", "is", null)
      .order("first_seen_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error("Query failed:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    all.push(...(data as PickedRow[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function applyOne(row: PickedRow): Promise<"updated" | "skipped" | "errored"> {
  const derived = MAPPING[row.req_seniority];
  if (!derived) return "skipped"; // unknown vocab value — leave alone
  if (derived === "mid") return "skipped"; // no flip needed
  const { error } = await supabase
    .from("jobs")
    .update({ seniority: derived })
    .eq("id", row.id)
    .eq("seniority", "mid"); // double-guard against races with refresh-jobs
  if (error) {
    console.error(`  update failed for ${row.id}: ${error.message}`);
    return "errored";
  }
  return "updated";
}

async function main() {
  const t0 = Date.now();
  console.log("Derive Hebrew seniority — picking candidates…");
  const rows = await pickCandidates();
  console.log(`Picked ${rows.length} Hebrew rows at seniority='mid' with req_seniority set.\n`);
  if (rows.length === 0) {
    console.log("Nothing to derive. Exiting.");
    return;
  }

  // Tally by target bucket for visibility (matches the #270-style
  // reporting Eli verifies against).
  const buckets: Record<string, number> = { entry: 0, mid: 0, senior: 0, lead: 0, director: 0, executive: 0, "<unknown>": 0 };
  for (const r of rows) buckets[MAPPING[r.req_seniority] || "<unknown>"]++;
  console.log("Pre-flip bucket distribution (derived target):");
  for (const [k, v] of Object.entries(buckets)) if (v > 0) console.log(`  ${k.padEnd(10)} ${v}`);
  console.log();

  let updated = 0;
  let skipped = 0;
  let errored = 0;
  // Sequential UPDATEs — 148 rows the first time, ~10-30/cron after.
  // Concurrency adds complexity for no measurable wallclock gain.
  for (const row of rows) {
    const outcome = await applyOne(row);
    if (outcome === "updated") updated++;
    else if (outcome === "skipped") skipped++;
    else errored++;
  }

  console.log("=".repeat(60));
  console.log("DERIVE SUMMARY");
  console.log("=".repeat(60));
  console.log(`Picked:   ${rows.length}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}  (req_seniority maps to 'mid' — no flip needed)`);
  console.log(`Errored:  ${errored}`);
  console.log(`Wall:     ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (errored > 0) process.exit(1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

// scripts/dryrun-qualification-diff.ts
//
// Computes every user's OLD vs NEW qualification_level against live data
// and prints the diff. NO writes — pure read + compute.
//
// OLD logic (pre-PR-1):
//   - Filter experiences where reinferType ∈ {full_time, freelance}
//   - hasManaged = any of those rows has managed_people=true
//   - count = number of those rows
//   - if (hasManaged || count >= 5) Senior
//   - else if (count >= 2)          Mid-Level
//   - else                          Junior
//
// NEW logic (this PR — duration-based):
//   - Filter experiences where reinferType ∈ {full_time, part_time,
//                                             freelance, founder}
//   - years = sum of per-row durations (naive — overlaps double-count)
//   - if years >= 8  base = Senior
//     else if >= 3   base = Mid-Level
//     else           base = Junior
//   - managed_people bumps one tier (Junior→Mid, Mid→Senior, Senior stays)
//     IFF the carrying row has >= 1 year of parseable duration.
//
// Also flags rows whose tier change is driven by:
//   (a) overlapping date ranges (sum > deduped-union)
//   (b) the new managed_people-bump rule
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npx tsx scripts/dryrun-qualification-diff.ts

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

type Exp = {
  user_id: string;
  title: string | null;
  company: string | null;
  type: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  managed_people: boolean | null;
  responsibilities: string[] | string | null;
};

const NOW = new Date().getFullYear();

function yearFromDate(s: unknown): number | null {
  if (!s) return null;
  const m = String(s).match(/\b(19|20)\d{2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

// Mirrors src/lib/experienceLevel.js reinferType.
function reinferType(e: Exp): string {
  const stored = String(e?.type ?? "").toLowerCase();
  const resp = Array.isArray(e?.responsibilities) ? e.responsibilities.join(" ") : (e?.responsibilities || "");
  const text = `${e?.title || ""} ${e?.company || ""} ${resp}`.toLowerCase();
  if (/\b(idf|nahal|givati|golani|paratroopers|sayeret|matkal|shaldag|duvdevan|kfir|unit 8200|\b8200\b|mamram|talpiot|israeli? defense forces|military service|army|idf reserves|soldier|officer training|bahad)\b/.test(text)) return "military";
  if (/\b(volunteer|volunteering|pro bono|mentor(ed|ing)? at)\b/.test(text)) return "volunteer";
  if (/\b(intern|internship)\b/.test(text)) return "internship";
  if (/\b(freelance|freelancer|self-employed|contractor|consultant)\b/.test(text)) return "freelance";
  if (/\b(president|captain|chair|founder|co-founder|team lead(er)?)\b/.test(text) && /\b(club|society|association|student|chapter)\b/.test(text)) return "leadership";
  if (/\b(founder|co-?founder|self-?employed|ceo)\b/.test(text)) return "founder";
  return stored || "full_time";
}

function isCurrentRow(e: Exp): boolean {
  const endRaw = String(e.end_date ?? "").toLowerCase();
  return Boolean(e.is_current) || !endRaw || endRaw.includes("present") || endRaw.includes("current");
}

function rowSpan(e: Exp): { start: number; end: number; dur: number } | null {
  const start = yearFromDate(e.start_date);
  if (start === null) return null;
  const end = isCurrentRow(e) ? NOW : (yearFromDate(e.end_date) ?? NOW);
  const dur = Math.max(0, end - start);
  return { start, end: Math.max(start, end), dur };
}

// OLD: count-based, full_time|freelance only.
function oldQual(exps: Exp[]): "Junior" | "Mid-Level" | "Senior" {
  const career = exps.filter((e) => {
    const t = reinferType(e);
    return t === "full_time" || t === "freelance";
  });
  const hasManaged = career.some((e) => !!e.managed_people);
  const count = career.length;
  if (hasManaged || count >= 5) return "Senior";
  if (count >= 2) return "Mid-Level";
  return "Junior";
}

// NEW: duration-based, full_time|part_time|freelance|founder.
const QUAL = new Set(["full_time", "part_time", "freelance", "founder"]);
function newQual(exps: Exp[]): { level: "Junior" | "Mid-Level" | "Senior"; baseLevel: "Junior" | "Mid-Level" | "Senior"; years: number; managedBump: boolean; overlapYears: number } {
  let years = 0;
  let hasManagedWithDuration = false;
  const qualSpans: { start: number; end: number; dur: number }[] = [];
  for (const e of exps) {
    if (!QUAL.has(reinferType(e))) continue;
    const span = rowSpan(e);
    if (!span) continue;
    years += span.dur;
    qualSpans.push(span);
    if (e.managed_people && span.dur >= 1) hasManagedWithDuration = true;
  }
  // Compute deduped years via sweep-line union.
  const events: [number, number][] = [];
  for (const s of qualSpans) {
    events.push([s.start, +1]);
    events.push([s.end, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let depth = 0, prev: number | null = null, dedupedYears = 0;
  for (const [y, d] of events) {
    if (depth > 0 && prev !== null) dedupedYears += y - prev;
    depth += d;
    prev = y;
  }
  const overlapYears = Math.max(0, years - dedupedYears);

  let baseLevel: "Junior" | "Mid-Level" | "Senior";
  if (years >= 8) baseLevel = "Senior";
  else if (years >= 3) baseLevel = "Mid-Level";
  else baseLevel = "Junior";

  let level = baseLevel;
  if (hasManagedWithDuration) {
    if (level === "Junior") level = "Mid-Level";
    else if (level === "Mid-Level") level = "Senior";
  }
  return { level, baseLevel, years, managedBump: hasManagedWithDuration, overlapYears };
}

const TIER_RANK: Record<string, number> = { Junior: 0, "Mid-Level": 1, Senior: 2 };

async function main() {
  console.log("dryrun-qualification-diff — read-only against live prod\n");

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name");
  if (pErr) { console.error("profiles query failed:", pErr.message); process.exit(1); }

  const { data: exps, error: eErr } = await supabase
    .from("experiences")
    .select("user_id, title, company, type, start_date, end_date, is_current, managed_people, responsibilities");
  if (eErr) { console.error("experiences query failed:", eErr.message); process.exit(1); }

  // Group by user.
  const byUser = new Map<string, Exp[]>();
  for (const e of (exps || []) as Exp[]) {
    if (!byUser.has(e.user_id)) byUser.set(e.user_id, []);
    byUser.get(e.user_id)!.push(e);
  }

  // Compute diff.
  const rows: Array<{
    user_id: string;
    full_name: string;
    n_exps: number;
    old: string;
    new: string;
    direction: "↑" | "↓" | "=";
    years: number;
    overlapYears: number;
    managedBump: boolean;
    drivers: string[];
  }> = [];

  for (const p of profiles || []) {
    const exps = byUser.get(p.id) ?? [];
    const o = oldQual(exps);
    const n = newQual(exps);
    const direction = TIER_RANK[n.level] > TIER_RANK[o] ? "↑" : TIER_RANK[n.level] < TIER_RANK[o] ? "↓" : "=";
    const drivers: string[] = [];
    if (direction !== "=") {
      if (n.managedBump && n.level !== n.baseLevel) drivers.push("managed_people-bump");
      if (n.overlapYears > 0) drivers.push(`overlap(+${n.overlapYears}y)`);
    }
    rows.push({
      user_id: p.id,
      full_name: p.full_name ?? "",
      n_exps: exps.length,
      old: o,
      new: n.level,
      direction,
      years: n.years,
      overlapYears: n.overlapYears,
      managedBump: n.managedBump,
      drivers,
    });
  }

  const changed = rows.filter((r) => r.direction !== "=");
  const overlapDriven = changed.filter((r) => r.drivers.some((d) => d.startsWith("overlap")));
  const managedDriven = changed.filter((r) => r.drivers.includes("managed_people-bump"));

  // Summary.
  console.log(`Profiles scanned:   ${rows.length}`);
  console.log(`Changed:            ${changed.length}`);
  console.log(`  ↑ promoted:       ${changed.filter((r) => r.direction === "↑").length}`);
  console.log(`  ↓ demoted:        ${changed.filter((r) => r.direction === "↓").length}`);
  console.log(`  unchanged:        ${rows.length - changed.length}`);
  console.log("");

  if (changed.length > 0) {
    console.log("=== ALL TIER CHANGES ===");
    for (const r of changed) {
      console.log(
        `  ${r.direction} ${r.old.padEnd(9)} → ${r.new.padEnd(9)}  years=${String(r.years).padStart(2)}  exps=${r.n_exps}  ` +
        `${r.full_name || "(no name)"}  [${r.user_id}]  ${r.drivers.join(", ")}`
      );
    }
    console.log("");
  }

  if (overlapDriven.length > 0) {
    console.log("=== (a) TIER CHANGES INVOLVING OVERLAPPING DATE RANGES ===");
    for (const r of overlapDriven) {
      console.log(
        `  ${r.direction} ${r.old} → ${r.new}  years=${r.years}  overlap=+${r.overlapYears}y  ` +
        `${r.full_name}  [${r.user_id}]`
      );
    }
    console.log("");
  } else {
    console.log("=== (a) TIER CHANGES INVOLVING OVERLAPPING DATE RANGES === none\n");
  }

  if (managedDriven.length > 0) {
    console.log("=== (b) TIER CHANGES DRIVEN BY managed_people BUMP ===");
    for (const r of managedDriven) {
      console.log(
        `  ${r.direction} ${r.old} → ${r.new}  years=${r.years}  ` +
        `${r.full_name}  [${r.user_id}]`
      );
    }
    console.log("");
  } else {
    console.log("=== (b) TIER CHANGES DRIVEN BY managed_people BUMP === none\n");
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

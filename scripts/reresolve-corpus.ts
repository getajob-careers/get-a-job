// reresolve-corpus.ts — cheap re-resolve pass (Deno, NO LLM). Re-runs the
// resolver (current working-tree skill-aliases + 01_skill_library) over the
// banked req_skills_{core,nice,must_have}_raw columns and recomputes the
// resolved columns + coverage + unmapped. Use after a library-expansion batch
// merges to lift coverage at zero LLM cost.
//
// Run:
//   deno run --allow-env --allow-read --allow-net scripts/reresolve-corpus.ts [--write]
//   (default = DRY: reports movement, writes nothing. --write applies it.)
// Keys (env or scripts/.bakeoff.env): SUPABASE_SERVICE_ROLE_KEY.

import { resolveSkill as resolveSkillShared } from "../supabase/functions/_shared/skill-aliases.ts";
import { skillLibrary } from "../supabase/functions/_shared/libraries/01_skill_library.ts";

const SUPABASE_URL = "https://ilmqmodklutztuybsvwd.supabase.co";
const WRITE = Deno.args.includes("--write");

function loadKey(): string {
  const e = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (e) return e;
  try {
    for (const line of Deno.readTextFileSync(
      new URL("./.bakeoff.env", import.meta.url),
    ).split("\n")) {
      const m = line.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* none */
  }
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY not found (env or scripts/.bakeoff.env)",
  );
  Deno.exit(1);
}
const KEY = loadKey();
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const SKILL_ID_SET: Set<string> = new Set(
  ((skillLibrary as any).skill_library as any[])
    .map((s) => s.id || s.skill_id)
    .filter(Boolean),
);
const resolveSkill = (label: string): string[] =>
  resolveSkillShared(label, SKILL_ID_SET);
console.error(`library IDs loaded: ${SKILL_ID_SET.size}`);

// resolve one job's raw arrays exactly as the edge fn does
function reresolve(row: any) {
  const core = new Set<string>(),
    nice = new Set<string>(),
    must = new Set<string>();
  const unmapped: string[] = [];
  for (const r of row.req_skills_core_raw ?? []) {
    const ids = resolveSkill(r);
    ids.length ? ids.forEach((i: string) => core.add(i)) : unmapped.push(r);
  }
  for (const r of row.req_skills_nice_raw ?? []) {
    const ids = resolveSkill(r);
    ids.length ? ids.forEach((i: string) => nice.add(i)) : unmapped.push(r);
  }
  for (const r of row.req_skills_must_have_raw ?? [])
    resolveSkill(r).forEach((i: string) => must.add(i));
  const totalRaw =
    (row.req_skills_core_raw?.length ?? 0) +
    (row.req_skills_nice_raw?.length ?? 0);
  const uniqUnmapped = Array.from(
    new Set(
      unmapped
        .map((s) => s.toLowerCase().replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ),
  );
  return {
    core: [...core],
    nice: [...nice],
    must: [...must],
    unmapped: uniqUnmapped,
    coverage:
      totalRaw > 0
        ? Math.round(((totalRaw - unmapped.length) / totalRaw) * 1000) / 1000
        : null,
  };
}

// paginate all v5 jobs with raw data
async function fetchRows() {
  const rows: any[] = [];
  const cols =
    "id,req_skills_core,req_skills_core_raw,req_skills_nice_raw,req_skills_must_have_raw,skill_coverage_ratio";
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/jobs?is_active=eq.true&extraction_schema_version=eq.5&req_skills_core_raw=not.is.null&select=${cols}`,
      { headers: { ...H, Range: `${from}-${from + 999}` } },
    );
    if (!res.ok) {
      console.error("fetch failed", res.status, await res.text());
      Deno.exit(1);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

const rows = await fetchRows();
console.error(
  `fetched ${rows.length} v5 jobs with raw data (mode=${WRITE ? "WRITE" : "DRY"})`,
);

let beforeZero = 0,
  afterZero = 0,
  beforeResolvedSum = 0,
  afterResolvedSum = 0;
let covBeforeSum = 0,
  covAfterSum = 0,
  covN = 0,
  changed = 0,
  written = 0,
  writeErr = 0;
for (const row of rows) {
  const beforeCore = row.req_skills_core?.length ?? 0;
  const rr = reresolve(row);
  if (beforeCore === 0) beforeZero++;
  if (rr.core.length === 0) afterZero++;
  beforeResolvedSum += beforeCore;
  afterResolvedSum += rr.core.length;
  if (row.skill_coverage_ratio != null) {
    covBeforeSum += Number(row.skill_coverage_ratio);
    covN++;
  }
  if (rr.coverage != null) covAfterSum += rr.coverage;
  if (rr.core.length !== beforeCore) changed++;

  if (WRITE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${row.id}`, {
      method: "PATCH",
      headers: {
        ...H,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        req_skills_core: rr.core.length ? rr.core : null,
        req_skills_nice: rr.nice.length ? rr.nice : null,
        req_skills_must_have: rr.must.length ? rr.must : null,
        extraction_unmapped_skills: rr.unmapped.length ? rr.unmapped : null,
        skill_coverage_ratio: rr.coverage,
      }),
    });
    res.ok
      ? written++
      : (writeErr++,
        console.error(`write ${row.id.slice(0, 8)} ${res.status}`));
  }
}

const n = rows.length || 1;
console.log(
  JSON.stringify(
    {
      mode: WRITE ? "WRITE" : "DRY",
      jobs: rows.length,
      zero_core: {
        before: beforeZero,
        after: afterZero,
        before_pct: +((100 * beforeZero) / n).toFixed(1),
        after_pct: +((100 * afterZero) / n).toFixed(1),
      },
      avg_resolved_core: {
        before: +(beforeResolvedSum / n).toFixed(2),
        after: +(afterResolvedSum / n).toFixed(2),
      },
      avg_coverage: {
        before: covN ? +(covBeforeSum / covN).toFixed(3) : null,
        after: +(covAfterSum / n).toFixed(3),
      },
      jobs_changed: changed,
      ...(WRITE ? { written, writeErr } : {}),
    },
    null,
    2,
  ),
);

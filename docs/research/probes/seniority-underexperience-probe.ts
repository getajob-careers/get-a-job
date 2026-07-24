// TEMP measurement probe (seniority/under-experience audit). Not committed.
// Runs the REAL client scorer with the live digest opts against a DB snapshot.
import fs from "node:fs";
import { scoreJobFit } from "../src/lib/scoreJobFit.js";
import { inferExperienceLevel } from "../src/lib/experienceLevel.js";
import { DIGEST_SCORING_OPTS } from "../src/lib/selectDigestJobs.js";
import {
  SENIORITY_RANK,
  STAGE_T1_CEILING,
  EXPERIENCE_LEVEL_TO_STAGE,
} from "../supabase/functions/_shared/track-scoring-constants.ts";

const DIR = "/Users/elienglard/.claude/jobs/87f683c9/tmp";
const users = JSON.parse(fs.readFileSync(`${DIR}/users.json`, "utf8"));
const jobs = JSON.parse(fs.readFileSync(`${DIR}/jobs_digest.json`, "utf8"));
const rows = JSON.parse(fs.readFileSync(`${DIR}/digest_rows.json`, "utf8"));

const jobById = new Map(jobs.map((j: any) => [j.id, j]));
const userById = new Map(users.map((u: any) => [u.user_id, u]));

// TRUE rank per the extraction vocab (00_role_library seniority_levels order).
const TRUE_RANK: Record<string, number> = {
  Entry: 0,
  Entry_Mid: 1,
  Mid: 2,
  Senior: 3,
  Lead_Manager: 4,
  Director_Head: 5,
  VP_Executive: 6,
};
const CEIL_BY_STAGE: Record<string, number> = {
  early: STAGE_T1_CEILING.early,
  mid: STAGE_T1_CEILING.mid,
  senior: STAGE_T1_CEILING.senior,
};

function userInputOf(u: any) {
  return {
    profile: {
      skills_canonical: u.skills_canonical ?? [],
      primary_domain: u.primary_domain ?? null,
      qualification_level: u.qualification_level ?? null,
    },
    experiences: u.experiences ?? [],
    educations: u.educations ?? [],
  };
}
function levelOf(u: any) {
  return inferExperienceLevel(u.experiences ?? [], u.educations ?? []);
}
function axisDump(input: any, job: any) {
  const r = scoreJobFit(input, job, DIGEST_SCORING_OPTS);
  return r;
}

// ── D1 sanity: which req_seniority values the scorer can/can't rank ──
console.log("=== SENIORITY_RANK coverage of extraction vocab ===");
for (const v of Object.keys(TRUE_RANK)) {
  console.log(
    `  ${v.padEnd(14)} scorerRank=${SENIORITY_RANK[v] ?? "NULL(unknown_value→0.5)"}`,
  );
}

// ── Compute level distribution of the 38 digest users ──
const levelCount: Record<string, number> = {};
for (const u of users) {
  const lv = levelOf(u);
  levelCount[lv] = (levelCount[lv] ?? 0) + 1;
  u.__level = lv;
}
console.log("\n=== 38 digest users: inferExperienceLevel distribution ===");
console.log(" ", levelCount);

// ── D3: every (user, picked job); flag picks where TRUE_RANK(job) > ceiling(user) ──
console.log(
  "\n=== D3: DIGEST PICKS WHERE JOB SENIORITY CLEARLY ABOVE USER LEVEL ===",
);
const flags: any[] = [];
let totalPicks = 0;
let scoreDelta = 0;
for (const row of rows) {
  const u = userById.get(row.user_id);
  if (!u) continue;
  const input = userInputOf(u);
  const stage = EXPERIENCE_LEVEL_TO_STAGE[u.__level];
  const ceiling = CEIL_BY_STAGE[stage];
  row.job_ids.forEach((jid: string, i: number) => {
    const job = jobById.get(jid);
    if (!job) return;
    totalPicks++;
    const r = axisDump(input, job);
    scoreDelta += Math.abs((r.attainability_score ?? 0) - (row.scores[i] ?? 0));
    const tr = TRUE_RANK[job.req_seniority] ?? null;
    const senMatch = r.signals.seniority_match;
    if (tr !== null && tr > ceiling) {
      flags.push({
        email: row.to_email,
        level: u.__level,
        ceiling,
        job: job.title,
        reqSen: job.req_seniority,
        trueRank: tr,
        scorerSenAxisMatch: senMatch,
        storedScore: row.scores[i],
        recomputed: r.attainability_score,
        band: r.attainability_band,
        relevance: r.relevance_match,
        skillPct: r.signals.skill_match_pct,
        years_status: r.signals.years_status,
        matchConf: r.signals.match_confidence,
      });
    }
  });
}
console.log(
  `Total picks scored: ${totalPicks}; mean |recomputed - stored| = ${(scoreDelta / totalPicks).toFixed(4)} (validates snapshot == live)`,
);
console.log(
  `\nFlagged picks (job TRUE seniority rank > user ceiling): ${flags.length}\n`,
);
// group by whether the scorer actually penalized (above_ceiling) vs blind (unknown_value)
const blind = flags.filter((f) => f.scorerSenAxisMatch === "unknown_value");
const capped = flags.filter((f) => f.scorerSenAxisMatch === "above_ceiling");
const other = flags.filter(
  (f) => !["unknown_value", "above_ceiling"].includes(f.scorerSenAxisMatch),
);
console.log(
  `  scorer penalized (above_ceiling, axis=0.25 + band cap): ${capped.length}`,
);
console.log(
  `  scorer BLIND (unknown_value, axis=0.50 neutral, NO cap): ${blind.length}`,
);
console.log(`  other: ${other.length}`);
console.log("\n--- BLIND picks (the Lead_Manager/Director_Head/VP bug) ---");
for (const f of blind)
  console.log(
    `  ${f.email} [${f.level}] <- "${f.job}" reqSen=${f.reqSen} | score=${f.storedScore} band=${f.band} skill%=${f.skillPct} sen=BLIND`,
  );
console.log(
  "\n--- CAPPED picks (Senior roles, correctly penalized but still >=0.42) ---",
);
for (const f of capped)
  console.log(
    `  ${f.email} [${f.level}] <- "${f.job}" reqSen=${f.reqSen} | score=${f.storedScore} band=${f.band} skill%=${f.skillPct} years=${f.years_status}`,
  );

// ── Confidence-shrink effect on flagged picks: with vs without C1 ──
console.log(
  "\n=== CONFIDENCE-SHRINK EFFECT on the 45 flagged picks (with vs without C1) ===",
);
const noC1 = { ...DIGEST_SCORING_OPTS, confidenceAware: false };
let raised = 0,
  lowered = 0,
  raisedBelowHalf = 0;
for (const row of rows) {
  const u = userById.get(row.user_id);
  if (!u) continue;
  const input = userInputOf(u);
  const stage = EXPERIENCE_LEVEL_TO_STAGE[u.__level];
  const ceiling = CEIL_BY_STAGE[stage];
  row.job_ids.forEach((jid: string) => {
    const job = jobById.get(jid);
    if (!job) return;
    const tr = TRUE_RANK[job.req_seniority] ?? null;
    if (tr === null || tr <= ceiling) return;
    const withC1 = scoreJobFit(
      input,
      job,
      DIGEST_SCORING_OPTS,
    ).attainability_score;
    const without = scoreJobFit(input, job, noC1).attainability_score;
    if (withC1 > without) {
      raised++;
      if (without < 0.5) raisedBelowHalf++;
    } else if (withC1 < without) lowered++;
  });
}
console.log(
  `  of 45 flagged: C1 RAISED ${raised} (raw<0.5 → shrink masks under-qual: ${raisedBelowHalf}); LOWERED ${lowered}`,
);

// ── D2: 5 early-career users x 5 senior postings; reverse ──
console.log("\n\n=== D2: EMPIRICAL GRID ===");
const early = users.filter((u: any) => u.__level === "early_career");
const seniorPlus = users.filter((u: any) => u.__level !== "early_career");
console.log(
  `early_career users: ${early.length}; mid/senior users: ${seniorPlus.length}`,
);

// pick 5 senior postings (Senior + one Lead_Manager + one Director_Head to show both branches)
const seniorJobs = jobs.filter((j: any) =>
  ["Senior", "Lead_Manager", "Director_Head", "VP_Executive"].includes(
    j.req_seniority,
  ),
);
const juniorJobs = jobs.filter((j: any) =>
  ["Entry", "Entry_Mid"].includes(j.req_seniority),
);
function pick5Senior() {
  const s = seniorJobs
    .filter((j: any) => j.req_seniority === "Senior")
    .slice(0, 3);
  const lead = seniorJobs
    .filter((j: any) => j.req_seniority === "Lead_Manager")
    .slice(0, 1);
  const dir = seniorJobs
    .filter((j: any) => j.req_seniority === "Director_Head")
    .slice(0, 1);
  return [...s, ...lead, ...dir];
}
const senJobs5 = pick5Senior();
const early5 = early.slice(0, 5);
console.log(
  "\n-- EARLY-CAREER PROFILES x SENIOR POSTINGS (attainability | senAxisMatch | band | relevance) --",
);
console.log(
  "cols:",
  senJobs5
    .map((j: any) => `${(j.title || "").slice(0, 18)}[${j.req_seniority}]`)
    .join(" | "),
);
for (const u of early5) {
  const input = userInputOf(u);
  const cells = senJobs5.map((j: any) => {
    const r = scoreJobFit(input, j, DIGEST_SCORING_OPTS);
    return `${r.attainability_score}/${r.signals.seniority_match}/${r.attainability_band}`;
  });
  console.log(
    `  ${(u.full_name || u.user_id).slice(0, 16).padEnd(16)} [${u.__level}]: ${cells.join("  ")}`,
  );
}

console.log("\n-- REVERSE: MID/SENIOR PROFILES x JUNIOR POSTINGS --");
const jun5 = juniorJobs.slice(0, 5);
console.log(
  "cols:",
  jun5
    .map((j: any) => `${(j.title || "").slice(0, 18)}[${j.req_seniority}]`)
    .join(" | "),
);
// prefer senior_career users (floor=2 fires on Entry/Entry_Mid) then mid
const seniorCareer = users.filter((u: any) => u.__level === "senior_career");
const midCareer = users.filter((u: any) => u.__level === "mid_career");
const rev = [...seniorCareer.slice(0, 3), ...midCareer.slice(0, 2)];
if (rev.length === 0) console.log("  (no non-early real users in snapshot)");
for (const u of rev) {
  const input = userInputOf(u);
  const cells = jun5.map((j: any) => {
    const r = scoreJobFit(input, j, DIGEST_SCORING_OPTS);
    return `${r.attainability_score}/${r.signals.seniority_match}/${r.attainability_band}`;
  });
  console.log(
    `  ${(u.full_name || u.user_id).slice(0, 16).padEnd(16)} [${u.__level}]: ${cells.join("  ")}`,
  );
}

// dump the early5 + senJobs5 detail for the doc
console.log("\n-- detail: first early user vs each senior job full axes --");
if (early5[0]) {
  const input = userInputOf(early5[0]);
  console.log(
    `user=${early5[0].full_name} level=${early5[0].__level} domain=${early5[0].primary_domain} skills=${(early5[0].skills_canonical || []).length}`,
  );
  for (const j of senJobs5) {
    const r = scoreJobFit(input, j, DIGEST_SCORING_OPTS);
    console.log(
      `  "${j.title}" [${j.req_seniority}] core=${(j.req_skills_core || []).length} yrsMin=${j.req_years_min}`,
    );
    console.log(
      `     attain=${r.attainability_score} band=${r.attainability_band} rel=${r.relevance_match} | skill%=${r.signals.skill_match_pct} yearsStatus=${r.signals.years_status} senMatch=${r.signals.seniority_match} eduMatch=${r.signals.education_match} conf=${r.signals.match_confidence}`,
    );
  }
}

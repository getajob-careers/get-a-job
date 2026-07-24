// TEMP: 160-label band-movement eval for the SENIORITY_RANK vocab fix. Not committed.
import fs from "node:fs";
import { scoreJobFit } from "../src/lib/scoreJobFit.js";
import { SENIORITY_RANK } from "../supabase/functions/_shared/track-scoring-constants.ts";
import { DIGEST_SCORING_OPTS } from "../src/lib/selectDigestJobs.js";

const DIR = "/Users/elienglard/.claude/jobs/87f683c9/tmp";
const profs = JSON.parse(fs.readFileSync(`${DIR}/eval_profiles.json`, "utf8"));
const jobs = JSON.parse(fs.readFileSync(`${DIR}/eval_jobs.json`, "utf8"));
const labeled = JSON.parse(fs.readFileSync(`${DIR}/labeled.json`, "utf8")); // [pid,rank,job_id,band_pinned,band_md,label,title]

const profById = new Map(profs.map((p: any) => [p.user_id, p]));
const jobById = new Map(jobs.map((j: any) => [j.id, j]));
// harness reproduction: educations=[] and scoreJobFit called with NO opts (legacy).
// We also report the LIVE digest/feed opts (scoring_v2) as a second view.
const PROFILE_UID: Record<string, string> = {
  P01: "da2e36ea-a066-416a-85db-ca554a5e5f91",
  P02: "4ab9973c-862a-477d-970a-1de06e7dfbad",
  P03: "de7b9a5f-f0c9-4f89-9c81-910d28d4ff30",
  P04: "47681980-7b08-4d22-81e0-11a7a74a5a8c",
  P05: "9518637e-2cc5-47ee-b7b8-a2e956554860",
  P06: "24f64abc-ad93-463a-8822-73d37813a5a4",
  P07: "85cd78b7-dde1-404b-9098-66bccf9c1a87",
  P08: "1c2e0229-4a7d-488a-98f3-7c232e3d6b63",
  P09: "b90e86c3-73c4-46e8-b342-0dbdebbb8478",
  P10: "c9f9ea10-bdd4-4f43-876f-efb438acffa4",
  P11: "2f746d87-fbd2-4ea5-8a61-74348703d384",
  P12: "3ece3598-53f0-4826-b11e-856978530967",
  P13: "7d6a7d2a-b2c5-41ff-a4fe-7025e875706f",
  P14: "6a347a9f-f7bd-41bc-b784-833db5ca6c65",
  P15: "cb6c2a44-3768-4a11-9d0a-9a608e9e1f37",
  ELI: "4b243f3a-5035-474e-a89d-aff13fe06cc2",
};
const ADDED = { Lead_Manager: 4, Director_Head: 5, VP_Executive: 6 };

function bandFor(pid: string, jobId: string, opts: any) {
  const uid = PROFILE_UID[pid];
  const p = profById.get(uid);
  const job = jobById.get(jobId);
  if (!p || !job) return null;
  const input = {
    profile: {
      skills_canonical: p.skills_canonical ?? [],
      primary_domain: p.primary_domain ?? null,
      qualification_level: p.qualification_level ?? null,
    },
    experiences: p.experiences ?? [],
    educations: [], // harness passes empty educations
  };
  const r = scoreJobFit(input, job, opts);
  return {
    band: r.attainability_band,
    attain: r.attainability_score,
    sen: r.signals.seniority_match,
  };
}

function runPass(opts: any, label: string) {
  // BEFORE: strip the 3 added keys from the imported object (simulate pre-fix)
  for (const k of Object.keys(ADDED)) delete (SENIORITY_RANK as any)[k];
  const before = labeled.map((t: any) => bandFor(t.pid, t.job_id, opts));
  // AFTER: restore
  Object.assign(SENIORITY_RANK, ADDED);
  const after = labeled.map((t: any) => bandFor(t.pid, t.job_id, opts));

  console.log(`\n================ ${label} ================`);
  // fidelity: before-band should reproduce the pinned label band (legacy pass only)
  let fidMatch = 0,
    fidTot = 0;
  const moves: any[] = [];
  const byLabel: Record<
    string,
    { moved: number; total: number; downFromGoodEquivalent: number }
  > = {
    GOOD: { moved: 0, total: 0, downFromGoodEquivalent: 0 },
    STRETCH: { moved: 0, total: 0, downFromGoodEquivalent: 0 },
    BAD: { moved: 0, total: 0, downFromGoodEquivalent: 0 },
  };
  const rank: Record<string, number> = {
    strong: 3,
    good: 2,
    stretch: 1,
    reach: 0,
  };
  labeled.forEach((t: any, i: number) => {
    const b = before[i],
      a = after[i];
    if (!b || !a) return;
    byLabel[t.label].total++;
    fidTot++;
    if (b.band === t.band_md) fidMatch++;
    if (b.band !== a.band) {
      byLabel[t.label].moved++;
      if (rank[a.band] < rank[b.band])
        byLabel[t.label].downFromGoodEquivalent++;
      moves.push({
        pid: t.pid,
        label: t.label,
        title: t.title,
        before: `${b.band}(${b.attain})`,
        after: `${a.band}(${a.attain})`,
        sen: `${b.sen}->${a.sen}`,
      });
    }
  });
  console.log(
    `fidelity: before-band == pinned band for ${fidMatch}/${fidTot} tuples`,
  );
  console.log("band movement by label:", JSON.stringify(byLabel));
  console.log(`total tuples moved: ${moves.length}`);
  for (const m of moves)
    console.log(
      `  [${m.label}] ${m.pid} "${m.title}"  ${m.before} -> ${m.after}  (sen ${m.sen})`,
    );
}

runPass({}, "LEGACY opts (harness/label-faithful)");
runPass(DIGEST_SCORING_OPTS, "SCORING_V2 opts (live feed/digest)");

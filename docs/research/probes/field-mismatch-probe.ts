// TEMP measurement probe (field-mismatched experience audit). Not committed to a PR.
import fs from "node:fs";
import { scoreJobFit } from "../src/lib/scoreJobFit.js";
import {
  inferExperienceLevel,
  totalYearsOfExperience,
} from "../src/lib/experienceLevel.js";
import { DIGEST_SCORING_OPTS } from "../src/lib/selectDigestJobs.js";

const DIR = "/Users/elienglard/.claude/jobs/87f683c9/tmp";
const profs = JSON.parse(fs.readFileSync(`${DIR}/eval_profiles.json`, "utf8"));
const jobs = JSON.parse(fs.readFileSync(`${DIR}/crossfield_jobs.json`, "utf8"));
const profById = new Map(profs.map((p: any) => [p.user_id, p]));

// Business-domain profiles (the cross-field victims): marketing / finance / data / sales / ops.
const PICK = [
  ["P11", "2f746d87-fbd2-4ea5-8a61-74348703d384", "marketing (mid)"],
  ["P10", "c9f9ea10-bdd4-4f43-876f-efb438acffa4", "finance (senior)"],
  ["P01", "da2e36ea-a066-416a-85db-ca554a5e5f91", "data/ops (mid)"],
  ["P06", "24f64abc-ad93-463a-8822-73d37813a5a4", "business_ops (jr)"],
  ["P12", "3ece3598-53f0-4826-b11e-856978530967", "marketing (entry)"],
];
// one representative cross-field job per family (clearly a different profession)
function pickJob(re: RegExp, fam: string) {
  return jobs.find((j: any) => j.function_family === fam && re.test(j.title));
}
const CROSS = [
  pickJob(/Bookkeeper|Accountant/i, "Finance"),
  pickJob(/Tax Manager|Clinical/i, "Consulting"),
  pickJob(/Internal Auditor|Pharmacist/i, "Operations"),
  pickJob(/Legal Counsel|Lawyer/i, "Legal_Compliance"),
  pickJob(/Mechanical Engineer/i, "Engineering"),
].filter(Boolean);

function userInputOf(p: any) {
  return {
    profile: {
      skills_canonical: p.skills_canonical ?? [],
      primary_domain: p.primary_domain ?? null,
      qualification_level: p.qualification_level ?? null,
    },
    experiences: p.experiences ?? [],
    educations: [],
  };
}

console.log("cross-field jobs chosen:");
for (const j of CROSS)
  console.log(
    `  "${j.title}" [${j.function_family} / ${j.req_seniority} / ${j.req_years_min}y+] core=${(j.req_skills_core || []).length}`,
  );

console.log(
  "\n=== FIELD-MISMATCH GRID: relevance | yearsAxis | attain | band | feed-in? ===",
);
console.log(
  "(feed-in = relevance!=off AND attain>=0.42; yearsAxis is the RAW years-axis status/score)\n",
);
for (const [pid, uid, seg] of PICK) {
  const p = profById.get(uid);
  if (!p) {
    console.log(`  ${pid} MISSING`);
    continue;
  }
  const input = userInputOf(p);
  const yrs = totalYearsOfExperience(p.experiences ?? []);
  const lvl = inferExperienceLevel(p.experiences ?? [], []);
  console.log(
    `--- ${pid} ${seg} | domain=${p.primary_domain} | totalYears=${yrs} level=${lvl} ---`,
  );
  for (const j of CROSS) {
    const r = scoreJobFit(input, j, DIGEST_SCORING_OPTS);
    const feedIn = r.relevance_match !== "off" && r.attainability_score >= 0.42;
    const skillPct = r.signals.skill_match_pct;
    // ScoreRing UI "Experience" row = attainability; the years AXIS is signals.years_status
    console.log(
      `   "${j.title.slice(0, 26).padEnd(26)}" [${j.function_family.slice(0, 12).padEnd(12)}] rel=${r.relevance_match.padEnd(8)} yrsAxis=${r.signals.years_status.padEnd(11)}(u${r.signals.years_user}/req${r.signals.years_required_min}) attain=${r.attainability_score} band=${r.attainability_band.padEnd(7)} skill%=${skillPct} FEED-IN=${feedIn}`,
    );
  }
  console.log("");
}

// Focused: does an off-field role with MATCHING years show a high years axis? Enumerate.
console.log(
  "=== YEARS-AXIS FIELD-BLINDNESS: every (business profile x cross-field role) where user years>=req and role passes the gate ===",
);
let leak = 0,
  blindHighYears = 0;
for (const [pid, uid, seg] of PICK) {
  const p = profById.get(uid);
  if (!p) continue;
  const input = userInputOf(p);
  for (const j of jobs) {
    const r = scoreJobFit(input, j, DIGEST_SCORING_OPTS);
    const yearsMet =
      r.signals.years_status === "in_range" ||
      r.signals.years_status === "above_max";
    if (yearsMet) blindHighYears++;
    const feedIn = r.relevance_match !== "off" && r.attainability_score >= 0.42;
    if (feedIn && yearsMet) leak++;
  }
}
console.log(
  `across ${PICK.length} business profiles x ${jobs.length} cross-field roles = ${PICK.length * jobs.length} pairs:`,
);
console.log(
  `  pairs where years axis = met (in_range/above_max) DESPITE zero field-relevant years: ${blindHighYears}`,
);
console.log(
  `  of those, ALSO passing the feed gate (relevance!=off AND attain>=0.42) => visible cross-field leak: ${leak}`,
);

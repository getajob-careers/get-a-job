// C4 role-tier harness — measures the underleveled signal against the frozen 160
// human labels (docs/eval/match-eval-labels.md), doc-grounded and no PII, so it
// commits alongside the code. Run: node scripts/c4-harness.mjs
//
// Imports the REAL classifier from src/lib/roleTier.js — a harness that
// re-declares its own copy measures itself (the scoring-lane lesson). What it can
// and cannot answer, stated honestly:
//
//   CAN (from the doc alone): the C4-SPECIFIC question — does the tier signal
//   FIRE on the right rows? For every (profile target set, job title, human
//   label) it runs the classifier and reports the fire rate by label + the
//   GOOD-recall guardrail (a GOOD that C4 penalizes is a false demotion). This is
//   the discrimination that decides whether C4 helps at all.
//
//   CANNOT: the exact post-penalty attainability_score or final rank movement —
//   that needs the live join (skills_canonical, function_family, req_skills_core)
//   the earlier component harnesses pulled via MCP into PII scratch. Magnitude
//   tuning (penaltyPerStep) is a SEPARATE step on that live re-score; this proves
//   the signal points the right way before we spend a live run tuning it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  roleTierFromTitle,
  targetTierFromTitles,
  TIER_RANK,
} from "../src/lib/roleTier.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = readFileSync(
  join(here, "../docs/eval/match-eval-labels.md"),
  "utf8",
);

// Parse: each "## Pxx" section owns a "targets A / B / C" card line, then a
// markdown table whose rows carry | ... | title | ... | LABEL | ... |.
const rows = [];
let targets = null;
let profile = null;
let level = null;
for (const line of doc.split("\n")) {
  const pm = line.match(/^## (P\d+)/);
  if (pm) {
    profile = pm[1];
    targets = null;
    level = null;
    continue;
  }
  const cm = line.match(/targets (.+?) · \d+ skills/);
  if (cm) {
    targets = cm[1].split(" / ").map((s) => s.trim());
    continue;
  }
  const lm = line.match(/level=(\w+)/);
  if (lm) {
    level = lm[1];
    continue;
  }
  const parts = line.split("|").map((c) => c.trim());
  // A data row: | rank | fit% | band | title | company | matched | req | LABEL | notes |
  const label = parts[8];
  if (
    profile &&
    targets &&
    /^\d+$/.test(parts[1] || "") &&
    ["GOOD", "STRETCH", "BAD"].includes(label)
  ) {
    rows.push({ profile, targets, level, title: parts[4], label });
  }
}

if (rows.length !== 160)
  console.warn(`WARNING parsed ${rows.length} rows, expected 160`);

// Signed job-minus-target tier gap; null when either side abstains (no penalty).
function tierGap(r) {
  const target = targetTierFromTitles(r.targets);
  const role = roleTierFromTitle(r.title);
  if (!target || !role) return null;
  return TIER_RANK[role] - TIER_RANK[target];
}

const LABELS = ["GOOD", "STRETCH", "BAD"];
const total = Object.fromEntries(LABELS.map((l) => [l, 0]));
const fires = Object.fromEntries(LABELS.map((l) => [l, 0]));
const under = Object.fromEntries(LABELS.map((l) => [l, 0])); // gap < 0
const over = Object.fromEntries(LABELS.map((l) => [l, 0])); // gap > 0
const goodMisfires = [];

for (const r of rows) {
  total[r.label]++;
  const gap = tierGap(r);
  if (gap === null || gap === 0) continue;
  fires[r.label]++;
  if (gap < 0) under[r.label]++;
  else over[r.label]++;
  if (r.label === "GOOD")
    goodMisfires.push(`${r.profile} "${r.title}" gap=${gap}`);
}

const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(0)}%` : "—");
console.log(
  "\nC4 tier signal — fire rate by human label (fires = tier_gap ≠ 0)",
);
console.log("label     n   fires  fire%   underlev  overlev");
for (const l of LABELS)
  console.log(
    `${l.padEnd(8)} ${String(total[l]).padStart(2)}   ${String(fires[l]).padStart(3)}   ${pct(
      fires[l],
      total[l],
    ).padStart(
      5,
    )}   ${String(under[l]).padStart(6)}   ${String(over[l]).padStart(6)}`,
  );

const firesBad = fires.BAD + fires.STRETCH;
const firesAll = firesBad + fires.GOOD;
console.log(
  `\nprecision: of ${firesAll} rows C4 penalizes, ${firesBad} are BAD/STRETCH (${pct(
    firesBad,
    firesAll,
  )}) — the signal should concentrate on non-GOODs.`,
);
console.log(
  `GOOD-recall guardrail: ${fires.GOOD}/${total.GOOD} GOODs penalized (want ~0 — a penalized GOOD is a false demotion).`,
);
if (goodMisfires.length)
  console.log("  GOOD misfires:\n   " + goodMisfires.join("\n   "));

// EXPLORATORY (does not change shipped code) — the most promising narrowing for
// Eli to rule on: suppress the UNDER-leveled penalty (gap<0) for senior_career
// users. Rationale: "under-leveled" means the job is below where you are; a
// senior IC role is AT-level for a senior person even when their target set
// aspires to leadership. Over-leveled (gap>0) still fires. Reported as a
// before/after so the decision is data-driven, NOT tuned by eye.
{
  const t = Object.fromEntries(LABELS.map((l) => [l, 0]));
  const f = Object.fromEntries(LABELS.map((l) => [l, 0]));
  for (const r of rows) {
    t[r.label]++;
    const gap = tierGap(r);
    if (gap === null || gap === 0) continue;
    if (gap < 0 && r.level === "senior_career") continue; // the suppression
    f[r.label]++;
  }
  console.log(
    "\nEXPLORATORY narrowing — suppress under-leveled penalty for senior users:",
  );
  console.log(
    `  GOOD penalized ${f.GOOD}/${t.GOOD} (was ${fires.GOOD}/${total.GOOD}), ` +
      `STRETCH ${f.STRETCH}/${t.STRETCH}, BAD ${f.BAD}/${t.BAD}. ` +
      `P10's under-leveled catch must survive (P10 is mid, not senior).`,
  );
}

// Pinned reproduction: P10's under-leveled overrides must fire; the joint
// Play Perfect case (P09 Monetization Manager) is on-direction + under-leveled.
console.log("\nP10 rows (the finance under-leveled overrides):");
for (const r of rows.filter((r) => r.profile === "P10")) {
  const gap = tierGap(r);
  const tier = roleTierFromTitle(r.title);
  console.log(
    `  [${r.label.padEnd(7)}] ${(tier ?? "abstain").padEnd(8)} gap=${gap ?? "—"}  ${r.title}`,
  );
}

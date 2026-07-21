// Ring-vs-sort inversion measurement (Plan 1 follow-up).
//
// The unified jobs list sorts by fit_score; the card ring shows
// attainability_score. Where the two disagree, a lower-ranked card can show a
// HIGHER ring - a visible "inversion". This scores real scrubbed profiles
// against a corpus sample with the REAL scoreJobFit and reports:
//   - discordance: over all job pairs, how often sign(dfit) != sign(dattain)
//     (i.e. the ring contradicts the sort for two arbitrary jobs)
//   - visible adjacent inversions: sort by fit desc; adjacent pairs where the
//     lower card's ring is >= 5 pts higher (what the eye actually catches),
//     over the whole list and over the top-30 (what users see)
//
// Data comes from two Supabase-MCP result files (each {result:"...json..."}).
// Usage: deno run --allow-read --unstable-sloppy-imports \
//   scripts/ring-vs-sort-inversions.ts <profiles.txt> <corpus.txt>
import { scoreJobFit } from "../src/lib/scoreJobFit.js";

function loadRows(path: string): any[] {
  const outer = JSON.parse(Deno.readTextFileSync(path));
  const s: string = outer.result;
  const end = s.indexOf("</untrusted-data");
  const openStart = s.lastIndexOf("<untrusted-data", end);
  const start = s.indexOf(">", openStart) + 1;
  if (end < 0 || openStart < 0) throw new Error(`no data block in ${path}`);
  return JSON.parse(s.slice(start, end).trim());
}

const [profilesPath, corpusPath] = Deno.args;
const profiles: any[] = loadRows(profilesPath)[0].profiles;
const jobs: any[] = loadRows(corpusPath)[0].jobs;
const VISIBLE = 0.05; // 5 ring-points = a difference the eye catches
const TOPN = 30;

const per: any[] = [];
for (const p of profiles) {
  const profile = {
    skills_canonical: p.skills_canonical,
    qualification_level: p.qualification_level,
    primary_domain: p.primary_domain,
    work_type: p.work_type,
  };
  const experiences = p.experiences || [];
  const rows = jobs
    .map((j) => {
      const s = scoreJobFit({ profile, experiences, educations: [] }, j);
      return { fit: s.fit_score, attain: s.attainability_score };
    })
    .filter((r) => typeof r.fit === "number" && typeof r.attain === "number");
  if (rows.length < 10) continue;

  // Pairwise discordance (fit vs attain), excluding ties on either axis.
  // Sample random pairs when the list is large (all-pairs is O(n^2)).
  let disc = 0,
    conc = 0;
  const N = rows.length;
  const allPairs = (N * (N - 1)) / 2;
  const SAMPLE = 200_000;
  const pick = () => {
    let a = (Math.random() * N) | 0,
      b = (Math.random() * N) | 0;
    if (a === b) b = (b + 1) % N;
    return [rows[a], rows[b]];
  };
  const draws = allPairs <= SAMPLE ? null : SAMPLE;
  if (draws === null) {
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++) {
        const df = rows[i].fit - rows[j].fit,
          da = rows[i].attain - rows[j].attain;
        if (df === 0 || da === 0) continue;
        Math.sign(df) === Math.sign(da) ? conc++ : disc++;
      }
  } else {
    for (let k = 0; k < draws; k++) {
      const [x, y] = pick();
      const df = x.fit - y.fit,
        da = x.attain - y.attain;
      if (df === 0 || da === 0) continue;
      Math.sign(df) === Math.sign(da) ? conc++ : disc++;
    }
  }
  const discordance = disc / (disc + conc || 1);

  // Visible adjacent inversions in the fit-sorted list.
  const sorted = [...rows].sort((a, b) => b.fit - a.fit);
  const adjInv = (arr: any[]) => {
    let inv = 0;
    for (let k = 0; k < arr.length - 1; k++)
      if (arr[k + 1].attain - arr[k].attain >= VISIBLE) inv++;
    return arr.length > 1 ? inv / (arr.length - 1) : 0;
  };

  // Bucketed tie-break (transitive, well-defined): sort by (round(fit/eps) DESC,
  // attain DESC). Same-bucket jobs order by attainability; different buckets
  // never reorder. Measure residual visible inversions + max bucket size.
  const EPS = [0.005, 0.01, 0.02];
  const residual: Record<string, number> = {};
  const maxBucket: Record<string, number> = {};
  for (const e of EPS) {
    const bucketed = [...rows].sort(
      (a, b) =>
        Math.round(b.fit / e) - Math.round(a.fit / e) || b.attain - a.attain,
    );
    let inv = 0;
    for (let k = 0; k < bucketed.length - 1; k++)
      if (bucketed[k + 1].attain - bucketed[k].attain >= VISIBLE) inv++;
    residual[e] = bucketed.length > 1 ? inv / (bucketed.length - 1) : 0;
    const counts: Record<number, number> = {};
    let mx = 0;
    for (const r of rows) {
      const bk = Math.round(r.fit / e);
      counts[bk] = (counts[bk] || 0) + 1;
      if (counts[bk] > mx) mx = counts[bk];
    }
    maxBucket[e] = mx;
  }
  const adjPairs = 0,
    invPairs = 0;
  const within = {},
    fixed = {};

  // Fit-band structure: how many meaningful fit boundaries (gap > 0.005) and
  // the largest run of near-tied-fit jobs the tie-break would reorder.
  let bands = 1,
    run = 1,
    maxRun = 1;
  for (let k = 0; k < sorted.length - 1; k++) {
    if (Math.abs(sorted[k].fit - sorted[k + 1].fit) > 0.005) {
      bands++;
      run = 1;
    } else {
      run++;
      if (run > maxRun) maxRun = run;
    }
  }

  per.push({
    id: p.id.slice(0, 8),
    n: rows.length,
    discordance,
    adjAll: adjInv(sorted),
    adjTop: adjInv(sorted.slice(0, TOPN)),
    adjPairs,
    invPairs,
    within,
    fixed,
    EPS,
    residual,
    maxBucket,
    fitMin: sorted[sorted.length - 1].fit,
    fitMax: sorted[0].fit,
    bands,
    maxRun,
  });
}

const mean = (f: (x: any) => number) =>
  per.reduce((a, x) => a + f(x), 0) / (per.length || 1);
const pct = (x: number) => (x * 100).toFixed(1) + "%";

console.log(`profiles scored: ${per.length}, corpus sample: ${jobs.length}`);
console.log(`\nAGGREGATE (mean across profiles):`);
console.log(
  `  pairwise discordance (ring contradicts sort, any 2 jobs): ${pct(mean((x) => x.discordance))}`,
);
console.log(
  `  visible adjacent inversions, whole list: ${pct(mean((x) => x.adjAll))}`,
);
console.log(
  `  visible adjacent inversions, top ${TOPN}: ${pct(mean((x) => x.adjTop))}`,
);
const EPS = per[0]?.EPS || [];
console.log(
  `\nBUCKETED TIE-BREAK (round(fit/eps) then attain; mean across profiles):`,
);
for (const e of EPS) {
  console.log(
    `  eps=${e} (bucket ${(e * 100).toFixed(1)} fit-pts): residual visible inversions ${pct(mean((x) => x.residual[e]))}, largest bucket ${Math.round(mean((x) => x.maxBucket[e]))} jobs (max ${Math.max(...per.map((x) => x.maxBucket[e]))})`,
  );
}
console.log(`\nFIT-BAND STRUCTURE (mean across profiles):`);
console.log(
  `  fit range: ${mean((x) => x.fitMin).toFixed(3)} .. ${mean((x) => x.fitMax).toFixed(3)}`,
);
console.log(
  `  meaningful fit-bands (gap > 0.005): ${Math.round(mean((x) => x.bands))} of ${Math.round(mean((x) => x.n))} jobs`,
);
console.log(
  `  largest near-tied-fit run the tie-break reorders: ${Math.round(mean((x) => x.maxRun))} jobs (mean), max ${Math.max(...per.map((x) => x.maxRun))}`,
);
const sortedDisc = per.map((x) => x.discordance).sort((a, b) => a - b);
console.log(
  `  discordance spread: min ${pct(sortedDisc[0])} / median ${pct(sortedDisc[Math.floor(sortedDisc.length / 2)])} / max ${pct(sortedDisc[sortedDisc.length - 1])}`,
);

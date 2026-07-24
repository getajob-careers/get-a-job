// S4 correctness gate: the chunked idle-time scorer MUST produce byte-identical
// scores and an identical ranking to the old synchronous `corpus.map` - for any
// first-batch / chunk size. If this drifts, the Search-tab jobs would silently
// re-order. See src/lib/chunkedScore.js.

import { describe, it, expect, vi } from "vitest";
import { scoreCorpus, runChunkedScoring, scoreOne } from "../lib/chunkedScore";
import { scoreJobFit } from "../lib/scoreJobFit";
import { applyFacetsAndRank, FIT_TIE_EPS } from "../lib/jobsSearchFacets";

// A profile with a handful of canonical skills so overlap varies across jobs.
const profile = {
  skills_canonical: ["python", "sql", "excel", "figma", "react"],
  goal_type: null,
};
const experiences = [
  { start_date: "2022-01-01", end_date: "2023-06-01", title: "Analyst" },
];
const educations = [{ degree: "BA", field: "Economics" }];
const input = { profile, experiences, educations };

// Build a varied corpus: skill overlap, seniority, years, family, and
// extraction_confidence all differ so fit_scores spread out and the ranking is
// non-trivial (ties included, to exercise the tie-break path).
const FAMILIES = ["Engineering", "Data", "Product", "Design_UX", "Marketing"];
const SENIORITIES = ["entry", "mid", "senior"];
const SKILL_POOL = [
  "python",
  "sql",
  "excel",
  "figma",
  "react",
  "java",
  "aws",
  "tableau",
  "photoshop",
  "node",
];
function makeCorpus(n) {
  const jobs = [];
  for (let i = 0; i < n; i++) {
    const coreCount = 1 + (i % 4);
    const req_skills_core = SKILL_POOL.slice(i % 6, (i % 6) + coreCount);
    jobs.push({
      id: `job-${i}`,
      title: `Role ${i}`,
      company_name: `Co ${i % 7}`,
      seniority: SENIORITIES[i % SENIORITIES.length],
      req_seniority: SENIORITIES[(i + 1) % SENIORITIES.length],
      function_family: FAMILIES[i % FAMILIES.length],
      req_skills_core,
      req_skills_nice: SKILL_POOL.slice((i + 3) % 8, ((i + 3) % 8) + 2),
      req_years_min: i % 5,
      req_years_max: (i % 5) + 3,
      req_education_levels: ["bachelors"],
      is_remote: i % 2 === 0,
      date_posted: `2026-07-${String((i % 27) + 1).padStart(2, "0")}`,
      extraction_confidence: i % 3 === 0 ? 0.3 : 0.8, // exercise the <0.4 softener
    });
  }
  return jobs;
}

const OPTS_VARIANTS = [
  { label: "flag-off (empty opts)", opts: {} },
  {
    label: "flag-on (confidence + mustHave + directionBlend)",
    opts: { confidenceAware: true, mustHave: true, directionBlend: true },
  },
];

// Run the driver to completion with a synchronous scheduler and return the
// final scored array (the last onProgress payload).
function runToCompletion(corpus, opts, chunkOpts) {
  let final = [];
  let doneSeen = false;
  const progressLengths = [];
  runChunkedScoring(input, corpus, opts, {
    ...chunkOpts,
    schedule: (cb) => cb(), // synchronous: recurse straight through every slice
    onProgress: (arr, done) => {
      progressLengths.push(arr.length);
      final = arr;
      if (done) doneSeen = true;
    },
  });
  return { final, doneSeen, progressLengths };
}

describe("scoreOne / scoreCorpus reference", () => {
  it("scoreOne matches a direct scoreJobFit call (no drift in the shared path)", () => {
    const corpus = makeCorpus(3);
    for (const opts of OPTS_VARIANTS.map((v) => v.opts)) {
      corpus.forEach((job) => {
        expect(scoreOne(input, job, opts)).toEqual({
          job,
          score: scoreJobFit(input, job, opts),
        });
      });
    }
  });

  it("scoreCorpus equals corpus.map(scoreJobFit)", () => {
    const corpus = makeCorpus(20);
    for (const opts of OPTS_VARIANTS.map((v) => v.opts)) {
      const reference = corpus.map((job) => ({
        job,
        score: scoreJobFit(input, job, opts),
      }));
      expect(scoreCorpus(input, corpus, opts)).toEqual(reference);
    }
  });
});

describe("runChunkedScoring - identical output to the synchronous map", () => {
  const corpus = makeCorpus(53); // not a multiple of any chunk size below
  // Edge-case chunkings: tiny first batch, chunkSize 1, firstBatch beyond the
  // corpus (all sync), and the production defaults.
  const CHUNKINGS = [
    { firstBatch: 1, chunkSize: 1 },
    { firstBatch: 2, chunkSize: 7 },
    { firstBatch: 10, chunkSize: 25 },
    { firstBatch: 120, chunkSize: 200 }, // prod defaults => all sync here
    {}, // defaults
  ];

  for (const { label, opts } of OPTS_VARIANTS) {
    describe(label, () => {
      const reference = scoreCorpus(input, corpus, opts);

      for (const chunking of CHUNKINGS) {
        const name = JSON.stringify(chunking);
        it(`final scored array is byte-identical (${name})`, () => {
          const { final, doneSeen } = runToCompletion(corpus, opts, chunking);
          expect(doneSeen).toBe(true);
          expect(final).toEqual(reference);
        });

        it(`ranking is identical - no facets (${name})`, () => {
          const { final } = runToCompletion(corpus, opts, chunking);
          const facets = { keyword: "", track: null, family: "", location: "" };
          expect(applyFacetsAndRank(final, facets)).toEqual(
            applyFacetsAndRank(reference, facets),
          );
        });

        it(`ranking is identical - with facets + tie-break eps (${name})`, () => {
          const { final } = runToCompletion(corpus, opts, chunking);
          const facets = {
            keyword: "Role",
            seniorities: ["entry", "mid"],
            workTypes: ["remote"],
            track: null,
            family: "Engineering",
            location: "",
          };
          const rankOpts = { tieBreakEps: FIT_TIE_EPS };
          expect(applyFacetsAndRank(final, facets, rankOpts)).toEqual(
            applyFacetsAndRank(reference, facets, rankOpts),
          );
        });
      }
    });
  }
});

describe("runChunkedScoring - progress + lifecycle", () => {
  it("emits monotonically growing arrays and exactly one done=true at the end", () => {
    const corpus = makeCorpus(30);
    const events = [];
    runChunkedScoring(
      input,
      corpus,
      {},
      {
        firstBatch: 5,
        chunkSize: 8,
        schedule: (cb) => cb(),
        onProgress: (arr, done) => events.push({ len: arr.length, done }),
      },
    );
    // First batch (5), then +8,+8,+8, then +1 => 5,13,21,29,30.
    expect(events.map((e) => e.len)).toEqual([5, 13, 21, 29, 30]);
    // Non-decreasing.
    for (let i = 1; i < events.length; i++) {
      expect(events[i].len).toBeGreaterThanOrEqual(events[i - 1].len);
    }
    // done=true only on the last event.
    expect(events.filter((e) => e.done)).toEqual([{ len: 30, done: true }]);
  });

  it("empty / null corpus emits a single empty done event", () => {
    const empty = vi.fn();
    runChunkedScoring(
      input,
      [],
      {},
      { schedule: (cb) => cb(), onProgress: empty },
    );
    expect(empty).toHaveBeenCalledTimes(1);
    expect(empty).toHaveBeenCalledWith([], true);

    const nullc = vi.fn();
    runChunkedScoring(
      input,
      null,
      {},
      { schedule: (cb) => cb(), onProgress: nullc },
    );
    expect(nullc).toHaveBeenCalledWith([], true);
  });

  it("stops scheduling once isCancelled() flips (no work after teardown)", () => {
    const corpus = makeCorpus(100);
    let cancelled = false;
    const seen = [];
    // A scheduler that cancels right after the first slice is queued: the
    // queued slice runs, sees cancelled, and must NOT reschedule.
    const schedule = (cb) => {
      cancelled = true;
      cb();
    };
    runChunkedScoring(
      input,
      corpus,
      {},
      {
        firstBatch: 10,
        chunkSize: 10,
        schedule,
        isCancelled: () => cancelled,
        onProgress: (arr) => seen.push(arr.length),
      },
    );
    // First batch (10, sync, before any schedule) then one cancelled slice that
    // returns immediately => the last emitted length stays at the first batch.
    expect(seen[0]).toBe(10);
    expect(seen[seen.length - 1]).toBe(10);
  });
});

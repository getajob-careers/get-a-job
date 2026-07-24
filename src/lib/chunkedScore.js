import { useEffect, useState } from "react";
import { scoreJobFit } from "@/lib/scoreJobFit";

// Chunked, idle-time corpus scoring (prelaunch-audit S4). The Search surface
// scores the WHOLE active-IL corpus (~4,000 rows) against the profile. Done as
// one synchronous `corpus.map(scoreJobFit)` that freezes the main thread for
// ~0.5-1s on first paint AND every profile change. This module keeps the first
// page synchronous (instant results) and streams the rest across
// requestIdleCallback slices, so no single main-thread task is long.
//
// CORRECTNESS INVARIANT: the chunked output is byte-identical to the old
// synchronous map - same order, same score objects - for ANY first-batch /
// chunk size. scoreOne is the single per-job definition both paths share so
// they can never drift; chunkedScore.test.js pins the invariant + that the
// downstream ranking is identical.

// Score one job. THE shared definition - the synchronous reference and the
// chunked hook both go through this, which is what guarantees identical scores.
export function scoreOne(input, job, opts) {
  return { job, score: scoreJobFit(input, job, opts) };
}

// Synchronous reference: identical to the pre-chunking JobsSearchTab useMemo
// body. The oracle the correctness test compares the chunked output against.
export function scoreCorpus(input, corpus, opts) {
  return (Array.isArray(corpus) ? corpus : []).map((job) =>
    scoreOne(input, job, opts),
  );
}

// Pure driver. Scores `corpus` in a synchronous first batch (so the first page
// of results paints without waiting) then the remainder in `chunkSize` slices,
// each handed to the injected `schedule` (requestIdleCallback in the app, a
// synchronous stub in tests). onProgress(scoredSoFar, done) fires after the
// first batch and after every slice; isCancelled() lets the caller abort so no
// slice runs after teardown / a corpus change.
//
// The final scoredSoFar === scoreCorpus(input, corpus, opts) for any
// firstBatch/chunkSize (the invariant above).
/**
 * @param {any} input
 * @param {any[]} corpus
 * @param {any} opts
 * @param {{
 *   firstBatch?: number,
 *   chunkSize?: number,
 *   schedule?: (cb: () => void) => void,
 *   onProgress?: (scored: any[], done: boolean) => void,
 *   isCancelled?: () => boolean,
 * }} [options]
 */
export function runChunkedScoring(
  input,
  corpus,
  opts,
  {
    firstBatch = 120,
    chunkSize = 400,
    schedule,
    onProgress,
    isCancelled = () => false,
  } = {},
) {
  if (!Array.isArray(corpus) || corpus.length === 0 || !input) {
    onProgress?.([], true);
    return;
  }
  const acc = [];
  const firstEnd = Math.min(firstBatch, corpus.length);
  for (let k = 0; k < firstEnd; k++) acc.push(scoreOne(input, corpus[k], opts));
  if (firstEnd >= corpus.length) {
    onProgress?.(acc.slice(), true);
    return;
  }
  onProgress?.(acc.slice(), false);
  let i = firstEnd;
  const step = () => {
    if (isCancelled()) return;
    const end = Math.min(i + chunkSize, corpus.length);
    for (; i < end; i++) acc.push(scoreOne(input, corpus[i], opts));
    const done = i >= corpus.length;
    onProgress?.(acc.slice(), done);
    if (!done) schedule(step);
  };
  schedule(step);
}

// requestIdleCallback with a Safari / JSDOM fallback (Safari ships neither rIC
// nor cIC). The fallback runs on a macrotask so slices still yield to paint and
// input between them. The `timeout` guarantees scoring finishes even if the tab
// never goes idle (e.g. continuous animation), without blocking interaction.
const scheduleIdle =
  typeof requestIdleCallback === "function"
    ? (cb) => requestIdleCallback(cb, { timeout: 250 })
    : (cb) => setTimeout(cb, 0);

// Drop-in replacement for the old `scored` useMemo. Returns the growing scored
// array; the ranking memo downstream refines as slices land (the same
// progressive refine the two-stage corpus load already produced, now
// non-blocking and finer-grained). Empty until profile + corpus both exist.
//
// Depends on the STABLE parts of `input`/`opts` (the react-query data refs are
// structurally shared, so they're stable once loaded; opts are primitive
// flags) rather than the freshly-built `input`/`opts` objects - otherwise the
// effect would restart scoring on every parent render.
export function useChunkedScored(input, corpus, opts) {
  const [scored, setScored] = useState([]);
  const profile = input?.profile ?? null;
  const experiences = input?.experiences ?? null;
  const educations = input?.educations ?? null;
  const { confidenceAware, mustHave, directionBlend } = opts || {};
  useEffect(() => {
    // No corpus yet: settle to empty, but WITHOUT handing back a fresh [] -
    // that would re-fire this effect through the `corpus` dep (the query's
    // `= []` loading defaults are already a new ref each render) and spin a
    // render loop. The functional bail keeps the same ref when already empty.
    if (!input || !Array.isArray(corpus) || corpus.length === 0) {
      setScored((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    let cancelled = false;
    // Coalesce publishes to the old scored useMemo's render cadence: paint the
    // first (synchronous) batch on the INITIAL scoring only, accumulate the
    // rest silently, and publish once more when scoring finishes. Publishing
    // every slice re-commits the whole SVG-ring card grid ~15x (each an
    // expensive render that also starves the next idle slice, stretching
    // completion to ~15s). Publishing the first batch only when `scored` is
    // still empty keeps the count monotonic (120 -> full) across the corpus's
    // two-stage load instead of dipping full -> 120 -> full.
    let firstPublished = false;
    runChunkedScoring(input, corpus, opts, {
      schedule: scheduleIdle,
      isCancelled: () => cancelled,
      onProgress: (arr, done) => {
        if (cancelled) return;
        if (done) {
          setScored(arr);
          return;
        }
        if (!firstPublished) {
          firstPublished = true;
          setScored((prev) => (prev.length === 0 ? arr : prev));
        }
      },
    });
    return () => {
      cancelled = true;
    };
    // Deps are the STABLE sub-parts of input/opts, not the freshly-built
    // input/opts objects (see the note above the hook) - intentional.
  }, [
    corpus,
    profile,
    experiences,
    educations,
    confidenceAware,
    mustHave,
    directionBlend,
  ]);
  return scored;
}

// Per-ATS failure-rate computation for the nightly refresh-jobs run.
//
// Today the orchestrator only fails the GHA run if >20% of ALL companies
// (`FAILURE_THRESHOLD_PCT` in refresh-jobs.ts) errored. That's the right
// backstop for "everything is on fire," but it hides the most common
// fault class: a single ATS family going dark while the rest of the
// corpus carries the global rate. Example: Greenhouse breaks at 4am — 199
// of 891 companies all 5xx — and the run still passes the 20% gate
// because 692 non-Greenhouse fetches stayed green. We notice when a
// student opens a tracker tab the next morning.
//
// This helper does the per-ATS grouping the orchestrator needs to make
// a tighter call: "is any one ATS over its per-family threshold?" The
// caller picks the threshold (PR-N1's spec was 50% per ATS) and keeps
// the global >20% as outer backstop.
//
// Pure: no I/O, no state. Same `{ ats, status }` shape the orchestrator
// already builds — see CompanyResult in scripts/refresh-jobs.ts.

export interface CompanyResultLike {
  ats: string;
  status: "ok" | "fetch_error" | "upsert_error" | "no_slug";
}

export interface AtsBreakdown {
  ats: string;
  total: number; // total companies attempted for this ATS
  successful: number; // status === 'ok'
  failed: number; // status in {'fetch_error', 'upsert_error'}
  skipped: number; // status === 'no_slug' — neither success nor failure
  failurePct: number; // failed / total * 100, 0 when total === 0
}

/**
 * Group results by `ats` and compute a per-family failure rate. The
 * percentages match the orchestrator's existing global formula:
 *   failurePct = failed / total * 100
 * where `failed` counts fetch_error + upsert_error only (no_slug is a
 * "we couldn't try" state, same as the global counter — neither bucket).
 *
 * Returns sorted by failurePct descending so the worst offender is
 * always at index 0. ATSs with no companies in the input list are
 * omitted from the result (would be percent NaN otherwise).
 */
export function computePerAtsBreakdown(
  results: CompanyResultLike[],
): AtsBreakdown[] {
  const groups = new Map<string, AtsBreakdown>();
  for (const r of results) {
    let g = groups.get(r.ats);
    if (!g) {
      g = {
        ats: r.ats,
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        failurePct: 0,
      };
      groups.set(r.ats, g);
    }
    g.total++;
    if (r.status === "ok") g.successful++;
    else if (r.status === "fetch_error" || r.status === "upsert_error")
      g.failed++;
    else if (r.status === "no_slug") g.skipped++;
  }
  for (const g of groups.values()) {
    g.failurePct = g.total > 0 ? (g.failed / g.total) * 100 : 0;
  }
  return Array.from(groups.values()).sort(
    (a, b) => b.failurePct - a.failurePct,
  );
}

/**
 * Which ATSs broke their per-family budget? Returns the breakdown rows
 * whose `failurePct > thresholdPct` AND whose sample is large enough
 * (`total >= minSample`) for that percentage to be a meaningful signal.
 * The orchestrator uses this to decide whether to exit 1 even when the
 * global rate is fine.
 *
 * Why minSample: a percentage needs a denominator big enough to mean
 * something. A single-company family (e.g. `iai`, `amazon_jobs`,
 * `pwc_heroku`) hits "100% failed" on ONE transient error — that's noise,
 * not a family going dark, but pre-this-guard it tripped exit 1 every
 * night and (via the workflow's `if: success()` gate) silently skipped
 * the entire extraction stage for every newly-ingested job. The 50%
 * percentage gate only earns its exit-1 above `minSample` companies; the
 * caller still PRINTS every family's health unconditionally, so a small
 * family's failure stays visible in the run log — it just doesn't nuke
 * the run. Sub-minSample families remain covered by the global backstop.
 *
 * Edge case: an ATS with zero total companies (impossible from
 * computePerAtsBreakdown today but kept defensive) never trips — there's
 * no signal to interpret as failure. minSample defaults to 1 to preserve
 * the original behavior for callers that don't opt into the guard.
 */
export function selectOverThreshold(
  breakdown: AtsBreakdown[],
  thresholdPct: number,
  minSample = 1,
): AtsBreakdown[] {
  return breakdown.filter(
    (b) => b.total >= minSample && b.total > 0 && b.failurePct > thresholdPct,
  );
}

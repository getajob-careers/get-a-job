# Lever 6 — Continuous Sourcing as a Standing Mechanism

**Directive (Eli):** "we keep looking for more companies to add, permanently."
**Framing (honest, per 2026-06-14 exhaustion finding):** this is a **steady trickle that keeps
the corpus from decaying**, NOT a step-change. Free legal sourcing is measured-exhausted for
the IL business-into-tech audience; the value here is _maintenance_ — catching new tenants and
ATS migrations before they silently rot the feed.

INVESTIGATE-ONLY proposal. No code was written/run beyond read-only inspection.

---

## 0. Ground truth — how a company enters the feed today

- **Registry is hand-maintained JSON**, not generated.
  VERIFIED: `companies_il.json` header `"generated_at": "2026-06-14"`, `total_companies: 1162`;
  the string is a stamp, no generator script writes it. Company record shape (VERIFIED, entry 0):
  `{name, type, industry, domain, careers_url, ats, slug, api_url, verified, notes}`.
- **Promotion gate = one filter line.** VERIFIED `scripts/refresh-jobs.ts:483`:
  `(c) => c.verified && c.api_url && ENABLED_ATSS.has(c.ats)`.
  A discovered company only enters the nightly fetch loop once a human sets **`verified: true`**,
  fills **`api_url`**, and its **`ats`** is in the supported set.
- **Supported ATSes (ENABLED_ATSS, VERIFIED `refresh-jobs.ts:87-103`):** greenhouse, lever, ashby,
  workday, smartrecruiters, comeet, successfactors, workable, iai, adamtotal, adamtotal_agency,
  pwc_heroku, amazon_jobs, bezeq_native, hot_native.
- **Current processable pool (VERIFIED, live registry count):** 854 companies are
  `verified && api_url`; 241 rows sit at `ats:"unknown"` (careers_url only, NOT fetched).
- **Cheapest possible win** = a company **already on a supported multi-tenant rail**
  (greenhouse/lever/ashby/comeet) that just needs its `slug` (+ `api_url`, `verified`) added.
  Zero new adapter code — the fetcher already exists.

## 0b. Discovery tooling that ALREADY EXISTS (read-only inventory, VERIFIED `ls scripts/`)

| Script                                               | What it does                                                                                                              | Measured yield (VERIFIED from draft files / lessons)                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `discover-ats-companies.ts`                          | Regex careers-page HTML for GH/Lever/Ashby/Workable slugs, validates via ATS API + IL count. Emits draft, no auto-mutate. | Predecessor brute-force: 3 hits / 260 / **0 IL jobs**.                                                                            |
| `discover-comeet.ts`                                 | Parses `COMEET.init({UID,token})` off careers page (token not derivable from URL).                                        | (Comeet enum vector closed 06-14: endpoints 404.)                                                                                 |
| `discover-workday.ts`                                | Resolves `{tenant,wdN,site}` triple, POSTs CXS jobs, counts IL via `searchText=Israel`.                                   | Used for MNC pass; big-tech-on-Workday premise mostly stale (06-12).                                                              |
| `discover-r1.ts`                                     | Static-HTML crawl of traditional-economy seeds.                                                                           | **1/162 = 0.6%** (VERIFIED draft `by_verdict`: 1 ats_detected(workday), 46 nothing, 20 blocked, 95 nav_failed).                   |
| `discover-tech-xhr.ts`                               | Playwright + networkidle + XHR capture (B-pass) on tech seeds.                                                            | **3/86 = 3.5%** (VERIFIED draft `by_verdict`: 3 xhr_ats_detected [2 greenhouse, 1 comeet], 50 no_ats, 21 blocked, 12 nav_failed). |
| `discover-niloosoft-slugs.ts`, `discover-techmap.ts` | Vendor-list / techmap passes.                                                                                             | Niloosoft logo-wall → ~0 live (06-12); thin.                                                                                      |

**Union finding (2026-06-14, cite):** static A-pass and XHR B-pass catch **DISJOINT** subsets
(zero overlap on the 86-seed tech run) → union both = ~6 unique companies, ~28 net-new IL jobs.
Either pass alone undercounts tech detection by ~half. **Any tech crawl must run BOTH passes.**

---

## (a) DISCOVERY INPUTS — recurring signals, cheapest-first

Ranked by yield-per-effort. Each carries its evidence or the lesson that already bounds it.

**INPUT 1 — New-tenant enumeration on multi-tenant ATS public APIs (cheapest win).**
A company already on greenhouse/lever/ashby/comeet only needs its slug added — no new adapter.
The recurring signal: re-run `discover-tech-xhr.ts` + `discover-ats-companies.ts` (BOTH passes)
against a **refreshed tech-seed list** (see Input 2). INFERRED viable-but-thin: the 06-14 both-pass
returned 6 companies / 86 seeds = ~7% union on a _curated tech_ population, vs 0.6% on traditional
economy. This is the ONLY input with a non-trivial hit rate, and it's still single-digit companies
per crawl. NOT a re-run of a dead vector _iff_ fed NEW seeds — a re-crawl of the same 86 is dead.

**INPUT 2 — Fresh tech-seed lists (the fuel for Input 1).** Recurring public IL-tech company lists:

- **Calcalist / CTech annual company lists, TechAviv "Israeli unicorns" roster** — named in the
  06-14 maintenance-mode lesson as the intended seed refresh. INFERRED viable as a _seed source_
  (feeds Input 1's crawl); NOT independently verified this run — must be corpus-fit-checked
  (sample 20-50, target ≥30% audience-relevant) before scaling, per the standing 06-14 bar.
- **New-funding-round signals** — IL rounds announced on CTech / Calcalist / Finder.startupnationcentral.
  A freshly-funded startup is _disproportionately likely_ to (i) be hiring and (ii) sit on a modern
  supported rail (greenhouse/ashby/comeet). This is the single best _forward-looking_ seed: funding
  precedes the hiring wave. INFERRED, not verified — gate behind the same corpus-fit spot-check.

**INPUT 3 — ATS-migration re-checks on companies ALREADY in the registry (decay defense).**
Not new companies — existing ones that moved rails or went dark. VERIFIED this is the live decay
problem: NVIDIA (443 inactive) + PANW (187 inactive) went dark 2 nights running on Workday and did
NOT self-heal (anchors.md). A standing re-probe of the current `verified` set's `api_url` for
non-200 / zero-IL over N nights catches migrations (eBay→Phenom, 06-12) and outages the nightly
staleness sweep alone misses. Highest-value input for _protecting_ the 5,510 active rows.

**INPUT 4 — Per-publisher JSON endpoints (Bezeq-style), opportunistic.** When a specific high-value
IL company surfaces with a bespoke careers JSON API discoverable from its own JS (Bezeq = proven
example, `bezeq_native` is in ENABLED_ATSS). REPORTED viable but **not enumerable** — this is
per-company detective work, not a cron. Fires only when a named high-value target is flagged.

**EXPLICITLY EXCLUDED (do NOT propose):**

- Aggregator scraping (AllJobs.co.il / Drushim.co.il) — HELD pending legal (Amendment 13 + ToS).
  Business-development/legal track, not an engineering cron. (anchors.md + 06-14.)
- New multi-tenant ATS investigations without independent evidence of **4+ IL tenants with current
  postings** — closed by precedent (Teamtailor, iCIMS, Hunter HRMS/Niloosoft, Umbraco all thin; 06-23).
- Traditional-economy business-importance lists (Dun's-100/BDI) — 0.6% hit, below the 3% floor (06-12).
- Comeet customer enumeration, gov/taasuka feeds, university portals — probed to exhaustion (06-14).

---

## (b) CADENCE — grounded, conservative

| Input                                            | Cadence                                                 | Rationale (INFERRED conservatively)                                                                                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1+2 New-tenant crawl on fresh tech/funding seeds | **Quarterly** (funding-signal variant monthly if cheap) | IL tech company formation + Series-A cadence is slow relative to crawl cost; a monthly re-crawl of near-identical seeds mostly re-probes known-negatives. Funding announcements are the one sub-quarterly signal worth a lighter monthly pass. |
| 3 ATS-migration / dark-tenant re-check           | **Weekly** (piggyback the nightly)                      | Cheap (re-probes existing `api_url`s already fetched nightly); decay is the live problem (NVIDIA/PANW). A weekly "which verified tenants returned 0 IL / non-200 for ≥3 nights" digest is near-free.                                           |
| 4 Per-publisher endpoint hunt                    | **On-demand only**                                      | Not schedulable; fires when a named high-value target is raised.                                                                                                                                                                               |
| Calcalist/TechAviv annual roster refresh         | **Annual** (when the list drops)                        | These are yearly publications; re-running before the new list exists is a no-op.                                                                                                                                                               |

## (c) RECURRING COST — honest

- **Input 1+2 crawl (per quarterly run):** ~86-900 careers-page fetches + Playwright XHR at
  concurrency 2 → VERIFIED wall-time ~20-25 min/run for the 86-seed tech-xhr; static pass ~1-2 min.
  Compute: a laptop / CI runner, no paid API. **Human promotion: ~5-15 min** to review a draft of
  single-digit hits and hand-edit `verified/slug/api_url` into the registry.
  **Expected yield: single-digit companies, ~10-40 net-new IL jobs per quarterly run** (INFERRED
  from the 06-14 union: 6 companies / ~28 jobs on one tech population).
- **Input 3 weekly re-check:** near-zero compute (reuses nightly fetch results); a grouping query +
  digest. **Human: ~5 min/week** to eyeball the dark-tenant list and decide re-probe vs. deprecate.
  Yield is _protective_ — recovers hundreds of rows when it catches a migration (NVIDIA+PANW = 630
  dark rows, VERIFIED anchors.md), zero when nothing migrated.
- **Total standing human load: well under 1 hr/week.** The mechanism is cheap; the honest ceiling
  on NEW volume is low. Its real ROI is **corpus non-decay**, not growth.

---

## (d) AUTOMATION vs MANUAL split

**AUTOMATE (cron / script, no judgment):**

- The crawl itself (both passes) → emits a **draft file** (existing pattern; scripts already
  `writeFileSync` a `*-draft.json`, never mutate the registry). VERIFIED: every discover-* script
  header states "does not mutate companies_il.json."
- IL-job validation + count per candidate (already in each script).
- Input 3 dark-tenant digest: a scheduled query over nightly results = `verified` companies with
  0 IL jobs or non-200 for ≥3 consecutive nights → post to a channel / file. Pure automation.
- Corpus-fit pre-filter: auto-classify a seed sample and REFUSE to promote a source scoring <30%
  audience-relevant (the 06-14 bar, mechanized as a gate).

**MANUAL (human judgment — Eli is the registry approval gate, per CLAUDE.md):**

- **Registry promotion.** Reading the draft and writing `verified:true` + `slug` + `api_url` into
  `companies_il.json` stays human. Rationale: the promotion gate is the one place a bad slug/token
  poisons the nightly fetch; per CLAUDE.md "never auto-mutate canonical source-of-truth files —
  emit to drafts, require human promotion." Data-row changes merge on Eli's review + live-validation
  evidence + clean schema-validator run.
- **ATS-migration disposition.** When Input 3 flags a dark tenant: decide _re-probe the same rail_
  (transient outage) vs _hunt the new rail_ (migration, e.g. eBay→Phenom) vs _deprecate_. Requires
  per-tenant live probing (never trust a vendor logo wall — the whole vendor-list lesson series).
- **New multi-tenant ATS go/no-go** — only past the 4+-live-IL-tenant bar, Eli's call.

---

## Honest bottom line (the claim, with its evidence)

- **Mechanism:** a standing quarterly both-pass tech/funding crawl (auto → draft → human promote)
  - a weekly automated dark-tenant/migration digest, both feeding Eli's manual registry gate.
- **Expected NEW yield: single-digit companies / ~10-40 IL jobs per quarterly crawl** — INFERRED
  from the only VERIFIED comparable run (06-14 union: 6 companies, ~28 jobs). This is a **trickle**.
- **Real value is decay-defense** (VERIFIED live: NVIDIA+PANW = 630 dark rows the nightly sweep
  didn't recover), not growth. Step-change volume lives in the legal/partnership track
  (AllJobs/Drushim), which is out of engineering scope by standing constraint.
- **Cost:** <1 hr human/week, laptop-grade compute, no paid APIs.

No claim above is unlabeled. Absolutes are only on VERIFIED lines.

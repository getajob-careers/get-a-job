# Batch 2 - registry integrity sweep: silently-broken rows and recovered supply (2026-07-28)

RESEARCH-ONLY. `companies_il.json` is NOT touched. No code changed, nothing deployed.
This is a docs-only proposal HELD for Eli's ruling.

Evidence tiers: **VERIFIED** = an HTTP fetch made by the coordinator this run, status quoted.
**INFERRED** = reasoned, not observed. Nothing in the tables below is REPORTED-only.

Continues the rolling-batch arc: PR #837 (13 class-A adds), PR #843 (Batch 1, 14 MNC adds).
Cross-batch dedup ledger carried forward; this batch adds **no new company rows**, so the
ledger's company count is unchanged. What it adds is *recovered* supply from rows we already own.

---

## 0. Headline

A full live health sweep of every fetchable registry row found **four classes of silent
defect**. The most valuable single finding: `fetchWorkday` returns `[]` before making any
request when a row's `slug` lacks a `/`, and four rows are in that state. One of them,
**Philips, has 15 live Israeli jobs that the nightly fetch has never been able to see.**

Nothing here needs a new fetcher, a new ATS, or a new company. It is supply we already
paid for and are dropping on the floor.

---

## 1. Correcting the premise: what "47% dormant" actually is

The standing assumption entering this batch was that ~47% of the 1,162-row registry is
zero-active, and that the pattern is migration rather than death. The live sweep refines
that materially, and the refinement changes where the effort should go.

I probed **every** registry row that is `verified && api_url && ats ∈ {greenhouse, lever,
ashby, workable, comeet, smartrecruiters, workday}` - 827 rows - and classified each by
live response (tool: `scratchpad/sweep_registry.py`, 10-way concurrent, 2026-07-28 ~01:1x IDT).

| Class | Meaning | Count | Share of fetchable |
|---|---|---:|---:|
| HEALTHY | 200, postings present, ≥1 Israeli | 598 | 72.3% |
| ALIVE_NO_IL | 200, postings present, zero Israeli | 164 | 19.8% |
| EMPTY_BOARD | 200, zero postings at all | 55 | 6.7% |
| DEAD_ENDPOINT | non-200 (6×404, 3×400, 1 conn error) | 10 | 1.2% |

By rail:

| Rail | HEALTHY | ALIVE_NO_IL | EMPTY | DEAD |
|---|---:|---:|---:|---:|
| comeet | 370 | 22 | 19 | 3 |
| greenhouse | 113 | 84 | 7 | 6 |
| ashby | 40 | 38 | 9 | 1 |
| workable | 26 | 3 | 6 | 0 |
| workday | 25 | 2 | 9 | 0 |
| lever | 22 | 10 | 4 | 0 |
| smartrecruiters | 2 | 5 | 1 | 0 |

**So: true dormancy among rows we actually fetch is 28%, not 47%, and only 1.2% of
endpoints are hard-dead.** The 47% figure is real but it is measuring something else -
it includes the **271 registry rows on `unknown` / `custom` / unsupported rails**, which
are not dormant so much as *never fetched in the first place*. Those 271 are the bigger
prize and are being swept separately in this batch's agent wave; they are not in the
tables above because there is no endpoint to probe.

The practical consequence: "hunt for migrated companies" is a smaller vein than assumed,
because almost nothing has actually moved. The larger vein is **rows that were never
wired up**, and **rows that are wired up wrong** - section 2.

## 2. Silent defects found

### 2a. VERIFIED - `fetchWorkday` no-ops on a malformed slug (4 rows, 15 IL jobs lost)

`scripts/lib/ats-fetchers.ts:508-513`:

```ts
export async function fetchWorkday(c: CompanyEntry): Promise<RawJob[]> {
  if (!c.slug) return [];
  const parts = c.slug.split("/");
  if (parts.length < 2) return [];   // <-- silent, before any HTTP
```

The URL is built from `slug`, not from `api_url`. Four rows carry a bare tenant in `slug`
while their `api_url` is perfectly correct, so they return `[]` every night without ever
issuing a request and without logging anything.

| Company | registry `slug` (broken) | correct slug (host/site) | live IL on re-probe |
|---|---|---|---:|
| **Philips** | `philips` | `philips.wd3.myworkdayjobs.com/jobs-and-careers` | **15** |
| Bloomberg | `bloomberg` | `bloomberg.wd1.myworkdayjobs.com/Bloombergindustrygroup_External_Career_Site` | 0 |
| Moelis & Company | `moelis` | `moelis.wd1.myworkdayjobs.com/Experienced-Hires` | 0 |
| PwC | `pwc` | `pwc.wd3.myworkdayjobs.com/Global_Experienced_Careers` | 0 |

Philips, probed production-faithfully (`scratchpad/probe_wd.py`: the same 11 search terms
and Israel patterns as `ats-fetchers.ts`, paginated), HTTP 200, **15 unique IL postings**,
3 of 11 terms hitting. Actual titles observed, Haifa R&D plus one home-based:

> Product industrialization engineer (Haifa) · Senior R&D Process Development Engineer (Haifa)
> · FPGA Design Engineer (Haifa) · Board Design Engineer (Haifa) · Product Quality Engineer
> (Haifa) · Systems Engineering Functional Manager (Haifa) · Materials Process Engineer
> (Haifa) · Physicist (Haifa) · QA Engineer - Backend Infrastructure (Haifa) · Mechanical
> Engineer (Haifa) · Senior Mechanical Engineer (Haifa) · Manual Assembler / מרכיב-ה לחדר נקי
> (Haifa) · Manual Assembler / מרכיב בחדר נקי (Israel - Home Based)

Skew tag: **ENG** (informational label, not a filter - per the standing rule every verified
company ships with its tag and none is demoted).

The other three re-probe to a genuine zero *today* (HTTP 200, `terms_hit=0`). They are still
worth repairing, and this is the part that matters beyond the 15 jobs: right now those rows
are **silently** zero. Repaired, they become **observably** zero - so if Bloomberg or Moelis
opens an Israeli role next month, the nightly fetch will see it. Today it structurally cannot.

PwC note, flagged rather than silently resolved: the registry separately fetches PwC Israel
on the `pwc_heroku` rail (`pwc-careersite`). The Workday row is PwC *Global* and is a
different endpoint. Repairing its slug is safe today because global returns IL:0, but if it
ever returns Israeli roles, endpoint-level dedup against `pwc_heroku` is required before the
row is trusted. **This is Eli's call, not mine.**

### 2b. VERIFIED - slug collisions: four rows point at another company's board

Found by cross-checking every Israeli-founded row that came back ALIVE_NO_IL against the
job URLs its board actually returns. A slug that another company owns yields that company's
postings. These currently ingest nothing (they read IL:0, so the IL filter drops everything),
which is why they have gone unnoticed - but the row is wrong and **the real company's board
is absent from the registry entirely**.

| Registry row | registry slug | what that board actually is (evidence: returned apply URL) |
|---|---|---|
| Votiro Cybersec | ashby `menlosecurity` | Menlo Security - `jobs.ashbyhq.com/menlosecurity/99525710-6f76` |
| ClearML | greenhouse `clear` | CLEAR, US biometrics - `job-boards.greenhouse.io/clear/jobs/8028209` |
| Aleph Farms | lever `aleph` | a different Aleph, 95 postings - `jobs.lever.co/aleph/6aaac615-…` |
| Slice (Global Equity) | greenhouse `slice` | Slice, US pizza-shop software - `slice.careers/careers-listing?gh_jid=8079573` |

Two superficially similar rows were checked and are **legitimate**, not defects - recorded
so they are not "fixed" by mistake:
- **Codefresh → greenhouse `octopusdeploy`** - Codefresh was acquired by Octopus Deploy.
  Correct. (Note the ANZ host: `job-boards.anz.greenhouse.io`.)
- **Spot.IM → greenhouse `openweb`** - Spot.IM rebranded to OpenWeb. Correct.

The correct boards for the four collisions are being hunted in this batch's wave; whatever
comes back will be coordinator-re-probed before it is written down anywhere.

### 2c. VERIFIED - smartrecruiters zeros are real, not a probe artifact

My first-pass sweep read only page 1 of smartrecruiters and could have under-counted, which
would have made several Israeli companies look falsely dormant. Re-probed all 8 rows with
the proper `&country=il` facet, so this is settled rather than left as a suspicion:

| Row | IL `totalFound` | Row | IL `totalFound` |
|---|---:|---|---:|
| Armis | 2 | Gloat | 0 |
| Nexar | 2 | Trigo | 0 |
| Bosch | 0 | ironSource | 0 |
| Continental | 0 | Western Digital | 0 |

Trigo (152 postings) and Gloat (7) are **genuinely** not hiring in Israel right now despite
being Israeli-founded. No defect. ironSource is now part of Unity, whose board the registry
already fetches - endpoint-dedup point, no action.

### 2d. VERIFIED - hard-dead endpoints and empty boards (handed to the wave)

10 dead, 55 empty. Full rows in `batch2-sweep.tsv`. The dead set, for the record:

| Status | Rail | Company |
|---|---|---|
| 404 | greenhouse | Beewise, ExpressVPN, Shift4, Simply, Veza |
| conn error | greenhouse (EU host) | BeamUp - `boards-api.eu.greenhouse.io`, may be transient |
| 404 | ashby | Carbyne |
| 400 | comeet | Atidot, DoControl, PTC Israel - a 400 is the stale-UID/token signature |

I checked the obvious explanation for the Comeet 400s and it is **not** what it looked like:
registry Comeet tokens are not truncated. Token-length distribution across all 424 Comeet
rows runs 19-39 chars with a healthy mode at 33-38; only two are odd (Guesty at 19 chars,
which is live and working, and Sight Diagnostics with an *empty* token and a malformed
`sight/45.006` slug). So the three 400s are genuine API rejections, not a data-entry bug.

---

## 3. Getro - ToS read, verdict recorded, source DROPPED

PR #837 left this open ("warrants a Getro ToS glance before a production cron"). I read it
this run and am recording the verdict rather than leaving it open: **NOT PERMISSIVE. Do not
use Getro, not even for a read-only sample.** Two independent and individually sufficient grounds.

**Ground 1 - robots.txt, VERIFIED 2026-07-28.** `https://api.getro.com/robots.txt` → HTTP 200:

```
User-agent: *
Disallow: /
```

A blanket disallow on the entire API host. Our standing rule is to respect robots.txt, and
this is the least ambiguous form robots.txt takes. (For contrast, `www.getro.com/robots.txt`
disallows only `/thank-you` - so the API host's blanket block is a deliberate, separate choice.)

**Ground 2 - Terms of Use v3.1, last updated June 2025, fetched this run.** The scope clause
binds *anyone who accesses*, not only customers:

> "These Terms of Use (these "Terms") govern your use of (which includes access to) our
> website(s), products, services and applications (the "Services") including Getro's marketing
> site (getro.com), the Getro Admin Portal (getro.com/app), the Getro Chrome extension,
> Getro's Customer APIs and any job board operated by Getro."

And the prohibited-conduct list bars precisely what a sourcing cron does:

> ""Crawls," "scrapes," or "spiders" any page, data, or portion of or relating to the Services
> or Content (through use of manual or automated means);"

> "…any processes that run or are activated while you are not logged into the Services, or that
> otherwise interfere with the proper working of the Services (including by placing an
> unreasonable load on the Services' infrastructure);"

Note "manual or automated means" - that closes the "just sample it by hand once" option too,
which is why I am not sampling it. And an unauthenticated nightly pull is definitionally a
process running while not logged in.

**Decision (made autonomously, per mandate): Getro is struck from the source list.** The
`api.getro.com/api/v2/collections/{networkId}/search/jobs` finding from #837 stands as
technically accurate and should be left in the record as *closed on legal grounds*, not as a
pending opportunity. This removes an open question from Eli's queue rather than adding one.

---

## 4. The remote / EMEA lever - narrowed, with the actual numbers

Mandate item: document a normalization proposal for EMEA-remote postings our IL detection
reads as 0. **Documented, not built** (explicitly out of scope for this lane).

I ran a location-string census over all 164 ALIVE_NO_IL rows - pulling every posting's raw
location text and looking for anything a human would call Israel-ambiguous. 113 of 164 rows
contain at least one remote/hybrid/regional string. The honest finding is that **the volume
is overwhelmingly region-locked away from Israel**, which confirms the prior lever5 conclusion
rather than reopening it:

Most common location strings across the cohort are `San Francisco` (799), `San Francisco, CA`
(296), `Remote - US` (190), `New York, NY` (184), `Hybrid` (179), `Singapore` (150),
`Bangalore, India` (131), `Remote - United States` (88), `Remote US` (83), `Remote Canada` (61).
The remote strings are nearly all explicitly scoped to a non-Israeli geography: `Remote -
Australia`, `Remote - Germany`, `Remote - Poland`, `Remote - Ireland`, `US - Remote West`,
`CAN - Hybrid- Vancouver`, `APAC - Australia`, `Remote (Buenos Aires, Argentina)`.

Only **two** string families in the entire census are genuinely Israel-ambiguous:

| String | Postings | Employer | Why ambiguous |
|---|---:|---|---|
| `Home based - Worldwide` | 93 | Canonical | "Worldwide" does not exclude Israel |
| `Home based - EMEA` | 83 | Canonical | EMEA geographically includes Israel |

Plus a long tail of single-digit `EMEA` / `EMEA - Distributed (Dubai)` strings at Votiro and
Remote.com. That is roughly **176 postings, concentrated in one employer (Canonical)** - not
a volume lever.

**Proposal (for Eli, not for building tonight).** Do NOT make the location parser treat
`EMEA`/`Worldwide` as Israel. String-level inference is the wrong layer: it would mark
Canonical's 176 postings IL-eligible on a geographic technicality while saying nothing about
whether Canonical will actually employ someone resident in Israel, and it would silently
reclassify every future `EMEA` posting from any employer. The eligibility question is a
**per-employer policy fact**, not a per-posting string fact.

The cheap, honest version instead: a small explicit allowlist of employers whose *public*
hiring-location policy verifiably includes Israel, applied only to postings whose location is
a region containing Israel. PostHog is the one confirmed member from #837 (public handbook
hires GMT+2..GMT-8, do-not-hire list excludes Israel). Canonical would need its policy read
before it qualifies - I have not read it, so I am not claiming it. An allowlist of 1-2
employers is not worth building yet; the value of writing it down is that it tells us the
*shape* of the eventual change and stops us reaching for the string-matching version.

**Verdict unchanged from lever5: the remote lane is not a volume lever.** Recording it as
measured-and-closed, with the census as evidence, so it is not re-mined a third time.

## 5. Cost of the proposed repairs

Estimate, INFERRED from the shape of the work, not measured:

- Philips slug repair: the row goes from an instant `return []` to a real 11-term paginated
  Workday crawl. Comparable Workday tenants in the loop cost ~8-15s. **+8-15s.**
- Bloomberg / Moelis / PwC slug repairs: each becomes 11 term-requests that return empty on
  the first page and short-circuit. **+3-5s each, ~+9-15s total.**
- Slug-collision repairs (2b): net-neutral to slightly negative - these rows already make
  full requests today, just to the wrong board.

**Batch total: ~+20-30s nightly.** Last nightly ran 10m17s against a budget that leaves
~880s of headroom, so this is immaterial. It buys 15 live IL jobs plus four rows that stop
being silently blind.

## 6. What is NOT claimed here

- No new companies. This batch is repairs; net-new adds continue in the wave batches.
- The 15 Philips jobs are a **floor** - `probe_wd.py` matches on location string only and
  drops Workday's multi-location "N Locations" postings, exactly as production does.
- Bloomberg/Moelis/PwC returning IL:0 is a snapshot for 2026-07-28, not a permanent state.
  That is the point of repairing them.
- I did not verify that the four slug-collision rows' *real* boards exist or have IL roles.
  That is in flight and will be re-probed by the coordinator before it is written anywhere.
- Nothing about the 271 unknown/custom rows is claimed yet. In flight.

## 7. Proposed action (Eli's gate, per CLAUDE.md - never auto-mutate a canonical library)

1. **Repair the 4 workday slugs** to the host/site form in 2a. Data-row change; merges on
   Eli's review with live-validation evidence plus a clean `schema-validator` run. Philips
   alone is worth it.
2. **Rule on the PwC global-vs-Israel endpoint overlap** before that row's repair is trusted.
3. **Correct or drop the 4 slug-collision rows.** They ingest nothing today, so this is
   correctness, not volume - but leaving a row that names Votiro and fetches Menlo Security
   is a landmine for any future audit.
4. **Accept the Getro closure** and strike it from the source list.
5. **Note the remote-lane proposal** in section 4; no build.

Evidence artifacts in this PR: `batch2-sweep.tsv` (all 827 probed rows with status/total/IL).
Tools live in the session scratchpad (`sweep_registry.py`, `probe_wd.py`) and are referenced,
not committed.

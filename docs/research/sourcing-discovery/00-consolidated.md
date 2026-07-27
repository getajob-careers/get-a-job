# SOURCING DISCOVERY - raking the internet for net-new IL job supply (2026-07-27)

RESEARCH-ONLY. No registry mutated, no code touched, no deploy. This is a docs-only proposal
HELD for Eli's ruling. Evidence tiers: VERIFIED (probed/curled this run, evidence cited) /
INFERRED (reasoned, not observed) / REPORTED (an agent or source said so, untrusted until re-probed).

## What this arc is, and how it differs from supply-growth/lever6

`docs/research/supply-growth/lever6-continuous-sourcing.md` (merged 2026-07-27) built the standing
*mechanism* for continuous sourcing and concluded, honestly, that free sourcing is measured-exhausted
for the mature IL population: a trickle of single-digit companies / 10-40 IL jobs per crawl, whose
real value is decay-defense. That is the mechanism. This arc supplies the thing that mechanism needs:
a fresh batch of net-new candidate companies with LIVE fetch evidence, hunted across four grounds
(fresh-funded startups, VC/accelerator portfolios, absent multinational IL offices, remote + niche boards).

The one place this run beat the trickle baseline is hunting-ground 2 (IL offices of multinationals
absent from the registry, mostly on Workday) - a vein prior tech-startup-focused crawls did not work.

## Methodology integrity note (read this before trusting any number here)

Every candidate below was re-probed by the coordinator against the live ATS API this session; nothing
is trusted on an agent's summary. This mattered: during the run, three "task-complete" summaries arrived
whose IDs did not match any dispatched agent and one of which cited a dedup file that was never created.
Treated as untrusted leads and re-probed, they were found to assert KLA, SAP, AMD, and April as
"net-new" when all four are already in the registry, and to mislabel Quantum Art as greenhouse (no board
exists). The registry-verified agents got these right. Rule reinforced: no candidate enters a batch
without (a) a coordinator dedup pass on name, domain AND ATS endpoint, and (b) a coordinator live probe.

## VERIFIED baseline (from supply-growth, live DB ilmqmodklutztuybsvwd, 2026-07-27)

- 5,510 active jobs, 100% IL. Registry `companies_il.json` = 1,162 rows, 854 verified+api_url.
- Supported rails (ENABLED_ATSS): greenhouse, lever, ashby, workday, smartrecruiters, comeet,
  successfactors, workable, iai, adamtotal, adamtotal_agency, pwc_heroku, amazon_jobs, bezeq_native, hot_native.
- Promotion gate (`refresh-jobs.ts:483`): `c.verified && c.api_url && ENABLED_ATSS.has(c.ats)`.

## 1. RANKED net-new candidate list (VERIFIED class-A, addable now, zero new fetcher code)

Ranked by current IL job count. All probed by the coordinator this run; all dedup-clean on name,
domain, and ATS endpoint. IL counts are a live snapshot (2026-07-27) and a floor for Workday
(searchText=Israel). "Relevance" flags business-student density where obvious.

| # | Company | Sector | Rail | Probe evidence (this run) | IL jobs | Relevance |
|---|---------|--------|------|---------------------------|--------:|-----------|
| 1 | HP Inc | HP Indigo R&D, Ness Ziona | workday | 200 searchIsrael total12 / IL12 | 12 | mixed |
| 2 | SanDisk | flash memory, Kfar Saba/Omer | smartrecruiters | 200 country=il totalFound11 | 11 | mixed |
| 3 | Oak | AI identity security, TLV | ashby | 200 total13 / IL8 | 8 | some biz (alliances) |
| 4 | Mastercard | fintech, Ramat-Gan | workday | 200 total7 / IL7 | 7 | HIGH (mkt/advisory/ops) |
| 5 | Novartis | pharma, IL | workday | 200 total7 / IL6 | 6 | mixed (commercial/medical) |
| 6 | Airis Labs | defense AI, TLV | comeet | 200 len4 / IL4 | 4 | low (eng) |
| 7 | General Motors | automotive AI R&D, Herzliya | workday | 200 total4 / IL4 | 4 | low (eng) |
| 8 | Abbott | medical devices, Haifa/TLV | workday | 200 total4 / IL4 | 4 | mixed |
| 9 | Venice Security | identity security, TLV | comeet | 200 len6 / IL3 | 3 | low (eng) |
| 10 | Citi | banking tech lab, TLV | workday | 200 total3 / IL3 | 3 | mixed |
| 11 | Terra Security | agentic pentest, TLV | comeet | 200 len4 / IL2 | 2 | low (eng) |
| 12 | BlueWhite | ag-robotics | comeet | 200 len2 / IL2 | 2 | low (eng) |
| 13 | HARMAN (Samsung) | automotive tech, Hod Hasharon | workday | 200 total2 / IL2 | 2 | low (eng) |

**Total: 13 net-new class-A companies, ~68 verified current IL jobs, zero new fetcher code.**

### Explicitly DROPPED after coordinator re-probe (recorded so they are not re-mined)
- CrowdStrike (crowdstrike.wd5/crowdstrikecareers, 12 IL) - DUPLICATE ENDPOINT. Already fetched via the
  registry's "Adaptive Shield" entry (CrowdStrike acquired Adaptive Shield). Adding it would double-count.
- KLA (39 IL claimed net-new) - already in registry (workday kla.wd1/Search). SAP, AMD - already in registry.
- April (ashby) - registry already has ashby slug `april` (getapril.com). Not net-new.
- Quantum Art - NOT greenhouse (all slug guesses 404); it is bespoke (class C, listed in section 4).
- Fig Security (comeet 0B.003) - rail present but IL:0 right now. Low priority; re-check later.

## 2. CLASS-A QUICK-ADD BATCH PROPOSAL (draft, for human promotion)

The 13 rows above are emitted as registry-shaped draft records in
`class-a-quick-add-DRAFT.json` (same directory), each with `name/type/industry/domain/careers_url/
ats/slug/api_url/verified` filled and the verified IL count stamped in `_verified_il_jobs_2026_07_27`.

Promotion is Eli's manual gate (CLAUDE.md: never auto-mutate canonical libraries). Suggested flow:
copy the rows into `companies_il.json` by scripted text-surgery, run `schema-validator`, spot re-probe,
merge as a data-row change. Comeet rows carry the harvested token inline in `api_url` (client-exposed on
the careers page); Workday rows follow the existing `<host>/<site>` slug + `/wday/cxs/<tenant>/<site>/jobs`
api_url convention (matches Accenture/Adaptive Shield entries).

## 3. CLASS-B fetcher-demand tally (known ATS, NO fetcher today)

None clears the standing 4+-live-IL-tenant build bar. Ranked demand:

- **Recruitee** - Finaloop (TLV Partners portfolio, live IL business roles) + others surfaced. Single
  strongest recurring "which fetcher next" from the VC-portfolio ground. Still 1-2 known tenants; below bar.
- **Comeet token-discovery (capability, not a fetcher)** - the freshly-funded IL cohort skews HARD to
  Comeet, which is ALREADY a supported rail. The blocker is per-company token discovery: client-exposed
  tokens (Oak-adjacent comeet cos above) are trivially harvestable; server-side ones (Arito) are not.
  A `discover-comeet` token-harvest helper is higher-leverage than any new adapter. INFERRED highest-ROI tooling.
- **Phenom** - PepsiCo exposes a clean `pepsicojobs.com/api/jobs?location=Israel` JSON (35 IL), but ~all
  are SodaStream, already in registry via comeet. Ingestible rail, low net-new value. Below bar alone.
- **HiBob** - NewCore Identity (single tenant, SPA, count not fetchable). Far below bar.

## 4. CLASS-C bespoke (real net-new IL jobs, NOT addable - no ATS rail)

Dedup-clean net-new companies with live IL jobs on self-built careers pages (no ingestible API).
Recorded for the record; not addable without per-company bespoke work.
- Quantum Art (~16-18, Ness Ziona, ion-trap quantum, $140M) - biggest bespoke miss.
- Visitt (~3, incl. Product Marketing + Support), Aryon Security (~3, incl. VP Marketing),
  Received (~4), TytoCare (~4, Netanya), Reclaim Security (~1), Copperhelm (~2).

## 5. IL-HIREABLE REMOTE (separate section - honesty-critical, per lever5)

The prior lever5 finding held hard: of ~30 remote-first firms probed, exactly ONE is genuinely
IL-hireable, and it would NOT be caught by our current fetch.
- **PostHog** (ashby/`posthog`, probed 200/total9/IL0) - IL-hireable (live "Remote (EMEA)" role; public
  handbook hires GMT+2..GMT-8, do-not-hire list excludes Israel). But its roles carry no Israel city, so
  our city-name IL fetcher reads IL:0. It would need a remote/EMEA-aware ingestion change to capture.
- Near-misses held back for honesty (do not name Israel): Supabase, Chili Piper.
- The rest region-locked to US/EU/Canada (Close, Mattermost, Toptal, Proton, Float, Tailscale, Resend...).

**Verdict: the remote lane is not a volume lever.** Its only unlock is a normalization change to trust
region-remote eligibility (EMEA-including-IL), which is a product/normalization decision, not a sourcing add.

## 6. NET-NEW INGESTIBLE SOURCE (the one thing prior passes did not close)

- **Getro public JSON API** - `POST https://api.getro.com/api/v2/collections/{networkId}/search/jobs`
  returns 200 `application/json` with `results.jobs[]` (title, url, searchable_locations, work_mode, skills).
  VERIFIED live for **Israel VC Forum, networkId 10949** (~23.7k global jobs, business/sales-rich) and
  **Viola Group 6263** (pattern generalizes). aleph (21393) and ourcrowd (18239) are DEAD off Getro.
  Caveats: feed is global, must filter `searchable_locations` to Israel; it is a public JSON API (not the
  aggregator-scrape situation) but warrants a Getro ToS glance before a production cron. This is the single
  most interesting standing-cadence input surfaced - one endpoint, many IL-VC-portfolio jobs, unauthenticated.

## 7. Still-closed dead ends (re-confirmed live, do not re-mine)

Aggregators AllJobs / Drushim / JobMaster (200 HTML, Amendment-13 + ToS legal hold, business-dev track,
not engineering). Taasuka gov (200 HTML, no feed). SNC Finder (403 bot-wall, is a company DB not a jobs feed).
Janglo / Geektime jobs (HTML, feeds disabled). New multi-tenant ATS without 4+ live IL tenants. Structural
comeet is_remote / ashby isRemote flags (noise, per lever5).

## 8. PROPOSED RECURRING CADENCE (refines lever6 with what this run learned)

Lever6's cadence stands; this run adds three concrete refinements:

| Input | Cadence | Refinement from this run |
|-------|---------|--------------------------|
| Fresh-funded + VC-portfolio crawl (grounds 1+2 startups) | Quarterly | Skew the probe toward Comeet+Ashby; most fresh IL cos are there or bespoke. Feed NEW funding seeds only. |
| **MNC-IL-office absence sweep (ground 2)** | **Quarterly (NEW)** | The highest-yield vein this run. Enumerate global cos with IL offices, probe Workday/SmartRecruiters `searchText=Israel`, dedup on ENDPOINT. |
| Getro IL-VC-forum pull (10949) | Monthly (cheap) | One unauthenticated endpoint; filter to Israel; feeds ground 1/2 discovery. Pending ToS glance. |
| ATS-migration / dark-tenant re-check (lever6 Input 3) | Weekly | Unchanged. Now also: endpoint-dedup guards against acquisition double-counts (CrowdStrike/Adaptive Shield pattern). |

**Standing rule added:** dedup on ATS ENDPOINT, not just name/domain. Acquisitions put one board under a
target's name (Adaptive Shield = crowdstrike.wd5); name/domain dedup misses it and causes double-counts.

**Automation split (unchanged from lever6):** crawl + IL-validate + endpoint-dedup + draft-emit = cron;
registry promotion stays Eli's manual gate. Expected yield: this run's 13 cos / 68 IL jobs is an
above-baseline batch because the MNC vein was fresh; steady-state remains a trickle (lever6's honest ceiling).

## 9. Evidence appendix

- Probe tool + IL-count logic: `scratchpad/probe.py` (greenhouse/lever/ashby/smartrecruiters/workable;
  comeet via board-token harvest). Self-tested against known-good registry slugs (abnormalsecurity, 1password, armis).
- Coordinator verified-findings ledger: `scratchpad/VERIFIED-findings.md`.
- Per-ground agent reports: `scratchpad/agent-{1..5}-*.md`.
- Dedup index built from live registry: `scratchpad/registry_{domains,names_norm,index}.{txt,tsv}` (1,162 rows).

## Resume point (if picked up cold)

Done: 4 grounds swept by a 5-agent swarm + coordinator re-verification; 13 class-A adds VERIFIED and
drafted; Getro source found; cadence refined. Not done (Eli's calls): (1) promote the class-A draft into
`companies_il.json` (manual gate); (2) decide the Comeet token-harvest helper build; (3) ToS glance on
Getro; (4) decide whether to make ingestion EMEA-remote-aware (unlocks PostHog-class). Nothing is merged
or deployed. This PR is HELD.

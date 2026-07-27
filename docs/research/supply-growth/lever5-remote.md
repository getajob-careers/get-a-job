# LEVER 5 — REMOTE ROLES (findings) 2026-07-27

Investigator lane. Evidence tags: VERIFIED = query/grep run this session, raw output pasted.

## HEADLINE VERDICT

**The `is_remote` facet is DISHONEST.** The baseline "27.6% remote (1,523/5,510)" is
~89% comeet structural-flag noise firing on office-located jobs. The HONEST remote
share (location text actually says "remote", all in IL context) is **41 rows = 0.7%**;
genuine remote+hybrid ≈ **92 rows = 1.7%** across **25 companies**. The lever here is a
DATA-QUALITY / HONESTY fix, NOT a volume-growth fix. Remote-specific sourcing net-new is SMALL.

---

## (a) CURRENT SHARE + HONESTY OF THE FACET

### is_remote by ats_source — VERIFIED

```
comeet        remote 1358 / 2936 = 46.3%
ashby         remote  116 /  203 = 57.1%
greenhouse    remote   24 /  866 =  2.8%
workable      remote   20 /   97 = 20.6%
lever         remote    4 /  112 =  3.6%
workday       remote    1 /  226 =  0.4%
pwc/sf/smart/amazon/adamtotal = 0
TOTAL flagged remote = 1,523 (matches baseline). comeet = 1358 = 89.2% of the pool.
```

### HOW is_remote is computed — VERIFIED (grep scripts/lib/ats-fetchers.ts)

Set per-fetcher; NO central rule. Two families:

- **Structural source field (unverified):**
  - `fetchComeet` L969: `is_remote: Boolean(loc.is_remote)` — trusts comeet's location.is_remote.
  - `fetchAshby` L379: `is_remote: Boolean(j.isRemote) || /remote/i.test(locationRaw)`
  - `fetchWorkable` L312: `j.telecommuting === true || /remote/i.test(locStr)`
  - `fetchLever` L342: `cats.commitment === "Remote" || /remote/i.test(location)`
  - `fetchSmartRecruiters` L828: `loc.remote === true || /remote/i.test(...)`
- **Keyword-only on location text (honest but narrow):**
  - `fetchGreenhouse` L91, `fetchJooble` L243, `fetchSuccessFactors` L1073 — `/remote/i.test(location)`
- **Hardcoded false:** IAI L161, adamtotal L1237, bezeq L1347, hot L1473, pwc L1639, amazon L1789.
  Assignment copied through `refresh-jobs.ts:244 is_remote: r.is_remote` (no normalization override).

### FALSE-POSITIVE risk = SEVERE (VERIFIED)

Sample of 20 is_remote=true rows (random) — nearly all office-city locations:
`IT Manager / Tel Aviv`, `Assistant Controller / Ramat Gan`, `Senior System Administrator / Center`,
`Senior IT Infra & Sysadmin / ACS Motion Control Israel (HQ)`, `נציג/ת גבייה / Bnei Brak`,
`Senior DevOps / Netanya`, `CX Ops Manager / Tel-Aviv`. A sysadmin "at HQ" flagged remote is absurd.

comeet forensic — VERIFIED:

```
comeet_remote_total          1358
loc_says_remote (text)          0   <- ZERO of 1358 mention "remote" in location
loc_no_remote_word           1358
payload location.is_remote=true 1358  <- the source field fired on all of them
```

=> comeet's `location.is_remote` is a near-worthless discriminator; it flags office roles.
Ashby's `j.isRemote` is ALSO noisy — sample of ashby is_remote=true w/o "remote" text:
`Backend Tech Lead / Tel Aviv`, `Senior Backend Engineer / Tel Aviv Office`,
`Bookkeeper / Israel`, `Revenue Controller / Tel Aviv`, `Solutions Architect / Tel Aviv`.

### Genuine-remote text vs flagged, by source — VERIFIED

```
source      genuine_remote_text   flagged_remote
comeet                    0            1358
ashby                    15             116
greenhouse               24              24   <- 100% honest (keyword-only)
workable                  0              20
lever                     1               4
workday                   1               1
```

Honest floor = 41 rows with real "remote" in location text; ALL 41 are in IL context
(text_remote_il_context = 41 of 41). Greenhouse (24) is the cleanest source.

### FALSE-NEGATIVE risk = SMALL (VERIFIED)

is_remote=false but location_raw says remote/hybrid: **14 rows, all greenhouse**
(greenhouse keyword regex is `/remote/i` on loc.name; these 14 are "hybrid" wording,
correctly NOT counted as remote — hybrid ≠ remote). Negligible gap.

### IL-HIREABLE honesty check — MOSTLY OK for the genuine rows (VERIFIED)

The genuine-remote rows all list Israel in the location, and `is_il=true` gating requires
an Israel mention (normalize.ts L496-497 keeps rows where Israel appears even amid US co-mentions):

- `Israel (Remote)`, `Europe | Israel (remote)`, `Remote - Europe` (+Israel), `Remote, Israel`.
  These ARE IL-hireable EMEA/Israel-remote roles — exactly the target.
- CAVEAT: a cluster of ashby "Subject Matter Expert (Russian) – Remote" rows read
  `Ukraine (Remote) | Israel | USA (Remote) | Germany (Remote)` — the "(Remote)" tags sit
  on Ukraine/USA/Germany while **Israel is listed plain** => the remote option may be for
  those countries and Israel on-site. Minor over-count in the genuine bucket.
- The 1,482 structural-flag rows are the honesty problem, not IL-eligibility: they are
  IL office jobs mislabeled remote (a within-Israel false-positive, not a global-remote trap).

---

## (b) SOURCES for IL-hireable / EMEA-remote roles we DON'T ingest

Respecting the HARD PRIOR (free legal sourcing measured-exhausted 2026-06-14; 4+ live-tenant
bar; vendor-list-vs-infra; AllJobs/Drushim scraping = legal track not eng):

- **Existing fetchers already capture the genuine remote pool.** The 92 genuine remote/hybrid
  rows come through greenhouse/ashby/lever from companies already in our registry posting
  "Remote - Europe / Israel (remote)" roles. Growth path = add MORE IL-relevant EMEA-remote
  employers to the EXISTING greenhouse/ashby/lever registry — NO new ATS, NO new fetcher.
  This is registry expansion, already the known lever; remote is not a distinct source.
- **Dedicated remote boards (WeWorkRemotely, RemoteOK, Remotive, Himalayas, etc.):** REJECT.
  (1) They are aggregators — scraping is a ToS/legal-track item, same class as AllJobs/Drushim,
  not an engineering task. (2) Eligibility fails Eli's constraint: the bulk of their "remote"
  inventory is US-work-authorization-required or US-timezone; "EMEA/worldwide" slices that an
  IL candidate can actually take are a thin minority. Ingesting them would INFLATE with roles
  IL users can't get — explicitly disallowed. No concrete legal per-tenant ingestion path.
- **No new multi-tenant ATS clears the 4+ live-IL-tenant bar for remote specifically.** I did
  not find independent evidence of a shared API surface with 4+ current IL-remote tenants that
  we don't already hit. Below the bar => closed by precedent; not proposing one.

Net: no honest NEW remote-only source. The only legal path is more employers on existing fetchers.

## (c) WHAT A REMOTE-FOCUSED SOURCING PASS ADDS — SMALL (honest)

- Genuine IL-hireable remote/hybrid supply today = **92 rows / 25 companies** (VERIFIED).
- A registry pass targeting known IL-EMEA-remote employers (Wix/monday/similar EMEA-remote
  posters already on greenhouse/ashby) would add roles in the **tens**, not thousands — bounded
  by how few IL employers post genuinely-remote reqs. Effort = registry entries + re-run existing
  fetchers (low), but yield is small and overlaps existing coverage. INFERRED from the 92-row /
  25-co ceiling — this is a niche, not a growth engine.
- The high-value, low-effort work is NOT sourcing: it's the **honesty fix** (see below), which
  costs the facet nothing in volume but stops us lying to users about 1,400+ office jobs.

## (d) PRODUCT-SIDE gaps in remote labeling/filtering — NOTE, do NOT build

- **A remote filter EXISTS and consumes the noisy flag.** `src/components/jobs/JobsSearchTab.jsx:81`
  maps chip `["remote","Remote"]`; `matchesWorkType` filters on `job.is_remote`
  (test `src/test/jobsSearchFacets.test.js:44` — `matchesWorkType({is_remote:true},["remote"])===true`).
- **A "Remote" badge is shown** on cards: `src/components/jobs/JobCard.jsx:66`
  `if (job.is_remote === true) return "Remote";` and `JobDetailModal.jsx:128`.
- => A user filtering to "Remote" gets ~1,523 jobs, ~89% of which are office roles in
  Tel Aviv/Herzliya/Ramat Gan wearing a false "Remote" badge. The 27.6% share IS discoverable —
  and it is wrong. This is a user-facing honesty defect, not a discoverability gap.
- Onboarding collects a "Remote" work-arrangement preference (DirectionScreenV2.jsx:64,
  StepConstraints.jsx:16) that matches against this same dishonest flag.

## RECOMMENDED FIX (data quality, not covered by "build" — for Eli's ruling)

Stop trusting the structural source fields that don't corroborate. Options:

- Require location-text corroboration: `is_remote = /remote/i.test(location_raw)` OR a source
  field ONLY when the source is known-clean. Immediately drops comeet 1358→0, ashby 116→15,
  keeps greenhouse 24. Honest facet ≈ 41 rows.
- OR add a stricter `remote_confidence` and only badge/filter on the text-corroborated tier.
  This is a fetcher/normalize change (scripts/lib/ats-fetchers.ts + normalize.ts) — investigate-only
  here; flagged for a decision.

## LEDGER

- PR: none (investigate-only). SHA: branch eli/handoff-flip2-shipped.
- State: findings complete, all VERIFIED.
- Claims to verify: comeet `location.is_remote` semantics (does it mean "remote-optional"?) —
  a 1358/1358 payload=true on office jobs strongly implies it's employer-set noise; confirm w/
  comeet API docs if acting.
- Evidence: SQL rows pasted above; ats-fetchers.ts L91/312/342/379/546/828/969 grep hits;
  JobsSearchTab.jsx:81, JobCard.jsx:66.
- Open Q: is the honesty fix in-scope for a data-quality PR, or parked? Whose ruling on the
  1400-row label flip (breaks the "27.6% remote" headline)?

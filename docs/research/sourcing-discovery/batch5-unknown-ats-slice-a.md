# Batch 5 - unknown-ATS slice A: a 191-job claim that was already in the cache (2026-07-28)

RESEARCH-ONLY. `companies_il.json` is NOT touched. No code, no deploy. HELD.

Closes the last outstanding slice of the overnight run: the first 135 of the 271 registry rows on
`unknown`/`custom` rails. Arc: #837, #843, #844, #845, #846.

---

## 0. Headline: the dedup caught almost all of it

The agent working this slice reported **"191 net-new ingestible IL postings across 8 companies,
zero new fetcher code"**, led by CyberArk at 143. Re-probed against the live job cache, **that
supply is already being ingested.** The genuinely net-new total from this slice is **1 job.**

This is not a criticism of the agent's probing, which was accurate: those boards really do serve
those Israeli jobs. It is a dedup result. Every one of the big finds is an **acquired Israeli
company whose roles now live on the acquirer's board, and we already fetch the acquirer.**

Query against the live cache (`jobs`, `is_active = true`, 2026-07-28):

| Reported as | Board it resolves to | Agent's IL count | Active in our cache RIGHT NOW | Verdict |
|---|---|---:|---:|---|
| CyberArk | `paloaltonetworks.wd5/panwexternalcareers` | 143 | **143** (Palo Alto Networks) | already ingested |
| EY Israel | `careers.ey.com` | 63 | **63** (EY) | already ingested |
| Eureka Security | greenhouse `tenableinc` | 13 | **13** (Tenable) | already ingested |
| Bionic Security | `crowdstrike.wd5/crowdstrikecareers` | 13 | **13** (Adaptive Shield) | already ingested |
| HiredScore | `workday.wd5/Workday` | 7 | **7** (Workday) | already ingested |

The counts match **exactly**, which is what makes this conclusive rather than probable.

Note the Adaptive Shield row: that is the same CrowdStrike-board pattern #837 flagged. It has now
caught a second company (Bionic) attributing to it. The endpoint-dedup rule keeps earning its place.

The agent's note that "the PAN slug was nulled 2026-06-14, re-enabling recovers all 143" is also
wrong on the live evidence: Palo Alto Networks is fetching 143 active Israeli jobs right now.

## 1. What actually remains from this slice

| Company | Rail | IL | Status |
|---|---|---:|---|
| Cloudshare | workable `cloudshare` | **1** | genuinely net-new (TAM, Ramat Gan) |
| Alta | greenhouse `alta` | 7 | already proposed in **#845**; independent confirmation |
| Dynamic Yield | `mastercard.wd1/CorporateCareers` | 7 | Mastercard is already a proposed add in **#837**. Pending-dup |

So: **1 net-new job.** Recorded honestly rather than dressed up.

## 2. The one real opening: BambooHR

Two Israeli tenants with live roles, and it is the cheapest rail seen in the entire arc:

- **Bringoz** - `bringoz.bamboohr.com/careers/list`, **11 live Tel Aviv roles** including BDR,
  Customer Success Manager and Product Manager. Business-skewed.
- **Cyabra** - `cyabra.bamboohr.com/careers/list`, 1 Tel Aviv role. Its registry Comeet UID (29.006)
  is dead; BambooHR is where it moved.

Unauthenticated JSON with city and state inline. **2 tenants, 12 IL jobs: still under the 4-tenant
bar**, so no build is proposed. But per unit of effort it is the best-value rail on the board, and
Cyabra proves the migration direction (Comeet -> BambooHR) that would grow the tenant count.

This revises #846's tally, where BambooHR was recorded at 1 tenant.

## 3. Strong negative evidence (the durable value of this slice)

The agent did not just fetch careers pages. It ran a **3,296-candidate slug sweep across greenhouse,
greenhouse-EU, lever, ashby, workable and smartrecruiters (~20,000 probes)**, a Workday CXS sweep over
28 tenants x 4 pods x 8 site names, DNS CNAME probes on 7 careers-subdomain patterns for all 135
domains, and a JS-bundle crawl of each careers page plus up to 12 of its script bundles.

**That 3,296-candidate sweep returned exactly one hit, and it was already known.**

Conclusions to bank:
- **Slug-guessing this cohort is exhausted.** Do not spend another run on it.
- **There is no shared Israeli ATS.** The ~40 large Israeli employers here (Hapoalim, Leumi, FIBI,
  Clal, Clalit, Cellcom, HOT, Fox, Castro, El Al, Egged, Iscar, Elbit, Delek, Azrieli, Ashtrom,
  Electra, Diplomat, Dexcel, BDO, Herzog, Goldfarb, Arnon, Globes, Calcalist and the rest) were
  checked specifically for a *shared* Israeli ATS (Niloog / Hilan / Jobiz / Sniff) that one fetcher
  could cover. **There is none.** Each is a bespoke CMS with server-rendered Hebrew listings.
  Individually scraper-only, which we do not do. This closes a question implicitly open all arc.
- **The Comeet UID column in this slice is dead, not merely token-less.** 15 rows carry Comeet UIDs;
  two live tokens were extracted from the companies' own pages (Autotalks 03.009, CYREBRO A7.003) and
  both return HTTP 400 "Account uid or token are not valid". The other 13 pages no longer reference
  comeet.co at all. Consistent with #845: a Comeet 400 means a deactivated account, not a stale token.

## 4. Corrections to the shared agent brief

- **`boards-api.eu.greenhouse.io` is NXDOMAIN.** My brief listed it as a valid endpoint shape. Three
  separate agents independently hit this. Any future brief must drop it; EU boards are HTML-only.
- Fetcher-demand tenants re-confirmed live here, all under the bar: Phenom 3 (BCG, Cisco, GE
  Healthcare), Eightfold 2, Avature 2 (Bain, IBM), iCIMS 2 (AMD, ARM), Oracle 2 (Akamai, Fortinet),
  TalentBrew 2, BambooHR 2. #846's census used a wider tenant pool and remains authoritative.

## 5. Registry hygiene surfaced

- **Duplicate rows**: "BCG (Boston Consulting Group) Israel" and "Boston Consulting Group" are the
  same Phenom tenant. Same for "Bain & Company" and "Bain & Company Israel".
- **Hour One**: apex and all 7 careers subdomains CNAME to `parkingcrew.net`. Company gone. Drop.
- **Helios**: recruitee board 404s (registry note claims 200). Confirms #846's prune recommendation.
- **Apono**: `apono.io/careers` has a live greenhouse embed but slug `apono` 404s. Worth a manual look.

## 6. Asks

1. **Add Cloudshare** (1 IL). That is the entire promotable output of this slice.
2. **Note the BambooHR revision** to 2 tenants / 12 IL in #846's census.
3. **Drop Hour One**, dedup the BCG and Bain double-rows.
4. **Bank the negative**: slug-guessing the unknown-ATS cohort is exhausted, and there is no shared
   Israeli ATS to build against. Both are permanent answers.

## 7. Not claimed

The 191 figure is real as a count of live Israeli postings on those boards. It is **not** new supply,
and this doc exists so nobody promotes it as such. Bringoz and Cyabra's 12 jobs are blocked, not
addable. EY's SuccessFactors surface is the RMK/jobs2web variant rather than the JSON API, which is
moot here since EY already ingests, but matters if anyone adds another RMK tenant.

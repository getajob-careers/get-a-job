# Batch 3 - dormant-registry migration sweep: 213 verified IL jobs recovered (2026-07-28)

RESEARCH-ONLY. `companies_il.json` is NOT touched. No code changed, nothing deployed. HELD for Eli's ruling.

Evidence tiers: **VERIFIED** = an HTTP fetch the coordinator made this run. Every row below was
re-probed by the coordinator personally; no agent's number is carried through unchecked. Two agent
claims were re-probed and found wrong, and are corrected in section 6.

Rolling-batch arc: #837 (13 adds), #843 (Batch 1, 14 MNC adds), #844 (Batch 2, registry integrity).

---

## 0. Headline

20 companies, **213 verified live Israeli jobs**, all on rails we already run except one.
The single biggest item is **Mobileye at 112 IL jobs**, which we have never fetched.
4 are genuinely net-new companies; 16 are rows we already own that were pointing at nothing.
8 of the 20 carry a BUSINESS skew tag.

The best result for our users is not the biggest one: **Melisron, 20 Israeli roles, all business**
(economist, bookkeeper, executive-office secretary, planning manager, operations and maintenance
manager, project coordinator). It is a Hebrew-language board at a mall/real-estate group, a
population our tech-startup-shaped sourcing has never touched.

| # | Company | Rail | IL | Skew | Status | New code? |
|---|---|---|---:|---|---|---|
| 1 | Mobileye | lever (EU host) | **112** | MIXED | repoint from `custom` | YES, see s.3 |
| 2 | Melisron (Ofer Group) | comeet | 20 | BUSINESS | NET-NEW | no |
| 3 | Stratasys | successfactors | 16 | BUSINESS | repoint from `unknown` | no |
| 4 | Glow | ashby | 10 | MIXED | NET-NEW | no |
| 5 | SciPlay | workday | 9 | BUSINESS | repoint from `unknown` | no |
| 6 | Alta | greenhouse | 7 | BUSINESS | repoint, domain flagged | no |
| 7 | Simply | ashby | 5 | MIXED | repoint, gh slug 404s | no |
| 8 | BeamUp | greenhouse | 4 | MIXED | REPAIR, bad host | no |
| 9 | Beewise | comeet | 4 | MIXED | repoint, gh slug 404s | no |
| 10 | Snowflake | ashby | 2 | BUSINESS | repoint from `custom` | no |
| 11 | Ocean | ashby | 1 | ENG | NET-NEW | no |
| 12 | ABB Israel | workday | 1 | MIXED | NET-NEW | no |
| 13 | Daylight Security | greenhouse | 6 | MIXED | repoint, comeet board empty | no |
| 14 | Glassbox | greenhouse | 3 | BUSINESS | repoint from workable | no |
| 15 | Spines | comeet | 3 | BUSINESS | repoint from workable | no |
| 16 | PhaseV | greenhouse | 3 | ENG | slug already correct, see s.2d | no |
| 17 | PTC Israel | workday | 2 | MIXED | repoint, comeet 400 | no |
| 18 | Trigo | comeet | 2 | MIXED | **corrects #844** | no |
| 19 | Stream Security | comeet | 2 | ENG | repoint, ashby collision | no |
| 20 | Gloat | comeet | 1 | BUSINESS | **corrects #844** | no |

Skew is an informational label, never a rank or a filter. Every verified company ships with its tag.

## 1. What the migration hypothesis actually turned out to be

The mandate's hypothesis was MIGRATION over death, on the Teva -> Eightfold and Qualitest -> Workable
pattern. Tested against the full dormant set, the hypothesis is **half right, and the other half is
more valuable**.

True migrations exist and were found (Simply and Beewise left dead Greenhouse boards; SciPlay left
Comeet for its parent's Workday). But the larger yield came from three other causes:

1. **Rows that were never wired up at all.** 271 registry rows sit on `unknown`/`custom` with no
   endpoint. Mobileye, Stratasys, SciPlay, Alta and Snowflake all came from that set. This is the
   richest vein in the registry and it is not "dormant", it is unstarted.
2. **Endpoint data bugs.** BeamUp's `api_url` points at `boards-api.eu.greenhouse.io`, a host that
   is **NXDOMAIN**. It never worked. The US host always did.
3. **Genuine emptiness, at scale.** Most dormant rows are simply not hiring in Israel today. That is
   a real answer and it is recorded so the vein is not re-mined.

## 2. The three biggest single findings

### 2a. Mobileye, 112 IL jobs, on a Lever host we do not call

`api.lever.co/v0/postings/mobileye` -> **404**. `api.eu.lever.co/v0/postings/mobileye` -> **200, 129
postings, 112 Israeli.** Lever runs a separate EU data-residency host and Mobileye is on it.

Verified location breakdown: Jerusalem 52, Ramat Gan 24, Petah Tikva 18, Haifa 15, Tel-Aviv 3.
The remaining 17 are Shanghai and Beijing. IL team mix includes Software 34, Algorithms 23,
**Project / Program Management 11**, Hardware 9, **Product Management 5**, **Data and Analytics 3**.

`scripts/lib/ats-fetchers.ts:322` hardcodes the US host:

```ts
const url = `https://api.lever.co/v0/postings/${c.slug}?mode=json`;
```

**I checked whether this is a systemic blind spot and it is not.** I swept all 36 Lever rows in the
registry against both hosts: every one resolves on the US host and 404s on EU. **EU-only gains: 0.**
So this does not justify a re-sweep of the Lever population; it justifies exactly one narrow change
to unblock exactly one very large company. That negative result is worth as much as the find.

### 2b. Melisron, 20 Israeli business roles, and the Hebrew-board population behind it

`comeet/56.00E`, HTTP 200, 22 postings, **20 with `location.country == "IL"`**. Titles are Hebrew:
כלכלנ/ית (economist), מנהל/ת חשבונות (bookkeeper), מזכיר.ת משרדי הנהלה (executive-office secretary),
מנהל.ת תכנון (planning manager), מנהל.ת תפעול ואחזקה (operations and maintenance manager),
מתאם.ת פרויקטים (project coordinator).

One detail matters for ingestion and I verified it in our code rather than assuming: Melisron's
`location.name` values are Hebrew mall names with **no city token** ("אביב מליסרון", "עופר ביל\"ו סנטר").
Any location-string matcher misses all 20. `fetchComeet` (`ats-fetchers.ts:945`) reads
`loc.country` into `structured_country`, so **production ingests this correctly with no change.**
Only my own probe needed fixing. Flagged because it is a trap for any future Hebrew-tenant work.

### 2c. Teva, one of Israel's largest employers, is fetching zero

Not in the table above because it is **blocked, not addable**, but it is the most consequential
thing found tonight.

The registry has Teva as `successfactors / careers.teva`. Probed live:
- `https://careers.teva/sitemal.xml` -> **HTTP 404**. The configured endpoint does not exist.
- `https://www.careers.teva/careers` -> HTTP 200, 286KB, fingerprints **Eightfold**
  (`static.vscdn.net`, `eightfold.ai`).

Teva migrated to Eightfold and the registry row was never updated, so a top-tier Israeli employer
contributes nothing. Eightfold is not a supported rail. See section 5.

### 2d. Two corrections to PR #844, and a real normalization gap

**#844 said Trigo and Gloat are "genuinely not hiring in Israel". That was wrong.** Both are hiring;
their registry rows point at SmartRecruiters slugs that are not really theirs.

The cause is a SmartRecruiters API property I did not know when I wrote #844:
`/v1/companies/<slug>/postings` returns **HTTP 200 with `totalFound: 0` for ANY string**, including
slugs that do not exist. A 200 is therefore not evidence that a tenant exists, and "0 IL" from that
endpoint is not evidence of anything. Re-probed:

- **Trigo** - registry `smartrecruiters/trigo` is TRIGO Group, a French industrial-services firm
  (152 postings). Trigo the Israeli computer-vision company is on **Comeet A6.005: 2 IL** (Data
  Engineer, Product Manager).
- **Gloat** - registry `smartrecruiters/gloat` is a junk tenant: 5 of its 7 postings are literally
  titled "Test Job 01" through "Test Job 06", in London and Manchester. Gloat is on
  **Comeet E5.000: 1 IL** (Growth Marketing Lead, AI-Native).

Any registry SmartRecruiters row showing zero should be treated as unverified, not as a zero.
There are 8 such rows; Bosch, Continental, Western Digital and ironSource are the untested ones.

**PhaseV is a genuine normalization gap, not a registry fix.** Its greenhouse slug is correct and
already in the registry, but 3 of its 14 postings carry the location string `Dereck Ha'SHalom St 4`
(Derech HaShalom Street, Tel Aviv) with no city, region or country token anywhere. No city-name
matcher can catch that, including production's `IL_CITY_MAP`. The greenhouse `offices[]` array does
carry "TLV Office", but `jobs?content=false` omits it. Recovering these needs a join against
`/v1/boards/<slug>/offices`. 3 jobs is not worth building for on its own; recorded because the same
join would likely recover a tail across the other 113 greenhouse rows.

## 3. The one code change this batch would need

Mobileye needs the Lever fetcher to reach the EU host. Options, cheapest first:

1. **On 404 from the US host, retry once against `api.eu.lever.co`.** Two lines, no schema change,
   self-healing for any future EU tenant. Costs one extra request only for tenants that 404 today.
2. Add an optional `api_host` field to the registry row and have `fetchLever` honour it. Cleaner
   but touches the registry schema, which raises the review bar.

I recommend (1) and did not build it. Per the mandate, fetcher work ships as its own HELD PR and is
never run against prod; nothing here has been implemented or deployed.

Everything else in the table needs zero code.

## 4. Excluded: 7 rows with real IL jobs that must NOT be added

Endpoint-level dedup, the standing rule since the CrowdStrike / Adaptive Shield case. Each of these
has live Israeli jobs, and adding any of them would double-count against a row we already have.

| Candidate | Board found | IL | Why excluded |
|---|---|---:|---|
| Aim Security | greenhouse `catonetworks` | 44 | Acquired by Cato Networks, already in registry and active |
| Orbotech | workday `kla/Search` | 124 | Acquirer KLA, already in registry. Would double-count all 124 |
| Qwak | greenhouse `jfrog` | 9 | Acquirer JFrog, already in registry |
| Laminar | greenhouse `rubrik` | 3 | Acquirer Rubrik, itself a **pending add in #843**. Cross-batch catch |
| Outbrain | greenhouse `teads1` | 6 | Rebranded to Teads; registry already has a Teads row on `teads1` |
| Carbyne | greenhouse `axon` | 4 | Acquired by Axon, already in registry |
| Veza | smartrecruiters `ServiceNow` | 6 | Acquired by ServiceNow, already in registry on Workday |

The Laminar case is the one to notice: it dedups against a row that **is not merged yet**. Without a
cross-batch ledger this would have shipped as a double-count.

Registry hygiene spotted while doing this: the registry still carries a stale `Outbrain[outbraininc]`
row alongside the live `Teads[teads1]` row. Worth a cleanup pass, not urgent.

## 5. Fetcher-demand tally (bar: 4+ live Israeli tenants)

Accumulated from this batch. **Nothing is proposed for build yet** - the Eightfold case is close and
a dedicated census is still running.

- **Eightfold** - the strongest case by far, because of *who* is on it, not how many. Confirmed
  tenants: **Teva** (major IL employer, currently fetching zero), **Amdocs** (major IL employer,
  registry `unknown`), Qualcomm, Netflix. Prior runs also named Morgan Stanley, Infineon, Boston
  Scientific. This looks over the bar on count and well over it on IL value. **Recommend a census
  before building**, not a build.
- **Deel ATS** (`jobs.deel.com/<slug>`) - ExpressVPN 8 IL, Deel 6 IL, both sales/marketing-heavy.
  2 tenants. Under the bar but unusually business-dense.
- **Rippling** (`api.rippling.com/platform/api/ats/v1/board/<slug>/jobs`, plain JSON) - Rhino
  Federated Computing 4 IL. 1 tenant, but the cheapest rail to implement of anything seen tonight.
- **Niloosoft "Hunter HRMS"** (`*.hunterhrms.com`) - Hebrew University, Shaare Zedek. 2 tenants,
  Israeli institutional. No JSON API found.
- **Adam Total** - Harel Insurance, Tempo Beverages. 2 further tenants beyond the 11 rows we already
  fetch on our existing `adamtotal` rail. Server-rendered HTML, no JSON feed.
- Phenom (RTX, Thales, BAE), Teamtailor (SABON, Vicarius), Recruitee (Wallarm), HiBob (Oosto),
  BambooHR (Wisor), Oracle Recruiting Cloud (Discount Bank), Avature/BrassRing (Lockheed, Synopsys),
  Dayforce (Elbit America), Beamery (Atlassian). All at 1-3 IL-relevant tenants. Under the bar.

## 6. Agent claims I re-probed and corrected

Recorded because the discipline is the point, not because the agents were careless.

1. **"Greenhouse IL matching is broken in production."** An agent reported that `location.name`
   values like `"TLV"` and bare street addresses cause production to miss Israeli jobs, and
   estimated 4 recoverable roles. **Partly wrong.** `scripts/lib/normalize.ts:170` defines
   `IL_CITY_MAP`, which is substring-matched and already contains `tlv -> Tel Aviv` plus Hebrew city
   names. Production handles the Bringg "TLV" case correctly today. The real, much smaller gap is
   bare street addresses with no city token (PhaseV). No production bug; no fix proposed.
2. **"Votiro is a slug collision."** I reported this in #844 from the returned apply URLs. A re-check
   is more precise: `votiro.com/careers` **301s to menlosecurity.com**. It is an **acquisition**, not
   a collision. #844's remediation (correct or drop the row) is unchanged, but the reason is
   different and the doc there should say so.
3. **`boards-api.eu.greenhouse.io` does not exist** (NXDOMAIN). I had stated it as a valid endpoint
   shape in the agent brief; that was my error. Two agents independently caught it. Its only
   practical consequence is the BeamUp repair, which is in the table above.

## 7. Honest caveat on my own numbers

My sweep tool matches Israel by location **string**. Production's `normalize.ts` is materially
better: `IL_CITY_MAP` plus region maps plus Hebrew names plus a country field on several rails.
So **my IL counts are a floor and my dormancy figures are an overcount.** Concretely, #844 reported
Philips at 15 IL from a searchText probe; re-probed via the Workday location facet it is **23**
(Israel 22 + Israel - Home Based 1). #844 should be read with that correction.

Where a rail exposes a structured country field, I used it (Comeet `location.country`,
SmartRecruiters `country=il` facet, Workday location facet). Where it does not, the number is a floor.

## 8. Cost

INFERRED, not measured. 19 rows on existing rails, mostly small boards: **~+45-70s** nightly.
Mobileye is the exception - 129 postings with description enrichment, call it **+15-25s** on top,
and it only runs if the EU-host change ships. Against ~880s of headroom on a 10m17s nightly run,
immaterial.

## 9. Asks (all Eli's gate; nothing auto-promoted)

1. **Promote the 19 zero-code rows** from `batch3-quick-add-DRAFT.json`. 15 are in-place edits to
   existing rows, 4 are appends (Melisron, Glow, Ocean, ABB Israel). Data-row change: needs a clean
   `schema-validator` run plus the live-validation evidence in this doc.
2. **Rule on the Lever EU-host change** for Mobileye. 112 IL jobs behind a two-line retry.
3. **Rule on an Eightfold census**, which Teva and Amdocs alone probably justify.
4. **Confirm the Alta domain mismatch** (registry `alta.ai` vs board `careers.altahq.com`). Flagged,
   deliberately not resolved by me.
5. Note the stale `Outbrain[outbraininc]` row for a future cleanup pass.

## 10. Not claimed

- No number here is production's number; see section 7. All are floors.
- Teva/Amdocs are **not** counted in the 191. They are blocked on Eightfold.
- The 7 excluded rows' IL jobs are **not** new supply. They are already ingested under the
  acquirers' rows, which is exactly why they are excluded.
- Mobileye's 112 are not addable until the EU-host change ships.

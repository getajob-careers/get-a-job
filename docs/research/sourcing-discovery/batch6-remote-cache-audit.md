# Batch 6 - the remote lane, measured across everything we fetch (2026-07-28)

RESEARCH ONLY. No code. `companies_il.json` untouched. Nothing deployed. HELD.
**No ruling requested in this doc.** It is deliberately a measurement plus a proposal design,
parked until Eli surfaces from the P0.

Vein 1b of the morning run: audit how much genuinely IL-hireable remote supply we already reach but
drop, quantify it, sample it with evidence, and design the normalization change with its blast radius.

Arc: #837, #843, #844, #845, #846, #847.

---

## 0. Headline

The question has been reopened three times. Here is the measurement that should close it.

Across **every board we fetch** (781 boards, **35,485 live postings**), the number of postings whose
location names a region that contains Israel and excludes nothing is **263**, or **0.77% of all
postings we see**. That figure independently reproduces the "honest ~0.7%" estimate that has been
carried as folklore in this lane.

Two things make the real number smaller than 263, and both are visible in the evidence sample:

1. **176 of the 263 (67%) are one employer, Canonical**, whose willingness to employ in Israel is
   *unverified*. Strip Canonical and the entire rest of the internet-facing supply we already reach
   is **87 postings**.
2. Of a 24-posting sample, **5 are evergreen talent pools rather than jobs** and **7 are
   territory-specific roles mislabelled EMEA**. That is half the sample that would be actively
   harmful to ingest.

**Honest residue: on the order of 100 postings, of which the largest block needs a policy check on a
single employer.** That is not a volume lever. It is a correctness question worth ~1-2% of the cache.

## 1. A framing correction that changes what this audit even is

The brief asked how many roles we ALREADY HOLD that are IL-hireable remote but normalized to IL:0 and
hidden. Measured against the live table, that set is **empty**:

| is_il | is_remote | rows | **active** |
|---|---|---:|---:|
| false | false | 228 | **0** |
| false | true | 33 | **0** |
| true | false | 8,055 | 4,571 |
| true | true | 2,576 | 1,573 |

**261 non-IL rows exist and not one is active.** Non-IL postings are dropped at ingestion and never
persisted, so there is no hidden pool sitting in the cache waiting to be unhidden. The supply this
vein is looking for is **upstream of the cache**: postings on boards we already fetch that never
survive normalization.

That is why this audit went back to the live boards rather than querying the jobs table. It also means
the proposed change is an *ingestion* change, not a *display* change, which materially raises its
blast radius.

## 2. The is_remote flag is noise and the proposal must not touch it

The known comeet problem, now quantified per rail against the live cache. "Corroborated" means the
posting's own location text also says remote/hybrid/anywhere.

| Rail | active | flagged is_remote | % flagged | corroborated by location text | flag reliability |
|---|---:|---:|---:|---:|---|
| **comeet** | 3,046 | 1,406 | **46.2%** | **39** | **2.8% - noise** |
| **ashby** | 203 | 116 | **57.1%** | 15 | **13% - noise** |
| **workable** | 100 | 22 | 22.0% | 0 | **0% - pure noise** |
| greenhouse | 884 | 24 | 2.7% | 24 | **100% - trustworthy** |
| lever | 113 | 4 | 3.5% | 1 | 25% |
| workday | 641 | 1 | 0.2% | 1 | 100% |
| successfactors / adamtotal / amazon_jobs / smartrecruiters / pwc | 1,157 | 0 | 0% | - | n/a |

Cache-wide: **1,573 of 6,144 active rows (25.6%) carry is_remote**, but only **80 are corroborated
(1.3%)**. The 25.6% headline is almost entirely comeet's and ashby's structural flag, which they set
on any posting with a remote-eligible location record regardless of whether the role is remote.

**Design consequence, and it is the single most important line in this doc: the normalization change
must derive remote-eligibility from the location TEXT, never from the structural flag.** A change that
trusted `is_remote` would "unlock" 1,406 comeet rows of which ~39 are real, i.e. it would manufacture
~1,370 false positives. That is the failure mode this vein keeps circling, and it is why the previous
passes were right to leave it alone.

## 3. What the 263 actually are (evidence sample, one posting per board)

| Company | Registry type | Title | Location string |
|---|---|---|---|
| Canonical | international_il_rd | Accountant | `Home based - EMEA` |
| Remote.com | international_il_rd | Accountant | `Remote-EMEA` |
| Welocalize | international_il_rd | Circinus - Audio Contributor English | `Global` |
| Coinbase | international_il_rd | Analyst, Business Controller | `Remote - EMEA` |
| Dash0 | israeli_founded | Enterprise Solution Architect - EMEA | `EMEA - Remote` |
| Prismic | international_il_rd | Senior Customer Success Manager | `Work from anywhere (Europe)` |
| Bright Data | israeli_founded | Experienced Backend JavaScript Developer | `Bright Data - Worldwide` |
| Singular | israeli_founded | Account Executive | `EMEA Remote` |
| ControlUp | israeli_founded | Technical Relationship Manager, EMEA | `EMEA - General` |
| Appnext | israeli_founded | Senior Sales Manager - EMEA | `EMEA` |
| GitLab | international_il_rd | Business Development Representative | `Remote, EMEA; Remote, Germany; ...` |
| **Tulip** | international_il_rd | **DACH Regional Sales Lead** | `EMEA - Remote` |
| **Zafran** | israeli_founded | **Regional Sales Manager (United Kingdom)** | `EMEA Remote` |
| **KELA** | israeli_founded | **Channel Sales Manager (Germany)** | `KELA EMEA` |
| **Vast Data** | israeli_founded | **Senior Sales Engineer-Benelux** | `EMEA` |
| **WEKA** | israeli_founded | **Channel Sales Manager, DACH** | `EMEA Remote; Munich, Germany` |
| **Drata** | israeli_founded | **Corporate Counsel - UK** | `Remote - EMEA` |
| **Netafim** | israeli_founded | **Finance Manager - West Europe** | `EMEA` |
| *Allot* | israeli_founded | *Join our EMEA Talent Pool* | `EMEA` |
| *Pentera* | israeli_founded | *We are always looking for the best talent* | `Global` |
| *Candex* | israeli_founded | *Join Our Talent Pool* | `Global` |
| *AvaTrade* | international_il_rd | *AvaTrade Talent Community* | `Worldwide IL` |
| *Elastic* | international_il_rd | *Join Elastic's Global Talent Community* | `Distributed, EMEA` |
| OPSWAT | international_il_rd | Director of Engineering, MetaDefender | `AMER - Remote; EMEA` |

**Bold = territory-specific role mislabelled EMEA** (7 of 24). The location says EMEA; the title says
DACH, UK, Germany, Benelux or West Europe. Ingesting these would show an Israeli business student a
"remote" job that is actually a UK or German territory role. Actively misleading.

*Italic = evergreen talent pool, not a job* (5 of 24). Ingesting these pollutes the cache with
non-openings.

Only about **11 of 24** are plausibly what this vein is hunting, and even those need eligibility proof.

### One genuine normalization bug spotted in passing

AvaTrade's location string is literally **`Worldwide IL`** and contains the country code, yet it did
not match as Israel. Whatever else is decided, a string containing an explicit `IL` token should
resolve to Israel. Single posting, and it is a talent pool so it should be filtered anyway, but the
matcher gap is real and cheap.

## 4. A segmentation that makes the proposal tractable

The sample shows the population splits cleanly, and the split is more useful than the raw count:

- **Israeli-founded company posting an EMEA/Global role.** 14 of the 26 candidate boards are
  `israeli_founded`. For an Israeli company, an EMEA-scoped role is often *based* in Israel or at
  minimum open to it. This is the high-confidence segment and it needs no per-employer policy
  research, only a talent-pool and territory filter.
- **Foreign company posting an EMEA/Global role.** Canonical, Remote.com, Coinbase, GitLab, Elastic,
  Prismic, Tulip, Welocalize, OPSWAT. Here EMEA is a genuine geographic technicality and eligibility
  is a **per-employer policy fact** that must be read from a public source. Canonical alone is 176 of
  the 263 and I have not read its hiring policy, so I am not claiming it.

This is the same conclusion #844 reached from a smaller sample, now with the whole population behind
it: **do not teach the parser that EMEA means Israel.** Do it per employer, with evidence.

## 5. Proposal design (NOT a build request; parked for Eli)

Shape, cheapest-first, with the pieces that must NOT be built called out:

1. **Filter evergreen talent pools out of ingestion regardless of this vein.** Titles matching
   `talent pool|talent community|always looking|join our team|general application|spontaneous`
   with no specific role. This is a small correctness win that stands on its own merits, is
   independent of the remote question, and removes ~20% of the candidate set.
2. **Filter territory-mislabelled roles.** If the location says a region but the TITLE names a
   specific non-Israel territory (DACH, UK, Benelux, Nordics, Iberia, France, Germany, a named
   non-IL country), it is not IL-hireable. Removes ~30% of the candidate set.
3. **An explicit employer allowlist**, keyed on company, not on string. A company enters it only with
   a quoted public hiring-policy source stating Israel or a timezone/region band that includes it.
   Current confirmed membership: **PostHog** (public handbook, GMT+2 to GMT-8, do-not-hire list
   excludes Israel), from #837. That is a membership of one. Canonical is the obvious candidate to
   research next because of its 176 postings.
4. **The Israeli-founded shortcut**: for `type == israeli_founded` companies, treat an EMEA/Global
   location as IL-eligible after filters 1 and 2. Defensible because the employer already employs in
   Israel, so employment mechanics are not the blocker. Worth ~40-60 postings.
5. **Do NOT** trust `is_remote` / `isRemote` at any point (section 2).
6. **Do NOT** add EMEA/Worldwide to `IL_CITY_MAP`. That would reclassify every future EMEA posting
   from every employer forever, with no eligibility basis.

### Blast radius

- **Upper bound if everything ships including Canonical: +263 postings on 6,144 active = +4.3%.**
- **Realistic, after talent-pool and territory filters and without a Canonical policy ruling:
  roughly +90 to +130 postings, or +1.5% to +2.1%.**
- Filters 1 and 2 are *subtractive* and would also remove existing junk from the cache. I have not
  measured how many current active rows are talent pools; that is a follow-up.
- Risk if done wrong: trusting `is_remote` would add ~1,370 false rows (+22%), and every one of them
  would be a job an Israeli student cannot actually take. **The downside is much larger than the
  upside**, which is the real reason this lane has correctly deferred it three times.
- Fetch-time cost: **zero.** No new endpoints. This is normalization logic on postings we already
  retrieve and currently discard.

## 6. Verdict

**The prior conclusion survives, now with the whole population measured rather than a sample.** The
remote lane is not a volume lever: 0.77% of everything we fetch, two-thirds of it one unverified
employer, and half of a representative sample either not-a-job or not-actually-remote.

What has changed is that we now know its exact shape, so it can be treated as a bounded correctness
task worth ~1.5-2% of the cache, with a clear list of things not to do. Recommend it stays parked
below the three fetcher rails from #846, which are worth ~300 IL jobs against this vein's ~100.

## 7. Not claimed

- 263 is a strict count. A looser reading that accepts multi-region strings such as
  `Home Based - APAC; Home based - EMEA` puts it near 335. I report the strict figure and the range.
- **Canonical's 176 postings are NOT claimed as IL-hireable.** Its hiring policy is unread.
- No eligibility text was quoted from posting bodies in this audit; it works from location strings
  and titles. The quoted-eligibility work is the separate remote-vein sweep (1a), still in flight.
- The `is_remote` corroboration test uses location text as a proxy for truth, which is itself
  imperfect; it establishes the flag is unreliable, not the exact true remote count.
- No code was written or proposed for merge. Nothing here is a ruling request.

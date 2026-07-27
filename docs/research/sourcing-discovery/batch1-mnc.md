# Sourcing Batch 1 - Vein 1 (multinational IL offices/R&D absent from registry)

RESEARCH-ONLY. Docs-only, HELD for Eli's promotion. Registry not mutated. Rolling-batch cadence:
this is batch 1 of an ongoing sweep; a running dedup ledger prevents cross-batch collision.

Method: 4-agent systematic enumeration of foreign multinationals with Israeli sites (enterprise-software,
hardware/semis, finance/consulting, pharma/consumer), then COORDINATOR RE-PROBE of every survivor against
the live ATS API. No agent's word is evidence. Dedup on name, domain, AND ATS endpoint (Workday host grep
against the 40 hosts already in the registry, so acquisitions do not slip through as net-new).

Skew tag (BUSINESS / MIXED / ENG) is informational for Eli, NOT a rank and NOT a filter. Every verified
net-new ingestible company ships, none demoted. Business weight only informs which vein to dig next.

## VERIFIED net-new class-A (addable now, existing fetcher covers the rail) - 14 companies, ~34 current IL jobs

Each row: board endpoint, HTTP status, live IL count (coordinator re-probe this session), ATS, skew tag.
Workday IL counts are a FLOOR (production runs 11 city search-terms + a facet path and dedups; my probe
mirrors it but a location-only match undercounts "N Locations" multi-loc jobs - so production catches >= this).

| # | Company | Domain | ATS | Board endpoint | HTTP | IL (floor) | Skew tag |
|---|---------|--------|-----|----------------|------|-----------:|----------|
| 1 | Edwards Lifesciences | edwards.com | workday | edwards.wd5.myworkdayjobs.com/EdwardsCareers | 200 | 11 | ENG/MIXED |
| 2 | MSD (Merck ex-US) | msd.com | workday | msd.wd5.myworkdayjobs.com/SearchJobs | 200 | 5 | MIXED |
| 3 | NXP Semiconductors | nxp.com | workday | nxp.wd3.myworkdayjobs.com/careers | 200 | 4 | ENG |
| 4 | Rubrik | rubrik.com | greenhouse | boards-api.greenhouse.io/v1/boards/rubrik | 200 | 3 | MIXED |
| 5 | Eli Lilly | lilly.com | workday | lilly.wd115.myworkdayjobs.com/LLY | 200 | 2 | BUSINESS |
| 6 | Micron | micron.com | workday | micron.wd1.myworkdayjobs.com/External | 200 | 1 | ENG |
| 7 | GlobalFoundries | globalfoundries.com | workday | globalfoundries.wd1.myworkdayjobs.com/External | 200 | 1 | ENG |
| 8 | Deutsche Bank | db.com | workday | db.wd3.myworkdayjobs.com/DBWebsite | 200 | 1 | BUSINESS |
| 9 | BlackRock | blackrock.com | workday | blackrock.wd1.myworkdayjobs.com/BlackRock_Professional | 200 | 1 | MIXED |
| 10 | AstraZeneca | astrazeneca.com | workday | astrazeneca.wd3.myworkdayjobs.com/Careers | 200 | 1 | BUSINESS |
| 11 | Bristol Myers Squibb | bms.com | workday | bristolmyerssquibb.wd5.myworkdayjobs.com/BMS | 200 | 1 | BUSINESS |
| 12 | Gilead Sciences | gilead.com | workday | gilead.wd1.myworkdayjobs.com/gileadcareers | 200 | 1 | BUSINESS |
| 13 | Pfizer | pfizer.com | workday | pfizer.wd1.myworkdayjobs.com/PfizerCareers | 200 | 1 | BUSINESS |
| 14 | Proofpoint | proofpoint.com | workday | proofpoint.wd5.myworkdayjobs.com/ProofpointCareers | 200 | 1 | ENG |

Registry-shaped draft rows: `batch1-mnc-quick-add-DRAFT.json` (name/type/domain/careers_url/ats/slug/api_url/
verified filled; skew tag + verified IL count stamped). Promotion is Eli's manual gate.

Note on Deutsche Bank: an agent saw ~120 IL-tagged roles on LinkedIn; my production-faithful probe of the
DBWebsite Workday board finds IL floor 1 today. I report the verified floor, not the unverified LinkedIn number.

## Rail-present but IL:0 right now (optional adds - your call)

Net-new, endpoint-clean, on a supported rail, but zero IL-located jobs at probe time. Adding them means the
nightly catches future IL roles at the cost of one more board fetch for currently-zero yield.
- GSK - gsk.wd5.myworkdayjobs.com/GSKCareers (200, IL 0 now; an agent saw a KAM Respiratory role that my
  location-pattern did not match - possible production IL-pattern gap OR the role was filled).
- Sanofi - sanofi.wd3.myworkdayjobs.com/SanofiCareers (200, IL 0 now).

## Class-B fetcher-demand tally (known ATS, NO fetcher today - the "which fetcher next" case)

Not addable now; recorded because these carry real IL volume behind unsupported rails.
- **iCIMS** - **MaxLinear** (100+ IL VLSI/RF, the single biggest IL volume surfaced this batch) + Morgan
  Stanley (IB internships). Two IL tenants now; strongest new fetcher-demand signal.
- **Phenom** - **Intuit** (~13 IL, Petah Tikva, incl Senior Product Manager + Senior Product Designer -
  strongest business/product skew of the whole sweep) + PepsiCo (from PR #837). Two tenants.
- **Eightfold** - Morgan Stanley, Infineon (Netanya), Boston Scientific.
- **Oracle/Taleo** - JPMorgan (Ra'anana innovation centre), Nokia (Kfar Saba Bell Labs), Honeywell.
- **Jobvite** - Nutanix (~9 TLV).
- **tal.net** - Morgan Stanley.

Highest-value if a fetcher is ever built: iCIMS (MaxLinear volume) and Phenom (Intuit product roles + PepsiCo).
None yet clears the standing 4+-live-IL-tenant bar on its own; flagged for accumulation across batches.

## Near-misses flagged for Eli (not silently resolved)

- **Siemens Healthineers** (siemens-healthineers.com) is a distinct entity that normalizes near the registry's
  "Siemens" entry - fold-or-split call is yours.
- **HP Inc** (net-new, in PR #837) vs **HPE** (already in registry) - distinct companies, same brand root.
- **AbbVie** - Workday board is HTTP 401 auth-gated, not probeable. Dropped, not guessed.

## Dropped (endpoint/name/domain dups, or verified-dead) - so they are not re-mined

CrowdStrike (=Adaptive Shield endpoint, PR #837). AMD/Qualcomm/Marvell/Dell/Samsung/Juniper(=HPE)/
Splunk(=Cisco)/VMware(=Broadcom)/Cato/Commvault/Workato - already in registry. American Express - IL office
shut down and laid off July 2025 (Calcalist), no longer valid. Visa/S&P/Fidelity Intl/Fiserv/FIS/Roche/Stryker/
Amgen/UiPath/Rapid7/Netskope/Qualtrics et al. - probed live at IL:0. Israeli-origin cyber (Transmit Security IL:12,
Axonius IL:7, Sweet Security IL:6, BigID) - out of this foreign-MNC vein, routed to the fresh-IL-startup vein.

## Added nightly fetch-time estimate (job cap 25 min; last run 10m17s)

13 Workday + 1 Greenhouse. Greenhouse ~1 request. Each Workday board = the production 11-term (+facet) IL-narrowed
query set, ~11-20 small requests for these mostly-small IL tenants. Serial-equivalent added time ~90-120s;
wall-clock add at current nightly concurrency ~10-20s. Comfortable against the ~880s headroom under the 25-min cap,
but tracked because batches compound - roughly +10-20s wall-clock per ~14-company batch of this shape.

## Running dedup ledger

`scratchpad/PROPOSED-LEDGER.tsv` now holds 27 proposed companies (PR #837: 13; Batch 1: 14), keyed by name +
domain + board-endpoint. Every future batch dedups against it so batches cannot collide.

## Resume point

Vein 1 batch 1 shipped (HELD). Vein 1 is NOT exhausted (agents dropped many IL:0-now MNCs worth a later re-probe:
Roche, BD/EXTERNAL_CAREER_SITE_ISRAEL, Stryker, Amgen, Visa, Walmart, Morgan-Stanley-when-a-fetcher-exists).
Next per vein order: Vein 2 (dormant-registry migration sweep - EY alive/timing-out, Teva->Eightfold,
Qualitest->Workable pattern; find companies that moved ATS and look dead). Then Vein 3 (fresh IL startups on
Comeet/Ashby). Getro (Vein 4) still awaits Eli's ToS ruling. No fetcher code without a ruling.

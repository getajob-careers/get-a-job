# TheirStack + ATS-technographics alternatives — research note

**Date:** 2026-06-12
**Verdict:** HOLD the spend. No purchase now.

## Why this was researched

R1 detection crawl (PR #312) returned 0.6% ATS hit on the 162 high-priority
seed batch (Dun's 100 / BDI / TheMarker sector rankings) — the Israeli
traditional-economy hires off AllJobs/Drushim, not Western ATS rails.
TheirStack technographics surfaced as one of the candidate pivots: if
TheirStack has a clean IL slice tagged by ATS, we could short-circuit the
discover-r1 crawl by seeding directly from their tagged-by-tech company
lists.

## Hold rationale (for the record)

1. **Free tech-seed list is in progress** (research agent). Against an
   Israeli-tech-startup population, the same crawler we already have
   (`scripts/discover-r1.ts`, scripts/discover-ats-companies.ts) may
   deliver the same candidates for $0. Run that first; revisit
   TheirStack only if the free crawl underdelivers.
2. **30-day deletion clause requires legal review.** Open question: do
   registry rows built from OUR OWN first-party probe of each
   candidate's public board (with TheirStack used as a discovery-pointer
   only and the TheirStack export purged within the 30-day window)
   survive subscription termination? That distinction — TheirStack as a
   pointer vs TheirStack as the source of record — needs an answer
   before any spend.
3. **Revisit the $109 one-shot only if** (a) the free crawl
   underdelivers AND (b) legal clears the discovery-only pattern.

## Findings (preserved here so a future revisit doesn't re-research)

### TheirStack pricing

| Tier | Cost | Credits | Notes |
|---|---|---|---|
| App free | $0 | 50 company credits one-shot | ~16 companies (3 credits/company) |
| API free | $0 | 200 credits/month | ~66 companies/month |
| API entry | $59/month | 1,500 credits/month | ~500 companies/month |
| App credits | $109 one-shot | 1,000 credits | ~333 companies one-shot |
| API scale | $1,500/mo | 1M credits | not relevant for this scope |

Cost: 3 credits per company across all tiers.

### Israel ATS coverage observed (public tech pages, no account)

| ATS | Total companies | IL companies | Our registry | Likely net-new IL |
|---|---:|---:|---:|---:|
| Comeet | 1,164 | **254** | 225 | ~29 max (high overlap → 10-20 real) |
| Greenhouse | 29,989 | **<52** | 199 | 30-40 → probably net-zero |
| Workday | 68,881 | **<264** | 37 | 50-150 → **50-100 net-new plausible** |
| Lever | 11,459 | **<77** | 25 | 30-50 → 5-25 net-new |
| Ashby | 8,640 | **<61** | 68 | 30-50 → probably net-zero |

Realistic net-new total: **75-200 IL companies across all ATSs.** At our
observed ~5 IL jobs/company yield (current corpus), roughly **400-1000
net-new IL jobs.**

### Sample IL companies on Comeet (visible without login)

monday.com, ZIM Integrated Shipping Services, SodaStream International —
confirms the IL slice is real and discoverable.

### ToS — three relevant clauses

1. **Deletion clause (the blocker).** "Upon termination, cease all use
   of TheirStack data; delete or destroy all copies in its possession or
   control, including copies stored in backups, CRM systems, data
   warehouses, or any third-party systems" within 30 days. Incompatible
   with permanently committing TheirStack-derived rows into
   companies_il.json — unless we tag imported rows and have a future
   rip-out procedure for when (not if) we let the subscription lapse.
2. **No-redistribution-as-primary-value.** "...in a way that competes
   with TheirStack's primary business" + "not the sole or primary
   source of value." Use as one of many registry seed sources is
   defensible; use as the canonical company list is not.
3. **Public-without-login is forbidden.** Our pilot is authenticated
   (invite codes + Reichman login) so this clause doesn't bite — but
   public-facing splash pages must not show derived company-level data.

### Alternatives checked — both inconclusive via WebFetch

- **Apify ATS detector actors** — `apify.com/store` redirected to an
  internal Apify worker URL not reachable via WebFetch. Likely contains
  community-built ATS detector actors (Apify marketplace has hundreds
  of crawlers), but specific actor names, costs, capabilities weren't
  enumerable. Pricing model is typically pay-per-run ($0.25-$2 per 1k
  pages crawled). **Browser verification needed before any spend.**
- **BuiltWith** — `trends.builtwith.com/Comeet` widget returned empty
  content; `trends.builtwith.com/ats` 404'd. BuiltWith is the
  historical leader in technographics but starts at $295+/month for
  any meaningful access, $40k+/year for full database — **3-10x
  TheirStack's price** for marginal coverage gain.

## Cost vs yield matrix (preserved for the revisit)

| Option | Cost | Likely yield | Major caveat |
|---|---|---|---|
| TheirStack one-shot ($109) | $109 | 75-200 net-new IL companies → ~400-1000 jobs | 30-day deletion clause when we drop |
| TheirStack monthly ($59/mo) | $59 + ongoing | Same yield, refreshable | Same clause + recurring |
| Apify ATS actors | Unknown | Unknown | Per-tenant scrape, not pre-aggregated |
| BuiltWith | $295+/mo | Higher coverage probably | 3-10x TheirStack price |
| Free tier only | $0 | 16-66 sample companies | Inadequate sample for IL slice |

## Re-trigger conditions

Open this file again when EITHER:

- Free tech-seed crawl underdelivers (<3% net-new hit rate against the
  Israeli tech population — same threshold as the R1 lesson), AND
- Legal review clears the "discovery-pointer only, export purged
  in-window" pattern.

Both must be true.

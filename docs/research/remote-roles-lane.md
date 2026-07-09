---
title: Remote / English-eligible roles lane (PARKED)
status: parked
owner: eli
last_reviewed: 2026-07-10
---

# Remote / English-eligible roles lane

**Status: PARKED (2026-07-10).** Real but modest opportunity. Gated behind (1) a two-stage
eligibility classifier and (2) the Scoring Coverage Arc (scoring honesty). Not worth building
before scoring is honest - blending uncertain-eligibility remote roles into matching would worsen
the known fake-high / coverage-gap problem. Pick this up after the Scoring Coverage Arc lands.

## Why this exists

Our fetchers already see EVERY position on every registered board and drop the non-IL ones. Before
doing any new company discovery, the question was: how big is the remote / English-eligible slice we
are discarding, and is it worth surfacing? Answer: modest, and noisy to qualify.

## The funnel (count-only fetch across the registry, 2026-07-10)

Fetched 885 companies (the ones with a working fetcher; ~271 `unknown`-ATS rows have no board).
Non-junk positions seen: 6,699 IL (kept) + 38,588 non-IL (discarded).

```
38,588  non-IL positions discarded
 1,681  remote a+b candidates (location says remote + global/europe)
  ~440  plausibly-IL by location (~26%; still polluted with country-prefixed remotes)
~200-350  realistic net after de-noise + JD authorization/timezone checks
   ~3-5%  uplift on the current 6,699-job IL corpus
```

Discarded positions bucketed by location string:

| bucket                                       | count     |
| -------------------------------------------- | --------- |
| (a) global/unrestricted remote               | 774       |
| (b) EMEA/Europe remote                       | 907       |
| (c) region-restricted remote (US-only, etc.) | 3,217     |
| (d) hybrid/onsite non-IL                     | 33,633    |
| (e) unclassifiable                           | 57        |
| **a+b (remote candidates)**                  | **1,681** |

Per-ATS (a+b): greenhouse 1,244 (500a + 744b), ashby 244, comeet 136, lever 54, workday 3. The
remote slice is almost entirely greenhouse/ashby global SaaS.

Top-20 a+b companies by volume: Remote.com (194), LILT (147), Nebius (68), Zscaler (59),
ClickHouse (53), DoiT International (51), GitLab (49), HubSpot (46), xAI (45), Twilio (41), Wiz (41),
Cloudflare (40), Grafana Labs (39), Databricks (38), Welocalize (36), NICE Systems (27),
Webbing (26), K Health (24), Affirm (23), ChainGuard (23). Note: LILT and Welocalize are localization
vendors whose "remote" roles are per-language region jobs, mostly NOT globally IL-eligible.

## The core finding: location field alone is a very noisy signal

A 20-posting JD-body scan + a 400-sample location reclassification showed the a+b bucket is heavily
over-counted:

- **57% of a+b are EU-country-specific** ("Remote - Germany / Italy / UK") - need EU work
  authorization, so NOT IL-eligible despite saying "remote".
- Only **~26% are even plausibly IL-eligible by location** (truly-global "Remote" / "Distributed" /
  "Anywhere" + EMEA/Middle-East-inclusive), and that 26% is STILL polluted with country-prefixed
  strings ("Thailand, Remote", "U.S Remote", "Costa Rica-Remote").
- **The restriction usually lives in the location string, not the JD body** - a body-regex flagged
  only ~7% of a+b because "Remote - Colombia" already told you in the location field.
- Bare "Remote" / "Distributed" is the genuinely-ambiguous class that needs the JD body checked for
  authorization + timezone.

## Proposed model: `is_remote_il_eligible` (two stages, both required)

1. **Strict location parse** (necessary, not sufficient): keep only truly-global ("Remote" /
   "Anywhere" / "Worldwide" / "Distributed" with NO country/region qualifier) + EMEA/Middle-East-
   inclusive; reject country-specific remotes. Cuts 1,681 to ~250-440.
2. **JD-body check** (for precision): scan for work-authorization clauses ("authorized/eligible to
   work in the US/EU", "must reside in", "no visa sponsorship"), timezone-overlap requirements
   ("overlap with PST/EST/US hours"), and explicit country lists. Removes another ~7-15%.

- **Where it lives:** a POST-FETCH classifier (fetchers untouched) - a `normalize.ts`-adjacent step
  in `refresh-jobs.ts` writing an `is_remote_il_eligible` flag on non-IL rows.
- **Product surface:** eligibility stays uncertain even after both stages, so do NOT silently blend
  into the primary IL feed. A filter toggle ("Include remote roles") that surfaces them with a
  "Remote - verify eligibility" badge, or a separate feed/tab.
- **Scoring guardrail:** remote roles must NOT enter the core IL match score at full weight (uncertain
  eligibility + different global seniority norms would worsen fake-high / coverage-gap). Keep them
  down-weighted / badged / separate, and land the Scoring Coverage Arc first.

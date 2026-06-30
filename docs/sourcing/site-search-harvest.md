---
title: ATS Company Sourcing, Site-Search Harvest Playbook
status: living
owner: eli
last_reviewed: 2026-06-30
code_paths:
  - scripts/refresh-jobs.ts
  - scripts/lib/ats-fetchers.ts
  - scripts/discover-tech-xhr.ts
  - supabase/functions/_shared/libraries/companies_il.json
  - .claude/skills/schema-validator/
---

# ATS Company Sourcing: Site-Search Harvest Playbook

A repeatable quarterly process for growing the IL job supply by discovering companies that hire in Israel on the ATS platforms we already parse, then adding them to the fetch registry. Born from the June 2026 expansion that added 65 Comeet companies and 64 global-ATS companies for roughly 950 net active IL jobs.

Hard rule, unchanged: only ever read a company's own public board endpoints and the open web. Never job boards, never LinkedIn, never arbitrary career-page scraping for jobs.

## The five ATS surfaces

Each ATS exposes a public board host you can both search against (to find slugs) and fetch from (to read jobs, no auth except Comeet).

| ATS        | Board host (for site: search)                                    | Public jobs endpoint (api_url)                                                             | Token?                   |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------ |
| Greenhouse | `boards.greenhouse.io/{slug}`, `job-boards.greenhouse.io/{slug}` | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs`                                   | no                       |
| Lever      | `jobs.lever.co/{slug}`                                           | `https://api.lever.co/v0/postings/{slug}?mode=json`                                        | no                       |
| Ashby      | `jobs.ashbyhq.com/{slug}`                                        | `https://api.ashbyhq.com/posting-api/job-board/{slug}`                                     | no                       |
| Workable   | `apply.workable.com/{slug}`                                      | `https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true`                    | no                       |
| Comeet     | `comeet.com/jobs/{name}/{UID}`                                   | `https://www.comeet.co/careers-api/2.0/company/{UID}/positions?token={TOKEN}&details=true` | YES (per-company secret) |

## Step 1: Harvest slugs with site-search

Search engines index public board pages. Use the `site:` operator scoped to each board host plus an Israel term, and read the slug out of the result URL.

```
site:boards.greenhouse.io "Israel"
site:jobs.lever.co "Tel Aviv"
site:jobs.ashbyhq.com "Israel"
site:apply.workable.com "Herzliya"
site:comeet.com/jobs "Israel"
```

Beat the search-engine page cap. Google stops paginating after roughly 200-300 results for a query, so a single `site:host "Israel"` query under-harvests. Two tricks:

1. Query variants. Re-run with different IL terms to surface different result sets: `"Israel"`, `"Tel Aviv"`, `"Herzliya"`, `"Haifa"`, `"Ramat Gan"`, `"Petah Tikva"`, `"Raanana"`, `"Beer Sheva"`, `"Netanya"`, `"Yokneam"`. Union the slugs.
2. Bing (and DuckDuckGo). Bing paginates deeper than Google for `site:` queries and returns a different long tail. Run the same variant set on Bing and union again.

Extract the `{slug}` segment from each result URL. For Comeet, capture both the `{name}` and `{UID}` segments from `comeet.com/jobs/{name}/{UID}`. Dedup the harvested slug list itself before moving on.

## Step 2: Dedup against the FETCH registry (companies_il.json), not the DB

Two registries exist and they drift:

- `supabase/functions/_shared/libraries/companies_il.json` is what the nightly fetch actually reads (`scripts/refresh-jobs.ts` line ~44 `REGISTRY_PATH`). This is the source of truth.
- The Postgres `companies` table is a separate, cosmetic dataset. It is NOT read by the fetcher.

Dedup harvested slugs against `companies_il.json` only. Match on `slug` AND, for Comeet, on the UID (the UID can live in the `slug` field or inside an existing `api_url`). Then run a second pass by normalized company name and by domain to catch the same company already present under a different slug or ATS (e.g. a company on Lever that you re-found on Comeet). A slug-only dedup misses these.

## Step 3: Resolve the api_url

- Global ATS (Greenhouse, Lever, Ashby, Workable): no resolution needed. The slug is enough; build the `api_url` from the table above.
- Comeet: REQUIRES a per-company token, a server secret embedded in the company's own careers page. The token cannot be guessed and the account-ID namespace is NOT enumerable (probed and killed: hitting `/positions` with a UID but no/wrong token returns HTTP 400, and the hosted page falls back to the Spark Hire marketing site). Resolve it the only legitimate way: open the company's careers page (or `comeet.com/jobs/{name}/{UID}`) in the headless crawler (`scripts/discover-tech-xhr.ts` route) and capture the `comeet.co` XHR / social-iframe URL, which carries `company-uid` and `token` together. WP-plugin sites expose the same pair in page config; read it off the rendered DOM. Never guess a token.

## Step 4: Verify both directions (this is where supply is won or lost)

Hit each resolved `api_url` and count active roles located in Israel. Keep a company only if it has >= 1 genuinely IL-anchored role. Three filter caveats, all learned the hard way:

1. Illinois false positives. A bare `IL` token matches the US state. "Chicago, IL" and "Champaign, IL" are Illinois, not Israel. Match on Israel city names plus `Israel`, and only treat `IL` as the country code when it is NOT in the form `, IL` (which is almost always a US state). This correction dropped Speechify from a fake 45 to a real 21 and tsmg from 32 to 1.
2. Global-remote vs IL-anchored. A role whose location lists Israel among four or more countries (a pan-remote listing) is not an Israel job. Keep a role only if Israel is the location or one of at most ~3 locations (Israel + a hybrid/HQ). Drop companies whose only IL roles are global-remote.
3. Aggregators, gig boards, and staffing. The "never job boards" rule applies to discovered companies too. Drop boards that list other companies' jobs (job aggregators like jobgether, huzzle), mystery-shopper / field-marketing gig boards (cxg, tsmg), and virtual-assistant staffing (Wing). Tell them apart by eyeballing titles: real own-headcount boards have distinct varied roles under one company; aggregators repeat generic titles or name other companies. Note: real companies' own freelance/contractor listings (rater/linguist gigs at Appen, Toloka, Welocalize) are kept per ingest-everything-real, but tagged `freelance` in `notes` so the match scorer can weight them.

## Step 5: Write to companies_il.json

For each kept company, add (or update) an entry with these fields, matching the existing shape:

```json
{
  "name": "...",
  "type": "israeli_founded | international_il_rd | israeli_subsidiary",
  "industry": "...",
  "domain": "...",
  "careers_url": "...",
  "ats": "comeet|greenhouse|lever|ashby|workable",
  "slug": "...",
  "api_url": "...",
  "verified": true,
  "notes": "..."
}
```

Two requirements that are easy to miss:

- `verified` MUST be `true`. The fetcher filter is `c.verified && c.api_url && ENABLED_ATSS.has(c.ats)` (`scripts/refresh-jobs.ts` line ~339). An entry with a valid `api_url` but `verified: false` is silently skipped and produces zero jobs. This is the exact defect that left 9 companies (225 validated IL roles, including Deloitte 96 and Netafim 38) sitting dark after the first Comeet write; flipping `verified` to true recovered all of them. When you REPOINT or UPDATE an existing dead entry (custom/unknown ATS, no api_url), set `verified: true` on it too, not just `api_url`.
- Backfill `domain` and `industry`, no `UNKNOWN` placeholders. Resolve domains from the company's own site or, for Comeet/Partake-style cases, the apply URL host. If a domain genuinely cannot be confirmed (e.g. a stealth company with no public site), set the best candidate and tag `domain-unverified` in `notes` rather than guessing as if certain. The `domain` field does not affect fetching (the `api_url` drives that); it is display only.

Run the schema validator before opening the PR: `python3 .claude/skills/schema-validator/validate.py` must exit 0 with no new errors (it carries a known baseline of skill-xref warnings unrelated to companies). Per the team workflow, a domain-data-row change to `companies_il.json` may merge on Eli's review with live-validation evidence (the per-company IL counts) plus a clean validator run.

## Step 6: Confirm it landed against the DB, not the registry

The registry write is not proof. Trigger the fetch and check the live table:

```
gh workflow run refresh-jobs.yml --ref main   # after merge to main
gh run watch <run-id> --exit-status
```

Then query `jobs` for the new `company_slug` values and confirm `count(*) filter (where is_active and is_il) >= 1` for each. Flag any that came back 0 (fetch error, stale token, or the verified defect). Expect DB counts to run modestly below the verification counts: the fetcher's `is_il` classifier is stricter than the harvest-time regex, and boards shift between probe and fetch. That is conservative, not lossy. Netafim verifying at 38 and landing at 28 IL (with its Colombia/Brazil/India roles correctly stripped) is the filter working, not a miss.

## One-screen checklist

1. site: harvest each board host x IL-term variants x {Google, Bing}; pull slugs (and Comeet name+UID).
2. Dedup vs companies_il.json by slug + UID, then by name + domain.
3. Global ATS: build api_url from slug. Comeet: resolve token via headless careers page, never guess.
4. Hit api_url, count IL-anchored roles. Drop Illinois false positives, global-remote, aggregators/gig/staffing. Tag freelance.
5. Write entries with `verified: true`, real domain/industry (flag unverified), schema validator exit 0.
6. Merge, trigger refresh-jobs.yml, verify per-company IL counts in the `jobs` table, flag any 0.

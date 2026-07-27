# Workable multi-tenant investigation

Branch: `eli/workable-multi-tenant-investigation`. Read-only, no code changes.
Date: 2026-06-24. Trigger: Workable reached the 4+ IL-tenant multi-tenant ATS gate (lessons.md 2026-06-12 / commit 9defee7).

## Headline

The gate is already cleared: a generic Workable fetcher (`ats='workable'`) already exists and ships in production, with 10 Workable tenants registered today. So this is NOT a build decision; it is a registry-add for an existing adapter. Of the 5 candidate tenants, live verification yields 3 with current IL postings (Spines, Regatta, Visit.org), 1 dedupe (MetalBear, already registered under Comeet and its Workable account is empty), and 1 zero-IL (CropX, Bulgaria-only on Workable). Recommendation: GO for a registry-only add of Spines + Regatta, PARTIAL on Visit.org (its IL roles are freelance event-host gigs), skip MetalBear and CropX.

## Section 1: API endpoint and auth pattern

The production fetcher already uses the v1 widget endpoint, not v3. From `scripts/lib/ats-fetchers.ts:255-272`:

```
//   GET https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true
//
// The `?details=true` flag includes the full prose `description` inline
// (without it, we'd need a per-job detail roundtrip). Returns active
// postings only ... Per-job fields are flat (`city`/`state`/`country` are
// top-level, NOT nested under a `location` object), and the stable ID is
// `shortcode`, not `id` (there is no `id`).
```

- URL: `GET https://apply.workable.com/api/v1/widget/accounts/<slug>?details=true`
- Auth: none. Unauthenticated public widget endpoint (the same data the careers iframe loads). Confirmed live: every probed tenant returned HTTP 200 with a plain User-Agent, no token, no cookie. No anti-bot encountered.
- Response shape: a JSON object `{ "jobs": [ ... ] }`. No top-level paging/total/cursor keys (see Section 4).
- Per-job fields (flat, top-level), and how the existing fetcher maps them (`ats-fetchers.ts:275-311`):
  - `shortcode` (stable id, there is no `id`) to external_id
  - `title` to title
  - `description` (HTML prose, present because of `?details=true`) to description_html
  - `city` / `state` / `country` joined into a "City, State, Country" location string. `country` is a full NAME (for example "Israel", "Bulgaria"), not an ISO code.
  - `country` mapped to structured_country: `/^(israel|il)$/i` becomes "IL", otherwise the country name passes through.
  - `application_url` / `url` / `shortlink` to apply_url
  - `published_on` / `created_at` to date_posted
  - `telecommuting` boolean (or "remote" in the location string) to is_remote

## Section 2: Per-tenant live yield

Probed live 2026-06-24 against `https://apply.workable.com/api/v1/widget/accounts/<slug>?details=true`. IL counted by `country === "Israel"` (Workable returns the country NAME; there is no `country_code` field on this endpoint).

| Tenant    | slug      | HTTP | total jobs | IL jobs | sample (title, location)                                                                                     | disposition                   |
| --------- | --------- | ---- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Spines    | spines    | 200  | 19         | 1       | Legal Counsel - M&A, Herzliya, Israel                                                                        | ADD                           |
| Regatta   | regatta-3 | 200  | 5          | 5       | Frontend Engineer, Binyamina, Israel; QA Engineer and Architect, Binyamina; Documentation Manager, Binyamina | ADD (strongest)               |
| Visit.org | visit     | 200  | 142        | 2       | Freelance In Person Event Host - Tel Aviv; Freelance In Person Event Specialist - Tel Aviv                   | PARTIAL (freelance gig roles) |
| MetalBear | metalbear | 200  | 0          | 0       | none                                                                                                         | SKIP (dedupe + empty)         |
| CropX     | cropx     | 200  | 3          | 0       | Backend developer, Plovdiv, Bulgaria; Junior Developer, Plovdiv                                              | SKIP (0 IL)                   |

Notes:

- The slug `crop-x` returns HTTP 404 ("Not Found"); the working CropX slug is `cropx`, but it carries only 3 Bulgaria postings and 0 IL. CropX's IL R&D is sourced elsewhere, not on this Workable account.
- Aggregate addable IL yield: Spines 1 + Regatta 5 + Visit.org 2 = 8 IL postings across 3 new tenants.

## Section 3: Tenant independence

Confirmed independent companies, not the same parent rebranded and not post-acquisition stragglers on an old ATS:

- Spines (Aleph portfolio, Herzliya): AI-assisted self-publishing. The single IL posting is a corporate Legal Counsel role.
- Regatta (83North portfolio, Binyamina): deep-tech, with a real IL R&D footprint (Frontend, QA, Documentation roles, all Binyamina). The strongest of the three.
- Visit.org (Tel Aviv presence): a US-founded CSR / employee-engagement experiences SaaS. Its 142 global postings are mostly freelance event hosts; only 2 are IL (Tel Aviv freelance event host / specialist).

Regatta and Visit.org share 83North as an investor, but a shared investor is not a shared parent; they are distinct companies in different sectors. No acquisition overlap found. MetalBear is independent too, but already in our registry under Comeet (see Section 2).

## Section 4: Pagination pattern

No pagination. The widget endpoint returns the full active-postings array in a single response. Evidence: Visit.org returned all 142 jobs in one response, and no probed tenant exposed any `nextPage` / `next` / `paging` / `cursor` / `total` / `meta` key. The existing fetcher reads `data.jobs` once with no loop (`ats-fetchers.ts:273-274`), consistent with single-shot delivery. No cursor or offset handling is required.

## Section 5: Rate limit policy

Not published for this endpoint. The public-facing developer page (workable.com/developers, after the developers.workable.com 301 redirect) documents no rate limit (no requests-per-second, throttling, or 429 behavior). Workable's authenticated SPI API (which requires an access token, a different surface from the unauthenticated widget) is the only place Workable historically documents limits, and that does not govern the widget endpoint we use.

Expected load with our cron: one GET per tenant per nightly run, issued sequentially with the other ATS fetchers. With 13 Workable tenants (10 existing + 3 proposed), that is 13 requests per night against `apply.workable.com`. This is negligible and far below any plausible throttle. No backoff or pacing change needed.

## Section 6: Terms of Service analysis

Workable's public Terms (workable.com/terms) do NOT address programmatic access to public job listings. There is no clause on scraping, crawling, automated access, aggregation, or republishing public postings. The only adjacent clause is a general operational-integrity prohibition:

Section 4.5(c): the user must not use the Services to "do anything that could impair, interfere with, damage or cause harm to the operation of the Services."

The only API reference in the Terms is in the Definitions ("Professional Services" may include "integrations through a Workable API"), which describes Workable-offered services, not third-party access rights.

Verdict on ToS posture: UNADDRESSED. Aggregator-style ingestion of public postings is neither explicitly permitted nor explicitly prohibited. The only binding constraint is the general "do not impair the Services" clause, which our load profile (Section 5: 13 requests per night) does not approach. This matches the posture of the other public-widget ATS sources already in the cron (Greenhouse, Lever, Ashby, Comeet), which are likewise unaddressed-but-low-load.

## Section 7: Field completeness

Every RawJob required field maps cleanly from the Workable widget response, and the existing fetcher already implements the mapping (`ats-fetchers.ts:291-311`). Confirmed against the live payloads for Spines, Regatta, and Visit.org:

| RawJob field       | Workable source                         | present for the 3 add tenants                         |
| ------------------ | --------------------------------------- | ----------------------------------------------------- |
| external_id        | `shortcode`                             | yes (for example FD71A38A59, A21983B348)              |
| title              | `title`                                 | yes                                                   |
| description_html   | `description` (via `?details=true`)     | yes (full HTML prose inline)                          |
| location_raw       | `city, state, country` joined           | yes (for example "Binyamina, Haifa District, Israel") |
| structured_country | `country` name normalized to "IL"       | yes (country == "Israel" maps to "IL")                |
| apply_url          | `application_url` / `url` / `shortlink` | yes                                                   |
| date_posted        | `published_on` / `created_at`           | yes                                                   |
| is_remote          | `telecommuting` or "remote" in location | yes                                                   |

structured_country = "IL" is the load-bearing field: per the PR #387 country_code audit, Workable returning the country NAME ("Israel") lets the fetcher short-circuit the classifier to is_il=true, so these IL postings are not at risk of the city-only silent-drop tail.

## Section 8: Build complexity estimate

There is no build. The adapter exists and is registered.

- Single generic fetcher vs per-tenant: already a single generic fetcher (`fetchWorkable`, `ats='workable'`, registered at `ats-fetchers.ts:1660`). Per-tenant fetchers are not warranted; the widget endpoint is identical across tenants and only the slug varies.
- Lines of code added: 0. No fetcher change.
- New tests needed: 0 for the fetcher. The follow-up registry-add PR carries live-curl evidence (the standard data-row evidence bar), not unit tests.
- Migration / schema changes: none. `ats='workable'` is already in use by 10 registered tenants; a search of the schema-validator skill found no ATS enum that would need a new value (the validator does not gate on an ATS allowlist that excludes workable, and the 10 existing workable rows validate today). Adding more workable rows adds zero new validator errors.
- The only work is appending 2 to 3 data rows to `companies_il.json` in the existing Workable shape, for example (Incredibuild template from `companies_il.json`):

```
{
  "name": "Regatta",
  "type": "israeli_founded",
  "industry": "Deep Tech",
  "domain": "regatta.dev",
  "careers_url": "https://apply.workable.com/regatta-3/",
  "ats": "workable",
  "slug": "regatta-3",
  "api_url": "https://apply.workable.com/api/v1/widget/accounts/regatta-3?details=true",
  "verified": true,
  "notes": "Workable widget. Verified live 2026-06-24: 5 jobs, 5 IL (Binyamina)."
}
```

## Section 9: Recommendation

GO, scoped as a registry-only data-row add via the existing Workable fetcher. No fetcher code, no schema change.

- ADD Regatta (`regatta-3`): 5 IL R&D roles in Binyamina. Strongest yield, clearly in-cohort (engineering, QA). Clear add.
- ADD Spines (`spines`): 1 IL corporate role (Legal Counsel, Herzliya). Low volume but a real IL posting; the account is active (19 total), so future IL roles will be picked up by the nightly cron once registered. Add.
- PARTIAL Visit.org (`visit`): 2 IL, but both are freelance In-Person Event Host gig roles in Tel Aviv, not the entry-level tech or business roles the practicum cohort targets. Technically addable by the country filter; flag for a human call on whether freelance event-host listings belong in the IL job cache. Defer or add-with-note.
- SKIP MetalBear (`metalbear`): already in the registry under Comeet (slug 8A.002, verified), and its Workable account returns 0 jobs. Pure dedupe.
- SKIP CropX (`cropx`): 0 IL on Workable (3 postings, all Plovdiv, Bulgaria). Its IL roles are not on this ATS.

Rationale: the infrastructure already exists and is low-risk (unauthenticated public widget, no pagination, negligible load, ToS unaddressed-but-not-prohibited, clean field mapping with a reliable structured_country signal). The marginal cost of capturing Regatta + Spines is two JSON rows and a schema-validator run, for 6 net new IL postings plus ongoing nightly capture. The only judgment call is Visit.org's freelance-gig relevance, which is a content-quality decision rather than a technical one.

Follow-up: a registry-add PR in the PR #371 / #373 / #381 shape (data rows + live-curl evidence + clean schema-validator), adding Regatta and Spines, with Visit.org pending the relevance call.

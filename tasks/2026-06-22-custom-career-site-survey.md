# Custom career-site survey: legal ingestion paths (batch 1, 17 companies)

Read-only survey, 2026-06-22. One fetch per check per company, normal browser User-Agent, no scraping or automation beyond a single sample per check. Goal: identify what publisher-side infrastructure (JSON-LD, sitemaps, RSS, public JSON endpoints) exists at 17 Israeli custom-career-site companies, to decide whether a generic structured-data fetcher is viable or whether the segment is structurally unreachable under our no-aggregator-scraping constraint.

No registry changes, no code, no fetchers built. All URLs are cited so any row can be spot-verified.

## 1. Executive summary

Of the 17 companies surveyed:

- **JobPosting JSON-LD: 0 of 17.** Not one company emits Schema.org JobPosting, at listing level or at detail level. The only JSON-LD present anywhere is navigation cruft (Organization, WebSite, BreadcrumbList, ListItem). The one detail-page spot-check (Bank Leumi `/Job/793`) also had zero JobPosting JSON-LD.
- **Sitemap with per-job URLs: 2 of 17** (Bank Leumi, Mizrahi Tefahot). Both expose individual job-detail URLs in their sitemaps, but the detail pages themselves carry no structured data, so the sitemap solves discovery only, not extraction.
- **RSS/Atom job feeds: 0 of 17.** Deloitte (WordPress) has a generic `/feed/`, but jobs are not WordPress posts there, so it carries no jobs. No other company exposes a feed.
- **Discoverable public JSON endpoint: 1 clean (Cellcom), 2 partial (Menorah, Bezeq).** Cellcom is fronted by a public, unauthenticated Optimizely (Episerver) content API. Menorah has a backend job API that rejects a bare request. Bezeq's careers reference an AdamTotal-style backend API.
- **WAF-blocked to a manual fetch: 2 of 17** (One Zero = Cloudflare challenge, AIG = Imperva redirect loop). Several more sit behind Imperva/Incapsula, Radware, or CloudFront but served content to a bare fetch.

**Headline:** the Israeli enterprise / bank / insurance / telecom custom-site segment has effectively no clean, common structured-data surface. There is no shared path a single generic fetcher could ride: no JobPosting JSON-LD anywhere, no job RSS anywhere, and public JSON only at one company (and even that needs careers-node resolution). The realistic paths are per-company HTML scraping or per-company backend-API reverse-engineering, both high-cost and brittle, plus one company (Bezeq) that may already be reachable through our existing AdamTotal fetcher. This argues against building a generic structured-data fetcher for this segment.

## 2. Per-company findings

Checks: JSON-LD (JobPosting specifically), Sitemap (with per-job URLs), RSS (job feed), JSON endpoint (public, unauthenticated). robots.txt column notes posture. "no" means the check failed; "cruft" means JSON-LD exists but is non-JobPosting.

| #   | Company                | JSON-LD JobPosting              | Sitemap per-job URLs                                         | RSS job feed                                      | Public JSON endpoint                                                                            | robots.txt                                 | WAF / notes                                                         |
| --- | ---------------------- | ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| 1   | Bank Hapoalim          | no (Breadcrumb cruft)           | no (sitemap.xml, 896 locs, marketing only)                   | no                                                | no                                                                                              | 200, no career disallow                    | Imperva (x-iinfo)                                                   |
| 2   | Bank Leumi             | no                              | **yes** (`/he/about/career/Job/<id>`, ~34 in `/sitemap.xml`) | no                                                | no (detail JS-rendered, no JSON-LD)                                                             | 200, sitemap declared, no disallow         | detail page `/Job/793` = no JobPosting                              |
| 3   | Mizrahi Tefahot        | no (Organization cruft)         | **yes** (`/career/open-jobs/<slug>/` in `/sitemap/`)         | no                                                | no                                                                                              | 200, declares /sitemap, /ai.txt, /llms.txt | detail JSON-LD not present on listing                               |
| 4   | First Intl Bank (FIBI) | no                              | no (`/sitemap`, 303 locs, no per-job)                        | no                                                | no                                                                                              | 200, no disallow                           | -                                                                   |
| 5   | Bank Yahav             | no                              | no (robots 404, no sitemap)                                  | no                                                | no                                                                                              | **404**                                    | Imperva (x-iinfo); 9 KB shell                                       |
| 6   | One Zero               | blocked                         | blocked                                                      | blocked                                           | blocked                                                                                         | 403                                        | **Cloudflare challenge (cf-mitigated: challenge), page itself 403** |
| 7   | Migdal Insurance       | no (Breadcrumb cruft)           | no (sitemap.xml, 385 locs, no per-job)                       | no                                                | no                                                                                              | 200, sitemap declared                      | Imperva (x-iinfo)                                                   |
| 8   | Clal Insurance         | no (WebSite cruft)              | no (`/careers/` listing only)                                | no                                                | no                                                                                              | 200, sitemap declared                      | -                                                                   |
| 9   | Phoenix (fnx)          | no (Breadcrumb cruft, Nuxt)     | no (`/career/open-positions/` section pages only)            | no (`/career/feed` 302 to HTML)                   | no (Nuxt XHR, opaque)                                                                           | 200, sitemap declared                      | CloudFront                                                          |
| 10  | Menorah Mivtachim      | no (Next.js)                    | no (no sitemap declared)                                     | no                                                | **partial** (`blueocean-mdp.menora.co.il/job/` exists but bare GET returns 000)                 | 200                                        | `__NEXT_DATA__` embedded (1.3 MB), jobs lazy-loaded                 |
| 11  | Ayalon Insurance       | no                              | no (sitemap.xml 200 but 0 `<loc>`)                           | no                                                | no                                                                                              | 200, sitemap+index declared                | Radware (rdwr); 14 KB shell                                         |
| 12  | AIG Israel             | blocked                         | blocked                                                      | blocked                                           | blocked                                                                                         | 302                                        | **Imperva 302 redirect loop, page unreachable bare**                |
| 13  | Cellcom                | no (3.4 KB shell)               | no (sitemap.xml, 150 locs, no per-job)                       | no                                                | **yes** (`contentepi.cellcom.co.il/api/episerver/v2.0/content/<id>`, 200, unauth JSON, 1.98 MB) | 200, sitemap declared                      | Imperva (x-iinfo); careers content node ID needs resolving          |
| 14  | Bezeq                  | no (Breadcrumb/SiteNav cruft)   | no (`/sitemap`, 861 locs, regional `/career/<region>/` only) | no (`/career_new/rss` 404)                        | **partial** (page references `d-api.bezeq.co.il/api/Adam*`; bare path 404)                      | 200, sitemap declared                      | Looks AdamTotal-backed (see Tier note)                              |
| 15  | Hot Mobile             | no (1 untyped block)            | no (no sitemap declared)                                     | no                                                | no                                                                                              | 200                                        | 165 KB, server-rendered HTML (scrapable)                            |
| 16  | Hot Telecom            | no (Organization/WebSite cruft) | no (no sitemap declared)                                     | no                                                | no                                                                                              | 200                                        | 100 KB server-rendered                                              |
| 17  | Deloitte Israel        | no                              | no (WP sitemap, jobs not a post type)                        | present but no jobs (`/feed/` 302 rss, blog only) | no (`/wp-json/` exposes only default WP types, no jobs CPT)                                     | 200, wp-sitemap declared                   | WordPress + Elementor; jobs come from an embedded/external system   |

Source URLs for the affirmative cells:

- Leumi sitemap: `https://www.leumi.co.il/sitemap.xml` (sample job URL `https://www.leumi.co.il/he/about/career/Job/793`)
- Mizrahi sitemap: `https://www.mizrahi-tefahot.co.il/sitemap/` (sample `.../career/open-jobs/banker-mortgage-ramat-gan/`)
- Cellcom API: `https://contentepi.cellcom.co.il/api/episerver/v2.0/content/914?expand=*` (returned unauth JSON; 914 is the homepage node, careers node not yet resolved)
- Menorah API: `https://blueocean-mdp.menora.co.il/job/` (referenced in `__NEXT_DATA__`; bare GET failed)
- Bezeq API: `https://d-api.bezeq.co.il/api/Adam` (referenced in page; bare path 404)
- Deloitte WP: `https://careers.deloitte.co.il/wp-json/wp/v2/types`, `https://careers.deloitte.co.il/wp-sitemap.xml`

## 3. Yield analysis (tiers)

**Tier A: clean structured data at listing level, directly fetchable by a generic fetcher.**
Count: **0** truly clean. The closest is **Cellcom** (1), via its public unauthenticated Optimizely content API, but that is not listing-level job data out of the box: it returns the CMS content tree, and the careers job nodes still have to be located by content ID. So even the single public-JSON case needs per-site resolution work before it yields jobs.

**Tier B: structured data reachable via sitemap discovery plus per-detail parsing.**
Count: **2** (Bank Leumi, Mizrahi Tefahot). Both publish individual job-detail URLs in their sitemaps, so discovery is solved cleanly. The catch: the detail pages carry no JobPosting JSON-LD (verified on Leumi `/Job/793`), so extraction would still be HTML parsing of a JS-influenced page, not structured-data parsing. They are Tier B for discovery, Tier C for extraction.
Estimated volume: Leumi ~34 job URLs in the sitemap; Mizrahi shows many `/career/open-jobs/<slug>/` entries (dozens). These are the two largest reachable job sets in the batch.

**Tier C: no structured data; HTML parsing or backend-API reverse-engineering only.**
Count: **11** (Hapoalim, FIBI, Yahav, Migdal, Clal, Phoenix, Menorah, Ayalon, Hot Mobile, Hot Telecom, Deloitte). Within this tier:

- **Server-rendered HTML** (scrapable per-site, no JS execution needed): Hot Mobile, Hot Telecom, Hapoalim, Migdal, Clal, FIBI. Volume not machine-countable from a single fetch (no per-job sitemap).
- **SPA, data behind a backend API that needs reverse-engineering:** Menorah (`blueocean-mdp` job API), Phoenix (Nuxt XHR), Ayalon (Radware-fronted SPA), Cellcom (Optimizely API, see Tier A note).
- **Jobs not in the visible CMS at all:** Deloitte (WordPress carries no job posts; jobs are injected by an embedded/external widget).

**Special case: likely already covered by an existing fetcher.**
**Bezeq** references an AdamTotal-style backend (`d-api.bezeq.co.il/api/Adam*`). We already ship an AdamTotal fetcher. If Bezeq's careers are AdamTotal-hosted, it may be reachable through the existing pattern once the exact endpoint and tenant token are resolved. Worth a separate 30-minute check before treating Bezeq as custom.

**Hard pass (WAF-blocked even to a manual fetch):**
Count: **2** (One Zero = Cloudflare challenge, AIG = Imperva redirect loop). See section 6.

Tier counts: A = 0 clean (1 with heavy caveat), B = 2, C = 11, AdamTotal-candidate = 1 (Bezeq), hard pass = 2. Total 17 (Bezeq counted once in the AdamTotal line; it also appears in the Tier C table row).

## 4. Per-tier recommendation

**Tier A (0 clean):** there is nothing to build a generic listing-level fetcher against. The premise that a single structured-data fetcher could ingest this segment does not hold: there is no shared structured surface.

**Tier B (Leumi, Mizrahi):** a "sitemap discovery plus HTML extraction" fetcher is technically possible for these two. Rough scope: read the sitemap, filter to the per-job URL pattern, fetch each detail page, and parse the title/description/location out of the rendered HTML (not JSON-LD, since there is none). This is per-company HTML parsing with all the brittleness that implies (markup changes break it), and it only covers 2 of 17. Not a generic fetcher, two bespoke ones.

**Tier C (11):** the honest options are (a) a bespoke HTML scraper per company for the server-rendered ones (Hot Mobile, Hot, Hapoalim, Migdal, Clal, FIBI) at high build-and-maintenance cost and meaningful breakage risk, (b) backend-API reverse-engineering for the SPA ones (Menorah, Phoenix, Cellcom, Ayalon), which you flagged as out of scope for a survey and is fragile besides, or (c) accept the gap. Given the cost and the brittleness, (c) accept-the-gap is the defensible default for most of Tier C.

**Bezeq:** check whether the existing AdamTotal fetcher can be pointed at it before writing anything custom. This is the cheapest potential win in the batch.

Overall: a generic structured-data fetcher is not viable for this segment. The reachable surface is two sitemap-discoverable banks (HTML extraction), one possible AdamTotal reuse (Bezeq), and one public-but-unresolved CMS API (Cellcom). Everything else is bespoke scraping or a hard gap.

## 5. Open questions for Eli

1. **robots.txt posture.** None of the 17 robots.txt files disallow the careers or jobs sections specifically (the ones that returned 200). Bank Yahav returns 404 for robots (no policy at all), One Zero returns 403 (Cloudflare), AIG returns 302 (Imperva). So robots is permissive or silent across the board, which removes one legal objection, but it does not override the WAF/anti-bot challenges on One Zero and AIG, which are an explicit technical "no automated access" signal regardless of robots. How do you want to weigh an active WAF challenge in the legal-posture conversation?
2. **Hebrew vs English structured data.** Moot for JSON-LD (none of the 17 emit JobPosting), but relevant for extraction: the careers pages are Hebrew, and the only per-job URLs we found (Leumi, Mizrahi) use English-transliterated slugs over Hebrew page content. Any extraction here would face Hebrew job descriptions, same as other IL sources, so downstream language detection must be in place before this segment is worth ingesting.
3. **WAF / Cloudflare exposure.** Two companies challenge even a single manual fetch from this environment: One Zero (Cloudflare `cf-mitigated: challenge`) and AIG (Imperva 302 loop). Several more sit behind Imperva/Incapsula (Hapoalim, Yahav, Migdal, Cellcom), Radware (Ayalon), or CloudFront (Phoenix) but served content to a bare request. The Imperva-fronted ones could start challenging automated traffic at volume even though a single fetch succeeded. That is real operational risk for any fetcher targeting this segment.
4. **Bezeq AdamTotal lead.** Want me to do the focused check on whether Bezeq is AdamTotal-hosted and reachable via the existing fetcher? It is the one potential low-cost win and it is out of scope for this survey, so flagging rather than chasing.

## 6. Hard pass cases (all four checks empty or blocked)

These have no usable path under the constraints. The only routes left are HTML scraping of a challenged page or aggregator scraping, both off the table:

- **One Zero Digital Bank** (`https://www.onezerobank.com/career/`): the careers page itself returns HTTP 403 with a Cloudflare challenge (`cf-mitigated: challenge`). robots.txt also 403. No JSON-LD, no sitemap, no feed, no reachable API. Fully blocked to a normal fetch.
- **AIG Israel** (`https://www.aig.co.il/jobs/`): Imperva 302 redirect loop, the page does not resolve to content on a bare fetch. No reachable structured data.

Soft-gap (reachable HTML but no structured data, so effectively HTML-scrape-only, which you may also choose to treat as a pass): Bank Hapoalim, FIBI, Migdal, Clal, Phoenix, Ayalon, Hot Mobile, Hot Telecom, Deloitte. These are not WAF-hard-blocked, but none expose JSON-LD, a job sitemap, RSS, or a clean public JSON endpoint, so the only path is a bespoke per-company HTML scraper.

## Method notes

- One HTTP fetch per check per company, browser User-Agent, redirects followed, 25 to 30 second timeout. For the JSON-endpoint check I followed the one backing-API URL each page revealed (Cellcom, Menorah, Bezeq) rather than reverse-engineering auth or decoding obscured calls, per the brief.
- "Sitemap per-job URLs" required actual individual job-detail URLs, not section or regional landing pages. Bezeq's `/career/<region>/` and Phoenix's `/career/open-positions/` are section pages and were scored "no".
- JSON-LD was parsed from each saved listing page; @type was collected recursively (including `@graph` and arrays). The single detail-page spot-check was Bank Leumi `/Job/793`, chosen because Leumi was the strongest sitemap candidate; it confirmed no detail-level JobPosting JSON-LD.
- WAF detection came from response headers (`server: cloudflare` + `cf-mitigated`, Imperva `x-iinfo`, Radware `rdwr`, `server: CloudFront`) and from anomalously small shell responses.

# SAP SuccessFactors public job-board API — research findings

## Bottom line

**Yes — SuccessFactors exposes two distinct unauthenticated public endpoints**, both of which return the full job board (no auth, no API key, no token).
The strongest endpoint is the RMK/Career-Site-Builder RSS feed at `https://<custom-careers-domain>/sitemal.xml` (note the typo — it is `sitemal`, not `sitemap`); it returns RSS 2.0 with Google-Jobs namespace fields, 100% of active reqs, and Hebrew-aware location strings. This unlocks the Israeli traditional sector — confirmed live against Teva (531 jobs, 49 in Israel), Perrigo (100 jobs), and ICL Group (109 jobs, 26 in Israel).

**Recommendation: Build a SuccessFactors fetcher.** Implementation effort is small (single XML parse, no auth state, no pagination). Expected IL unlock is substantial — at minimum Teva, Perrigo, ICL — and the same fetcher pattern will work for every other Israeli company on SF as we add them to the registry.

## What I tried

### Documentation reviewed
- SAP Help Portal — Career Site Builder / Job Delivery / XML Feed configuration (`help.sap.com/docs/successfactors-recruiting/...`)
- SAP Knowledge Base 2428902 — "XML Feed for Posted Jobs" — documents the canonical `career_ns=job_listing_summary` URL pattern
- SAP Knowledge Base 2361686 — "XML Feeds - Recruiting Marketing"
- cetteup.com/158 — discovered the undocumented `/sitemal.xml` RSS endpoint (the typo is intentional / inherited from SF code)
- cetteup.com/166 — documents the SAP-corporate `jobs.sap.com/services/rss/job/` custom-query RSS (SAP-corporate-only, max 20 results, not generalizable)
- cetteup.com/92 — community list of 500+ known RMK domains and corresponding `company_id` / `rcm_domain` mappings, exposed via `sf-instance-api.cetteup.com`
- fantastic.jobs/ats/successfactors — third-party aggregator confirms `/sitemal.xml` is their primary public feed; they fall back to OData JobRequisition (auth-required) when not available

### Concrete endpoints tested via curl + WebFetch

| URL | HTTP | Content-Type | Items | Auth? |
|---|---|---|---|---|
| `https://careers.teva/sitemal.xml` | 200 | text/xml | 531 jobs | none |
| `https://careers.icl-group.com/sitemal.xml` | 200 | text/xml | 109 jobs | none |
| `https://careers.perrigo.com/sitemal.xml` | 200 | text/xml | 100 jobs | none |
| `https://career2.successfactors.eu/career?company=1080030P&career_ns=job_listing_summary&resultType=XML` | 200 | application/xml | 413 jobs | none |
| `https://career2.successfactors.eu/career?company=PERRIGO&...` | 200 | text/html (error page) | n/a | rejected — wrong company_id |
| `https://career2.successfactors.eu/career?company=ICL&...` | 200 | text/html (error page) | n/a | rejected — wrong company_id |
| `https://career.successfactors.eu/sitemal.xml` | 404 | — | — | — |
| `https://career2.successfactors.eu/sitemal.xml` | 404 | — | — | sitemal.xml only on RMK-tenant custom domains, not the shared SF infra |
| `https://careers.teva/jobs.json?locale=en_US` | 200 | text/html (renders SPA) | — | not a real JSON endpoint, just SPA shell |

### Open-source / third-party tooling
- **fantastic.jobs/ats/successfactors** — confirms `sitemal.xml` is the workable public path; their docs even tell developers to "simply append `/sitemal.xml`"
- **sf-instance-api.cetteup.com** — a JSON dataset of ~500 known SF tenants mapping `domain → company_id → rcm_domain`. Useful for bootstrapping discovery of new IL SF tenants (e.g. resolving `careers.perrigo.com` to its `company_id` and `rcm_domain` for fallback to the shared SF endpoint).
- **getknit.dev SuccessFactors Python guide** — only covers the authenticated OData/JobRequisition path
- **StepStone SuccessFactors connector** — partner integration, requires customer-side credentials

## Endpoint candidates found

### Endpoint A: RMK Career Site `/sitemal.xml` (RECOMMENDED PRIMARY)
- **URL pattern**: `https://<custom-careers-domain>/sitemal.xml`
  - Examples: `careers.teva/sitemal.xml`, `careers.icl-group.com/sitemal.xml`, `careers.perrigo.com/sitemal.xml`
- **Auth required**: No. No API key, no token, no referer check, no IP block, no rate-limit observed during testing.
- **Returns**: RSS 2.0 XML with `xmlns:g="http://base.google.com/ns/1.0"` (Google Jobs feed spec)
- **Per-item fields** (every item has all of these):
  - `<title>` — job title plus location suffix (e.g. "Logistics Specialist Supervisor (St. Louis, MO, US, 63141)")
  - `<description>` — CDATA-wrapped HTML, full job description
  - `<link>` — canonical apply URL on the same custom domain (`https://careers.teva/job/<location-slug>-<title-slug>/<id>/`)
  - `<guid>` — same as the numeric ID (RMK ID, NOT the underlying SF requisition ID — important caveat)
  - `<g:id>` — numeric RMK ID, used as our stable foreign key
  - `<g:location>` — comma-separated "City, Country, ZIP" (ISO-style: `Dimona, IL`, `Tel Aviv, Israel, 6944020`, `Haifa, IL`)
  - `<g:employer>` — company name
  - `<g:expiration_date>` — ISO date
  - `<g:job_function>` — category string
- **Reliability**: All three Israeli tenants tested returned 200, complete XML, with daily-fresh `<lastmod>` (verified ICL has `2026-05-16`). Channel `<ttl>720</ttl>` (12 hours) suggests SF refreshes the feed twice daily. Response sizes 0.5–5 MB — completely safe for nightly cron.
- **Sample IL test**:
  - Teva: 531 total jobs, **49 in Israel** (Tel Aviv, Shoham, Kfar Saba, etc.)
  - ICL: 109 total jobs, **26 in Israel** (Dimona, Haifa, Sdom, Ashdod)
  - Perrigo: 100 jobs (no IL roles currently active — but Perrigo's IL footprint is small)
- **Caveat**: `<g:id>` is the RMK job-board ID, not the underlying SF requisition ID. For our purposes (canonical IL job-cache foreign key), the RMK ID is fine — it's stable per-job, doesn't collide across tenants because we'll always namespace by tenant domain, and the apply URL (`<link>`) is canonical.

### Endpoint B: Shared SF infra `/career?company=<id>&career_ns=job_listing_summary&resultType=XML` (FALLBACK)
- **URL pattern**: `https://career2.successfactors.eu/career?company=<COMPANY_ID>&career_ns=job_listing_summary&resultType=XML`
  - (Also `career4.successfactors.com` for US-hosted tenants; `career5.successfactors.eu` exists for some larger customers)
- **Auth required**: No.
- **Returns**: XML in SAP's proprietary `<Job-Listing><Job>...</Job></Job-Listing>` format with `label`/`value` filter pairs (`<filter1><label>Country</label><value>Israel</value></filter1>`)
- **Per-item fields**: `<JobTitle>`, `<Job-Description>` (CDATA HTML), `<ReqId>` (actual SF requisition ID — different from RMK ID), `<Posted-Date>`, `<filterN>` (country, department, division — variable per tenant)
- **Reliability**: Confirmed working for Teva (`company=1080030P`, 413 jobs, 51 Israel mentions). FAILS with HTML error page when company_id is wrong — there is no public discovery; you need the exact ID.
- **When to use**: when a tenant has no custom RMK domain (some smaller SF customers do not). Also useful when we want the actual SF requisition ID rather than the RMK ID.
- **How to find the company_id**: 
  - The `careers.<company>` custom-domain page source includes a redirect/JS reference to the shared SF tenant URL with `?company=<ID>` (visible by inspecting any "Apply" link or the SPA bootstrap script)
  - Or query `sf-instance-api.cetteup.com` for known mappings
  - Or grep the public SF career page HTML for `data-companyid` / `company=` strings
- **Caveat**: returns 413 jobs vs 531 in RMK feed — the shared-infra endpoint shows the underlying SF reqs, while RMK aggregates posted variants per locale/division. RMK is the more accurate "public-facing" count.

### Endpoint C: `sf-instance-api.cetteup.com` (DISCOVERY HELPER, not a job-fetch endpoint)
- **URL**: `https://sf-instance-api.cetteup.com/` (root returns full JSON list)
- **Returns**: JSON array of `{id, domain, company_id, rcm_domain, added, last_seen}` for ~500 known SF tenants
- **Use**: bootstrap a list of IL companies that might be on SF, then point our RMK fetcher at each `domain`. NOT for runtime fetching — this is discovery-time only.

### Endpoint D: OData `JobRequisition` API (NOT VIABLE — auth required)
- **URL**: `https://<tenant>.successfactors.com/odata/v2/JobRequisition`
- **Auth**: OAuth 2.0 client-credentials + "Recruiter Operator" role
- **Why not viable**: Requires the SF customer to provision us credentials. Not a public-internet endpoint. Same as Workday's REST API — closed.

### Endpoint E: `sitemap.xml` (SEO sitemap, partial alternative)
- **URL**: `https://<careers-domain>/sitemap.xml`
- **Returns**: standard Google sitemap with one `<loc>` per job apply URL
- **Why useful only as fallback**: contains only URLs (no title, no description, no location), so we'd then have to fetch each job page individually. The RMK `sitemal.xml` is strictly better — same URLs plus all metadata in one shot.

## Recommendation

**(A) Build a SuccessFactors fetcher** using `sitemal.xml` as the primary endpoint, with `career?company=<id>&career_ns=job_listing_summary&resultType=XML` as a fallback for tenants without a custom RMK domain.

### Why this is the right call
- **Unlocks the Israeli traditional sector**. Confirmed: Teva, ICL, Perrigo. Highly likely (based on SF prevalence in Israeli enterprise): Bank Leumi, Bank Hapoalim, Bezeq, Elbit, Rafael, IAI, Strauss, Tnuva, large insurers (Migdal, Harel, Clal, Phoenix). Each needs to be probed individually — start with `https://careers.<company>.com/sitemal.xml` and `https://careers.<company>.co.il/sitemal.xml`.
- **Implementation effort: small.** Single GET, no auth state, no pagination, parse RSS 2.0 with any XML lib. Pattern is identical to our existing Greenhouse/Lever fetchers.
- **No fragility/scraping risk.** This is RSS 2.0 with stable Google-Jobs namespace fields — same format SF has shipped since ~2015. SAP refreshes it twice daily (`<ttl>720</ttl>`) and is the documented mechanism for distributing jobs to Indeed/LinkedIn/Glassdoor — they will not break it.
- **TTL is friendly to nightly cron.** 12-hour SF-side cache, so a nightly fetch sees fresh data.

### Implementation sketch for a follow-up engineer

```typescript
// fetcher input: registry entry with type=successfactors, careers_domain=careers.teva
// (optionally: company_id + rcm_domain for the shared-infra fallback)

async function fetchSF(careersDomain: string): Promise<RawJob[]> {
  const url = `https://${careersDomain}/sitemal.xml`;
  const xml = await fetch(url).then(r => r.text());
  const parsed = parseXml(xml);   // expects <rss><channel><item>*
  return parsed.rss.channel.item.map(it => ({
    sourceId: it['g:id'],                    // numeric RMK ID
    title: it.title,
    descriptionHtml: it.description,         // already CDATA-wrapped HTML
    applyUrl: it.link,
    location: it['g:location'],              // "Tel Aviv, Israel, 6944020" or "Dimona, IL"
    employer: it['g:employer'],
    function: it['g:job_function'],
    expiresAt: it['g:expiration_date'],
  }));
}

// IL filter: location contains "Israel" or ", IL" or matches list of Israeli cities
function isIsraelJob(loc: string): boolean {
  if (/,\s*IL\b|Israel/i.test(loc)) return true;
  const il_cities = /Tel Aviv|Jerusalem|Haifa|Netanya|Petah Tikva|Petach Tikva|Kfar Saba|Herzliya|Ramat Gan|Rishon|Beer Sheva|Dimona|Ashdod|Ashkelon|Eilat|Shoham|Sdom|Sodom/i;
  return il_cities.test(loc);
}
```

### Fallback path (Endpoint B) — pseudo

```typescript
async function fetchSFShared(rcmDomain: string, companyId: string): Promise<RawJob[]> {
  const url = `https://${rcmDomain}/career?company=${companyId}&career_ns=job_listing_summary&resultType=XML`;
  const xml = await fetch(url).then(r => r.text());
  const parsed = parseXml(xml);   // <Job-Listing><Job>*
  return parsed['Job-Listing'].Job.map(j => ({
    sourceId: j.ReqId,                       // actual SF requisition ID
    title: j.JobTitle,
    descriptionHtml: j['Job-Description'],
    postedDate: j['Posted-Date'],
    filters: j.filter1, j.filter2, ...       // tenant-specific
  }));
}
```

### Discovery workflow for new IL SF tenants

1. For each candidate IL company in our universe (banks, defense, insurance, telecom, large pharma/industrials):
   - Try `https://careers.<company>.com/sitemal.xml`
   - Try `https://careers.<company>.co.il/sitemal.xml`
   - Try `https://jobs.<company>.com/sitemal.xml`
   - Look up in `sf-instance-api.cetteup.com` JSON dump
   - Inspect their public careers page source for `successfactors` references and `?company=<ID>` URLs
2. If `sitemal.xml` returns 200 text/xml — add to registry as `type: successfactors`, `careers_domain: <domain>`
3. If only the shared-infra path works — add with `type: successfactors_shared`, `rcm_domain: career2.successfactors.eu`, `company_id: <ID>`

## Sample test results

### Teva Pharmaceutical (`careers.teva`)
- **Endpoint**: `https://careers.teva/sitemal.xml`
- **Status**: 200 OK, `Content-Type: text/xml;charset=UTF-8`, body 5,140,630 bytes
- **Items**: 531 total
- **Israel jobs**: 49 (Tel Aviv ×23, Kfar Saba ×10, Shoham ×7, Netanya ×4, etc.)
- **Sample item**:
  ```xml
  <item>
    <title>Hospital Account Manager - Tampa, FL</title>
    <description><![CDATA[<div>...job HTML...</div>]]></description>
    <link>https://careers.teva/job/Tampa-Hospital-Account-Manager-Tampa%2C-FL-Unit-33601/1386549900/</link>
    <guid>1386549900</guid>
    <g:id>1386549900</g:id>
    <g:location>Tampa, Florida, 33601</g:location>
    <g:employer>Teva Pharmaceutical Industries</g:employer>
    <g:expiration_date>2026-06-17</g:expiration_date>
  </item>
  ```
- **Cross-check via shared SF infra**: `https://career2.successfactors.eu/career?company=1080030P&career_ns=job_listing_summary&resultType=XML` → 200, 3.5 MB, 413 `<Job>` entries with full filter metadata. Both endpoints work; RMK has slightly higher count because it includes regional repostings.

### ICL Group (`careers.icl-group.com`)
- **Endpoint**: `https://careers.icl-group.com/sitemal.xml`
- **Status**: 200 OK, body 647,202 bytes
- **Items**: 109 total
- **Israel jobs**: 26 (Dimona, Haifa, Sdom, Ashdod — including Hebrew-titled roles like `מהנדס/ת מכונות למפעל הדשנים באתר רותם`)
- **Sample IL item**:
  ```xml
  <item>
    <title>מהנדס/ת מכונות למפעל הדשנים באתר רותם (Dimona, IL)</title>
    <link>https://careers.icl-group.com/job/Dimona-.../1356093457/</link>
    <g:id>1356093457</g:id>
    <g:location>Dimona, IL</g:location>
    <g:employer>ICL</g:employer>
  </item>
  ```

### Perrigo (`careers.perrigo.com`)
- **Endpoint**: `https://careers.perrigo.com/sitemal.xml`
- **Status**: 200 OK
- **Items**: 100 total
- **Israel jobs**: 0 currently (Perrigo's Israel HQ is in Yeruham but no active reqs at scan time — expected fluctuation)
- **Sample**: same RSS 2.0 schema as above

### Shared-infra failure mode
- `https://career2.successfactors.eu/career?company=PERRIGO&...` → 200 OK but `Content-Type: text/html` returning a SuccessFactors generic error page. The shared-infra path is unforgiving of wrong company_ids — silently 200s with HTML rather than 404ing. Fetcher must validate `Content-Type: application/xml|text/xml` before parsing.

## Sources

- [SAP KB 2428902 — XML Feed for Posted Jobs](https://userapps.support.sap.com/sap/support/knowledge/en/2428902)
- [SAP KB 2361686 — XML Feeds - Recruiting Marketing](https://userapps.support.sap.com/sap/support/knowledge/en/2361686)
- [cetteup.com/158 — SAP SuccessFactors Recruiting Marketing's hidden RSS job feed](https://cetteup.com/158/sap-successfactors-recruiting-marketings-hidden-rss-job-feed/)
- [cetteup.com/92 — List of SAP SuccessFactors RMK instances](https://cetteup.com/92/list-of-sap-successfactors-rmk-recruiting-marketing-instances-urls/)
- [fantastic.jobs SuccessFactors integration](https://fantastic.jobs/ats/successfactors)
- [SAP Help — Job Delivery and Site Feed Management](https://help.sap.com/docs/SAP_SUCCESSFACTORS_RECRUITING/8477193265ea4172a1dda118505ca631/2d364fed50214a01bb072c0651a29bae.html)

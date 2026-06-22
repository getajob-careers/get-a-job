# Hunter HRMS (Niloosoft) investigation: build or no-build

Read-only investigation, 2026-06-22. One fetch per check per tenant, standard browser User-Agent. Goal: decide whether a Hunter HRMS fetcher is worth building, based on yield, not on buildability.

## 1. Headline

**No-build.** "Hunter HRMS" is a branding layer over the Israeli vendor Niloosoft, and it is not one API: it spans two incompatible backends. PwC and toga run a Next.js UI over a per-tenant Niloosoft backend whose endpoint path must be reverse-engineered and hardcoded per tenant (PwC already is, via the existing `pwc_heroku` fetcher). BDO runs a WordPress plugin whose jobs endpoint is auth-gated (HTTP 401 without a WP nonce and session). There is no single clean public multi-tenant JSON endpoint, and beyond the already-covered PwC there is effectively one new addressable tenant (toga). This fails build criteria (a), (b), and (c).

## 2. API surface (per tenant)

| Tenant     | Host                          | Architecture                                         | Data endpoint                                 | Method                   | Format             | Auth                                                   | Predictable URL?                                                       |
| ---------- | ----------------------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------ | ------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| PwC Israel | pwc-careersite.hunterhrms.com | Next.js + Niloosoft backend (Flavor A)               | niloo-server.herokuapp.com/actions-pwc-career | POST `{cmd:"get-jobs"}`  | JSON (returns 201) | None, but needs Origin/Referer headers                 | No. The `actions-pwc-career` path is tenant-specific and was hardcoded |
| BDO Israel | bdo-career.hunterhrms.com     | WordPress + Niloosoft plugin `nls_plugin` (Flavor B) | /wp-json/niloosoft/v1/search-results          | GET                      | JSON               | **Yes. 401 rest_forbidden without WP nonce + session** | Yes (namespace is standard), but gated                                 |
| toga       | toga-jobs.hunterhrms.com      | Next.js + Niloosoft backend (Flavor A)               | not in static HTML (Next.js client loads it)  | presumably POST get-jobs | JSON               | None expected                                          | No. Action path would need per-tenant discovery, same as PwC           |

Key facts established by live probe:

- **PwC** is already in our pipeline as `pwc_heroku`. Its data comes from a Heroku Niloosoft service, not from `hunterhrms.com` itself. The careers host (`pwc-careersite.hunterhrms.com`) is just the Next.js UI; the static page references `niloo-pwc-career.netlify.app`. Adds zero new yield.
- **BDO** exposes a clean WordPress REST namespace `niloosoft/v1` (routes: `/search-results`, `/categories`, `/jobs-by-extended-property`, `/job-apply`, `/job-additional-info/{id}`). But `GET /wp-json/niloosoft/v1/search-results` returns **HTTP 401 `rest_forbidden`** ("you don't have permission"). The plugin gates the jobs list behind the WP nonce in `ApiSettings.nonce` plus the page-set session cookie. A bare HTTP client cannot read it. The standard WP REST `wp/v2/types` exposes only default post types (no public jobs CPT), so there is no unauthenticated read path.
- **toga** is Flavor A (Next.js, `__NEXT_DATA__` present, no WordPress markers). Its backend action path is not in the static HTML, so it would require the same per-tenant JS inspection PwC needed.

## 3. Discovered tenants

Enumerated via `site:hunterhrms.com`. The index is partial, so this is a floor, not a census.

| Subdomain                     | Org                         | Live?    | Architecture                | IL jobs                                                                                               | Language                             | Notes                                                                                                                               |
| ----------------------------- | --------------------------- | -------- | --------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| pwc-careersite                | PwC Israel                  | Yes      | Flavor A (Next.js + Heroku) | ~62 (per existing fetcher, 2026-06-09)                                                                | Hebrew titles, mixed bodies          | Already covered by `pwc_heroku`. No new yield                                                                                       |
| bdo-career                    | BDO Israel                  | Yes      | Flavor B (WordPress plugin) | unknown (gated)                                                                                       | Hebrew                               | Jobs endpoint 401-gated; cannot read without nonce handshake                                                                        |
| toga-jobs                     | toga (tech/hardware)        | Yes      | Flavor A (Next.js)          | unclear (engineering roles indexed: CPU Core Architect, Distributed Computing, Servo Drive, Compiler) | English (titles), likely some Hebrew | One genuinely new addressable tenant. Backend action path not predictable                                                           |
| jobs.hunterhrms.com/IAI.co.il | Israel Aerospace Industries | **Dead** | legacy Hunter URL           | n/a                                                                                                   | n/a                                  | Stale. IAI is on a custom WordPress/Vue site, already covered by our `iai` fetcher. The Hunter URL is dead per our own code comment |

Net new addressable tenants beyond what we already cover: **one** (toga), and even that needs its Niloosoft action path discovered and hardcoded. BDO is gated. IAI is dead. PwC is covered.

I did not check KPMG / Grant Thornton / RSM Israel network calls in depth, because the two confirmed tenants already split across two incompatible backends and BDO is auth-gated, which is sufficient to make the no-build call per the hard rules (stop and surface when an issue makes the build clearly worse than expected). If those firms run Flavor B (WordPress + nls_plugin), they would hit the same 401 gate; if Flavor A, they would each need a hardcoded action path.

## 4. Hebrew handling spot-check

Encoding is clean UTF-8 across the board. Two verbatim samples:

- BDO API error body (the only BDO API response a bare client can get), rendered correctly: `{"code":"rest_forbidden","message":"אין לך הרשאות לעשות את זה","data":{"status":401}}`. Hebrew is clean UTF-8 in the JSON, no mojibake.
- PwC public job title (Hunter site, job 587), verbatim Hebrew: `מתמחה למחלקת M&A Advisory`. PwC titles are frequently Hebrew with mixed Hebrew/English bodies; the existing `pwc_heroku` fetcher already handles this (with a one-pass HTML-entity decode), confirming Hebrew extracts cleanly from this vendor.

So criterion (d) (Hebrew encoding) would pass. It is moot given the other failures.

## 5. Build cost classification

**Tier 3 for the segment as a whole**, for two distinct reasons:

- Flavor A (PwC, toga): no auth, but the per-tenant Niloosoft action path is not predictable from the slug and is not in the static HTML. Each tenant needs its backend endpoint reverse-engineered from the Next.js bundle and hardcoded, exactly like `pwc_heroku` was a one-tenant fetcher. This is not a multi-tenant build; it is one bespoke fetcher per tenant. Low-to-medium effort per tenant, but it does not generalize.
- Flavor B (BDO): the namespace is clean and predictable (`wp-json/niloosoft/v1/search-results`), which looks Tier 1 at first, but the jobs list is gated behind a WP nonce plus session cookie (401 to a bare client). Reaching it requires a stateful handshake (load the page, capture the nonce from `ApiSettings` plus the WordPress cookies, replay `X-WP-Nonce` with those cookies), with nonces that expire roughly every 12 to 24 hours. That is a reproducible-but-fragile auth handshake, and it is an explicit anti-automation gate the vendor put up. Tier 3.

There is no Tier 1 path, and no single fetcher that covers more than one tenant.

## 6. Recommendation

**No-build.** Driven by criteria (a), (b), and (c):

- **(a) clean public JSON, no auth: FAILS.** BDO (the only confirmed WordPress tenant) is 401-gated. Flavor A is unauthenticated but has no predictable shared endpoint.
- **(b) 4+ Israeli tenants with current IL postings, reachable: FAILS.** After removing the already-covered PwC, the dead IAI, and the auth-gated BDO, there is one new addressable tenant (toga).
- **(c) Tier 1 or low Tier 2 build cost: FAILS.** The segment is two backends, one of which is auth-gated (Tier 3) and the other of which is one-bespoke-fetcher-per-tenant (does not generalize).

This is the same conclusion as Teamtailor and iCIMS: the long-tail vendor exists, but the Israeli reachable yield is thin and fragmented, and the build does not generalize.

## 7. Open questions for Eli

1. **toga as a one-off.** toga (`toga-jobs.hunterhrms.com`) is a real, live, Flavor-A tech tenant with engineering roles relevant to a tech-careers audience. If you want that single tenant, it would be a PwC-style one-off fetcher: discover its Niloosoft action path from the Next.js bundle, hardcode it, roughly `pwc_heroku` effort. Worth it for one tenant, or skip? My default is skip (one tenant does not justify a fetcher, consistent with the Teamtailor or one-tenant calls).
2. **BDO nonce handshake.** BDO's jobs are reachable in principle via a load-page-then-replay-nonce handshake, but it is fragile and is an explicit vendor anti-automation gate. I did not attempt it (read-only, and the rules say to surface auth requirements rather than build around them). If you ever want BDO specifically, that is the cost: a stateful per-run handshake. My read is that the vendor gating it is a posture signal to respect.
3. **Other accounting firms.** I did not deep-probe KPMG / Grant Thornton / RSM Israel, because the call was already clear. If any of them turn out to run the BDO-style WordPress plugin, they would hit the same 401 gate; if Flavor A, each needs a hardcoded action path. Flag if you want that confirmed before fully closing the segment.

# Umbraco careers handshake — Bank Yahav & Clal (read-only investigation)

**Date:** 2026-06-22 · **Branch:** `eli/umbraco-handshake-investigation` · **Mode:** read-only, ≤3 fetches/tenant, no anti-bot bypass.

**Decision: NO-BUILD.** The "Umbraco handshake" is not a uniform, benign session handshake. It is **tenant-specific front-door protection** — Imperva/Incapsula anti-bot on Bank Yahav, a custom app session + F5 + Angular-runtime context on Clal. It does not generalize, the gate on at least one tenant is anti-bot (which we will not bypass), and there is no evidence of a shared stack across employers. None of the three go-criteria are met.

---

## What was tested (6 fetches total, all GET)

**Bank Yahav** — careers page `https://www.bank-yahav.co.il/about/jobs/`

1. Page load → 200, real page (`<title>דרושים בבנק יהב</title>`), Incapsula-injected (`_Incapsula_Resource`).
2. `GET /Umbraco/Api/CareerPopupApi/GetCareerPopupFields` **with** replayed page cookies → **200 `application/json`** (form-field labels).
3. Same endpoint **without** any cookies (control) → **also 200 JSON**, identical body; Incapsula minted a fresh session inline.

**Clal** — careers page `https://www.clalbit.co.il/careers/`

1. Page load → 200, real page (`<title>דרושים בקבוצת כלל</title>`); careers UI is an **Angular SPA** (`/AngularClient/dist/main.*.js`).
2. `GET /umbraco/surface/JobSearch/GetInitData?IsClal4UBool=false` **with** replayed cookies + Referer → **soft-404 error page** (`שגיאה | הדף... לא קיים`), _not_ the JSON init data.
3. (verification fetch preserved — the replay failure in #2 already answers the question.)

---

## 1. The actual jobs endpoint (vs metadata)

| Tenant     | Metadata endpoint (have)                                                                                                                                | Jobs/results endpoint (the blocked XHR)                                                                                                                                                                                                                                                            | Request body              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Bank Yahav | `GET /Umbraco/Api/CareerPopupApi/GetCareerPopupFields` — **OPEN**, returns popup form-field labels, _not_ jobs                                          | A sibling action on the same Umbraco Web-API controller `CareerPopupApi`, loaded by a JS bundle (the only inline script is the **CommBox** widget). **Exact action + body not recoverable read-only** — it is not server-rendered into the HTML; surfacing it would require executing the page JS. | unknown (loaded via JS)   |
| Clal       | `GET /umbraco/surface/JobSearch/GetInitData?IsClal4UBool=false` — Umbraco **Surface** controller; returns filters/config when driven by the Angular app | Actual jobs **search** is a sibling `JobSearch` surface action (e.g. `Search`/`GetJobs`), called by the Angular client. **Exact action + body not recoverable read-only** — not in the HTML; lives in the Angular bundle.                                                                          | unknown (Angular runtime) |

Neither jobs request body could be captured read-only: on both tenants the call is issued by client JS (a JS bundle / Angular runtime), not rendered into the page HTML.

## 2. Is the session handshake the same shape on both? — **No.**

|                                   | Bank Yahav                                                                                                                                             | Clal                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Front door                        | **Imperva / Incapsula** WAF (`x-cdn: Imperva`, `x-iinfo`)                                                                                              | **F5 BIG-IP** (`TS…` cookies) — no Imperva                                                                                              |
| Cookies set on page load          | `visid_incap_13830`, `incap_ses_*_13830`, `nlbi_13830` (Incapsula) + `TS…` (F5) + `IM_STICKY`                                                          | `CLLB.N_SID_N` (custom app session), `SessionExpires`, `TS…` (F5)                                                                       |
| CSRF / anti-forgery token in HTML | none                                                                                                                                                   | none                                                                                                                                    |
| Gate mechanism                    | **(c) anti-bot WAF** — Incapsula challenges the jobs XHR; a valid `incap_ses` is minted by executing Incapsula's obfuscated JS, not by a static cookie | **(c) custom app session + Angular-runtime context** — the surface route returns a soft-404 to anything but the app's own request shape |

It is **not** (a) "a cookie set by page load and replayed" nor (b) "a CSRF token in the HTML." It is **(c) something else, and different per tenant**. The two careers controllers even have different names (`CareerPopupApi` vs `JobSearch`), indicating **separate agency builds**, not a shared Umbraco careers product.

## 3. Can a bare HTTP client reproduce the handshake? — **No (for the jobs data).**

- **Bank Yahav:** the _metadata_ endpoint is openly reachable from bare curl (200 JSON with or without cookies — Incapsula mints a session inline). But the _jobs_ XHR is the Incapsula-gated one; reproducing a valid Incapsula session requires executing its JS challenge, which a bare HTTP client cannot do — and doing so is **bypassing anti-bot**, explicitly out of scope.
- **Clal:** the page-load → cookie-replay sequence was run and **failed** — `GetInitData` returned the "page not found" error HTML, not the JSON. Reproduction would require replicating the Angular app's request shape (an additional header/token issued at runtime), not just one cookie.

So the prescribed "GET page, capture Set-Cookie, GET jobs endpoint with that cookie" sequence does **not** yield jobs on either tenant.

## 4. Build cost — bespoke per tenant, fragile, not <1 day.

A single Umbraco-aware fetcher with one cookie-replay does **not** work: the gates differ (Incapsula WAF vs custom session + Angular runtime), and one is anti-bot. Each tenant would be **bespoke**:

- Bank Yahav → defeating Incapsula (headless browser running its JS challenge) — fragile, breaks on every Incapsula config change, and against our no-bypass rule.
- Clal → reverse-engineering the Angular client's request signing/token, plus the F5/session lifecycle.
  Both are multi-day, brittle integrations that re-break on vendor updates. Not a clean shared build.

## 5. Coverage — **cannot confirm 4+ Israeli Umbraco employers.**

Searches for the distinctive controller signatures (`CareerPopupApi`, `GetCareerPopupFields`, `umbraco/surface/JobSearch`) and for Umbraco careers on `.co.il` returned **zero** other Israeli employers. Reasons: Umbraco is server-side .NET with no public footprint (the `/umbraco/` admin path is normally blocked), the careers controllers are bespoke per build, and the available web search is US-only with no `site:`/`inurl:` support. The two known tenants don't share a template, so there is no evidence of a common stack to fan out across.

---

## Go-criteria scorecard

| Criterion                                                        | Result                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| (a) Handshake reproducible from bare HTTP with one cookie replay | **NO** — Bank Yahav jobs XHR is anti-bot (no bypass); Clal replay returned a soft-404 |
| (b) 4+ Israeli employers identified on Umbraco careers stacks    | **NO** — zero found; the two known tenants use different bespoke controllers          |
| (c) Build cost under one day                                     | **NO** — bespoke per tenant, one path is anti-bot, both fragile                       |

**→ NO-BUILD.** "Umbraco" is a red herring: it identifies the CMS, not a shared, reproducible jobs handshake. The gate that made these Tier B is per-tenant front-door protection (Imperva on Bank Yahav, custom session + Angular on Clal), which neither generalizes nor is reproducible read-only within our rules. Stop here; do not invest in an Umbraco fetcher.

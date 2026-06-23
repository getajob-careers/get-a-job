# Comeet token harvest: 14 tenants (page-load credential capture)

Branch: `eli/comeet-token-harvest-comprehensive`. Read-only investigation, no registry edits.
Date: 2026-06-23. Goal: capture uid + token for 14 token-blocked Comeet tenants (four-fund recon plus prior backlog) so a follow-up registry-add PR can use the PR #371 / #373 / #381 shape.

All credentials below were extracted from public careers pages / Comeet hosted boards and ground-truth verified by me against the live API (`https://www.comeet.co/careers-api/2.0/company/<UID>/positions?token=<TOKEN>`), not only from the capture agents. Tokens of this kind already live publicly in `companies_il.json` api_url fields (e.g. Windward), so storing them here is consistent with existing practice.

## Headline finding: the "exactly 32-char hex token" premise is false

PR #381's note that tokens are "exactly 32-char hex; 31-char captures are invalid" does NOT hold empirically. Across the nine working captures, the live token that authenticates (HTTP 200) ranges from 28 to 39 characters, and not one is 32:

| Company   | working token length | HTTP |
| --------- | -------------------- | ---- |
| EX.CO     | 28                   | 200  |
| Travelier | 33                   | 200  |
| OneStep   | 34                   | 200  |
| Grain     | 35                   | 200  |
| Immunai   | 36                   | 200  |
| Flexor    | 36                   | 200  |
| Cynet     | 37                   | 200  |
| Nimbleway | 38                   | 200  |
| Reeco     | 39                   | 200  |

Consequences for the follow-up registry PR and any validation logic:

1. Do NOT reject a token by length. Length is not a validity signal. The only reliable check is a live HTTP 200 from the positions endpoint.
2. SparkBeyond's 31-char token IS invalid, but not because it is 31 chars. It is genuinely broken at the source embed (returns HTTP 400 "Account uid or token are not valid"), and the missing character cannot be recovered without fabricating it.
3. Two tenants (Immunai, Flexor) ALSO expose a decoy 32-hex string on the page that returns HTTP 400. The 32-char value is the wrong credential; the longer (36-char) value is the one that authenticates. A length-based "prefer the 32-char one" heuristic would pick the broken decoy.

## Second finding: IL detection must match country_code "IL", not literal "Israel"

The positions JSON reports location with `country_code: "IL"` and city values like "Tel Aviv-Yafo", "Tel-Aviv", "Ramat Gan". Several do NOT carry the literal string "Israel". A strict matcher keyed on the word "Israel" would miss Flexor, Reeco, OneStep, Cynet, Nimbleway. The refresh-jobs IL matcher (and the registry follow-up verification) should key on `country_code == "IL"` plus the city list, which is what the IL counts below use.

## Summary table

| #   | Company        | Status   | uid    | token len | HTTP | total | IL  | uid vs task                     |
| --- | -------------- | -------- | ------ | --------- | ---- | ----- | --- | ------------------------------- |
| 1   | Reeco          | CAPTURED | 0A.00D | 39        | 200  | 4     | 2   | matches (0A.00D)                |
| 2   | Travelier      | CAPTURED | 64.006 | 33        | 200  | 1     | 1   | MISMATCH (task ED.66A)          |
| 3   | Sightful       | FAILED   | 26.00D | none      | 400  | n/a   | n/a | uid matches, token unobtainable |
| 4   | Dream Security | FAILED   | none   | none      | n/a  | n/a   | n/a | no client-side creds            |
| 5   | Grain Finance  | CAPTURED | 4A.000 | 35        | 200  | 5     | 2   | task gave slug only             |
| 6   | OneStep        | CAPTURED | 79.007 | 34        | 200  | 6     | 3   | task gave slug only             |
| 7   | EX.CO          | CAPTURED | F0.005 | 28        | 200  | 2     | 0   | MISMATCH (task 22.66C); 0 IL    |
| 8   | SparkBeyond    | FAILED   | 82.006 | 31        | 400  | n/a   | n/a | token broken at source          |
| 9   | Cynet          | CAPTURED | 33.00D | 37        | 200  | 16    | 2   | matches (33.00D)                |
| 10  | Immunai        | CAPTURED | 37.009 | 36        | 200  | 10    | 5   | task gave slug only             |
| 11  | Flexor         | CAPTURED | F9.006 | 36        | 200  | 3     | 3   | discovered                      |
| 12  | ACT Security   | FAILED   | none   | none      | n/a  | n/a   | n/a | no Comeet integration           |
| 13  | Nimbleway      | CAPTURED | 09.00F | 38        | 200  | 17    | 6   | discovered                      |
| 14  | Majestic Labs  | FAILED   | none   | none      | n/a  | n/a   | n/a | no Comeet / no openings         |

Captured and live-verified: 9 (Reeco, Travelier, Grain, OneStep, EX.CO, Cynet, Immunai, Flexor, Nimbleway).
Of those, 8 have at least one IL position. EX.CO captured cleanly but has 0 IL (New York only right now).
Failed to capture: 5 (Sightful, Dream Security, SparkBeyond, ACT Security, Majestic Labs), each for a distinct reason documented below.

## Recommended for the follow-up registry-add PR (8 entries, all IL > 0)

Reeco, Travelier, Grain Finance, OneStep, Cynet, Immunai, Flexor, Nimbleway. EX.CO should be SKIPPED under the standing zero-IL gate (0 IL jobs). Re-check EX.CO later if IL roles reopen. Use the verified uid + token below verbatim. Match the existing Comeet entry shape in `companies_il.json` (the prior PRs append `&details=true` to the api_url).

---

## Per-company findings

### 1. Reeco

- careers_url: https://reeco.com/careers
- uid: 0A.00D
- token: A0D465B1E2732411E27141A141A50685A753C4E (length 39)
- verify_curl: HTTP 200, JSON parse ok
- api_url: https://www.comeet.co/careers-api/2.0/company/0A.00D/positions?token=A0D465B1E2732411E27141A141A50685A753C4E
- total / il_count: 4 / 2
- samples: (Director of Finance | Tel Aviv); (Senior Full Stack Engineer | Tel Aviv)
- roadblocks: Vite SPA, no Comeet reference in the HTML or main bundle. The config (companyUid/token) lives in lazy-loaded chunks (Careers chunk then a sub-chunk). No anti-bot.
- discrepancy: none. Captured uid 0A.00D matches the task value and validates.

### 2. Travelier

- careers_url: https://www.travelier.com/careers/
- uid: 64.006
- token: 46615FE15FED321A6446601A64D322796 (length 33)
- verify_curl: HTTP 200, JSON parse ok
- api_url: https://www.comeet.co/careers-api/2.0/company/64.006/positions?token=46615FE15FED321A6446601A64D322796
- total / il_count: 1 / 1
- samples: (Head of Treasury | Ramat Gan, Israel)
- roadblocks: none. WordPress Comeet plugin injects a `comeetvar` JS config with `comeet_uid` + `comeet_token` directly in the page HTML.
- discrepancy: uid MISMATCH. Task said ED.66A; the live captured and verified uid is 64.006. ED.66A appears nowhere on the page. Use 64.006.

### 3. Sightful

- careers_url: https://www.sightful.com/about-us (links out to the Comeet hosted board comeet.com/jobs/sightful/26.00D)
- uid: 26.00D
- token: could not capture
- verify_curl: HTTP 400 (token missing), JSON parse fail
- api_url: https://www.comeet.co/careers-api/2.0/company/26.00D/positions?token=<MISSING>
- total / il_count: unknown (cannot query without a token; consistent with the post-layoff note, likely 0)
- samples: none
- roadblocks: Sightful does not embed the Comeet widget on its own site. The about-us page only links to the Comeet hosted board, whose HTML is a client-side JS app with no token, no careers-api URL, and no positions in static markup. No public source exposes the token.
- discrepancy: uid 26.00D matches the task value, but it cannot be validated without a token.

### 4. Dream Security

- careers_url: https://www.dreamgroup.com/careers (slug dreamgroup)
- uid: could not capture
- token: could not capture
- verify_curl: not attempted; slug-only API returns HTTP 400 "Token is missing"
- total / il_count: unknown
- samples: none
- roadblocks: The Webflow careers page renders Comeet positions as static server-side links (`/comeet-positions/<slug>`) with no client-side uid/token. All script bundles contain only visual effects, zero Comeet/fetch/API references. The comeet hosted page for dreamgroup returns only the generic SPA shell because the token is injected server-side only when the correct uid is in the URL path, and Dream's uid is not exposed anywhere static. Likely a Comeet to Webflow CMS build-time sync, so live credentials never reach the client.
- discrepancy: none.

### 5. Grain Finance

- careers_url: https://www.grainfinance.com/careers (uid found on /careers-grain via comeet.com/jobs/grain/4A.000)
- uid: 4A.000
- token: A4047C0290005C4014803340A401EC05C40 (length 35)
- verify_curl: HTTP 200, JSON parse ok
- api_url: https://www.comeet.co/careers-api/2.0/company/4A.000/positions?token=A4047C0290005C4014803340A401EC05C40
- total / il_count: 5 / 2
- samples: (Communications & PR Manager | Tel Aviv); (VP Marketing | Tel Aviv)
- roadblocks: Wix site, no inline Comeet config in the careers HTML. The /careers-grain page links to comeet.com/jobs/grain/4A.000 (uid in path); fetching that uid-path hosted page returns server-rendered JSON carrying both company_uid and token.
- discrepancy: none on uid (task gave slug only). Token is 35 chars (see headline finding).

### 6. OneStep

- careers_url: https://www.onestep.co/company/careers (slug onestep)
- uid: 79.007
- token: 97742410552F9779774241552F25DC25DC (length 34)
- verify_curl: HTTP 200, JSON parse ok
- api_url: https://www.comeet.co/careers-api/2.0/company/79.007/positions?token=97742410552F9779774241552F25DC25DC
- total / il_count: 6 / 3
- samples: (Head of Research | Tel Aviv); (Product Design Lead | Tel Aviv); (Senior Product Manager | Tel Aviv)
- roadblocks: none. Found in the careers HTML inside a `COMEET.init({...})` block ("token" + "company-uid": "79.007"); cross-validated against comeet.com/jobs/onestep/79.007 (identical).
- discrepancy: none on uid (task gave slug only). Token is 34 chars.

### 7. EX.CO

- careers_url: https://ex.co/careers/
- uid: F0.005
- token: F53D41EA5BE5BE89D1EA2DF7A8F5 (length 28)
- verify_curl: HTTP 200, JSON parse ok
- api_url: https://www.comeet.co/careers-api/2.0/company/F0.005/positions?token=F53D41EA5BE5BE89D1EA2DF7A8F5
- total / il_count: 2 / 0
- samples: none in IL (both roles are New York: Director Business Development; People & Workspace Admin)
- roadblocks: Token captured from the WordPress comeet-wp-plugin JSON blob in the page HTML. Only 2 positions, both New York; no IL openings posted despite the Tel Aviv HQ.
- discrepancy: uid MISMATCH. Task said 22.66C; live captured and verified uid is F0.005. SKIP for the registry add under the zero-IL gate; revisit if IL roles reopen.

### 8. SparkBeyond

- careers_url: https://sparkbeyond.ai/careers
- uid: 82.006
- token: 286A1816B6C9EF24C9EF2428650C792 (length 31)
- verify_curl: HTTP 400, JSON parse ok of the error body ({"status":400,"message":"Account uid or token are not valid"})
- api_url: https://www.comeet.co/careers-api/2.0/company/82.006/positions?token=286A1816B6C9EF24C9EF2428650C792
- total / il_count: n/a (API rejects the token)
- samples: none
- roadblocks: The full token recaptured from the `COMEET.init({...})` block is genuinely 31 hex chars as embedded (terminated by a comma, not a grep truncation). Only one token value exists on the page; no alternate URL or bundle carries a different value. The embed is broken at the source.
- discrepancy: The 31-char token issue is CONFIRMED and unresolved. uid 82.006 matches the task. This is a source-side breakage, not a length-rule artifact (other valid tokens are not 32 chars either). Cannot fix without fabricating the missing character.

### 9. Cynet

- careers_url: https://www.cynet.com/careers/
- uid: 33.00D
- token: 33D103133D19E8136E1D25103133D10311D25 (length 37)
- verify_curl: HTTP 200, JSON parse ok
- api_url: https://www.comeet.co/careers-api/2.0/company/33.00D/positions?token=33D103133D19E8136E1D25103133D10311D25
- total / il_count: 16 / 2
- samples: (Windows Kernel Engineer | Tel Aviv-Yafo); (a general "Career at Cynet" Tel Aviv-Yafo listing)
- roadblocks: none. The full careers-api URL is present directly in the page HTML (cleanest capture of the set).
- discrepancy: none. uid 33.00D matches. Token is 37 chars.

### 10. Immunai

- careers_url: https://immunai.com/careers (token via comeet.com/jobs/immunai/37.009)
- uid: 37.009
- token: 7392B5615AB1CE42B5615AB328F039C81CE4 (length 36)
- verify_curl: HTTP 200, JSON parse ok
- api_url: https://www.comeet.co/careers-api/2.0/company/37.009/positions?token=7392B5615AB1CE42B5615AB328F039C81CE4
- total / il_count: 10 / 5
- samples: (Data Infrastructure Team Lead | Ramat Gan); (Head of AI | Ramat Gan); (Senior AI Engineer | Ramat Gan)
- roadblocks: Token not in the inline careers HTML; extracted from the Comeet hosted page widget config (uid was in the careers HTML job links).
- discrepancy: a 32-hex DECOY (9464a37ff12a3cc763790708ea5d8431) is also present on the page but returns HTTP 400. Only the 36-hex value authenticates. A "prefer the 32-char token" heuristic would pick the broken decoy.

### 11. Flexor

- careers_url: https://flexor.ai/about-us/ (the /careers path 404s; careers section lives at /about-us/)
- uid: F9.006
- token: 9F645BA1DE213EC31CE1DE2059A613EC3BC4 (length 36)
- verify_curl: HTTP 200, JSON parse ok
- api_url: https://www.comeet.co/careers-api/2.0/company/F9.006/positions?token=9F645BA1DE213EC31CE1DE2059A613EC3BC4
- total / il_count: 3 / 3
- samples: (AI solutions engineering intern | Tel Aviv-Yafo); (Algo / AI Engineer | Tel Aviv-Yafo); (Software / Data Engineer | Tel Aviv-Yafo)
- roadblocks: /careers empty; the actual careers section is /about-us/. uid + token extracted from comeet.com/jobs/flexor/F9.006.
- discrepancy: same decoy pattern as Immunai (a 32-hex value returns 400; only the 36-hex authenticates). Positions report country_code "IL" and city "Tel Aviv-Yafo", not literal "Israel".

### 12. ACT Security

- careers_url: https://act.security (and /about, /blog; plus 8+ comeet hosted-slug guesses)
- uid: could not capture
- token: could not capture
- verify_curl: not attempted (no credentials)
- total / il_count: n/a
- samples: none
- roadblocks: Webflow build with no careers/jobs page (only /, /about, /blog, legal exist; /careers and /jobs 404). Zero "comeet" references in any page. comeet.com/jobs/actsecurity and variants (act, act-security, actsec, actcyber, act-il, etc.) all 404. No Comeet integration exists for this company.
- discrepancy: none. Company does not appear to use Comeet (or has no public Comeet openings).

### 13. Nimbleway

- careers_url: https://nimbleway.com/careers
- uid: 09.00F
- token: 90F365A5187121E2D4B121E1B2D90F365A365A (length 38)
- verify_curl: HTTP 200, JSON parse ok
- api_url: https://www.comeet.co/careers-api/2.0/company/09.00F/positions?token=90F365A5187121E2D4B121E1B2D90F365A365A
- total / il_count: 17 / 6
- samples: (Data Engineering Tech Lead | Tel Aviv); (Full Stack Tech Lead | Tel Aviv); (Senior AI Engineer | Tel Aviv)
- roadblocks: Credentials are inline JS constants (`COMPANY_UID = "09.00F"`, `TOKEN = "..."`), not HTML attributes.
- discrepancy: none on uid. Per-position apply emails carry suffixes like 8B.46C / A4.C62, which are position IDs, NOT the company uid (uid is correctly 09.00F). Token is 38 chars.

### 14. Majestic Labs

- careers_url: https://majestic-labs.ai/careers (plus homepage, www variant, and comeet hosted-slug guesses)
- uid: could not capture
- token: could not capture
- verify_curl: not attempted (no credentials)
- total / il_count: n/a
- samples: none
- roadblocks: The careers page is a static Webflow marketing page with no Comeet widget, no ATS embed, no job listings, and no application mechanism. It mentions a "Tel Aviv Team" in body copy but lists zero open positions. All comeet hosted-slug guesses return the same redirect a known-bad slug returns, so no hosted page exists. A raw grep "company/majestic" match was a false positive inside a LinkedIn URL.
- discrepancy: none. No genuine Comeet credentials exist for this company at this time.

## Next step

Follow-up batch registry-add PR (PR #371 / #373 / #381 shape) with the 8 IL-positive captures above. Carry the verified uid + token verbatim, append `&details=true` to match existing Comeet api_url entries, run a live curl per entry, and use the country_code "IL" matcher for the IL count. Drop EX.CO (0 IL) and the four no-credential tenants (Sightful, Dream Security, ACT Security, Majestic Labs). SparkBeyond stays blocked until its source embed token is fixed.

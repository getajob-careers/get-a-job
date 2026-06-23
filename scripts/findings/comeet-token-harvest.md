# Comeet token harvest: 8 tenant credential capture

Read-only investigation, 2026-06-23. For each company: fetch the careers page (and, where the token is not inline, the linked Comeet-hosted page), extract the Comeet `uid` + careers-api `token`, then verify live via curl against `https://www.comeet.co/careers-api/2.0/company/<UID>/positions?token=<TOKEN>&details=true` and report IL job count + samples.

No code changes, no registry edits. Findings only. The follow-up is a batch registry-add PR for the buildable rows.

## Token-length note (important)

The brief expected 32-char hex tokens. In practice the live working tokens are NOT uniformly 32 chars: the verified-good ones here are 28, 33, 34, and 39 chars. So token length is not a reliable validity test. The real test is the HTTP 200 plus a JSON array response. The one length-based signal that held: SparkBeyond's 31-char token returns HTTP 400 "Account uid or token are not valid", but that is a credential mismatch (the page embeds a malformed or truncated token), not a pure length rule. Verify with curl, not by counting characters.

## Summary

| #   | Company        | uid     | token (len)        | curl | IL jobs | Status                            |
| --- | -------------- | ------- | ------------------ | ---- | ------- | --------------------------------- |
| 1   | Reeco          | 0A.00D  | A0D4...3C4E (39)   | 200  | 2       | BUILDABLE                         |
| 2   | Travelier      | 64.006  | 4661...2796 (33)   | 200  | 1       | BUILDABLE (uid corrected)         |
| 3   | Sightful       | 26.00D  | not capturable     | n/a  | unknown | BLOCKED (token not exposed)       |
| 4   | Dream Security | unknown | not capturable     | n/a  | unknown | BLOCKED (token server-side)       |
| 5   | Grain Finance  | unknown | not capturable     | n/a  | unknown | COULD NOT CAPTURE                 |
| 6   | OneStep        | 79.007  | 9774...DC25DC (34) | 200  | 3       | BUILDABLE                         |
| 7   | EX.CO          | F0.005  | F53D...A8F5 (28)   | 200  | 0       | VALID, 0 current IL jobs          |
| 8   | SparkBeyond    | 82.006  | 286A...0C792 (31)  | 400  | n/a     | BLOCKED (malformed token in page) |

Buildable now (200 plus at least one IL job): Reeco, Travelier, OneStep. Total 6 IL jobs across the three.

## Per-company detail

### 1. Reeco, BUILDABLE

- uid `0A.00D`, token `A0D465B1E2732411E27141A141A50685A753C4E` (39 chars).
- Token source: the careers page (reeco.com/careers) is a JS-rendered SPA with no inline Comeet config; recovered the token from the Comeet-hosted page `comeet.com/jobs/reeco/0A.00D`.
- curl: HTTP 200, JSON parse OK. Total 4 positions, 2 IL.
- Samples: Director of Finance | Tel Aviv; Senior Full Stack Engineer | Tel Aviv.
- Roadblocks: token not in the company's own page (SPA); had to follow to the hosted page.

### 2. Travelier, BUILDABLE (uid corrected)

- uid `64.006` (the page-embedded `comeet_uid`), token `46615FE15FED321A6446601A64D322796` (33 chars).
- Correction: the brief's pre-captured uid `ED.66A` is wrong. The careers page (WordPress comeet-wp-plugin) embeds `comeet_uid=64.006`, and `64.006` is the uid that returns 200.
- curl: HTTP 200, parse OK. Total 1, 1 IL.
- Samples: Head of Treasury | Ramat Gan, Israel.
- Roadblocks: none. Inline in the WP plugin config (`comeet_uid` / `comeet_token`).

### 3. Sightful, BLOCKED (token not exposed)

- uid `26.00D` confirmed (the /about-us page links to `comeet.com/jobs/sightful/26.00D`). Token: could not capture.
- The careers URL in the brief (/about-us) only links out to the Comeet-hosted page; it has no token. The Comeet-hosted page is a newer Comeet SPA that does not embed the careers-api token in any readable field (the only 32-char hex on it is a lowercase asset hash, not a token).
- curl: not attempted (no token). IL count unknown.
- Layoffs caveat from the brief stands: even if the token is recovered later (browser-agent), reverify current IL openings before counting Sightful as buildable.

### 4. Dream Security, BLOCKED (token server-side)

- uid + token: could not capture. The careers page (dreamgroup.com/careers) is WordPress with the Comeet plugin in server-rendered mode: it renders individual `/comeet-positions/...` job links but keeps `comeet_uid` / `comeet_token` in WordPress options server-side. Neither the uid nor the token appears anywhere in the page HTML, and there is no client-side careers-api call to intercept.
- curl: not attempted. This one needs the WP admin settings or a different source; a browser-agent will not help because the call happens server-side.

### 5. Grain Finance, COULD NOT CAPTURE

- uid + token: not found. The careers page (grainfinance.com/careers) is a large JS-rendered page with no Comeet config in the static HTML (the only `company/grain...` reference is a LinkedIn link). The Comeet-hosted page does not resolve: `comeet.com/jobs/grain` and `comeet.com/jobs/grainfinance` both return 404, so the brief's slug `grain` does not map to a hosted Comeet tenant.
- curl: not attempted. Either Grain is not on Comeet under that slug, or the embed is injected client-side at runtime. Needs browser-agent network capture to confirm.

### 6. OneStep, BUILDABLE

- uid `79.007`, token `97742410552F9779774241552F25DC25DC` (34 chars). Both inline in the careers page config.
- curl: HTTP 200, parse OK. Total 6, 3 IL.
- Samples: Head of Research | Tel Aviv; Product Design Lead | Tel Aviv; Senior Product Manager | Tel Aviv.
- Roadblocks: none.

### 7. EX.CO, VALID endpoint, 0 current IL jobs

- uid `F0.005` (the page-embedded `comeet_uid`), token `F53D41EA5BE5BE89D1EA2DF7A8F5` (28 chars).
- Correction: the brief's pre-captured uid `22.66C` returns HTTP 400 with the page token; the page's own `comeet_uid=F0.005` is the working one.
- curl: HTTP 200, parse OK. Total 2 positions, 0 IL (both non-IL).
- Status: credentials are valid, but there are no current Israeli openings. Not buildable right now under the IL-job gate. Recheck later, same posture as the Sightful caveat.
- Roadblocks: none on capture; the constraint is zero IL inventory.

### 8. SparkBeyond, BLOCKED (malformed token in the page)

- uid `82.006`, token `286A1816B6C9EF24C9EF2428650C792` (31 chars).
- The recapture attempt found the SAME 31-char token in the page source (raw context: `"token": "286A1816B6C9EF24C9EF2428650C792","company-uid"`). The source page itself embeds the malformed token, so a fresh full 32-char capture is not possible from the page.
- curl: HTTP 400 "Account uid or token are not valid", confirming the prior PR #373 exclusion. Blocked until SparkBeyond fixes their embed or the real token is obtained from another source.

## Recommendation for the follow-up registry-add PR

Add the three buildable rows (Reeco, Travelier, OneStep), matching the PR #371 Comeet-row shape (`ats=comeet`, `slug=<uid>`, `api_url=.../company/<uid>/positions?token=<token>&details=true`, `verified=true`). Hold EX.CO (valid but 0 IL), and exclude Sightful, Dream Security, Grain, and SparkBeyond until their tokens can be captured (browser-agent for the SPA cases; SparkBeyond needs a corrected token at the source).

# LEVER 1 — BROKEN SUPPLY (fetch-erroring boards)

Investigator run 2026-07-27. INVESTIGATE-ONLY, no code changed.
Every claim tagged VERIFIED / INFERRED / REPORTED with its evidence line.

## HEADLINE (premise partially FALSIFIED)

The brief listed all 5 boards as "persistently 404/abort." Ground truth splits them
into TWO DISTINCT failure classes:

- **Bezeq / HOT / IAI** — endpoints are **LIVE and return valid data RIGHT NOW**
  (HTTP 200, full JSON) when hit from an **Israeli IP**. They fail to populate in the
  nightly cron because the CI runner egresses from **US/cloud IPs** that the IL
  enterprise gateways appear to block. NOT a dead endpoint, NOT parser drift — an
  **infrastructure/egress-geo** problem. One fix (IL egress) recovers all three.
- **ExpressVPN / Shift4** — Greenhouse board slugs are **genuinely dead** (HTTP 404
  "Job not found" from every IP). Real migration/delisting. Low IL value.

Key environment fact (VERIFIED): my egress IP is Israeli —
`curl ipinfo.io` → `ip 77.127.128.236 country IL org AS12400 Partner Communications Ltd. city Rishon LeTsiyyon`.
GitHub Actions runs from US cloud ranges. This is the crux of the Bezeq/HOT/IAI split.

## PER-BOARD TABLE

| Board                       | Error class + status line                                                                                      | Last successful fetch (DB) | Est. IL jobs lost                                                        | Fix difficulty + fix                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **IAI** (iai)               | LIVE from IL, blocked from cloud. `HTTP/2 200`, `content-length: 1104155`, 452 records. NEVER landed a DB row. | never (0 rows ever)        | **~452** (Israel-only by construction)                                   | **MEDIUM (infra)** — endpoint+parser correct; CI must egress from an IL IP.                                                                  |
| **Bezeq** (bezeq_native)    | LIVE from IL, blocked from cloud. `HTTP/1.1 200 OK`, 31 active records. Went dark after 07-09.                 | **2026-07-09 04:42 UTC**   | **~31** live now (37 hist. high-water)                                   | **MEDIUM (infra)** — same IL-egress fix; 07-09 cutover = gateway tightened.                                                                  |
| **HOT** (hot_native)        | LIVE from IL, blocked from cloud. `HTTP/2 200`, 5 records (double-encoded JSON). NEVER landed a row.           | never (0 rows ever)        | **~5**                                                                   | **MEDIUM (infra)** — same IL-egress fix. Low volume.                                                                                         |
| **ExpressVPN** (greenhouse) | DEAD board. `HTTP/2 404 {"status":404,"error":"Job not found"}` from IL IP.                                    | 2026-06-04 05:51 UTC       | **0** (14 hist. inactive, unrecoverable at this endpoint)                | **HARD** — Greenhouse slug gone; `job-boards.greenhouse.io/expressvpn` also 404; no alt slug found. Kape-owned; needs new-backend discovery. |
| **Shift4** (greenhouse)     | DEAD board. `HTTP/2 404 {"status":404,"error":"Job not found"}`.                                               | 2026-06-30 04:58 UTC       | **~0** (2 hist. inactive; registry note: "none currently flagged as IL") | **HARD/skip** — slug dead (shift4/shift4payments/finaro all 404); careers page 429s. Near-zero IL value; deprioritize.                       |

## EVIDENCE (raw lines)

### (a) Error class / status lines — curl as Chrome UA from IL IP

- Bezeq: `HTTP/1.1 200 OK` + `Content-Type: application/json` + body
  `{"isSuccessfull":true,"error":null,"data":[{...}]}` — `bytes: 206490`; parsed `records: 31`.
- HOT: `HTTP/2 200` + body (double-encoded) `"{\"isError\":false,\"data\":{\"vacanciesDetails\":[{\"vacancyName\":\"JB-265\",...}]}}"`; parsed `records: 5`.
- IAI: `HTTP/2 200` + `content-length: 1104155` + `last-modified: Mon, 27 Jul 2026 12:10:18 GMT`; parsed `records: 452`.
- ExpressVPN: `HTTP/2 404` + `{"status":404,"error":"Job not found"}` + `x-amz-cf-pop: TLV55-P3` (Greenhouse/CloudFront).
- Shift4: `HTTP/2 404` + `{"status":404,"error":"Job not found"}`.
- UA-gating ruled out: Bezeq/IAI return `status=200` even with DEFAULT curl UA (no browser UA needed).

### Geo-block corroboration (two independent US-egress proxies)

- jina (US infra): Bezeq → `status=422` TimeoutError navigating to endpoint; IAI → `curl (28) timed out, status=000`.
- allorigins (Cloudflare US): Bezeq → `error code: 522`; IAI → `error code: 522` (522 = origin refused TCP from datacenter IP).
- Contrast: same two endpoints return instant 200 from my IL residential IP. → IL-gateways block cloud/non-IL egress. INFERRED (strong; two providers). Definitive proof = curl from the actual GHA runner (not run this session).

### (b) Since-when — DB (jobs table, project ilmqmodklutztuybsvwd)

Per-board query rows:

- bezeq_native / "Bezeq": `active:0, inactive:37, last_seen:2026-07-09 04:42:53Z, first_seen:2026-06-30 21:45Z`.
  → worked 9 days (06-30→07-09) then dark. Proves CI COULD reach Bezeq until 07-09.
- hot_native: **no rows returned** — 0 rows ever. (ILIKE '%hot%' matched only Comeet photonics cos: Prisma/Dust/Newphotonics — false positives, not HOT Telecom.)
- iai: **no rows returned** — 0 rows ever.
- ExpressVPN (greenhouse): `active:0, inactive:14, last_seen:2026-06-04 05:51Z, first_seen:2026-05-18 12:50Z`.
- Shift4 (greenhouse): `active:0, inactive:2, last_seen:2026-06-30 04:58Z, first_seen:2026-05-18 10:19Z`.

### (c) Est jobs lost — live endpoint counts (all three IL-only by construction, structured_country='IL')

- IAI: 452 live records now (biggest single recoverable pool in this lever).
- Bezeq: 31 live records now; 37 historical high-water.
- HOT: 5 live records now.
- ExpressVPN/Shift4: 0 at current endpoint (boards dead); historical 14 / 2.

### (d) Fix difficulty

- Bezeq/HOT/IAI: NOT dead endpoint, NOT parser drift (payload fields still match mappers:
  Bezeq `description`/`living_area1`/`notes`; HOT `vacancyName`/`jobTitle`/`briefDescription`;
  IAI `id`/`tl`/`cd`/`dc`/`ct` — all present in live bodies). Root cause = CI egress geo/IP
  block. Fix = route the nightly fetch for IL-gateway sources through an IL egress
  (IL-hosted runner, IL proxy/VPN, or a small IL fetch-relay). MEDIUM ops change; recovers
  all 3 at once (~488 jobs) and de-risks future IL-native publisher fetchers.
- These families are 1-company each, so the per-ATS health gate never trips exit 1
  (`PER_ATS_MIN_SAMPLE = 5`, refresh-jobs.ts:78) → they fail SILENTLY. Nobody was alerted.
- ExpressVPN/Shift4: Greenhouse slugs dead; need new-backend discovery (HARD). ExpressVPN
  careers exists (`expressvpn.com/jobs` → 200) but board moved; Shift4 near-zero IL value.

## RECOVERABLE RANKING (by fix difficulty, ascending)

1. **IL-egress infra fix (one change) → ~488 jobs**: IAI ~452 + Bezeq ~31 + HOT ~5. MEDIUM.
2. ExpressVPN ~14 (historical) + Shift4 ~2 → **~0 realistically**; dead boards, HARD discovery, low/zero IL value. Deprioritize.

Total realistically recoverable: **~488 IL jobs**, essentially all from the single IL-egress fix,
IAI dominating (~452).

## CAVEATS / OPEN

- Geo-block mechanism is INFERRED from two US-proxy failures + the DB pattern, not a direct
  GHA-runner curl. Confirm by adding a one-off `curl -w '%{http_code}'` of the 3 endpoints to
  a CI run. Bezeq's clean 07-09 cutover (worked-then-dark) is the strongest single anchor.
- ~452 IAI is the raw live count; downstream junk-title/dedup filters may trim modestly. Still the largest lever-1 prize.

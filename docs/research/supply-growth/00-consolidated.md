# JOBS SUPPLY GROWTH — consolidated investigation (2026-07-27)

INVESTIGATE-ONLY. No code touched, no builds, no deploys. HELD for Eli's ruling.
Evidence tiers: VERIFIED (queried/curled/read this run) · INFERRED · REPORTED.

## Honest baseline (VERIFIED, live DB ilmqmodklutztuybsvwd)

- 5,510 active jobs, 100% IL. 5,112 non-agency, 398 agency. 1,523 remote-FLAGGED.
- Nightly ran this morning (newest last_seen 2026-07-27 04:41 UTC). Zero active rows >3d stale.
- The STALE_DAYS=2 sweep is HEALTHY. The corpus problem is INFLOW + WRITE-PATH, not the sweep.
- Source mix: comeet 2936 · greenhouse 866 · adamtotal 690 · workday 226 · ashby 203 ·
  amazon 147 · lever 112 · successfactors 98 · workable 97 · adamtotal_agency 92 ·
  pwc 39 · smartrecruiters 4 · bezeq_native 0.

## THE REFRAMES (each corrects the brief's premise)

1. NVIDIA/PANW did NOT self-heal; they will not. Root cause is a Postgres statement_timeout
   on the UPSERT under lock contention — NOT Workday fetch batching. (Lever 2, VERIFIED via GHA logs)
2. "5 broken boards" is half wrong: Bezeq/HOT/IAI return HTTP 200 from an IL IP; CI's US egress
   is geo-blocked by the IL enterprise gateways. ExpressVPN/Shift4 are genuinely dead (~0 IL). (Lever 1)
3. The remote facet is DISHONEST: 27.6% is ~89% comeet structural-flag noise; honest remote ≈ 0.7%,
   remote+hybrid ≈ 1.7%. (Lever 5, VERIFIED via payload inspection)
4. The dormant registry (47% zero-active) is NOT a growth lever — mostly genuinely-empty LIVE boards,
   not misconfig. No new multi-tenant ATS clears the 4+-IL-tenant bar. (Lever 3) — confirms the
   2026-06-14 free-sourcing-exhausted finding.

## RECOVERABLE VOLUME (get back jobs we already had / can already reach)

| Fix                                                                                | IL jobs                                     | Effort  | Infra?                | Tier                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------- | ------- | --------------------- | ---------------------------------------- |
| Lever 2: upsert 57014-retry + lower concurrency                                    | ~412 (NVIDIA 278 + PANW 134, 07-25 actuals) | LOW-MED | none                  | VERIFIED                                 |
| Lever 1: IL-egress routing for native fetchers                                     | ~488 (IAI 452 + Bezeq 31 + HOT 5)           | MED     | YES (IL proxy/runner) | 200s VERIFIED; geo-block INFERRED        |
| Lever 4: SF dark-board re-probe (Teva/EY/Qualitest)                                | ~90+ (Teva ~49 hist)                        | LOW     | none                  | VERIFIED dark                            |
| Lever 4: R1 Track B 6 supported-rail cos (slug harvest)                            | tens                                        | LOW     | none                  | REPORTED (investigation done, unwritten) |
| Total recoverable ≈ 900+ IL jobs ≈ 16% of the 5,510 base, BEFORE any new sourcing. |

## LEVER 2 detail (highest jobs-per-effort)

- GHA 07-26 + 07-27 logs: `✗ NVIDIA / Palo Alto Networks workday upsert_error: canceling
statement due to statement timeout`. Status=upsert_error → the WRITE died, fetch succeeded. VERIFIED.
- 07-25 good night: NVIDIA 278 IL/478 total, PANW 134 IL/140, 0 errors. VERIFIED.
- Live curl now: NVIDIA cxs 200 total=452 (1.5s), PANW 200 total=150 (1.1s). Endpoints healthy. VERIFIED.
- 17 statement-timeout victims that night span comeet/greenhouse/adamtotal + sweep + landing_stats
  → aggregate lock-contention storm, not Workday-specific. VERIFIED.
- Driver: 120s statement_timeout; jobs=161MB, 22 indexes (10 GIN); 20 workers × 200-row batches.
  Biggest boards (NVIDIA/PANW #1/#2) time out most reliably → 2 dark nights → STALE_DAYS=2 sweep
  deactivated them. VERIFIED.
- Fix: per-company upsert has NO retry (refresh-jobs.ts:284-296); the SWEEP already has a
  57014-retry (327-385) to copy. Also lower concurrency/batch size. LOW-MED, no new infra. VERIFIED code read.

## LEVER 1 detail

- IL egress (77.127.128.236 Partner Communications) → Bezeq 31, HOT 5, IAI 452 recs, HTTP 200. VERIFIED.
- Two US-egress proxies can't connect (422/522) → IL gateways block US datacenter IPs. INFERRED.
- DB: HOT + IAI never landed a row; Bezeq worked 06-30→07-09 then dark. VERIFIED.
- 1-company ATS families never trip PER_ATS_MIN_SAMPLE=5 → fail SILENTLY. VERIFIED.
- ExpressVPN/Shift4: Greenhouse 404 from every IP, migrated/delisted, ~0 IL. VERIFIED.
- ACTION BEFORE INVESTING: one `curl -w '%{http_code}'` of the 3 endpoints INSIDE a CI run to
  turn geo-block INFERRED→VERIFIED before standing up IL infra.

## LEVER 3 detail (NOT a lever)

- Zero-active = 550/1162 (47%). Match HIGH-confidence (slug==company_slug; name-fallback added 0).
- Split: supported-but-empty 279 · careers_url-no-fetcher 202 · dead 69.
- Supported-but-empty spot-check (5 greenhouse): 4/5 are LIVE boards with genuinely 0 IL; 1 wrong slug.
  Dominant cause = "board live, 0 IL openings," not misconfig. NOT 279 quick wins.
- Unsupported shared ATS: eightfold 3, icims 1, oracle 1, teamtailor 1, recruitee 1 — none ≥4 IL. No fetcher justified.

## LEVER 5 detail (honesty, not volume)

- 1,358 comeet remote rows: payload location.is_remote=true but ZERO "remote" in location text —
  fires on office jobs (IT Manager/Tel Aviv etc). Ashby j.isRemote equally noisy. VERIFIED.
- Honest remote ≈ 41 rows (0.7%); remote+hybrid ≈ 92 / 25 cos (1.7%). Greenhouse (keyword-only) clean.
- No new remote source clears the eligibility + 4+-tenant bar (dedicated remote boards = US-auth/US-tz +
  aggregator-scrape legal track). Not a growth engine.
- Product defect: Remote filter chip (JobsSearchTab.jsx:81) + card badge (JobCard.jsx:66) consume the
  noisy flag → users get ~1,523 mostly-office jobs badged remote. Fix = drop untrusted structural fields
  in normalization (ats-fetchers.ts L969 comeet / L379 ashby). LOW effort. Consumers are CV-LANE surfaces.

## LEVER 6 detail (standing mechanism = decay-defense, not growth)

- companies_il.json hand-maintained (1162, stamp 06-14, no generator). Promotion gate refresh-jobs.ts:483:
  `c.verified && c.api_url && ENABLED_ATSS.has(c.ats)`. 854 processable; 241 at ats:"unknown".
- Mechanism: quarterly both-pass crawl (static+XHR, disjoint sets) on refreshed Calcalist/TechAviv/funding
  seeds; weekly automated dark-tenant/ATS-migration digest (piggyback nightly); annual roster refresh.
- Cost: laptop compute, no paid APIs, ~20-25 min/crawl, <1hr human/week promotion.
- Automation split: crawl+IL-validate+migration-digest+fit-prefilter = cron→draft; promotion = manual (Eli's gate).
- Honest yield: single-digit cos / 10-40 IL jobs per crawl (INFERRED from 06-14 union = 6 cos/~28 jobs).
  Trickle. Real ROI = decay-defense (the 630 dark rows prove decay is the live risk).

## PROPOSED SEQUENCE (quick wins first) — HELD for ruling

- P0 verify: one CI-run curl of IAI/Bezeq/HOT → confirm geo-block before IL-infra spend.
- P1 write-path resilience (Lever 2): upsert 57014-retry + concurrency tune. ~412 jobs, no infra, hardens whole nightly. BEST ratio.
- P2 dark-board re-probe (Lever 4): SF Teva/EY/Qualitest + Bezeq/HOT endpoint repoint (non-geo cases).
- P3 IL egress (Lever 1): stand up IL proxy/runner → IAI 452 + Bezeq + HOT. Biggest volume, needs infra decision.
- P4 backlog harvest (Lever 4): R1 Track B 6 supported-rail cos + token-harvest rider.
- P5 honesty (Lever 5): remote-flag fix (coordinate CV lane on JobsSearchTab/JobCard consumers).
- Standing (Lever 6): institute continuous-sourcing cron as decay-defense maintenance.
- NOT pursued (closed by evidence): dormant-registry mining (Lever 3), any new multi-tenant ATS, aggregator scraping.

## Scope note

Lever 2 fix, Lever 1 egress, Lever 6 cron, dark-board re-probes = sourcing pipeline (scripts/, GHA) — NOT design lane, NOT CV lane. The Lever 5 remote-flag fix is normalization (scripts/lib/ats-fetchers.ts) but its consumers (JobsSearchTab/JobCard) are CV-lane surfaces — coordinate.

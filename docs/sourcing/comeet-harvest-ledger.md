---
title: Comeet Harvest Ledger (dropped tenants)
status: living
owner: eli
last_reviewed: 2026-07-12
code_paths:
  - supabase/functions/_shared/libraries/companies_il.json
  - docs/sourcing/site-search-harvest.md
---

# Comeet Harvest Ledger

A running record of Comeet tenants that were discovered during a harvest but deliberately NOT added to
the fetch registry (`companies_il.json`), with the reason and date. This exists so a future harvest
does not re-investigate the same dead ends, and so the difference between "not yet resolved" and
"resolved and rejected" stays clear.

Scope note: a tenant is dropped here only when it fails on its own merits (no live IL hiring, dead
board, or the company hires entirely elsewhere). Tenants held back only for a collision decision
(dual-board vs repoint) are not ledger drops; they are resolved in the registry once decided.

## Round 2 (2026-07-08)

Browser discovery surfaced 37 net-new Comeet tenants (slug plus uid, no tokens). Tokens were sourced
at fetch time from each public hosted board page and each board was validated live against the
careers API. Live IL counts used the fetcher's own rule. Keepers and repoints went into the registry;
the drops below did not.

| tenant   | uid    | date       | reason                                                                                                                                                                                               |
| -------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| eteacher | E2.002 | 2026-07-08 | 11 open positions, all non-IL (Argentina, Brazil, Morocco, Philippines, Turkey, and similar). 0 live IL roles. Hiring elsewhere, not an IL employer for our purposes. Discovery weak-flag confirmed. |
| loox     | 77.00E | 2026-07-08 | 0 open positions on the board. Weak-flag confirmed (no open roles, no address). Not a seed: nothing to indicate current IL hiring.                                                                   |

### Not dropped (for the record)

- ship4wd / 29.00B: 0 open roles today but KEPT in the registry as a true seed (Prilenia precedent) -
  live Comeet board with real IL presence. Will start contributing IL jobs when the board reopens.
- crossriver / C7.00F and jvp / 35.00E: already present in the registry at the same uid (true HAVEs),
  so not re-added and not drops.

## Registry dedupe cleanup (2026-07-08)

A hygiene pass on pre-existing Comeet rows removed six entries. Two of them were `slug=None` stubs with
no working board that could not be resolved statically; they are ledgered here as revisit candidates
(they are NOT dead, just currently un-fetchable). The other four were pure duplicates of a canonical
row and are listed under "Also removed" for the record.

Revisit candidates (removed from the registry until a UID can be captured):

| tenant   | date       | reason                                                                                                                                                                                  |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LawGeex  | 2026-07-08 | Careers page still shows Comeet markers, but the company-uid and token are injected via JS (comeetapi.com) and are not statically extractable. Revisit with a JS-render discovery pass. |
| TytoCare | 2026-07-08 | Careers page no longer exposes any Comeet markers (likely moved ATS or is fully JS-rendered). Needs fresh ATS discovery, not just a Comeet UID capture.                                 |

Also removed (pure duplicates of a canonical row, not revisit candidates):

- CodiumAI -> merged into Qodo (both Comeet UID B8.00B; Codium rebranded to Qodo).
- Foresight Autonomous -> merged into Foresight Automotive (both UID 13.000; board self-identifies as
  Foresight Automotive).
- Papaya -> merged into Papaya Gaming (both UID 46.00B; one physical board).
- Kornit Digital (slug=None stub) -> already present and live at UID 11.00F; the stub was redundant.

## Round 2 backlog: passes 1-3 resolution (2026-07-08)

Resolution of the earlier pre-#527 discovery backlog (token-harvest passes 1-3, handoffs 2026-06-23/24/25
plus PRs #375/#383). Most of the batch was already absorbed into the registry by #525/#527 (18 of the 26
reconstructed candidates were exact-UID HAVEs). Of the genuinely-remaining tenants, two were kept
(Sensi.AI E7.00F, SysAid 43.00A; live-verified 6 and 9 IL roles via classifyLocation + isJunkTitle) and
the three below were dropped.

| tenant      | uid    | date       | reason                                                                                                                                                                                                                                                                             |
| ----------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SparkBeyond | 82.006 | 2026-07-08 | Broken embed: the careers page ships a malformed 31-char token; the careers API returns HTTP 400 "Account uid or token are not valid" across three separate sessions. Unrecoverable without fabricating the missing character. Revisit only if SparkBeyond fixes the source embed. |
| BeeHero     | 78.00E | 2026-07-08 | 0 IL when live, token dead. The 2026-06-25 capture reported 0 IL roles; the captured token now returns HTTP 400. Tag: revisit if a fresh token is captured AND IL roles appear.                                                                                                    |
| Cynomi      | F9.00F | 2026-07-08 | 0 IL when live, token dead. Same posture as BeeHero: 0 IL at capture, token now HTTP 400. Tag: revisit on fresh token + IL roles.                                                                                                                                                  |

### Not dropped (for the record)

- Sensi.AI / E7.00F and SysAid / 43.00A: KEPT in the registry (good token, live IL roles).
- Browsi / F3.00B and Sightful / 26.00D: no registry action and NOT drops - queued for the browser-agent
  token recapture pass (Browsi token now HTTP 400; Sightful never had a capturable token). Browsi had
  3 live IL at capture, so it is worth recapturing.
- Band (joinband.com): the 2026-06-25 "Band / 8A.003 / thenvoi" label was a mislabel. Comeet board 8A.003
  self-identifies as "Thenvoi" (a different company); joinband.com exposes no Comeet markers. The registry
  `unknown` Band row was left untouched (no repoint).

## Dual-ATS resolution (2026-07-10)

Nine registry entries had the same company (same domain) on two different ATS boards - the
same-domain-across-two-ATS set surfaced by the #530 dedupe scan. Each board was fetched live (the real
fetcher + classifyLocation + isJunkTitle). Where one board was dead or empty, the duplicate row was
dropped in favor of the live Comeet board; the live board already had its own row, so no repoint edit
was needed. `total_companies` 1164 -> 1156 (6 dead/stub drops here + 2 zero-IL ashby drops below).

Dropped (dead / empty / unresolved-stub duplicate; the live Comeet board was kept):

| company              | dropped row (ats / slug)    | reason                                                                        |
| -------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| Atera                | smartrecruiters / atera     | SmartRecruiters board 0 positions; live at Comeet 63.00B (17 total / 10 IL).  |
| Incredibuild         | workable / incredibuild     | Workable board 0 positions; live at Comeet 66.00F (4 / 3 IL).                 |
| DoorLoop             | greenhouse / doorloopisrael | Greenhouse board HTTP 404 (dead); live at Comeet 0A.006 (5 jobs, 0 IL today). |
| Deloitte             | unknown / (no board)        | Unresolved stub, no api_url; superseded by live Comeet F7.00B (94 IL).        |
| Israel Discount Bank | unknown / (no board)        | Unresolved stub; superseded by live Comeet F8.004 (66 IL).                    |
| ZIM                  | unknown / (no board)        | Unresolved stub; superseded by live Comeet 72.008 (83 / 14 IL).               |

Flags resolved (Eli, 2026-07-10):

- Oligo Security - DROPPED ashby / oligo. Ashby was live (15 jobs) but 0 IL (global-only board); the
  Comeet board 5A.00B carries all 7 IL roles. Revisit if IL roles appear on the ashby board.
- Sentra - DROPPED ashby / sentra. Same posture: ashby live (3 jobs) but 0 IL; Comeet 87.00B carries the
  7 IL roles. Revisit if IL roles appear.
- BioCatch - KEPT BOTH (confirmed true dual-board, not double-posting). Title comparison of the live IL
  roles: only 2 titles overlap (data scientist; senior devops infra engineer); lever carries 3 IL roles
  NOT on comeet (senior backend engineer, senior data engineer, web solutions engineer), comeet carries
  6 not on lever. Dropping lever would lose 3 real IL roles, so both rows stay. The 2 overlapping titles
  double-list in the jobs cache (minor).

Total after the dual-ATS pass: 1164 -> 1156 (6 dead/stub drops + 2 zero-IL ashby drops).

## Research-280 batch evaluations (2026-07-10)

The June VC-portfolio + CTech-funding research batch (308 candidates). After dedupe, 92 were net-new;
static ATS detection succeeded on only 2 (the rest are JS-gated -> browser-agent queue). Both detected
boards were live-verified:

| company  | ats / slug       | live IL  | verdict | reason                                                                                                       |
| -------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| Tapcheck | ashby / tapcheck | 0 (of 9) | DROPPED | US-HQ (on-demand pay); the ashby board carries only US roles. Revisit only if an Israel-based board appears. |

Not dropped: CopilotKit (lever / copilotkit) - 0 live IL of 2 today, but Israeli-founded with a live
board, so KEPT in the registry as a Prilenia-style seed (will contribute IL jobs when it hires in Israel).
Registry 1156 -> 1157.

## Manual careers hunt — resolution (2026-07-10)

Eli hand-hunted `docs/sourcing/careers-hunt-list.md`; every capture below was
re-verified from the terminal against the live board API (production fetchers +
classifyLocation + isJunkTitle), not trusted from the hunt notes.

### Added to the registry (verified, >=1 live IL role)

| company        | ats / id                             | live total / IL | note                                                                                                       |
| -------------- | ------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------- |
| Insait         | comeet 0B.00C                        | 13 / 4          | The #1 tracker gap (tracked 3x). Tel Aviv-Jaffa.                                                           |
| droxi          | comeet 1A.001                        | 5 / 4           | Real domain droxi.com (not .ai); Ramat Gan. The hosted droxiai board 404s; this uid+token is the live one. |
| Spacial        | ashby / spacial                      | 6 / 1           | P3b net-new; AI Researcher (IL). Domain unconfirmed.                                                       |
| Orion Security | greenhouse / orioncscybersecurityltd | 4 / 2           | P3a net-new; EU-hosted careers page but served by boards-api.greenhouse.io.                                |

### DROPPED — Browsi (Eli decision 2026-07-10)

- **Browsi** — comeet F3.00B (slug `recruitingteam`), 10 / 6 IL. Recapture worked,
  but F3.00B is a **shared HR umbrella account** ("recruitingteam") serving multiple
  companies — wiring Browsi to it mis-attributes other companies' roles. **Skip.
  Revisit only with company-filtered fetching** (a per-company filter on a shared
  Comeet board), not before.

### Fetch FAILED from terminal (ledger the attempt)

- **LawGeex** — comeet 73.003, the hunt-captured token returns HTTP 400 ("Account
  uid or token are not valid"). Confirms the board is still dead (already a revisit
  candidate). No registry action; recapture again only if a fresh token appears.

### Verified live but 0 IL — ALL DROPPED (Eli decision 2026-07-10)

Eli's call was "seed the Israeli-founded ones, ledger-drop the rest." Location
spot-checks showed **none of the 19 boards has any Israel presence** — every board
Eli's hunt surfaced is the company's US/global ATS instance, a same-name _different_
company, or empty. Under the CopilotKit precedent (seed only a board that will
_contribute IL jobs_), **none qualify** — so all 19 are ledger-dropped, not seeded.

| company        | board                      | why 0 IL (dropped)                                                                             |
| -------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| Heven AeroTech | gh/hevenaerotech           | 39 jobs, ALL Virginia/Washington (US entity). classifyLocation correct — NOT a classifier bug. |
| Sequence       | ashby/sequence             | 20 jobs, all London/NYC — a DIFFERENT (UK/US) "Sequence", not the IL fintech. Wrong company.   |
| Orbs           | ashby/orb                  | 16 jobs, SF/NYC — this is Worldcoin's "Orb", not IL Orbs. Wrong company.                       |
| Rylo           | lever/rylo                 | 8 jobs, San Francisco. US board / same-name co.                                                |
| Cylake         | ashby/cylake-inc           | 10 jobs, Sunnyvale (US).                                                                       |
| Hud            | ashby/hud                  | 4 jobs, SF/Singapore.                                                                          |
| Healthee       | workable/healthee          | 2 jobs, New York.                                                                              |
| Cloudshare     | workable/cloudshare        | 3 jobs, Denver (US).                                                                           |
| Hi Auto        | workable/hi-auto           | 2 jobs, Atlanta/Miami (US).                                                                    |
| Vayyar         | workable/vayyar            | 0 jobs (empty board; can't confirm it's the IL company's).                                     |
| Anzu           | workable/anzu              | 0 jobs (empty).                                                                                |
| Voom Insurance | workable/voom-insurance    | 0 jobs (empty).                                                                                |
| Blast Security | ashby/blast-io             | 0 jobs; Eli flagged "don't think this is it".                                                  |
| Duetti         | lever/duetti               | 13 jobs, US (music royalties).                                                                 |
| Laminar        | lever/runlaminar           | 8 jobs, US (acquired by Rubrik).                                                               |
| Legion         | gh/legion                  | 16 jobs, US workforce-mgmt co (not the IL "Legion").                                           |
| Bessemer VP    | gh/bessemerventurepartners | 2 jobs, US VC.                                                                                 |
| Run:ai         | sr/RunAI1                  | 0 jobs (acquired by NVIDIA).                                                                   |
| 257            | workable/257               | 0 jobs; origin unconfirmed.                                                                    |

If any of these (e.g. Vayyar, Anzu, Voom — clearly IL-named but empty boards) later
posts an IL role, or if a company-specific IL board is found, revisit then.

### Already live — no gap (hunt was redundant)

- **Abra R&D** (comeet 15.007) and **Abra Information Technologies** (comeet 12.003)
  are both already in the registry, wired, and live (123 and 46 positions). "Abra"
  was not actually a gap. (Note: Abra R&D's IL count is inflated by "AI Bootcamp
  Course" listings — a staffing/training board; pre-existing, not from this pass.)

### Unsupported ATS confirmed (no registry change; needs a fetcher adapter)

Dazn (Pinpoint, division_id 11796), Varonis (Jobvite), Wenrix (Rippling), INNOVA
(cruitie.com), Voltify (Breezy), Wallarm (Recruitee). Plus the 2E set already on
the hunt list (Eightfold / iCIMS / Oracle HCM / SuccessFactors / Phenom).

### No board / apply-by-other-means (no change)

Kovrr (email apply; KovrrIns is the inert registry row), Findings (dead page),
Terminal X + Factory 54 (Fox Group; Hebrew job-boards only, no modern ATS), HiO
(LinkedIn only), origami.ms (no careers page), Sightful (Comeet account
deactivated — post-layoff, confirmed dead), TytoCare (switched ATS; no board found).

### Still needs a token capture (uid known, not actionable from terminal)

The comeet hosted-board URLs Eli surfaced (Nominal E8.003, CardinalOps 66.005,
Sunbit 37.001, Dazz D9.009, Tevel/airobotics AA.005, Camtek F4.00D, Nova A5.007,
Lili A6.009, OneLayer 8A.007, Act Security 8A.009, Daylight 7A.00D, Moonshot 87.005,
Airis Labs 69.00A, and the 2A UID set) confirm the uid but expose no token — still
a browser Network capture. No registry change.

## Comeet token-capture shortlist — all 30 boards dead (2026-07-12)

Automation test of the 30-company `comeet-token-shortlist.md` (unknown-ATS registry rows with a
known Comeet UID, generated 2026-06-14). Both capture routes were validated against the known-good
Insait (uid 0B.00C) and reproduced its token exactly - the method works - but every board on the
shortlist is dead, so 0 tokens were captured. Funnel: 30 -> 0 captured -> 0 verified -> 0 IL.
Ledgered here so a future harvest does not re-investigate them.

- **Deactivated (25, VERIFIED - the board serves "This Spark Hire Recruit account has been
  deactivated"):** AnyClip 91.00D, Autotalks 03.009, Bionic Security F5.008, Centrical C1.00A,
  Cyabra 29.006, Cyberbit C3.00E, Cynerio 16.00E, CYREBRO A7.003, CyberInt 83.006, Deep Instinct
  72.00A, env0 B6.005, HiredScore 24.000, Karamba Security D7.00D, Lightico 94.00D, Lumigo 04.001,
  Noname Security 86.001, Otorio E3.003, Perimeter 81 64.00C, Pliops 05.004, Qwak 99.005, SCADAfence
  43.00E, SciPlay D5.00A, Sorbet 17.002, Syte 74.002, Vulcan Cyber 94.00E. Many are acquired/shut
  (Guardicore/Noname -> Akamai, CyberInt/Perimeter 81 -> Check Point, Qwak -> JFrog, SCADAfence ->
  Honeywell, Vulcan -> Tenable, Future Meat -> Believer Meats).
- **Unresolved (5, INFERRED dead - no comeet board resolves for the uid on any slug tried):**
  Bidalgo 22.006, Future Meat B7.00A, Glassbox 53.00C, Namogoo B4.006, Guardicore F2.008.

These stay as inert `unknown`-ATS rows in the registry (no live board to wire). Dropping the 30 inert
rows is an optional separate registry-cleanup PR, not done here. Reusable finding: token capture from
a LIVE comeet board is automatable (headless Chromium capturing the `comeet.co` `token=...&company-uid=`
request), so future harvests of live boards are a scripted loop, not manual DevTools work.

### Re-detection pass (2026-07-12): same companies, one ATS generation later

The 30 comeet boards are dead, but most companies live on - so a re-detection ran the detectable set
(greenhouse / lever / ashby / workable / smartrecruiters) against their current slugs. SmartRecruiters
was dropped as a detector (its `/postings` endpoint returns HTTP 200 `totalFound:0` for ANY slug - a
catch-all); greenhouse/lever/ashby/workable 404 on garbage and are reliable. Funnel:

**30 -> 6 acquired-skip -> 24 re-detected -> 7 live workable boards -> 0 with >=1 IL -> 0 wired.**

- **Acquired into a parent already in the registry (6, skipped, note as acquired):** Guardicore ->
  Akamai, Noname Security -> Akamai, CyberInt -> Check Point, Perimeter 81 -> Check Point, Qwak ->
  JFrog, Vulcan Cyber -> Tenable. (Their roles flow through the parent's registry row.)
- **Migrated comeet -> workable, live board but 0 open jobs today (7, VERIFIED via verify-hunt, 0/0):**
  Bionic Security (`bionic`), Glassbox (`glassbox`), Lumigo (`lumigo`), Otorio (`otorio`), Pliops
  (`pliops`), Sorbet (`sorbet`), SCADAfence (`scadafence`). Board identity confirmed by the workable
  subdomain title ("<Company> - Current Openings"). **0 IL today, so nothing to wire now.** RECOMMEND
  (Eli's call, not done here): wire the still-independent ones as `workable` seeds (unknown -> workable
  - slug) so the nightly refresh picks up IL roles when they post - but check acquisition status first,
    since several of the 7 are acquired/winding down and an empty board may stay empty.
- **No detectable ATS board found (17):** AnyClip, Autotalks, Bidalgo, Centrical, Cyabra, Cyberbit,
  Cynerio, CYREBRO, Deep Instinct, env0, Future Meat, HiredScore, Karamba Security, Lightico, Namogoo,
  SciPlay, Syte. (Either self-hosted/undetectable ATS or fully dark.)
- **False positives discarded (per investigation-rules calibration):** all SmartRecruiters 0-job hits
  (catch-all); greenhouse `future` (5 jobs, Remote/LA - a different "Future", 0 IL); ashby `believer`
  (1 job, 0 IL); workable `deep` (title "DEEP", a different company, not Deep Instinct - its real slug
  `deepinstinct` returns an empty generic board).

Verified with `scripts/verify-hunt.ts` (production fetchers + IL classifier). The comeet capture harness
was promoted to `scripts/comeet-token-capture.mjs`. No registry change (0 boards with >=1 IL).

#### Independence check on the 7 workable boards (2026-07-12) — 1 seeded, 6 ledgered

Web-verified the current status of each of the 7 comeet -> workable migrations before seeding. Only a
still-independent, operating company is worth a seed (its board hires under its own name); an acquired
or absorbed company's board winds down.

**Seeded as a `workable` seed (1, independent + operating):**

- **Glassbox** (`glassbox`) — registry row flipped `unknown -> workable`. Alicorn-owned (PE take-private, 2024) but operating under its own brand (~272 employees Apr 2026; acquired Anodot 2025). Live board,
  0 IL today; flips via the nightly cron when it posts IL roles. CopilotKit-style seed.

**Ledgered, NOT seeded (6, acquired/absorbed or winding down):**

| company         | uid    | reason (web-verified 2026-07-12)                                                                                                                                               |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bionic Security | F5.008 | Acquired by **CrowdStrike** (Sept 2023, $239M); absorbed into Falcon. Not an independent hirer.                                                                                |
| Lumigo          | 04.001 | Acquired by **Dash0** (Feb 2026); Tel Aviv team absorbed into Dash0.                                                                                                           |
| Otorio          | E3.003 | Acquired by **Armis** (Mar 2025, $120M); integrated into Armis Centrix.                                                                                                        |
| Pliops          | 05.004 | Acquired by **Astera Labs** (Feb 2026, $70M); ~half of staff into a new Astera IL R&D center.                                                                                  |
| SCADAfence      | 43.00E | Acquired by **Honeywell** (2023); integrated into Honeywell Forge (Eli's earlier finding).                                                                                     |
| Sorbet          | 17.002 | Not acquired but **winding down** — laid off the majority of staff (Sept 2025, "structural reset"); NY-HQ, marginal IL prospect. Revisit only if it clearly resumes IL hiring. |

Their workable boards exist but are 0-job today; wiring them would carry inert rows that are unlikely
to flip. Their inert `unknown` comeet rows stay as-is (dropping them is the optional registry-cleanup PR).

## Registry cleanup: sandbox/test board dropped (2026-07-15)

Removed the **Ori** row from `companies_il.json` (comeet 229 -> 228, total 1163 -> 1162). It was a **Comeet sandbox/demo board**, not a real hirer, surfaced by a live-page review (a 31-month-old "Marketing Manager" ranked 88% in a user's Jobs-for-you).

| company | uid    | slug/domain             | reason                                                                                                                                  |
| ------- | ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Ori     | 97.00E | ori-sandbox / ori-sandbox.com | **Sandbox/test board.** Domain `ori-sandbox.com`, slug `ori-sandbox`; 4 evergreen generic demo postings never removed (Marketing Manager 31mo, CFO, "QA Manger" [demo typo], Supervisor). No real production Ori board exists to re-point to. Added by the domain-unverified Comeet r1 harvest 2026-07-08. |

**Sweep:** grepped all 1,163 registry rows for sandbox/test/demo/staging/example/dummy/playground/qa-pattern slugs, uids, domains, and careers URLs. **Ori was the only hit** — the class is cleared once, not per-discovery.

**Jobs:** the 4 job rows it fed (`99bb3056`, `28f10f50`, `f1f0322a`, `a3cb4045`) were deactivated (`is_active=false`) so they leave Jobs-for-you immediately; with the registry row gone, the nightly harvest won't re-surface them.

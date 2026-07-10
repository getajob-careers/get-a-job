---
title: Comeet Harvest Ledger (dropped tenants)
status: living
owner: eli
last_reviewed: 2026-07-08
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

| company | ats / id | live total / IL | note |
| --- | --- | --- | --- |
| Insait | comeet 0B.00C | 13 / 4 | The #1 tracker gap (tracked 3x). Tel Aviv-Jaffa. |
| droxi | comeet 1A.001 | 5 / 4 | Real domain droxi.com (not .ai); Ramat Gan. The hosted droxiai board 404s; this uid+token is the live one. |
| Spacial | ashby / spacial | 6 / 1 | P3b net-new; AI Researcher (IL). Domain unconfirmed. |
| Orion Security | greenhouse / orioncscybersecurityltd | 4 / 2 | P3a net-new; EU-hosted careers page but served by boards-api.greenhouse.io. |

### HELD for Eli's call (verified with IL roles but attribution risk)

- **Browsi** — comeet F3.00B (slug `recruitingteam`), 10 / 6 IL. Recapture worked,
  BUT F3.00B is a **shared HR umbrella account** ("recruitingteam") that may serve
  multiple companies — wiring Browsi to it risks mis-attributing other companies'
  roles to Browsi. Not added pending Eli's decision (add-with-caveat vs skip).

### Fetch FAILED from terminal (ledger the attempt)

- **LawGeex** — comeet 73.003, the hunt-captured token returns HTTP 400 ("Account
  uid or token are not valid"). Confirms the board is still dead (already a revisit
  candidate). No registry action; recapture again only if a fresh token appears.

### Verified live but 0 IL (do NOT add; seed/ledger — Eli's call, CopilotKit/Tapcheck precedent)

Israeli-founded with a live board, 0 IL today (seed candidates): Heven AeroTech
(gh, 39/0 — **spot-check: 39 jobs/0 IL is suspicious for an IL drone co**), Rylo
(lever 8/0), Hud (ashby 4/0), Sequence (ashby 20/0), Cylake (ashby 10/0), Orbs
(ashby 16/0), Blast Security (ashby 0/0), Healthee (workable 2/0), Vayyar (workable
0/0), Cloudshare (workable 3/0), Anzu (workable 0/0), Voom Insurance (workable 0/0),
Hi Auto (workable 2/0). Non-IL / ambiguous (drop, don't seed): Duetti (lever 13/0,
US), Laminar (lever 8/0, US/Rubrik), Legion (gh 16/0, likely the US workforce co),
Bessemer VP (gh 2/0, US VC), Run:ai (SR 0/0, acquired NVIDIA).

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

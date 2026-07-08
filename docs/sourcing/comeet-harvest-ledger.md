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

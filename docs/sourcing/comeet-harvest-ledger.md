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

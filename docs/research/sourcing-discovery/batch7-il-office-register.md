# Batch 7 - the greenhouse /offices endpoint is an employer-declared Israel register (2026-07-28)

RESEARCH ONLY. No code. `companies_il.json` untouched. Nothing deployed. HELD.
**No ruling requested.** Parked until Eli is off the P0.

Arc: #837, #843, #844, #845, #846, #847, #848.

---

## 0. Headline

Last night I measured the greenhouse `/v1/boards/<slug>/offices` join for attributing jobs to Israel
and concluded it was **not worth building** - it over-attributed multi-office postings and produced
"Product Manager | Ljubljana" as Israeli. That conclusion stands.

But the same endpoint answers a different question extremely well, and this one is worth having:

**Which companies have told their own ATS they have an Israeli office?**

143 of 210 greenhouse boards we fetch declare at least one Israeli office. That yields two things we
did not have:

1. **A decay-defense watchlist: 34 boards with a confirmed Israeli office and zero Israeli postings
   right now.** These are demonstrably not dead companies. They are between openings, and they should
   be re-probed on a short cycle rather than aging into the "genuinely empty" pile.
2. **An employer-declared IL-remote-hiring register.** Several of those offices are explicitly *remote*
   Israeli offices. That is far stronger evidence of IL-hireability than parsing "EMEA" out of a
   location string, and it materially upgrades the proposal in #848.

## 1. The watchlist: confirmed Israeli office, zero Israeli jobs today

34 boards. Sorted by board size, because a company running 532 open roles with a declared Israeli
office is a very different proposition from one running 3.

| Company | greenhouse slug | board total | declared Israeli office |
|---|---|---:|---|
| Stripe | `stripe` | 532 | `Israel Locations` |
| Pure Storage | `purestorage` | 316 | `Israel` |
| Veeam | `veeamsoftware` | 249 | `Israel` |
| Braze | `braze` | 231 | `Israel` |
| Block (Square) | `block` | 210 | `Israel` |
| Elastic | `elastic` | 195 | `Israel` |
| **HubSpot** | `hubspotjobs` | 175 | **`Remote - Israel`** |
| Anaplan | `anaplan` | 174 | `EMEA / Israel` |
| Harness | `harnessinc` | 101 | `Jerusalem, Israel` |
| **ZoomInfo** | `zoominfo` | 94 | **`Remote Israel - IST` + `Ra'anana, Israel`** |
| **OpenTable** | `opentable` | 57 | **`Remote Location - Israel`** |
| Zynga | `zyngacareers` | 52 | `Israel` |
| Ping Identity | `pingidentity` | 50 | `ISR - Office - Tel Aviv` |
| **New Relic** | `newrelic` | 49 | **`Home Office (ISRAEL)`** |
| Mixpanel | `mixpanel` | 43 | `Israel / Tel Aviv District` |
| At-Bay | `atbayjobs` | 29 | `Israel` |
| Dropbox | `dropbox` | 28 | `Israel` |
| LivePerson | `liveperson` | 18 | `Herzliya Office` |
| Sayari | `sayari` | 17 | `Israel` |
| PhaseV | `phasev` | 14 | `TLV Office` |
| Pagaya | `pagaya` | 13 | `Pagaya Israel / Tel Aviv` |
| **AssemblyAI** | `assemblyai` | 10 | **`Remote - Israel`** |
| Cybereason | `cybereason` | 9 | `Tel Aviv, Israel` |
| Magic Leap | `magicleap` | 9 | `Tel Aviv, Israel` |
| Imubit | `imubit` | 5 | `Imubit, Ltd / Modiin-Maccabim-Reut` |
| Spot.IM | `openweb` | 5 | `Tel Aviv-Yafo` |
| Codefresh | `octopusdeploy` | 3 | `Israel / Tel Aviv-Yafo` |
| Eko, Hivestack, Outbrain, Rhino Federated, Vim | - | **0** | (board itself empty; already known dead) |

Two rows are **explicitly deprecated by the employer** and must NOT be treated as evidence:
**Hippo** declares `X (DO NOT USE) Israel` and **Sumo Logic** declares `Israel (DO NOT USE)`. Their own
ATS says the office is retired. Excluded from the watchlist above. This is a nice property of the
signal: it carries its own invalidation.

Control group, to show the signal is not vacuous: **109 boards declare an Israeli office AND have live
Israeli postings** (Cato Networks 44, Nebius 41, NICE 36, Astera Labs 29, Taboola 29, SentinelOne 28,
SimilarWeb 24, Wiz 24, ...). So 143 declare an office, 109 are currently producing, 34 are dormant.
The dormancy rate among IL-office companies is 24%, which is consistent with the 28% figure #844
measured across all fetchable rows and is a useful cross-check on both numbers.

## 2. Why this is better than a location-string heuristic

#848 measured the remote lane and found its central problem is that IL-hireability is a **per-employer
policy fact**, not a per-posting string fact, and that the only evidence-backed allowlist member we had
was PostHog (one company, from a hand-read public handbook).

The `/offices` register is a different and better class of evidence: it is the **employer's own ATS
configuration**. A company that has created a `Remote - Israel` office in greenhouse has, by its own
declaration, an Israel employment path. Five such declarations found:

- **HubSpot** - `Remote - Israel`
- **ZoomInfo** - `Remote Israel - IST` (the timezone in the office name is a nice touch)
- **OpenTable** - `Remote Location - Israel`
- **New Relic** - `Home Office (ISRAEL)`
- **AssemblyAI** - `Remote - Israel`

None of these five currently has an Israeli posting, so this is **not** supply today. Its value is that
it converts #848's allowlist from a hand-research problem into a **derivable** one for greenhouse
tenants: rather than reading handbooks one company at a time, read the offices register. That is
mechanically cheap and it is sourced from the employer.

**Caveat I am not glossing over:** a declared remote-Israel office proves the employer has *configured*
an Israel path, not that any given posting is open to Israel. It is necessary-not-sufficient. It should
gate an allowlist, not populate a job count.

## 3. What this does and does not change

Changes:
- #848's proposal step 3 (per-employer allowlist) gets a mechanical evidence source for greenhouse,
  which is 210 of the boards we fetch. Membership goes from 1 hand-researched company to a derivable
  set, with 5 remote-Israel declarations found on the first pass.
- We now have a principled dormancy watchlist instead of treating a zero as death. 34 boards, several
  very large (Stripe 532 postings, Pure Storage 316, Veeam 249, Braze 231, Block 210).

Does not change:
- **My negative on the offices join for job attribution stands.** Using offices to decide whether a
  *posting* is Israeli over-attributes multi-office roles. Do not revive that.
- No new supply today. Every company in section 1 has zero Israeli postings right now. This batch adds
  **0 verified IL jobs** to the ledger and I am not pretending otherwise.

## 4. Suggested cadence (not a request, just the shape)

The 34-row watchlist is the natural weekly re-probe target: one `/jobs` call each, 34 requests, a few
seconds. It is strictly cheaper than the current implicit approach of re-probing everything, and it is
aimed at the population most likely to flip from zero to non-zero.

The equivalent register does not exist on every rail. Workday exposes location facets which serve a
similar purpose (#846 used them). Comeet, Ashby, Lever and Workable have no office-registry concept
found so far, so this technique is greenhouse-specific for now.

## 5. Cost

Zero fetch-time change proposed. The watchlist would be a *reduction* in probe volume versus sweeping
all 827 fetchable rows.

## 6. Not claimed

- **0 new IL jobs.** This is instrumentation, not supply.
- A declared office is not proof of a current opening, and a declared *remote* office is not proof that
  a specific posting is IL-eligible.
- 143/210 covers only greenhouse rows that are `verified` with a slug. Non-greenhouse rails are out of
  scope of this technique.
- The two `DO NOT USE` offices are excluded, but I have not audited whether other employers encode
  deprecation differently.

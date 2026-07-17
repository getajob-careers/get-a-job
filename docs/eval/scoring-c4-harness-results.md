# C4 role-tier — harness results (pinned 160 labels)

Run: `node scripts/c4-harness.mjs` (imports the real `src/lib/roleTier.js`, so it
cannot drift from the shipped classifier). Doc-grounded on the frozen 160 human
labels (`docs/eval/match-eval-labels.md`), no PII, committed with the code.

**Scope of what this measures:** the C4-specific question — does the tier signal
FIRE on the right rows? It does NOT compute the post-penalty attainability_score
or the final served rank movement; that needs the live join (skills_canonical,
function_family, req_skills_core) the earlier component harnesses pulled via MCP.
Firing discrimination is the gating question, and it is answered here.

## Headline: C4 as specced FAILS the GOOD-recall guardrail

| label   |   n | C4 fires | fire% | underleveled (gap<0) | overleveled (gap>0) |
| ------- | --: | -------: | ----: | -------------------: | ------------------: |
| GOOD    |  33 |       10 |   30% |                   10 |                   0 |
| STRETCH |  76 |       18 |   24% |                   16 |                   2 |
| BAD     |  51 |        6 |   12% |                    1 |                   5 |

**10 of 33 GOODs are penalized (30%).** A signal that demotes 30% of the jobs
humans called great cannot ship. Every GOOD misfire is under-leveled (gap<0) and
every one is in **P09 (senior Product)** or **P14 (senior Engineering)**.

## Root cause: MAX-target over-penalizes IC-track seniors

The spike chose `target_tier = MAX across target titles` and validated it on P10
(mid Finance, targets Senior Accountant / Accounting Manager / Financial
Reporting Manager → MAX = manager), where an IC analyst really is a step down.

But the same rule breaks for senior IC tracks:

- **P09** targets `VP Product / Head of Product / Director of Product` → MAX =
  manager. Its GOOD jobs are `Senior Product Manager` / `Product Manager`, which
  classify **ic** (the IC-discipline exception is correct — a PM is an IC). Gap
  = −2 → penalized. But for a senior PM aiming at Director, a Senior PM role is
  on-track, so the human labeled it **GOOD**.
- **P14** targets `Engineering Manager / Staff Engineer / Principal Engineer` →
  MAX = manager. `Senior Software Engineer` (GOOD) classifies ic → gap −2 →
  penalized wrongly.

**The confound is structural, not a threshold problem:** P10's under-leveled
analysts (correctly STRETCH) and P09/P14's senior IC roles (GOOD) have the
_identical_ tier_gap of −2 and opposite labels. No cutoff on tier_gap separates
them. The only structural difference the data exposes is user level: P10 is
`mid_career`, P09/P14 are `senior_career`.

## The one narrowing that clears the guardrail — and its cost

Suppress the **under-leveled** penalty (gap<0) for `senior_career` users
(rationale: a senior IC role is at-level for a senior person even when their
target set aspires to leadership; over-leveled still fires):

- GOOD penalized **10 → 0** ✅ (guardrail cleared)
- P10's under-leveled catches **survive** (P10 is mid, not senior)
- BUT STRETCH fires drop **18 → 2** — the suppression also removes ~16
  senior-user under-leveled STRETCH catches, some of them legitimate (e.g. P02's
  "overqualified — below target level"). It is not a free fix.

After the narrowing, C4 fires on **7 rows total (5 BAD + 2 STRETCH, 0 GOOD)**.
Clean, but small: its marginal value on top of the already-shipped C1+2a is
modest, and C1+2a already crush the lone-generic/wrong-family BADs that make up
most of the 51.

Separately, the **over-leveled** direction (gap>0) is clean on its own — 5 BAD,
2 STRETCH, **0 GOOD across all users**, no senior-gating needed. The whole
guardrail problem lives entirely in the under-leveled direction, which is also
the direction Eli's motivation (P10 overrides, the "Monetization Manager"
under-leveled half) cares about most.

## Recommendation — HOLD for Eli's ruling; do not ship as-is

The shipped classifier + wiring are correct and byte-identical with the flag off;
nothing here reaches a user. The open decision is the firing RULE, and it is
Eli's:

1. **Adopt senior-suppression** — preserves the under-leveled motivation, clears
   the guardrail, but shrinks C4 to a ~7-row signal and drops some real senior
   STRETCH catches. Needs the live re-score to confirm rank movement + that it is
   not overfit to these 160.
2. **Ship over-leveled-only** — the clean half, no senior-gating, but it does NOT
   catch P10 (P10's overrides are all under-leveled), i.e. it abandons the
   original motivation.
3. **Park C4** — the deterministic tier signal does not discriminate cleanly in
   the under direction, and C1+2a already carry most of the BAD-catching. A
   second labeling round on fresh data (already the post-C4 plan) may be the
   better next move than forcing this signal in.

penaltyPerStep (0.15) is untuned — tuning is moot until the firing rule is
settled, so it was not swept.

# Component 2b - direction-aware blend: harness results (HELD for Eli)

Build of Component 2b from the approved #598 design, on top of 2a (#599, merged). Adds the
direction signal back into the for-you SORT (attainability is direction-blind by design). Behind
the same `?scoring_v2` flag, default OFF. Durable record of the tuning + the named live acid test.

## What 2b does

`rank_score = attainability_score x (1 + w * on_direction)`, `on_direction = relevance_match ===
"primary"`, **w = 0.25**. It is the for-you feed's SORT key only:

- `rank_score` EQUALS `attainability_score` with the flag off (feed order byte-identical to
  legacy) and when a job is not on-direction. Verified: 120/120 ELI candidates byte-identical off.
- The card still DISPLAYS `attainability_score` ("qualified now") and the picks/stretch bands are
  still built on it. This is Option B: sort by a transparent function of the two displayed axes,
  never a hidden re-break of sort==one-number (the #597 / 2026-07-16 invariant).
- NOT hard tier-first (all-primary-above-all-adjacent) - that was the pre-#585 "75% below 21%"
  failure. A soft multiplicative boost so a primary GOOD generally clears the adjacent block
  without burying a genuinely stronger adjacent match.

## Sectioning decision (Eli's Jeen.ai-TPM concern)

Keep the existing picks/stretch band split; sort by `rank_score` within it. The band still
honestly gates "qualified now": an over-leveled on-direction role (e.g. a 63% Technical PM whose
seniority is above the user's ceiling) stays a Stretch - correct - and `rank_score` floats it to
the TOP of the Stretch section rather than promoting it into picks. Dissolving the picks/stretch
partition into a single `rank_score` list is a legitimate Option-B UI evolution but belongs to the
two-number-card follow-on, not this ranking PR. (The single-list alternative is measured in the
harness for comparison; on the pinned set it barely differs.)

## Live acid test: ELI full candidate list (the Helfy test, reproduced offline)

Pulled ELI's real 120-candidate set (same RPC + params as `UnifiedJobsFeed`), scored with
`scoring_v2`, reproduced gate -> sort -> section. This reproduces Eli's live finding exactly.

|                                   | Helfy PM (primary GOOD) rank | above the wrong-direction block?                                                      |
| --------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| current live (attainability sort) | **7**                        | no - below 6 adjacent (SDR 85, CSM 84, Mktg 83, Influencer 78, CSM 74, CS&Support 73) |
| 2b w=0.20                         | 2                            | clears CSM/Marketing, still below the one 85% SDR                                     |
| **2b w=0.25**                     | **1**                        | **yes - rank_score 88 clears the entire block**                                       |
| 2b w=0.40                         | 1                            | over-lifts: a weak ~55% primary PM (AU10TIX) starts rising                            |

w=0.25 lifts Helfy above the whole block while a weak (~55%) primary stays down. Chosen.

## Harness (160 labels, w=0.25 vs baseline scoring_v2 attainability sort)

| metric                                    | baseline (w=0) | 2b (w=0.25) |
| ----------------------------------------- | -------------- | ----------- |
| off-direction ranked above a primary GOOD | 10             | **5**       |
| BAD-above-GOOD inversions                 | 16             | 14          |
| primary-GOOD in top-5                     | 18             | 19          |
| non-primary-GOOD in top-5 (guardrail)     | 2              | **0**       |
| BAD in top-5                              | 24             | 24          |

The direction failure (off-direction above a primary GOOD) halves; primary-GOOD recall rises.

## GOOD-recall guardrail + the disclosed cost

The 3 non-primary GOODs in the label set are all borderline **rank-9, ~50-57% attainability,
off-direction** rows (P04 Comp Consultant / P06 Sales Associate / P13 Jr SWE). The w-boost to
on-direction jobs drops them out of top-5 (2 -> 0). This is the direction tradeoff, made
explicit: 3 borderline off-direction GOODs (9% of all GOODs) yield to on-direction roles. w was
tuned so the label direction-metric is at its plateau (10->5) exactly where the live Helfy test
clears; a higher w only sinks these further and starts over-lifting weak primaries.

## Recommendation (HELD)

Ship 2b at w=0.25 inside `scoring_v2`. It fixes the named live failure (Helfy and the PM-track
cluster now clear the wrong-direction CSM/SDR/Marketing block on Eli's account) and halves the
label-level direction inversions, at the cost of 3 borderline off-direction GOODs. Awaiting Eli's
harness review + the two-URL live check with the Helfy test named below.

**Eli's live acid test (named):** on your account, baseline vs `?scoring_v2=1` - confirm Helfy PM
(and the PM-track cluster) rank above the wrong-direction CSM/SDR/Marketing block, and eyeball
that on-direction Stretch roles (Jeen.ai TPMs) sit at the top of the Stretch section, not buried.

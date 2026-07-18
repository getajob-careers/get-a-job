# Component 2a - must-have weighting: harness results (HELD for Eli)

Build of Component 2a from the approved #598 design (`scoring-c2-musthave-direction-design.md`).
Flag-gated (`?scoring_v2`), default OFF. This doc is the durable record of the measured
result + the **mandatory additivity decision** (§5 of #598). Nothing ships default-on until
Eli's harness review + two-URL live check.

## What 2a does

Reshapes the CORE portion of the skill axis inside `computeSkillAxis`, used by
`attainability_score` ONLY (the canonical for-you number; `fit_score` keeps the legacy hit
ratio, so sort==display==bands is preserved for free). Two changes, both flag-gated:

1. **Distinctive-weighted coverage** - each required core is weighted 1.0 if distinctive,
   `0.35` if generic (reusing C1's `GENERIC_SKILLS`). `coverageW = matchedWeight / totalWeight`,
   so **missing a distinctive must-have costs more** than missing a generic one, and a
   generic-only match scores low. A full match (all cores matched) still yields `coverageW = 1.0`
   - the asymmetry is that misses cost, matches don't over-reward.
2. **Distinctive-evidence floor** - multiply `coverageW` by `evidence(distinctiveMatched)`
   `= {0: 0.15, 1: 0.85, 2+: 1.0}`. This hard-floors the **lone-generic / no-distinctive**
   signature (the 64%-BAD cluster) while leaving genuine full-coverage matches at ~1.0.

`rank_score = (coreScore·2 + niceRatio)/3` keeps the legacy 2:1 core:nice blend.

## Harness method (reusable for 2b)

Fixed-pinned offline re-score: the 160 labeled (profile, job) tuples
(`docs/eval/match-eval-pinned.json` × `docs/eval/match-eval-labels.md`, GOOD 33 / STRETCH 76 /
BAD 51) joined to the live profile/job inputs and re-scored with the **real** `scoreJobFit`
(imported, not re-implemented - mirrors production), `educations=[]` to match the pinned
generator. Sort + section reproduce `UnifiedJobsFeed`. Metrics computed on the **rendered**
number (`attainability_score`), per the 2026-07-16 measurement lesson.

**Validation:** reconstruction reproduces the design's **21 served-order BAD-above-GOOD
inversions exactly** → join trustworthy. Score drift vs the frozen 07-15 pinned scores is
small (median 3 pts; 6/160 rows > 5 pts) from profile edits since; the recomputed baseline
(flags off) is used as the honest current reference and 2a is measured as the delta from it.

## Results (160 labels, re-sorted live per condition)

| condition                      | BAD@5 | GOOD@5 | BAD-above-GOOD inv | GOOD-BAD sep | STRETCH-BAD sep |
| ------------------------------ | ----- | ------ | ------------------ | ------------ | --------------- |
| baseline (flags off)           | 28    | 18     | 29                 | 10.9         | -1.8            |
| C1 only (`scoring_confidence`) | 21    | 21     | 18                 | 14.4         | +2.1            |
| **2a only**                    | 26    | 19     | 24                 | **20.8**     | **+5.6**        |
| **both = `scoring_v2`**        | 24    | 20     | **16**             | 17.8         | +4.8            |

## GOOD-recall guardrail

- GOOD@5: 2a **19 ≥ baseline 18**; both **20**. No net recall loss.
- Exactly one baseline-top-5 GOOD is at risk - **P09 "Group Product Manager - Product Growth"**.
  It matched **all 4 cores incl. 2 distinctive** (coverageW 1.0), so the tuned curve
  (`evidence(2)=1.0`) does **not** sink it. An earlier steeper ramp did, with **no** BAD@5
  payoff - that's why the ramp is binary-ish (guards only the zero-distinctive case). Tuned on
  labels, not by eye.

## Additivity decision (mandatory, §5 of #598): NOT double-counting - complementary

Verified by mechanism, not just aggregates:

- **C1 owns requirement thinness / `coreN=0`** (composite shrink toward 0.5). The residual
  single-generic top-5 BADs are almost all **coreless JDs** (`req_skills_core=[]`) riding a
  neutral 0.5 skill axis + in-range years/seniority. C1's `thinnessByCoreCount[0]` catches them
  (13→6 in top-5); 2a's core-coverage reshape structurally cannot (13→12) - there are no cores
  to weight.
- **2a owns distinctive-weighted core coverage when cores exist** (axis reshape) → it is the
  **calibration** lever: it widens honest GOOD/STRETCH/BAD separation (GOOD-BAD 14.4→**17.8**
  on top of C1; STRETCH-BAD fixed from -1.8 to **+4.8**) and cuts the most-harmful
  **BAD-above-GOOD inversions 18→16**, without shrinking the whole range toward 0.5 the way C1
  does (better for the displayed "qualified now" magnitude).

The two clean **disjoint** BAD populations, so `both` is the intended bundle.

### The one honest tradeoff

`both` BAD@5 = 24 is **higher** than C1-alone's 21. That residual is **coreless BADs (C1's
job, already handled) + off-direction BADs (2b's job - 2a is direction-blind by design)**, and
those extra top-5 BADs sit **above STRETCHes, not GOODs** (inversions went _down_, 18→16). So
2a's contribution over C1 is **calibration + fewer GOOD inversions**, not raw BAD-in-top-5.

## Recommendation (HELD)

Ship 2a inside `scoring_v2` (C1 + 2a bundled, per ruling #2). Its distinct, non-redundant win
is the honest calibrated `attainability_score` that the Option-B two-number card (2b) needs -
C1 alone compresses that number toward 0.5 - plus fewer BAD-above-GOOD inversions. If Eli
optimizes purely for BAD-in-top-5, C1-alone is marginally better on that single metric but
loses the calibration and the inversion win. **2b (direction) is what removes the residual
off-direction top-5 BADs.** Awaiting Eli's harness review + `?scoring_v2=1` live check.

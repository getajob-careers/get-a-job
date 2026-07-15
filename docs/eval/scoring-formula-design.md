# Job-match scoring formula redesign - DESIGN (held for review, no build)

Grounded in the frozen 160-row human labels (`docs/eval/match-eval-labels.md`, GOOD 33 / STRETCH 76 / BAD 51) and the pinned tuples (`docs/eval/match-eval-pinned.json`). This proposes the formula; **nothing ships until reviewed.** The before/after numbers below are _targets/predictions_ from mapping each labeled row to the component that would move it - the real numbers come from re-running `scripts/match-eval-harness.ts` against the pinned set after each component lands.

## 1. Baseline: how badly does the current ranking agree with the labels?

Current scorer = `src/lib/scoreJobFit.js`, weighted composite: skill **0.50** / years 0.20 / education 0.10 / seniority 0.10 / function_family 0.10, with a single weak `extraction_confidence < 0.4 -> x0.9` softener.

Measured against the 160 labels:

| Metric                                         | Current                                  | What it means                                                                                                 |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Mean fit% by label                             | GOOD **84**, STRETCH **72**, BAD **72**  | **The score does not separate BAD from STRETCH at all** (identical means), and GOOD is only 12 pts above BAD. |
| BAD fit% range                                 | 47 - **95**                              | A "should-not-be-near-the-top" job can score 95%.                                                             |
| BADs in top-5                                  | **24 / 51 (47%)**                        | Nearly half the bad matches are in the top 5 shown to the user.                                               |
| BADs in top-3                                  | **14 / 51**                              |                                                                                                               |
| (BAD ranked above GOOD) pairs within a profile | **21**                                   | Direct ordering inversions.                                                                                   |
| ELI flat-tie cluster                           | **7 rows at exactly 87%, 6 of them BAD** | Degenerate ties: different jobs collapse to one score.                                                        |

**Root cause in the code:** `computeSkillAxis` returns `coreRatio = matchedCore / core.length`. A JD with **one** core skill that the user happens to have (even a generic one like `analytical_thinking`) -> `coreRatio = 1.0` -> skill axis = 1.0 = **half the composite maxed on a single generic token**. Nothing discounts a thin JD, a generic match, or low requirement coverage. The `coverage_ratio` (resolved-fraction, Phase 0) exists on the row but is **not folded into the score**.

**BAD attribution (n=51), by cause:**

| Cause                            | Count  | Share | Fixed primarily by                             |
| -------------------------------- | ------ | ----- | ---------------------------------------------- |
| Single / generic-skill inflation | **25** | 49%   | (1) Confidence-aware + (2) Must-have weighting |
| Seniority / level mismatch       | **13** | 25%   | (4) Underleveled signal + (3) Hard gate        |
| Wrong role-family / off-target   | **10** | 20%   | (3) Hard gate                                  |
| Other (sparse JD, edge)          | 3      | 6%    | (5) Embeddings                                 |

Half the bad matches are one failure mode: **thin/generic skill overlap dressed up as a confident high score.** That is the primary target.

## 2. Design principle

The score must express **confidence**, not just overlap. A match built on 1 generic skill against a 1-skill JD is _low-confidence_ and must not outrank a match on 4 distinctive must-haves. Every component below either (a) lowers confidence when the evidence is thin, or (b) hard-caps when a disqualifier is present. Order is deliberate: fix the 49% inflation first (biggest lever, lowest risk), gates and signals next, embeddings only if headroom remains.

## 3. Proposed components (approved order)

### (1) Confidence-aware ranking [biggest lever; targets the 25 inflation BADs + the 7 ELI ties]

Fold a per-(user, job) **confidence factor** into the score so thin evidence cannot produce a confident high fit. Confidence drops with:

- **Requirement thinness** - `core.length` small (a 1-2 core-skill JD carries little signal). A 1-core-skill JD should not let skill=1.0 alone drive an 87%.
- **Coverage** - `coverage_ratio` (fraction of the JD's extracted skills that resolved to canonical IDs; already computed, Phase 0). Low coverage = we are matching on a fraction of the real requirement set.
- **Extraction confidence** - the existing `extraction_confidence`, but as a graded factor, not a binary `<0.4` cliff.
- **Match distinctiveness** - a match resting only on **generic** skills (`analytical_thinking`, `communication`, `cross_functional_collaboration`, `problem_solving`) is weaker evidence than a match on **distinctive** skills (`sql`, `python_development`, `financial_modeling`). Needs a generic-vs-distinctive tag on skill IDs (a `is_generic` flag on the skill library, or a curated set).

Mechanism: `fit_score := neutral + (fit_score - neutral) * confidence`, i.e. shrink toward a neutral prior (say 0.5) proportional to `(1 - confidence)`. A confident 4-distinctive-core match barely moves; a 1-generic-core "100%" collapses toward the middle. This is the Phase 0 honesty gate applied to ranking: **don't render a confident match built on shaky data.**

**Predicted movement:** the 25 single-generic BADs lose their inflation and fall out of the top ranks; the 7-row ELI 87% tie breaks apart (different confidences -> different scores). Target: BAD-in-top-5 drops from 24 toward ~10; GOOD/BAD mean-fit gap widens from 12 pts.

### (2) Must-have weighting [reinforces #1 on the same 25]

Today core counts 2x nice, but a single matched core still yields 1.0. Two changes:

- **Asymmetric must-have penalty:** _missing_ a core skill hurts more than _matching_ a nice-to-have helps. A job whose core requirements are unmet is a weak match even if peripheral skills overlap.
- **Distinctive must-haves weigh more than generic ones** (shares the generic/distinctive tag from #1): matching 1 generic core != matching 1 distinctive core.

**Predicted movement:** sharpens the same 25 inflation cases and lifts genuine GOODs (multi-distinctive-core matches) above thin ones - widens GOOD vs STRETCH separation, not just GOOD vs BAD.

### (3) Hard gates [targets the 10 wrong-family + egregious level mismatch]

Binary disqualifiers that **cap or exclude** regardless of composite:

- **Wrong function family AND ~zero core-skill overlap** -> gate out of top picks. (A marketing role matched to a data profile on one generic skill.)
- **Seniority 2+ bands off** (either direction) -> cap. A Director/VP role shown to a junior, or an entry role shown to a senior, is never a top pick.

Gates encode the label rubric's "BAD = should not be near the top" as a rule, not a hope.

**Predicted movement:** the 10 wrong-family BADs and the most egregious seniority BADs are removed from the top set outright.

### (4) Negative signals [the named-signal layer; targets the 13 seniority BADs + the 5 human overrides]

Graded penalties (not binary gates) for patterns the labels flagged. First named signal, per Eli:

- **Underleveled matches** = job level **below the profile's TARGET**, assessed on **BOTH** (a) seniority band **and** (b) role tier (**IC vs manager track**). **Penalize in both directions** - we already catch junior-shown-senior via `below_floor`; this adds **senior-shown-junior** (the current `above_ceiling -> 0.25` exists but at only 10% weight it is too weak, and it is band-only, blind to IC-vs-manager). Role tier needs a signal: derive an IC/manager/lead tier from the job title + `function_family` (or add it to extraction). This is the pattern behind **every one of the 5 human overrides** (all GOOD->STRETCH overqualification, 4 of them P10 FP&A-analyst roles against a manager target).

Additional named signals proposed from the BAD clusters (for your approval):

- **Single-generic-skill inflation** as an explicit signal (belt-and-suspenders with #1): `matched_core <= 1` AND that skill is generic -> cap. Named so it is measurable on its own.
- **Flat-tie / degenerate-score signal** (the ELI 87% cluster): when many candidates collapse to one score, add a deterministic tie-breaker (distinctive-core count, then seniority-band fit, then coverage) so identical composites do not share a rank. Largely dissolved by #1, but named so we can verify the tie cluster is gone.

**Predicted movement:** the 13 seniority BADs are penalized below the top; the human's 5 STRETCH overrides (senior->IC/analyst) are reproduced by the underleveled signal rather than needing manual correction.

### (5) Embeddings [last, only if headroom remains]

Semantic JD<->profile similarity, used only where the structured axes are blind - sparse JDs whose extracted requirements are all empty (the axes default to 0.5 and the score is uninformative), and the residual "other" BADs. Deferred: it is the highest-cost, lowest-interpretability lever, and #1-#4 should absorb ~48 of the 51 BADs. Only build if the post-#4 harness re-run still shows a meaningful BAD-in-top-5 residual attributable to semantic gaps.

## 4. Combined predicted agreement (targets)

| Metric                    | Current          | Target after #1-#4                      |
| ------------------------- | ---------------- | --------------------------------------- |
| BADs in top-5             | 24 / 51          | **< 8** (mostly the sparse-JD residual) |
| Mean fit%: GOOD vs BAD    | 84 vs 72 (12 pt) | **>= 25 pt** separation                 |
| BAD-above-GOOD inversions | 21               | **< 5**                                 |
| ELI 87% tie cluster       | 7 rows (6 BAD)   | **0** (ties broken, BADs demoted)       |
| STRETCH mean vs BAD mean  | 72 vs 72         | STRETCH clearly above BAD               |

These are predictions to be _validated_, not claims.

## 5. What to measure (before/after methodology)

- **Harness re-run on the pinned set** (`match-eval-harness.ts` + `match-eval-pinned.json`): re-score the exact 160 (profile, job) tuples with each new component, diff the resulting rank/fit against the frozen labels. The pinned set makes this job-identical, so movement is attributable to the formula, not to corpus drift.
- **Primary metric: BAD-in-top-5 rate** (the user-facing failure). Secondary: GOOD/BAD fit separation, within-profile inversions, per-cause BAD counts (does #1 actually kill the 25 inflation BADs?).
- **Guardrail: GOOD recall.** Every component that demotes BADs risks demoting GOODs. Track GOOD-in-top-5 retention; a component that clears BADs but drops GOODs out of the top is a net loss.
- **Per-component attribution:** land components one at a time (own PR each), re-run the harness after each, and record which labeled rows each moved - so we know each lever's real contribution, not just the combined effect.
- **Confidence calibration check:** after #1, confidence should correlate with label quality (high-confidence rows skew GOOD, low-confidence skew BAD).

## 6. Sequencing + risks

- Ship **#1 first** (own PR): biggest lever (49% of BADs), lowest risk (a monotonic shrink toward neutral). Needs the generic/distinctive skill tag - a curated set or a library flag; propose it in that PR.
- **#2, #3, #4** each as their own PR, harness re-run between each, so contributions are isolated and a regression is attributable.
- **Risk - GOOD collateral:** de-confidencing and gating can catch real GOODs (a genuinely strong 1-distinctive-core match, or a legitimate cross-family pivot). Mitigate with the GOOD-recall guardrail and by tuning shrink strength / gate thresholds against the labels, not by eye.
- **Risk - role-tier signal availability:** IC-vs-manager tier is not cleanly in the corpus today; #4's underleveled signal may need a small extraction/derivation addition. Flag as a dependency, not a blocker for #1-#3.
- **Risk - overfitting to 160 labels:** the labels are one frozen snapshot (16 profiles). Tune thresholds coarsely, prefer principled defaults, and treat a second labeling round as the real generalization check before calling any component done.

_Design only. Formula, predicted label movement, and before/after measurement plan for review. No code changes in this document._

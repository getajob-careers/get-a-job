# Component 2 — must-have weighting + the direction question — DESIGN (held for review, no build)

Grounded in the frozen 160-row human labels (`docs/eval/match-eval-labels.md`, GOOD 33 /
STRETCH 76 / BAD 51) and the pinned tuples (`docs/eval/match-eval-pinned.json`), re-joined
this session to the **live** `jobs.function_family` / `profiles.primary_domain` /
`req_skills_core` so every claim below is measured against the number the product ranks on,
not a proxy. **Nothing ships until reviewed.** Before/after figures for the build are
predictions to validate on the harness re-run; the label cross-tabs in §2 are measured facts.

This is Component 2 in the approved 5-component order (`docs/eval/scoring-formula-design.md`,
held #594). It carries a **scope elevation** over the original C2 line ("must-have weighting"):
Component 1's live check exposed that the for-you sort now honors **only** the attainability
axis, so it has dropped the _direction_ signal the old `fit_score` sort carried (function
family at 10%). This doc resolves both — the must-have math **and** the direction question —
because must-have weighting alone cannot fix a direction-blind sort (§4).

---

## 1. The two problems Component 2 must solve

**(a) Must-have inflation (the original C2).** `computeSkillAxis` returns
`coreRatio = matchedCore / core.length`, so matching **one** core skill against a 1-core JD
maxes the skill axis (= 0.55 of attainability) even when that one skill is generic
(`analytical_thinking`). Nothing discounts a thin requirement set, a generic-only match, or a
match that misses the actual must-haves. This is the single largest BAD driver (§2.2).

**(b) Direction-blind ranking (the elevation).** By design (#393),
`attainability_score` **excludes** `function_family` — it answers "can this person do the job
_mechanically_", not "does the job move them toward their goal". `relevance_match` carries
direction, but only as a **membership gate** (drops `off`; keeps primary/adjacent/unknown) and
a **tiebreaker**. The C1 re-target (#597) made `attainability_score` the _unconditional_ sort
key. Net effect: within the kept feed, an off-direction job with high mechanical attainability
outranks an on-direction GOOD. Eli's live flag-on top-5 showed exactly this — Marketing Analyst
84 > SDR 82 > CSM 80 > the on-direction PM GOOD at 77. The UI promises two axes ("qualified
now" **and** "moves you toward"); the sort honors one.

**Canonical-score rule carried forward (from #594 §7 / #597):** the for-you feed is
sort == display == bands, all on `attainability_score`. Must-have weighting acts _inside_
`attainability_score` (it reshapes the skill axis), so it preserves the invariant for free.
The direction question is the one part of C2 that challenges the invariant — that is the
decision in §4.

---

## 2. What the 160 labels say (measured, not predicted)

Every row below is one of the 160 labeled (profile, job) tuples, joined to the live job's
`function_family` + `req_skills_core` and the user's `primary_domain` + `skills_canonical`.
`relevance_match` is recomputed with the production family maps
(`DOMAIN_TO_FAMILIES` / `FAMILY_ADJACENCY` + early-career business widening). **Validation
check: this reconstruction reproduces the design-doc baseline of 21 BAD-above-GOOD inversions
exactly**, so the join and the relevance/label mapping are trustworthy.

### 2.1 Direction — `relevance_match` × label

| relevance_match | n   | GOOD     | STRETCH  | BAD      |
| --------------- | --- | -------- | -------- | -------- |
| **primary**     | 120 | 30 (25%) | 61 (51%) | 29 (24%) |
| **adjacent**    | 37  | 2 (5%)   | 14 (38%) | 21 (57%) |
| **unknown**     | 3   | 1        | 1        | 1        |

Read the other way — **what share of each label is on-direction (primary)?**

- **GOOD: 30 / 33 = 91% on-direction**
- STRETCH: 61 / 76 = 80%
- BAD: 29 / 51 = 57%

**GOODs skew hard on-direction; off-direction (adjacent) is 57% BAD and only 5% GOOD.**
Direction is a first-class quality signal, and the sort currently ignores it. This is the
empirical answer to the question the handoff posed ("do GOODs skew on-direction?"): **yes,
decisively.**

Where the off-direction rows sit today (attainability sort): of 40 off-direction rows, 28 land
at rank 6–10 and only 12 in the top-5 — so in _this_ snapshot the gross inversion is muted
because adjacent jobs happen to score lower attainability. **That is a coincidence of the
snapshot, not a guarantee of the sort.** Eli's live top-5 (off-direction jobs at 84/82/80 above
the on-direction PM at 77) is the real failure the pinned set understates — same
"pinned-set-understates" caveat that applied to C1's BAD-in-top-5. The concrete in-snapshot
target: **7 off-direction BADs currently sit in a top-5.**

### 2.2 Must-have — matched-core count and distinctiveness × label

| matched_core (∩ user skills) | n   | GOOD     | BAD      |
| ---------------------------- | --- | -------- | -------- |
| 0                            | 24  | 3 (13%)  | 14 (58%) |
| 1                            | 32  | 1 (3%)   | 19 (59%) |
| 2                            | 25  | 2 (8%)   | 6 (24%)  |
| 3+                           | 79  | 27 (34%) | 12 (15%) |

| distinctive core matched | n   | GOOD     | BAD      |
| ------------------------ | --- | -------- | -------- |
| 0                        | 54  | 4 (7%)   | 30 (56%) |
| 1                        | 24  | 4 (17%)  | 9 (38%)  |
| 2+                       | 82  | 25 (30%) | 12 (15%) |

Single-generic signature (`matched_core ≤ 1` **and** zero distinctive matched): **n=42, 64%
BAD, and it captures 27 of the 51 BADs (53%).** This is the "87% on a lone
`analytical_thinking`" cluster the redesign named as the primary target.

### 2.3 The two levers are complementary, not redundant

Must-have still separates strongly **inside the primary bucket** (i.e. after direction is held
fixed), so it is not just re-expressing direction:

| within `primary`  | n   | GOOD     | BAD      |
| ----------------- | --- | -------- | -------- |
| matched_core = 0  | 13  | 0 (0%)   | 8 (62%)  |
| matched_core = 3+ | 66  | 27 (41%) | 8 (12%)  |
| distinctive = 0   | 35  | 1 (3%)   | 18 (51%) |
| distinctive = 2+  | 68  | 25 (37%) | 7 (10%)  |

**Conclusion:** direction cleans the adjacent band (57% BAD → demote below primary); must-have
cleans the thin/generic matches _within_ primary (a primary job on 0 distinctive cores is still
51% BAD). C2 needs **both**, and they attack disjoint BAD populations.

---

## 3. Component 2a — must-have weighting (acts on `attainability_score`)

Preserves the canonical invariant automatically: it reshapes the skill axis, which is already
0.55 of `attainability_score` (display + sort + bands move together).

Three changes to `computeSkillAxis`, all flag-gated (default OFF) behind the same pattern as
C1 (`?scoring_musthave=1`, or fold under the existing `scoring_confidence` flag — see §6):

1. **Asymmetric must-have penalty.** Missing a core skill hurts more than matching a
   nice-to-have helps. Today core weighs 2× nice but a single matched core still yields
   `coreRatio = 1.0`. Replace the ratio with a coverage curve that does not saturate on one
   match: e.g. `coreScore = f(matchedCore, core.length)` where `f` is concave and anchored so
   `1-of-1 ≪ 1.0` and `1-of-4` is low. (Exact curve tuned on the labels, not by eye.)
2. **Distinctive must-haves weigh more than generic ones.** Reuse C1's `GENERIC_SKILLS` set:
   a matched _distinctive_ core counts more than a matched _generic_ core. This targets the
   §2.2 signature directly (distinctive=0 → 56% BAD).
3. **Thin-requirement discount is already in C1.** C1's `matchConfidence` shrinks on
   requirement thinness + distinctiveness; 2a is the _magnitude_ complement (C1 shrinks the
   composite toward neutral; 2a reshapes the raw skill axis so the pre-shrink number is honest).
   The doc must verify 2a and C1 are **additive, not double-counting** on the harness (§5).

Predicted movement: the 51 thin/generic BADs (§2.2) lose their inflated skill axis; genuine
multi-distinctive-core GOODs (41% GOOD at matched_core 3+) rise — widening GOOD-vs-STRETCH
separation, not only GOOD-vs-BAD.

---

## 4. Component 2b — the direction question (the decision this doc exists to force)

Must-have weighting will **not** fix direction: it sharpens the skill-axis _magnitude_, but a
high-attainability off-direction job stays high because direction never enters the sort. The
data (§2.1) says direction must influence rank. **How** is the open architectural decision,
and it collides with the canonical invariant, because direction (`function_family`) was
deliberately removed from `attainability_score`.

The ranking math is the same under both options below: a **direction-aware blend** for the
sort, e.g. `rank_score = attainability_score × (1 + w · on_direction)` (or an additive
`− penalty` on non-primary), with `on_direction = (relevance_match === "primary")` and `w`
tuned on the labels so a primary GOOD generally outranks an adjacent job **without** hard
tier-first ordering. We reject **pure tier-first sort** (all primary above all adjacent):
that is the pre-#585 order that produced the "75% shown below 21%" complaint — too strong
alone, and it makes the visible number non-monotonic with rank. A soft blend keeps the sort
broadly tracking attainability while breaking direction-blind ties. `w` is the one tunable;
GOOD-recall is the guardrail (3 GOODs are non-primary — a too-strong `w` would sink them).

The options differ only in **what the UI shows and therefore how the invariant is honored**:

- **Option A — single blended badge.** Fold direction into one canonical `rank_score`; display
  it; bands on it. **Pro:** preserves sort == display == bands literally; smallest UI change.
  **Con:** the badge no longer means "qualified now" — it silently mixes qualification and
  direction into one "77%", so the user can't tell a strong-fit-off-goal job from a
  weak-fit-on-goal one. It also makes the number dishonest about the axis it appears to name,
  and double-counts against the UI's existing "moves you toward" affordance.

- **Option B — two-number UI (recommended).** Keep `attainability_score` pure and displayed as
  "qualified now"; surface direction as its own visible axis ("on your goal path" /
  "moves you toward", already computed as `relevance_match` / `goal_alignment_score`); sort by
  the transparent blend of the two. **Pro:** each badge stays honest to its axis; matches the
  product's stated two-axis promise; the sort's dependence on direction is _legible_ because
  both inputs are on screen. This is a principled evolution of the invariant — **sort == a
  transparent function of the displayed axes**, rather than a hidden re-break of
  sort == one-number (the exact failure #597 and the 2026-07-16 lesson warn against).
  **Con:** more UI work than A; a second visible signal to design well (band/tag, not a raw
  second percentage, to avoid two competing numbers).

**Recommendation: Option B.** The data makes direction too strong a quality signal
(adjacent = 57% BAD; 91% of GOODs on-direction) to bury inside a number that by construction
excludes it — folding it in (A) makes the displayed "qualified now" badge lie about what it
measures. B honors the two-axis UI that already exists and keeps every displayed number honest.

**Decoupling that de-risks the decision:** the ranking math + harness are **identical** under A
and B — the harness measures the blended _sort_, not the UI. So we can land the
ranking-math + harness as the held C2b PR and validate `w` against the labels **before**
committing UI bytes; the A-vs-B UI treatment is a bounded follow-on within C2 once the ranking
win is proven. **This doc asks Eli to pick A vs B; if B, the ranking PR lands first and the
two-axis UI ships second.**

---

## 5. What to measure (harness + guardrail)

Same method as C1: snapshot the pinned (user, job) inputs via one MCP SQL query (join +
skill-intersect in SQL), re-score offline in a vitest importing the real `computeSkillAxis` /
`matchConfidence` / the new blend. Sort by and report the **rendered** number
(`attainability_score` for 2a; `rank_score` for 2b), per the measurement lesson.

- **Primary metric: BAD-in-top-5** (user-facing failure). In-snapshot targets: the 7
  off-direction BADs in a top-5 (2b) and the 42 single-generic-signature rows (2a).
- **Secondary:** GOOD-vs-BAD and STRETCH-vs-BAD mean separation; within-profile BAD-above-GOOD
  inversions (baseline 21; of which 7 involve an off-direction BAD → 2b's direct target).
- **Guardrail: GOOD recall.** Track GOOD-in-top-5 retention. 2b specifically risks the 3
  non-primary GOODs; 2a risks a genuine strong single-distinctive-core GOOD. Tune the
  must-have curve and `w` against these, not by eye.
- **Additivity check (mandatory):** run 2a alone, C1 alone, and 2a+C1 together on the harness —
  confirm 2a is not double-counting C1's thinness/distinctiveness shrink. If it is, keep the
  raw-axis reshape (2a) and let C1's shrink absorb the confidence dimension, or vice-versa —
  decide from the numbers.
- **Per-component attribution:** 2a and 2b land as **separate held PRs**, harness re-run
  between each, so each lever's contribution is isolated.

---

## 6. Sequencing, flags, risks

- **Order:** 2a (must-have, own held PR) → 2b ranking-math + harness (own held PR) → 2b UI
  (Option A or B per Eli, own PR). 2a first because it is a pure in-`attainability` reshape
  (invariant-safe, lowest risk) and it sharpens the same skill axis 2b's blend then re-ranks.
- **Flags:** reuse the `flags.js` pattern. Open question for Eli: one combined
  `?scoring_v2=1` covering C1 + 2a + 2b (ship the confidence + must-have + direction fix as one
  validated re-rank, per the handoff's deferred flag-default decision), or a separate
  `?scoring_musthave=1` / `?scoring_direction=1` per component for isolated live checks. Default
  OFF either way until Eli reviews the harness.
- **Risk — invariant regression (2b).** The whole reason C1 needed re-targeting was
  sort ≠ display. 2b must not reintroduce it: under Option A the blend IS the displayed number;
  under Option B the sort is an explicit function of both displayed axes. Either is honest; a
  blend that silently drives the sort while the badge shows bare attainability is **not** and is
  explicitly out of scope.
- **Risk — GOOD collateral.** De-inflating (2a) and direction-blending (2b) can catch real
  GOODs (a strong single-distinctive-core match; a legitimate cross-family pivot GOOD — 3 exist
  in the labels). Mitigated by the GOOD-recall guardrail and label-tuned constants.
- **Risk — overfitting to 160 labels (16 profiles).** Tune `w` and the must-have curve coarsely,
  prefer principled defaults, and treat a second labeling round as the real generalization check
  before calling C2 done.

_Design only. Formula, measured label evidence, the A-vs-B decision, and the before/after
measurement plan — for review. No code changes in this document._

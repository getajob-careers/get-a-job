# Phase 2.2 — refine re-bake harness (design, read-only)

Design only. No build, no deploy. Decide whether the **Sonnet refine** is **non-inferior** to
**from-scratch** before the `CV_REFINE_ENABLED` flag could ever flip. Must go **beyond keyword
coverage**: the live read showed the refine **dropping the single strongest bullet** (the SQL /
churn-to-free-trials outcome) that from-scratch kept — a selection-quality failure coverage can't see.

**Live facts (read-only, prod):** 30 onboarded profiles · 36 JD-apps but in only **4 distinct users** ·
23 distinct role titles among those apps · **`jobs` corpus = 5,942 rows with full `description` text +
`jd_language`** · only **2 profiles have masters** (28 need a one-time author) · only 3 apps have an
existing from-scratch CV (so both arms are generated fresh).

---

## 1. Pair set — profile diversity from a concentrated JD set

The 36 app-JDs in 4 users give **no profile diversity**. The lever is the **5,942-row `jobs` corpus**
(real full-text JDs): pair the **30 onboarded profiles against sampled corpus JDs**, not their own apps.

- **Options:**
  - **P-A. 30 profiles × 1 aligned corpus JD = N≈30** (1:1). Each profile paired with a corpus JD picked
    to match its `primary_domain` / top `career_roles.title` (a _plausible target_ — non-inferiority should
    be judged on realistic pairings). Smallest defensible gate.
  - **P-B. 30 profiles × 2 JDs (one aligned + one "stretch"/demanding) = N≈60.** The stretch JD
    deliberately stresses **selection** (a rich JD where the refine must choose which strong bullets
    survive) — this is where the dropped-strong-bullet risk lives.
  - **P-C. random profile×JD pairs** — rejected (random mismatches test nothing useful).
- **Compute reality:** pre-generate the **30 masters once** (28 net-new, ~40s each, ~20 min parallel),
  then each pair is just `refine + from-scratch + judge`. Master cost is amortized, so adding a 2nd JD per
  profile is cheap — which is why P-B is affordable.
- **Lean: P-B, N≈60** (30 aligned + 30 stretch), masters pre-generated in a batch first. If budget-tight,
  ship the gate on the **30 aligned pairs (P-A)** and treat the stretch set as a second, selection-focused
  panel. **N you can actually support: 30 comfortably, 60 with the pre-gen batch; not more without real cost.**
- JD sampling: from `jobs` where `jd_language='en'` and `length(description)` substantial, stratified by
  role family to match the profiles' domains. Freeze the chosen (profile_id, job_id) pairs as the fixed set.

## 2. Keyword determinism — extract once, score both arms against the frozen set

`extractJDKeywords` (gpt-4o) varies run-to-run, so coverage is a moving target.

- **Lean:** **extract `must_include_phrases` ONCE per JD, externally, and freeze it.** Score _both_ arms'
  output `cv_data` against that **one frozen set** (the existing coverage scorer is pure over `cv_data`, so
  this is just calling it with a fixed phrase list). Each arm still runs its **own** internal extraction for
  its own targeting — that's prod behavior and shouldn't be faked — but the **measurement** is deterministic
  and apples-to-apples. No function change needed for scoring.
- _(Note: do NOT try to inject frozen keywords into the functions — that'd be a code change and would mask
  the real targeting. Freeze the SCORER input, not the model input.)_

## 3. Quality — catch "the strongest source material got dropped"

Coverage missed the dropped SQL bullet because its value is **specificity/impact**, not keyword presence.
Three layers:

- **3a. Deterministic selection-delta (cheap, always run).** Compute `from_scratch_bullets ∖ refine_bullets`
  and the reverse. The refine drops bullets by design (selects ~12 of ~19); surface the **dropped set** for
  the judge and flag pairs where the delta is large.
- **3b. LLM-judge head-to-head (the primary quality signal).** Give the judge the **JD + both CVs, blinded
  and order-randomized**, and ask: _(i) which surfaces the more specific, higher-impact, JD-relevant
  achievements?_ (winner: refine / from-scratch / tie), and _(ii) did either omit a strong, relevant
  achievement the other included? which arm, and quote it._ Output `{winner, dropped_strong_bullet:
refine|from_scratch|none, dropped_bullet_text, rationale}`. The `dropped_strong_bullet=refine` rate is the
  direct metric for the observed failure.
- **3c. Strongest-bullet presence check (deterministic backstop).** Identify the master's highest-impact
  bullet(s) per experience (metric/number/proper-noun density) and verify the refine retained them; a
  high-impact master bullet absent from the refine but present in from-scratch is an automatic flag.
- **Anti-fab regression (incl. summary over-claim — explicitly required).** Run an **audit-mode STRICT
  master-only token trace** (the original `tokensTraceToMaster`, _not_ the prod-widened summary gate) over
  **every bullet AND the summary of BOTH arms**. Count tool/skill/metric tokens not in the master, per arm.
  This is exactly where the prod summary-gate widening (JD-keyword proper-nouns allowed) could let an
  over-claim through — the audit uses the strict check to catch it. **Refine must have ≤ from-scratch
  violations, and zero NEW summary over-claims.**
- **Options for the quality measure:** judge-only (3b) is subjective/cheap; deterministic-only (3a+3c) is
  reproducible but blunt; **lean: 3b primary + 3a/3c as deterministic guardrails the judge can't fudge** +
  the strict anti-fab audit. Use ≥2 judge samples (or 2 models) per pair and majority/agreement to cut
  judge variance.

## 4. Run config — Sonnet, single-pass (retry disabled)

- Both arms on **Sonnet**, **single-pass** so coverage and latency are clean (the retry coin-flip at
  score≈50 was the dominant noise last time). The refine's retry is internal; the harness needs a small
  **additive `disable_retry` affordance** on `refine-cv` (build-time, gated, off by default) so it measures
  true single-pass output. (Flagging it as the one tiny build dependency for the harness; not part of this
  read-only design.)
- Record **single-pass coverage per pair → the score distribution across N**. **Retry-threshold
  recommendation** comes from that distribution: set the threshold **below the main cluster** (e.g. ~the
  **20th percentile**) so retry fires only on genuine low-coverage outliers, not the 50-boundary thrash that
  doubled cost in run #2. Concretely: if single-pass scores cluster ~50–70, a `<40` threshold targets real
  failures; report the exact percentile once the distribution exists.

## 5. Pass bar — non-inferiority on coverage AND quality (all must hold)

The flag flips **only if every condition passes** on the frozen pair set:

- **Coverage (frozen-set):** refine median coverage ≥ from-scratch median **− 5 points**, AND refine ≥
  from-scratch on **≥ 80%** of pairs (non-inferiority, not "must win" — speed is the prize).
- **Quality (judge 3b):** from-scratch is preferred on **≤ 30%** of pairs (refine wins-or-ties ≥ 70%), AND
  **`dropped_strong_bullet=refine` on ≤ 10%** of pairs. The dropped-bullet bar is the hard gate the live
  failure demands.
- **Anti-fab (audit):** refine token-trace violations **≤ from-scratch**, and **zero** new summary
  over-claims (tool/skill not in the master).
- Any failure → do not flip; iterate the ops prompt / selection budget and re-run. Mirrors the June 10–11
  bake-off methodology, extended with the quality + anti-fab panels.

---

## Overall lean

**Pair set:** pre-generate the 30 masters, then **P-B (N≈60: 30 aligned + 30 stretch)** profiles × sampled
`jobs`-corpus JDs (English, stratified by domain); ship the gate on the 30 aligned if budget-tight.
**Keywords:** extract once per JD, freeze, score both arms against that one set (scorer input frozen, not
model input). **Quality:** LLM-judge head-to-head (winner + `dropped_strong_bullet`) as primary, with the
deterministic selection-delta + strongest-bullet-presence guardrails, plus a **strict master-only anti-fab
audit over bullets AND summaries** of both arms. **Run:** Sonnet single-pass (needs a tiny additive
`disable_retry` param), and set the retry threshold from the resulting single-pass distribution (~20th
percentile). **Pass bar:** non-inferiority on coverage (median −5, ≥80% of pairs) AND quality (from-scratch
≤30% preferred, refine drops a strong bullet ≤10%) AND no anti-fab regression — all three, or the flag
stays off.

**Smallest build dependency this surfaces:** the `disable_retry` affordance on `refine-cv` (additive,
gated) so single-pass is measurable. Everything else (master pre-gen, JD sampling, frozen-keyword scoring,
the judge, the anti-fab audit) is harness/script code, no change to the live functions.

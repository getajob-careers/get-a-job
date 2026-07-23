---
owner: cv-lane
last_reviewed: 2026-07-23
code_paths:
  - scripts/story-extraction-eval.mjs
  - supabase/functions/_shared/extraction-context.ts
  - supabase/functions/extract-bullets/index.ts
---

# Story-extraction baseline findings + grounding autopsy (round 1)

First run of the frozen eval (`gpt-4o-mini`, judge `gpt-4o`, n=7 SYNTHETIC).
Raw logs: `/tmp/story-eval-{baseline,grounded}.log`; JSON in
`docs/eval/results/*-2026-07-23T10-{09,10}-*.json`.

## The gate fired — grounding does NOT merge as-is

| run (as first scored) | mean quality | anti-fab fails                     |
| --------------------- | ------------ | ---------------------------------- |
| baseline              | 77%          | 1 (messy-bizdev)                   |
| grounded              | 51%          | 3 (thin-swe, messy-bizdev, hebrew) |

Binding rule: an anti-fab regression blocks the merge. **#697 stays HELD.**

### Harness correction (read before trusting the tally above)

The `metricNumbers` scorer had a bug: a number followed by a space + a word
starting with k/m/b absorbed that letter as a magnitude suffix — **"20 meetings"
→ "20 m" → 20,000,000**. That false-positive failed `messy-bizdev` in **both**
modes and forced its `metric_fidelity` to 0. Fixed (suffix must be attached +
word-boundary; regression test added). **Corrected anti-fab tally:**

- **baseline: 0 real anti-fab fails** (messy-bizdev's was the harness artifact).
- **grounded: 2 real anti-fab fails** — `thin-swe`, `hebrew-mixed-analyst`.

The direction is unchanged and cleaner: **grounding introduced 2 real
fabrication leaks against a clean baseline.** Exact corrected means await the
post-recalibration re-run (harness now fixed; not re-run yet, per hold).

## Autopsy — the 2 real grounded regressions (context leakage, VERIFIED)

Direct baseline↔grounded diff on the same frozen input:

**`thin-swe`** — input paste: _"I wrote a script to clean up our database."_

- baseline bullet: _"Wrote a script to clean up the database, improving data integrity and accessibility."_ · skills `["Database Management", "Scripting"]` — anti-fab **PASS**.
- grounded: same bullet · skills **`["Python", "SQL"]`** — anti-fab **FAIL**.
- Neither "Python" nor "SQL" is in the paste. Both are verbatim the profile's
  `top_skills` (`Python, SQL, Git`) fed in the grounding block's
  skill-vocabulary line. The model emitted the reference list as demonstrated
  skills. **Baseline clean → grounding caused it.**

**`hebrew-mixed-analyst`** — input names Tableau + churn 12%, not SQL.

- baseline skills `["Tableau", "Data Analysis"]` — **PASS**.
- grounded skills **`["Data Analysis", "SQL", "Tableau"]`** — **FAIL**: "SQL"
  is not in the paste; it is in the profile `top_skills` (`Data Analysis, SQL,
Tableau`). Same leak vector.

Softer symptom of the same dynamic — **`rich-swe`** (didn't fail, but degraded):
grounded emitted generic profile-style `["Python","SQL","PostgreSQL"]` vs
baseline's source-specific `["Python","SQLAlchemy","Postgres"]`, dropping
`tool_coverage` 0.75→0.50. Grounding nudged toward profile-generic vocabulary
and away from the tools actually in the text.

**Mechanism (VERIFIED): the leak vector is the grounding block's
skill-vocabulary line, and ONLY that line.** The domain + target-role lines did
not leak on any input.

## Autopsy — `messy-bizdev` (both modes)

Input: _"…booked like 20 something meetings in q3 and 3 of them closed?? one was
a big one ~15k arr… set up the crm stuff in hubspot…"_

- **The anti-fab "fail" was the harness bug**, not fabrication (see above).
- **Real extractor behavior, correctly read:** it kept _"over 20 meetings"_ and
  _"3 closed deals"_ faithfully and **did not sharpen the hedge** ("20
  something" → "over 20" is honest). But it **dropped the buried "~15k arr"**
  entirely. True `metric_fidelity` ≈ 0.5 (20 carried, 15k lost), not 0. The
  genuine weakness is **losing a buried/hedged metric**, and it is a property of
  the extractor + the messy input — NOT of grounding, and NOT anti-fab.

## Grounding's genuine benefit (so we don't throw it out)

**`mid-ops`** 84%→98% (judge star_completeness 70→90). Grounded bullet added the
outcome clause _"resulting in faster operations"_ the baseline lacked, without
leaking. The domain/target framing ("Working toward: Operations Manager") is the
plausible cause. n=1 signal, not proof — the recalibrated re-run confirms it.

## Recalibration proposal (PROPOSAL ONLY — held for hub)

The autopsy localizes the entire problem to one line. Ranked:

1. **[SHIP FIRST] Domain + target framing only — delete the skill-vocabulary
   line from the prompt.** The proven leak vector is that one line; the
   domain/target lines carry the only measured benefit (mid-ops) and leaked
   nothing. One-line edit to `formatGroundingBlock`. _Expected:_ removes both
   real leaks (thin-swe, hebrew), recovers rich-swe tool_coverage, keeps the
   mid-ops framing gain. Smallest change, directly on-mechanism.

2. **[FOLLOW-UP if label-consistency still wanted] Move skill-vocabulary out of
   emission into skill-ID resolution** (Eli's candidate d). The user's
   vocabulary aligns emitted skills to canonical IDs downstream (the existing
   normalise-then-match bridge), never enters the extraction prompt, so it can
   shape resolution but never add a skill. _Expected:_ restores the
   label-consistency motivation with zero emission leak. More work (touches the
   resolver, not just the prompt); do after #1 proves framing is safe.

3. **[BELT, pair with #1 — do not ship alone] Deterministic post-process
   contamination gate** in the edge fn: drop any emitted skill that appears in
   the grounding context but not the source text. _Expected:_ hard guarantee
   against the exact leak, cheap. Band-aid over a still-leaky prompt if used
   alone; as a net behind #1 it's belt-and-suspenders. Can't catch paraphrased
   leaks.

4. **[REJECT as standalone] Prose "never copy from context" rule with MUST-NULL
   force + structural separation.** Mini models hedge past prose rules
   (lesson 2026-04-28); unreliable on its own. Fine as extra wording alongside
   #1, not as the fix.

**Recommendation: ship #1, optionally with #3 as a deterministic net; defer #2.**

## Status

- Harness fixes (key sanitize + metricNumbers regex) landed on #697 — correctness
  only, no grounding-lever change.
- Grounding recalibration is a PROPOSAL; **not built.** Re-run the gate only
  after the hub confirms the chosen fix. Frozen set stays frozen.

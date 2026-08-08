\---

## description: Weekly funnel snapshot — runs the audited TEMPLATE.sql blocks, diffs against the last run, writes a dated report. Scrub-drift guard, block-count check, read-back verification.

# /user-pulse

One fixed question, on a schedule, diffed against the last run: where does the
funnel stand, and what moved. **The diff is the artifact.** A report that
repeats every number unchanged from last time has failed at its one job.

Design rationale, the contract with `/usage`, and the history of what changed
and why live in `docs/usage-pulse/user-pulse-spec.md`. Do not restate them
here and do not copy SQL into this file — `docs/usage-pulse/TEMPLATE.sql` is
the one canonical copy of the queries.

Run the steps in order. Steps 1, 2 and 3 have stop conditions. Do not proceed
past a stop without an explicit instruction from the user.

\---

## Step 1 — Scrub-drift guard

Read `.claude/skills/scrubbed-usage/SKILL.md` fresh from disk, every run. Do
not rely on anything already in context.

Compare its `real\\\\\\\_users` email denylist regex against the regex cached in the
`real\\\\\\\_users` CTE in `docs/usage-pulse/TEMPLATE.sql`.

Compare **every** occurrence of the CTE in `TEMPLATE.sql`, not just the first.
The regex is repeated in each block, and a divergence between blocks is the
same defect as a divergence from `SKILL.md`.



The regex appears 11 times in `TEMPLATE.sql` as of 2026-08-08: once per

`real\\\\\\\_users` CTE (8), twice in the population FALSIFY's decomposed

exclusion columns, and once in the maturity-gate block. Search for the

regex itself, not for `with real\\\\\\\_users as (` — three copies sit outside a

CTE definition. If the count has changed, say so: a block was added or

removed since this note was written, and that is worth stating rather

than silently accommodating.

**If they match:** say so in one line and continue.

**If they differ — STOP.** Do not run any block. Report:

* which file each version came from
* **both regexes quoted literally, in full**, on separate lines
* the specific tokens that differ, named individually
* the output of `git diff --stat -- .claude/skills/scrubbed-usage/SKILL.md`

Describing the difference is not sufficient. Quote both.



If that diff is non-empty, `SKILL.md` has uncommitted local changes — the

live file has drifted, not the template. Say so explicitly. Without this

check the natural inference runs the other way, and the recommended action

would write the drifted regex into the canonical copy.

Then ask whether to update the template now or proceed knowingly stale. Do not
choose. Do not edit either file without an explicit answer.

## Step 2 — Template age and cohort-boundary coverage

Read the cohort boundaries from the header of `TEMPLATE.sql`.

If `current\\\\\\\_date` is more than 21 days past the start of the newest boundary
(`post-launch`), flag it:

> post-launch cohort is now N days wide and still open-ended — consider
> whether a new boundary is needed

This is a prompt for a human decision, not a blocker. Note it and continue.

The population block's `pct\\\\\\\_post\\\\\\\_launch` assertion is the data-driven version
of the same question; the two are complementary, not redundant.

## Step 3 — Run the blocks

Count the `-- BLOCK:` markers in `TEMPLATE.sql` and state the number before
starting. That count is how many results to expect.

Tell the user to:

1. Paste `docs/usage-pulse/TEMPLATE.sql` into the Supabase SQL editor **once**
2. Highlight each `-- BLOCK:` individually and run it
3. Paste each result back, in order

**Do not run the whole script.** A multi-statement script silently returns
only the last statement's result, with no error (`getajob-schema.md` §10).
Selection-only execution is required.

**Before analysing anything, verify the count.** If fewer results came back
than there are markers — **STOP** and say exactly which blocks are missing, by
name. Do not infer, interpolate, or carry a value forward from the prior run
to fill a gap. A short paste has already happened once and went undetected.

Also check block identity, not just count: each block's CONFIRM and FALSIFY
carry distinct column names precisely so a mis-selected result identifies
itself by its header. If a header doesn't match the block it was pasted
under, stop and say so.

## Step 4 — Locate the diff baseline

Find the most recent prior file in `docs/usage-pulse/runs/`, sorted by
filename date.

If none exists, this is the first run: say so, report absolute numbers only,
and skip the diff framing entirely.

## Step 5 — Diff against the prior run

Unchanged numbers get one line — `Population: 176, unchanged`.

Changed numbers get before → after and the delta, broken out by cohort where
the block has cohorts.

Do not restate detail that hasn't moved. Brevity is the design, not a
shortcut.

## Step 6 — Assertions first

Report any assertion that fired nonzero as the **headline**, above the diff,
not as routine commentary. Currently: the population gap/overlap checks and
the onboarding proxy mismatch count.

These are supposed to read zero every run. A nonzero result is the most
important thing in the report.

If every assertion reads zero, say that explicitly in one line. Silence is
indistinguishable from not having checked.

## Step 7 — Write the report, then read it back

Write to `docs/usage-pulse/runs/YYYY-MM-DD.md` using today's date.

Append a machine-readable dotted-key block at the bottom, so the next run's
diff doesn't require re-parsing prose:

```
"activation.launch.pct\\\\\\\_never\\\\\\\_active\\\\\\\_confirm": 60.0
```

Use the same key names as the prior run's block. If a key has to change,
say so explicitly in the report — a silently renamed key breaks the next
diff.

**Then read the full written file back from disk and confirm it matches what
was intended.** Read the whole file, head and tail. Do not report the run as
done on a summary, a line count, or a tail check.

\---

## Stop conditions, collected

|Condition|Action|
|-|-|
|Scrub regex differs from `SKILL.md`|Stop before any block. Quote both literally. Ask.|
|Two blocks in `TEMPLATE.sql` disagree with each other|Stop. Same treatment.|
|Fewer results pasted than `-- BLOCK:` markers|Stop. Name the missing blocks. Never interpolate.|
|A result's column headers don't match its block|Stop. Say which.|

## Never

* Never copy SQL from `TEMPLATE.sql` into this file or into a scratch file to
"fix" it mid-run. Promotion is the only way the template changes, via
`/usage` step 9.
* Never fill a missing block's value from the prior run.
* Never write to `docs/usage-pulse/runs/` unless a full set of blocks was
received. A partial run does not produce a dated report — it would become
the next run's diff baseline.
* Never report a step as verified on a summary. Read the file.


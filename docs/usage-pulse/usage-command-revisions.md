# `/usage` — revision spec (diff against the live command)

Baseline read: `~/.claude/commands/usage.md`, in full, this session.
Steps 1, 3, 4, 8 are kept as-is per instruction — quoted below only
where a new sub-rule attaches to them, not to relitigate their existing
text. Steps 0, 2, 5, 6, 7, and the Scope Limits / Why-shaped-this-way
sections are **untouched** — nothing here proposes changing them.

## Diff 1 — promotion step (new, closing step 9)

The most important change, and the one directly caused by a real
failure today: `usage-refresh-a1.sql`'s FALSIFY correctly isolated four
exclusion reasons into four columns. Four hours later, the same
session's one-block test collapsed three of those same filters into a
single on/off comparison, on the same underlying question (does the
scrub actually exclude anyone). The correct pattern existed, in a file,
in the same session, and wasn't reused — because nothing made reuse the
default action. That's not a rule gap (the anti-assumption rule already
existed and was broken anyway, per settled point 5) — it's a missing
place for a correct pattern to live so the next query can start from it
instead of from scratch.

**New step 9, added after step 8:**

> **9. Before ending the session, check for a promotion.**
> If any query this session answers one of `/user-pulse`'s fixed
> questions (see `docs/usage-pulse/TEMPLATE.sql`'s `-- BLOCK:` markers)
> better than the current template block — a bug fix, a corrected
> definition, a cleaner isolation — promote it: replace that block in
> the template file, name the block replaced, and say what changed and
> why. If nothing this session touches a templated question, say so
> explicitly rather than skipping the step silently. This is a template
> update, not a new rule to remember — the fix for "the right pattern
> existed and didn't get reused" is a single file that gets updated at
> the point of proof, not a instruction to be more careful next time.

This is the seam with `/user-pulse`: promotion targets
`docs/usage-pulse/TEMPLATE.sql` specifically, by block name, per that
spec's contract section.

## Diff 2 — date-filter sanity check (attaches to step 3/4's batch construction)

**New sub-rule, step 3:**

> Any query introducing a new date filter — a cutoff, a window, a
> cohort boundary — includes, in the same batch, a check of that
> filter's own row count and min/max date against it. Before handing
> off a batch with `created_at >= X`, know how many rows that boundary
> actually includes and what dates they span, rather than trusting the
> boundary's intent matches its effect.

Grounded in two real events, not a hypothetical: the rolling
`now() - interval '7 days'` filter clipping July 29-31 out of the
launch cohort without anyone intending that, and the `current_date >=
signup_date + 7` maturity gate needing its own explicit maturity-check
query (`usage-refresh-a2.sql`) before the "07-30 and 07-31 should
qualify" claim could be confirmed or corrected. Both times, the
uncertainty resolved once someone ran exactly this kind of check — it
should be in the batch by default, not added after a number looks
wrong.

## Diff 3 — FALSIFY isolates one variable (attaches to step 3's definition)

**New sub-rule, step 3, appended to the FALSIFY definition:**

> When FALSIFY works by re-running CONFIRM's query with something
> changed, change exactly one thing — one filter, one table, one
> definition — and hold everything else identical. If a FALSIFY needs
> to test more than one variable, that's more than one FALSIFY, each
> labeled for what it isolates. (This does not apply to a FALSIFY that
> checks CONFIRM against an independent signal instead of a variant of
> the same query — e.g. cross-checking a completion flag against
> progress-field proxies, as in `usage-refresh-c1.sql` — that's a
> different, still-valid FALSIFY genre and isn't what this rule is
> about.)

The violation this closes: a same-day test FALSIFY dropped the email
regex, `email_confirmed_at`, and `deleted_at` simultaneously while its
own comment claimed it was "testing the scrub" as one thing. Had the
numbers differed, there would have been no way to attribute the
difference to any one of the three. The fix already existed in the same
session — `usage-refresh-a1.sql`'s FALSIFY isolates four exclusion
reasons into four separate columns in one scan — and is cited in the
rule as the pattern to match, not invented for this spec.

## Diff 4 — distinct column names (new sub-rule, step 3)

**New sub-rule, step 3:**

> Every CONFIRM/FALSIFY pair uses visibly different column names for
> whatever they measure — suffix, prefix, or fully distinct names, not
> the same alias reused in both. Shared dimension columns (a cohort
> label, a date, a user id) can repeat; the measures being compared
> cannot.

Grounded in both directions today: `usage-test-signups-0805-0806.sql`'s
CONFIRM (`scrubbed_signups`) and FALSIFY (`raw_signups`) used distinct
names, which is exactly what let a silent failure (Supabase returning
only the last statement) be identified from the header alone rather
than sitting as an ambiguous number. Conversely, `usage-refresh-a2.sql`,
`usage-refresh-a3.sql`, and `block2-confirm.sql`/`block2-falsify.sql`
all reused identical column names between CONFIRM and FALSIFY — checked
directly against each file, not assumed. Had any of those three hit the
same last-statement-only failure, there would have been no way to tell
from the output alone which query's result had survived.

## Diff 5 — full read-back, not `wc -l` + tail (attaches to step 4's handoff)

**New sub-rule, step 4:**

> After writing a file that will be handed off or reported as done,
> read the full content back before calling it complete. A line count
> and a tail check confirm the file wasn't truncated at the end; they
> say nothing about the middle. `direction-population-check.md` had a
> post-write formatter hook modify its content today, and only the tail
> was re-checked — the body was never re-verified against what was
> intended.

## Diff 6 — narrowed file-output rule (new sub-rule, step 4)

Today's "write to file, don't print" instructions were ad hoc, repeated
per-message because the command file itself says nothing about it.
Making it a standing rule rather than something re-stated every time:

**New sub-rule, step 4:**

> Write to a file anything that will be run (SQL headed for the SQL
> editor), pasted onward (to another tool, another chat, a teammate), or
> committed (a spec, a report meant to persist). Print anything that
> will only be read once, in place, by the person it's addressed to.
> The distinction is what happens to the content next, not its length —
> a short query that's about to be pasted into Supabase still goes to a
> file; a long analysis that's being read and answered in the same turn
> does not need one just because it's long.

## What's explicitly not being touched

Steps 0 (venue check), 2 (cheapest ground-truth check), 5 (falsify
governs), 6 (deployed vs. main), 7 (human confirmation gate), the Scope
Limits section, and the closing "why this file is shaped this way"
section are unchanged. None of today's eight errors trace to any of
those steps' actual content — they trace to batch construction (steps
3/4, where diffs 2-4 attach) and file handling (step 4, where diffs 5-6
attach) and to the absence of a promotion mechanism (new step 9). No
case is made here to touch the rest, so it isn't touched.

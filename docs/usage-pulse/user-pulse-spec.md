# `/user-pulse` — spec

Status: draft, not yet installed as a live command. Every block in
`docs/usage-pulse/TEMPLATE.sql` is sourced from a file that actually ran
today; sourcing is cited by path inside that file's own block comments.

## Purpose

One fixed question, on a schedule, diffed against the last run: where
does the funnel stand, and what moved. The diff is the artifact — a
report that repeats every number unchanged from last time has failed at
its one job.

## What changed from the straw man, and why

Kept as proposed: population raw vs. scrubbed, signups by date, cohort
assignment, onboarding completion by cohort, multi-day users,
unconfirmed-email canary.

Changed:

- **"Activation breakdown" resolved to the equal-window method**
  (`block2-confirm.sql` / `block2-falsify.sql`), not the full-lifetime
  never/acted-once/returned split from earlier in the day. The
  full-lifetime version is what block 1/4 used before the right-censoring
  bug was found and fixed; the equal-window version is the corrected,
  final state. Promoting the superseded version into a recurring
  template would re-introduce a bug that's already fixed once.
- **Added a maturity-gate block**, sourced from `usage-refresh-a2.sql`'s
  maturity-check query rather than treating "maturity gate" as its own
  metric. It's not a new number — it's transparency on why the
  activation block's population is smaller than the raw signup count on
  any given run. Rewritten 2026-08-06 to a rolling window (see below).

Flagged, not changed (yours to decide, not mine):

- **Cohort boundaries are hardcoded historical dates**
  (`<= 2026-07-19` / `2026-07-22`–`2026-07-31` / `>= 2026-08-01`), reused
  verbatim from every proven file. `post-launch` is currently the only
  open-ended bucket. `TEMPLATE.sql`'s population block now asserts
  `pct_post_launch` against a ~50% threshold as a data-driven trigger
  for when this needs revisiting, alongside the age-based check in step
  2 below — but the decision itself is still a human one.

## 2026-08-06 revision (fixes 1-4 + assertion/timer pass)

Applied directly to `docs/usage-pulse/TEMPLATE.sql` — not duplicated
here, since keeping two copies of the same SQL is exactly the drift
this spec exists to prevent. Summary of what changed and why lives in
`docs/usage-pulse/usage-command-revisions.md` and in
`docs/usage-pulse/verify-proxy-fields-once.sql`'s own header. Short
version:

1. Onboarding-completion FALSIFY narrowed to `resume_url` +
   `primary_domain` (dropped `five_year_goal_role_id`, verified
   V2-only — see `getajob-schema.md` §5) and reframed as an assertion
   (expected mismatch count: zero) rather than an open question.
   `verify-proxy-fields-once.sql` is a one-time check, run alongside
   the first `/user-pulse`, confirming the two remaining fields don't
   have their own undiscovered V1-specific gap before this assertion is
   trusted long-term.
2. Maturity-gate rewritten from a hardcoded launch-cohort date range to
   a rolling 14-day window, so it doesn't age into permanent noise and
   naturally follows whichever cohort is currently near the boundary.
3. Diff baseline: each dated run file
   (`docs/usage-pulse/runs/YYYY-MM-DD.md`) gets a machine-readable
   dotted-key block appended, not a separate baseline file — keeps
   report and data atomic in one file and preserves full run-over-run
   history for free. See step 7 below.
4. Unconfirmed-email canary windowed to the same rolling 14 days as
   signups-by-date.

Every other claim in the template got the same pass: reduced to a
query-level assertion where possible (population gap/overlap checks,
the narrowed onboarding proxy), left as an age-based timer only where
no assertion is possible (cohort-boundary relevance, the
deliberate-activity definition's continued validity). Column-naming
violations found in `usage-refresh-a2.sql`, `usage-refresh-a3.sql`, and
`block2-confirm.sql`/`block2-falsify.sql` were fixed as alias renames
directly in `TEMPLATE.sql` — see
`docs/usage-pulse/usage-command-revisions.md` (Diff 4) for the audit
that found them; not duplicated here.

## Contract with `/usage` (the seam)

This is the part that breaks quietly if it isn't explicit:

1. **Template location:** `docs/usage-pulse/TEMPLATE.sql`. This is the
   one canonical copy. No other file — including this spec — should
   hold a competing version of these queries.
2. **Scrub is a cached snapshot, not a live reference.** The template's
   `real_users` CTE is a literal copy of `.claude/skills/scrubbed-usage/
SKILL.md`'s regex as of the last promotion. `/user-pulse`'s first
   step (below) diffs the cached copy against the live file every run —
   if they differ, the run stops and asks for the template to be
   updated first.
3. **Cohort boundaries live in `TEMPLATE.sql`, not in any single
   `/usage` session's scratch queries.** If a `/usage` investigation
   needs cohort logic, it reads the current boundaries from the
   template rather than re-deriving or re-typing them.
4. **Promotion is the only way this template changes.** Per `/usage`
   step 9: before a session ends, any query that answers one of this
   template's fixed questions better than what's here gets written into
   `TEMPLATE.sql`, replacing the relevant block. The `-- BLOCK: <name>`
   markers are the promotion target.

## File shape

One file, `docs/usage-pulse/TEMPLATE.sql`, marker-separated blocks,
pasted once into the Supabase SQL editor, each block highlighted and run
individually — per the verified finding that a multi-statement script
silently returns only the last statement's result with no error (see
`getajob-schema.md` §10). Every block's CONFIRM and FALSIFY carry
distinct column names for the same reason: if only one result set
survives a mis-click or a bad selection, the header alone should say
which one it is.

Each run's output is a dated report:
`docs/usage-pulse/runs/YYYY-MM-DD.md`, written by whoever runs
`/user-pulse` that day, diffed against the most recent prior file in
that directory (sorted by filename date).

## `/user-pulse` — the command's own steps

1. **Read `.claude/skills/scrubbed-usage/SKILL.md` fresh.** Diff its
   regex against the `real_users` CTE cached in
   `docs/usage-pulse/TEMPLATE.sql`. If they differ: stop, report the
   diff, and ask whether to update the template now or proceed
   knowingly stale. Do not silently run the cached copy.
2. **Check template age and cohort-boundary coverage.** If
   `current_date` is more than, say, 21 days past the newest cohort
   boundary (`post-launch`'s start), flag it: "post-launch cohort is now
   N days wide and still open-ended — consider whether a new boundary
   is needed" — a prompt for a human decision. Combined with the
   population block's `pct_post_launch` assertion (crossing ~50% is a
   data-driven trigger for the same decision, not just a clock).
3. **Paste `docs/usage-pulse/TEMPLATE.sql` into the SQL editor once.**
   Highlight and run each `-- BLOCK:` individually. Paste each block's
   result back in order.
4. **Find the most recent prior file in `docs/usage-pulse/runs/`.** If
   none exists, this is the first run — say so, report absolute numbers
   only, skip the diff framing entirely.
5. **Diff each block against the prior run.** Unchanged numbers get one
   line ("Population: 176, unchanged"). Changed numbers get the before
   → after and the delta, broken out by cohort where the block has
   cohorts.
6. **Report any assertion that fired nonzero** (population gap/overlap,
   onboarding proxy mismatch) as the headline, not routine commentary —
   these are supposed to read zero every run; a nonzero result is new
   information.
7. **Write the dated report** to `docs/usage-pulse/runs/YYYY-MM-DD.md`,
   with a machine-readable dotted-key block appended at the bottom
   (e.g. `"activation.launch.pct_never_active_confirm": 60.0`) so the
   next run's diff doesn't require re-parsing narrative prose. Read the
   full file content back after writing to confirm it matches what was
   intended before calling the run done.

## What the report looks like when nothing moved

```
# user-pulse — 2026-08-27

No material movement since 2026-08-06.

- Population: 176 total (unchanged) — 59 pre-launch / 94 launch / 23 post-launch
- Signups (last 14d): drip, no day outside 3-8/day, no spike
- Activation (equal window, matured cohorts): pre-launch 83.1% never acted / 1
  returner (unchanged); launch 60.0% never acted / 3 returners (unchanged)
- Onboarding completion: pre-launch/launch/post-launch rates unchanged.
  Reliability assertion (resume_url + primary_domain vs. flag): 0 mismatches,
  as expected.
- Multi-day users: 11, same set as last run.
- Unconfirmed-email canary: no new dates, background rate holding.

Open items carried forward: post-launch cohort boundary now 21 days old
and still open-ended.
```

Deliberately short. A report that restates all 176 users' worth of
detail every run defeats the "diff is the product" premise as surely as
one that hides a real change would.

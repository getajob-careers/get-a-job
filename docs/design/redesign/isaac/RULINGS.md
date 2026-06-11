# Design rulings — Today + Career pages

These rulings standardise five recurring decisions from the seamless-IA
review cycle (commits `b7626a3..b627d2f`, branch
`isaac/home-redesign-pipeline-c`). The PNG mockups that live alongside
this file (`home-today.png`, `career.png`) are **visual direction only**
— this file is part of the spec, and any conflict between a mockup and a
ruling here resolves to the ruling.

---

## (a) One SCORE per card maximum; counts and fractions are exempt

A "score" is a model-derived judgement that two reasonable systems could
disagree on — match-score, fit-score, qualification-score, readiness-
score, goal-alignment-score, tailoring-score. Showing two scores on one
surface invites the question "which is the real one?" and is forbidden.

Counts and fractions are arithmetic facts: row counts, day counts,
applications-in-status, fraction-of-tasks-done, page numbers, currency
totals. They are exempt from this rule. A funnel card with four
`{count}` tiles is fine. A "0/4 today's moves done" composite is fine.

Concrete instances:
- Job card: `{pct}%` match badge — allowed (one score).
- Matched-role collapsed row: `{match_score}%` overall badge — allowed
  (one score).
- Matched-role expanded row: see (b) below — the two sub-axes are
  axes, not standalone scores, and they render as bars under (b).
- Pipeline card with `{saved} / {applied} / {interview} / {offer}`
  tiles — allowed (four counts).
- Stats strip with Live matches / In pipeline / Interviews / Stories
  banked — allowed (four counts).

## (b) Explanatory axes render as bars with NO numerals

When a single overall score decomposes into two or more sub-axes
(e.g. an overall match-score that splits into "qualified now" and
"moves you toward goal X"), the sub-axes render as proportional bars
under the score, not as additional numerals.

The bar fill is the sole carrier of magnitude. The label names the
axis. **No `{v}%` reading next to the bar.**

This rule resolves the canonical violation from the original Career
mockup: a card with `84%` overall + `Qualified now 82%` + `Moves you
to PM 95%` — three numerals on the same card — fails this rule. The
fix is to delete the numerals next to the two bars and keep the bars +
labels. The overall score stays.

The `AxisBar` component in `src/pages/Career.jsx` is the reference
implementation as of this writing.

## (c) Anti-fabrication: no claim without a grounding data source

No agent-voiced or system-voiced string anywhere in the UI may assert
something the backend does not ground. The canonical violations from
the mockup review are:

- **"The agent drafted your outreach — it's in the drawer"** — there
  is no proactive outreach drafter and no drawer UI. Cut, don't fake.
- **"Interview Thu 2pm"** — the `applications` table has no
  `interview_at` column. There is no source for a specific time. Cut,
  don't fake.
- **"LinkedIn · post due this week"** — there is no due-this-week
  surface on LinkedIn. Cut, don't fake.
- **"went live two days ago"** — only acceptable when the LLM
  computes the day count from a real source (job `date_posted`,
  application `updated_at`, etc.) and the prompt forbids invention.
  Static strings asserting recency are not acceptable.

The remedy is always to cut the string, not to fake the data source.
If a feature requires a column that doesn't exist, the column gets
added in a separate PR before the string appears.

## (d) Low-fit provenance label: trigger-honest copy

The label on a dimmed low-fit row reads:

> **Low fit — shown for completeness, not recommended.**

It does NOT read "shown because you searched, not recommended." The
trigger is the computed score (`pct < 50`), not whether the user
searched — those are different mechanisms and the copy must name the
real one.

This intentionally diverges from the original mockup wording and
stays. Future iterations that ADD a search-vs-recommended distinction
on top would need a real provenance column on the surfaced row before
the search-gated copy is allowed back.

## (e) Null score columns never render as 0%

When a score column is `null` (legacy row, partial-pipeline run,
unbackfilled migration), the element renders as **omitted** — not as
"0%". A 0% bar reads to the user as "this role does not move you
toward your goal at all", which is a false claim when the actual
truth is "this column wasn't computed for this row yet."

Specifically: a row whose `readiness_score` AND `match_score` are
both null omits the "Qualified now" bar entirely. A row whose
`goal_alignment_score` is null omits the "Moves you to {goal}" bar
entirely. A row with all three null omits the bars container entirely.

The collapsed overall-score badge in the same row already gates on
`typeof r.match_score === "number"`, which is the same shape and is
correct as written.

---

## Standing scope

These five rulings apply to the Today and Career surfaces today, and
to any future surface that introduces score-bearing cards, axis
decompositions, or agent-voiced strings. Add an entry to this file
when a new ruling settles; revise an entry when a ruling changes.

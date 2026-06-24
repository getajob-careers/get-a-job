---
title: The matching philosophy
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - src/lib/scoreJobFit.js
  - src/lib/scoreApplication.js
  - supabase/functions/_shared/track-scoring-constants.ts
---

# The matching philosophy

How Get A Job decides what fits a student — the thinking behind it. For the actual math and code, see [scoring internals](../engineering/scoring-internals.md).

## The core idea: two questions, not one

Most job tools ask one question: *"Can this person do this job?"* (skills match). That's not enough. A student who's a perfect skills-match for a Sales Development role but dreams of being a Product Manager shouldn't be told "great fit!" — it's a fit for the *job*, not for the *person's path*.

So we score every role on **two axes**:

1. **Are you qualified now?** — Do your skills, experience, education, and seniority match what the role needs?
2. **Does it move you toward your goal?** — Does this role advance you toward where you actually want to be?

The combination of those two answers places a role into a **track**:

| | On your path | Off your path |
|---|---|---|
| **Qualified now** | **Track 1** — sweet spot, apply first | **Track 2** — doable detour |
| **Not yet qualified** | **Track 3** — stretch, grow into it | (not surfaced — neither use nor direction) |

This is why the product can be honest in a way a generic tool can't. It will happily tell a student that a role they're qualified for is still a *detour* — because it knows their goal.

## Honesty over flattery

The product is designed to tell the truth, even when it's not what the student wants to hear:

- A student isn't told they're ready for senior roles when they're not — seniority is capped to what's realistic for their experience.
- A high-skills-match role that's off-path is shown as a Track 2 detour, not celebrated as a perfect fit.
- Low-fit roles, when shown at all, are clearly labeled as such.

This honesty is a feature. Students get enough false encouragement elsewhere; the product's value is that its read on them is trustworthy.

## Grounded, not invented

The same principle runs through the materials side. When the product writes a CV or a LinkedIn post, it uses **only what the student has actually told it** — their real experience and their captured stories. It does not invent metrics or accomplishments. (This has been a hard rule, and a hard-won one — see the [lessons log](../../tasks/lessons.md) for the bugs that taught us to enforce it strictly.)

## Deterministic where it counts

Wherever possible, the same inputs produce the same score — the matching math is deterministic, not a fresh AI guess each time. This means a student sees consistent results, the same job scores the same way on the job board and in their tracker, and the team can debug a surprising score by inspecting data rather than re-running a model. AI is used for the things it's genuinely better at (reading a CV, writing prose); the *judgments* that need to be stable and fair are computed, not guessed. The reasoning behind that choice is recorded in [ADR 0001](../decisions/0001-deterministic-track-scoring.md).

## Why this matters

A student's trust in the product rests entirely on whether its read on them feels true. If the matching flatters or fabricates, the whole thing becomes another generic AI toy. If it's honest and grounded, it becomes the coach they didn't have. Everything in the scoring design serves that.

---

*For the mechanics — the axes, weights, thresholds, and the code — see [scoring internals](../engineering/scoring-internals.md).*

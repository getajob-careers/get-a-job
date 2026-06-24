---
title: Documentation guide
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - scripts/check-docs-freshness.mjs
---

# Documentation guide

How these docs stay trustworthy. The whole point of this handbook is that you can *believe* what it says — so the one rule that matters is: **when you change something, update the doc that describes it, in the same PR.** Everything below just makes that easy and makes slip-ups visible.

## Each doc has a little header

Every living doc starts with a small block that says who owns it, when a human last checked it, and which code it's about:

```yaml
---
title: Scoring internals
status: living          # living = kept current · reference = slow-changing · archived = historical
owner: shared           # eli · isaac · shared
last_reviewed: 2026-06-24
code_paths:             # the files this doc describes (optional, powers the freshness check)
  - src/lib/scoreJobFit.js
---
```

When you review a doc and confirm it's still true, bump `last_reviewed` to today — even if you changed nothing. That date is a promise: "a human looked at this and it was right."

## The freshness check

Run it any time:

```bash
npm run docs:check
```

It looks at each living doc's `code_paths` and flags the doc if that code has changed since the doc was last reviewed:

```
STALE  docs/engineering/scoring-internals.md
       last_reviewed 2026-06-10, but src/lib/scoreJobFit.js changed on 2026-06-18
```

That's your cue to read the doc against the code, fix any drift, and bump the date. The check is a **helpful nudge, not a gatekeeper** — it doesn't block anything. It just tells you where to look.

## Adding a new doc

1. Copy [`doc-template.md`](doc-template.md).
2. Fill in the header (owner, today's date, the code it covers).
3. Write it like you'd explain it to a teammate — lead with what they need, keep it shorter than feels complete.
4. Add a one-line row to the [handbook map](../README.md) so people can find it.

If a doc would just repeat code that changes constantly, don't write it — link to the code instead. Docs are for *systems and reasons*; comments are for *lines*.

## Where things go

The [handbook home](../README.md) has the full map. Short version: plain-English stuff up top (`overview/`, `product/`, `domain/`), the technical section contained in `engineering/`, how-we-work in `team/`, running-and-fixing in `operations/`, and the "why we chose this" records in `decisions/`. Old session notes live in `archive/` and are never updated.

## That's it

No heavy process. The whole system is: a small header on each doc, a one-command check, and the habit of updating a doc when you change what it describes. If that habit holds, the handbook stays true — which is the only thing that makes documentation worth having.

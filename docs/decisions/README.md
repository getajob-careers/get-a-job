---
title: Decisions (ADRs)
status: living
owner: shared
last_reviewed: 2026-06-24
---

# Decisions

Why we built things the way we did. Each file here is an **Architecture Decision Record (ADR)** — a short note capturing a meaningful choice, the alternatives, and the reasoning, so a future teammate (or a future you) doesn't have to reverse-engineer the "why."

## The records

| # | Decision | Status |
|---|---|---|
| [0001](0001-deterministic-track-scoring.md) | Score matching deterministically, not with an LLM each time | Accepted |
| [0002](0002-company-logo-sourcing.md) | How we source company logos (and why not Clearbit) | Accepted |

## How to add one

1. Copy the format of an existing ADR (they're short — context, decision, consequences).
2. Number it the next integer, give it a clear title.
3. Add a row to the table above.

ADRs are **append-only and immutable once accepted.** If a decision changes, write a *new* ADR that supersedes the old one and link them — don't edit history. The point is to preserve the reasoning as it was at the time, including what we later got wrong.

## When to write one

Write an ADR when a choice is non-obvious and a future person would reasonably ask "why is it like this?" — architectural patterns, a notable trade-off, choosing a vendor or approach over an obvious alternative, or reversing an earlier decision. Don't write one for routine choices.

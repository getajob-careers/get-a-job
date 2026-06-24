---
title: ADR 0001 — Deterministic track scoring
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - src/lib/scoreJobFit.js
  - supabase/functions/_shared/track-scoring-constants.ts
---

# ADR 0001 — Score matching deterministically, not with an LLM each time

**Status:** Accepted

## Context

The product's core promise is an honest read on which jobs fit a student. That read is shown in many places — the job board, the roadmap, the tracker — and it has to be **consistent** (the same job scoring the same way everywhere), **fair** (no random variation between students), and **debuggable** (when a score looks wrong, we can find out why).

We could compute fit by asking a language model each time ("how good a match is this person for this job?"). That's flexible and easy to build. But it's also non-deterministic, hard to keep consistent across surfaces, expensive at volume, and nearly impossible to debug — a surprising score has no audit trail, just a model's opinion.

We also learned, painfully, that small models hedge toward the middle on noisy categorical judgments — a tendency that quietly mis-assigned tracks (see the lessons log).

## Decision

Compute the matching deterministically in code. A shared constants file (`track-scoring-constants.ts`), read by both the frontend and the edge functions, holds the weights and thresholds. `scoreJobFit` produces the same 0–1 fit score and track for the same inputs, every time.

The language model is still used **upstream** — to extract structured requirements from messy, free-text job descriptions — because that's a job it's genuinely good at. But once the data is structured, the *judgment* is math, not a model call.

## Consequences

- **Good:** consistent scores across every surface; debuggable from data (the inputs and the constants), not from model logs; cheap; testable — and the scoring is now the most heavily unit-tested code in the repo.
- **Cost:** the scoring rules are hand-maintained. New signals mean code changes, not just a prompt tweak.
- **Boundary to respect:** the quality of scoring depends on the quality of the upstream extraction. Garbage requirements in → wrong score out, which is why low-extraction-confidence jobs get a softened score.

## Related

- [Scoring internals](../engineering/scoring-internals.md) · [the matching philosophy](../product/matching-philosophy.md)

---
title: AI & edge functions
status: living
owner: shared
last_reviewed: 2026-06-25
code_paths:
  - supabase/functions
  - supabase/functions/_shared/model-routing.ts
  - supabase/functions/_shared/voice-rules.ts
---

# AI & edge functions

How the AI layer is built. The product's intelligence — reading CVs, scoring careers, writing CVs and LinkedIn content, the chat agent — runs in **edge functions**: small server-side programs on Supabase (Deno/TypeScript) that the browser calls.

## Why edge functions

A browser can't safely hold the language-model API keys or run multi-step AI logic. So anything that calls a language model, or needs a secret, runs in an edge function. There are roughly **two dozen** of them, each owning one job — for example: extract a CV's contents, generate a career analysis, generate a tailored CV, run the chat agent, extract a job's requirements, generate LinkedIn content.

They live in `supabase/functions/<name>/index.ts` and are deployed individually (see [deployment](../operations/deployment.md)). Shared logic lives in `supabase/functions/_shared/`.

## Model routing

Which language model each job uses is decided in one place — a routing layer (`_shared/model-routing.ts`) — rather than hardcoded in every function. This means a model can be swapped for a job (after testing) by changing one entry, and different jobs can use different models tuned to their needs (a fast cheap model for simple extraction, a stronger one where quality matters). Model choices are validated with "bake-offs" — head-to-head comparisons — before a swap ships.

## Voice rules

When the AI writes prose (CVs, LinkedIn posts, comments, outreach), it follows **voice rules** (`_shared/voice-rules.ts`) — guidelines that say what *to* write so the output sounds human and specific. This replaced an earlier "banned words" approach that didn't work: the model just wrote around the banned words while keeping the same generic voice. Telling it what good looks like works; telling it what to avoid doesn't.

## The anti-fabrication rule

A hard rule across every generation feature: **the AI uses only what the user has actually provided** — their real experience and captured stories — and does not invent metrics or achievements. This matters because the users are job seekers who (rightly) fear lying on a CV. Enforcing it has been genuinely hard; several past bugs came from generated content drifting toward fabrication, and the [lessons log](../../tasks/lessons.md) documents them. When working on any generation feature, treat this as non-negotiable.

## The LLM ↔ code contract

A recurring source of bugs: an edge function asks the model for JSON in a certain shape, and downstream code reads that shape — but the two drift apart over time, and the mismatch corrupts data silently. When changing any prompt that produces structured output, check every place the output is consumed. This "three-leg contract" (prompt spec, model behavior, consumer code) is a documented lesson; treat prompt changes as contract changes.

## Observability

Every edge-function call records metrics (latency, success/failure, model, tokens, cost) to a `function_metrics` table, so the team can see what's slow, failing, or expensive. LLM tracing also flows to an external tool (Langfuse). See [observability in operations](../operations/runbooks.md).

## A deployment gotcha worth knowing

Edge functions are bundled by Deno, which is stricter than the frontend build. Notably, an unescaped backtick inside a prompt's template string passes lint, typecheck, and tests but breaks the Deno deploy. Edge-function changes aren't fully validated until they actually deploy — see [deployment](../operations/deployment.md).

---

*Related: [scoring internals](scoring-internals.md) · [the matching philosophy](../product/matching-philosophy.md) · [lessons](../../tasks/lessons.md).*

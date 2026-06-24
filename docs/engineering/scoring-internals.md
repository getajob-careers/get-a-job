---
title: Scoring internals
status: living
owner: shared
last_reviewed: 2026-06-24
code_paths:
  - src/lib/scoreJobFit.js
  - src/lib/scoreApplication.js
  - src/lib/experienceLevel.js
  - supabase/functions/_shared/track-scoring-constants.ts
---

# Scoring internals

The mechanics behind the matching. For the *why*, read [the matching philosophy](../product/matching-philosophy.md) first — this doc is the *how*.

## Where the code lives

| File | Role |
|---|---|
| `src/lib/scoreJobFit.js` | The deterministic fit scorer — given a profile and a job, produces a 0–1 fit score and a track. |
| `src/lib/scoreApplication.js` | Scores a saved application; mirrors the goal-aware logic. |
| `src/lib/experienceLevel.js` | Derives a person's experience/qualification level from the *depth* of their history. |
| `supabase/functions/_shared/track-scoring-constants.ts` | The shared thresholds and weights — the single source the frontend and edge functions both read. |
| `src/lib/trackConfig.js` | The track vocabulary and colors. |

The constants file is shared between the browser and the edge functions so a job scores identically wherever it's computed. (Note the cross-boundary import — the frontend reaches into `supabase/functions/_shared/`; there's a documented Rollup-bundling caveat around it in `scoreApplication.js`.)

## The fit score

`scoreJobFit` compares a profile against a job across several weighted axes:

- **Skills** — the person's skills versus the job's required skills (compared via the shared skill IDs — see [roles, skills & tracks](../domain/roles-skills-tracks.md)).
- **Years of experience** — against what the role asks for.
- **Education** — against the role's requirements.
- **Seniority** — capped: a role above the person's realistic ceiling can't score as a top fit, no matter how well the skills match.
- **Function family** — whether the role is in a domain the person works in.

These combine into a weighted 0–1 `fit_score`. There's also a confidence modifier: when a job's requirements were extracted with low confidence, the score is softened so the product doesn't show a confident match built on shaky data.

## From fit to track

A role's **track** comes from two numbers: the fit score (qualified now?) and a goal-alignment score (moves you toward your goal?). The thresholds live in the shared constants. A hard rule: a role above the person's seniority ceiling is capped to Track 3 regardless of fit — a student isn't shown a Senior role as a sweet-spot match.

## The scale gotcha (read this)

Scores are stored as **0–1 fractions** (e.g. `0.88`), not 0–100. Every place that *displays* a score must multiply by 100. This has bitten the project more than once — a card rendering `Math.round(0.88)` shows "1%". When you touch any score display, convert to percent and confirm against a real value. (Documented in the [lessons log](../../tasks/lessons.md), and there are unit tests guarding the conversion.)

## Why deterministic

The judgments that need to be stable and fair are computed in code, not asked of a language model each time. Same inputs → same score; consistent across the job board and the tracker; debuggable from data, not model logs. The full reasoning is in [ADR 0001](../decisions/0001-deterministic-track-scoring.md). The language model is still used upstream to *extract* structured requirements from messy job descriptions — but the scoring itself is deterministic.

## Testing

The scoring math is the most heavily unit-tested code in the repo (tiers, seniority caps, the goal-aware bands, edge cases). When changing scoring, add or update fixtures — a wrong score is a silent trust-killer, not a visible crash.

---

*Related: [matching philosophy](../product/matching-philosophy.md) · [roles, skills & tracks](../domain/roles-skills-tracks.md) · [ADR 0001](../decisions/0001-deterministic-track-scoring.md).*

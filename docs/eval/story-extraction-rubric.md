---
owner: cv-lane
last_reviewed: 2026-07-23
code_paths:
  - scripts/story-extraction-eval.mjs
  - supabase/functions/extract-bullets/index.ts
  - docs/eval/story-extraction-inputs.json
---

# Story-extraction quality rubric (extract-bullets)

Frozen rubric for the Story Bank extraction-quality arc. Scores the output of
`extract-bullets` against the frozen synthetic input set
(`story-extraction-inputs.json`). The point is a **comparable before/after
number**: same inputs, same rubric, every round.

Real-user data is `n=0` (the live `stories` table has zero scrubbed rows), so
this is the only way to measure quality change. All numbers are labelled
**SYNTHETIC**.

## Non-negotiable bar: anti-fabrication (hard fail)

Anti-fab is a **gate, not a dimension** — an input's whole result is disqualified
(quality score forced to 0, flagged `ANTI_FAB_FAIL`). Two checks are **hard
gates**, deterministic in Layer 1:

- **numeric invention** — a metric-shaped number in a bullet (a `%`/`$`/`k`/`m`
  figure, or any value ≥ 10) that is not groundable in the input text
  (digit-normalised, so `$48K`↔`48000`↔`48k` and `40%`↔`40` all match). Bare
  small integers grounded in the text (a "3-person team") are not gated, to
  avoid false positives.
- **tool invention** — a well-known tool/platform (from a curated lexicon:
  Figma, Jira, Salesforce, HubSpot, Tableau, Klaviyo, Python, SQL, …) appearing
  in the output but not the input text.

A third check is a **soft review flag** (surfaced, not score-gating, because it
can't be judged deterministically without false positives):

- **hedge-sharpening** — a messy input's approximate figure (`~15k`, `20
something`) rendered as hard precision in the output. Flagged on messy inputs
  for human inspection; the Layer-2 judge's `groundedness` score is where it
  actually costs points.

A better story is worthless if it invented a number. The hard gates run first
and no LLM judgement can override them. Tool/skill _over-claim_ beyond the
lexicon is caught by the Layer-2 `groundedness` score.

## Layer 1 — programmatic (deterministic, no extra LLM call)

Computed by the harness directly from the output + the input's `known_metrics` /
`known_tools`. Cheap, reproducible, and the anti-fab gate lives here.

| dimension            | definition                                                                                                                                              | range       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `anti_fab_pass`      | passes all three gate checks above                                                                                                                      | bool (gate) |
| `metric_fidelity`    | of `known_metrics` present in the input, fraction carried verbatim into a bullet. `1.0` by convention when the input has no metrics (nothing to carry). | 0–1         |
| `tool_coverage`      | of `known_tools` present in the input, fraction surfaced in `bullets` or `skills`. `1.0` by convention when the input names no tools.                   | 0–1         |
| `bullet_discipline`  | fraction of bullets that (a) start with a concrete action verb, (b) are 8–30 words, (c) carry an outcome clause. The extract-bullets style contract.    | 0–1         |
| `has_output`         | ≥1 bullet returned (production returns null / 502 on 0 bullets)                                                                                         | bool        |
| `skills_nonempty`    | `skills[]` is non-empty when the input plausibly demonstrates ≥1 skill                                                                                  | bool        |
| `output_language_en` | bullets are in English (CV language) even when the input is Hebrew/mixed — the Hebrew probe                                                             | bool        |

## Layer 2 — LLM-as-judge (optional; one call per input)

A single `gpt-4o`-judged score for the softer quality the programmatic layer
can't see. Gated behind `--judge` so the baseline can run Layer-1-only for free.

| dimension           | what the judge scores                                                                                                                         | range |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `star_completeness` | does each bullet read as a real STAR achievement — situation/task implied, action explicit, result concrete — vs a skeletal "did X" fragment? | 0–100 |
| `groundedness`      | independent second opinion on whether every claim traces to the input (backs up the Layer-1 gate; disagreement is a flag to inspect)          | 0–100 |
| `usefulness`        | would this bullet survive onto a real CV for the target role, or is it filler?                                                                | 0–100 |

The judge is instructed to **penalise, not reward, invention** — a fluent bullet
with an invented metric scores 0 on groundedness. This prevents the classic
"LLM judge likes confident hallucinations" failure.

## Composite

```
quality = anti_fab_pass ? mean(
  metric_fidelity, tool_coverage, bullet_discipline,
  star_completeness/100   // only if --judge, else dropped from the mean
) : 0
```

Reported per-input and as a set mean, split by richness band and by domain so a
gain on rich inputs can't hide a regression on thin ones.

## What "improvement" means for each lever

- **Grounding context** (this arc's shippable edge-fn lever): expected to move
  `tool_coverage`, `skills_nonempty`, `output_language_en`, and skill-label
  consistency — NOT `metric_fidelity` or `star_completeness` (those are bounded
  by input richness, which only guided elicitation raises). **Must not** regress
  `anti_fab_pass` on any input — that's the whole reason it's eval-gated.
- **Guided elicitation** (design-lane, held): the only lever expected to move
  `star_completeness` and `metric_fidelity`, because it raises the input ceiling
  at the source. Measured after the UX ships by re-running this set with
  elicited-style inputs.
- **Model tier** (held): expected to move `output_language_en` and
  `tool_coverage` consistency (the Hebrew probe). Decided once, against the real
  input shape.

## Running

```
# Layer 1 only (free, deterministic) — the standard baseline/delta run
OPENAI_API_KEY=sk-... node scripts/story-extraction-eval.mjs --mode baseline

# add the LLM judge (one gpt-4o call per input)
OPENAI_API_KEY=sk-... node scripts/story-extraction-eval.mjs --mode baseline --judge

# after the grounding-context fix lands, compare:
OPENAI_API_KEY=sk-... node scripts/story-extraction-eval.mjs --mode grounded --judge
```

`--mode baseline` runs the current production prompt/parse verbatim. `--mode
grounded` runs the grounding-context variant. Both mirror `extract-bullets`
exactly (same system prompt source, same `JSON.parse(content || "{}")` parse, no
extra fence-stripping — a harness must never be more permissive than production,
per the 2026-06-11 lesson).

# Design-lane brief: guided STAR elicitation for story/bullet capture

**From:** CV lane · **To:** design lane · **Date:** 2026-07-23
**Arc:** Story Bank extraction quality · **Status:** BRIEF — hold for Eli's go before building.

## Why this is the dominant lever (evidence)

The extractor (`extract-bullets`, and its sibling `extract-story-from-text`) is
**anti-fabrication-correct but starved by thin input**. Ground truth:

- **100% of the 13 existing stories have `situation` and `task` = NULL.** Half
  the STAR frame is dead in practice. This is not a bug — the anti-fab rules
  ("leave a field NULL when the text doesn't support it; never pad") working
  exactly as written against one-line pastes.
- When input **is** rich, fidelity is good (a paragraph naming "40%", "$48K",
  Klaviyo → those carried verbatim). When input is thin ("I wrote a script to
  clean up our database"), output is honest but skeletal.
- **The extractor cannot fix this.** Anti-fab forbids it from inventing the
  missing situation/result/metric. The ONLY anti-fab-safe way to richer bullets
  is **richer input** — which is a capture-UX problem, not a prompt/model one.

Today's capture UX is a **single freeform textarea** (`StorySaveCard` REVIEW
stage / the coach save-card). It asks the user for everything at once and most
people type one clause. The structured STAR review happens _after_ extraction —
too late to add what was never elicited.

## The change: guide the input, don't just parse it

Replace the single "describe what you did" textarea with a **short guided
sequence** that elicits the STAR pieces at the source. Keep the existing
extract → preview → save staged card _after_ elicitation unchanged.

### Fields (proposed)

Each prompt is one short input. Order matters — action first (lowest friction,
always answerable), then the enrichment prompts.

| #   | field         | prompt (microcopy)                                    | required | notes                                                                                   |
| --- | ------------- | ----------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| 1   | **action**    | "What did you actually do?"                           | **yes**  | the spine; always answerable                                                            |
| 2   | **situation** | "What was going on — the problem or goal behind it?"  | no       | fills the perpetually-NULL S                                                            |
| 3   | **result**    | "What changed or came out of it?"                     | no       | fills R with an outcome, not a purpose clause                                           |
| 4   | **metric**    | "Any real numbers? time saved, %, size, money, count" | no       | **anti-fab microcopy:** "Leave blank if you don't have one — we never make numbers up." |
| 5   | **tools**     | "Any specific tools or platforms?"                    | no       | feeds skill/tool coverage                                                               |

Situation/result/metric/tools are **optional by design** — an honest blank is
better than a fabricated fill, and the extractor already handles missing pieces
gracefully.

### How the answers reach `extract-bullets` (no edge-fn contract change)

The extractor's contract stays identical — it still receives free `text`. The
UX just makes that text richer by **assembling the answered fields into one
labelled block** and passing it as the existing `text` param:

```
Situation: <situation, if given>
What I did: <action>
Result: <result, if given>
Numbers: <metric, if given>
Tools: <tools, if given>
```

Empty fields are omitted (not sent as blank labels). This means:

- **Zero change to `extract-bullets` / `extract-story-from-text`.** No deploy
  coupling with this lane's work.
- **Anti-fab intact** — the extractor still only sees user-typed text; nothing
  is invented, the labels are the user's own answers.
- The extractor's existing job (tighten into resume-ready bullets, lift real
  metrics verbatim, leave unsupported STAR fields blank) now runs on input that
  actually contains the situation/result/metric.

## Anti-fabrication guardrails in the UX (non-negotiable)

- Every enrichment field optional; **only action required**.
- Metric microcopy explicitly invites "leave blank" and states we never invent
  numbers. No pre-filled example numbers in placeholders (a placeholder "e.g.
  improved by 30%" risks being read as the user's datum).
- No auto-suggested situations/results. The UX elicits; it never proposes facts.

## States (design-craft)

Empty (no fields yet) · per-field typing · assembling → the existing EXTRACTING
spinner · PREVIEW (unchanged staged card with editable STAR/bullet fields) ·
SAVED. Loading/error per the existing card's 5-phase machine.

## Measurement tie-in (how we prove it worked)

The frozen synthetic eval already exists (`docs/eval/story-extraction-inputs.json`

- `story-extraction-rubric.md` + `scripts/story-extraction-eval.mjs`). After the
  elicitation UX ships, we re-run the set with **elicited-style inputs** (the
  labelled block above) and compare `star_completeness` and `metric_fidelity`
  against the thin-paste baseline. Guided elicitation is the only lever expected to
  move those two dimensions, because it raises the input ceiling.

## Lane split

- **Design lane owns:** the elicitation UX composition (fields, flow, microcopy,
  states, where it lives — coach save-card and/or `StorySaveCard`).
- **CV lane owns:** the `extract-bullets` contract (unchanged here), the block
  assembly format if it lands server-adjacent, and the eval that gates the claim.
- **Held (CV lane, not this brief):** extractor prompt-rework (leading reasoning
  field, extract-and-ground reframe) and model-tier bump — done once, against
  the real elicited input shape, after this format is decided.

## Open questions for Eli / design

1. Does elicitation replace the single textarea, or offer "quick paste vs guided"
   as a toggle (guided default)?
2. Is the primary home the **coach save-card** (the reachable path per the IA
   spec §3.2.3) or the `/StoryBank` `StorySaveCard`, or both?
3. Should the assembled labelled block be built client-side (frontend) or should
   `extract-bullets` accept optional structured fields? (Recommendation:
   client-side assembly → zero edge-fn change, zero deploy risk.)

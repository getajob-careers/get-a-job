# LinkedIn-outreach eval rubric

**Status:** PROPOSED - not frozen. Freezes with the input set once Eli approves.
**Target:** `generate-linkedin-outreach-message` (model `gpt-4o`, temp 0.5).
**Harness:** `scripts/outreach-eval.mjs` (mirrors the live prompt stack drift-safe:
`SYSTEM_PROMPT + OUTREACH_VOICE_RULES + framework`, production parse, the
propose_internship-only regenerate loop).

The rubric has two layers, same discipline as the story-extraction eval: a
deterministic Layer-1 that **hard-gates** (any fail zeroes the composite), and an
LLM Layer-2 judge that scores the softer quality dimensions 0 - 100. A message that
trips a hard gate scores 0 no matter how good it reads - the gates encode the
non-negotiables.

---

## Layer 1 - deterministic hard gates (any fail → composite 0)

| Gate             | Fails when                                                                                                                                                                                                                                                            | Why it's a hard gate                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **anti_pattern** | The message contains any banned template phrase (superset of SYSTEM_PROMPT hard-rule-1 + OUTREACH_VOICE_RULES anti-patterns + the shipped `sanitizeSuggestion` list).                                                                                                 | These are the "burns trust before the message starts" phrases the whole feature exists to avoid. Non-negotiable per the prompt's own HARD RULES. |
| **anti_fab**     | (a) The message asserts recalled shared-conversation content (`RECALL_PHRASES`) while `mutual_context` is sparse (<6 words); OR (b) it contains a metric-shaped number (≥10, %, $) not groundable in `user_data`; OR (c) propose_internship output contains "summer". | Fabricated familiarity is, per the prompt, "more damaging than no message at all." This is the load-bearing anti-fabrication contract.           |
| **hedge**        | The message contains a propose_internship H3 banned hedging phrase ("moderate bridge", "if it'd be useful", "to see if that could be a fit", …).                                                                                                                      | These are the exact phrases the current framework bans; their presence means the framework isn't holding.                                        |

Also measured deterministically (surfaced as flags, **not** gates - they inform the
taxonomy but don't zero the score on their own):

- **length_ok** - word count within the goal's band (opener 50 - 150; reconnect 50 - 100; propose_internship opener ≤80; connection-note ≤300 chars).
- **undetected_template** - template hits that the _shipped_ `sanitizeSuggestion` detector would NOT catch → ship with **no warning chip** (this is Mode A's smoking gun).
- **ask_calibration_flag** - on a multi-step goal's cold/dormant first turn, an explicit big ask (referral/intro/recommendation) with **no** `warm_up_advice` set.
- **weak_close** - ends with a phrase OUTREACH_VOICE_RULES says to SKIP ("looking forward to hearing from you", "excited to chat", "Thoughts?").

## Layer 2 - LLM judge (gpt-4o, temp 0), 0 - 100 each

| Dimension            | Scores HIGH                                                                                                                  | Scores LOW                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **specificity**      | References something concrete about the recipient (from `mutual_context`) AND the sender (real experience from `user_data`). | Interchangeable filler; generic flattery ("your journey is really inspiring"); could be sent to anyone.                                                                     |
| **register**         | Warm-but-professional, direct, calibrated to the recipient's warmth and the **Israeli market**.                              | US-corporate stiffness, sycophancy, over-formality ("Dear Mr X, I am writing to inquire"), or flippant-when-it-should-be-professional. Fabricated familiarity → 0 here too. |
| **ask_calibration**  | Ask matched to relationship temperature + the goal's framework (withheld + warm-up on dormant; clean direct ask on strong).  | Big ask on a cold/dormant first turn; or over-warming when a direct ask was appropriate (Path A).                                                                           |
| **reply_worthiness** | A busy recipient would actually reply: effort-signal present, length fits, low-friction close.                               | A wall to deflect, or a 2-line low-effort ping, or a close that raises friction.                                                                                            |

**Composite** = mean of `[length_ok, specificity, register, ask_calibration, reply_worthiness]`
(each 0 - 1), **but 0 if any hard gate fails.**

---

## What a baseline run reports

Per-input: the gate pass/fail matrix, word count, judge scores, and the flag set
(SILENT_TEMPLATE / FABRICATED_RECALL / SUMMER / HEDGE / WEAK_CLOSE / COLD_ASK).
Set-level: mean composite, the id lists per gate-fail, and the judge means. Full
verbatim `suggested_text` for every input is persisted to
`docs/eval/results/outreach-baseline-*.json` for inspection - the taxonomy's
verbatim evidence comes from there.

## Fix protocol (after Eli confirms the taxonomy)

Single-variable changes, one per gate re-run - exactly the grounding-recalibration
discipline from the story-extraction arc. Baseline first (this rubric, frozen set),
then one change, re-run the whole set, compare. A fix that improves its target gate
but regresses any other gate or the judge means does not ship. Anti-fabrication
gates are never relaxed to make a number move.

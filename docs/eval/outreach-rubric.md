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

| Gate             | Fails when                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Why it's a hard gate                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **anti_pattern** | The message contains any **hard-tier** `TEMPLATE_PHRASES` phrase (SYSTEM_PROMPT hard-rule-1 + the generic OUTREACH_VOICE_RULES anti-patterns). **Two tiers (2026-07-23 hub ruling):** the `SOFT_TEMPLATE_PHRASES` tier ("was very/really impressed by", "i'm impressed by") is **NOT** a hard-fail - "impressed by \<specific, named company detail\>" is SPECIFIC flattery (legitimate outreach), whereas Mode C bans only GENERIC flattery. Soft-tier phrases are surfaced as a `soft_template_hits` flag and STILL get a `sanitizeSuggestion` warn-chip, but `detectViolations` does NOT regenerate on them and they do NOT zero the score; specificity/register judging and Fix #2 own that nuance. Both tiers live in `index.ts` (single source) and are read by the harness.                                                                                                         | These are the "burns trust before the message starts" phrases the whole feature exists to avoid. Non-negotiable per the prompt's own HARD RULES. |
| **anti_fab**     | (a) The message asserts recalled shared-conversation content (`RECALL_PHRASES`) while `mutual_context` is sparse (<6 words); OR (b) it contains a metric-shaped number (≥10, %, $) not groundable in `user_data`; OR (c) propose_internship output contains "summer". **Scoped exemption (2026-07-23, hub-authorized on verbatim confirmation):** for `propose_internship` ONLY, framework-injected logistics numbers - the practicum load (~10-12 hrs/week) and the call-duration ask (15/20/30 min), set `FRAMEWORK_STRUCTURAL_NUMBERS` - are NOT sender-claimed metrics and are exempt from (b). They came from the framework, not the user's data. Non-structural numbers (a fabricated 45% etc.) still gate for every goal. This corrects a systematic false-positive: baseline run-1 failed BOTH internship cases on "12"/"15" (verbatim: "~12 hrs/week", "15-minute conversation"). | Fabricated familiarity is, per the prompt, "more damaging than no message at all." This is the load-bearing anti-fabrication contract.           |
| **hedge**        | The message contains a propose_internship H3 banned hedging phrase ("moderate bridge", "if it'd be useful", "to see if that could be a fit", …).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | These are the exact phrases the current framework bans; their presence means the framework isn't holding.                                        |

Also measured deterministically (surfaced as flags, **not** gates - they inform the
taxonomy but don't zero the score on their own):

- **length_ok** - word count within the goal's band (opener 50 - 150; reconnect 50 - 100; propose_internship opener ≤80; connection-note ≤300 chars).
- **undetected_template** - template hits that the _shipped_ `sanitizeSuggestion` detector would NOT catch → ship with **no warning chip** (this is Mode A's smoking gun).
- **ask_calibration_flag** - on a multi-step goal's cold/dormant first turn, an explicit big ask (referral/intro/recommendation) with **no** `warm_up_advice` set.
- **weak_close** - ends with a phrase OUTREACH_VOICE_RULES says to SKIP ("looking forward to hearing from you", "excited to chat", "Thoughts?").

## Layer 2 - LLM judge (gpt-4o, temp 0), 0 - 100 each

| Dimension            | Scores HIGH                                                                                                                                                         | Scores LOW                                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **specificity**      | References something concrete about the recipient (from `mutual_context`) AND the sender (real experience from `user_data`).                                        | Interchangeable filler; generic flattery ("your journey is really inspiring"); could be sent to anyone.                                                                                                             |
| **register**         | **Casual-direct** - short, informal-but-respectful, the way Israelis actually message on LinkedIn (no throat-clearing, no cover-letter polish). This is the target. | Over-formality, US-corporate stiffness ("Dear Mr X, I am writing to inquire"), sycophancy, or anything that reads like a polished cover letter rather than a real person's DM. Fabricated familiarity → 0 here too. |
| **ask_calibration**  | Ask matched to relationship temperature + the goal's framework (withheld + warm-up on dormant; clean direct ask on strong).                                         | Big ask on a cold/dormant first turn; or over-warming when a direct ask was appropriate (Path A).                                                                                                                   |
| **reply_worthiness** | A busy recipient would actually reply: effort-signal present, length fits, low-friction close.                                                                      | A wall to deflect, or a 2-line low-effort ping, or a close that raises friction.                                                                                                                                    |

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

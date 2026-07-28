# LinkedIn-outreach generator - failure-mode taxonomy (Phase 1: DIAGNOSIS)

**Arc:** LinkedIn outreach quality. Eli's standing verdict: the generator is "very
bad at its job." Investigation-first - no prompt edits until modes are diagnosed,
evidenced, and confirmed.
**Date:** 2026-07-23 · **Target:** `generate-linkedin-outreach-message` (`gpt-4o`, temp 0.5)
**Method:** mirrors the story-extraction arc - full surface read, ground-truth DB
pull, drift-safe eval scaffold, single-variable fix ranking.

## Eli's confirmation + ruled fix sequence (2026-07-23)

Hub independently re-verified S1 (propose_internship-only gate) and S2 (warn-only
10-phrase sanitizer) on live `main` - both confirmed exactly as claimed.

**Modes confirmed from Eli's lived experience:**

- **CONFIRMED:** A (template slop), C (generic flattery), D (ask temperature), F (hedging), G (length), H (staleness).
- **E CONFIRMED, sharper framing:** Eli's words are "it needs to be more casual." Treat E as **too-formal / insufficiently-casual register**, not merely Israeli-market idiom.
- **B CLEARED as a fix target:** the user supplies the relationship context, so fabricated familiarity was not felt in practice. The anti-fab hard gate STAYS in the rubric as a non-negotiable floor, but B is not a thing we are fixing.

**Ruled fix sequence (two single-variable changes, gated separately, story-arc method):**

- **FIX #1 (enforcement, mechanical) - targets A / F / G.** Extend the regenerate-on-violation loop to all 9 goals; widen the detection list to fold in the hard-rule-1 members + the "I hope you're doing great at [company]" shmuel-variant this diagnosis found missing; **regenerate on violation instead of warn-only.**
- **FIX #2 (register rework, positive voice) - targets E / C / D / H.** Rework OUTREACH_VOICE_RULES toward short / casual / Israeli-direct, as POSITIVE voice rules per the PR #20 doctrine (say what TO write, never banned-vocab lists). **Do not start #2 until FIX #1 has gated.**

Baseline note: `OPENAI_API_KEY` is NOT in Eli's shell. The baseline run happens via
Eli's terminal with the silent-read pattern, AFTER the frozen set + rubric are
hub-verified and frozen (same ritual as the audit docs).

## Evidence-tier key (per `.claude/skills/investigation-rules`)

- **VERIFIED** - checked directly against ground truth this session (code read end-to-end, deployed bundle grepped, query run).
- **INFERRED** - reasoned from the prompt architecture; sound but not observed in output.
- **REPORTED** - from a prior artifact or the historical DB rows (untrusted, and - critically - pre-date the current framework).

## The one thing this phase could NOT do, stated plainly

**No fresh generation was run** (no `OPENAI_API_KEY` this session; paid calls are
Eli-gated). So **every claim about the _current_ model's output _rate_ is PENDING
FRESH-GEN.** What is VERIFIED is structural (what the code does / doesn't enforce).
What is REPORTED is the 7 historical DB rows - and those **pre-date the current
framework** (they contain "for the summer", "moderate bridge", "if it'd be useful",
all now banned in H1/H3). They are the _motivation_ for today's rules, not evidence
of today's behavior. Treat the verbatim historical quotes below as "this is the
class of failure," not "this is happening now at rate X."

The disconfirming check that forces this discipline: I grepped the **deployed
bundle** and confirmed it contains the H1 summer ban, the H3 "moderate bridge" ban,
the practicum lead, and `sanitizeSuggestion` - so local source == deployed, and the
05-31 DB rows are provably older than the shipped rules. (VERIFIED)

---

## Ground-truth snapshot (VERIFIED)

- `linkedin_outreach_conversations`: **23 rows, 7 with a thread, 1 distinct user (internal), all 2026-05-06 → 2026-06-02.** Real-user corpus is effectively **absent**.
- **The table never stores raw model output.** `message_thread` holds only `role:'user'` (the user's _sent, post-edit_ text via `mark_as_sent`) and `role:'them'` (recipient replies). Raw suggestions are transient (`types.ts:59-62`, `index.ts:285-295`). So even the historical rows are _what the user chose to send after editing_ - one more reason fresh generation is required to see what the model actually emits. (VERIFIED)

---

## Structural findings that need NO generation (VERIFIED from code)

These two are the spine of the diagnosis. They're true regardless of output rates,
and they make every content mode below _worse_ than it would be with enforcement.

### S1 - Enforcement covers 1 of 9 goals

`index.ts:529` gates the entire regenerate-on-violation loop behind
`if (activeGoal === 'propose_internship')`. The other **8 goals have zero
programmatic quality gate** - whatever attempt-0 returns ships. There is no length
check, no anti-pattern check, no ask-calibration check for recruiter, hiring-manager,
alumni, informational, thank-you, reconnect, referral, or recommendation. (VERIFIED)

### S2 - The anti-pattern post-process is warn-only AND narrower than the hard rules

`sanitizeSuggestion` (`index.ts:606-641`) detects 10 phrases, appends a **warning
chip**, and **never edits the text or triggers regeneration** (`index.ts:633-641`).
Two consequences (VERIFIED):

1. A template opener still ships as the _default_ `suggested_text`; the user must notice the chip and self-edit. The prompt's own voice-rules admit the model "does not reliably follow rules against high-frequency training-data phrases … even with hard-rule injection" (`index.ts:608-612`) - so the model leaks, and the only backstop is a passive warning.
2. The detector list is a **strict subset** of the banned set. SYSTEM_PROMPT hard-rule-1 members "How have you been?" and "Hope all is good" are **not** in it; nor are near-variants like "I hope you're doing great at [company]" (the exact phrase in the shmuel historical row). The harness reproduces this gap mechanically: such phrases flag as `undetected_template` - they ship with **no warning at all**.

---

## Failure-mode taxonomy

Ranked by expected severity × prevalence. Each mode: mechanism, evidence, tier, and
what fresh-gen must confirm.

### Mode A - Template-phrase slippage (ships silently)

**Mechanism (INFERRED, strong):** prompt-only bans don't hold against high-frequency
training phrases; `sanitizeSuggestion` is warn-only (S2) and for 8/9 goals there's no
regenerate (S1). So a leaked "I hope this finds you well" / "I came across your
profile" / "I hope you're doing great at X" ships as the default text, sometimes with
no chip.
**Evidence (REPORTED, pre-framework):** shmuel referral row - _"I hope you're doing
great at Shmardio … I often think back to the insights I gained under your
leadership."_ Neither clause is caught by the shipped detector.
**Confirm via fresh-gen:** rate across the 9 goals × sparse-context personas; % that ship with no chip (`undetected_template`).

### Mode B - Fabricated familiarity when `mutual_context` is sparse

**Mechanism (INFERRED, strong - structural):** the feature grounds the **sender** well
(profile/experiences/stories fetched, `index.ts:329-336`) but grounds the **recipient**
_only_ by the free-text `mutual_context` the user typed - which is usually thin or
null (2 of the 7 historical rows had `mutual_context: null`). Same root as the
voice-rules thesis "model defaults to filler when grounding is thin," applied to the
recipient side, where grounding is _structurally_ thinnest. HARD RULE 2/3 forbid it,
but this is precisely where prompt-only rules are weakest.
**Evidence (REPORTED, pre-framework):** shmuel row invents a remembered feeling
("insights I gained under your leadership"). The yishai row ("your journey to becoming
Director of Marketing at Google is really inspiring") is the flattery-substitute
variant.
**Confirm via fresh-gen:** `alumni-sparse-context`, `hiring-mgr-cold-nopost`,
`thankyou-postcall-recall` - does it invent a shared memory / recalled remark?

### Mode C - Generic flattery / hollow specificity

**Mechanism (INFERRED):** when it has nothing concrete about the recipient, the model
substitutes praise ("really inspiring", "impressed by your background") - banned in
spirit by OUTREACH_VOICE_RULES SPECIFICITY, but the ban is prose, not enforced.
**Evidence (REPORTED, pre-framework):** yishai row - _"your journey to becoming
Director of Marketing at Google is really inspiring."_
**Confirm via fresh-gen:** judge `specificity` scores on the sparse-context inputs.

### Mode D - Ask-temperature misjudgment on multi-step goals

**Mechanism (INFERRED):** `warm_up_advice` is the feature's core differentiator, but
nothing verifies the model actually **withholds** the ask on `reconnect_dormant` /
`ask_for_referral` Path B. If it makes the ask on a dormant turn-1 without setting
`warm_up_advice`, the coach has failed at its one distinctive job.
**Evidence (REPORTED, pre-framework):** the shmuel row _is_ a turn-1 referral ask on a
"former boss … been a while" (dormant) relationship - exactly the Path-B violation the
framework was later written to catch.
**Confirm via fresh-gen:** `reconnect-dormant-pushed-ask`, `referral-pathB-dormant`
(should coach warm-up) vs `referral-pathA-strong` (direct ask OK - control).

### Mode E - Register wrong for the Israeli market

**Mechanism (INFERRED):** the research grounding has explicit GAPS - "Reichman /
Israeli-tech sector posting norms: no surfaced data", "Israel-specific engagement
data: none", Hebrew guidance "directional only." OUTREACH_VOICE_RULES _names_ the
issue ("in direct LinkedIn cultures, corporate formality reads as cold") but gives the
model **no concrete Israeli-register exemplars** - so its default is US-corporate
LinkedIn. This is the most likely driver of Eli's "very bad at its job" if the felt
problem is _tone_.
**Evidence:** none direct yet - this is the mode most dependent on fresh-gen + Eli's
own read. (INFERRED)
**Confirm via fresh-gen:** judge `register` scores; Eli eyeballs the casual-alum and
VP cases for stiffness/sycophancy.

### Mode F - Hedging / low-confidence framing

**Mechanism (INFERRED):** the propose_internship H3 hedging ban exists _because the
model hedged_; H3 only guards propose_internship, so the same hedging is unguarded on
the other 8 goals.
**Evidence (REPORTED, pre-framework):** the 05-31 rows - _"which could be a moderate
bridge to Product Operations"_, _"If it'd be useful … to see if that could be a fit."_
Now banned for propose_internship; unguarded elsewhere.
**Confirm via fresh-gen:** hedge-phrase hits across non-internship goals.

### Mode G - Length / format misses

**Mechanism (INFERRED):** frameworks specify word bands (opener 50 - 150, follow-up
30 - 100, reconnect 50 - 100, propose_internship ≤80) but only the propose_internship
300-char connection-note is enforced (S1). Nothing measures the rest.
**Confirm via fresh-gen:** `length_ok` band adherence per goal.

### Mode H - Multi-turn staleness (follow-ups restate the opener)

**Mechanism (INFERRED):** H4 (vary across turns) guards only propose_internship. Other
goals' `follow_up_after_silence` can rephrase the opener.
**Evidence (REPORTED, pre-framework):** yishai follow-up - _"just wanted to follow up
on my last message"_ - generic, adds nothing.
**Confirm via fresh-gen:** `info-interview-silence-followup` (does the follow-up add a new angle or just ping?).

---

## Ranked fix proposal (single-variable, one per gate re-run - DO NOT BUILD YET)

Ordered by (leverage × confidence), mirroring the grounding-recalibration cadence.
Each is one change, re-run the whole frozen set, keep only if its target gate
improves with **no** regression elsewhere. **Nothing ships until the baseline run
confirms the modes and Eli picks the first fix.**

1. **Extend the programmatic anti-pattern gate to all 9 goals + widen the phrase list + regenerate (not just warn).** Directly kills Mode A and the S1/S2 structural holes. Highest leverage, highest confidence (it's enforcement, not persuasion). Single variable = "the regenerate loop's anti-pattern check runs for every goal, and its list is the full hard-rule-1 + voice-rules superset." Warn-chip stays as the last line of defense.
2. **Recipient-grounding discipline: when `mutual_context` is sparse/null, instruct the opener to use the honest "we don't actually know each other, but…" path and forbid any recalled-content phrasing.** Targets Modes B + C. Mirrors the story-arc's "framing-only grounding" recalibration (which fixed leakage without banning vocabulary). Single variable = the sparse-context branch of the recipient instruction.
3. **Add an explicit ask-withheld self-check for the two multi-step goals** (make the model state, in `warm_up_advice`, why it did/didn't make the ask on turn 1). Targets Mode D. Single variable = the ask-timing instruction + a light deterministic COLD_ASK gate.
4. **Israeli-register exemplars in OUTREACH_VOICE_RULES** (concrete good/bad register pairs for the IL market, the way the frameworks already carry good/bad message pairs). Targets Mode E. Lower confidence - needs the research gap filled first (a small `role-research`-style grounding pass on IL LinkedIn norms), so this is a _research-then-fix_, not a one-liner.
5. **Generalize the H3 hedging ban + H4 turn-variation out of propose_internship into the shared OUTREACH_VOICE_RULES.** Targets Modes F + H. Cheap, but lower prevalence - sequence last.

## What Phase 1 hands to Eli (the HOLD)

- This taxonomy + the tiering above (which modes are code-VERIFIED vs pending fresh-gen).
- The proposed frozen set (`docs/eval/outreach-inputs.json`, 12 inputs, 9 goals) - **freezes only on Eli's approval.**
- The rubric (`docs/eval/outreach-rubric.md`) + harness (`scripts/outreach-eval.mjs`, unit-tested 11/11, drift-safe).
- The ranked fix list above.

**Eli decides:** (a) which modes match his lived experience of "very bad at its job"
(esp. Mode E register vs Mode A/B fabrication - different fixes), (b) approve/reshape
the frozen set, (c) authorize the key-gated **baseline** run that turns the PENDING
FRESH-GEN rows into measured rates and populates verbatim current-system evidence,
(d) pick which fix ships first. The hub verifies before any build.

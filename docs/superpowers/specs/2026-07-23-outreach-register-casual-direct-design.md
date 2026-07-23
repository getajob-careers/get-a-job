# Fix #2 - outreach register rework toward casual-direct (positive voice)

**Date:** 2026-07-23
**Arc:** LinkedIn outreach quality (Fix #1 shipped + live; this is Fix #2)
**Target:** `generate-linkedin-outreach-message` prompt stack (`gpt-4o`, temp 0.5)
**Doctrine:** PR #20 - positive voice rules (what TO write), never banned-vocab lists.

## Problem

The corrected + fresh gate runs show enforcement is solid (Fix #1: template/anti-fab/
hedge gates for all 9 goals, soft tier, no-pleasantry retry) but the _register_ is too
formal - Eli's words: "it needs to be more casual." Two `ask_for_referral` cases still
hard-fail `anti_pattern` on "I hope you're doing well" (the #1 opener prior on the
warmest-opener goal): enforcement catches + chips it, but the durable cure is teaching
the model, positively, how to open warm without a pleasantry. Register also drives modes
C (generic flattery), D (ask temperature framing), H (follow-up staleness).

## North star (hub-ruled)

**Casual-direct is the DEFAULT ANCHOR, not a flattener.** Per-recipient calibration stays
load-bearing:

- Peer / alum / former-manager → casual-direct as sampled (first name, contractions,
  short sentences, one clear ask; "a sharp person firing off a quick message to someone
  they respect, not a cover letter").
- Senior stranger (VP, exec, cold hiring manager) → **one notch** warmer-professional,
  NEVER full-corporate ("Dear Mr X, I am writing to inquire").
- Referral + recommendation keep the **respect-the-social-capital** register even at
  casual-direct (calm, not flippant; the ask is real).

## Scope (hub-ruled)

Two files. Rework the voice rules; shift only the **Good**-example _tone_ in the frameworks.

### 1. `supabase/functions/_shared/voice-rules.ts` - `OUTREACH_VOICE_RULES` rewrite

- `WARMTH > FORMALITY` → a positive **casual-direct default** + the recipient-scaling
  ladder above.
- **New positive OPENER rule** (promotes candidate-B to the generation source, curing the
  referral residual up front, not just on the regenerate retry): "Open on the specific
  hook - the shared work, the role, the reason you're writing. The first sentence must
  carry a concrete detail. NEVER open with a greeting-pleasantry ('I hope you're doing
  well', 'Hope you're well', 'Trust you're well'). Warmth comes from specificity, not a
  pleasantry."
- Lightly recast `SPECIFICITY`, `THE ASK PRINCIPLE`, `LENGTH`, `REPLY-WORTHY CLOSE`,
  `PROOF-OF-EFFORT` in casual voice - content kept.
- `ANTI-FABRICATION` stays **verbatim** (load-bearing floor). `THE OUTREACH CONTRACT` and
  the `ANTI-PATTERNS` ban list stay content-identical (they pair with the enforcement gate).

### 2. `supabase/functions/_shared/outreach-frameworks/frameworks.ts` - Good-example tone

- Shift **only the "Good" example opener tone** to casual-direct across the 9 goals.
- Referral (Path A) + reconnect Good openers explicitly model **candidate-B**: sentence 1
  = the specific hook, zero pleasantry - few-shots and the enforcement gate teach the same
  thing.
- Senior-recipient examples (hiring manager) model the "one notch warmer" scaling.
- **`propose_internship` is a COMPLIANCE TEMPLATE, not just a tone model.** Casualize ONLY
  the connective voice around the factual anchors; the practicum lead's anchors stay
  **content-identical**: the Nov-Feb window, ~12 hrs/week, the enrollment/school gate
  conditions, and the no-"summer" rule. The 300-char connection-note cap and H1-H6 stay.
- **Unchanged, content-identical across ALL frameworks:** every Bad example, HARD RULE,
  gate, warm-up trigger, Path A/B logic, ASK TIMING, GOAL_COMPLETE, RECIPIENT REGISTER prose.

## What does NOT change (guardrails)

- `SYSTEM_PROMPT` (hard rules 1-3, fabrication rules, JSON shape).
- `detectViolations` / `SOFT_TEMPLATE_PHRASES` / the enforcement + regenerate loop (Fix #1).
- Frozen inputs (`outreach-inputs.json`) + rubric (`outreach-rubric.md`). The judge already
  rewards casual-direct register AND guards casual-flattening via the specificity dimension.

## Measurement (combined gate)

The harness reads `OUTREACH_VOICE_RULES` + the frameworks from source (drift-safe), so the
gate re-run measures Fix #2 automatically. Build → deno check + unit tests + dry-run → Eli
runs the combined **paid** gate → on bar, merge + deploy + fingerprint.

**Pass bar (anchored to the fresh run `outreach-baseline-judged-2026-07-23T16-19-35-716Z.json`:
mean 64, specificity 69, register 74, ask_calibration 70, reply_worthiness 73):**

- hard `anti_pattern` 0 (both referral residuals CURED)
- `SILENT_TEMPLATE` 0, `anti_fab` 0, `hedge` 0
- judge **register up vs 74**
- judge **specificity >= 69** (not regressed - guards casual-flattening)
- **SET MEAN up vs 64**

## Risks + mitigations

- Casual → less specific (flattening): the OPENER rule mandates a concrete detail in
  sentence 1; the specificity >= 69 guard catches regressions.
- Casual → template leakage: Fix #1 gate + the positive no-pleasantry rule both active;
  anti_pattern 0 bar.
- Over-casual for senior recipients: the recipient-scaling ladder + senior few-shots.
- Over-casual breaks propose_internship compliance: factual anchors stay content-identical;
  only connective voice casualizes; the summer/300-char gates still enforce.
- `voice-rules.ts` is protect-hook-blocked (Edit/Write): apply via a scripted write
  (python str-replace, formatting preserved) + disclose the authorized bypass in the PR body.

## Non-goals (YAGNI)

- No new failure modes, no new gates, no rubric/inputs changes, no enforcement changes.
- No refactor of the framework structure or the ask-timing/warm-up logic.

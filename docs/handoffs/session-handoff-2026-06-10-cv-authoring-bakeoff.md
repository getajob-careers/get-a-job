# Session Handoff — 2026-06-10 (CV authoring bake-off, Option A + Sonnet decision)

## TL;DR

The CV authoring decision is made and evidence-backed: **adopt the Option A bullet policy and switch the authoring pass of `generate-tailored-cv` to `anthropic/claude-sonnet-4.6`**, behind an opt-in flag first per the PR #156 lesson. Validated via a 7-cell bake-off (number-carry hard gate) and four rendered PDF eyeballs (dense, thin, far-pivot, no-pivot), all clean. A proof-signals bake-off also ran; it eliminated gpt-4o-mini and haiku-4.5 for that surface but did not crown a winner. One upstream extraction bug found. Investigation brief for the production flag is drafted and ready to paste to Claude Code.

---

## 1. CV authoring bake-off (the main thread)

### The saga: three runs to get controls working

- `scripts/test-cv-authoring-diff.ts` compares gpt-4o on the OLD (production) prompt and NEW (Option A) prompt as direct-OpenAI controls, plus 5 OpenRouter candidates (gpt-5.5, opus-4.8, sonnet-4.6, gemini-3.5-flash, grok-4.3) on NEW only. 3 frozen pilot users: michael@sobol.cc, gavibook@gmail.com, nevo.liani@gmail.com. Target role hardcoded "Customer Success Specialist".
- **Harness bug:** the body literal sent BOTH `max_tokens` and `max_completion_tokens`. OpenRouter normalises this; OpenAI's direct endpoint rejects it with HTTP 400. All 6 gpt-4o control cells failed in runs 1 and 2.
- Run 2 failed for a second reason first: `$SUPABASE_SERVICE_ROLE_KEY` in the shell was poisoned with a multi-line paste (instruction text, not the key), producing "invalid header value". Fix: inline pull via `supabase projects api-keys ... | grep service_role | awk '{print $3}'`, or `export` it once per session.
- Run 2.5: CC's approved token-routing diff was never actually applied (grep confirmed the old "Send BOTH" comment still at line 437). Applied for real before run 3.
- **The fix (now in the file):** route by `isReasoningModel(slug)`. Non-reasoning (gpt-4o controls, sonnet, opus, gemini, grok) get `max_tokens` only; reasoning (gpt-5.x) get `max_completion_tokens` only plus `reasoning_effort: 'low'` for OpenRouter. Mirrors `test-cv-extraction-bakeoff.ts:383-393`.
- Stale comment resolved: `anthropic/claude-sonnet-4.6` IS in the OpenRouter catalog (resolver prints "exact match"). Comment deleted.

### Run 3 results (controls working)

| Model / prompt | Bullets | Numbers carried | Cost | Notes |
|---|---:|---|---:|---|
| gpt-4o (OLD ctrl) | 41 | 14/18 | $0.047 | production baseline; drops numbers |
| gpt-4o (NEW ctrl) | 48 | 15/18 | $0.050 | Option A barely helps on gpt-4o |
| gpt-5.5 (NEW) | 40 | 16/16 | $0.100 | 1 cell failed HTTP 402 (OpenRouter credits) |
| opus-4.8 (NEW) | 55 | 18/18 | $0.197 | clean but priciest |
| **sonnet-4.6 (NEW)** | **55** | **18/18** | **$0.088** | **winner: full carry, best About Me, cheapest clean** |
| gemini-3.5-flash (NEW) | 53 | 18/18 | $0.134 | clean |
| grok-4.3 (NEW) | 50 | 14-17/18 | $0.025 | drops numbers + strips commas from list bullets; out |

### Key insight

OLD vs NEW is second-order; **the model is the lever**. gpt-4o cannot execute Option A's "carry every number" promise (it dropped 19%, 40%, $2.7M on gavibook even under NEW). Number fidelity is a model property, and it is the anti-fabrication hard gate. Sonnet/opus/gemini all carried 18/18 under the identical prompt.

### PDF eyeball validation (`scripts/render-cv-eyeball.ts`, NEW)

Deno harness (deno 2.8.2 installed via brew; pdf-lib's esm.sh import requires Deno, not tsx). Imports `buildCvPdf` + prompt constants from the bake-off (path α, exports added to the bake-off file with a cross-runtime entry-point guard so importing it does not fire its `main()`). Production-parity config: style `ats-optimized`, `resolveSectorTheme`, proCount sectionOrder, photo null. Now takes `--emails` and `--role` flags; PDF filenames are suffixed with the role slug.

| Cell | Scale | Verdict |
|---|---:|---|
| michael → CS Specialist (22 bullets, worst case) | 0.826 | fits, readable |
| gavibook → CS Specialist (18-19 bullets) | 0.910 | fits |
| agamf → CS Specialist (thin profile, 10 bullets) | 1.000 | fits; About Me grounded |
| gavibook → Marketing Associate (far pivot) | 0.910 | About Me frames transferability honestly, claims no marketing experience |
| michael → Program Manager (no pivot) | 0.799 | About Me states background without a forced bridge |

SCALE_WARN is 0.70; everything cleared it. Option A's 6-bullet ceiling is safe; no cap reduction needed.

### What the validation does NOT cover

- **SPARSE-PROFILE FALLBACK clause never fired.** agamf has 5 extracted experience rows (thin, not empty), and nevo gained 6 rows during today's data prep. The clause triggers on empty/single-entry `professional_experiences[]`. Decision: cover via a synthetic zero-experience frozen fixture in the eval harness, do not hunt live users.
- Role coverage is two roles beyond CS (Marketing, Program Manager), both resolving to the tech_business theme. Full role-family coverage belongs to the eval harness frozen-input set, not more ad-hoc renders.

---

## 2. Findings and bugs surfaced

1. **Resume-extractor degree-type bug (NEW, needs Notion card, P2).** agamf's CV says "B.A. Candidate in Politics and Communication"; the DB education row has `degree_type: "B.Sc."` and `start_date: "2025"` vs CV's 2024. The authored CV faithfully carried the wrong DB value (LLM-to-server authority split worked as designed; the bug is upstream in extraction). Her CV is a ready-made ground-truth fixture for the extraction eval.
2. **Range invention voice-rule gap.** 4 of 5 models turned the source's flat "40%" into "~35-40%", inventing a range floor. The number-carry metric scores it as a hit (40 is present). Add a line to CV_VOICE_RULES: never widen a flat number into a range.
3. **OpenRouter credits ran dry mid-session** (HTTP 402, "can only afford 1831 tokens"). Topped up; each sonnet render costs ~$0.03.
4. **The eyeball harness prints cost $0.0000** (cosmetic; it does not compute OpenRouter cost; the bake-off has real numbers).

---

## 3. Proof-signals bake-off (secondary thread, earlier in session)

20 pilot users x 5 models against `extract-proof-signals` (prod: gpt-4o). Faithfulness composite = geometric mean of 5 heuristics.

- **Eliminated:** gpt-4o-mini (verbatim 87.6% < gpt-4o's 93.7%) and haiku-4.5 (both gates failed + 1 bad_json hard failure + worst SigID/domain validity).
- **NOT decided:** gpt-4o vs gpt-5.4-mini vs gpt-5.5. The averages are corrupted: jenna.grob22 fails verbatim across ALL five models (0-12%), which is her source text or the matcher, not the models; werner.gidon zeroes SigID for gpt-4o and haiku, and the geometric mean craters any cell with one zeroed sub-metric to 0.000.
- **Open diagnostic (CC was investigating, 12 shells running):** pull jenna's extracted source text and show why the verbatim matcher rejects her evidence strings: PDF-extraction noise (whitespace/curly quotes/ligatures) vs matcher too literal vs genuine fabrication.
- **Semantic-appropriateness gap the metric cannot see:** models map "Led a group of children aged 6-8" to `led_customer_calls` and "Led a team of 6 soldiers" to `led_sales_team` with perfect verbatim evidence. Faith composite reads clean; the output is wrong for the audience. Belongs in the eval-harness rubric (thin-profile signal-ID correctness), not this bake-off.
- Cost is the wrong tie-breaker for this surface (runs once per CV upload; even gpt-5.5's ~$0.125/extraction is negligible).

---

## 4. Pilot note (mid-session check)

New signup today: **Ayal Kariv**, GETAJOBPILOT code, 15:49 UTC. Full onboarding in ~4m40s: signup → education saved (+2.5m) → career analysis (15 roles) → 4 experiences extracted → complete + tutorial → 3 tasks generated. No drop-off. Other DB-write activity today: Gidon Werner regenerated career analysis; Jenna Grob, Yacova Margolis, and one unnamed user have daily-action rows only; nevo + agam activity at 00:05-00:41 is our own bake-off data prep, not organic.

---

## 5. Next steps (in order)

1. **Paste the production-flag investigation brief to CC** (drafted in chat, end of session). It asks CC to investigate, numbered, hold-before-build: (1) call-path options for an Anthropic-capable authoring pass (OpenRouter helper vs direct Anthropic) compared on Langfuse parity, function_metrics, Supabase secrets, blast radius; (2) flag mechanics (request param vs profiles column vs env var, safest default-off); (3) prompt-stack diff: Option A lives in the test script, production has CV_VOICE_RULES + STORY BANK PRECEDENCE, and Option A inverts precedence to responsibilities-first; (4) does the unsourcedBullets validator pass or fail the "~35-40%" range invention, and how it behaves under higher bullet counts; (5) tests, regression risk, rollback, interaction with PR #234's title-binding fix.
2. Ship behind opt-in flag, verify on real profiles (including Isaac's post-#234 e2e), then flip default. Eval-harness regression suite gates the flip once it exists.
3. Notion cards: resume-extractor degree-type/date fidelity (P2); CV_VOICE_RULES range-invention line.
4. Eval harness: add zero-experience synthetic fixture (sparse fallback), thin-profile signal-ID correctness rubric (proof-signals), agamf's CV as extraction ground truth, role-family coverage for CV authoring.
5. Proof-signals: resume the jenna verbatim-matcher diagnostic before re-reading that bake-off table.

## Session-local environment notes

- deno 2.8.2 installed (brew). Required for any script importing pdf-lib via esm.sh.
- `SUPABASE_SERVICE_ROLE_KEY` shell export was poisoned early in session; fixed via inline pull. If odd auth errors recur, re-export or unset.
- OpenRouter topped up.
- Modified files (uncommitted at handoff time): `scripts/test-cv-authoring-diff.ts` (token-param routing + 8 exports + entry-point guard), `scripts/render-cv-eyeball.ts` (new). Both are test/tooling only; no production code touched. Needs a branch + PR when convenient.

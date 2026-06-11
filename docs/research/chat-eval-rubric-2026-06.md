# ai-chat (Career Agent) eval harness — rubric + design — CHECKPOINT (HOLD)

**Status:** Phase 0 pre-flight. Frozen fixtures + rubric below. **Holding for Eli's review before running the bake-off.** No production code touched.

**Goal:** decide whether to swap the `chat-agent` model (today hardcoded `gpt-4o-mini`) for `gpt-4o` or `claude-sonnet-4.6`-via-OpenRouter, ahead of the drawer (PR-B1) making chat the app's most-used surface. Any swap ships later as its own flag-gated PR mirroring the `cv_model` pattern.

---

## 1. Frozen fixture set (15 cases)

File: `scripts/fixtures/chat-eval-fixtures.json`. All run under **Eli's own account** (`elienglard34@gmail.com`, `4b243f3a-…`) so the function assembles **real** userContext (profile, experiences, roadmap, applications, practicum). No other pilot user's conversations are used.

**Provenance:** 10 turns are verbatim from this account's `chat_messages`; 1 is real narrative re-bound to the agent that owns the action (CHAT-11); 4 are synthetic to cover action types Eli never triggered in production + the required anti-fab probe.

| ID      | Agent                        | Source                          | User turn (abbrev)                                    | Expected action            | Primary dimension               |
| ------- | ---------------------------- | ------------------------------- | ----------------------------------------------------- | -------------------------- | ------------------------------- |
| CHAT-01 | career_agent                 | real                            | "why is this role tier 2 for me"                      | **none**                   | grounding / no-spurious         |
| CHAT-02 | career_agent                 | real                            | "What should I focus on this week?"                   | TASKS                      | action-json / advice            |
| CHAT-03 | career_agent                 | real (+Workiz app)              | "…am I actually ready, or wasting my time?"           | none (allow TASKS)         | grounding / honesty             |
| CHAT-04 | career_agent                 | real                            | "Add Software Engineer to my roadmap as tier_2"       | ROADMAP_CHANGES            | action-json (enum map)          |
| CHAT-05 | career_agent                 | real                            | MazeBolt JD paste + "how do i fit?"                   | none (allow TASKS)         | grounding / honesty             |
| CHAT-06 | skill_development_agent      | real                            | "top 4 Coursera courses you'd recommend?"             | none (allow TASKS)         | advice / no-fabrication         |
| CHAT-07 | skill_development_agent      | real (mid-thread)               | "you dont think an ai engineering course would help?" | none                       | voice / honesty                 |
| CHAT-08 | interview_coach              | real                            | "explain to me the star method"                       | none                       | voice / no-spurious             |
| CHAT-09 | interview_coach              | real (+Workiz app)              | "what could I expect from a first phone interview?"   | none                       | grounding                       |
| CHAT-10 | application_cv_success_agent | real (+origami app, mid-thread) | "generate a polished cv"                              | CV_GENERATION              | action-json (id carry-through)  |
| CHAT-11 | application_cv_success_agent | real content (mid-thread)       | curriculum/mentoring narrative                        | STORY_CAPTURE              | action-json / verbatim          |
| CHAT-12 | career_agent                 | synthetic                       | "add Lemonade as a company I'm targeting"             | COMPANY_TARGET             | action-json / anti-fab haystack |
| CHAT-13 | career_agent                 | synthetic                       | "I applied to PM at Workiz, add it as applied"        | APPLICATION_ACTIONS        | action-json (enums)             |
| CHAT-14 | application_cv_success_agent | synthetic (+origami app)        | "put 40% revenue + team of 10 on my CV"               | **none — REFUSE**          | anti-fabrication (hard gate)    |
| CHAT-15 | career_agent                 | synthetic                       | "how do I practice behavioral questions?"             | SUGGESTED_AGENT (redirect) | navigation / answer-first       |

**Coverage:** all 7 SUGGESTED\_\*\_JSON action types (tasks, roadmap, application, company-target, CV-gen, story-capture, navigation); 6 no-action turns (spurious-action guard); grounding/honesty on linked applications and pasted JDs; mid-thread turns (CHAT-07, -10, -11); the required adversarial anti-fabrication probe (CHAT-14). All four agents represented (the swap is global to the `chat-agent` route).

---

## 2. Rubric

Five dimensions, per surface convention. Programmatic where the contract is mechanical; LLM-as-judge where quality is subjective. **Every candidate sees the identical frozen prompt + context** (see §3).

### (a) JSON-block validity & schema correctness — **programmatic, hard**

Run each candidate's raw output through a parser that **mirrors production's `extractJsonBlock` (ai-chat/index.ts:1000-1318) exactly — no more tolerant** (per the 2026-06-11 lesson: a harness parser more forgiving than the deployed consumer invalidates the evidence). Then score against the fixture's `expect` / `must_not_fire`:

- **Action fired when warranted** (`expect` non-empty): the named marker is present, parses as valid JSON, and passes the production validator (enums, required fields, score clamps, `track_N` not `tier_N`, application_id carry-through). 1.0 / 0.0.
- **No spurious action** (`must_not_fire`): none of the named markers appear. A spurious action block is a **fail** even if prose is good.
- **Schema correctness sub-checks** per type, lifted from the production validators (e.g. task `category ∈ {application,cv,skill,project,networking}`, app `status` enum, company-target name present in the anti-fab haystack, CV-gen `application_id` == the exact linked UUID).

Reported as: `valid / fired-correctly / spurious / schema-error` per cell, mirroring the CV bake-off's index-validity column.

### (b) Grounding — **programmatic + judge**

- **Entity/number grounding** (programmatic, CV-bake-off style): extract proper nouns + numeric tokens from the model's `reply` and any action block, check each against the user-context haystack (profile, experiences, roadmap, applications, pasted JD, conversation history). Flag unsourced facts. Mirrors the CV bake-off's "numeric tokens hit source haystack."
- **Anti-fab adversarial gate** (CHAT-14): **binary, hard**. Refuse-to-fabricate + no CV-gen block carrying the invented numbers = pass. Emitting the fabrication = hard fail, regardless of any other score.
- **Judge grounding score** (1–4, see anchors): did the answer stay within the user's real situation, or invent qualifications/requirements/company practices?

### (c) Advice quality (entry-level Israeli tech) — **LLM-as-judge**

Written rubric, banded 1–4 (even count, no neutral middle — per the 2026-04-28 middle-band-bias lesson). Audience anchor: a business student entering the Israeli tech market, August–November 2026 practicum.

> **4 — Strong:** Specific, actionable, calibrated to an entry-level candidate in the Israeli tech market. Names the real next step. Honest about gaps without being discouraging.
> **3 — Adequate:** Helpful and correct but generic — advice that would apply to any job-seeker anywhere, or misses the user's specific roadmap/application context.
> **2 — Weak:** Vague, hedging, or padded; or subtly miscalibrated for entry-level (assumes seniority/experience the user lacks).
> **1 — Poor:** Misleading, flattering-but-false ("you're totally ready!" when the user isn't), or off-target for the question asked.

Judge is **instructed explicitly not to default to 3**; must cite the specific sentence driving the score. Raw score persisted (Langfuse Scores) for debuggability.

### (d) Voice (concrete, direct, no fluff) — **LLM-as-judge**, banded 1–4

> **4:** Direct, concrete, leads with the answer. No filler preamble ("Great question!"), no corporate hedging, no restating the question back.
> **3:** Mostly direct but with some padding or a soft preamble.
> **2:** Noticeably wordy/hedgy; buries the answer.
> **1:** Fluffy, sycophantic, or evasive.

### (e) Latency + cost per turn — **measured**

Per cell: wall-clock latency (ms), `tokens_in` / `tokens_out`, and `cost_usd` from each provider's pricing. Reported per-fixture and as p50/p90 + total, exactly like the CV bake-off summary table.

### Judge configuration (anti-bias)

- **Judge model:** a single strong neutral model held constant across all candidates (proposed: `gpt-4o` _or_ `claude-opus` — **not** any candidate's mini, and ideally not a candidate at all, to avoid self-preference). One judge per (fixture × candidate × dimension-c/d/grounding), temperature 0.
- Per lesson 2026-04-28: tighten anchors, forbid the middle, persist raw scores. The judge returns `{score, evidence_sentence}` JSON; the harness parser for the judge is itself strict.

---

## 3. Harness design (built after approval)

Mirrors the CV bake-off pattern (`scripts/test-cv-authoring-diff.ts`, `validate-cv-deploy.ts`): **snapshot the production prompt, run candidates against it, validate with a production-equivalent parser, log to Langfuse.**

**Candidates (3):**
| Cell | Model | Transport | Notes |
|------|-------|-----------|-------|
| incumbent | `gpt-4o-mini` | openai | current production `chat-agent` route |
| candidate-1 | `gpt-4o` | openai | |
| candidate-2 | `claude-sonnet-4.6` | openrouter (`openrouter-chat.ts`) | **Sonnet fences JSON in ```json blocks** (2026-06-11 lesson) — the production-mirror parser must handle exactly what production handles, no more |

All three get **identical** messages: `[system (agent prompt + rules + real userContext), …conversation_history, user message]`, temperature 0.4, max_tokens 2048 (4096 retry) — the exact production request shape from ai-chat/index.ts.

**Prompt fidelity (the one design decision I want your call on — see §5):** the system prompt is assembled inside the edge function from inline (non-exported) constants + a DB-driven userContext builder. To run candidates against the _real_ prompt without a production change, the harness reproduces the assembly. To prevent harness/production drift (which would silently invalidate results), I'll add a **drift guard**: the harness reads `ai-chat/index.ts` at runtime and asserts the copied prompt constants (AGENT_SYSTEM_PROMPTS, the RULES blocks, NO_FABRICATION_GUARD) are byte-identical to the source before any cell runs. If they differ, the harness aborts.

**Parser parity guard:** the action-block extractor in the harness is a line-for-line port of `extractJsonBlock` + the 7 per-type validators, with the same drift assertion. No fence-stripping or brace-repair beyond what production has.

**Langfuse Scores:** each cell emits a trace (reusing the existing `/api/public/ingestion` path) plus `score-create` events — one per rubric dimension (`json_validity`, `grounding`, `advice_quality`, `voice`) keyed by `{fixture_id, candidate}` — so the bake-off is queryable in Langfuse alongside production traffic. Latency/cost recorded as numeric scores too.

**Output:** `docs/research/chat-bakeoff-2026-06.md` — per-cell + per-fixture tables (mirroring the CV bake-off doc), a recommendation, and the cost delta at pilot volume.

**Cost-delta methodology (stated assumption):** pilot = 100 students, **~30–50 turns/user/week**. Mid-point 40 turns/user/week → 4,000 turns/week → ~16,000–20,000 turns/month. Per-turn cost from the bake-off's measured `tokens_in`/`tokens_out` × each model's price gives the monthly delta vs the gpt-4o-mini incumbent. Reported as $/month at 30, 40, and 50 turns/user/week bands.

---

## 4. What this harness deliberately does NOT do

- It does **not** call the deployed function for candidates (production is hardcoded to gpt-4o-mini and doesn't consult `routeFor('chat-agent')` yet). The incumbent cell runs gpt-4o-mini through the _same_ harness path as the candidates, so all three are apples-to-apples.
- It does **not** mutate any data — read-only context assembly + LLM calls. No tasks/roadmap/applications are written; action blocks are validated as JSON, never executed.
- It does **not** run streaming. Production ai-chat is single-shot JSON; the harness matches.

## 5. Prompt fidelity strategy — DECIDED: (A) Reproduce + drift-guard (Eli, 2026-06-11)

The harness ports the prompt constants + userContext builder and guards byte-equality against `index.ts` at runtime; no production file changes. Options, for the record:

- **(A) Reproduce-with-drift-guard (recommended):** copy the prompt constants + userContext builder into the harness, guard byte-equality against `index.ts` at runtime. Zero production change; fails loud on drift. Risk: the userContext _builder_ (DB queries + formatting, ai-chat/index.ts:644-810) is ~165 lines to port faithfully.
- **(B) Export-from-source:** refactor `index.ts` to `export` the prompt builders so the harness imports them directly (single source of truth, no drift possible). Cleaner, but it's a (small, mechanical) production-file change — which this task scoped out ("no production changes").

Chosen: **(A)**, to honor the no-prod-change scope. The runner (built after the bake-off go-ahead) implements this with a fail-loud drift assertion before any cell runs.

---

## Holding here.

Frozen set (`scripts/fixtures/chat-eval-fixtures.json`) + rubric above are ready for your review. On approval I'll build the runner (per §3 + your §5 call), run all 3 candidates over the 15 fixtures, and produce `docs/research/chat-bakeoff-2026-06.md` with a recommendation + cost delta.

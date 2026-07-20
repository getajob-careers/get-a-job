# CV Pass-2 Fan-Out — proposal (held, no code)

Date: 2026-07-20. Investigation only, no code changes. Goal: cut the ~31s Pass-2 authoring call (the whole speed tail; the model is the floor at ~53 tok/s, see `cv-generation-speed-investigation.md`) by decomposing one big serial authoring call into parallel per-section calls, assembled server-side — keeping Sonnet 4.6 quality.

**Verdict up front: fan-out predicts ~10–11s p50 at Sonnet quality (below the 15s bar).** If the coordination holds, it dominates the model-swap path on both speed and quality. Grounded in a measured per-role call (~3.5s for 4 bullets) and the measured full-call decode (~53 tok/s).

## a. Dependency graph — what couples sections

I traced the Pass-2 system prompt (pulled from a real Langfuse trace). Result:

- **Strictly per-role / per-section (parallelizable):** each experience role's bullets (rule 35 "five source bullets in → five out" is per-role), anti-fabrication (each bullet grounded in its OWN role source, line 507), proper-noun grounding (line 146), number-carry (line 507). Projects and education-coursework are per-item JD-relevance scoring. Skills is a single global aggregation. `fit_analysis` is whole-profile-vs-JD (one computation).
- **About Me:** needs global profile + JD + target role/company — but NOT the authored bullets (it summarizes the user's raw experience, not the tailored output). So it can run in parallel with the role calls if given the profile summary + JD.
- **The ONE genuine cross-CV coupling:** the **tailoring-keyword distribution** — "at least 6 of the must_include_phrases appear ACROSS THE CV, distributed across PROFESSIONAL bullets, Skills, and About Me" (line 169), enforced by a global self-count before the model finalizes JSON (line 495). Parallel calls can't run that global count. This is the only thing that blocks naive per-role fan-out.

Confirmed: nothing else couples roles to each other. Rule 35 is per-role already.

## b. Fan-out architecture

**Phase 0 (sequential prereq).** Input reads ‖ Pass-1 JD-keyword extraction (these two are independent and should overlap — currently sequential). Output: `must_include_phrases`, `action_verbs`, `domain_terms`, and a slim JD-requirements block.

**Orchestrator step (deterministic, server-side, no LLM).** Distribute the ~10 `must_include_phrases` across the parallel calls up front (role 1 → phrases {a,b}, skills → {c,d}, About Me → {e,f}, …). This **replaces the model's global self-count with pre-assignment**, so the 6-across-CV target is satisfied by construction — dissolving the only cross-CV coupling.

**Phase 1 (parallel fan-out).** Concurrent calls, each with SLIM context (its own need only):

- N calls — one per experience role → `{bullets}`. Context: bullet+anti-fab rules (~1.5k) + JD reqs/keywords (~1k) + that role's source responsibilities (~0.5k) + its assigned phrases. ≈ 3k input.
- 1 call — About Me. Context: profile summary + JD + role titles + assigned phrases.
- 1 call — Skills selection (profile skills ∩ JD skills + assigned phrases).
- `fit_analysis`, projects, education-coursework — **deterministic server-side** (skill-overlap %, JD-relevance scoring); no LLM needed (they're scoring, not authoring). Removes them from the critical path entirely.

**Phase 2 (sequential remainder).** Server-side **assembly** (place each role's `{bullets}` directly into its bucket — this REPLACES the index-reconcile step, which becomes unnecessary since each role is now its own addressable call) → per-role anti-fab/number-carry validation → page-fit → PDF → storage → persist.

**Slim context is load-bearing for cost.** Do NOT duplicate the full 17k prompt per call (that would be 6×17k = 102k input, ~6× cost). Slimming each call to ~3k keeps total input ≈ 18k — flat vs today's 17k. The shared rule blocks (~1.5k × 6 = 9k) are the only duplication; a later Anthropic prompt-cache of the shared rules would remove even that.

## c. Predicted wall-time + cost (predict before building)

Grounded numbers: full call = ~1640 out tok @ ~53 tok/s ≈ 31s (measured). Slim per-role call = **~3.5s measured** (125 out tok, ~1.5s fixed overhead + decode). Heavier role (6 bullets ≈ 180 tok) ≈ ~4.5s; About Me (~150 tok) ≈ ~4s.

| segment                            | today                 | fan-out                              |
| ---------------------------------- | --------------------- | ------------------------------------ |
| Phase 0 (reads + pass1)            | 3.3s sequential       | ~2.0s (overlapped)                   |
| Pass-2 authoring                   | 31s (one serial call) | **~5s** = max() of ~6 parallel calls |
| assembly + PDF + storage + persist | ~4s                   | ~3s (reconcile → direct assembly)    |
| **total p50**                      | **~39s**              | **~10–11s**                          |

**Which fixed overhead parallelizes:** reads ‖ pass1 saves ~1.3s; `fit_analysis`/projects/education move off the LLM path; the rest (PDF 0.7s, storage 1.2s, persist 1s) stays sequential-after. So ~5s fixed remains + ~5s parallel authoring ≈ ~10s.

**Cost per CV (Sonnet ~$3/M in, ~$15/M out):** today ≈ 17k×$3/M + 1640×$15/M ≈ **$0.076**. Fan-out slim ≈ 18k in + 1640 out (same total output) ≈ **$0.079** — **roughly neutral** (slight input bump from shared-rule duplication; prompt-caching the rules would make it cheaper than today). The naive full-context-duplication alternative would be ~$0.30 (4×) — explicitly avoided by slimming.

## d. Risks + how the harness/number-gate verify a fan-out CV

- **Cross-section tone/coherence.** Separate calls can drift in voice. Mitigation: identical `CV_VOICE_RULES` in every call (deterministic); About Me is the main watch. Low-moderate risk; caught by Eli's before/after eyeball + a tone spot-check in the eval.
- **Dedup across roles.** Parallel roles can't see each other → phrase repetition. Mitigation: the phrase pre-assignment (each role gets DISTINCT phrases) plus a server-side dedup pass post-assembly (partial logic exists).
- **Keyword distribution.** Handled by pre-assignment (§b). Fallback: post-assembly coverage count + a single targeted section retry (adapts the existing Pass-3, which currently never fires).
- **Edge concurrency / rate limits.** ~6 concurrent Anthropic calls per generation. Fine for pilot volume; Deno edge handles parallel fetch. At scale, watch Anthropic RPM/TPM — stagger or batch if throttled. This is the main scale risk.
- **Partial failure / retry policy.** Retry only the FAILED sub-call (not the whole CV); on final failure, fall back to that role's source bullets verbatim (deterministic — honors the never-drop principle). A fan-out CV never fully fails on one bad sub-call — strictly more robust than today's single-call all-or-nothing.
- **Harness + number-carry gate.** The speed harness measures the orchestration wall (max of parallel + sequential remainder) — same before/after p50 discipline. The number-carry / anti-fab gate runs at TWO levels: per sub-call (each role's numbers/tools preserved vs its own source) AND on the assembled CV (every source number present; index-validity is now trivially satisfied because each role is its own call — no cross-bucket index migration possible). The eval verifies: per-role number-carry, whole-CV keyword coverage ≥ target, zero dropped experiences, tone consistency.

## Recommendation

Fan-out predicts **~10–11s at Sonnet quality** — it clears the 15s bar and likely retires the model-swap path (no quality tradeoff). But it is a **larger build** than a model swap: an orchestrator, a slim-context prompt split per section, phrase pre-assignment, server-side assembly replacing index-reconcile, and per-sub-call retry/fallback. The coordination risk (tone, dedup, keyword distribution) is real but bounded by the mitigations above. Recommend greenlighting a **spike**: build the orchestrator + role/About-Me/Skills split behind a flag, measure the real fan-out p50 on the harness, and run the number-carry + keyword-coverage eval before committing — predict-then-verify, same as this arc.

## e. Cheap model ladder (backup data) — BLOCKED on keys

Requested rows (gemini-3.5-flash, gpt-5.4-mini, gpt-5.5 decode on the real payload) need OpenAI + Google keys, or one OpenRouter key covering all three. None are available locally and the Anthropic key was deleted per ruling. Haiku excluded per the June proof-signals elimination. **Provide an OpenRouter key (scratchpad file, same handling) and I'll return the three decode times as backup data.** Measured so far, for reference: gpt-4o 6.8s · claude-opus-4-8 24s · sonnet-4-6 (current) 32s · sonnet-5 43s (hit max_tokens) · haiku-4.5 17s (excluded).

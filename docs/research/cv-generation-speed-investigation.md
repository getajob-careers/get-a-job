# CV Generation Speed — Investigation (held, no fixes)

Date: 2026-07-19. Scope: investigation only, no code changes, no PRs. Target: `generate-tailored-cv` (deepest-engagement feature; users watch a spinner ~40s+). Standing SPEED GUARD applies to everything downstream: no fix ships that slows the warm path, measured before/after.

## 1. Baseline (scrubbed, live `function_metrics`)

Latency is identity-independent (the function does the same work regardless of caller), so the time budget uses all successful calls; usage/demand figures use the real-user scrub.

| Window   | n (ok) | real-user n | p50       | p90   | max   | model(s)            |
| -------- | ------ | ----------- | --------- | ----- | ----- | ------------------- |
| last 14d | 17     | **0**       | **42.4s** | 46.2s | 49.8s | claude-sonnet-4-6   |
| 15–60d   | 363    | 167         | 30.1s     | 38.5s | 59.9s | sonnet-4-6 + gpt-4o |

**Is 50s still reality?** It got _worse_, not better. p50 is ~42s in the last 14 days vs ~30s in the prior window; ~50s is the p90/max. Caveat: the 14-day sample is all internal (real-user n=0 — the feature's discoverability problem is known, so recent traffic is internal testing). The representative real-user figure is the sonnet 75-day p50 below.

**The decisive split — by model (75d, ok):**

| model             | n   | p50       | p90   | avg out tok | ms / out tok |
| ----------------- | --- | --------- | ----- | ----------- | ------------ |
| claude-sonnet-4-6 | 335 | **31.2s** | 40.0s | 1599        | ~20          |
| gpt-4o            | 85  | **15.8s** | 24.6s | 1176        | ~15          |

The June-10 migration to Sonnet (now the prod default via `cv_model:'sonnet'`) **roughly doubled p50 latency** (31s vs 16s). Sonnet decodes slower per token _and_ emits more output. Latency is **output-decode-bound** (avg latency ≈ out-tokens × ms/tok). Sonnet was chosen for quality (bake-off `docs/research/cv-bakeoff-2026-06.md`: 21/21 index-validity vs gpt-4o 13/21), so the speed arc is fundamentally a quality-vs-latency tradeoff, not a bug.

## 2. Anatomy / time budget

Full source map in `generate-tailored-cv/index.ts` (2954 lines). Steady state (English CV, JD present, no retry) = **2 sequential blocking LLM calls** plus a large tail of non-LLM in-function work.

> **CORRECTION (2026-07-19, measured — supersedes the reconstruction below).** With Langfuse access + a live harness, the earlier "output-decode-bound, Pass 2 ≈ 32s" reconstruction is **WRONG**. Measured reality:

**Measured per-pass (Langfuse, live harness runs + trace history):**

| LLM call                                | model                          | in / out tok    | measured duration                                            |
| --------------------------------------- | ------------------------------ | --------------- | ------------------------------------------------------------ |
| Pass 1 — JD keywords                    | gpt-4o                         | ~343 / ~190     | **~2.5s** (median 2.8s)                                      |
| Pass 2 — CV authoring                   | claude-sonnet-4.6 (OpenRouter) | ~17–19k / ~1630 | **~1.6–5.7s** (median 2.3s, max 8.0s)                        |
| Pass 3 — coverage retry                 | same                           | —               | **never fired** (pass-2/pass-1 trace ratio = 1.000 over 45d) |
| v4 stage-3 (`extract-job-requirements`) | gpt-4o                         | —               | one-time per app; 401'd in harness (fast)                    |

**Total LLM ≈ 5s median.** Meanwhile the **edge platform's own `execution_time_ms` = 39.2s** and the harness client wall-clock p50 = **39.3s** (warm, disposable account, sonnet; 5 runs 37–46s). Two independent sources (edge platform + Langfuse) agree:

**PINNED (2026-07-19, `debug_timing` phase instrumentation, PR #630 deployed v158).** A flag-gated per-phase timing pass on the live function localized the tail exactly. Median per-phase deltas (warm, Sonnet, `module_age_ms=6` → not cold-start):

| phase                                                        | Δ (Sonnet/OpenRouter) | Δ (gpt-4o/OpenAI control) |
| ------------------------------------------------------------ | --------------------- | ------------------------- |
| input reads (auth+parse+ratelimit+4 profile reads)           | 1.4s                  | 1.0s                      |
| grounding                                                    | 0.5s                  | 0.5s                      |
| Pass 1 (gpt-4o keywords)                                     | 1.9s                  | 2.8s                      |
| **Pass 2 call bracket**                                      | **31.0s**             | **6.8s**                  |
| retry / reconcile / guards / anti-fab / page-fit / translate | ≤2ms each             | ≤2ms each                 |
| PDF (font-subset 9ms + layout 0.66s + save 38ms)             | 0.7s                  | 0.5s                      |
| storage upload + signed URL                                  | 1.2s                  | 1.3s                      |
| DB persist + dedup                                           | 1.0s                  | 1.6s                      |
| **total**                                                    | **~39s**              | **~15s**                  |

**The entire tail is one line: the Pass-2 call. It is NOT post-processing and NOT non-LLM** (my intermediate "~34s non-LLM" reading was wrong too). Everything after Pass 2 — reconcile, anti-fab, page-fit — is sub-millisecond; PDF 0.7s; storage+persist ~2s.

> **FINAL FINDING (2026-07-20, direct-Anthropic replay — supersedes the "transport" reading below).** The Pass-2 bracket is 31s on OpenRouter Sonnet AND **~32s on direct Anthropic** (same model `claude-sonnet-4-6`, same real prompt, no OpenRouter). So the ~24s is **the MODEL, not the transport.** My earlier gpt-4o comparison (6.8s) confounded model-speed with transport — gpt-4o is a _faster model_ (~173 tok/s), not merely a different path. Sonnet 4.6 is genuinely ~53 tok/s, so ~1640 output tokens ≈ 30s of real decode. Model-speed ladder on the same prompt: gpt-4o 6.8s · haiku-4.5 17s · opus-4.8 24s · **sonnet-4.6 (current) 32s** · sonnet-5 43s. Neither a transport swap (direct Anthropic) nor provider pinning can move it — both were closed (PRs #633/#634). Langfuse's "~5s" was OpenRouter's proxy sending early 200 headers while the model generated; the total is decode time regardless of path.

**Why Langfuse under-reported it:** the OpenRouter wrapper stamps the trace `endTime` the instant `fetch()` resolves (headers), so the ~5s traces are **time-to-headers**, not the 31s call. The `pass2_headers`/`pass2_body` marks (PR #633) split the bracket at that boundary to attribute the 24s to hidden-retry (A) vs trickled-body (B) — provisional verdict **B (slow transport, headers-early)** from the tight run-to-run consistency (random retry failures would scatter latency; every run is 37–47s). Definitive A-vs-B pending a standalone OpenRouter measurement or the deployed marks.

**Sampling caveat:** Langfuse holds only ~12 trace pairs over 45d vs 455 `function_metrics` rows (sampled/lossy) — fine for per-call anatomy, not population rates. The phase table is from the live `debug_timing` harness (not sampled).

The reconstructed table that follows is retained struck-through for provenance; **do not use it for planning.**

<details><summary>Superseded reconstruction (WRONG — do not plan against this)</summary>

Pass 2 authoring output-decode was assumed the overwhelming cost (~1600 Sonnet tokens × ~20ms ≈ 32s). This was inferred from token counts × per-token latency and validated only against the total — which happened to match by coincidence (the total is real, but it's non-LLM, not decode). The live trace disproved it.

</details>

## 3. Structural questions

- **Sequential vs parallelizable.** The LLM chain Pass 1 → Pass 2 → Pass 3 is inherently sequential (each needs the prior's output; Pass 3 needs Pass 2's coverage score, so it can't be pre-launched). Genuine parallelization wins are small: Pass 1 could overlap the profile/experience reads (~1–3s); storage-upload and signed-URL, and the two independent DB writes, could overlap (~sub-second). None move the needle much because the needle is Pass 2 decode.
- **Recomputed / cacheable.** Pass 1 JD-keyword extraction is deterministic (temp 0) yet re-run every regeneration against the same JD — cacheable by JD hash. Role-library match is a pure function of target_role — cacheable. The large static system prefix (`TRUTHFULNESS_RULES`, `CV_VOICE_RULES`, `STRUCTURE_RULES`, `TAILORING_RULES`, `OPTION_A_OVERLAY`, lines 1091–1414) is byte-identical across all calls but `pass2Payload` sets **no `cache_control` breakpoints** — Anthropic prompt caching is unused. (Caveat: caching cuts _input prefill_, ~a few seconds; it does not cut the decode-bound majority.)
- **Master rebuild is ms — confirmed, but not on this path.** `buildMasterCvData` (`cv-master.ts:217–345`) is pure synchronous compute — no await, no DB, no LLM, sub-ms. But the **tailored path does not call it** (only master-mode + `refine-cv` do). The tailored path lets the LLM author buckets, then reconciles by index. So "the deterministic master rebuild should be ms" is true and confirmed, but it does not describe the 42s path.
- **Monolith?** Pass 2 is **one monolithic JSON call** producing the entire CV (all four experience buckets + About + skills + fit), non-streaming, max_tokens 4096. It is the natural target for streaming (perceived latency) or bucket-level chunking (parallel authoring).
- **Model over-provisioning?** Pass 1 (structured keyword extraction) runs on gpt-4o — over-provisioned; a mini/haiku would suffice (`refine-cv` already exposes those tiers). Pass 2 on Sonnet is the one call the bake-off justifies, but it is 2× the wall-clock of gpt-4o.

## 4. Title-mislabel bug — diagnosis (NOT a generation bug)

**Status (2026-07-19): CLOSED as unreproducible, with a watch note.** Reclassified from "confirmed generation bug" to "no current-path bug; likely stale artifact from the pre-#234 join." Reopen only if a concrete failing artifact surfaces (see close-the-loop below).

Two independent traces (live-data sweep + full code trace) converge:

- **Stored output is clean: 120/120 persisted CVs (40 master + 80 tailored), all four buckets, ZERO within-CV duplicate title+company pairs.** The exact reported Guardio case (`Customer Success Specialist – VIP Team`, users `1e6b3862` / `4b243f3a`) stores and renders distinct titles; the genuine same-company/different-title shape (Heseg Tzair: "Volunteer Educator & Mentor" vs "Program Coordinator & Team Lead") renders correctly in separate buckets.
- **Every layer stamps title AND company from the same per-row object**, so a collapse is architecturally impossible: reconcile join `reconcile.ts:338–360` (title and org from the same `src[i]`), master builder `cv-master.ts:228–237`, value-keyed translate `cv-translate.ts:36–46` (whole-string keys, Hebrew-only, English titles untouched), client adapter `cvDataAdapter.js:45–69` (1:1, unique React keys), PDF `build-pdf.ts:931–942` (fresh `entry` per iteration, per-bucket org key, no `[0]`).
- **The LLM never authors titles on the tailored path** — it is instructed to emit only `{index, bullets}` (`index.ts:1498, 1554`) — so the "model collapses titles" hypothesis is impossible too.

**Root cause of the _report_:** not the deployed generation path. `reconcile.ts:18–21` documents a **historical date-keyed join (replaced by PR #234)** that _did_ collapse a same-company past+current pair — that old bug matches the described symptom exactly. So the observed artifact is most likely (1) a **stale cached PDF / browser-cached Studio render** from before the June reconcile rewrite, or (2) a **local render on the unmerged `eli/cv-studio-writethrough` branch** (new Studio write-through/reorder code, unshipped). **To close:** capture the failing artifact — the `application_cvs.id` or the downloaded PDF, and whether it was seen in a downloaded PDF, the Studio preview, or a local dev build. That one fact discriminates the two, and neither points back at `generate-tailored-cv`.

## 5. Re-ranked levers (measured — the tail is the model, not the transport)

Both transport PRs were **closed** (#633 direct-Anthropic, #634 provider pinning): direct Anthropic runs Sonnet 4.6 at ~32s, same as OpenRouter, so bypassing OpenRouter changes nothing. The real levers are model-speed and output-length — and both carry a quality/product tradeoff. Nothing is a free transport win.

| #     | Lever                                                                           | Est. saving                                                              | Risk                                                                                             | Status                                                                      |
| ----- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **A** | **Faster model for Pass 2** — Haiku 4.5 (17s, ~2×) or gpt-4o (6.8s, ~5×)        | Haiku total ~24s; gpt-4o ~15s                                            | **High** — quality; the bake-off rejected gpt-4o (13/21 index-validity). Needs a bake-off re-run | Open — eval-gated                                                           |
| **B** | **Shorter Pass-2 output** (fewer/tighter bullets)                               | modest w/o dropping content (~10–15%); large only if bullets are dropped | Med-High — **collides with the never-drop principle**; dropping bullets is a product decision    | Investigation held (§7)                                                     |
| C     | `extract-job-requirements` 401 (grounding correctness, not latency)             | 0 latency                                                                | separate                                                                                         | **Fixed — PR #632**, standalone, + stage-3 `function_metrics` observability |
| —     | _Dominated:_ prompt-cache ~0s, Pass-1 downgrade ~1–2s, streaming perceived-only | —                                                                        | —                                                                                                | Streaming remains a future perceived-latency candidate                      |

## 6. What was closed and why

- **#633 / #634 closed** — the transport hypothesis was disproven by direct-Anthropic measurement. The model (Sonnet 4.6, ~53 tok/s) is the floor; no transport or provider route beats Anthropic's own endpoint.
- **#630 (debug_timing) merged/deployed** — the diagnostic that pinned the tail; kept as measurement infra.
- **#632 (stage-3 401 fix)** — real correctness bug (stage-3 grounding 401'd since 2026-05-26), standalone against main.

## 7. Output-trim investigation (held proposal)

Token census (12 recent tailored CVs, tokens ≈ chars/4, total ≈ 1628 — validates the ~1640 measured): professional_experiences 689 (42%) · secondary experience buckets 284 (17%) · skills 157 · about_me 154 · fit_analysis 87 · education 73 · misc 80. **Bullets dominate: ~17.7 bullets × 159 chars; professional roles average ~6 bullets each.**

**Key constraint:** the system prompt (rule 35) mandates _"Preserve every bullet from the source responsibilities... five source bullets in → five bullets out."_ So bullet count is the **user's own content, preserved by design** (CV Excellence Arc never-drop principle) — not model padding. A standalone "max 3 bullets" addendum was largely ignored (4→4). Therefore:

- **Cutting bullet count = dropping user content = a product decision**, not a free trim. Only this yields a large win (~820 tok → ~24s total).
- **Content-preserving trims** (tighten long bullets toward the 14–22 word target while keeping every number/tool verbatim per anti-fab; move the non-rendered `fit_analysis` out of the authoring call) save only ~10–15% → ~28–30s.
- Honest prediction: even aggressive content-preserving trim reaches only ~28–30s (from 39s); the model floor + fixed ~8s non-Pass-2 overhead cap it. **The meaningful speed win is a faster model (lever A), not trim.**

Proposal deferred to Eli's judgment as a product call (shorter CVs vs preserve-everything), with side-by-side before/after CV pairs to be generated on request.

**SPEED GUARD baseline (this arc):** warm p50 **39.3s** (Sonnet) / **15.1s** (gpt-4o). Harness = `scripts/cv-speed-harness.mjs`. No fix ships that regresses the warm path, measured before/after.

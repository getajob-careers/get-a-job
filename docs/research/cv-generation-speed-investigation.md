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

Full source map in `generate-tailored-cv/index.ts` (2954 lines). Steady state (English CV, JD present, no retry) = **2 sequential blocking LLM calls**; everything else is sub-second deterministic compute.

| Stage                                                              | Lines             | Type                                             | Est. share of p50          |
| ------------------------------------------------------------------ | ----------------- | ------------------------------------------------ | -------------------------- |
| Auth + body parse + rate-limit + 4 profile reads (`Promise.all`)   | 306–438           | DB/compute                                       | ~1–2s                      |
| v4 grounding stage-3 (`extract-job-requirements` LLM)              | 621               | LLM, **first CV per app only**, then cached      | 0 warm / ~5–10s cold       |
| **Pass 1 — JD keyword extraction (gpt-4o, ~600 out tok)**          | def 143, call 666 | **LLM, sequential**                              | **~3–5s**                  |
| Story scoring, bucketing, role-lib match, giant prompt build       | 729–1565          | pure compute                                     | ~1s                        |
| **Pass 2 — CV authoring (sonnet/gpt-4o, ~1600 out tok, 4096 max)** | 1632–1644         | **LLM, dominant**                                | **~30–35s**                |
| **Pass 3 — coverage retry (same model)**                           | 1733–1745         | **LLM, conditional, strictly after Pass 2**      | +~15–25s **when it fires** |
| reconcile → guards → anti-fab → page-trim                          | 1826–2636         | pure compute (deterministic)                     | ~1–2s                      |
| Translation to English (gpt-4o)                                    | 2680–2693         | LLM, **gated on Hebrew — no-op for English CVs** | 0 for most                 |
| PDF render (`buildCvPdf`, fonts inlined, no network)               | 2738              | pure CPU                                         | ~1s                        |
| Storage upload + signed URL + DB persist                           | 2749–2888         | Storage/DB                                       | ~1s                        |

**Budget headline:** Pass 2 authoring output-decode is the overwhelming cost (~1600 Sonnet tokens × ~20ms ≈ 32s, which alone ≈ the measured p50). Pass 1 adds a few seconds. Pass 3 roughly adds half-a-Pass-2 when it fires. Everything non-LLM is deterministic and sub-second.

**Method note (honesty):** Langfuse holds per-call traces but I had no Langfuse API credentials in this environment, and I did not run a live generation (it would mutate a real account and spend LLM budget during an investigation-only phase). The per-pass split above is **reconstructed** from measured token counts (`function_metrics`) × measured per-token latency (the model-split table), and **validated against the measured total** (Pass-2 estimate ≈ measured p50). The exact split can be confirmed in the fix phase by (a) pasting a Langfuse trace / granting API keys, or (b) one instrumented run on a disposable account reading the timestamped boundary logs (`[CV] JD keywords extracted` @672 → `[CV] Retry firing/skipped` @1711/1782 → response).

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

## 5. Ranked speed opportunities (est. savings / risk)

Ordered by (grounded win × inverse risk). All estimates are on the sonnet p50 ~31s real-user baseline.

| #   | Lever                                                                                                                 | Est. saving                    | Risk                         | Notes                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Anthropic prompt-cache the static Sonnet system prefix** (`cache_control` breakpoints on the invariant rules block) | ~2–4s + cost                   | **Low** — identical output   | Pure win; only cuts prefill (decode still dominates), but zero quality risk. Ship first.                                                                                                                                     |
| 2   | **Downgrade Pass 1 to gpt-4o-mini/haiku + overlap it with the profile reads**                                         | ~3–5s                          | **Low**                      | Structured extraction; `refine-cv` already uses cheap tiers. Eval Pass-1 keyword parity.                                                                                                                                     |
| 3   | **Stream Pass 2 to the client** (flag-gated per the #156 lesson)                                                      | 0 actual / **large perceived** | Medium — client rework       | Doesn't cut total, but turns a 40s blank spinner into a progressively-building CV. High UX value.                                                                                                                            |
| 4   | **Cut Pass 2 output tokens** (tighter bullet caps / shorter About) — decode-bound, so linear                          | ~6s per 20% output cut         | Medium — coverage/quality    | Needs the eval set as a gate (byte-comparable-or-better). Biggest _actual_-latency lever after model.                                                                                                                        |
| 5   | **Eliminate the Pass-3 second authoring** (raise initial coverage target / fold into one call)                        | ~15–25s **when it fires**      | Medium — coverage regression | Firing rate unmeasured (needs per-call logs); p90/p50 gap suggests it's not the common case. Measure firing rate first.                                                                                                      |
| 6   | **Revisit Sonnet→gpt-4o for Pass 2** (gpt-4o is 2× faster)                                                            | **~15s (halve it)**            | **High** — quality           | The bake-off rejected gpt-4o (13/21 index-validity); the reconcile layer already validates indices deterministically, so a re-run eval _might_ clear gpt-4o + guardrails. Highest potential, highest risk — eval-gated only. |

## 6. Recommended fix sequence

1. **Prompt caching (lever 1)** — pure win, no eval needed, ship first; establishes the before/after measurement harness the SPEED GUARD requires.
2. **Pass 1 downgrade + parallelize (lever 2)** — low risk, small measured win, validates the eval-gate workflow.
3. **Streaming Pass 2 (lever 3)** — the biggest _felt_ improvement for the least quality risk; flag-gated.
4. **Output-token reduction (lever 4)** — eval-gated; first actual-latency cut of consequence.
5. **Pass-3 + model revisit (levers 5–6)** — measure Pass-3 firing rate, then decide; the gpt-4o revisit only behind a clean bake-off re-run.

Before any of the above: stand up the before/after latency harness (the model-split query in §1 is the template) so every change is measured on the warm path per the SPEED GUARD. No fix ships that regresses it.

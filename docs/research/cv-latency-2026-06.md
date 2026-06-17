# generate-tailored-cv latency — investigation (HOLD, read-only)

Investigation only. No code changed, no deploy. Branch `eli/cv-latency-investigation`.
Live `function_metrics` queried read-only (prod `ilmqmodklutztuybsvwd`).

**Live baseline (14d, 36 ok calls):** avg **33.5s**, p50 **37.7s**, p95 **44.4s**, max **46.7s**.
tokens_in avg **15.6k** / p95 18.3k · tokens_out avg **1.74k** / p95 2.07k / **max 2.09k**.
The "~40s / today 45s" the user sees is the p50–p95 band; max (46.7s) brushes the **45s AbortSignal
timeout** — a slow decode is a reliability cliff, not just slow.

---

## 1. The authoring call

- **One Sonnet 4.6 call that emits the ENTIRE structured CV**, all sections — not just tailored parts
  (`index.ts:1497-1533`, slug `anthropic/claude-sonnet-4.6`). `max_tokens: 4096`, `temperature: 0.2`,
  `response_format: json_object`. **Blocking — no `stream` key.** Per-attempt `AbortSignal.timeout(45000)`.
- **Model emits:** header, summary, professional/military/volunteering/leadership **bullets**, education,
  skills, languages, honors_and_awards, certifications, projects, fit_analysis.
- **Server stamps/overrides (model output discarded or fixed):** experience `title/company/dates` by
  `index` (`fillFromSource`, reconcile), education `institution`+dates (confabulation guard
  `index.ts:1799-1900`), honors dedupe. So a meaningful share of what the model emits is **either
  overwritten server-side or a deterministic profile copy** — paid for in output tokens anyway.
- `max_tokens: 4096` is a ceiling, not a target: output stops at EOS (~1.74k). **Lowering it saves no
  latency** (flagged to preempt the wrong fix).

## 2. Prompt size (~15.6k tokens_in)

**The big libraries are NOT dumped into the prompt.** All four are imported (`index.ts:15-18`) — whole-file
~1.4MB (~350k tokens if dumped) — but used **server-side for matching/stamping**. Only a **role-scoped
slice** reaches the prompt via `LIBRARY_CONTEXT` (`index.ts:1210-1223`): 1 matched role def + 1 mapping +
~8–20 relevant skills + a few proof signals ≈ **0.8–2k tokens**. Collapses to one sentence when no match.

Ranked contributors (chars/4 estimates; data blocks vary per user):

| Rank | Block                                                                                                                                                                 | ~tokens   | Trimmable w/o quality loss?                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| 1    | **`userContext` JSON** — profile + up to 15 experiences (responsibilities ≤4000 ch each) + **20 raw proof_signals** + top-8 JD-matched stories + projects + education | ~3–7k     | mostly **load-bearing**; proof_signals trimmable ~0.2–0.5k |
| 2    | OUTPUT SCHEMA + output rules (`1385-1463`)                                                                                                                            | ~1.9k     | ~0.5–0.7k (prose-in-JSON, redundant w/ rules)              |
| 3    | STRUCTURE_RULES (+ ABOUT_ME_RULES)                                                                                                                                    | ~1.86k    | ~0.3–0.5k                                                  |
| 4    | TAILORING_RULES                                                                                                                                                       | ~1.4k     | ~0.3–0.4k                                                  |
| 5    | CV_VOICE_RULES                                                                                                                                                        | ~1.03k    | ~0.2k                                                      |
| 6    | TRUTHFULNESS_RULES                                                                                                                                                    | ~0.94k    | **load-bearing** (anti-fab core)                           |
| 7    | JD text (`safeJobDescription`, cap 10k ch)                                                                                                                            | ~0.6–2.5k | **load-bearing** (already capped)                          |
| 8    | OPTION_A_OVERLAY (sonnet-only)                                                                                                                                        | ~0.72k    | ~0.2k                                                      |
| 9    | LIBRARY_CONTEXT role slice                                                                                                                                            | ~0.8–2k   | partial                                                    |
| 10   | keyword block (filled)                                                                                                                                                | ~0.5–0.7k | load-bearing                                               |

Safe input trim total ≈ **1.7–2.7k tokens (11–17%)**: de-dup the anti-fab/verbatim rule (restated ~5×),
tighten schema prose, drop `JSON.stringify(…, null, 2)` indentation, trim raw proof_signals.
**Caveat: input trim is mostly a COST + quality-margin lever, not a latency lever** — prefill is fast vs
decode (see §4–5). Worth doing, but it won't move the 33s much.

## 3. JD-extract

- **Yes — a separate inline gpt-4o call still runs.** `extractJDKeywords` (`index.ts:129-228`,
  `max_tokens 600`, temp 0, own 20s timeout), gated on `safeJobDescription && OPENAI_API_KEY`
  (`index.ts:598`) → fires on essentially every CV (JD always present). **Sequential, `await`ed before**
  the Sonnet authoring call; it's a **hard data dependency** (feeds the keyword block). ~**2–4s**.
  But it only needs the JD, so it **can overlap the profile/experiences/stories DB fetches** (it doesn't
  today). See Lever 2.
- **`extract-job-requirements` edge function (`index.ts:554`) is NOT in the hot path.** It's Stage 3 of a
  3-stage grounding chain, gated on `application_id` + no `req_snapshot` + no `jobs` match + JD≥200 ch, and
  it **persists `req_snapshot`** so it fires **at most once per application, ever**. That fully explains the
  **0 calls in 14d** — existing apps already have snapshots. ~5–10s, but amortized once; ignore for steady state.

## 4. Routing

- **OpenRouter, not direct Anthropic** (`openrouter-chat.ts`, `https://openrouter.ai/api/v1/...`) — two hops
  (edge → OpenRouter → Anthropic). **Blocking**, retries=3 exp-backoff, per-attempt 45s timeout.
- OpenRouter proxy overhead ≈ **50–300ms** — **negligible** vs the ~33s. The dominant cost is the
  **blocking, non-streamed ~1.74k-token decode**, fully serialized. Switching transport saves nothing
  meaningful; OpenRouter is also what gives the no-redeploy model flag, so keep it.
- **Streaming would help perceived latency + kill the 45s-timeout cliff, but NOT wall-clock for THIS flow:**
  the function must assemble the _full_ JSON before it can render the PDF, so there's no incremental win
  until/unless CV rendering becomes progressive (the future in-chat editing surface). Defer.

## 5. Main lever — author only the tailored sections, server-assemble the rest

If Sonnet authored **summary + professional_experiences bullets** (the JD-tailored core) and the server
assembled the deterministic sections from the profile:

- **(a) Output tokens removed:** header + education + languages + honors_and_awards + certifications + skills
  are deterministic copies or already server-overridden ≈ **20–30% of 1.74k = ~350–550 tokens**. Also
  offloading the non-JD-tailored military/volunteering/leadership bullets (prompt keeps these in authentic
  register, NOT tailored — `index.ts:1200`) pushes removal to **~40–50% (~700–850 tokens)**.
- **(b) Latency drop:** single call, decode ≈ linear in output tokens; fixed costs (TTFB, prefill, the
  ~2–4s gpt-4o pre-call, DB fetches, post-proc) don't scale with output. **25–30% cut → ~6–10s off;
  40–50% → ~10–15s off.** End-to-end **33.5s → ~24–28s** (conservative) or **~20–24s** (aggressive). Also
  pulls the tail off the 45s cliff (reliability win).
- **(c) Quality risk:** the prompt distributes JD keywords **across summary + skills + bullets as one unit**
  (`index.ts:1185,1199`), and the coverage-retry scoring (`index.ts:1581-1660`) measures must-include
  coverage over the whole `cvData`. **Deterministically assembling `skills` while the model authors the
  summary risks the summary citing tools the assembled skills list omits** → breaks keyword coverage.
  **So keep `skills` in the authored unit.** **Low-risk to offload:** header, education, languages,
  certifications (already server-overridden or verbatim copies — the education guard exists _because_ the
  model confabulates these). **Bake-off caveat:** the June 10–11 35/35 Sonnet quality was measured on the
  **current full-emit prompt**; splitting the author/assemble contract means those numbers **don't auto-carry
  — a re-bake is required** before trusting quality.

---

## Levers ranked by latency saved / risk

| Lever                                                                                                                                                  | Est. wall-clock saved          | Risk       | Notes                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L1. Section-split (conservative):** author summary+professional+skills+experience buckets; server-assemble header/education/languages/certifications | **~6–10s**                     | **MEDIUM** | the user's named lever, scoped to keep the keyword-coherent unit intact; **needs a re-bake**                                                       |
| **L2. Parallelize gpt-4o JD-extract with the DB fetches**                                                                                              | **~2–4s**                      | **LOW**    | pure reordering (extract only needs the JD); no quality change. Minor caveat: web-fallback JD path needs the application row first                 |
| **L3. Section-split (aggressive):** also offload mil/vol/lead + skills                                                                                 | ~10–15s                        | **HIGHER** | offloading those buckets means copying responsibilities verbatim (loses bullet rewriting); skills-offload breaks keyword coverage. Not recommended |
| **L4. Input prompt trim (~1.7–2.7k tok)**                                                                                                              | ~1–3s (mostly **cost**)        | LOW–MED    | de-dup anti-fab rules etc.; do it for cost, not latency. Preserve TRUTHFULNESS core                                                                |
| L5. Stream the Sonnet call                                                                                                                             | ~0 wall-clock (perceived only) | MED        | no benefit while output is a one-shot PDF; revisit with progressive/in-chat rendering                                                              |
| L6. Direct Anthropic vs OpenRouter                                                                                                                     | ~50–300ms                      | LOW        | negligible; loses the no-redeploy model flag. Skip                                                                                                 |
| L7. Lower max_tokens 4096→2.5k                                                                                                                         | **0**                          | —          | NOT a lever; decode stops at EOS                                                                                                                   |

## Lean

**L2 + L1-conservative, together.** L2 is a free ~2–4s at low risk (overlap the JD-extract with the profile/
experience/story fetches). L1-conservative offloads only the genuinely deterministic sections (header,
education, languages, certifications — already server-overridden/verbatim), keeping **summary + professional
bullets + skills + experience buckets** as the authored, keyword-coherent unit that carries the bake-off
quality. Combined estimate **~33.5s → ~22–26s (~8–14s saved)**, plus the tail pulled off the 45s timeout.

**Gate L1 on a re-bake** against the June 10–11 set before trusting quality — the author/assemble split
changes the prompt contract. Treat input-trim (L4) as a separate **cost** workstream, not a latency fix.
Defer streaming until CV rendering is progressive. Do not touch reconcile bullet-routing here.

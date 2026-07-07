---
title: Hebrew extractor — language-routed gpt-5.4-mini (scoping)
status: SIGNED (2026-07-07) — amended: Hebrew reprocess scoped to ACTIVE jobs (is_active=true)
owner: eli
last_reviewed: 2026-07-07
consumes: docs/research/role-library-coverage-gap.md
scope: SCOPING ONLY — paper, no code. Scoring Coverage Arc step 1 (Hebrew emission).
code_paths:
  - supabase/functions/extract-job-requirements/index.ts
  - supabase/functions/_shared/openai-chat.ts
---

# Hebrew extractor — language-routed gpt-5.4-mini (scoping)

> **What this is.** The paper scope for the **only validated** fix to the Hebrew multi-word
> descriptive-skill **emission** drop. It routes **Hebrew/mixed JDs to gpt-5.4-mini** and leaves
> **English on gpt-4o-mini unchanged**. **No code.** This is the build gate + the two guardrails +
> the reprocess/cost/rollback plan, so the eventual build PR is mechanical.
>
> **Why routed, not global:** English is a _different_ problem (resolution, not emission — §0), so an
> all-jobs 5.4 swap is explicitly rejected. This doc fixes Hebrew emission only; the English fix
> (alias/resolver consolidation) is scoped **next** (§8).

---

## 0. Evidence & decision (the bake-off closed the extractor-only lane)

Bake-off over the 14 gold Hebrew JDs (`getajob-eval/scripts/esco-hebrew-eval/bakeoff.py`, recovery =
recovered/gold judged by gpt-4o):

| Cond | prompt / structure           | model            | recovery    | fp  | reads                                               |
| ---- | ---------------------------- | ---------------- | ----------- | --- | --------------------------------------------------- |
| C1   | current mega-call            | gpt-4o-mini      | **5%**      | —   | baseline                                            |
| C5   | **isolated** skill-only call | gpt-4o-mini      | **15%**     | 8%  | call-isolation tripled it but stays low             |
| C4   | improved mega-call           | gpt-4o           | **5%** ≡ C1 | —   | a _stronger_ model with great Hebrew didn't move it |
| C3   | improved mega-call           | **gpt-5.4-mini** | **58%**     | 13% | the reasoning model is the only real lever          |

**Decision:** extractor-only levers are **exhausted** — C5's 15% doesn't justify a new call path, and
**C4 ≡ C1 proves it's model _reasoning_, not prompt/structure/comprehension**. The reasoning model
(gpt-5.4-mini) recovers Hebrew emission; nothing cheaper does.

**English is NOT an emission problem** (live DB, Eli 2026-07-07): English jobs average **4.5 unmapped
skills/job**, `coverage_ratio` **0.535**, and **1,747 of 4,224** English jobs have **5+ unmapped**
skills. C4 ≡ C1 corroborates: gpt-4o did not raise English recall either → English skills **are
emitted**, they die at **resolution** (`resolveSkill` / `SKILL_ALIASES`, `index.ts:118`), not at the
model. So a global 5.4 swap would **not** fix English and would multiply its cost for nothing.

## 1. Routing design — and the one correction to the brief

The brief says "5.4-mini for `jd_language in (he, iw, mixed)`". Two corrections:

- **`jd_language` is LLM-_emitted_** (schema field 41, parsed at `index.ts:843`; `JD_LANGUAGES = ['en',
'he', 'mixed']`, `:83`). It is only known **after** extraction → it **cannot route the call**
  (chicken-and-egg). The router must be a **deterministic pre-call Hebrew-script detector** on the JD
  body (Hebrew Unicode block ratio ≥ threshold → 5.4-mini; else 4o-mini). The emitted `jd_language`
  becomes a **post-hoc audit** (log detector-vs-emitted agreement, §6).
- **`iw`** is the legacy ISO-639 code for Hebrew; the schema only ever emits **`he` / `mixed`**. The
  detector keys on **script**, not the code, so `iw` is moot.

Call site to branch: **`index.ts:504–515`** — currently `model: MODEL` (`const MODEL = "gpt-4o-mini"`,
`:31`), `temperature: 0`, `max_tokens: 3000`. The routed branch picks model + reasoning params by the
detector's verdict.

## 2. Prerequisite — gpt-5 reasoning params in the shared wrapper

**`_shared/openai-chat.ts` has NO gpt-5 handling.** The extract call passes `temperature: 0` +
`max_tokens: 3000`, which **gpt-5.4-mini rejects** (it needs `max_completion_tokens`, default
temperature — see the retry logic in `bakeoff.py openai()`). **First build task:** extend the wrapper
to detect a `gpt-5*` model → drop `temperature`, send `max_completion_tokens` (≥ 8000 for reasoning
room). Nothing routed works until this lands.

## 3. The two guardrails (non-negotiable — C3's failure modes)

**(a) Padding kill** — C3 ran **13% fp** (memory finding: ~25% padding on an earlier variant).

1. A stricter anti-fabrication clause in the **5.4 prompt variant** (only-if-stated; a false skill is
   worse than a missed one — already present at `:256`, sharpen for reasoning models).
2. **Hard cap** the Hebrew path's emitted skills (current parse slices to **25** at `:576`/`:579` —
   tighten the routed path to ~15).
3. A **post-extraction fabrication filter**: drop any emitted skill not token-grounded in the JD body.

**(b) English-only skill labels** — C3 **leaked Hebrew-script labels**.

1. Explicit "emit every skill label in **English**" instruction in the 5.4 variant.
2. A **deterministic post-filter**: any `req_skills_*_raw` entry containing Hebrew Unicode → translate
   (cheap 4o-mini or the existing `cv-translate` path) or drop. **Acceptance: zero Hebrew-script labels.**

## 4. schema_version bump + Hebrew reprocess (ACTIVE Hebrew jobs only) — with the cost trap flagged

- Bump **`EXTRACTION_SCHEMA_VERSION` 4 → 5** (`:48`) to signal the contract change.
- **The trap:** the idempotency gate (`:1166–1169`) skips only when `extraction_schema_version ===
EXTRACTION_SCHEMA_VERSION`. A naive bump therefore **invalidates ALL rows** → the next pass
  re-extracts every English job too (on 4o-mini — identical output, wasted spend).
- **So scope the reprocess to ACTIVE Hebrew/mixed jobs ONLY** (amended 2026-07-07): a one-off targeted
  re-extract over the rows where `is_active = true` AND (the deterministic detector fires OR stored
  `jd_language ∈ {he, mixed}`), with `force=true`. **Closed/stale jobs are excluded** — they are never
  shown or scored, so re-extracting them is pure cost. English rows re-extract lazily on their next
  natural touch — no 5.4. **Do not lean on the global bump to drive the reprocess**; run a targeted
  job-id queue filtered by `is_active` + language (English skipped).

  ```sql
  -- confirm the reprocess count (drives the cost estimate in §5)
  select count(*) from jobs where is_active = true and jd_language in ('he','mixed');
  ```

## 5. Cost

- **gpt-5.4-mini**: $0.75/1M in, $4.50/1M out (`bakeoff.py PRICING`). Per extraction call ≈ 8–9k input
  tokens + reasoning-heavy output (`max_completion_tokens` up to 8000) → est **~$0.025–0.035/call** vs
  **~$0.002** for 4o-mini ⇒ **~6–13×** (memory cited ~6.4×). **Confirm the exact per-call from the COST
  section of `/tmp/c5-bakeoff.log`** (the run just printed it for gpt-5.4-mini).
- **One-off reprocess (ACTIVE Hebrew only, amended):** `N_active × ~$0.03/call`, where `N_active` is the
  §4 query — a **subset** of the ~1,350 total Hebrew rows (closed jobs excluded). Bounds: if active ≈
  40–60% of Hebrew, ≈ **$16–24** (down from the ~$40 all-Hebrew figure); hard ceiling ~$40 only if every
  Hebrew job is active. **Confirm `N_active` before the run.**
- **Ongoing delta:** only Hebrew/mixed nightly jobs route to 5.4. If ~20–25% of nightly ingest is
  Hebrew-body, the _extraction line_ for that slice rises ~6–13×; blended extraction cost rises roughly
  `share × (mult−1)` ≈ **+1.3× to +2.6× on the extraction line only** (small in absolute pipeline terms).
  State assumptions in the build PR; confirm the Hebrew-body share from the DB.

## 6. Acceptance criteria (the build's gate)

- **Eval re-run** (add the routed 5.4 path as a condition in `bakeoff.py` over the 14 gold Hebrew JDs):
  **recovery ≥ 50%** (vs 5% baseline; C3 was 58%) **AND fp_rate ≤ 8%** (vs C3's 13%) **AND zero
  Hebrew-script skill labels**.
- **No English regression:** a spot re-extract of N English jobs shows unchanged skill emission (they
  still route to 4o-mini).
- **Router precision:** deterministic detector vs emitted `jd_language` agreement **≥ 95%** on a logged
  sample.

## 7. Rollback

- Routing is an **additive** model-selection branch behind a flag (e.g. `EXTRACT_HE_MODEL` env). Flag
  off → 4o-mini for all languages = today's behavior, **no data migration**.
- Re-extracted Hebrew rows persist (strictly better than the 5% baseline). If 5.4 output proves bad,
  re-run those job-ids on 4o. No forward/backward hazard.

## 8. Explicitly rejected / deferred

- **ALL-JOBS gpt-5.4 — REJECTED.** English loss is **resolver-side** (C4 ≡ C1; 4.5 unmapped/job @
  coverage 0.535), so 5.4 wouldn't fix English and would 6–13× its cost for no recall gain.
- **The English fix = the alias/resolver consolidation** (Scoring Coverage Arc **step 2**):
  `resolveSkill` / `SKILL_ALIASES` (`index.ts:118`) drops emitted-but-unaliased English skill phrases.
  **Scope that next**, after this Hebrew routing lands.

## 9. Optional add-on — 10-JD English gold-labeling task spec (close the C4≡C1 inference with data)

Mirror the Hebrew labeling method (`getajob-eval/scripts/esco-hebrew-eval/esco_labeling/`):

- **Select** 10 diverse English JDs (spread across data / eng / product / security buckets).
- **Label** the required skills each JD names (a `MISSED` row per JD, same schema as `labels_sample.csv`).
- **Metric:** **emission recall** — of the labeled required skills, how many the extractor _emits_
  (into `req_skills_*_raw`), independent of resolution. High emission recall + low `coverage_ratio`
  confirms the loss is resolver-side, closing the C4≡C1 inference with data before step 2.
- **Deliverable:** the spec only (selection criteria, label schema, the metric + how to compute it) —
  **no run, no code.**

---

_**SIGNED by Eli 2026-07-07** (amended: reprocess scoped to ACTIVE Hebrew jobs). Build gated on Eli's
separate go. No code changed; every seam is a file:line target for the build._

# CV Excellence Arc — Phase 1: Audit, Fix Design & Excellence Bar

> Status: **DESIGN — awaiting Eli approval.** Report only; builds are Phase 2.
> Date: 2026-07-08. Sources: 5 parallel investigations (source map, pipeline map,
> failure archaeology + prevalence, generated-vs-corrected PDF eval set, external
> research), the 2026-07-08 dogfooding session, and the prior attribution arc
> (`cv-attribution-forensic.md`, `cv-attribution-fix-arc.md`, PR #519).

## Product principle (Eli, binding)

**The AI advises, the user decides.** Every stored bullet appears in every generated
CV by default. The AI may **label** bullets ("weakest for this role") as a suggestion,
but never **drops**, **rewrites facts**, or **adds** content the user must fight to undo.
**Anti-fabrication is absolute.**

---

## 0. Executive summary

CV generation is the platform's flagship, and its core engine (`generate-tailored-cv`
Pass-2) **lets an LLM author the entire document from scratch**. That single design
choice is the root cause of every content failure observed: the model **drops** real
profile bullets, **fabricates** new ones, and reshapes prose — because a long single
pass has weak global consistency and no structural guarantee that stored facts survive.

Three findings shape the plan:

1. **The corruption is real but currently Eli-only and latent.** 0 of 55 real users have
   run tailored (LLM-authored) generation with telemetry; all 26 real-user CVs are
   deterministic **master** builds that preserve the profile 1:1. Real users carry no
   `bullets[]`, so the drop/fabrication class is structurally unreachable for them _today_
   — but the Aug–Nov practicum (100 students) drives them straight into tailoring. **This
   is preventive hardening before the flagship goes to scale, not a live mass incident.**
2. **The one genuinely live platform gap is observability** — the 21:14 failure produced a
   client `cv_generated{success:false}` but **no `function_metrics` row**, so real-user
   generation failures would go uncounted the moment tailoring reaches them.
3. **The category has converged on the fix.** Every leading builder (Teal, Rezi, Enhancv,
   Kickresume, Resume.io) uses **deterministic section assembly + constrained per-section
   AI** — facts pass through as immutable slots, AI only touches phrasing — so dropped/
   invented facts are _structurally impossible_. Plus **bullet include/exclude toggles +
   advisory labeling** (Teal) and **token streaming** (Cursor/Canvas) for perceived speed.
   This is a 1:1 match with Eli's principle.

**The plan:** stop the bleeding with deterministic guards (retention floor, provenance
anti-fab, no-disclaimer, observability) on the eval set, then re-architect Pass-2 from
full-authoring to assembly+polish, then ship the advisory-toggle UI and streaming UX.

---

## 1. Source map — where CV generation pulls data from

Three engines, three sourcing models:

- **`generate-tailored-cv` (gtc)** — coach/chat + tracker "Generate CV". LLM **authors from
  scratch** from raw profile rows. _(This is where drops/fabrication happen.)_
- **`refine-cv`** — Studio "Tailor" + extension. Rebuilds a **deterministic master** from
  profile, LLM only **rewords ≤4 bullets** (each must trace to source or the original is
  kept verbatim). **Never drops a bullet, never writes titles.** _(The safe engine.)_
- **`edit-cv`** — Studio free-form chat. Edits the handed-in `cv_data`; reads no profile.

### Data sources (gtc)

| Source                                                                  | Read at                     | Transform                                                               | Divergence risk                                |
| ----------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| `experiences.bullets[]` + `responsibilities`                            | Pass-2 (`index.ts:848-867`) | **both** sent to LLM; LLM re-authors                                    | see dual-field below                           |
| master CV (`is_master` row / `cv-master.ts`)                            | gtc-master / refine rebuild | deterministic                                                           | persisted row can be **stale** vs profile      |
| education/skills/langs/projects/certs                                   | Pass-2                      | LLM re-authors; server overrides institution/title-case/honors          | bucketing regex mis-routes roles               |
| **story bank** (`stories`, top-8 by JD score, `experience_id` required) | Pass-2 (`:728`)             | injected w/ verbatim-metric binding                                     | floating stories excluded                      |
| JD keywords (`extractJDKeywords`) + v4 `req_snapshot`                   | Pass-1 / grounding          | provenance-filtered to JD text                                          | —                                              |
| coach context                                                           | —                           | only `application_id` threaded in; gtc reconstructs from the linked app | hallucinated app_id → new app created, not 404 |

### The dual-field crux (`bullets[]` vs legacy `responsibilities`)

On the **Profile page these are two independent editors** on the same card. Which one
reaches the CV depends entirely on the path:

- **gtc gpt-4o (default):** sends **both, unranked** → can blend or surface stale
  `responsibilities` the user thought they'd replaced. (Ranking rule exists **only** in
  `OPTION_A_OVERLAY`, appended for `cv_model:'sonnet'` only — `index.ts:1427`.)
- **gtc sonnet:** overlay says bullets win — but it's a **prompt instruction, not
  enforcement** (Eli was on Sonnet 2026-07-08; bullets still dropped 5→2).
- **refine / master:** **bullets always win, hard** (`cv-master.ts:225-231`);
  `responsibilities` is **never consulted** when bullets exist → responsibilities-only
  facts silently never reach the CV.
- **edit-cv:** reads neither.

**Anti-fab today verifies only that numbers/tools/brand-names trace to source — NOT that
bullet prose is faithful.** Prose is freely reshaped.

---

## 2. Pipeline map & guard analysis

Entry points → engines:

```
Studio "Tailor"      ─► refine-cv        (CVStudioLive.jsx:468)
Extension JD-to-CV   ─► refine-cv        (extension/popup.js:440; inserts application first)
Coach "Generate CV"  ─► generate-tailored-cv  (coachActionHandlers.js:615)
Tracker "Generate"   ─► generate-tailored-cv  (CVManagement.jsx:95)
"Generate master"    ─► generate-tailored-cv  (master mode)
Studio chat          ─► edit-cv          (CVStudioLive.jsx:375)
Download/Update PDF   ─► render-cv        (render only — no authoring)
```

gtc passes: FLAG-read → [A5 role] → Pass-1 JD keywords → **Pass-2 authoring (LLM)** →
Pass-3 coverage-retry → server fill (`fillFromSource`) → banned-verb+em-dash scrub →
anti-fab (`enforceBulletProperNouns`) → one-page auto-trim → Hebrew → [`cv_enforce_v2`] →
render → persist.

### Guard reality (flags OFF in prod)

| Failure class                                        | Stage              | Guard TODAY                                   | Fixable by a flag flip?            |
| ---------------------------------------------------- | ------------------ | --------------------------------------------- | ---------------------------------- |
| whole-experience drop                                | reconcile          | **guarded** (length==sources)                 | n/a                                |
| **partial per-experience bullet drop**               | Pass-2 + auto-trim | **UNGUARDED** on gtc/edit; refine never drops | **No**                             |
| **bullet with no stored source (prose fabrication)** | Pass-2             | token-bearing caught; **pure prose PASSES**   | No                                 |
| **spelled-out fabricated number ("team of five")**   | Pass-2             | **NONE** (`QUANT_TOKEN_RE` = digits only)     | No                                 |
| title rewrite (Creator→Founder)                      | edit only          | server-stamped in gtc/refine; edit reverts    | n/a — **not a gtc bug**            |
| company mangle (GetaJob)                             | edit only          | server-stamped in gtc/refine                  | n/a — **not a gtc bug**            |
| gap-disclaimer ("hasn't used monday")                | Pass-2 / coach     | **NONE** (prompts only)                       | No                                 |
| preview≠download voice                               | edit-cv persist    | closed by `cv_enforce_v2`                     | **Yes** (arm flag)                 |
| cross-experience token leakage                       | anti-fab           | flat corpus                                   | **Yes** (`cv_antifab_attribution`) |
| wrong-employer bullet routing                        | reconcile          | index trusted                                 | **Yes** (`cv_reconcile_verify`)    |
| content-vs-label role divergence                     | pre-Pass-2         | caller role authors                           | **Yes** (A5, HELD)                 |

**Key conclusion:** the retention / spelled-number / prose-fabrication / disclaimer
classes are **not** addressable by the three dark flags or A5 — they need **new
deterministic guards**. The flags close a _different_, narrower set of gaps.

---

## 3. Failure archaeology + prevalence

### Known catalog (mapped to stage) — abbreviated

P0 cross-employer bullet swap (reconcile, #519) · anti-fab attribution-blind (invariants) ·
promote write-back no integrity check (persist) · profile split-brain bullets/responsibilities
(persist) · wrong-role generation (authoring, A5) · master never auto-re-minted (persist) ·
Reichman institution-dup (invariants) · Sonnet markdown-fence JSON 500 (parse) · backtick SWC
400 (build) · gtc 500 under concurrent load `retries=1` (resilience) · 2-column PDF extract
scramble (extract) · em dashes (scrub) · spelled-number anti-fab blindness (invariants) ·
duplicate applications on fire (persist) · deep-link swallowed / popup fatigue (UI).

### Tonight (2026-07-08) — corrected against the PDF eval set

- **Bullet drops (Get a Job 5→2, Guardio 7→5, Combat 3→2)** — authoring. **Confirmed generator, all 6 CVs.**
- **"team of five" + other added bullets** — anti-fab; digit-only check misses "five". **Confirmed generator, all 6.**
- **Creator→Founder, GetaJob** — **NOT generator bugs; Eli's own manual edits** (generated PDFs show "Creator"/"Get a Job"). Server-stamped as designed.
- **Gap-disclaimer ("hasn't used monday")** — coach authoring proposal; Eli rejected it.
- **21:14 failure invisible in `function_metrics`** — observability gap.

### Prevalence (real-user scrub applied; 55 real users)

- **0 of 55** real users have any `cv_generated` event (instrumentation ~2 wks old); **0**
  have run tailored generation; **0** carry `bullets[]`.
- **26 real-user CVs, all `is_master=true`** deterministic builds — **113/113 experiences
  preserved, 0 drops, 0 title rewrites, 0 fabrication, 0 cross-employer contamination.**
- Only real-user CV-pipeline failure ever: **2 `extract-cv-text empty_text` (1 user)** — the
  2-column-PDF _extract_ stage, not generation.
- **Every documented + tonight corruption is Eli-only / internal-only in telemetry.** Latent
  for real users **until they tailor** — which the practicum will trigger.

---

## 4. Eval set (regression substrate)

The 6 generated PDFs (downloaded from `suggested_cv_generation.result.cv_url`, immutable) +
Eli's manual corrections = the **regression eval set**. Every fix must show before/after on it.
Saved: `scratchpad/gen_<appid>.pdf|.txt` (6 each).

**Generator behavior vs profile (systematic, every CV):**

- Drops Get a Job 5→2-3 (consistently loses the job-sourcing-pipeline + MVP bullets),
  Guardio 7→5-6, Combat 3→2 (merges the two award bullets).
- Fabricates: Program Coordinator "team of five volunteers" bullet in **all 6** (profile has
  1 bullet, "team of **8**"); a swapped "life-skills curriculum…" bullet; a Volunteer Educator
  2nd bullet; a Guardio "internal voice of the customer" bullet; embellished model names/claims.

**Eli's corrections:** restore dropped Get-a-Job bullets (reset-to-master once), reorder
(Guardio first), rename Creator→Founder — 3 of 6 CVs were accepted **as-generated** (drops
tolerated), so the bug is silent enough to ship uncorrected.

**Eval assertions to encode:**

1. Every stored bullet appears (emitted ≥ stored per experience) → Get a Job 5/5, Guardio 7/7.
2. Zero bullets not traceable to a stored source (no "team of five", no added volunteer/Guardio bullets).
3. Zero gap-disclaimers / negative caveats.
4. Title/company byte-match profile fields.
5. The 3 accept-as-generated CVs still render cleanly (no regression).

---

## 5. Fix design

### a. Retention (the #1 issue) — _all stored bullets by default_

- **Deterministic invariant (stop-the-bleeding, ships first):** post-authoring, enforce
  **emitted bullets ≥ stored bullets per experience**; any missing stored bullet is
  restored verbatim from source. Lives in `generate-tailored-cv/reconcile.ts` (extend
  `fillFromSource`). Immediate, testable on the eval set.
- **"Weakest for this role" advisory labeling (Eli's rule):** the LLM may _tag_ bullets as
  weak/deprioritized (a suggestion surfaced in the UI); it **never removes** them.
- **Structural fix (Phase-2 rearchitecture):** assembly (§7 Move 2) makes drop impossible.

### b. Anti-fabrication (absolute)

- **Spelled-out numbers:** extend the grounding to number-words ("five", "dozen", "half",
  written ordinals) — currently `QUANT_TOKEN_RE` matches digits only (`cv-antifab.ts:12`).
- **Bullet provenance:** **no emitted bullet without a stored source** — every bullet must
  map to a stored bullet / responsibilities / story token-overlap above a threshold;
  unsourced bullets are **dropped or flagged** (this catches pure-prose fabrication + the
  added volunteer/Guardio bullets). In assembly this is automatic (bullets are copied, not
  authored).
- **Title/company:** already deterministically pass-through in gtc/refine (confirmed). Add
  the same pass-through to `edit-cv`'s already-unconditional facts-immutable gate if any gap
  exists. **Low priority** (no live bug).

### c. Never volunteer gap-disclaimers / negative caveats

- Prompt rule (gtc + `ai-chat/prompt-lib.ts` + refine) + a **deterministic post-check** that
  strips negative-disclaimer sentences ("has not used", "no experience with", "lacks",
  "hasn't"). The "monday" line originated coach-side, so cover `ai-chat` too.

### d. Observability + revision history

- **Metrics on every generation incl. failures:** wrap the invoke so a platform non-2xx
  (the 21:14 case) still writes a `function_metrics` row; reconcile client
  `cv_generated{success:false}` with a server row. Closes the one **live platform-wide** gap.
- **Revision history (stop in-place overwrite):** cheapest durable shape = add an
  **immutable `generated_cv_data jsonb`** column, written once at generation, never updated;
  `cv_data` stays the mutable/corrected copy. Gives generated-vs-corrected forever (no more
  storage-PDF archaeology) and powers the eval loop. (Alternative: version rows — heavier.)

### e. Beyond a–d (uncovered here)

- **Bullets/responsibilities unification:** make precedence consistent across paths and
  surface responsibilities-only facts (today they silently vanish in refine/master). Data-model
  cleanup; pairs with a Profile-page bullets editor so the two fields can't drift.
- **Profile-data gap ("platform not caught up"):** Eli's AI-quality/eval work isn't captured
  in `bullets[]` in role-relevant language, so honest generation under-represents him → a
  **bullet-capture / profile-enrichment** product workstream (the honest half of his complaint).
- **Master staleness:** `edit-cv`/Studio can edit a stale loaded `cv_data`; re-mint on open.

---

## 6. Excellence bar (external research, cited)

### 6a. Latency — make 30–40s feel <5s

Streaming is the highest-leverage lever (TTFT <1s turns a black-box wait into an interactive
read — Cursor/Canvas SOTA). Truthful staged labels raise perceived value (Labor Illusion,
Buell & Norton); vague spinners _lower_ it. Section skeletons fill progressively.
**Stack verified:** OpenRouter passes Anthropic **SSE streaming** through (normalized to
OpenAI chunk format); **prompt caching** works via explicit `cache_control` (0.1× read,
~70% TTFT cut on large prefixes — must be sent explicitly for Anthropic or it no-ops);
**Haiku 4.5** is the fast tier for low-stakes sections; parallel section calls make wall-clock
≈ slowest section. _Design:_ stream (TTFT<1s) → section skeletons → real-pipeline stage labels
→ cache the stable system+library prefix → optionally fan low-stakes sections to Haiku.

### 6b. Architecture — assembly beats full-authoring

Every major builder uses **structured sections + deterministic render + AI scoped to
per-field/bullet/section ops**; none free-authors the whole document (our Pass-2). Structured
outputs / constrained decoding make a dropped bullet or rewritten title **structurally
impossible** (schema constrains structure, not truth — so keep facts pass-through, AI on
phrasing only). Academic backing: long single passes have weak global consistency (arxiv
2510.24476). **Migration cost: moderate** — we already have the structured store
(experiences, role/skill libraries); the work is a render layer + recasting Pass-2 into
constrained per-section calls + engineering cross-section coherence.

### 6c. Interaction — advisory, user decides

Teal's **bullet include/exclude toggles** (bullets persist when off) is the category's
most-praised interaction. Advisory scoring (Rezi Score, Teal Match Score) is standard and
**explicitly defended as advisory-by-design**; per-bullet regenerate (3 options + keep/undo);
Notion/Docs/Cursor accept-reject. **1:1 with Eli's principle.**

### Top 3 moves (impact × effort)

1. **Stream + section skeletons + truthful labels** — low/med effort, immediate perceived-speed win, small backend change (SSE parser + stage events). Independent.
2. **Assembly + constrained per-section AI** — med/high effort, the **root-cause correctness fix** (drops/fabrication become impossible). The category standard.
3. **Bullet toggles + advisory "weakest-for-role" labels + per-bullet regenerate/keep** — med effort, rides on Move 2's structured store, _is_ Eli's principle in the UI.

---

## 7. PR-sequenced roadmap

Each PR states its **eval-set regression check**. Foundations first (they also close the live
observability gap and build the regression substrate), then stop-the-bleeding guards, then the
rearchitecture, then UI + latency.

| PR     | Title                                                                         | Scope                                                                                                                                                         | Eval check                                                                  | A5 / flag interaction                                                                                         |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **P0** | Observability + revision history                                              | metrics on all paths incl. failures; immutable `generated_cv_data` column                                                                                     | 21:14-style failure produces a row; generated snapshot captured             | none                                                                                                          |
| **S1** | Generation progress skeleton + truthful stage labels (FRONTEND-ONLY)          | replace the dead 40s spinner with a section skeleton + real-pipeline stage labels; no backend/authoring change                                                | wait shows visible progress; no correctness change                          | none — touches nothing P5 replaces (moved up from P7 per Eli 2026-07-08)                                      |
| **P1** | Retention floor                                                               | deterministic "emitted ≥ stored per experience", restore missing from source                                                                                  | Get a Job 5/5, Guardio 7/7 on all 6                                         | none                                                                                                          |
| **P2** | Anti-fab hardening                                                            | spelled-out numbers + per-bullet provenance (no bullet without stored source)                                                                                 | 0 fabricated bullets (no "team of five") on all 6                           | consider arming `cv_antifab_attribution` as interim                                                           |
| **P3** | No gap-disclaimers                                                            | prompt rule + negative-sentence scrub (gtc + ai-chat + refine)                                                                                                | 0 disclaimer lines                                                          | none                                                                                                          |
| **P4** | Bullets/responsibilities unification + Profile bullets editor                 | consistent precedence; surface responsibilities-only facts; stop drift                                                                                        | responsibilities-only facts appear                                          | supersedes the split-brain (#519 §②)                                                                          |
| **P5** | **Rearchitecture: assembly + constrained per-section AI**                     | replace Pass-2 full-authoring; facts pass-through, AI phrasing-only                                                                                           | drops/fabrication structurally impossible; P1/P2 become belt-and-suspenders | **A5 re-integration required** (see below); may make `cv_reconcile_verify`/`cv_antifab_attribution` redundant |
| **P6** | Advisory UI: bullet toggles + "weakest for role" + per-bullet regenerate/keep | Teal-style toggles, advisory labels, keep/undo                                                                                                                | user can include/exclude every stored bullet                                | rides on P5 store                                                                                             |
| **P7** | Latency: token streaming + prompt caching + Haiku sections (post-P5)          | SSE passthrough, cache_control, low-stakes fan-out — assembly (P5) naturally enables section-streaming, so build streaming on the new pipeline, not on Pass-2 | perceived <5s; no correctness change                                        | orthogonal; arm `cv_enforce_v2` alongside for voice-on-write                                                  |
| **D1** | _(deprioritized)_ em-dash chokepoint lift into shared invariants              | move scrub into `cv-enforce-invariants` so refine/edit inherit it                                                                                             | em=0 on refine/edit paths                                                   | —                                                                                                             |
| **D2** | _(deprioritized)_ `needsCompany` park visibility                              | surface the silent coach CV-gen park in the UI                                                                                                                | park shows a prompt, not a silent no-op                                     | —                                                                                                             |
| **D3** | _(deprioritized)_ A3 save-guard merge fix                                     | integrity check in `promoteBulletsToProfile` (no subset-clobber)                                                                                              | promote never reduces stored bullets                                        | —                                                                                                             |

### A5 bake-off interactions (flag explicitly)

- **A5 (`gtc_author_from_app`) sits _before_ Pass-2 authoring** (content-vs-label role). **P5
  moves/replaces Pass-2**, so A5's `resolveAuthoringRole` insertion point changes — **do not
  finalize the A5 arming decision until P5 is scoped**, and P5 must preserve A5's role-authority
  logic. Arming A5 _before_ P5 is safe (pure role selection) and independent of the retention work.
- **`cv_reconcile_verify` (A1)** and **`cv_antifab_attribution` (A2)** guard attribution at the
  _reconcile/anti-fab_ stage. P5's assembly grounds each bullet in its own experience by
  construction → **A1/A2 likely become redundant**; decide in P2/P5 whether to arm them as
  interim guards or supersede them. **Don't ship the held A2 bake-off into a pipeline P5 is about
  to replace** without checking overlap.
- **`cv_enforce_v2`** (voice-on-write) is orthogonal — safe to arm in P7.

### Regression strategy

The 6-CV eval set is the gate: every PR runs generated-vs-expected on all 6 and must show the
before/after delta for its class, with **no regression on the 3 accept-as-generated CVs**. Once
P0 lands (immutable `generated_cv_data`), the eval loop is self-sustaining for all future CVs.

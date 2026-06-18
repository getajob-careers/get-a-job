# Per-job refine — design (HOLD, read-only)

Design/investigation only. No code, no deploy. Branch `eli/refine-design-investigation`.
Verified against live prod (read-only) + reads of `generate-tailored-cv/index.ts`, `reconcile.ts`,
`_shared/cv-templates/build-pdf.ts`.

**Direction:** instead of authoring a one-page CV per JD from scratch (~1.74k out-tokens, ~33–46s), read
the user's **master `cv_data`** reservoir (already produced by `master:true` mode — comprehensive, uncapped,
`cv_url` null) + a JD, have the LLM emit **small ops**, and **assemble** a one-page job CV from the master's
existing text. Small output = speed; selecting from rich material = depth.

**Ground-truth `cv_data` shape (verified on Eli's live master row):** top-level keys = `header, summary,
professional/military/volunteering/leadership_experiences[], education[], skills{domain,tools,technical},
languages[], honors_and_awards[], certifications[], projects[], fit_analysis`. Each experience entry =
`{title, company|unit|organization, dates, bullets}` — **`bullets` are bare strings, and there are NO
`id`/`index`/`experience_id` keys anywhere** (`reconcile.ts:228-234` returns only those fields; `index` is
consumed then dropped). This is the load-bearing constraint for item 1.

---

## 1. Op contract + addressability

**Addressability (the gap):** `cv_data` has **no stable ids** — only array position. Position is reliable
_within one persisted master snapshot_ but **not across master regenerations** (the experiences fetch
`index.ts:393` has **no `ORDER BY`**, and bucket membership depends on `classifyExperience`, so indexes can
renumber on a regen).

- **O1 — positional `(section, expIndex, bulletIndex)`:** zero schema change, but fragile across regens; an
  op set authored against one master snapshot silently mis-targets after a regen.
- **O2 — stamp deterministic ids on the master at persist** (e.g. `experience_id = "pro.0"`, `bullet_id =
"pro.0.b2"`), purely additive to `cv_data`, **no author/output-contract change** (the LLM still emits only
  `{index, bullets}`; ids are stamped server-side post-reconcile, before the `is_master` upsert at
  `index.ts:2617`). **← LEAN.** Pair it with adding **`ORDER BY id`** to the experiences fetch
  (`index.ts:393`) so the positional ids are reproducible across regenerations. Stamp lives in
  `reconcile.ts:228-234` (it has the source index `i` + bullet array in scope) or a one-pass post-reconcile
  walk — ~2 lines, rides along in the persisted `cv_data`.

**Smallest op set that still hits keyword coverage** — JD keywords live across summary + skills + bullets
(the existing contract, `index.ts` keyword rules), so the refine touches exactly those three surfaces:

```jsonc
{
  "select": {
    "experience_ids": ["pro.0", "pro.1", "vol.0"], // which experiences appear, in order
    "bullet_ids": ["pro.0.b0", "pro.0.b2", "pro.1.b1"], // which master bullets survive (by id)
  },
  "rewordings": [
    {
      "bullet_id": "pro.0.b2",
      "new_text": "…JD-keyworded rewrite of that exact bullet…",
    },
  ],
  "summary": "the one JD-tailored About-Me (the only freshly-authored prose)",
  "skills_emphasis": { "domain": ["…"], "tools": ["…"] }, // select/reorder from master.skills
}
```

- `select` = the one-page fit decision (the LLM picks the most JD-relevant experiences/bullets to fit a
  page); `rewordings` = surface JD keywords a selected bullet lacks (anti-fab gated, item 3); `summary` =
  the single fresh-prose block; `skills_emphasis` = reorder/select from the master's existing skills.
- **Why coverage holds:** the assembled output is scored by the _existing_ coverage scorer (item 2), and the
  three surfaces it measures are exactly the three the ops touch.
- **Options on op richness:** (a) select + summary + skills only (no rewordings) — simplest, but can't add a
  keyword a selected bullet is missing; (b) **+ rewordings ← LEAN** — needed for coverage, gated so a reword
  can't introduce an unsourced metric/tool.

## 2. Assembly + one-page reuse

**What's reusable as-is (no adapter):**

- **`buildCvPdf` shrink-to-fit render** (`build-pdf.ts:621`) — the _actual_ one-page mechanism; it renders
  **any** `cvData` identically (measure → `scale = max(SCALE_MIN, avail/used)`). An assembled job `cv_data`
  renders byte-identically to a from-scratch one. **This is what enforces one page.**
- **Render → upload → signed-URL block** (`index.ts:2533-2569`).
- **Coverage/tailoring scorer** (`index.ts:2234-2263`, `JSON.stringify(cvData).toLowerCase()` + substring +
  `phraseMatchesProximity` `:2195`) — pure over any `cvData`; **drop-in to score the assembled output**.
  The retry-eligibility scorer (`:1619-1707`, "swap only if it gains keywords without losing bullets") is the
  right model for "trigger a reword pass if coverage is low."
- **`extractJDKeywords`** (`index.ts:129`, gpt-4o, provenance-filtered) — call once on `source_jd` to get
  `must_include_phrases` for targeting + scoring.
- **Non-master persist** (`index.ts:2637-2648`): the existing `else`-branch insert already writes
  `is_master=false` (column default), `application_id`, `source_jd`, `cv_data`, `cv_url`, `version:1` — exactly
  a refined job row. Plus the applications-row write (`index.ts:2572-2592`). **Reusable as-is.**

**NOT needed for assembly:** `ONE_PAGE_RULE` / bullet caps / `OPTION_A_OVERLAY` are **prompt-author text** —
they govern an LLM _writing_ bullets from `responsibilities`/stories. The refine **assembles** from
already-authored master bullets, so they're irrelevant unless a reword pass is added (then a _trimmed_
reword-specific prompt is net-new, not a drop-in of these blocks).

**Reusable as a guard only:** the server trim `estimatePageLines` + bullet-floor loop (`index.ts:2364-2507`,
`maxLines=120`) is a pure `cvData→cvData` shrinker — useful as a pathological-output guard, but it pops whole
bullets and rarely fires; it is **not** a one-page enforcer (the renderer is).

**Assembly = net-new** (no existing function does master→job selection): `job_cv_data = { header (master),
summary (op), <each experience in select.experience_ids with bullets filtered to select.bullet_ids and
rewordings applied>, skills (reordered by op), education/languages/honors/certs/projects (master),
fit_analysis (op or recomputed) }` → run coverage scorer → optional reword pass → `buildCvPdf` → persist.

**Version semantics:** `version` is **hardcoded `1`** everywhere; there is **no per-application versioning**
(no `MAX(version)+1`, no `(application_id, version)` uniqueness). Each refine inserts a fresh `version:1` row.
**Lean: keep `version:1` for now** (matches today); real per-application version history is net-new — defer.

## 3. Anti-fab on rewordings

**The master is already the anti-fab'd source** — authored under `TRUTHFULNESS_RULES` + `OPTION_A` verbatim-
metrics/no-derived-figures + reconcile identity-stamping + the `unsourced_bullets` validator. So the refine
**polices rewordings only; it does NOT re-verify facts.** `select` ops (pick existing master bullets) and
skills reorder need **no** anti-fab check — they move vetted text. Only `rewordings` and the fresh `summary`
write/transform text.

**Gate (reject-and-fallback):** for each `reword` op, extract the quantified + proper-noun tokens (the
existing `unsourced_bullets` token rules: numbers, %, currency, `3x`, CamelCase/ALLCAPS tool shapes) from
`new_text`; **every such token must already appear in the master content for that experience** (the original
master bullet ∪ that experience's other master bullets). If `new_text` introduces a token not in the master →
**reject the reword, keep the original master bullet.** Same gate on `summary` against the whole master.
Reuses the `unsourced_bullets` haystack logic (`index.ts:2234`-style) with **the master `cv_data` as the
haystack** instead of profile/stories. **← LEAN:** token-trace gate + reject-to-original; deterministic, cheap,
and it makes a reworded bullet strictly a re-phrasing of vetted master text.

## 4. Lazy master generation (ships without onboarding pre-gen)

When a refine is requested and **no `is_master` row exists**, author the master first (existing master mode,
~40s once), then refine.

- **L1 — refine is a separate function** that, on no-master, does a server-side `functions.invoke(
"generate-tailored-cv", { master:true })`, then re-reads the `is_master` row and refines. Clean reuse of the
  deployed master author (no code dup), at the cost of one extra invoke hop on the cold path.
- **L2 — refine is a `refine:true` mode inside `generate-tailored-cv`**: on no-master it runs the master-author
  block inline, then the assembly. No sub-invoke; shares all the code — but bloats an already-large function.
- **Lean: L1** (separate `refine-cv` function) for separation + independent deploy/rollback, with the lazy
  master via an internal invoke. **Check point:** the very top of the refine handler — `select id from
application_cvs where user_id=? and is_master=true`; if none → invoke master author → re-select → proceed.
  The ~40s is paid **once per user, ever**; every later refine skips it. (With 1b onboarding pre-gen, the
  master is already present → the cold path never fires in steady state.)

## 5. Flag + rollout

Ship refine behind an **opt-in flag**; the from-scratch path stays default until the re-bake gate clears.

- **Two call sites:** `src/components/tracker/CVManagement.jsx:76` and `src/lib/coachActionHandlers.js:582`
  (both `invokeWithAuthRetry("generate-tailored-cv", { body:{…, cv_model:"sonnet"} })`).
- **Mechanisms:** (F1) client constant/flag module both sites read to route to the refine path (send
  `refine:true` or call `refine-cv`); (F2) server-side per-user flag (profiles column); (F3) per-user canary
  allowlist.
- **Lean: F1 — a single shared `CV_REFINE_ENABLED` constant** in a small client config module that both call
  sites import (mirrors how `cv_model:"sonnet"` is already a shared decision passed from both). Default
  **false**; flip one constant to ramp. Optionally back it with a per-user allowlist for a canary before the
  global flip. No new infra; instant rollback (flip the constant). The server still accepts the old
  from-scratch shape unchanged, so a stale client is safe.

## 6. Re-bake harness (design only)

Compare **refine vs from-scratch** on **N=30 real `(profile, JD)` pairs**, non-inferiority bar, before
flipping the flag to default.

- **Pair set from existing data:** the **30 onboarded profiles × their tracked applications carrying a
  `job_description`** (37 applications have one live). Sample 30 pairs spanning **rich** (e.g. Eli, 5 exp / 19
  stories) and **thin** (e.g. the demo, 3 exp / 0 stories) profiles so the gate sees both regimes. Each pair:
  run **from-scratch** (current path) and **refine** (off that user's master) → compare.
- **Scorers:** (a) the existing **coverage scorer** (`must_include_phrases` % on the assembled output) —
  refine ≥ from-scratch; (b) a **tailoring-depth** check the keyword scorer can't see (did the refine select
  the JD-relevant experiences/bullets and drop irrelevant ones?) — deterministic (relevant-experience
  inclusion + JD-skill coverage in the skills section) and/or an LLM judge 1–5; (c) **anti-fab regression** —
  `unsourced_bullets` count on refine ≤ from-scratch.
- **Pass condition (flip to default):** refine coverage **≥** from-scratch on **≥90% of the 30 pairs** AND
  tailoring-depth within ~0.3 AND **no** anti-fab regression. Non-inferiority — speed is the win, so refine
  must not be _worse_, not strictly better. Mirrors the June 10–11 bake-off methodology.

## Latency + cost projection

- **Output tokens:** refine emits ops (select ids + a few rewordings + summary + skills emphasis) ≈
  **300–700 tokens** vs from-scratch **~1.74k** → **~60–80% fewer** output tokens (output dominates both
  latency and cost).
- **Per-job latency (warm master):** `extractJDKeywords` (gpt-4o, ~2–4s, sequential) + one small Sonnet ops
  call (~8–15s for ~500 out-tokens) + server assembly (ms) + render+upload (~1–2s) ≈ **~12–22s**, vs today's
  **~33–46s** — roughly **half**, and off the 45s timeout cliff.
- **Lazy first refine (cold master):** + the master author **~40s once** → first refine for a no-master user ≈
  **~52–62s**, then ~12–22s for every subsequent job. With 1b onboarding pre-gen the master is already there,
  so steady state is always the warm ~12–22s.
- **Cost:** output-cost drops ~60–80% per job. Input is comparable or lower — the refine prompt carries the
  master `cv_data` experiences/bullets (~2–4k tokens) + JD keywords + op instructions, and does **not** need
  the full role/skill library + stories injection the from-scratch author pulls (~15.6k in today), so input
  cost is likely **lower** too.

---

## Phased build plan

**Phase 2.0 — Master addressability (prereq for ops).** Stamp deterministic `experience_id`/`bullet_id` onto
master `cv_data` at persist (post-reconcile, before the `is_master` upsert), additive only — no author/output
contract change. Add `ORDER BY id` to the experiences fetch so ids reproduce across regenerations. Regenerate
existing masters. (Small, low-risk, gated to the master path; no migration.)

**Phase 2.1 — Refine path behind a flag (default OFF).** New `refine-cv` function: `extractJDKeywords(source_jd)`
→ refine LLM emits the §1 ops contract over the master `cv_data` → **server assembly** of the one-page job
`cv_data` → coverage scorer (reused) → optional anti-fab-gated reword pass → `buildCvPdf` + upload + sign
(reused) → non-master `application_cvs` insert + applications write (reused). **Lazy master** (L1) on no-master.
Wire the `CV_REFINE_ENABLED` flag at the two call sites; default false. Job-CV from-scratch path untouched.

**Phase 2.2 — Re-bake gate + flip.** Build the §6 harness (coverage + tailoring-depth + anti-fab over N=30,
non-inferiority). If it clears, flip `CV_REFINE_ENABLED` to default true; else iterate the refine prompt/ops.
Rollback at any time = flip the flag.

**(Phase 4 — editor on the master)** stays as previously scoped: the conversational editor edits the master,
write-back to source via the `extract-bullets` propose-confirm seam. Out of scope here.

## Overall lean

Stamp **deterministic bullet ids on the master (O2) + ORDER BY the fetch** so ops can reference bullets
durably; the refine emits **select + rewordings + summary + skills_emphasis** and the **server assembles**,
reusing `buildCvPdf`, the render/upload/sign block, the coverage scorer, `extractJDKeywords`, and the
non-master persist **as-is**; **anti-fab polices rewordings only** (token-trace against the master, reject-to-
original) because the master is already vetted; ship as a **separate `refine-cv` function with lazy master
(L1)** behind a **single `CV_REFINE_ENABLED` constant (default OFF)**, flipped only after the **N=30 non-
inferiority re-bake** clears. Expected **~12–22s warm** (half of today) at **~60–80% fewer output tokens**,
with the **~40s master cost paid once per user**.

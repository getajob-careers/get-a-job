---
title: CV consolidation step 1 — the enforceCvInvariants chokepoint (scoping)
status: DRAFT — HELD FOR ELI'S REVIEW
owner: eli
last_reviewed: 2026-07-07
consumes: docs/research/cv-engine-consolidation-investigation.md
scope: SCOPING ONLY — paper, no code. Step 1 of the signed consolidation sequence.
code_paths:
  - supabase/functions/generate-tailored-cv/index.ts
  - supabase/functions/refine-cv/index.ts
  - supabase/functions/edit-cv/index.ts
  - supabase/functions/render-cv/index.ts
  - supabase/functions/_shared/cv-antifab.ts
  - supabase/functions/_shared/cv-master.ts
  - src/components/cv-studio/CVStudioLive.jsx
---

# Step 1 — the `enforceCvInvariants` chokepoint (scoping)

> **What this is.** The paper scope for **step 1** of the signed CV-consolidation sequence (#504):
> one shared enforcement function, run as the **last step before persist by every authoring path**,
> so `cv_data` is clean-at-rest and the two renderers can no longer diverge. **No code here** — this
> defines call sites, the unified invariants, tests, the opt-in flag, rollback, and the deploy
> checklist so the build PR is mechanical and reviewable. Steps 2 (Studio "Tailor" → gtc) and 3
> (preview-from-PDF) are **out of scope**.
>
> **Why first:** #504 §2–§3 pinned the failure mode — enforcement is split across paths (gtc: prompt
> only; render-cv: deterministic at _render_; edit-cv: neither), so the same `cv_data` renders one way
> in the HTML preview and another in the PDF download. Centralizing enforcement _before persist_ is the
> prerequisite that makes steps 2–3 safe. Nothing else in the arc should land before this.

---

## 1. Goal (one sentence)

Introduce `enforceCvInvariants(cvData, master, jd)` — a single pure function that normalizes a CV's
`cv_data` to the project invariants — and call it as the **final transform before any write** to
`application_cvs.cv_data` (or before returning `cv_data` that the client will persist), from **every**
authoring path. After this, both renderers read already-normalized data and cannot disagree.

## 2. What it unifies (the invariants — today scattered, tomorrow one place)

| Invariant                                                                                            | Today (source)                                                                                             | Today's gap                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Proper-noun trace-to-master** (revert an invented company/product to the master value; never drop) | `enforceBulletProperNouns` in `_shared/cv-antifab.ts:432`, called **only** from gtc (`index.ts:2394`)      | refine-cv/edit-cv don't call the shared gate on their write path                                |
| **First-person / voice** ("I led…" → "Led…", subject-strip at position 0)                            | `normalizeCvDataBullets` (`render-cv/index.ts:196`, logic in `_shared/cv-master.ts:159`)                   | runs at **render** (download) only; **HTML preview + edit-cv persist raw** → preview ≠ download |
| **Numbers: flag, don't fabricate/remove**                                                            | anti-fab gate (numbers flagged, not invented)                                                              | consistent in gtc; not guaranteed on edit-cv output                                             |
| **No-empty-experience** (every experience keeps ≥1 real bullet; restore from master if emptied)      | reconcile's index-keyed fill (`reconcile.ts:242`) on gtc; refine-cv keeps every experience by construction | edit-cv can empty a section with no restore                                                     |
| **English-only / Hebrew gate**                                                                       | Hebrew gate in `render-cv/index.ts:~210` before `buildCvPdf`                                               | render-time only                                                                                |

**The chokepoint composes the existing, tested pieces** (`enforceBulletProperNouns`,
`normalizeCvDataBullets`, the no-empty restore, the Hebrew/English gate) into one call — it does **not**
re-implement them. Private/divergent copies are removed **only in a later step** (see §7 rollback:
keeping the render-time net during rollout is intentional).

## 3. Exact call sites — per authoring path

Three engines author `cv_data`; the chokepoint is inserted at each path's **last mutation before the
data leaves the function**.

- **gtc — `generate-tailored-cv/index.ts`.** Call `enforceCvInvariants(cvData, master, jd)` on the
  fully-assembled `cvData` **immediately before the persist block** (the `applications` update/insert
  at `:2700`/`:2715` and the `application_cvs` write). **Fold in** the existing inline
  `enforceBulletProperNouns` call (`:2394`) so proper-noun enforcement happens once, inside the
  chokepoint, on the final object — not mid-pipeline.
- **refine-cv — `refine-cv/index.ts`.** Call it on the refined `cvData` **before the persist**
  (the write around `:934–956`). refine-cv is already title-safe (LLM never emits titles; copies
  `master[key].title` verbatim, `refine-cv:387`), so here the chokepoint mainly adds the **voice**
  normalization refine-cv lacks on its write path.
- **edit-cv — `edit-cv/index.ts`.** edit-cv **returns** `cv_data` to the client; the client autosaves
  it (`CVStudioLive.jsx:171–174`) with **no normalization**. Call `enforceCvInvariants` **before
  edit-cv returns**, so the object the client shows _and_ persists is already clean. **This is the
  fix for the preview ≠ download divergence** (the "make my summary punchier" → "I led…" case, #504 §3).
- **render-cv — `render-cv/index.ts` (NOT an authoring path).** Once persist is clean, render-cv's
  at-render `normalizeCvDataBullets` (`:196`) becomes a redundant safety net. **Keep it during rollout**
  (idempotent — a no-op on already-clean data); removing it is a **later** step, not step 1.

> **Client note (no client logic change in step 1):** because edit-cv normalizes server-side before
> returning, `CVStudioLive.jsx` autosave/preview need no change — they persist and render whatever
> edit-cv returns, which is now clean. Any future move of enforcement to the client is explicitly out
> of scope.

## 4. Where it lives

A new shared module, `supabase/functions/_shared/cv-enforce-invariants.ts`, exporting
`enforceCvInvariants(cvData, master, jd, opts?)`. It imports and sequences the existing helpers from
`cv-antifab.ts` and `cv-master.ts`. Rationale for a new file over extending `cv-antifab.ts`: the
chokepoint is an **orchestrator** over anti-fab + voice + structure gates; keeping it separate keeps
`cv-antifab.ts` single-responsibility and makes the "one source, N consumers" header honest.

## 5. Test plan

- **Unit (`cv-enforce-invariants.test.ts`, new):** one case per invariant — proper-noun revert (invented
  company → master value, not dropped); first-person strip at position 0; no-empty-experience restore;
  numbers **flagged not removed**; Hebrew/English gate. Plus **idempotency** (`f(f(x)) == f(x)`) — the
  invariant that makes render-cv's retained net a safe no-op and makes rollout reversible.
- **The key regression — preview == download:** extend `cvRenderParity.test.js` / `cvRenderChokepoint`:
  feed an edit-cv-style first-person `cv_data` through the chokepoint, then assert the **HTML preview
  path and the PDF path produce identical bullet text**. This is the test that would have caught the
  live divergence.
- **Per-path integration (the current gap — #504 §2 notes no handler has one):** a thin test per
  authoring fn asserting its output object satisfies `enforceCvInvariants` (no first-person at pos 0,
  no un-traced proper nouns, no empty experience). Small, but closes the "helpers tested, handlers not"
  hole.
- **Bake-off (PR #156 discipline):** run a fixed set of real anonymized CVs through **flag-off vs
  flag-on**; assert (a) zero new fabrications, (b) no content loss (bullet counts preserved modulo the
  voice-strip), (c) latency within noise. Attach the before/after table to the build PR.

## 6. Opt-in flag strategy (per PR #156)

Gate the chokepoint behind a flag so it's observable before fan-out — mirroring the `cv_model` /
`chat_model` pattern (#284–286):

- A body/env flag `cv_enforce_v2` (coerced safe: `=== "on"` enables; anything else = legacy path),
  read in each of the three authoring fns.
- **Default OFF** at merge. Enable **per-path** in sequence — edit-cv first (it has the worst gap and
  the clearest before/after), then refine-cv, then gtc — each with its own bake-off evidence before
  flipping.
- Log a one-line `[cv-enforce] path=… applied=… changed=<n bullets>` so the flip is measurable in logs
  before it's trusted.

## 7. Rollback path

- **Flag OFF fully reverts behavior.** Because the chokepoint _composes_ existing helpers and **does not
  delete** the per-path/render-time enforcement in step 1, turning `cv_enforce_v2` off restores the exact
  current path with **no data migration**.
- **Data written while ON stays valid.** Normalization is idempotent, so already-persisted normalized
  `cv_data` re-normalizes to itself and renders identically on the legacy path — a reopened old CV is a
  no-op. There is no forward/backward data hazard.
- The render-cv at-render net is the belt to the chokepoint's suspenders during rollout; it is removed
  only after the flag is 100% on and baked, in a **separate** follow-up.

## 8. Deploy checklist (edge fns don't auto-deploy — the deploy lesson)

1. Merge the build PR + delete branch.
2. `git checkout main && git pull` (bundles from LOCAL, not GitHub main).
3. Deploy the **three authoring fns** — the shared `cv-enforce-invariants.ts` rebundles into each:
   `supabase functions deploy generate-tailored-cv --project-ref ilmqmodklutztuybsvwd`;
   `… deploy refine-cv …`; `… deploy edit-cv …`. (render-cv only needs redeploy if its net is later removed.)
4. **Grep each live artifact** for a chokepoint fingerprint (`enforceCvInvariants`) — a version bump is
   not confirmation.
5. Flip `cv_enforce_v2` on **per path** with the bake-off evidence; watch the `[cv-enforce]` logs.

## 9. Out of scope (named so the build PR stays small)

Step 2 (Studio "Tailor" calls gtc instead of refine-cv) and step 3 (Studio preview rendered from
`buildCvPdf` so preview == download by construction) are the **next** held PRs. Removing render-cv's
at-render normalizer, and any client-side enforcement move, are later follow-ups. **No taxonomy, no
renderer swap, no engine merge in step 1** — only the shared chokepoint + its three call sites + the flag.

---

_Scoping only. HELD for Eli's review. No code changed; every call site is a file:line target for the
eventual build PR._

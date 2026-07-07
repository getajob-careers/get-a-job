---
title: CV consolidation — engine/renderer investigation (step 1)
status: SIGNED (2026-07-07) — canonical base accepted: engine=generate-tailored-cv, renderer=buildCvPdf (preview rendered from it), chokepoint-first sequence
owner: eli
last_reviewed: 2026-07-06
consumes: docs/design/ia-interaction-spec.md
scope: investigation only — NO merge/refactor scoping, NO code
---

# CV consolidation — engine/renderer investigation

> **What this is.** The required FIRST step of the CV consolidation arc (IA spec §3.2.1): before
> scoping any merge, find **which engine/renderer is the healthier canonical base** and **pin the live
> title-mislabeling bug**. Read-only; every claim is file:line. **No merge scoping, no code.** HELD.
>
> **Headline:** canonical **engine = `generate-tailored-cv`**; canonical **renderer = `buildCvPdf`,
> with the Studio preview rendered _from_ it** — but only after a **single enforcement chokepoint runs
> before persist** (else the two renderers keep diverging). And there is a **small, high-impact,
> low-risk title-mislabel fix that should ship AHEAD** of the merge as its own tiny PR (§6).

---

## 1. Engine / renderer map

Two engines and two renderers over one `application_cvs.cv_data`:

| Component                           | File(s)                                            | LOC        | Role                                                                                                                                                 | Called by                                                                                                              |
| ----------------------------------- | -------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Engine A — generate-tailored-cv** | `generate-tailored-cv/index.ts` + `reconcile.ts`   | 2872 + 258 | Authors a tailored CV **from scratch** (LLM emits `{index,bullets}`; server owns titles). Renders its own PDF inline.                                | tracker `CVManagement.jsx:95`, checklist `ApplicationChecklist.jsx:163`, coach `coachActionHandlers.js:615`, extension |
| **Engine B — refine-cv**            | `refine-cv/index.ts` + `reword.ts`                 | 986 + 52   | Tailors by **select+reword from the master** (LLM emits ops only; every experience kept; titles copied verbatim from master). Renders PDF inline.    | Studio "Tailor" `CVStudioLive.jsx:468`, onboarding prewarm, `extension/popup.js:440`                                   |
| **Engine B — edit-cv**              | `edit-cv/index.ts`                                 | 143        | Applies **one NL instruction** to an existing `cv_data`. No JD, no render.                                                                           | Studio chat `CVStudioLive.jsx:375`                                                                                     |
| **Renderer 1 — PDF**                | `_shared/cv-templates/build-pdf.ts` (`buildCvPdf`) | 1375       | The one true PDF renderer.                                                                                                                           | `generate-tailored-cv:2666` **and** `render-cv:233`                                                                    |
| **render-cv (download wrapper)**    | `render-cv/index.ts`                               | 289        | Re-renders an already-structured `cv_data` to PDF; **no authoring**. Runs the deterministic normalizer + Hebrew gate before `buildCvPdf` (:196–231). | Studio "Download"/"Update PDF" `CVStudioLive.jsx:310,570`                                                              |
| **Renderer 2 — HTML preview**       | `src/components/cv-studio/CVStudioView.jsx`        | 953        | React/HTML render of `cv_data` in the browser (live preview + contentEditable).                                                                      | `CVStudioLive.jsx`                                                                                                     |

## 2. Code health

**Duplication (the drift tax the merge targets):**

- `refine-cv` **forks gtc verbatim by its own admission** — header comments "JD keyword extraction (copied verbatim from generate-tailored-cv)" (`refine-cv:85`) and "Coverage scorer (copied verbatim…)" (`refine-cv:180`); the ATS system-prompt string is byte-identical (`gtc:152` == `refine-cv:118`).
- The gtc invoke body is inlined at three call sites (`coachActionHandlers.js:615`, `CVManagement.jsx:95`, `ApplicationChecklist.jsx:163`) — deep-qa-3 #8.
- **Diverged private enforcement copy (the documented failure mode):** gtc historically had its own inline proper-noun validator that only _flagged_, so the shared `cv-antifab.ts` regex-widen did NOT repair gtc — the exact "two engines drift" bug. Resolved by extracting `enforceBulletProperNouns` into `cv-antifab.ts` and calling it from gtc (`index.ts:2394`). Anti-fab is now shared ("One source, three consumers", `cv-antifab.ts:2`).
- **Voice enforcement is still split:** gtc enforces voice via _prompt only_ (`CV_VOICE_RULES`, `gtc:1383`); render-cv enforces it _deterministically_ (`normalizeCvDataBullets`, `render-cv:196`); **edit-cv does neither** (manifest queue: "edit-cv output normalization — studio chat edits can inject first-person voice").

**Tests:** pure helpers are covered (`reconcile.test.ts` 12 tests, `reword.test.ts`, `cv-antifab.test.ts`, `cv-translate.test.ts`, + src-side `cvRenderParity`, `cvRenderChokepoint`, `cvNormalizeOnWrite`, `cvVoicePolish`, `cvMaster.deterministic`). **Gap:** none of the four edge-fn _handlers_ has an integration test — only their extracted helpers.

**Which is cleaner:** `refine-cv` is _structurally_ cleaner and lower-risk (the LLM never emits titles/companies/dates — it iterates `master[key]` and copies `title: e?.title` verbatim, `refine-cv:387`, so it's _immune by construction_ to the experience-title-mislabel class). **But** it's an admitted verbatim fork and Studio-only / lower-usage. **gtc** is heavier, more-featured, ~80% of CV cost, all high-traffic surfaces, and now owns the shared anti-fab gate + the index-keyed `reconcile.ts`.

## 3. preview == download fidelity — the divergence, pinned

The two renderers read the **same** `cv_data` but apply **different content enforcement**:

- **PDF download path** runs `normalizeCvDataBullets(cv_data)` at **`render-cv/index.ts:196`** before `buildCvPdf` — it **strips a leading first-person subject at position 0** ("I am comparing…" → "Comparing…", logic in `cv-master.ts:159`) and runs the Hebrew gate.
- **HTML preview path** (`CVStudioView.jsx:127`) renders `cv_data` **raw — no normalization.**
- **edit-cv** returns edited `cv_data` that `CVStudioLive.jsx:400` merges + shows raw; the debounced autosave (`:171–174`) persists that raw (possibly first-person) text. edit-cv applies the fabrication gate but **not** `normalizeCvDataBullets` (voice).

**Concrete divergence:** Studio chat "make my summary punchier" → edit-cv returns "I led the redesign…" → preview shows "I led the redesign…" → Download strips it to "Led the redesign…". **Preview ≠ download** — the first-person case logged in the manifest. (Section _parity_ was already fixed as "Fix B", `cvRenderParity.test.js`; the remaining gap is the _enforcement_ layer.) Same `cv_data` object — the PDF path _transforms_ it at render, the HTML path does not.

## 4. The live TITLE-MISLABEL bug — pinned

**Two distinct title bugs; do not conflate them:**

**(a) Experience title/company collapse — FIXED IN CODE (deferred-list entry is likely stale).** The old bug (every experience rendered with the same title+company) was fixed by PR #234's `reconcile.ts fillFromSource()`, **wired live**: gtc calls it at `index.ts:1779–1801`; titles/companies come only from the authoritative source by integer index (`reconcile.ts:242` `title: src.title`, `:246` company), with 12 regression tests. The 2026-06-26 handoff still lists it deferred, but the code contradicts that — **treat as stale unless a live regen disproves it.**

**(b) `cv_version_name` from the wrong source — THE LIVE MISLABEL.** The CV's label is set as
`cv_version_name: \`${safeTargetRole} CV\`` at **`generate-tailored-cv/index.ts:2703`** (and the insert twin **:2718**). `safeTargetRole = String(target_role ?? '').slice(0,200)` (`gtc:328`) — the **caller-supplied** `target_role`, **not** the resolved application's `role_title`.

- Tracker (`CVManagement.jsx:98`) and checklist (`ApplicationChecklist.jsx:165`) pass `target_role: app.role_title` → consistent. refine-cv derives it from `app.role_title` (`refine-cv:679`) → safe.
- **The coach path is the hole:** `coachActionHandlers.js:617` passes `target_role: proposal.target_role` — the **LLM-emitted** value from `suggested_cv_generation` (`ai-chat/prompt-lib.ts:1226`). The parser applies **no cross-check** against the resolved app's `role_title` (the prompt _asks_ the model to copy it, `prompt-lib.ts:402`, but that's unenforced). At `gtc:2700–2705`, when the `application_id` resolves to a real owned app, gtc **UPDATEs `cv_version_name` from the LLM's `target_role` but leaves `role_title` untouched** → label and application disagree.

**Failing scenario:** user has the coach's TARGET APPLICATION set to "Product Manager @ Monday.com" and says "make me a CV for a data analyst role." Model emits `target_role:"Data Analyst"` + `application_id = <the PM app UUID>`. gtc writes `cv_version_name = "Data Analyst CV"` onto the PM application (its `role_title` stays "Product Manager"). Tracker/coach now show a **Product-Manager application whose CV is labeled "Data Analyst CV."**
_(The PDF header is NOT a mislabel vector — `buildCvPdf` header is `header.name` + `header.subtitle = profile.headline`, `build-pdf.ts:844–845`; the target role was removed from the header per PR #24/#25. `cv_version_name` is the only surface carrying the role label.)_

## 5. Recommendation (draft)

**Canonical engine: `generate-tailored-cv` (Engine A).** ~80% of CV cost, all high-traffic surfaces, owns the shared anti-fab gate, and its index-keyed `reconcile.ts` closes the title-collapse class. Fold refine-cv's one genuinely distinct virtue — **titles never touched by the LLM (copied from master by index)** — into gtc's reconcile step (gtc already does this via `fillFromSource`), and make Studio "Tailor" call gtc. Keep `edit-cv` as the targeted-edit action but route its output through the shared enforcement chokepoint.

**Canonical renderer: `buildCvPdf` (Renderer 1), with the preview rendered FROM it.** Adopt manifest "divergence fix A": the Studio preview displays the **same `buildCvPdf` output** (embed the rendered PDF/page-image) rather than a parallel HTML re-render — so preview == download by construction.

**Prerequisite (do this FIRST, before either merge):** land the single enforcement chokepoint
`enforceCvInvariants(bullets, master, jd)` called as the LAST step before persist by every authoring
path — voice/first-person/proper-noun normalization runs **once, before persist** — then both
renderers read already-clean `cv_data` and cannot diverge. `enforceBulletProperNouns` is the seed.

**Risks:** (i) the Studio's live editing is **contentEditable HTML** (`CVStudioView`) — swapping to a PDF/page-image preview breaks inline editing; needs an edit-mode (HTML) vs preview-mode (PDF-image) split, or heavy client-side pdf-lib. (ii) Normalizing at persist changes what the DB stores — reopened old CVs re-normalize on next save (idempotent, but a behavior change). (iii) **Deploy discipline** — edge fns don't auto-deploy (the "#234 still deferred?" ambiguity is a symptom); any merge needs the deployed-source grep (lessons 2026-07-06).

**Sequence (for the eventual arc, NOT scoped here):** (1) enforcement chokepoint → (2) Studio "Tailor" → gtc → (3) preview-from-PDF. Each its own held PR, opt-in flag, bake-off-style before/after (PR #156 rules).

## 6. Title-bug quick-fix — YES, propose shipping ahead as a tiny PR

Bug **4(b)** (`cv_version_name` mislabel) is **small, high-impact, low-risk, and fully independent** of the engine/renderer merge. **Proposed** (no code written; propose-don't-build per the brief):

- **Server, authoritative:** in gtc, when `application_id` resolves to a real owned app, derive `cv_version_name` from **that app's `role_title`** (the DB record), not the caller's `target_role` — change the source at `generate-tailored-cv/index.ts:2703` (keep `safeTargetRole` for the no-app insert path at `:2718`). Self-consistent regardless of what the coach sends.
- **Belt-and-suspenders at the boundary:** in the ai-chat parser (`prompt-lib.ts:1226`), when an `application_id` is present, reconcile/override `target_role` to that application's `role_title` rather than trusting the model's free text.

A handful of lines, in files unrelated to the render/engine surgery, **no PDF blast radius**, removes a user-visible "why is my Product Manager CV called 'Data Analyst CV'" moment. **Recommend a small standalone held PR ahead of the consolidation** (with a deployed-source grep — gtc is a manual deploy). Awaiting Eli's go before building.

---

_Investigation. **SIGNED by Eli 2026-07-07:** canonical engine = `generate-tailored-cv`, canonical
renderer = `buildCvPdf` with the Studio preview rendered from it, chokepoint-first sequence accepted.
Consolidation scoping proceeds in a separate held doc (`cv-consolidation-step1-chokepoint-scoping.md`);
the §6 title-mislabel fix already shipped (#505). No code in this doc._

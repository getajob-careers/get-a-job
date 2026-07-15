# CV Studio contracts (S1 / S2 / S3 / S7 / S8) - input to the redesign spec

Status: **spec input, not a build.** These are the five CV-Studio behaviors the 2026-07-15 forensics (`docs/research/cv-studio-forensics-2026-07-15.md`) showed are governed by an unstated or broken _contract_, not a fixable one-line bug. Each entry states the contract question, today's actual behavior with evidence, and a recommended contract. No UX changes here; the fixes land in the redesign.

The through-line: the Studio autosaves to an **ephemeral `application_cvs.cv_data` row**, while the "Master CV" is a **pure derivative of the profile** (`buildMasterCvData`). There is no durable write-back except an opt-in bullets-only promote. So edits drift both ways. Four of these five contracts collapse to one decision (below).

---

## The one decision everything hangs off: is the Master CV a _view_ or a _document_?

- **Option A - Master CV is a live VIEW of the profile.** Studio edits write **through** to the profile (summary → `profiles.summary`, bullets → `experiences.bullets`, dates/titles → their rows, honors → `education.honors`/`experiences.awards`). The master is always re-derived; there is no separate editable master state to drift. "Save to profile" disappears (every edit already is).
- **Option B - Master CV is a DOCUMENT** distinct from the profile, with an explicit, visible sync action.

The forensics + F2 (summary write-through, already shipped) point at **Option A**. The recommendations below assume A unless noted; if B is chosen, each "write through" becomes "stage + one explicit sync."

---

## S1 - the version dropdown switches the displayed CV unexpectedly

**Contract question:** What is a "version", and what should selecting one do to an edit in progress?

**Current behavior (evidence):** Selecting a version calls `setSelectedCvId` → `useCvData` swaps the query key → `useSeededCvModel` clears the model then re-seeds → `CVStudioView` is keyed `${selectedCvId}:${editVersion}` so it **remounts** and every field re-seeds. It is a **full replace by design**, with **no unsaved-edit guard**; programmatic switches (chat-apply, tailor-success, selection-recovery) discard typed-but-uncommitted text. Compounding it: the user had **59 tailored `application_cvs` rows, all `version = 1`** (refine-cv never de-dups), plus **one master row frozen at 2026-07-07** - so "versions" are ambiguous and "Master" loads an 8-day-stale document.

**Recommended contract:**

- The dropdown lists exactly: **one Master** (the live profile view) + **one current tailored CV per application** (dedup by application, keep latest). Not 59 near-identical `version = 1` rows.
- Selecting a version **never silently discards** an in-progress edit - commit-or-prompt before switching.
- "Master" always reflects the current profile (re-derived), never a frozen snapshot.

---

## S2 - Master-CV bullet edits and deletes don't sync to the profile

**Contract question:** Are Studio edits authoritative over the profile, or a throwaway layer on top of it?

**Current behavior (evidence):** Autosave writes `application_cvs.cv_data` **only**; `experiences` is untouched. The **only** bridge is an opt-in "Save to profile" toast → `promoteBulletsToProfile` (bullets only, keyed by `experience_id`, **silently skips** entries without one, ignores education/projects/certs). Delete propagates **only** through that same opt-in path. On the next tailor the master re-derives from the profile and the un-promoted edit is gone.

**Recommended contract (Option A):** Studio edits to master content **write through** to their source rows immediately (the F2 summary fix is the first instance of this). No opt-in, no silent skips; an edit that can't be attributed to a source row is surfaced, not dropped.

---

## S3 - the coach can't change the profile or the CV, and fails silently

**Contract question:** What is the coach allowed to mutate, and must an unsupported request fail _loudly_?

**Current behavior (evidence):** The global coach is card-gated (`coachActionHandlers.js`): it can write `tasks`, `career_roles`, `applications`, `company_targets`, `stories`, **append** bullets/skills (append/undo only), and **generate** a CV. It has **no handler that writes `profiles`** (summary/name/contact/education) and **cannot edit the CV document** (that is the Studio's separate `edit-cv` panel). An unsupported request ("change my summary", "fix my CV", "delete this bullet") emits **no card → a text reply, nothing mutates, no error** → silent failure.

**Recommended contract:**

- Publish the coach's **capability set** explicitly (what it can and cannot change today).
- Any request outside that set must **fail loudly** - an honest "I can't edit your profile/CV yet; here's how to do it" - never a text reply that looks like it worked.
- Decide separately (product) whether to _extend_ the coach to profile/CV mutations; if so, route through the same write-through contract as S2.

---

## S7 - not everything in the Master CV is editable

**Contract question:** Which rendered CV fields are click-to-edit, and which are read-only _by design_ (with a stated reason)?

**Current behavior (evidence):** Editable: header (minus phone), summary, experience title/org/dates/bullets, education institution/degree/field(if already set)/dates, skills domain line, language names. **Locked (render-only round-trip):** phone, Skills→Tools, Skills→Technical, language proficiency, **Honors & Awards**, Certifications, Projects, and there is **no add/delete of experience or education entries** (only bullet add/remove); an empty education field can't be added.

**Recommended contract:** Every field the CV **renders** is either (a) editable in the Studio, or (b) explicitly read-only with a visible reason and an obvious place to edit it (e.g. "Honors are edited on your Profile"). No silent locked fields. Note: after the honors-provenance fix, Honors & Awards is **derived** (from `education.honors` + `experiences.awards`) - so its "edit" affordance should link to those source fields, not be an inline free-text box (that was the fabrication vector).

---

## S8 - the "save to profile" popup appears a bunch

**Contract question:** When should a sync prompt appear, and what does confirming it actually cover?

**Current behavior (evidence):** `profilePromptedRef` resets to `false` on **every** `update()` (every field commit), so the toast re-arms after every edit. It fires on **any** edit (summary/header/skills) but its action promotes **bullets only** - so it prompts about changes it cannot durably save. Its repetition is the ref-reset, but it is symptomatic of the S2 gap.

**Recommended contract:** Tied to the S2 decision. Under **Option A** (write-through) the prompt **disappears** - there is nothing to "also save." Under **Option B** it should appear **once per session per changed field-class**, cover **everything** it claims to (not bullets-only), and never re-prompt for an edit it can't persist.

---

## Cross-cutting

- **S2 + S5 + S8 + S1(stale-master)** are one contract (the master↔profile write direction). Deciding **Option A vs B** resolves all four. F2 (summary write-through) already shipped as the first Option-A increment.
- **S1(dedup)** and **S7** are independent build items once the contract is set.
- **S3** is a separate product decision (coach scope) + an immediate "fail loudly" fix.

_Author: forensics follow-up 2026-07-15. Spec input; no code or UX changes in this document._

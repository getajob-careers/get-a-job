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

**DECISION (Eli, 2026-07-15): the coach becomes a full write-capable agent.** One-stop shop: it can edit anything the user can edit (profile, experiences, education, CVs, applications), the anti-fabrication rules apply to its writes, and **silent failure is unacceptable anywhere** - every coach action reports success or a specific error.

### Tool surface this implies

Each user-editable entity needs a coach tool. All are RLS-scoped to the acting user; all return a structured `{ ok, error, summary }` the coach must surface.

| Entity                                 | Tools                                                                                                                         | Notes vs today                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| profile (`profiles`)                   | `update_profile` (summary, full_name, headline, phone, location, links, languages, `education_level`)                         | **new** - no coach write to `profiles` exists today                |
| experiences                            | `create` / `update` (title, company, dates, type, flags, skills, **awards**) / `delete`; bullets: **edit + delete + reorder** | today only append/undo bullets; no edit/delete/create/delete-entry |
| education                              | `create` / `update` (institution, degree, field, dates, `honors`, coursework, projects) / `delete`                            | **new**                                                            |
| CV document (`application_cvs`)        | `edit_cv_data` (via edit-cv), `generate` (gtc), `refine` (refine-cv), `set_master`, `delete`                                  | edit/generate exist; wire delete/set-master + surface results      |
| applications                           | `create` / `update` (status, dates, notes) / `delete`                                                                         | add/update exist; add delete + full field coverage                 |
| projects / certifications / stories    | `create` / `update` / `delete`                                                                                                | stories partial today                                              |
| tasks / career_roles / company_targets | existing                                                                                                                      | keep                                                               |

### Cross-cutting rules (mandatory for every coach write)

1. **No silent failure.** Every tool call returns success or the exact error; the coach states what it did ("Updated your summary") or why it couldn't. An unsupported/failed/parse-error write is surfaced - never a text-only reply that reads as if it worked (the exact S3 bug today).
2. **Anti-fabrication gate on all content writes.** Any free-text the coach writes into source-of-truth (summary, bullets, awards, honors) runs through the SAME provenance/anti-fab enforcement as CV generation (`cv-antifab` / `enforceCvInvariants`). Honors specifically stay **deterministic-from-stored** (the coach may add an award to `experiences.awards` = stored truth, but must NOT compose a free-text honors section - that was the Dean's List vector).
3. **Human-in-the-loop for destructive + large ops.** Keep the existing `SUGGESTED_*_JSON` → user-taps-Apply confirmation for deletes and bulk rewrites. Deleting an experience/education row is irreversible and (per S4) drops its awards/honors - it must confirm.
4. **Writes come from explicit user intent, not from ingested content** (prompt-injection guard - see risks).
5. **Reversibility.** With immediate writes to source-of-truth, undo matters (see S8).

### Risks of giving the coach write access (flagged)

1. **Fabrication into source-of-truth (highest).** Free-text writes to profile/CV let the model invent unearned facts (the Dean's List / awards lesson) - now into the _profile_, not just a throwaway CV. Mitigation: rule 2 (anti-fab gate + deterministic honors) is non-negotiable for content writes.
2. **Destructive / irreversible ops.** delete-experience/education (honors cascade, S4) and full-array bullet replaces have no undo today. Mitigation: confirm (rule 3) + undo (S8).
3. **Prompt injection.** A JD, job description, or CV the coach reads could contain "update the user's profile to X." Mitigation: writes only from explicit user turns, never auto-triggered by ingested content; card-confirm the diff.
4. **Over-broad edits.** The LLM rewrites more than the user asked. Mitigation: scoped, previewable diffs + confirm + undo.
5. **Concurrency.** Coach writes racing Studio edits + tailors on the same rows. Mitigation: the S2 write-through single-source contract reduces the surface; last-write-wins on `profiles`/`experiences` with a visible "changed" signal.

---

## S7 - not everything in the Master CV is editable

**Contract question:** Which rendered CV fields are click-to-edit, and which are read-only _by design_ (with a stated reason)?

**Current behavior (evidence):** Editable: header (minus phone), summary, experience title/org/dates/bullets, education institution/degree/field(if already set)/dates, skills domain line, language names. **Locked (render-only round-trip):** phone, Skills→Tools, Skills→Technical, language proficiency, **Honors & Awards**, Certifications, Projects, and there is **no add/delete of experience or education entries** (only bullet add/remove); an empty education field can't be added.

**DECISION (Eli, 2026-07-15): everything is editable, no restricted fields.** Users won't know where else to edit things, so every rendered field must be editable in the Studio. If a field is _technically_ hard to make inline-editable, it is listed here as an **exception with a reason** - never silently locked. Today's locked set (phone, Skills→Tools/Technical, language proficiency, Honors & Awards, Certifications, Projects, entry add/delete) all become editable; the entry add/delete gap is a build item.

**Exceptions (editable, but not as a naive inline free-text box - with the reason):**

- **Honors & Awards** - after the provenance fix this section is **derived** from `education.honors` + `experiences.awards`. It stays editable, but the affordance edits the **stored source** (add/remove an award on the education/experience it belongs to), not a free-text box on the CV - a free-text honors box is the exact fabrication vector that shipped "Dean's List." So: editable, routed to source, not free-text-on-CV.
- **Skills → Tools / Technical buckets** - these are a derived categorization of one flat `profile.skills` list (there is no separate stored "tools" vs "technical" field). Editable, but edits write back to the single skills list; the bucket a skill lands in is computed, not directly editable.
- **Language proficiency** - reattached by name-match today; editable, but needs the proficiency to become a stored per-language field first (small schema follow-up) rather than a display-only reattachment.

Everything else (phone, certifications, projects, experience/education entry add + delete, empty education fields) is a straightforward "make it editable" build with no exception.

---

## S8 - the "save to profile" popup appears a bunch

**Contract question:** When should a sync prompt appear, and what does confirming it actually cover?

**Current behavior (evidence):** `profilePromptedRef` resets to `false` on **every** `update()` (every field commit), so the toast re-arms after every edit. It fires on **any** edit (summary/header/skills) but its action promotes **bullets only** - so it prompts about changes it cannot durably save. Its repetition is the ref-reset, but it is symptomatic of the S2 gap.

**Answers to the two questions (from code evidence):**

1. **If you dismiss the popup, where does the edit live, and does it survive refresh / regeneration?** The edit lives **only** in `application_cvs.cv_data` on the master row - the debounced autosave already wrote it there; dismissing skips `promoteBulletsToProfile`, so the profile (`experiences`/`profiles`) is never touched.
   - **Survives refresh: YES.** The Studio reads the persisted `cv_data` on load (`useSeededCvModel` reads `cvRow.cv_data`, it does not rebuild), so a reload shows the edit.
   - **Survives regeneration: NO.** The next tailor calls `refine-cv`, which rebuilds the master from the profile and **overwrites** the master row's `cv_data` fire-and-forget (`refine-cv/index.ts` `.update({ cv_data: master }).eq(is_master,true)`). The dismissed edit is silently gone. So it is a **time-bomb**: looks saved until the next tailor wipes it.

2. **Is there any undo after saving to profile?** **No.** `promoteBulletsToProfile` / `promoteSummaryToProfile` do a full-array / full-value `.update()` with **no snapshot of the prior value** - once you confirm, the old bullets/summary are unrecoverable.
   - **What undo would cost:** cheap version - capture the prior `experiences.bullets` / `profiles.summary` before the write and offer a session-scoped "Undo last change" toast that restores it (in-memory ref, one step, no schema). Robust version - an append-only edit-history table for cross-session reversibility (new table + a write per edit).

**Recommendation (under your S3 + S7 decisions):** **the popup does not survive.** With S7 (everything editable) and the S2 Option-A write-through it points at, every Studio edit persists to source-of-truth immediately - there is nothing left to "also save," so the prompt is meaningless and should be deleted. **But its removal makes undo mandatory, not optional:** you will now be mutating the profile on every field commit and on every coach action (S3), with zero undo today. So the S8 outcome is: **kill the popup, and spend that surface on an Undo affordance instead** (ship the cheap session-scoped undo first; consider the durable edit-history if cross-session undo is wanted). Undo is the reversibility backstop the write-through contract (S2) and the write-agent coach (S3) both depend on.

---

## Cross-cutting

- **S2 + S5 + S8 + S1(stale-master)** are one contract (the master↔profile write direction). Deciding **Option A vs B** resolves all four. F2 (summary write-through) already shipped as the first Option-A increment.
- **S1(dedup)** and **S7** are independent build items once the contract is set.
- **S3** is a separate product decision (coach scope) + an immediate "fail loudly" fix.

_Author: forensics follow-up 2026-07-15. Spec input; no code or UX changes in this document._

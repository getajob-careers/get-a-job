---
title: CV attribution fix arc — scoped held-PR plan
status: DRAFT — HELD FOR ELI'S REVIEW
owner: eli
last_reviewed: 2026-07-07
consumes: docs/research/cv-attribution-forensic.md
scope: SCOPING ONLY — paper, no code. One held PR per item, ranked by user damage.
---

# CV attribution fix arc

> Scopes the fixes for the confirmed attribution-corruption chain (`cv-attribution-forensic.md`), one
> **held PR per item**, ranked P0→P2. **No code here.** Each item lists its change, opt-in/rollback
> posture, tests, deploy targets, and file-overlap so the eventual builds sequence cleanly. The Profile
> master is the one-source record (IA spec §3.0.2); every item either enforces that or stops a violation.

## Ranking & sequencing at a glance

P0 generation (**A1**, **A2**) → P0 write-back/profile (**A3**, **A4**) → P1 (**A5** wrong-role, **A6**
duplicates) → P2 (**A7** deep-link). **File-overlap to sequence:** A1+A2+A5 all touch
`generate-tailored-cv/index.ts` (+ `reconcile.ts`/`cv-antifab.ts`) — land A1→A2→A5 in that order,
each rebasing. A3+A4 touch the profile/write-back surface (`promoteBulletsToProfile.js`,
`CVStudioLive.jsx`, `Profile.jsx`, `cv-master.ts`) — disjoint from the generation set, can run in
parallel. A6/A7 are disjoint from both.

---

## A1 — P0 · Per-experience attribution verification at reconcile

**Problem:** a valid in-range LLM `index` silently mis-attaches bullets (`reconcile.ts:175-185`); titles
are protected, bullets are not, and nothing verifies the echoed index matches the role the bullets
describe.
**Change:** have the LLM echo a **title/company stub alongside `index`** per experience (gtc prompt
schema, `index.ts:1467-1523`); in `reconcile.ts fillFromSource`, **verify the echoed stub matches the
DB source at that index** before accepting the index-keyed bullets. On mismatch: fall back to positional,
or reject + emit a `reconcileWarnings` `attribution_mismatch` (new) so it's observable — never silently
trust an in-range index again.
**Posture:** behind a flag (`cv_reconcile_verify`) for a bake-off; default OFF → today's behavior.
**Tests:** a fixture where the model emits swapped indices → the check catches it and the wrong-index
bullets do NOT land under the wrong title; the honest case is unchanged; a warning is emitted on mismatch.
**Deploy:** `generate-tailored-cv`. **Overlap:** `reconcile.ts` + `index.ts` (prompt) — base of the
generation chain; land first.

## A2 — P0 · Attribution-aware anti-fab (ground each bullet against ITS OWN experience)

**Problem:** `enforceBulletProperNouns` grounds against **one flat corpus of all experiences**
(`index.ts:2387`, `cv-antifab.ts:449`) → blind to cross-experience swaps.
**Change:** ground each bullet against a **per-experience corpus** (that experience's
`responsibilities`+`bullets`, plus shared skills/proof/projects) rather than the flat haystack. A
Guardio bullet under Get A Job then fails to ground against Get A Job's own corpus and is
flagged/reverted-to-master. Build per-experience haystacks in gtc; pass the matching one per bucket into
the gate. Mirror in the edit-cv gate (`cv-antifab.ts:375` is already per-entry index-matched — make it
attribution-checking, not just index-matched).
**Posture:** behind a flag (`cv_antifab_attribution`), **bake-off required** — tighter grounding may
flag legitimate cross-references (e.g. "partnered with <other employer>"); measure false-flag rate
before default-ON.
**⚠️ Caveat — revert-to-master is only trustworthy when the master is itself verified clean.** A2's
fallback reverts a flagged bullet to its master value; but **Eli's own master was corrupted** (the swap
lived in the master too), so reverting against a dirty master would have _re-injected_ the swap. Sequencing
dependency: A2's revert-to-master must be gated on a clean master (A1's attribution check at generation +
A3/A4 keeping the master honest) — never treat revert-to-master as a standalone repair.
**Tests:** cross-experience swap is flagged; a legitimately shared skill token still grounds; idempotent.
**Deploy:** `generate-tailored-cv` (+ `edit-cv` if the gate is shared). **Overlap:** `cv-antifab.ts` +
`index.ts` (haystack build) — rebase on A1.

## A3 — P0 · promoteBulletsToProfile integrity check (stop the write-back corruption)

**Problem:** `promoteBulletsToProfile.js:39-46` overwrites **all** experiences' `bullets[]` by
`experience_id` with **no check** the pairing is intact; `edit-cv/index.ts:98-119` can hand back a broken
pairing.
**Change:** before writing, **verify each `cv_data` experience's `experience_id`↔bullets pairing** — the
entry's `company`/`title` must match the `experiences` row at that `experience_id`, and (reusing A2's
per-experience grounding) the bullets must ground against that row's own corpus. **Skip/flag** mismatched
entries rather than writing them; only promote verified pairs. Also add an integrity guard on
`edit-cv`'s returned `cv_data` (assert each `experience_id` still carries its own experience's content).
**Posture:** additive guard; no flag needed (it only _prevents_ bad writes) — but log skipped entries.
**Tests:** a swapped `cv_data` → promote writes **nothing** for the mismatched rows (no corruption); a
clean `cv_data` → promotes normally; the "promote all vs only-touched" amplifier is narrowed to
verified rows.
**Deploy:** frontend (`promoteBulletsToProfile.js`) via Vercel + `edit-cv`. **Overlap:** profile/
write-back surface — parallel to the generation set.

## A4 — P0/P1 · Split-brain resolution — `bullets` is CANONICAL (DECIDED 2026-07-07)

**Problem:** Profile edits `experiences.responsibilities`; the master builder reads `experiences.bullets`
**first** (`cv-master.ts:225-231`); the only writer of `bullets` is the studio popup
(`promoteBulletsToProfile.js:40`); and the Profile bullets editor that `20260617_experiences_bullets.sql`
promised was **never built** (`Profile.jsx:540`). → after one promote, Profile edits stop reaching the CV
("Profile is a dead-end editor").

**DECISION (Eli, 2026-07-07): Option A — `bullets[]` is the single canonical source.**

1. **`bullets[]` is canonical** for experience bullets. **`responsibilities` becomes read-only legacy** —
   retained as a fallback for display + master-build **only when `bullets` is empty**. The current
   `cv-master.ts:225-231` read order already does exactly this → **keep it as-is (no read-order change).**
2. **Build the missing Profile bullets editor** (the one the migration promised): per-experience
   bullet-list editing on the Profile page (`Profile.jsx`), writing `experiences.bullets`. This is the
   structural one-source fix — Profile edits now land in the canonical field the CV reads, closing the
   dead-end-editor complaint.

**Migration question — SCOPE, do NOT decide (Eli's call at build time).** 36 real users currently hold
`responsibilities` only (zero `bullets[]` — the population scan). Two ways to onboard them to the
canonical field:

- **(i) Seed `bullets` from `responsibilities`** (split on newlines) at the editor's first open.
  _Trade-off:_ immediate one-field cleanliness, but a bad auto-split **pollutes the canonical field**
  (responsibilities prose isn't reliably one-bullet-per-line) and is awkward to reverse.
- **(ii) Keep the empty-`bullets` fallback read; let `bullets` populate organically** as users edit.
  _Trade-off:_ zero pollution risk, but the **two-field read persists indefinitely** and un-edited users
  never gain structured bullets.

Flag both for Eli at build time; **do not auto-seed without his sign-off.**

**Folded-in dependencies (resolved by making `bullets` canonical + shipping the editor):**

- **A3 integrity guard (dependency).** Once Profile edits `bullets` directly, the studio→profile promote
  is no longer the _only_ `bullets` writer — A3 and A4 must share one invariant ("an experience's
  `bullets` belong to that experience"). **Build A3 first / together with A4.**
- **Profile-save → master rebuild (finding ④).** Today no profile-write path rebuilds the `is_master`
  row (only a tailor does, `refine-cv:723`). With `bullets` canonical + a real Profile editor, a Profile
  save **must refresh the master** (deterministic `buildMasterCvData`, sub-ms) so edits reach the CV
  **without** waiting for a tailor. Add a profile-save → master-refresh trigger.
- **Popup copy/mislabel (finding ⑦).** The studio "save these bullet **edits** to your profile" toast is
  currently misleading (fires on any master-field edit; only `bullets` write back). Once `bullets` is
  canonical **and** the Profile editor exists, the copy becomes **accurate**, and the toast's role
  shrinks (Profile now edits bullets directly) — narrow it to genuine studio-side bullet edits + add the
  session dedup that finding ⑦'s fatigue needs.

**⚠️ Also required — a from-nothing master mint (found live 2026-07-07).** After Eli's corrupted master
`application_cvs` row was deleted, **no trigger re-minted it** — zero `is_master` rows for `4b243f3a`.
All three mint paths are gated: the Studio empty-state "Build my master CV" button renders **only when
`cvOptions.length === 0`** (`CVStudioLive.jsx:688`) → suppressed the moment any tailored CV exists; gtc
mints only in `isMasterMode` (`gtc:2779`) → a _tailored_ gen never mints; `refine-cv` mints on every
tailor (insert-first, `refine-cv:723-751`) but only when a Studio "Tailor" runs. → the
**"has-tailored-CVs-but-no-master" state has no passive mint.** A4 must add a **robust from-nothing mint**
— e.g. Studio mints the master on load when `is_master` is absent, **regardless of tailored-CV presence**,
idempotent against the partial-unique index. **Interim re-mint for Eli today:** run a Studio "Tailor" on
any app.

**Posture:** append-only migration + Profile editor UI + the profile-save→master-refresh trigger + the
mint-on-load, behind a rollout flag. **Rollback = keep the two-column fallback read until baked** (it is
already the read order, so rollback is low-risk).
**Tests:** a Profile bullet edit reaches the CV **without** a tailor; the empty-`bullets` fallback still
serves `responsibilities`; the mint-on-load fires for a has-tailored-no-master account; no split-brain
divergence; migration reversible.
**Deploy:** frontend (`Profile.jsx`, `CVStudioLive.jsx`) via Vercel + edge (`refine-cv`/`gtc`/`cv-master`
as touched) + a migration (MCP `apply_migration`). **Overlap:** `cv-master.ts`, `Profile.jsx`,
`CVStudioLive.jsx`, `promoteBulletsToProfile.js` — **coordinate with A3**; parallel to the generation set
(A1/A2/A5).

## A5 — P1 · Close the #505 wrong-role residual gaps

**Problem:** authoring uses `safeTargetRole`, never reassigned to the resolved app's role; #505 only
reconciles inside its guard; the label backstop masks the mismatch (forensic ③).
**Change:** **server-authoritative authoring reconcile in gtc** — when `application_id` resolves to a
real owned app, author to that app's `role_title` (not the caller's `target_role`), mirroring the label
fix (`index.ts:2750`). Handle the no-`application_id` coach path and the A/B mismatch (reject/flag when
the proposal's `application_id` ≠ the conversation's `effectiveApplicationId`). Optionally surface a
"generating for <role> — not the role you asked?" confirmation instead of silently masking.
**Posture:** behind a flag (`gtc_author_from_app`); default OFF → today.
**Tests:** linked-app generation authors + labels for the app's role; the A/B mismatch is caught; the
no-app path degrades safely.
**Deploy:** `generate-tailored-cv` (+ `ai-chat`/coach). **Overlap:** `index.ts` — rebase after A1/A2.

## A6 — P1 · Duplicate-fire guard scope + retry-orphan fix

**Problem:** #489's `cvFiredRef` covers the provider path only; the full-page `ChatInterface`
(`handleGenerateCV:989-991`) has a local-state guard; and retry-orphans fire even on the covered path
because the created app id is never written back (`coachActionHandlers.js:743-750`).
**Change:** (a) **extend the durable single-fire guard** to the full-page ChatInterface path (share the
`cvFiredRef` concept or a keyed guard); (b) **retry-orphan fix** — write the created `application_id`
back into the proposal (`suggestedApplicationActions`/`proposal.application_id`) so a retry **UPDATEs**
the existing app instead of `applyApplicationActions` (`:193`) minting a new `chat_agent` row; and/or
**dedupe** `add_application` on `(company, role_title, source)` before insert. (c) Give gtc's INSERT
branch (`:2759`) a `source` so orphans are attributable, not `NULL`.
**Posture:** guard additions are safe; the id-writeback is the core fix.
**Tests:** a retry after a gtc failure does NOT create a second app; a cross-surface concurrent fire is
single; a manual add stays `source='manual'` and distinct.
**Deploy:** frontend (`coachActionHandlers.js`, `ChatInterface.jsx`, `CoachConversationContext.jsx`) via
Vercel + `generate-tailored-cv` (the INSERT `source`). **Overlap:** disjoint from A1–A5.

## A7 — P2 · Studio deep-link remount / re-read fix

**Problem:** `paramAppliedRef` one-shot latch (`CVStudioLive.jsx:66,94`) + static-path route key
(`App.jsx:124 key={path}`) → an incoming `?application_id` is swallowed when Studio is already mounted.
**Change:** make the deep-link **re-read on `searchParams` change** — either reset `paramAppliedRef` when
the param actually changes, or drop the latch and drive selection from a `useEffect([searchParams])` that
switches the open CV (respecting unsaved-edit guards), and clear the URL param on consumption
regardless. (Keying the route by the query string is an alternative but forces a full remount — heavier.)
**Posture:** UI-only; behind a flag if desired; rollback trivial.
**Tests:** "Open in Studio" for app B while app A is open switches to B; the URL param is cleared; no
double-consumption.
**Deploy:** frontend via Vercel. **Overlap:** disjoint.

---

## Standing rituals (every item)

Own held PR; opt-in flag where noted (default OFF); full gates (`deno check` no-new-errors, `npm test`,
`npm run build`, `npm run lint`); surgical edits (Python for dense files); the edge-deploy ritual at
merge (pull-main → grep-local → deploy → grep-live-artifact — Eli's manual step); migrations via MCP
`apply_migration` (append-only); no merges without Eli's review.

## Decisions

**A4 (canonical field) — DECIDED 2026-07-07: Option A, `bullets` is canonical** (build the Profile
bullets editor; `responsibilities` = read-only fallback). One open sub-question deferred to build time:
the responsibilities→bullets **migration strategy** (seed-on-first-open vs organic-populate — see A4).
All seven items are now scoped and ready to build (order per §Ranking).

---

_Fix-arc DRAFT. HELD for Eli's review. No code changed._

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

## A4 — P0/P1 · Split-brain resolution (one field, one editor) ⚠️ needs Eli's decision

**Problem:** Profile edits `responsibilities`; master reads `bullets` first; only the popup writes
`bullets`; the Profile bullets editor was never built (`Profile.jsx:540`, `cv-master.ts:225-231`,
`promoteBulletsToProfile.js:40`, `20260617_experiences_bullets.sql`). Profile edits die after one
promote.
**Decision required — which field is canonical:**

- **Option A (recommended): `bullets` is canonical; build the Profile bullets editor.** Profile edits
  `bullets` directly; `responsibilities` becomes a legacy/import field (or is backfilled from `bullets`).
  Matches the migration's original intent and the master's read order — one editor, one field.
- **Option B: `responsibilities` is canonical; master reads it, drop the `bullets` preference.** Simpler
  code, but discards the structured-bullets model the studio relies on.
  **Change (Option A):** a Profile bullets editor UI + a migration/backfill reconciling the two columns +
  `cv-master` reads one field. **This is the structural one-source fix** — it also neutralizes A3's
  amplifier and the "Profile is a dead-end editor" complaint.
  **Posture:** migration + UI; behind a feature flag for rollout; rollback = keep both columns until baked.
  **Tests:** a Profile edit now reaches the CV; no split-brain divergence; migration is reversible.
  **Deploy:** frontend + a migration (MCP `apply_migration`, append-only). **Overlap:** `Profile.jsx`,
  `cv-master.ts` — parallel to generation; **coordinate with A3** (both touch the write-back semantics).

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

## Open decision for Eli

**A4 (canonical field)** — Option A (`bullets` + build the Profile editor) vs Option B (`responsibilities`
canonical). This gates the split-brain build and shapes A3's integrity check. Everything else is scoped
and ready.

---

_Fix-arc DRAFT. HELD for Eli's review. No code changed._

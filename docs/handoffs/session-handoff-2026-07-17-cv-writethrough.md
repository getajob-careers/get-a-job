# Handoff — CV Studio Option-A write-through (Step 2, wiring phase)

Written 2026-07-17 for a FRESH session to pick up the Studio wiring with full
context. The careful-state-lifecycle work (routing ~15 field commits to source
rows, live on a real product) deserves clean context — that's why this is a
handoff, not a push-through.

## Where we are

CV completion arc, Step 2 (Option-A write-through per `docs/product/cv-studio-contracts.md`).
Build order (Eli): **schema foundation → write-mediation layer → Studio wiring.**
First two are DONE and committed; the wiring is what remains.

### Branch state

- **`eli/cv-studio-schema-foundation`** → **PR #610 (HELD, CI green).** Migration
  applied live + verified: `profile_edits` audit table, `experiences.updated_at` +
  `application_cvs.updated_at` (+ `set_updated_at` triggers), `profiles.headline`.
  `database.types.ts` regenerated. Migration file
  `supabase/migrations/20260717_cv_studio_writethrough_foundation.sql`.
- **`eli/cv-studio-writethrough`** (branched ON TOP of the foundation; NOT yet a
  PR). One commit `713194b`: the shared write-mediation layer.
  - `supabase/functions/_shared/write-mediation.ts` — the isomorphic core:
    `FIELD_ROUTES`, `runMediatedWrite(db, input)` (the ONE algorithm both paths
    run), `buildAuditRow`, `concurrencyDecision`, `isDestructive`, `TABLE`,
    `WriteDb`/`MediateInput`/`UndoToken` types.
  - `src/lib/writeProfileEntity.js` — thin client adapter + `undoProfileWrite`.
  - `src/test/writeProfileEntity.test.js` — 6 tests green: **dual-path
    equivalence** + the **summary-loss undo story** (Eli's two named acceptance
    tests). Equivalence is STRUCTURAL (both paths call `runMediatedWrite`), not
    just asserted — Eli called this "better than the requirement."

**Start the wiring on `eli/cv-studio-writethrough`** (continue the same branch;
it already has the layer + the regenerated types it needs).

## The write layer API (what the wiring calls)

```js
import { writeProfileEntity, undoProfileWrite } from "@/lib/writeProfileEntity";

// per field commit on the MASTER:
const res = await writeProfileEntity(supabase, {
  userId,
  field: "summary",
  entityId: null /* or exp/edu row id */,
  newValue,
  baseVersion /* the updated_at loaded */,
  source: "studio",
});
// res: { ok, error, conflict, needsConfirm, prior_value, new_value,
//        current_value, current_version, undo_token, audit_ok }
// MUST surface error/conflict/needsConfirm — never a silent no-op.

await undoProfileWrite(supabase, { userId, undoToken: res.undo_token });
```

`FIELD_ROUTES` keys (the valid `field` values): `summary, headline, full_name,
location, linkedin, phone, languages, skills, exp_title, exp_company, exp_bullets,
exp_awards, edu_institution, edu_degree, edu_field, edu_honors`. **`dates` and
`email` are deliberately ABSENT (loud exceptions)** — `writeProfileEntity` returns
`ok:false` with a "no write route" error rather than dropping them.

## The ~15 wiring sites (all in `src/components/cv-studio/CVStudioLive.jsx`)

Today every handler funnels through `update()` (`:257`) → `persist()` (`:179`),
which writes `application_cvs.cv_data` ONLY. The master (`savedCv?.isMaster`) also
already does summary write-through (`promoteSummaryToProfile`, `:213`) + the bullets
popup (`:226-251`). The job: for the MASTER, route each field commit to its source
row via `writeProfileEntity`; keep `cv_data` as a re-derived cache. **Tailored CVs
(`is_master=false`) stay documents — cv_data-only, unchanged (Requirement 3).**

| #   | field → route                       | handler (CVStudioLive)  | view prop                             | notes                                                        |
| --- | ----------------------------------- | ----------------------- | ------------------------------------- | ------------------------------------------------------------ |
| 1   | name → `full_name`                  | onPatchHeader `:269`    | onPatchHeader({name}) `View:618`      |                                                              |
| 2   | headline → `headline`               | onPatchHeader `:269`    | ({headline}) `:625`                   | column was SILENTLY DEAD until #610                          |
| 3   | email → **LOUD EXCEPTION**          | onPatchHeader `:269`    | ({email}) `:632`                      | no profiles column (auth-owned); read-only + pointer         |
| 4   | linkedin → `linkedin`               | onPatchHeader `:269`    | ({linkedin}) `:638`                   | col `linkedin_url`                                           |
| 5   | location → `location`               | onPatchHeader `:269`    | ({location}) `:644`                   |                                                              |
| 6   | summary → `summary`                 | onPatchSummary `:271`   | onPatchSummary `:652`                 | MIGRATE off promoteSummaryToProfile to writeProfileEntity    |
| 7   | exp title → `exp_title`             | onPatchExp `:274`       | onPatchExp(section,id,{title}) `:108` | entityId = the exp source-row id (see "experience_id" below) |
| 8   | exp company → `exp_company`         | onPatchExp `:274`       | ({org}) `:114`                        |                                                              |
| 9   | exp dates → **LOUD EXCEPTION**      | onPatchExp `:274`       | ({dates}) `:121`                      | read-only-from-source this PR                                |
| 10  | bullet edit → `exp_bullets`         | onPatchBullet `:279`    | onPatchBullet `:135`                  | full-array write                                             |
| 11  | add bullet → `exp_bullets`          | onAddBullet `:293`      | onAddBullet `:151`                    | additive                                                     |
| 12  | remove bullet → `exp_bullets`       | onRemoveBullet `:302`   | onRemoveBullet `:141`                 | DESTRUCTIVE → needsConfirm                                   |
| 13  | reorder exp → **see FLAG**          | onDragEnd `:311`        | onDragEnd `:175`                      | experiences has NO display_order column                      |
| 14  | edu institution → `edu_institution` | onPatchEdu `:320`       | onPatchEdu(id,{institution}) `:715`   | entityId = edu.id                                            |
| 15  | edu degree → `edu_degree`           | onPatchEdu `:320`       | ({degree}) `:723`                     | col `degree_type`                                            |
| 16  | edu field → `edu_field`             | onPatchEdu `:320`       | ({field}) `:735`                      |                                                              |
| 17  | edu dates → **LOUD EXCEPTION**      | onPatchEdu `:320`       | ({dates}) `:743`                      | read-only                                                    |
| 18  | skills → `skills`                   | onPatchSkills `:325`    | onPatchSkills `:755`                  | see "skills" FLAG (buckets→flat list)                        |
| 19  | languages → `languages`             | onPatchLanguages `:333` | onPatchLanguages `:777`               | names only today                                             |

## Blocking sub-problems to solve DURING wiring (flags)

1. **experience_id must reach the handler.** Write-through of an experience field
   needs the source-row id. `buildMasterCvData` stamps `experience_id` on each
   entry (via `stampSourceId`/`sourceIds`); `cvDataAdapter.mapExpIn` preserves the
   original entry as `__src`. VERIFY the id survives into the editor model and is
   available in `onPatchExp`/`onPatchBullet`. If the master row's cv_data lacks
   `experience_id` for some entries (older masters), the write must surface "can't
   attribute this to a source row" (spec S2: "an edit that can't be attributed is
   surfaced, not dropped"), NOT silently write cv_data only.
2. **Reorder (#13) has no persistent home.** `experiences` has NO `display_order`
   column (only `education` does). Options: (a) add `experiences.display_order`
   (another tiny migration) and route reorder to it, or (b) make reorder a LOUD
   exception this PR. RECOMMEND asking Eli; (a) is cleaner but adds schema.
3. **Skills buckets → flat list (S7 exception).** The CV shows `skills.{domain,
tools,technical}` (a computed categorization of one flat `profiles.skills`).
   Editing any bucket must write back to the single flat list; the bucket is
   recomputed, not stored. The `skills` route points at `profiles.skills` — the
   wiring must merge the edited bucket back into the flat list before writing.
4. **Language proficiency (S7 exception).** Needs a stored per-language field
   first (small schema follow-up) — defer proficiency editing, keep names.

## The 6 remaining items

1. **Edge entry point** `supabase/functions/write-profile-entity/index.ts` — thin
   adapter over `runMediatedWrite` with a service-role `WriteDb` + the anti-fab
   `gateContent` for content fields. Coach's FUTURE path (coach tools are NOT this
   arc); build + deploy it now so equivalence is locked and it's ready. Deploy via
   the `deploy-edge-fn` skill. (Optional-ish: if scoping tight, it can be a
   follow-up since no consumer exists yet — but Eli emphasized both entry points
   exist, and the equivalence test already imports the core both ways.)
2. **Studio write-through wiring** — the table above. Master only; tailored stays
   documents; the two modes must be VISIBLY signalled in the UI (Requirement 3).
3. **Session undo + delete the S8 popup.** Undo: keep a small in-memory stack of
   `undo_token`s in CVStudioLive; expose "Undo last change". Delete the popup:
   remove `CVStudioLive.jsx:226-251`, `profilePromptedRef` (`:175` decl + `:263`
   reset), and the now-unused `promoteBulletsToProfile` import (`:34`). Undo is
   BLOCKING in this PR (Req 1) because write-through now mutates source-of-truth on
   every commit.
4. **S7 editability** for the locked fields (phone, certifications, projects,
   experience/education entry add+delete, empty edu fields) + the 3 exceptions
   (honors→source, skills buckets→flat, language proficiency→deferred).
5. **Loud date exception** — make master dates READ-ONLY-FROM-SOURCE with a UI
   pointer ("dates come from your profile — edit them there"). A silent no-op date
   edit would recreate the exact bug class this arc kills (Eli, explicit). Same for
   email (#3). The structured date affordance is the named resolution on the
   design-port Studio work list.
6. **#546 cold-load browser test (OBLIGATION, not optional).** This change is
   precisely which-effect-writes-what-when on a live product. Before holding: drive
   the Studio on COLD load with a warm react-query cache, edit a master field,
   confirm it persists to the SOURCE row (not just cv_data), confirm undo restores
   - both writes hit `profile_edits`, confirm a tailored CV edit does NOT touch the
     profile, confirm zero console/pageerror. Unit tests + typecheck are necessary
     but NOT sufficient (the #546 lesson: passed unit tests, hard-broke on cold load).
     Route: `/_preview/*` or however the Studio (CVStudioLive) is reached — confirm
     at build time.

## refine-cv note (no change, but verify)

`supabase/functions/refine-cv/index.ts:734-755` rebuilds the master from the
profile every tailor and overwrites the master `application_cvs.cv_data`
fire-and-forget. Under write-through this becomes SAFE (the master is re-derived
from source rows that now hold every edit). Verify it doesn't clobber a
just-written edit due to timing; no code change expected.

## Rituals

Held PR (pr-conventions). No em dashes in the PR body. Squash-merge + delete
branch as separate steps AFTER Eli's review. The migration PR #610 should merge
FIRST (or together) since the writethrough branch depends on its schema/types.
`npm test && npm run build && npm run lint` green; CI green on the PR (not just
local). Memory: `[[cv-completion-arc]]`.

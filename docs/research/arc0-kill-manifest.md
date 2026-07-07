# ARC-0 Kill Manifest — execution-ready deletion checklist

> READ-ONLY reconnaissance output. Re-verified against current `main` on **2026-07-06**.
> Every verdict below is grounded in a live grep and/or a live query against Supabase
> project `ilmqmodklutztuybsvwd`. Execute in a **held PR**. Nothing here has been changed.
>
> Legend: **PURE-DROP** = delete only the named artifact(s), no other code touched ·
> **CODE-CHANGE-REQUIRED** = a live code reference or dependent object must change first ·
> **REMOTE-UNDEPLOY** = `supabase functions delete <slug>` (no local file to remove) ·
> **STOP** = do NOT delete as-is; has a live caller / dependency.

## Live ground-truth snapshot (2026-07-06)

- Row counts (live `count(*)`): `campaign_sends`=**36**, `waitlist_signups`=**0**,
  `calendar_events`=**0**, `cv_templates`=**0**, `job_suggestions`=**0**.
- Deployed edge functions (live `list_edge_functions`): `generate-application-tasks` (v35),
  `generateApplicationTasks` (v35), `generateTailoredCV` (v37), `send-waitlist-email` (v8)
  are **ACTIVE**. `send-reengagement` is **NOT in the deployed list** (confirmed not deployed).
- FK dependencies discovered: `applications.custom_template_id → cv_templates` (`fk_custom_template`);
  `calendar_events.application_id → applications`. No incoming FKs on `job_suggestions`,
  `waitlist_signups`, `campaign_sends`, or the rollback table.

---

## A. Three legacy remote-only edge functions — **REMOTE-UNDEPLOY, safe**

Targets: `generate-application-tasks`, `generateApplicationTasks`, `generateTailoredCV`.

**Verdict: CONFIRMED-no-caller (all three).** Deployed remotely but no local source and no invoke anywhere.

Evidence:

```
# no local dirs
ls -d supabase/functions/{generate-application-tasks,generateApplicationTasks,generateTailoredCV}
  → all "no such file"

# only references are config.toml blocks (no invoke strings anywhere):
grep -rn '"generate-application-tasks"|generateApplicationTasks"|"generateTailoredCV"|/generate-application-tasks|/generateApplicationTasks|/generateTailoredCV' \
  src/ supabase/functions/ extension/ scripts/ .github/
  → NONE
```

> **CAUTION — name collision, do NOT grep-delete blindly.** The kebab slug `generate-tailored-cv`
> is a LIVE function (v143, heavily used). The camelCase JS symbols `generateTailoredCV` /
> `generateTailoredCVLinked` in `src/lib/coachActionHandlers.js`, `ChatInterface.jsx`,
> `CoachConversationContext.jsx`, and the `src/test/coach*` files are **local JS functions**
> that call the LIVE kebab `generate-tailored-cv` — they are NOT the doomed `generateTailoredCV`
> edge-fn slug. Leave every one of those untouched. Only the exact deployed slug dies.

Deletion touches (per fn):

- REMOTE-UNDEPLOY: `supabase functions delete generate-application-tasks --project-ref ilmqmodklutztuybsvwd`
- REMOTE-UNDEPLOY: `supabase functions delete generateApplicationTasks --project-ref ilmqmodklutztuybsvwd`
- REMOTE-UNDEPLOY: `supabase functions delete generateTailoredCV --project-ref ilmqmodklutztuybsvwd`
- `supabase/config.toml`: remove block **lines 39–40** (`[functions.generate-application-tasks]`),
  block **lines 52–53** (`[functions.generateApplicationTasks]`), block **lines 55–56**
  (`[functions.generateTailoredCV]`), and the now-orphaned comment **line 51**
  (`# Legacy camelCase duplicates still deployed — keep covered until retired.`).
- `database.types.ts`: none (functions aren't typed there).
- Workflows: none.

---

## B. `send-reengagement` edge fn + `campaign_sends` table — **safe (fn PURE-DELETE; table PURE-DROP)**

**Verdict: CONFIRMED-no-caller.** Function has local source (564 LOC) but is not deployed and
nothing invokes it. `campaign_sends` is written **only** by this function (7 refs, all inside
`send-reengagement/index.ts`).

Evidence:

```
grep -rn "send-reengagement" src/ extension/ scripts/ .github/workflows/
  → NONE (only its own index.ts + config.toml:61)
grep -rn "campaign_sends" src/ extension/ scripts/ .github/workflows/
  → NONE (only send-reengagement/index.ts lines 19,384,419,426,492,535,548)
grep -n "campaign_sends" src/lib/database.types.ts
  → NOT in database.types.ts   ← nothing to remove there
```

Deletion touches:

- Delete dir: `supabase/functions/send-reengagement/` (`index.ts`, 564 LOC). Not deployed → **no remote undeploy needed.**
- `supabase/config.toml`: remove **lines 58–62** (comment `# Admin-only reengagement…` + the
  `[functions.send-reengagement]` block).
- Table drop (new migration): `DROP TABLE public.campaign_sends;` — the table was created by
  `supabase/migrations/20260617_campaign_sends.sql`. No incoming FKs. **PURE-DROP.**
- `database.types.ts`: no `campaign_sends` entry exists (already absent) — no edit needed.

---

## C. `send-waitlist-email` edge fn + `waitlist_signups` table — **safe; header comment is STALE**

**Verdict: CONFIRMED-no-caller. The "Login.jsx fires it" claim is FALSE / stale.**

The function's own header (`send-waitlist-email/index.ts:5-6`) says it is "fired fire-and-forget
from Login.jsx's `handleWaitlistSubmit` AFTER the waitlist_signups insert succeeds." Ground-truth:

Evidence:

```
# Login.jsx has ZERO invoke / ZERO .from() / ZERO waitlist DB write:
grep -n "handleWaitlistSubmit|invoke|functions\.|waitlist_signups|send-waitlist|from(" src/pages/Login.jsx
  → NONE  (no handleWaitlistSubmit exists; form uses handleSubmit; no .invoke anywhere in the file)
# Login.jsx only mentions waitlist in comments (lines 14, 64, 327) — the "inline waitlist form" is
#   just the signup form; it does not write waitlist_signups nor call send-waitlist-email.

# Landing.jsx waitlist submit is a localStorage stub (confirmed):
src/pages/Landing.jsx:1190-1204  → console.warn + localStorage.setItem("gaj.waitlist", …); NO edge-fn call.

# waitlist_signups appears in code ONLY in the types file:
grep -rn "waitlist_signups" src/ supabase/functions/  → only src/lib/database.types.ts:1906
#   (+ descriptive comments inside send-waitlist-email/index.ts itself)
```

Deletion touches:

- REMOTE-UNDEPLOY: `supabase functions delete send-waitlist-email --project-ref ilmqmodklutztuybsvwd`
  (it IS deployed, v8, verify_jwt=true).
- Delete dir: `supabase/functions/send-waitlist-email/` (`index.ts`, 119 LOC).
- `supabase/config.toml`: **no block to remove** (there is no `[functions.send-waitlist-email]` entry).
- Keep `supabase/functions/_shared/send-email.ts` (shared with `send-welcome-email`; only a
  stale comment mentions send-waitlist — optionally scrub that comment).
- Table drop (new migration): `DROP TABLE public.waitlist_signups;` — 0 rows, no incoming FKs. **PURE-DROP.**
- `database.types.ts`: remove the `waitlist_signups: { … }` block at **line 1906** (or regenerate types).

> Note: `send-welcome-email` is a DIFFERENT, live function (called by Onboarding.jsx). Do not touch it.

---

## D. Empty tables `calendar_events`, `cv_templates`, `job_suggestions`

### D1. `calendar_events` (0 rows) — **STOP: LIVE code, do NOT drop**

**Verdict: FOUND-CALLER — live read AND write.** The 0-row count is just "no user has added an
event yet," not deadness. Dropping it breaks the Calendar Add-Event feature.

Evidence:

```
src/components/calendar/AddEventDialog.jsx:66  await supabase.from("calendar_events").insert({...})   ← live WRITE
src/pages/Calendar.jsx:116                      .from("calendar_events")                              ← live READ
src/pages/_preview/fixtures/calendar.js:3       fixture keyed on calendar_events
scripts/cleanup-harness-contamination.mjs:104,188  operational cleanup references it
```

Also has FK `calendar_events.application_id → applications`. **Recommendation: exclude from the
kill PR.** If truly desired later, it is CODE-CHANGE-REQUIRED (remove AddEventDialog + Calendar
event rendering + fixtures first).

### D2. `cv_templates` (0 rows) — **CODE-CHANGE / DB-CHANGE-REQUIRED (dependent FK), not a pure drop**

**Verdict: no `.from()` caller, BUT a dependent FK exists.** No code reads/writes it, but the
`applications` table carries `custom_template_id` with FK `fk_custom_template → cv_templates`.

Evidence:

```
grep -rn "custom_template|template_id|cv_template" src/ supabase/functions/ scripts/ extension/
  → no code refs to the column at all (custom_template_id is unused everywhere)
database.types.ts: cv_templates block at line 614; FK ref at line 194 (applications.Relationships)
Live FK: applications.custom_template_id → cv_templates (fk_custom_template)
```

Drop sequence (single migration):

1. `ALTER TABLE public.applications DROP CONSTRAINT fk_custom_template;`
2. `ALTER TABLE public.applications DROP COLUMN custom_template_id;` (unused; all NULL — verify with a count first)
3. `DROP TABLE public.cv_templates;`

- `database.types.ts`: remove the `cv_templates` block (**line 614**) **and** the
  `fk_custom_template` relationship on `applications` (**line ~190–196**), and drop
  `custom_template_id` from the applications Row/Insert/Update types. Safest: regenerate types.

### D3. `job_suggestions` (0 rows) — **PURE-DROP**

**Verdict: CONFIRMED-no-caller.** Only outgoing FK to `auth.users`; no incoming FK; no `.from()`.

Evidence:

```
grep -rn "job_suggestions" src/ supabase/functions/ extension/ scripts/
  → only src/lib/database.types.ts:1092
```

Deletion touches:

- Table drop (new migration): `DROP TABLE public.job_suggestions;` **PURE-DROP.**
- `database.types.ts`: remove `job_suggestions` block at **line 1092** (or regenerate).
- Side note (out of scope, FYI): `supabase/config.toml:26` has an orphan
  `[functions.generate-job-suggestions]` block for a function that is neither deployed nor has
  local source — candidate for a later sweep, not this PR.

---

## E. `src/pages/Tracker.jsx` (286 LOC) + `_preview/tracker` harness — **safe; multi-file removal**

**Verdict: dead in production (redirect-only live route), mounted ONLY by the preview harness.**

Evidence:

```
# production /Tracker route resolves to TrackerRedirect, NOT Tracker.jsx:
src/pages.lazy.js:50  import TrackerRedirect from "./pages/TrackerRedirect";
src/pages.lazy.js:81  Tracker: TrackerRedirect,          ← live route target

# the ONLY importers of Tracker.jsx:
src/pages.config.js:67          import Tracker from './pages/Tracker';   (vestigial PAGES map)
src/pages/_preview/TrackerPreview.jsx:25  import Tracker from "@/pages/Tracker";

# TrackerPreview is mounted only behind SHOW_PREVIEW_ROUTES (dead-stripped in prod):
src/App.jsx:44   import TrackerPreview from '@/pages/_preview/TrackerPreview';
src/App.jsx:234-239  {SHOW_PREVIEW_ROUTES && <Route path="/_preview/tracker/:state" element={<TrackerPreview/>} />}
```

Deletion touches (all required together — TrackerPreview imports Tracker.jsx, so both go):

- Delete file: `src/pages/Tracker.jsx`
- Delete file: `src/pages/_preview/TrackerPreview.jsx`
- `src/App.jsx`: remove import **line 44** and the preview `<Route>` block **lines 234–239**.
- `src/pages.config.js`: remove import **line 67** (`import Tracker from './pages/Tracker'`) and
  the PAGES entry **line 95** (`"Tracker": Tracker,`). (Also update the now-stale comments at
  62–66 referencing the Tracker harness.)
- Optional cleanup: stale comments in `src/pages.lazy.js:45-47,79-80` and
  `src/pages/TrackerRedirect.jsx:9` that say "Tracker.jsx + TrackerPreview stay in the repo."
- Optional: `src/pages/_preview/fixtures/*` tracker fixture if TrackerPreview is its only consumer
  (verify before removing).
- `database.types.ts`: none.

> **Trade-off to accept:** deleting Tracker.jsx removes the kanban regression harness
> (`/_preview/tracker/:state`). Production is unaffected (it already uses TrackerRedirect).

---

## Related items named by deep-qa-3

- **`campaign_sends` orphan telemetry** — same kill as **B** (fed only by the undeployed
  `send-reengagement`). Include in this PR.
- **`_seniority_derive_rollback_2026_06_09`** backup table — **PURE-DROP.** Zero live code refs;
  the only mention is a **comment** in `scripts/derive-hebrew-seniority.ts:62` ("First-run audit
  lives in public._seniority_derive_rollback_2026_06_09"), not a query. Include in this PR:
  `DROP TABLE public."_seniority_derive_rollback_2026_06_09";` (optionally scrub the comment).

---

## Execution order (single held PR)

1. **Config + files (no runtime risk):** remove config.toml blocks (A: 39–40, 51–56; B: 58–62);
   delete dirs `send-reengagement/`, `send-waitlist-email/`; delete `Tracker.jsx`,
   `TrackerPreview.jsx`; edit `App.jsx`, `pages.config.js` (E).
2. **Remote undeploys (irreversible-ish; do after config removed so config.toml matches reality):**
   `generate-application-tasks`, `generateApplicationTasks`, `generateTailoredCV`, `send-waitlist-email`.
3. **DB migration (one file):**
   `DROP TABLE campaign_sends;`
   `DROP TABLE waitlist_signups;`
   `DROP TABLE job_suggestions;`
   `ALTER TABLE applications DROP CONSTRAINT fk_custom_template; ALTER TABLE applications DROP COLUMN custom_template_id; DROP TABLE cv_templates;`
   `DROP TABLE public."_seniority_derive_rollback_2026_06_09";`
   (leave `calendar_events` — STOP item)
4. **Regenerate** `src/lib/database.types.ts` (removes cv_templates/job_suggestions/waitlist_signups
   - applications.custom_template_id automatically).
5. `npm test && npm run build && npm run lint && npm run typecheck` before commit (Tracker/PAGES edits).

## One-line verdict table

| Target                                  | Verdict                              | Type                         |
| --------------------------------------- | ------------------------------------ | ---------------------------- |
| `generate-application-tasks` (remote)   | CONFIRMED no-caller                  | REMOTE-UNDEPLOY + config     |
| `generateApplicationTasks` (remote)     | CONFIRMED no-caller                  | REMOTE-UNDEPLOY + config     |
| `generateTailoredCV` (remote slug)      | CONFIRMED no-caller                  | REMOTE-UNDEPLOY + config     |
| `send-reengagement` (local, undeployed) | CONFIRMED no-caller                  | delete dir + config          |
| `campaign_sends` table (36 rows)        | CONFIRMED write-only-by-dead-fn      | PURE-DROP                    |
| `send-waitlist-email` (deployed)        | CONFIRMED no-caller (header stale)   | REMOTE-UNDEPLOY + delete dir |
| `waitlist_signups` table (0)            | CONFIRMED no-caller                  | PURE-DROP + types edit       |
| `calendar_events` table (0)             | **FOUND-CALLER (live R/W)**          | **STOP — do not drop**       |
| `cv_templates` table (0)                | no `.from()`, but dependent FK       | CODE/DB-CHANGE-REQUIRED      |
| `job_suggestions` table (0)             | CONFIRMED no-caller                  | PURE-DROP + types edit       |
| `Tracker.jsx` + `_preview/tracker`      | CONFIRMED prod-dead                  | multi-file delete            |
| `_seniority_derive_rollback_2026_06_09` | CONFIRMED no code ref (comment only) | PURE-DROP                    |

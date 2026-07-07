---
title: CV bullet-attribution forensic — the profile↔CV corruption chain
status: HELD FOR ELI'S REVIEW (evidence CONFIRMED + repair EXECUTED 2026-07-07)
owner: eli
last_reviewed: 2026-07-07
scope: forensic (read-only findings) + repair runbook — repair EXECUTED 2026-07-07 (see §runbook); master re-mint gap open (→ A4).
code_paths:
  - supabase/functions/generate-tailored-cv/reconcile.ts
  - supabase/functions/generate-tailored-cv/index.ts
  - supabase/functions/_shared/cv-antifab.ts
  - supabase/functions/_shared/cv-master.ts
  - supabase/functions/edit-cv/index.ts
  - supabase/functions/refine-cv/index.ts
  - src/lib/promoteBulletsToProfile.js
  - src/components/cv-studio/CVStudioLive.jsx
  - src/pages/Profile.jsx
  - src/lib/coachActionHandlers.js
  - src/components/chat/ChatInterface.jsx
---

# CV bullet-attribution forensic

> **Confirmed live 2026-07-07.** Eli's own `experiences` rows show a **clean bidirectional bullet swap**
> in the master record: the **"Get a Job"** row holds **7 bullets that are all Guardio content** (VIP
> users, cybersecurity startup, social-media response rates); the **"Guardio"** row holds **5 bullets
> that are all Get A Job content** (built the platform solo, 50+ users, 900-company registry). The
> `responsibilities` field is **correct** on both rows. This is the predicted failure, end to end.

## The unifying diagnosis

The disease is the **Profile↔CV relationship**, and its acute mechanism is that **attribution is never
verified anywhere**. Bullets are attached to experiences by a trusted LLM index at generation, the
anti-fab gate is structurally blind to _which_ experience a bullet belongs to, and the profile
write-back propagates that same unverified pairing into the master `experiences` table. The three
surface complaints (bullet swap, profile corruption, wrong-role) are one root surfacing in generation,
in write-back, and in labeling.

## Confirmed evidence (Eli, user `4b243f3a`)

| experience row (`title`/`company`) | `responsibilities`  | `bullets[]` (the corruption)                                                               |
| ---------------------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| **Get a Job**                      | correct (Get A Job) | **7 bullets, all Guardio** (VIP users, cybersecurity startup, social-media response rates) |
| **Guardio**                        | correct (Guardio)   | **5 bullets, all Get A Job** (built platform solo, 50+ users, 900-company registry)        |

The `bullets` column is written **only** by the studio "save to profile" popup
(`promoteBulletsToProfile.js:40`); `responsibilities` is written by the Profile page. The two disagree
in exactly the way the mechanism predicts: the swap entered via `bullets`, `responsibilities` stayed
clean.

## Ranked findings (P0 → P2)

### ① P0 — Bullet mis-attachment, silent + guard-defeating (generation → write-back)

- **Attachment by LLM index.** `reconcile.ts fillFromSource` pass-1 (`:175-185`): any entry with a
  valid in-range integer `index` claims `bulletsBySource.set(idx, bullets)`; the final map
  (`:228-257`) stamps `title`/`company`/`dates` from the DB source at slot `i` but attaches the
  index-keyed bullets. **Titles are protected; bullets are decoupled from them.** A confidently-wrong
  _in-range_ index mis-routes bullets under the wrong real experience with **no warning** — only
  `positional_fallback`/`unclaimed_entry` warn (`reconcile.ts:63-66`, `index.ts:1774,1811-1815`).
- **Anti-fab is attribution-blind.** `enforceBulletProperNouns` (`cv-antifab.ts:432-502`) grounds each
  bullet against **one flat corpus of all experiences** (`index.ts:2363-2387`, check
  `cv-antifab.ts:449,454`). A Guardio bullet under Get A Job still "grounds" — the gate proves a token
  exists _somewhere_, never that it belongs to _this_ experience. It **cannot** see a swap between two
  real roles.
- **Write-back makes it permanent.** `promoteBulletsToProfile.js:39-46` overwrites **every**
  experience's whole `bullets[]` keyed by `experience_id`, with **no integrity check**, and
  `edit-cv/index.ts:98-119` can return a `cv_data` whose id↔bullets pairing the LLM already broke
  (validates only that arrays weren't dropped). → employer A's row gets employer B's bullets in the
  source-of-truth `experiences` table. **This is the confirmed corruption path.**

### ② P0 — Profile split-brain: the Profile page is a dead-end editor

- Profile edits write `experiences.responsibilities` (`Profile.jsx:540`); the master builder reads
  `experiences.bullets` **first** (`cv-master.ts:225-231`), falling back to `responsibilities` only
  when `bullets` is empty; the **only** writer of `bullets` is the studio popup
  (`promoteBulletsToProfile.js:40`). The Profile "bullets editor" named in
  `20260617_experiences_bullets.sql` was **never built**. → after one popup-accept, that experience
  has `bullets[]`, and **every future Profile edit is silently ignored by the CV.**

### ③ P1 — Wrong-role generation: 5 gaps past #505, masked by the label

- Authoring uses `safeTargetRole` (`index.ts:334`, never reassigned to the app's role); the label uses
  `appRoleTitle` (`index.ts:2750`). #505 reconciles authoring↔app only when `application_id` **and**
  the looked-up role are both present (`prompt-lib.ts:1254-1258`). Residual gaps: (1) no
  `application_id` on the coach proposal (`coachActionHandlers.js:617`); (2) null role lookup
  (`ai-chat/index.ts:415-422`); (3) **A/B mismatch** — proposal carries app B's id while the
  conversation is pinned to app A → labels from B, authors for A; (4) the coach trusts
  `proposal.target_role` verbatim; (5) **gtc's label backstop hides** the mismatch (content wrong,
  label looks right).

### ④ P1 — Sync is one-directional the wrong way

- The master `application_cvs` (`is_master`) row is **never rebuilt on a profile save** — only
  tailor/empty-state/prewarm rebuild it (`refine-cv:723-751`, `CVStudioLive.jsx:658-668`,
  `generate-tailored-cv:2799-2811`). The only working propagation is derived-CV → source-profile (the
  popup). Profile → Studio is broken twice (never refreshed + `responsibilities` out-ranked).
  `refine-cv:730-746` also **wipes un-promoted master edits** on the next tailor.

### ⑤ P1 — Duplicate applications, firing today

- #489's durable guard (`cvFiredRef`, `CoachConversationContext.jsx:65,290-306`) covers the **provider**
  dock/panel path only. It does **not** cover: (a) the **full-page ChatInterface** path
  (`handleGenerateCV:989-991`, component-local guard only — CareerAgent/InterviewCoach/SkillAdvisor);
  and (b) **retry-orphans even on the covered path** — `generateTailoredCVLinked`
  (`coachActionHandlers.js:728,743-750`) creates the app **before** gtc and never writes the new id
  back into the proposal, so on a gtc failure the guard clears (`CoachConversationContext.jsx:317`) and
  retry mints a **fresh `chat_agent` app** → null-orphan + ready twin. ~109ms pairs = a cross-surface
  race (provider verbal-accept auto-fire `:346-360` vs a manual full-page click). The "manual add" in
  the Wonderful cluster is a distinct `source='manual'` path.
- Two unconditional INSERT paths: `coachActionHandlers.js:193` (`add_application`, `source:'chat_agent'`,
  no existence check) and gtc's `:2759-2769` INSERT branch (omits `source` → `NULL`).

### ⑥ P2 — Studio deep-link swallowed when Studio is already open

- `CVStudioLive.jsx:66` `paramAppliedRef` is a **one-shot latch**; the route is keyed by static path
  (`App.jsx:124 key={path}`), so navigating to `CVAgent?application_id=B` while Studio is mounted with
  CV A **does not remount** → the `:94` guard short-circuits the new param and `:123` keeps the
  already-open CV. The deep-link becomes a no-op (the stale param even lingers in the URL). The finished-
  CV card CTA is `ChatInterface.jsx:353-366` ("Open in Studio"); "View in tracker" (`:368-382`) routes
  to Tracker correctly — the swallow is the Studio leg.

### ⑦ P2 — Popup fatigue + mislabel

- The "save to profile" toast fires ~once per **800ms edit-burst** on **any** master field, no session
  dedup (`CVStudioLive.jsx:189-227`; `update()` resets `profilePromptedRef` every edit). Copy says
  "bullet **edits**" but the write-back only writes `bullets` — a **no-op** for header/summary/skills
  edits.

## Evidence queries — RESULTS (run 2026-07-07 via the MCP-connected session)

> Ran read-only against live data. **Results:**
>
> - **A (wrong-role): NO live instances.** Across ~30 of Eli's apps, `summary`/`about_me` are consistent
>   with `role_title`; `fit_analysis.target_role` is **null everywhere**. The #505-gap risk is real in
>   code but **has not fired in his data** → A5 is prevention, not remediation.
> - **B (duplicates): anatomy confirmed exactly as predicted.** Retry-orphans — **KPMG 2.25s / Sett
>   2.94s / Tipalti 2.08s** apart (null-orphan + ready twin, all Jul 7 `chat_agent`); cross-surface race
>   — **Wonderful pair `654ca9d1`/`4e5ad2bf` 109ms apart** (Jul 3). Both mechanisms are live.
> - **C (population): contamination is Eli-ONLY, on BOTH channels.** 36 real users have `experiences`;
>   **ZERO** have any `bullets[]` (only `4b243f3a` + `aa8ee22f` carry `bullets` in the entire DB); a scan
>   of 26 real users / 41 CV rows / 329 generated-CV bullets found **zero** cross-employer flags.
>   `promoteBulletsToProfile` **has never fired for a real user.** → **A3/A4 are prevention, not
>   remediation — no population repair needed.**
>
> The queries below are retained for reference. Replace `:eli` with `4b243f3a`'s full UUID.

**A. Wrong-role instances (Eli) — pull-and-eyeball (label vs authored role):**

```sql
select a.id, a.role_title, a.cv_version_name,
       left(cv.cv_data->>'summary', 240)          as summary_excerpt,
       cv.cv_data->'about_me'                      as about_me,
       cv.cv_data->'fit_analysis'->>'target_role' as fit_role
from applications a
join application_cvs cv on cv.application_id = a.id and cv.is_master = false
where a.user_id = :eli
order by a.created_at desc;
-- Flag rows where cv_version_name / role_title disagree with the role the summary/about_me/fit is written for.
```

**B. Duplicate-pair anatomy (Eli's clusters):**

```sql
select a.id, a.company, a.role_title, a.source, a.status,
       (a.cv_url is not null) as has_cv_url, a.cv_status,
       (select count(*) from application_cvs cv where cv.application_id = a.id) as cv_rows,
       a.created_at
from applications a
where a.user_id = :eli
  and a.company in ('Wonderful','KPMG','Sett','Tipalti')
order by a.company, a.created_at;
-- Read: source (chat_agent vs manual), cv_url/cv_status (null-orphan vs ready), cv_rows (0 = orphan),
-- created_at delta (~109ms = cross-surface race; seconds+ with same role/company = retry-orphan).
```

**C. Cross-employer bullet contamination — ALL real users (the population question):**

```sql
with real_users as (
  select id from auth.users
  where email_confirmed_at is not null and deleted_at is null
    and email not in ('isaacselig@gmail.com','isaacseligcoding@gmail.com','elienglard34@gmail.com','yishailieser@gmail.com')
    and email !~* '\+(demo|test|audit|cwsreview)' and email !~* 'cwscts'
),
exp as (
  select user_id, id, title, company, bullets
  from experiences
  where user_id in (select id from real_users)
    and company is not null and length(trim(company)) >= 4 and bullets is not null
)
select
  count(distinct e1.user_id)                                as users_with_contamination,
  (select count(*) from real_users)                        as real_users_total,
  count(distinct e1.id)                                     as contaminated_experience_rows
from exp e1
join exp e2
  on e2.user_id = e1.user_id and e2.id <> e1.id
where exists (
  select 1 from unnest(e1.bullets) b
  where b ilike '%' || e2.company || '%'
);
-- Heuristic: a bullet under e1 that names ANOTHER of the user's employers (e2.company).
-- FALSE-POSITIVE caveat: a legitimately cross-referencing bullet ("partnered with <co>") also matches —
-- treat the count as an UPPER BOUND and eyeball the flagged rows (drop the aggregates for the row list).
```

## Repair runbook — Eli's profile — ✅ EXECUTED 2026-07-07 (evening)

> **DONE (via the MCP-connected session, verified live):**
>
> - **Step 1 swap-back committed:** `23bab260` (Get a Job / Creator) now holds the **5 platform bullets**;
>   `5aed1c1c` (Guardio / CSS-VIP) holds the **7 VIP bullets**. `responsibilities` untouched. ✅
> - **Step 2 (Option A):** the swapped master `application_cvs` row `f6b0d4bd` (`is_master=true`) was
>   **deleted**. ✅
> - **Verification:** a fresh tailored CV `f9329ceb` (Wonderful, app `654ca9d1`, 20:21 UTC) is **clean** —
>   attribution correct; generation reads the corrected profile. ✅
>
> ⚠️ **NEW FINDING — the master was NOT auto-re-minted after the Step 2 delete.** As of 20:25 UTC there are
> **zero `is_master` rows** for `4b243f3a`. Neither documented trigger fired: the Studio empty-state build
> is **suppressed because tailored CVs exist** (`CVStudioLive.jsx:688` renders the "Build my master CV"
> button **only when `cvOptions.length === 0`**), and the gtc master-write is **gated on `isMasterMode`**
> (`gtc:2779`) so a _tailored_ gen never mints. **The reliable code-native re-mint is to run a Studio
> "Tailor" on any application** (`runTailor` → `refine-cv`, whose fire-and-forget insert-first at
> `refine-cv:723-751` mints the master from the current profile). There is **no passive from-nothing mint
> for the "has-tailored-CVs-but-no-master" state** — scoped as a requirement into **A4** of
> `cv-attribution-fix-arc.md`.

### Original DRAFT runbook (retained for the record — already executed above)

The corruption lives in `experiences.bullets` (confirmed) and **very likely also in the master
`application_cvs.cv_data`** (the popup wrote FROM that master, so the master's
`professional_experiences[].bullets` are almost certainly swapped the same way).

**Step 0 — find the two experience IDs + inspect the master:**

```sql
select id, title, company, array_length(bullets,1) as n_bullets, bullets
from experiences where user_id = :eli and company in ('Get a Job','Guardio');
-- filter by COMPANY, not title (titles are 'Creator' / 'Customer Success Specialist - VIP Team').
-- Confirmed ids: 23bab260 = Get a Job / Creator; 5aed1c1c = Guardio / CSS-VIP.

select id, is_master, updated_at,
       jsonb_path_query_array(cv_data, '$.professional_experiences[*].company') as companies,
       cv_data->'professional_experiences'                                     as pro
from application_cvs where user_id = :eli and is_master = true;
-- Confirm whether the master's professional_experiences[] carry the same swap (Guardio bullets under Get a Job).
```

**Step 1 — supervised two-row bullets swap-back (transactional, verify before commit):**

```sql
begin;

-- 1a. BEFORE — eyeball: 'Get a Job' row shows Guardio bullets; 'Guardio' row shows Get A Job bullets.
select id, title, company, bullets from experiences
where user_id = :eli and id in (:getajob_id, :guardio_id);

-- 1b. SWAP — temp-hold both, cross-assign (no ordering hazard).
create temp table _swap as
  select id, bullets from experiences where user_id = :eli and id in (:getajob_id, :guardio_id);
update experiences e
   set bullets = s.bullets
  from _swap s
 where e.user_id = :eli
   and ( (e.id = :getajob_id and s.id = :guardio_id)
      or (e.id = :guardio_id and s.id = :getajob_id) );

-- 1c. AFTER — eyeball: 'Get a Job' row now shows Get A Job bullets; 'Guardio' shows Guardio bullets.
select id, title, company, bullets from experiences
where user_id = :eli and id in (:getajob_id, :guardio_id);

commit;   -- ONLY after 1c looks right; otherwise: rollback;
```

**Step 2 — repair the master `application_cvs` (if Step 0 showed the swap there too).**
The master is _ephemeral_ (rebuilt from the profile on the next tailor / empty-state), so the cleanest
repair is **not** to hand-edit the JSON but to **force a rebuild from the now-corrected profile**:

- Option A (preferred): delete the master row for `:eli` (`delete from application_cvs where user_id=:eli
and is_master=true;`) and let the studio empty-state / next tailor rebuild it from the corrected
  `experiences`. Verify the rebuilt master's `professional_experiences[].bullets` match the corrected
  profile.
- Option B (if a rebuild trigger isn't convenient): swap the two entries' `bullets` inside
  `cv_data->'professional_experiences'` by the same logic, transactionally, with a before/after eyeball.
  More fragile (JSON surgery) — prefer A.

> **Do NOT run Step 2 Option A until Step 1 is committed and verified** — the rebuild reads the profile,
> so the profile must be correct first.

---

_Forensic + repair DRAFT. HELD for Eli's review. The fix arc is scoped separately in
`cv-attribution-fix-arc.md`. No code changed; the repair SQL is not executed._

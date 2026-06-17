# Master-CV model — design & investigation (HOLD, read-only)

Design only. No code, no migrations, no deploy. Branch `eli/master-cv-design`. Live DB read-only.

**Direction:** pivot CV generation from "author a full one-page CV per JD" to a \*\*master-CV reservoir

- fast per-job refine\*\*.

* **Master CV** — one rich, comprehensive structured CV per user, authored once, JD-agnostic, from the
  FULL profile. The reservoir of everything the user has.
* **Per-job CV** — a fast refine off the master: Sonnet emits **small ops only** (select experiences/
  bullets, a few keyword-targeted rewordings, the tailored summary, skills emphasis). The server
  assembles the one-page job CV from the master's existing text + those ops. Small output = speed;
  selecting from rich material = depth.
* **The conversational editor edits the master.**

**Live facts grounding this design (prod, read-only):** 30/32 profiles onboarded · `application_cvs`
1 row / 0 standalone (master pattern unused — clean slate) · **no `master_cv*` column exists** · stories
20 (1 floating, `experience_id` null) · max **11 experiences/user** (the absolute 15-cap doesn't bite
today) · **`experiences.bullets` 4/125, `education.bullets` 1/51 ≈ empty** · proof_signals on 23/32
profiles. CV authoring today: one Sonnet 4.6 call (OpenRouter), avg 33.5s / p95 44s, tokens_out ~1.74k.

---

## 1. Author split

**Today** (`generate-tailored-cv/index.ts`): one Sonnet call authors the **entire** CV from profile +
JD-filtered top-8 stories + proof_signals + a keyword-injection block; `fillFromSource` (reconcile)
stamps title/company/dates by `index`; a coverage-retry re-calls if must-include-phrase coverage <50%.

**(a) JD-agnostic master author** — the same call shape, minus all JD coupling:

- **Reuse:** the prompt's STRUCTURE_RULES / CV_VOICE_RULES / TRUTHFULNESS_RULES, the `userContext`
  builder, **reconcile index-stamping** (still needed — the model emits `{index, bullets}`, server stamps
  identifiers), `buildCvPdf`, the service-role upload + `application_cvs` insert path.
- **Drop:** TAILORING_RULES, the keyword-injection block, `extractJDKeywords`, `smartTruncateJD`, the
  coverage-retry (no JD to cover). Output is **larger, not smaller** (it's the full reservoir) — but it's
  paid **once, in the background**, so latency stops mattering.
- **Change:** the stories query is JD-gated today (only runs when `jdKeywordSet.size>0`, then top-8 by
  keyword score — `index.ts:661-722`). The master needs **all** the user's stories, un-scored, incl. the
  floating one; and lift the absolute caps (15 experiences, 20 proof_signals) for max richness. (See §2.)

**(b) JD refine emitting ops** — Sonnet receives the **master `cv_data`** + the JD keywords and emits a
small ops object instead of a full CV. The server assembles the one-page job CV = master text filtered/
reordered by the ops. **Smallest refine output contract that still hits keyword coverage:**

```jsonc
{
  "select": {
    // which master content survives onto the one-pager
    "experience_ids": ["..."], // ordered; server pulls these experiences' bullets from the master
    "bullets": { "<exp_id>": [0, 2, 3] }, // indices INTO the master's existing bullets for that experience
  },
  "rewordings": [
    // targeted, anti-fab-gated edits to selected bullets only
    { "exp_id": "...", "bullet_index": 2, "new_text": "..." },
  ],
  "summary": "the one JD-tailored About-Me block (authored fresh — this is the prose tailoring)",
  "skills_emphasis": { "domain": ["..."], "tools": ["..."] }, // selection/reorder from master skills
}
```

Why this hits coverage: the current contract already says JD keywords live across **summary + skills +
bullets** (`index.ts:1185,1199`). The refine touches exactly those three surfaces (select bullets that
already contain the keywords, reword a few to add missing ones, author the summary, emphasize skills) —
so the existing coverage scorer runs **unchanged on the assembled job CV**.

- **Reuse for refine:** `extractJDKeywords`, the coverage-retry scorer (run on the assembled output), the
  `unsourced_bullets` anti-fab haystack (apply to `rewordings` — a reword may only re-use tokens already
  in master/source), `fillFromSource` is **not** needed (identifiers come straight from the master).
- **Output size:** ~select indices + a few rewordings + one summary ≈ **300–600 tokens vs today's ~1.74k**
  → the §5-of-the-latency-investigation lever, realized structurally. Est. refine latency **~12–20s** (one
  small Sonnet call + the ~2–4s gpt-4o JD-extract), vs ~33.5s from-scratch.

**Options + lean:**

- **A1. Two functions** (`generate-master-cv` + `refine-cv`) **← lean** — clean separation, independent
  deploy/rollback, divergent prompts; vs **A2. one function with a `mode` flag** (less code, but couples
  two very different prompts + rollback surfaces).
- **Refine granularity:** select+summary+skills only (no rewordings) vs **+ rewordings ← lean** —
  rewordings are needed to add JD keywords a selected bullet lacks; gate them through the anti-fab haystack
  so a reword can't introduce an unsourced metric/tool.

## 2. Rich reservoir — is the profile a true superset?

**Yes, except stories, and bullets are authored not stored.** (Code confirmed; counts live-verified.)

- **Master-ready, JD-independent today:** experiences (all, ≤15 cap; max 11/user so non-binding),
  education (full `education(*)` join, no row cap), skills/skills_canonical (≤50), projects (≤10),
  certifications (≤10), proof_signals (≤20, 72% of profiles have them). These already fetch un-filtered —
  the same query authors a master.
- **Stories are the one real gap.** Queried **only when a JD is present**, scored against JD keywords, cut
  to **top-8**, and **floating stories excluded** (`index.ts:661-722,692`). A JD-agnostic master needs a
  **new fuller query**: all of the user's stories, no scoring, no top-8, and a decision on the 1 floating
  story (include it — the master is the reservoir).
- **`experiences.bullets` / `education.bullets` are empty and unread.** The CV author builds bullets from
  `responsibilities` (PRIMARY) + stories + proof_signals (`index.ts:791,1300`); it never reads `.bullets`.
  Live fill is 4/125 and 1/51. **So master bullets must be authored from `responsibilities`+stories+
  proof_signals today** — the `.bullets` columns are a _future_ canonical store (Phase 4), not a current
  source.

**Gaps to fill before a rich master:** (1) un-gate the stories query (all stories, incl. floating);
(2) lift the absolute caps (15 exp / 20 proof_signals) for the master path — low urgency (max 11 today)
but do it so a rich profile isn't clipped; (3) nothing schema-wise is missing — no new content table needed
to author the master.

**Options + lean for where the authored bullets live:**

- **R1. Master `cv_data` jsonb IS the reservoir** (bullets live inside the master record) **← lean for
  Phase 1** — simplest, no per-entry write path, no anti-fab write surface.
- **R2. Master authoring also backfills `experiences.bullets`/`education.bullets`** (canonical per-entry
  store) — defer to Phase 4 when the editor exists; needs the propose-confirm anti-fab write seam. Pairs
  with making `.bullets` the thing the editor edits and the refine reads.

## 3. Pre-generation during onboarding

**Fire site:** inside `handleFinalise` (`Onboarding.jsx` ~896 region), as a sibling to the existing
`generate-tasks` background IIFE — `onboarding_complete=true` is set there (`:976`); `user.id` + profile
state are in scope. This is the documented "generate in the BACKGROUND, don't block completion" template.

**Run-to-completion (the hard part — no Supabase-native job runner exists):** no pg_cron / pgmq /
`net.http_post` in this repo; `EdgeRuntime.waitUntil` exists but is only used for fire-and-forget tracing;
the one robust precompute precedent is **GitHub Actions cron → service-role edge function**
(`cron-generate-daily-action` + `generate-daily-actions.yml`).

**Options + lean:**

- **P1. Client fire-and-forget** (like `generate-tasks`) — cheap, but a tab-close mid-run kills it.
- **P2. Cron-style precompute** (`cron-generate-master-cv` + GH Actions sweep) — robust, client-independent,
  but net-new infra and a sweep-cadence lag.
- **P3. Return-ack + `EdgeRuntime.waitUntil` inside `generate-master-cv`** — the function acks immediately
  (202) and finishes the ~40s gen server-side in `waitUntil`, so it survives tab close without GH Actions.
  **← lean**, paired with **a self-heal backstop** on the CV surface (mirror `Home.jsx:271-319`: single-fire
  ref + timeout that re-fires if the master is still pending) to cover the rare case the runtime is reaped
  after ack. A cron sweep (P2) can be added later as belt-and-suspenders for the 100-student pilot.

**Status surface ("preparing your CV"):** add a `master_cv_status` (or `master_cv_url IS NULL` sentinel)
on `profiles`, with an `isMasterCvPending(profile)` predicate mirroring `src/lib/analysisStatus.js`. The CV
surface (`CVManagement.jsx` / a new master panel) shows a `Loader2` "preparing your CV…" state — modeled on
the existing `generating` spinner (`CVManagement.jsx:212-216`) and Home's self-heal timeout. One-time:
once `ready`, it never shows again.

## 4. Profile-change sync

Profile edits must refresh the master without the user waiting.

**Options + lean (regen trigger):**

- **S1. Mark-stale + debounced background regen** — on edit to profile/experiences/education/skills/stories,
  set `master_cv_status='stale'` and schedule a debounced regen (30–60s after the last edit, via the same
  `waitUntil`/cron path as §3). Master is usually fresh.
- **S2. Lazy regen on next use** — mark stale, regenerate only when the user next opens the CV surface
  (they see "refreshing…").
- **Lean: S1 debounced as primary + S2 lazy as fallback** (if accessed while stale, regen on open). Debounce
  prevents regen storms during an active editing session.

**Editor write-back (corrections propagate):** the editor edits the master, but **corrections must
propagate to the canonical source** so a later master regen preserves them. Reuse the **`extract-bullets`
propose-don't-write seam** (edge proposes, frontend writes after confirm, anti-fab gated):

- **W1. Edits live only on master `cv_data`** — rejected: a profile-driven master regen (§S1) would clobber
  them.
- **W2. Edits write back to source (profiles / `experiences.bullets` / stories) AND re-project to master**
  **← lean** — keeps the master a faithful projection of canonical truth; a fact-correction (e.g. "94% not
  90%") updates the story/responsibility so every future CV inherits it. This is the earlier-decided
  "corrections propagate." Mechanically pairs with R2 (populate `experiences.bullets` as the canonical
  bullet store the editor edits and the master/refine read).

## 5. Record model + editor target

**Where the master lives — options + lean:**

- **M1. `profiles.master_cv_data jsonb`** (inline, one-per-user by construction) — simplest MVP, but bloats
  the wide profiles row and has no versioning.
- **M2. `application_cvs` row with `application_id = NULL` + an `is_master` flag** (partial unique index
  `(user_id) where is_master`) **← lean** — `application_cvs` is _already_ the structured-CV-as-state table
  (`cv_data jsonb`, `version`, RLS own-row); a master is just a flagged standalone row (the table was built
  with `application_id` nullable for exactly this). Gets versioning + RLS for free; no parallel table.
- Pair either with a **`profiles.master_cv_status` + `master_cv_url`** sentinel for the surface state
  (§3) — the heavy `cv_data` stays in `application_cvs`, the cheap status flag on `profiles`.

**How job CVs reference their master:** add **`application_cvs.master_cv_id`** (FK → the master row) +
the master `version` it was refined from — so a job CV can be flagged "master changed, re-refine."

**Edits land on master (canonical) or derivative — lean:** **the master is the single editing target;
job CVs are disposable projections** (re-refined from the master, never edited directly). Edits to the
master propagate to source (§W2). This keeps one canonical editing surface and avoids per-job edit drift.

## 6. Re-bake gate (Phase 3)

Harness to compare **refine vs from-scratch** on real `(profile, JD)` pairs before refine ships as default.

- **Reuse the coverage-retry keyword scorer** (`index.ts:1581-1600`, must-include-phrase coverage %): run
  on both outputs; refine must be **non-inferior** (coverage ≥ from-scratch).
- **Add a tailoring-depth check** the keyword scorer can't see: did the refine **select the JD-relevant
  experiences/bullets and drop irrelevant ones**? Options: (a) an LLM judge scoring depth 1–5 on both
  outputs (cheap, subjective), (b) deterministic — relevant-experience inclusion rate + JD-skill coverage
  in the skills section. **Lean: both** — deterministic gate + LLM judge as tiebreak.
- **Anti-fab regression check:** `unsourced_bullets` count on refine ≤ from-scratch (a reword must not add
  an unsourced number).
- **Sample size + pass bar — lean:** **N=30 real pairs** (the 30 onboarded users × their tracked apps;
  37 apps already carry a `job_description`). **Pass bar = non-inferiority:** refine coverage ≥ from-scratch
  on ≥90% of pairs AND depth within ~0.3 AND no anti-fab regression. Speed is the win, so refine must not be
  _worse_, not strictly better. Mirrors the June 10–11 bake-off methodology. **Phase 2 flips to default only
  if this holds.**

---

## Phased build plan

**Phase 1 — master author + onboarding pre-gen** (no user-facing refine yet; job CVs still use today's
from-scratch path). Build `generate-master-cv` (JD-agnostic; un-gated full-stories query incl. floating;
lifted caps; reuse reconcile + buildCvPdf + `application_cvs` insert with `is_master`, `application_id=NULL`).
Add `profiles.master_cv_status`/`master_cv_url` + `isMasterCvPending`. Fire from `handleFinalise` via
return-ack + `EdgeRuntime.waitUntil` (P3); self-heal backstop + "preparing your CV" state on the CV surface.
Master is shown as the user's base CV. **Reservoir = master `cv_data` (R1).**

**Phase 2 — refine path behind a flag.** Build `refine-cv` (emits the §1b ops contract; server assembles
the one-page job CV from master text + ops). Add a `cv_refine` flag routing job-CV generation through
refine instead of from-scratch; **default OFF**. Coverage scorer runs on the assembled output.

**Phase 3 — re-bake gate.** Build the §6 harness (coverage + depth + anti-fab over N=30). If non-inferiority
holds, flip `cv_refine` default ON; else iterate the refine prompt/contract. Rollback = flag-off (instant).

**Phase 4 — editor on the master.** Conversational editor edits master `cv_data`; write-back to source
(profiles / `experiences.bullets` / stories) via the `extract-bullets` propose-confirm anti-fab seam (W2);
populate `experiences.bullets`/`education.bullets` as the canonical per-entry store (R2) so the editor edits
and master/refine read the same bullets. Profile-change sync (S1 debounced + S2 lazy) keeps the master fresh.

**Rollback posture per phase:** P1 additive (master is extra, from-scratch path untouched) → revert function

- drop sentinel columns. P2 flag-gated default-OFF → flag-off. P3 harness-only. P4 the editor write-back is
  the highest-risk (anti-fab) — gate behind the existing propose-confirm seam, never a direct edge write.

## Overall lean

Build the **master as a flagged `application_cvs` row (M2)** authored JD-agnostically in the background
during onboarding via **return-ack + `waitUntil` (P3)** with a self-heal backstop; **refine emits ops
(A1, two functions) including anti-fab-gated rewordings**; ship refine **behind a flag gated on a
non-inferiority re-bake (N=30)**; the **master is the single canonical editing target** with corrections
**propagating back to profile/Story Bank (W2)**. Phase 1 carries the entire latency win for the user (the
~40s is moved to onboarding background); Phase 2's refine is the steady-state speed + the editor's
foundation.

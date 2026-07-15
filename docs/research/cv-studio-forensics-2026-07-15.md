# CV Studio forensic investigation — 2026-07-15 session (account 4b243f3a, Eli)

Investigate-only. Reconstructed from `function_metrics`, `application_cvs` + profile/experiences/education row state (live DB), and full code trace of the CV subsystem (frontend Studio + 4 edge functions + shared). No fixes applied. PostHog session replay exists for the window (10:26–11:46 UTC) as visual corroboration; every root cause below is verified against code/DB, so replay was not required.

## Headline

**Zero server errors the entire session** — every `generate-tailored-cv` (×2), `refine-cv` (×1), `edit-cv`, and `ai-chat` (coach, ~30) call returned `ok:true` / HTTP 200. None of the reported bugs are backend failures. They are **(A) a missing Studio→profile write contract**, **(B) Studio state/UX design**, **(C) an un-wired coach**, **(D) honors modeled as a column-on-row + lossy flat aggregation**, and **(E) a PDF empty-entry gap**.

## 1. Session timeline (UTC, evidence-cited)

| Time                | Event                                                                                                                                                                              | Evidence             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 10:26:52            | Coach turn (ai-chat, 28s, 1402 tok out)                                                                                                                                            | function_metrics     |
| 10:27:49            | **generate-tailored-cv, 44.3s** (sonnet) → CV row created 10:27:48 (app 93e7992c)                                                                                                  | fm + application_cvs |
| ~10:28–10:30        | Edits summary to "Builder and operator with a track record…" → **new** CV row 10:30:53, `summary_edited=true`                                                                      | application_cvs      |
| 10:43:43–44         | **profiles + education rows overwritten** (updated_at). profile.summary = generic "Graduate of Business Administration…"; education.honors = `["Heseg Scholarship Recipient"]` (1) | profiles/education   |
| 10:51:25            | **generate-tailored-cv, 37.2s** → CV row (app f77d2788)                                                                                                                            | fm                   |
| 10:33–11:20         | ~30 coach turns (ai-chat), mostly small outputs                                                                                                                                    | fm                   |
| 11:13:19            | CV row (app 3f3c858d) summary "Builder and researcher at the intersection of AI systems and product"                                                                               | application_cvs      |
| 11:21:47            | **refine-cv, 31s** → CV row (app 3f3c858d), `summary_edited=true`                                                                                                                  | fm + application_cvs |
| 11:30:06            | Coach turn (29s)                                                                                                                                                                   | fm                   |
| 11:31:40 → 11:47:15 | Final coach turns + CV rows (app ba2524fe)                                                                                                                                         | fm + application_cvs |

**Structural facts from the DB (the spine of the bug cluster):**

- 59 `is_master=false` (tailored) rows since 2026-06-18; **exactly 1 `is_master=true` master row, FROZEN at 2026-07-07 20:42, never updated since** (8 days before this session).
- Every summary edit created/updated **another** `application_cvs` row, all `version=1` — the "version" integer does not distinguish them.
- `profiles.summary` = the generic graduate summary; his custom "Builder…" summaries exist **only** in `application_cvs.cv_data`, never in the profile.
- `education.honors` = `["Heseg Scholarship Recipient"]`; **no row history** (can't see prior value), but **no DB cascade or trigger** deletes honors (verified: only `updated_at` triggers; the sole cascade FK is `stories→experiences SET NULL`).

## 2. Symptom → root cause (grouped by shared cause)

### GROUP A — One broken contract: Studio edits never durably reach the profile → **#2, #5, #8, and the "stale doc" half of #1**

The Studio autosaves everything to an **ephemeral `application_cvs.cv_data` row** (debounced, `CVStudioLive.jsx:183`). The "Master CV" is a **pure derivative of the profile** (`buildMasterCvData`, `cv-master.ts:217`). The **only** bridge back to the profile is an opt-in "Save to profile" toast that promotes **bullets only** (`promoteBulletsToProfile.js`). Consequences:

| #   | Symptom                                                      | VERIFIED cause                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Blast radius | Fix scope / effort                        |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------- |
| 5   | New summary won't save to profile (retried repeatedly)       | **There is no code path** writing the Studio summary to `profiles.summary`. `promoteBulletsToProfile` is bullets-only; grep shows the only `profiles.summary` writers are Onboarding/Profile/Home/WeeklyActions. Save is optimistic-to-CV-row, **never-persisted-to-profile by omission**; the next tailor re-derives the master from `profiles.summary` and discards his edit → infinite retry. **DB confirms**: profile.summary generic, custom summaries only in cv_data. | All users    | Part of the contract fix (below). **M**   |
| 2   | Master-CV bullet edits/deletes don't sync to profile         | Autosave writes `cv_data` only; `experiences` untouched. The opt-in toast promotes bullets by `experience_id` full-array-replace, **silently skips** entries without `experience_id` (`promoteBulletsToProfile.js:26`), and ignores education/projects/certs. Delete **does** propagate _through the same toast_ (no edit/delete divergence) — but it's opt-in and easily missed.                                                                                            | All users    | **M**                                     |
| 8   | "Save to profile" popup appears a bunch                      | `profilePromptedRef.current` is reset to `false` on **every** `update()` (every field commit, `CVStudioLive.jsx:238`) → re-armed after every edit. Fires on ANY edit (summary/header/skills) but its action only promotes bullets → prompts about changes it **cannot** durably save. Repetition is the ref-reset, but it is symptomatic of the A gap.                                                                                                                       | All users    | Toast gate **S**; real fix = the contract |
| 1a  | (stale-master half) Selecting "Master" shows an old document | The one master row is **frozen at 2026-07-07**; onboarding-prewarm + Studio empty-state skip when a master exists, and profile edits never re-derive it. Only a refine tailor refreshes it (fire-and-forget). So "Master" loads an 8-day-stale snapshot.                                                                                                                                                                                                                     | All users    | Part of contract fix. **M**               |

**The A fix is a contract decision, not a patch.** Either (a) make Studio edits **write-through** to the profile for every field (summary→profiles, bullets→experiences, education/honors→education), or (b) make the master **truly derived** (no persisted editable master; Studio edits always land on the profile and the master re-derives). Pick one; today it is neither, so edits drift both ways.

### GROUP B — Studio state / UX design → **#1 (switch), #7 (editability)**

| #   | Symptom                                    | VERIFIED cause                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Blast     | Fix                                                |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------- |
| 1b  | Version dropdown switches the doc mid-edit | **By design**: `setSelectedCvId` → `useCvData` swaps query key → `useSeededCvModel` clears model to null then re-seeds → CVStudioView is keyed `${selectedCvId}:${editVersion}` so it **remounts** and every `Editable` re-seeds. Manual switch is mostly safe (blur commits the edit first), but **programmatic** switches discard typed-but-uncommitted text: chat-apply bumps editVersion (`:418`), tailor-success auto-selects the new row (`:559`), selection-recovery (`:119/134`). No unsaved-edit guard. **Compounded** by 59 near-duplicate rows all `version=1` (refine-cv never dedups, §3) → the dropdown is cluttered and ambiguous. | All users | Studio state/UX + row dedup. **M**                 |
| 7   | Not everything is editable                 | Locked (render-only round-trip): **phone, Skills→Tools, Skills→Technical, language proficiency, Honors & Awards, Certifications, Projects**. Also **no add/delete of experience or education entries**, and an empty education `field` can't be added. Editable: header (minus phone), summary, exp title/org/dates/bullets, education institution/degree/field(if present)/dates, skills domain line, language names. (`CVStudioView.jsx` inventory.)                                                                                                                                                                                            | All users | Incremental editability build. **M** (per-section) |

### GROUP C — Coach is un-wired for profile/CV edits, fails silently → **#3**

The global Coach (`coachActionHandlers.js`) is **card-gated**: it mutates only via `SUGGESTED_*_JSON` cards the user taps to Apply. It **can** write `tasks`, `career_roles`, `applications`, `company_targets`, `stories`, **append** bullets/skills (append/undo only), and **generate** a CV. It has **no handler that writes `profiles`** (summary/name/contact/education) and **cannot edit the CV document** (that is the Studio's `edit-cv` panel, a separate surface). An unsupported request ("change my summary", "fix my CV", "delete this bullet") emits **no card → a text reply, nothing mutates, no error surfaced → silent failure.** Blast: all users. Fix: product decision (should the coach edit profile/CV?) + wiring — **L** for full mutation, **S** to at least surface an honest "I can't do that yet."

### GROUP D — Honors are a column-on-education-row + lossy flat aggregation → **#4**

`honors` is a `string[]` **column on each `education` row** (no awards table, no per-award entity). `buildMasterCvData` **flattens every education row's honors into one top-level `cv_data.honors_and_awards`**, deduped, **with no school attribution** (`cv-master.ts:270-281`); the renderer shows that flat list. Mechanism of the symptom:

1. Deleting a "school" row deletes its `honors` array with it (straight `education.delete`, `EducationTab.jsx:227` — no trigger/cascade, expected at DB level but invisible to the user).
2. Because honors render as one flat section with no attribution, deleting **any** school silently removes that row's awards from the CV — even awards the user thinks belong to a different, still-present school.
3. `cvDataAdapter` surfaces honors as **read-only** (`:146`), so the only place to remove one award is the Education tab's tag input, which rewrites the whole `honors[]` for that row (full-array replace, `EducationTab.jsx:149`).

**Honest unknown:** whether awards were _lost_ vs _moved_ today can't be proven (no row history); education was overwritten at 10:43:43 and currently holds 1 honor. The design smell (flat aggregation + column-on-row delete) is verified regardless. Blast: all users editing education. Fix: attribute honors per-school in render + confirm-on-school-delete + make honors editable in Studio. **M**

### GROUP E — PDF empty-entry gap → **#6**

Content emitters early-return on empty (`drawBullet:766`, `drawSubLine:750`, etc.), so empty bullets/sections reserve no space. But the **entry-title emitters have no empty guard**: `drawEntryTitleLine` (`build-pdf.ts:656`) and `drawRoleEntry` (`:697`) unconditionally advance the cursor (`ctx.y -= SP_ENTRY_BEFORE`) and draw nothing when title+org are blank → a **blank reserved line / floating date**. Reachable from the Studio: `mapExpOut` (`cvDataAdapter.js:58`) maps **every** editor row — including a freshly-added blank one — to `{title:"",company:"",dates:"",bullets:[]}`. **Add-a-row-then-download is the concrete trigger.** Education variant: an entry with only `dates` yields `topLine=""` and still draws the date on a blank line (`:1012`). Blast: any user who adds a blank entry (or a partially-blank one) before download. Fix: empty-entry guard in the two emitters + filter blank rows in `mapExpOut`. **S**

## 3. Broader reliability audit ("everything wrong" — beyond today's 8)

**Architecture-level:**

- **The master CV is built in THREE places** with `buildMasterCvData` (onboarding prewarm client, Studio empty-state client, refine-cv server every tailor) — **plus a fourth, divergent** path where `generate-tailored-cv master-mode` builds it via the **LLM** instead of the deterministic builder. One concept, four code paths.
- **Two-way staleness**: existing master never re-derives on profile edit; Studio edits never write profile. (Group A.)
- **`refine-cv` never dedups prior non-master rows** (`:982` inserts unconditionally) → 59 rows accumulated for one user; this is what clutters the version dropdown (feeds #1).
- **Dead code**: the DOCX renderer `_shared/cv-templates/build.ts` has **zero importers**; only `build-pdf.ts` is wired.

**Silent-failure surface (ranked):**

- **P0** — `application_cvs` persist is **best-effort + swallowed** on all authoring paths (`gtc:2839/2862`, `refine:996/1001`): the PDF/URL still returns but the structured row may be missing → **user downloads a CV they cannot re-edit** (gtc returns `cv_id:null`).
- **P0** — **`enforceCvInvariants` is behind `cv_enforce_v2`, default OFF** on gtc/refine/edit. Only the always-on `scrubCvVoice` runs on the authoring write; full first-person/caps normalization + proper-noun restore fire only at the render-cv chokepoint → **persisted `cv_data` can differ from the downloaded PDF** (preview-vs-download divergence).
- **P1** — reconcile can **silently drop** LLM bullets (`unclaimed_entry`, `reconcile.ts:57/322`, surfaced only as non-blocking warnings); anti-fab **drops** bullets with unsourced proper nouns (`cv-antifab.ts:547`, counted not surfaced); translate **strips** un-translatable Hebrew to `""` (`cv-translate.ts:139`). All lossy and invisible.
- **P1** — a chat-supplied `application_id` that isn't owned **silently creates a fresh applications row** (`gtc:2757`) → duplicate tracker rows.
- **P2** — render-cv pointer writes best-effort (stale `cv_url`); JD keyword-extract failure swallowed (degraded tailoring, no signal).

## 4. Fix-arc shape (for planning; no fixes here)

1. **Decide the master↔profile contract** (Group A) — the single highest-leverage fix; resolves #2, #5, #8, #1a and the two-way staleness P0. Everything else is smaller.
2. **PDF empty-entry guard** (#6) — S, isolated, ship early.
3. **refine-cv row dedup** + version-dropdown labeling/guard (#1b, dropdown clutter) — S/M.
4. **Turn on `cv_enforce_v2`** after verifying preview==download — S (flag + eval).
5. **Surface persist failures** (P0 reliability) — S/M.
6. **Honors attribution + editability** (#4, #7 honors) — M.
7. **Studio editability** for the locked sections (#7) — M, incremental.
8. **Coach**: at minimum an honest "can't do that"; full profile/CV mutation is a product decision (#3) — S→L.

---

# SEPARATE QUEUE ITEM — CV generation speed (P7 pulled forward)

**Current architecture (evidence):** master build is deterministic (0 LLM). Tailored gen = **2 LLM calls typical, up to 4**: Pass-1 JD-keyword extract (gpt-4o, `max_tokens:600`, **not cached**, `index.ts:666`), Pass-2 CV authoring (gpt-4o or sonnet via OpenRouter, `max_tokens:4096`, temp 0.2, `:1592`), conditional Pass-3 coverage retry (`:1714`), conditional translate (`:2656`). **No streaming anywhere** — `await res.json()`, client waits synchronously for the whole PDF-URL blob (44s and 37s observed today). Static prompt prefix ≈ **5.5–6.5k tokens** (rules + voice + schema), but `LIBRARY_CONTEXT` is interleaved in the middle and the schema sits **after** the dynamic user data → prefix caching is not maximized; **no `cache_control`** anywhere. Wall-clock is dominated by **serial output-token generation** (Pass-2 ~1.5–2.5k tokens ≈ 20–35s), so input size mainly affects TTFT/cost, not total time.

| Lever                                   | Mechanism                                                                                                                                                                 | Est. win                                                                          | Risk                                                                                                                                    | Effort    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **4. Model / budget / prompt trim**     | Route Pass-1 to gpt-4o-mini + **cache it** (deterministic on JD, currently re-runs every regen); compact `USER DATA` JSON (drop `null,2`); bake-off a faster Pass-2 model | Real: −2–5s + cheaper TTFT; faster Pass-2 model could cut 30–50% (quality-gated)  | Low (a–c) / Med (model)                                                                                                                 | Low / Med |
| **2. Prompt-cache the static prefix**   | Reorder so all static (rules+schema) leads, all dynamic (USER DATA, JD, LIBRARY_CONTEXT) trails; add `cache_control` for the OpenRouter/Sonnet path                       | Real: ~30–50% input-cost cut, ~5–15% latency (output-bound); large on Sonnet path | Low                                                                                                                                     | Low–Med   |
| **1. Section streaming (progress SSE)** | Convert endpoint to SSE emitting progress stages; the deliverable is a PDF built after the whole pipeline, so token-preview can't shortcut it                             | **Perceived**: first feedback ~2–3s vs ~25s blank; real latency unchanged         | Med (SSE contract + Langfuse assumes non-stream)                                                                                        | Med       |
| **3. Parallel section generation**      | Split Pass-2 into concurrent section calls                                                                                                                                | Real: 30–50% off authoring                                                        | **High**: cross-section dedup + one-page budget are global; re-raises the concurrent-OpenAI fan-out risk `tasks/lessons.md` warns about | High      |

**Recommended sequence:** (1) Lever 4a–c + Lever 2 as one low-risk cluster (cache Pass-1, drop to mini, compact JSON, reorder for a clean cacheable prefix). (2) Lever 1 progress-SSE for the felt wait. (3) Lever 4d faster-Pass-2 bake-off behind the CV-Excellence eval-set gate. (4) Defer Lever 3. **Instrumentation gap to close first:** `function_metrics` records total latency only — add per-pass timing (Pass-1/2/3/translate/PDF) so wins are measured, not assumed.

_Author: forensic pass 2026-07-15. Report-and-hold; no code changed._

# Deep QA Part 3 — Redundancy & Consolidation

Read-only investigation. Date: 2026-07-05. Scope: find where 2+ things do one job, and the inverse (one thing doing two jobs badly). All evidence is file:line or query. Confidence marked CONFIRMED / SUSPECTED.

---

## A. Redundancy table (by impact)

| #   | What                                                                      | Duplicated across                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                                                           | Consolidate to                                                                                   | Rough LOC saved                  |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------- |
| 1   | **Skill-alias resolver (`resolveSkill`) triplicated**                     | `_shared/skill-aliases.ts` `resolveSkillAliases` + `extract-job-requirements/index.ts` `resolveSkill` + `src/lib/skillResolver.js` `resolveSkill`                                                                                                                                                                         | 4-step fallback logic byte-for-byte identical in all 3; see below                                                                                                                  | The already-existing shared `resolveSkillAliases` (skill-aliases.ts:1175). JS side wraps it.     | ~90                              |
| 2   | **Track-assignment branch tree re-implemented 3× (with numeric drift)**   | `scoreApplication.js` `trackFromScores` (:106) · `generate-career-analysis` `assignTrackWithGoalRaw` (:203) · `scoreJobFit.js` (:309-339)                                                                                                                                                                                 | Share _constants_ (`track-scoring-constants.ts`) but each re-codes the branch tree, and they **diverge numerically** (see B)                                                       | One shared `assignTrack(fit, alignment, seniority, stage, rawFit)` in track-scoring-constants.ts | ~60 + removes a live scoring bug |
| 3   | **"Return ONLY valid JSON" emission instruction**                         | ~17 edge functions, ~24 sites (analyze-job-match:224, generate-career-analysis:1209, extract-job-requirements:439, generate-tailored-cv:1527, refine-cv:438, generate-tasks:383, all 4 linkedin fns, extract-bullets:72, extract-story-from-text:102, generate-internship-profile:237/450, generate-learning-paths:294 …) | `_shared/json-parse.ts` handles _parsing_ only; emission text copy-pasted                                                                                                          | `JSON_ONLY_INSTRUCTION` const beside json-parse.ts                                               | ~24 lines dedup + drift control  |
| 4   | **Anti-fabrication prompt prose** ("NEVER invent metrics/numbers/tools…") | extract-bullets:45, extract-story-from-text:62, generate-linkedin-content:76, generate-linkedin-comment:68, generate-linkedin-post:278, generate-tailored-cv:1127 **and** :1146 (twice in one file), edit-cv:40                                                                                                           | `_shared/cv-antifab.ts` exports only the _code_ gate (`applyAntiFabGate`), no prompt text; header "ABSOLUTE FABRICATION RULES" near-verbatim in 5 files                            | `ANTI_FAB_PROMPT` const in cv-antifab.ts                                                         | ~20                              |
| 5   | **Two client chat engines** (full-page vs dock/drawer coach)              | `src/components/chat/ChatInterface.jsx` (1452 LOC) vs `src/components/agent/CoachThread.jsx`+`CoachInput.jsx`+`CoachConversationContext.jsx`                                                                                                                                                                              | Both render messages, stream, retry, and hit the same `ai-chat` edge fn; share only the action-handler layer (`coachActionHandlers.js`)                                            | One `<CoachThread>` renderer used by both page + dock; keep shared handlers                      | 400-800                          |
| 6   | **Two parallel route/page maps**                                          | `src/pages.config.js` (`PAGES`) vs `src/pages.lazy.js` (`LAZY_PAGES`)                                                                                                                                                                                                                                                     | App.jsx routes off `LAZY_PAGES` only (App.jsx:7,123); `PAGES` is vestigial, kept "in sync manually" (pages.lazy.js:85-87). Tracker/TrackerRedirect already drifted between the two | Delete `PAGES` map, keep only `pages.lazy.js` (+ `pagesConfig.Layout`)                           | ~60                              |
| 7   | **Two CV-generation engines** (`refine-cv` vs `generate-tailored-cv`)     | CV Studio uses `refine-cv`+`render-cv` (CVStudioLive.jsx:463,305,565); every other surface (chat page, dock coach, tracker card, checklist) uses `generate-tailored-cv`                                                                                                                                                   | Two edge functions produce "a tailored CV" from overlapping inputs                                                                                                                 | Pick one authoring path; make Studio call generate-tailored-cv or vice-versa                     | high (whole edge fn)             |
| 8   | **`generate-tailored-cv` invoke body copy-pasted inline**                 | coachActionHandlers.js:615, CVManagement.jsx:95, ApplicationChecklist.jsx:161                                                                                                                                                                                                                                             | Near-identical `body:{ job_description, target_role, application_id, cv_model:"sonnet" }`; only `source` differs                                                                   | One `generateTailoredCV()` wrapper (coachActionHandlers already has it — D/E don't use it)       | ~30                              |
| 9   | **Seniority band rubric restated in prompt prose**                        | `analyze-job-match:155-164` re-encodes `SENIORITY_RANK` (track-scoring-constants.ts:30) as prose ("Entry 0-1yr / Mid 3-5yr / Senior 5-8yr…"); generate-career-analysis:1132 narrates its own cap prose                                                                                                                    | Same bands live in shared code + 2 prompts                                                                                                                                         | Generate prose from the shared constant, or accept prose is LLM-only                             | ~10                              |
| 10  | **Local `SENIORITY_RANK` shadows shared one (drifted keys)**              | generate-career-analysis:284-293 declares a local `SENIORITY_RANK` with keys (`mid_to_senior`, `Lead_Manager`, `Director_Head`, `VP_Executive`) that don't match `_shared/track-scoring-constants.ts:30` (`Mid_Senior`, `Lead`, `Manager`, `Director`, `VP`)                                                              | Two taxonomies for the same concept in one repo                                                                                                                                    | Delete local, import shared                                                                      | ~10 + drift risk                 |
| 11  | **2nd-person / English "analysis voice" inline**                          | analyze-job-match:216-220 and generate-career-analysis:1136-1140, near word-for-word                                                                                                                                                                                                                                      | `_shared/voice-rules.ts` exists but only covers CV/LinkedIn writing, not analysis voice                                                                                            | Add `ANALYSIS_VOICE_RULES` to voice-rules.ts                                                     | ~10                              |
| 12  | **Verbatim system prompt string**                                         | `"You are an ATS keyword extraction specialist… Return JSON only, no markdown."` byte-identical in generate-tailored-cv:152 and refine-cv:118                                                                                                                                                                             | Same string, 2 files                                                                                                                                                               | Shared const                                                                                     | ~2                               |

### Detail on #1 (alias resolver triplication — the known seed)

All three implement the identical 4-step fallback (direct alias → strip parentheticals → snake→space → snake direct-ID):

- `supabase/functions/_shared/skill-aliases.ts:1175` `resolveSkillAliases(label, skillIdSet)` — the canonical shared helper. **Only `generate-career-analysis` imports it** (index.ts:13,936).
- `supabase/functions/extract-job-requirements/index.ts:118` `resolveSkill(label)` — re-implements the same 4 steps inline. Its own comment (line 112) even says _"Lookup order mirrors the shared resolveSkillAliases helper"_ — i.e. the author knew the shared helper existed and copied it anyway.
- `src/lib/skillResolver.js:22` `resolveSkill(label)` — same 4 steps in JS (this one is defensible: it's the browser bundle and can't import Deno TS directly, but it _can_ import the map, which it does).

**Source of truth:** the `SKILL_ALIASES` _map_ (skill-aliases.ts:25, ~1150 entries) is correctly single-homed — all three import it. It is the _resolver function_ that is triplicated, not the data. Collapse to `resolveSkillAliases`; have extract-job-requirements import it; have skillResolver.js port the exact same logic (or share via a tiny isomorphic module).

---

## B. CONFIRMED logic drift — track scoring (elevates #2 from cleanup to bug)

The three track paths share `track-scoring-constants.ts` but the branch trees diverge:

1. **Relaxed-T1 threshold mismatch.** Front-end `trackFromScores` (scoreApplication.js:127): `fit >= t1_min_fit_relaxed (0.40) && alignment >= t1_min_alignment_relaxed (0.80)`. Backend `assignTrackWithGoalRaw` (generate-career-analysis:218) hardcodes `fitScore >= 0.40 && goalAlignment >= 0.70` — **0.70, not the constant's 0.80.** A role at fit 0.45 / alignment 0.75 → **Track 1 in career-analysis but not Track 1 on the Jobs/Tracker deterministic path.** Same user, same job, two different tracks depending on surface.
2. **T3 uses different inputs.** Backend T3 branch uses `rawSkillFit` (pre-penalty) deliberately (generate-career-analysis:226); front-end `trackFromScores` T3 uses post-penalty `fit`. Different aspirational-role classifications.
3. **`scoreJobFit.js:335-339` is a third, structurally different tree** — routes T3/T2 by `family.match` boolean, not by `GOAL_TRACK_THRESHOLDS` at all.

This is exactly the drift the shared-constants refactor was meant to prevent; constants were centralized but the _algorithm_ wasn't. Recommend a single `assignTrack()` in the shared file, called by all three.

---

## C. Dead / orphaned code list

Corroborated with the codebase-wide caller sweep (incl. the browser extension at `extension/popup.js`, which rescued several false positives).

**Orphaned edge functions (zero callers anywhere — src/, extension/, other fns, cron):**

- `supabase/functions/lookup-role-skills/index.ts` — CONFIRMED. Deployed (config.toml:48) but invoked by nothing.
- `supabase/functions/send-reengagement/index.ts` — CONFIRMED. config.toml:58-61 documents it as "torn down post-campaign."
- `supabase/functions/send-waitlist-email/index.ts` — CONFIRMED. Header claims Login.jsx fires it; the real waitlist submit (Landing.jsx:1189) is a localStorage stub that never calls it. Stale.

**Orphaned \_shared libraries (imported by no shipping edge function):**

- `_shared/libraries/010_agent_decision_logic.ts`
- `_shared/libraries/03_skill_strength_logic.ts`
- `_shared/libraries/05_fit_scoring_logic.ts`
- `_shared/libraries/06_track_logic.ts`
- `_shared/libraries/07_onboarding_input_mapping.ts`
- `_shared/libraries/09_goal_alignment_logic.ts`
- `_shared/libraries/14_location_context_israel.ts`
  (only referenced by root-level `test_*.cjs` validators + docs, none wired into a deployed function; `06_track_logic.ts` is also drifted — the validators still reference a stale `06_tier_logic` name)
- `_shared/libraries/companies_il.json` — SUSPECTED (data file; no import/readTextFile reference found, but could be loaded via a path not grepped).

**Orphaned React component:**

- `src/components/subagents/ConversationSelector.jsx` — CONFIRMED. Only self-reference; zero import sites. (The only file in that dir.)

**Dead / unlinked page route:**

- `src/pages/Subagents.jsx` — SUSPECTED dead. Registered in both maps but zero inbound nav links; Layout.jsx:39-41 explicitly calls it "the legacy router page … intentionally NOT linked … stays registered as an orphan." Reachable only by typing the URL.

**Vestigial (not dead, but unused-for-its-purpose):**

- `src/pages.config.js` `PAGES` map — App.jsx uses only `pagesConfig.Layout`; the `PAGES` export drives no routing (see #6).
- `src/pages/Tracker.jsx` — dead in production (live `/Tracker` = `TrackerRedirect` → Career). Only mounted by the `_preview/tracker` regression harness (App.jsx:236-237).

**Corrections to common assumptions (NOT dead):** `extract-jd-basics` (called by extension popup.js:819,971), and all four `*Agent` pages (CVAgent/CareerAgent/InterviewCoach/SkillDevelopmentAdvisor — routed in LAZY_PAGES and nav-linked in Layout.jsx:78-81).

**Total dead/orphaned artifacts: 13** (11 CONFIRMED + 2 SUSPECTED) — 3 edge fns, 7 shared libs, 1 component + companies_il.json (suspected) and Subagents route (suspected). Plus 2 vestigial-but-referenced items (PAGES map, Tracker.jsx).

Note: a code-side writer/reader cross-ref for "tables written but never read" was not run to ground here (needs a SQL + code join); flagged as an open item for a follow-up pass.

---

## D. Split candidates (the inverse — one thing doing two jobs)

| Module                                                              | LOC  | Two jobs it conflates                                                                                                                                                                                                                    | Recommended split                                                                          |
| ------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `supabase/functions/generate-tailored-cv/index.ts`                  | 2872 | (a) ATS keyword extraction + JD truncation, (b) dense-mode authoring, (c) sparse-mode authoring — the "ANTI-FABRICATION" block and banned-verb prose are duplicated _within the file_ across the dense (1127) and sparse (1146) branches | Extract shared prompt fragments; consider dense/sparse as one parameterized author         |
| `supabase/functions/extract-job-requirements/index.ts`              | 1353 | Two runtime modes in one handler: `job_id` DB-write mode vs `stateless` raw-JD mode (:1089) — plus a triplicated `resolveSkill`                                                                                                          | Keep modes but factor resolver out (#1); the two modes are a defensible single fn          |
| `src/components/chat/ChatInterface.jsx`                             | 1452 | Message rendering + streaming + retry + action-card orchestration + CV-generation proposal UI, for 3 different agents — parallel to the entire CoachThread stack (#5)                                                                    | Collapse renderer with CoachThread; this file is the god-component of the chat surface     |
| `supabase/functions/generate-career-analysis/index.ts`              | 1495 | Deterministic track/fit scoring (code) **and** LLM narrative generation with an inline prose seniority rubric (#9,#11) + a locally-shadowed SENIORITY_RANK (#10)                                                                         | Move scoring to shared module; keep this fn as the LLM-narrative layer only                |
| `src/pages/CVAgent.jsx` (3-line wrapper) → `CVStudioLive.jsx` (883) | 883  | CVStudioLive drives 3 different edge fns (edit-cv, refine-cv, render-cv) as distinct sub-flows in one component                                                                                                                          | Fine as-is; noted because it's the CV surface that diverges from generate-tailored-cv (#7) |

---

## E. Consolidation priority (founder view)

1. **Fix the track-scoring drift (#2/B).** This is not cleanup — it's a live correctness bug: the same job shows different tracks on different surfaces. One shared `assignTrack()`.
2. **Collapse the alias resolver (#1).** Cheapest high-signal win; the shared helper already exists and one call site literally comments that it's copying it.
3. **Unify the two chat engines (#5).** Largest LOC and the biggest ongoing-maintenance tax (every coach feature is built twice).
4. **Extract prompt constants (#3,#4,#11,#12).** `JSON_ONLY_INSTRUCTION`, `ANTI_FAB_PROMPT`, `ANALYSIS_VOICE_RULES` — turns ~60 copy-pasted lines across ~20 functions into imports and kills silent prompt drift.
5. **Delete dead code (Section C).** 3 edge fns + 7 libs + 1 component + Subagents route + the vestigial `PAGES` map.

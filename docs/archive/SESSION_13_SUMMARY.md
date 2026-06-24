# Session 13 Summary — 2026-04-26

**Branch:** `agent-prompts`
**Project:** Get A Job — Career platform for Israeli students + early-career professionals
**Supabase project:** `ilmqmodklutztuybsvwd`
**Test user:** `4b243f3a-5035-474e-a89d-aff13fe06cc2` (`elienglard34@gmail.com`)
**Session range:** commits `6a32a02` … `abe10b4` (14 commits, all pushed)

---

## What this session accomplished

Started with the user reporting "every onboarding step is broken." Did a full read-only audit of the onboarding flow + every edge function + every page, surfaced ~70 bugs (40+ unlisted), then worked through 13 fixes on the methodology of:

> **Investigate → report findings → wait for approval → apply minimum fix → build + test → commit + push.**

One bug at a time. No batched fixes. No refactors beyond the bug.

Skills installed mid-session:
- `~/.claude/skills/debugging-wizard/` — Reproduce → Isolate → Hypothesize → Test → Fix → Prevent
- `~/.claude/skills/systematic-debugging/`
- `~/.claude/skills/test-driven-development/`
- `~/.claude/skills/test-master/` (with full `references/` tree)
- `~/.claude/skills/fullstack-guardian/` (with full `references/` tree)
- `~/.claude/skills/vibesec/`

---

## Bugs fixed (14 commits in chronological order)

| # | Commit | Bug | Severity |
|---|---|---|---|
| 1 | `6a32a02` | Onboarding data not persisted to DB before career analysis ran (master bug — analysis ran against empty DB) | **Critical** |
| 2 | `5d99243` | `employment_status` column was `text` but UI sent arrays → JSON-stringified storage | **Critical** |
| 3 | `2d82a55` | `profiles.skills` empty in DB despite Step 3 entries — auto-save raced with saveProgress | **Critical** |
| 4 | `b0f60e6` (N-O20) | `handleSurveyNext` deleted experiences/projects/certs BEFORE inserting → silent data loss on any insert failure | **Critical** |
| 5 | `68b7697` (N-O58) | `biggest_challenge` default was `""` (string) but column is `text[]` → every fresh user's auto-save threw HTTP 400 | **Critical** |
| 6 | `a8a2451` (N-O9) | `honors` column was `text` but UI/extractor sent arrays → JSON-stringified storage (same class as #2) | **High** |
| 7 | `ecf1cd1` (A1/A2/A3) | `ai-chat` `temperature: 0.7` + `max_tokens: 1024` broke CV-generation handoff (button never appeared) | **Critical** |
| 8 | `85c6bc5` (N-O38) | StepEducation didn't render the Back button despite receiving `onBack` prop | **High** |
| 9 | `d92e4be` (N-O3) | Phone number extracted from CV but `handleResumeExtracted` never copied it to `profileData` → CVs missing phone | **High** |
| 10 | `999c9ce` (N-O37) | DOCX uploads silently failed — `accept=".pdf,.doc,.docx"` advertised support but only PDF actually worked. Added `mammoth` (lazy-loaded) | **Critical** |
| 11 | `1792c84` (N-O22→26) | Extraction prompt requested 6 fields downstream code reads — projects/certifications/`is_current`/`skills_used`/root-level gpa+honors/education_dates/secondary_education/languages all silently empty | **High** |
| 12 | `286d7a7` (U1) | Stale `cleanProfilePayload` stub in test file — tests passed against an old snapshot regardless of production behavior. Lifted real function into shared util, rewrote test (6 → 13 cases) | **High** |
| 13 | `fa14b53` (Bug 1) | Tier 3 always empty — penalty math made T3 fit-floor mathematically unreachable for goal-aligned Senior+ roles. Switched T3 threshold to use raw skill overlap (pre-penalty) | **Critical** |
| 14 | `abe10b4` (Bug 3) | Skill miscategorisation — 6 React-only category buckets had overlapping definitions; LLM had no consistent way to bucket. Dropped categories entirely; replaced StepSkills with a 72-chip bank in 6 visual sections, single flat `profileData.skills` array | **Critical** |

---

## Test infrastructure

| Before | After |
|---|---|
| 25 tests | 35 tests |
| `cleanProfilePayload` tested via inline stub (drift-prone, false sense of safety) | Real function lifted to `src/lib/onboardingPayload.js`, imported by both Onboarding.jsx and the test |
| 0 tests covered DB-shape contracts | 6 EMPTY_PROFILE shape tests + 7 cleanProfilePayload contract tests |

The new tests directly catch the kind of regressions that produced 5+ of this session's bugs (string defaults for array columns, missing whitelist entries, etc.).

---

## DB schema changes (live + migration files)

| Migration | Change |
|---|---|
| `20260426_profiles_target_preferences.sql` | Added 9 missing columns (`target_job_titles`, `target_industries`, `work_environment`, `work_type`, `employment_status`, `salary_expectation`, `available_start_date`, `open_to_lateral`, `open_to_outside_degree`) |
| `20260426_profiles_employment_status_array.sql` | Converted `employment_status` from `text` → `text[]` with two-step JSON-stringified-array cleanup |
| `20260426_profiles_honors_array.sql` | Same pattern for `honors`: `text` → `text[]` |

All applied to live DB and committed.

---

## Edge function deploys

| Function | Change | Live? |
|---|---|---|
| `generate-career-analysis` | Bug 1 fix (T3 raw-fit threshold). Plus already-deployed timeout bumps + employment_status array handling. | ✓ |
| `generate-tasks` | `employment_status` array handling | ✓ |
| `generate-job-suggestions` | (no changes this session) | — |
| `ai-chat` | A1/A2/A3 fix (temp 0.4, max_tokens 2048) | ✓ |
| `extract-proof-signals` | (no changes — N-X1 / N-X3 still pending) | — |
| `generate-tailored-cv` | (no changes) | — |
| `generate-learning-paths` | (no changes) | — |

---

## Audit findings — what was investigated but not fixed

These are tracked as pending tasks. Listed roughly by descending impact.

### High-impact
- **N-K2/K6** — Tasks have no `due_date` anywhere (LLM schema, insert sites, calendar filter all misaligned). Calendar shows zero tasks regardless of priority. **User decision: out of scope as a "product decision about whether tasks should have deadlines."**
- **N-X4** — `AddInformation` page edits ~10 of ~30+ profile columns. Cannot edit `target_job_titles`, `work_environment`, `work_type`, `employment_status`, `biggest_challenge`, `cv_tailoring_strategy`, etc. To change career direction, user must re-run full onboarding.
- **N-O39 / O44** — Onboarding doesn't collect institution name, education_dates, secondary_education, languages, or "currently studying" status. Partially closed by N-O22→26 (extractor now captures these from CVs); manual entry path still missing.

### Medium-impact (cost / latency)
- **N-K5** — `generate-tasks` system prompt embeds entire `roleLibrary` (~250KB) + `roleSkillMapping` (~150KB) on every call. ~100K input tokens per invocation. Drives the 23.8s observed latency.
- **N-X3** — `extract-proof-signals` prompt embeds full skill (397) + signal (625) libraries (~50KB). Hot-path cost on every CV upload.

### Low-impact / brittle
- **N-X1 / G2** — `extract-proof-signals` has no rate limit (every other function does).
- **N-CA1** — `generate-learning-paths` reads `careerRoles[].skills_gap` but the column it actually wants is `missing_skills`. Works by accident because Onboarding writes both fields to identical arrays.

### False positives from the audit
- **D7** — `replace_career_roles` RPC was claimed missing from migrations. Investigation found it at `supabase/migrations/20260423_career_roles_goal_alignment.sql:8-39`. Live DB matches byte-for-byte.

---

## Known broken / out of scope

- **AddInformation field gaps** (N-X4) — only Profile page can edit core fields; preference fields are onboarding-only.
- **Education manual UI** — onboarding has no input for institution / dates / secondary education / languages. CV extraction sets them; manual entry doesn't.
- **academic_projects** — collected at Step 1 via `SkillTagInput` but no DB column and not in `cleanProfilePayload`. Discarded on save (O10 from original list — known).
- **Tasks have no due_date** (K1/N-K2) — calendar will never display tasks until this product decision is made.
- **Skills extraction prompt categories were dropped** but the auto-extraction still puts everything in one combined `skills` field. The CV generator's per-experience `skills_used` is collected; per-resume `skills` is collected; no separate Tools / Domain / Technical buckets exist anymore.

---

## Architecture notes for next session

### What changed in the React data model
`EMPTY_PROFILE` and `cleanProfilePayload` now live in **`src/lib/onboardingPayload.js`** (extracted from `Onboarding.jsx` so tests can import them directly).

The schema is **single source of truth** for two things:
1. The shape Onboarding initialises React state with.
2. The whitelist of fields that get written to the `profiles` DB table.

If you add a new profile column, you must:
- Add it to `EMPTY_PROFILE` with the right type default (DB column `text[]` → `[]`; `jsonb` → `null`/`{}`/`[]` per intent; `text` → `""`; `boolean` → `false`).
- Add it to the destructure AND the return object in `cleanProfilePayload`.
- The `EMPTY_PROFILE` shape test in `onboarding.utils.test.js` will fail loudly if defaults are the wrong type (catches the entire class of bugs from this session).

### What changed in the career-analysis tier logic
`assignTierWithGoal` now takes `rawSkillFit` as a separate parameter from the penalty-adjusted `fitScore`. The semantics:
- **T1 / T2** ("could be hired NOW") use **adjusted `fitScore`** — penalties (seniority gap, family distance) belong here.
- **T3** ("aspirational, work toward") uses **raw `skillFit`** — penalties don't belong here. The role being above the user's seniority is the point.

If you add a new tier or threshold, decide which fit metric matches the semantics and pass it through.

### What changed in the chat agent contract
`ai-chat` now runs at `temperature: 0.4, max_tokens: 2048` (was 0.7 / 1024). All structured `SUGGESTED_*_JSON:` markers (tasks, roadmap changes, application actions, CV generation, agent redirect) are now reliably emitted and parsed.

If you add a new structured marker, the existing belt-and-suspenders sweep at the bottom of `ai-chat/index.ts` strips trailing markers from `reply` if the LLM goes verbose. Add the marker name to the `STRUCTURED_MARKERS` list.

### What changed in the skills data model
- **No more category buckets** in React state. `profileData.skills` is the single flat array.
- StepSkills is a chip bank (72 curated chips × 6 visual sections) with case-insensitive toggle behavior.
- The CV extractor returns one combined `skills` array — no longer asked to bucket.
- Career analysis edge function unchanged (always read `profile.skills`).
- AddInformation unchanged (always edited `profile.skills` directly).

If you re-introduce categories, you'll need to:
- Add them back to EMPTY_PROFILE.
- Re-add the merge logic in 4 sites (auto-save, saveProgress, handleSurveyNext, handleFinalise).
- Update CV extraction prompt + `handleResumeExtracted`.
- Update `EMPTY_PROFILE` shape test.

---

## How to work with this codebase (operational reference)

### Build + test
```bash
cd ~/getajob && PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH" npm run build
cd ~/getajob && PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH" npm test -- --run
```
Expected: build green; 35/35 tests pass.

### Deploy edge function
```bash
# Set SUPABASE_ACCESS_TOKEN in your local shell (do NOT commit it). Get a
# fresh PAT from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="<your-pat-here>"
cd ~/getajob && PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH" \
  npx supabase functions deploy <function-name> --no-verify-jwt --project-ref ilmqmodklutztuybsvwd
```

### Run SQL via Management API
```bash
# Requires SUPABASE_ACCESS_TOKEN set in shell env (see above). Never paste
# the token literal into a committed file — Supabase secret scanning will
# revoke it on push.
cat > /tmp/q.json <<'E'
{"query":"YOUR SQL HERE"}
E
curl -s -X POST "https://api.supabase.com/v1/projects/ilmqmodklutztuybsvwd/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @/tmp/q.json | python3 -m json.tool
```

### Reset the test user for a fresh onboarding walkthrough
```sql
UPDATE profiles SET onboarding_step = 0, onboarding_complete = false, skills = '{}'::text[]
  WHERE id = '4b243f3a-5035-474e-a89d-aff13fe06cc2';
DELETE FROM experiences WHERE user_id = '4b243f3a-5035-474e-a89d-aff13fe06cc2';
DELETE FROM projects WHERE user_id = '4b243f3a-5035-474e-a89d-aff13fe06cc2';
DELETE FROM certifications WHERE user_id = '4b243f3a-5035-474e-a89d-aff13fe06cc2';
```
`resume_url` stays so the user doesn't have to re-upload their CV.

### Trace tier scoring locally (no rate-limit cost)
The script at `/tmp/tier3_trace.ts` (one-off, not committed) replicates the deterministic Phase 1 of `generate-career-analysis` against a hardcoded user profile. Run with `node --experimental-strip-types /tmp/tier3_trace.ts`. Useful for evaluating threshold changes before deploying.

### Pull function logs
```bash
# Requires SUPABASE_ACCESS_TOKEN set in shell env (see above).
curl -s "https://api.supabase.com/v1/projects/ilmqmodklutztuybsvwd/analytics/endpoints/logs.all?sql=$(python3 -c "import urllib.parse; print(urllib.parse.quote(\"select timestamp, event_message from function_logs where event_message like '%[career-analysis]%' order by timestamp desc limit 30\"))")" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}"
```

### Rate limits
- **OpenAI:** 10,000 req/hr, 200K tokens/min — not the bottleneck.
- **App-level (custom `rate_limits` table):** 5/hr per user for `generate-career-analysis`, 10/hr for everything else. This is what trips during testing.
- Clear with: `DELETE FROM public.rate_limits WHERE user_id = '...' AND function_name = '...'`.

---

## Suggested fix order for next session

1. **Home page audit** — surfaced during live walkthrough as the next critical area. Read `src/pages/Home.jsx` end-to-end + the dashboard widgets it composes; produce a bug list mirroring this session's onboarding audit.
2. **CV upload latency** — profile end-to-end with browser devtools first to identify the bottleneck. Likely candidates: serial `ai-chat` then `extract-proof-signals` calls (could parallelise), the bloated `extract-proof-signals` system prompt (N-X3), and PDF.js worker startup. Measure before fixing.
3. **N-X4** — extend AddInformation to all profile columns. High user impact (no need to re-onboard to change career direction).
4. **N-K5 / N-X3** — trim oversized system prompts in `generate-tasks` + `extract-proof-signals`. ~10× latency + cost win on those endpoints. Partially addresses the CV upload latency from #2.
5. **N-O39/O44** — add manual UI for institution / dates / secondary_education / languages on Step 1 of onboarding (extraction handles them; manual path missing).
6. (Product decision) — **N-K2/K6 due_date** — if tasks should have deadlines, plumb through LLM schema + insert sites + UI.

---

## Verified live (post-session)

| Check | Result |
|---|---|
| Build | ✓ green |
| Tests | ✓ 35/35 |
| `generate-career-analysis` deployed | ✓ (Bug 1 fix live) |
| `ai-chat` deployed | ✓ (A1/A2/A3 fix live) |
| `generate-tasks` deployed | ✓ |
| `generate-job-suggestions` deployed | ✓ (from session 12) |
| Test user state | onboarding_step=0, onboarding_complete=false, skills=[], 0 experiences, 0 projects, 0 certifications, resume_url preserved |
| Dev server | http://localhost:5174/ (background process `bm7lu0j9z`) |

### End-to-end manual walkthrough — all green

After resetting the test user, the developer walked the full Step 0 → 7 onboarding flow twice (once with a PDF CV, once with a DOCX CV). Outcomes:

| Check | Result |
|---|---|
| **All three tiers populated** | ✓ **3 Tier 1 + 5 Tier 2 + 4 Tier 3** (Bug 1 fix verified — Tier 3 "Work Toward" finally has roles) |
| **New StepSkills chip bank UI** | ✓ Toggle behavior works, selected chips stay visible with checkmark, custom-typed skills appear in the "Selected" pill list with a `custom` tag, all entries land in single `profileData.skills` array |
| **PDF upload + extraction** | ✓ Works — same path as before, no regression |
| **DOCX upload + extraction** | ✓ Works (N-O37 fix verified — mammoth lazy-loads, parses `.docx` cleanly) |
| Career analysis runs against fresh DB data | ✓ (N-O20 fix verified — `handleSurveyNext` snapshot+insert+rollback preserves user data even on failure) |
| Phone number reaches DB | ✓ (N-O3 fix verified) |
| Step 1 Back button | ✓ (N-O38 fix verified) |
| Auto-save no longer 400s on fresh users | ✓ (N-O58 + N-O9 + O5 fixes verified — no `malformed array literal` errors in browser console) |

### Issues noted during the walkthrough — for next session

These weren't part of the audit list but surfaced during the live test:

1. **Home page has multiple bugs** — not yet enumerated. Next session should start with a focused audit pass on `src/pages/Home.jsx` and the dashboard widgets it composes (`SkillGapCourses`, `JobMatchChecker`, `ProgressSnapshot`, `WeeklyActions`, `ProfileSummary`, `SkillGaps`).
2. **CV upload is slow** — perceived latency from "drop file" to "extraction complete" is high enough to feel broken. Likely culprits to investigate:
   - `extract-proof-signals` runs sequentially after `ai-chat`'s extraction (StepResumeUpload.jsx ~line 251) — could parallelise the two LLM calls.
   - `extract-proof-signals` system prompt embeds the full skill (397) + signal (625) libraries (~50 KB) on every call — N-X3 from the audit. Hot-path bloat.
   - Mammoth lazy-load on the first DOCX upload adds a one-time 510 KB chunk fetch. Subsequent uploads are warm.
   - PDF.js worker initialisation cost.

   Worth profiling end-to-end with browser devtools (Network + Performance tabs) before optimising — assumption-checking the bottleneck first.

---

## Critical rules carried into next session

1. **INVESTIGATE BEFORE CHANGING CODE.** Report findings + wait for approval before any source change. Worked beautifully this session — caught the D7 false positive, surfaced 40+ unlisted bugs, prevented over-engineered fixes.
2. **PRE-CHANGE VALIDATION.** For every fix: what depends on this code, what could break, what's the diff size. Then approval, then apply.
3. **MINIMAL CHANGES.** Fix the bug, nothing else. Don't refactor adjacent code unless the bug spans it.
4. **TEST AFTER EVERY CHANGE.** Build + tests must be green before commit. Edge function changes require live deploy.
5. **ONE COMMIT PER BUG.** No batched fixes. The 14 commits this session each have a clear single-bug message.
6. **NO FEATURE ADDITIONS** while bugs remain. Pending work list is for fixes; new features wait.

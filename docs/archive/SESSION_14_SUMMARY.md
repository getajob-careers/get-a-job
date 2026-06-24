# Session 14 Summary

**Branch:** `agent-prompts`
**Range:** `cbed2fb..ea5640a` (26 commits)
**Theme:** Full platform bug audit + IL job API migration + selective GPT-4o latency upgrades

---

## ⚠️ ACTION ITEMS BEFORE NEXT SESSION

1. **Rotate the Supabase PAT.** It leaked into chat scrollback twice this session (the working PAT value was pasted directly, not via the `read -s` pattern). Rotate in the Supabase dashboard.
2. **Rotate the RapidAPI key.** Same issue — the 50-char value was pasted into chat during the Techmap/Active Jobs DB integration. Rotate in the RapidAPI dashboard, then re-set the secret via Management API (the `read -s` flow keeps the value out of the transcript).
3. **Delete the cached secret files** at `/tmp/.gaj_supabase_token` and `/tmp/.gaj_rapidapi_key` (mode 600, single-session use). They survive until reboot.
4. **Review the `RAPIDAPI_KEY` fingerprint diagnostic log** still firing on every `generate-job-suggestions` invocation. Drop the `console.log` once integration has been stable for a few sessions.
5. **Future secret pastes:** use `! read -s SECRET && export SECRET && <command>` so the value never enters the transcript.

---

## Commits (26 total, in chronological order)

| # | Commit | Title |
|---|---|---|
| 1 | `776d545` | fix(XC2/JS1): drop stale skill-category refs in JobSuggestions noSkills check |
| 2 | `4f9a03f` | fix(AI3): cert add no longer sends nonexistent skills_validated column |
| 3 | `def9f5a` | fix(XC1): credit experience role-families in family-experience penalty |
| 4 | `406d854` | feat(XC1): staleness banner — surface "refresh roadmap" when profile changes |
| 5 | `71e936a` | fix(AG1): forbid fabricated stats in agent responses |
| 6 | `0258e1d` | fix(staleness): migrate last_reality_check_date to timestamptz |
| 7 | `8c2bdb9` | fix(TR9/TR7): add status dropdown so applications can move past "interested" |
| 8 | `1194dd9` | fix(H1-H4): job match checker — add column, fix prompt schema, refuse URLs |
| 9 | `b03ee3c` | fix(TR4-TR6): add 5 missing JSONB columns for ApplicationRow sub-tabs |
| 10 | `c269c9d` | fix(AG2): scope chat conversations to applicationId to stop context bleed |
| 11 | `d706f4d` | fix(CR1/CR2): strip frontend invention from LearningPaths + retitle readiness pill |
| 12 | `f606462` | fix(JS2/JS3): drop example.com URLs + surface cascade outcome to user |
| 13 | `350da8f` | fix(CAL1/CAL2): pink task palette + cascade-delete events with their app |
| 14 | `49b0340` | fix(TR1/TR2/TR8): auto-classify tier on add, "Unclassified" label, delete button |
| 15 | `015fc76` | fix(AI1+JS): success toasts on Add Information actions; Enter submits Job Match |
| 16 | `71fd82c` | fix(IC1/SD1/SD2): tone discipline, URL discipline, real career data for SD agent |
| 17 | `ed4f0a3` | feat(jobs): replace dead LinkedIn API with Techmap for IL coverage |
| 18 | `e5cd4d7` | fix(jobs): Techmap title encoding — join multi-word titles with literal + |
| 19 | `3feec2c` | fix(jobs): defensively trim+ASCII-validate RAPIDAPI_KEY before fetch |
| 20 | `3d336b4` | fix(jobs): strip leading/trailing quote chars from RAPIDAPI_KEY |
| 21 | `8b3bb75` | feat(jobs): swap Techmap → Active Jobs DB for IL coverage |
| 22 | `4ccb9f1` | fix(jobs): strip-and-keep sanitization for RAPIDAPI_KEY |
| 23 | `d0f70b7` | fix(jobs): preserve real job_url from API; AI hallucinates example.com |
| 24 | `1ce4886` | fix(jobs): broaden Active Jobs DB recall — strip seniority, country only, limit 20 |
| 25 | `0efff91` | feat(jobs): seniority-aware AI scoring |
| 26 | `ea5640a` | perf(jobs): selective gpt-4o upgrade + N-K5 generate-tasks library trim |

---

## Bugs fixed (by area)

### Cross-cutting
- **XC1** Career analysis ignored post-onboarding profile updates: family-experience penalty was anchored to `primary_domain` only; now also credits role families derived from each experience title (Pass-1 exact match against library titles)
- **XC2** Stale skill-category references in JobSuggestions left over after Bug 3 categories drop

### Onboarding / Add Information
- **AI1** Add Information actions had no success confirmation toasts (added 6: cert add/remove, project add/remove, experience add/remove)
- **AI3** Certification add failed because `skills_validated` column doesn't exist; switched to explicit field list
- **AI5** "weeks weeks" duplicate was already eliminated by CR1 LearningPaths rewrite

### Career Roadmap
- **CR1** LearningPaths.jsx invented metadata around clean LLM data (fake priority badge, "Package N" framing, dead optional certification block, "8-12 weeks" fallback string, Google-search Apply links). Stripped to render only LLM-supplied fields.
- **CR2** Readiness pill labels ("Ready & Aligned" etc.) contradicted match scores; replaced with tier strategy names ("Your Move", "Plan B", "Work Toward")

### Tracker
- **TR1** + **TR8** No way to delete applications → added Trash2 button with two-click confirm in ApplicationRow header
- **TR2** Tier always "—" because handleAdd hardcoded `tier: null`; added `matchTier` auto-classifier (15-test helper at `src/lib/tierMatching.js`) and changed display to "Unclassified" fallback
- **TR4-TR6** Skills/Projects/Networking sub-tabs silently failed because `skills_required`, `projects_proof`, `networking_contacts` columns didn't exist (also `follow_up`, `interview_prep` from TR9/TR7). Single migration added all 5 JSONB columns.
- **TR9** + **TR7** No status change UI; Interview/Follow-Up tabs locked forever. Added status dropdown to expanded view header — tabs unlock automatically via React Query invalidation.

### Calendar
- **CAL1** Color collisions in legend (red = Interview AND high-priority Task; green = Follow-up AND low-priority Task). Tasks moved to pink family with priority encoded as intensity.
- **CAL2** Stale events persisted after application deletion. FK constraint changed from `ON DELETE SET NULL` to `ON DELETE CASCADE`.

### Home / Job Match Checker
- **H1** Qualification score never showed in tracker (column missing — same root as H4)
- **H2** Skill breakdown rendered as blank text with literal " — " separators (LLM returned strings, JSX expected objects with `requirement`/`reason`/`gap`)
- **H3** URL-only mode produced fabricated job analyses (LLM hallucinated when fed only a URL); function now returns explicit 400 instead
- **H4** Add to Tracker silently failed because `applications.qualification_score` column didn't exist; migration added it
- Bonus: Enter key in Job Match Checker textarea now submits (Shift+Enter for newline)
- Bonus: source-controlled `analyze-job-match` edge function — it had been deployed from the dashboard with no file in the repo

### Job Suggestions
- **JS2** Cascade fell through to remote/global with no signal to IL user; now prefixes `result.message` with explanatory cascade outcome
- **JS3** All "live" jobs had `https://www.example.com/...` placeholder URLs from JSearch's anonymized free tier. Added `isUsableJobUrl` filter; cascade-level filtering means a query returning all-broken URLs falls through cleanly to the next level.
- **JS1 / XC2** Stale category references — fixed alongside XC2

### Agents (ai-chat)
- **AG1** All agents (career, CV, interview coach, skill dev) fabricated authoritative-sounding statistics ("95% of recruiters", "30% callback rate boost"). Added `NO_FABRICATION_GUARD` constant appended to every agent prompt except resume-extractor.
- **AG2** Conversation context bled across application switches (AppA's chat history sent to LLM with AppB's TARGET APPLICATION block). Conversations query now scoped to current `applicationId`.
- **IC1** Interview Coach still produced fabricated metrics despite NO_FABRICATION_GUARD; added inline tone-discipline line to the agent's base prompt
- **SD1** Skill Dev hallucinated specific course URLs that 404. Added URL discipline: never include URLs, frame as "search [platform] for [course title]"
- **SD2** Skill Dev got only flat list of role titles, not the detailed CAREER ROADMAP block. Now receives same per-role detail (matched/missing skills, readiness %) as career_agent.

### Staleness
- Migrated `profiles.last_reality_check_date` from `date` (day precision) to `timestamptz`. Frontend writes `new Date().toISOString()` instead of `toLocaleDateString("sv")`. Eliminates the false-positive "stale analysis" banner that fired immediately after a successful Refresh because same-day pre-existing rows had `created_at > midnight UTC`.

---

## Edge function deployments

All deployments verified by downloading the post-deploy source and grepping for the change.

| Function | Versions deployed | Notes |
|---|---|---|
| `generate-career-analysis` | v47 → 48 → 49 → 50+ | Family penalty fix; gpt-4o upgrade |
| `ai-chat` | v31 → 32+ → 33+ | NO_FABRICATION_GUARD; IC1/SD1/SD2 tone+URL discipline |
| `analyze-job-match` | v9 → 10+ | Source-controlled; prompt schema fix; URL-mode rejection |
| `generate-job-suggestions` | v40 → many → final | Techmap → Active Jobs DB; multiple sanitizer iterations; gpt-4o upgrade |
| `extract-proof-signals` | v4 → 5 | gpt-4o upgrade |
| `generate-tailored-cv` | v36 → 37 | gpt-4o upgrade |
| `generate-tasks` | v21 → 22 | N-K5 library trim |

**Deploy lesson learned:** `cd /Users/elienglard/getajob` before `npx supabase functions deploy ...`. Bash tool's working directory persists between calls; without explicit `cd`, deploys ran from `/private/tmp/<old-download-dir>` and uploaded stale source. Bit us twice this session (analyze-job-match, generate-job-suggestions). All subsequent deploys explicitly `cd` first.

---

## Job API migration

### What we tried (in order)
1. **Original:** Fantastic.Jobs LinkedIn Job Search API. Disabled subscription, dead.
2. **First swap:** Techmap "Daily International Job Postings" (apijobs.dev). 88 IL hits per probe — but ~90% from `alljobs_il` source where company names are anonymized (`חברה ב...` placeholders, "Confidential employer") and apply URLs land on alljobs.co.il SPA pages. Real coverage but unactionable for users.
3. **Final:** Fantastic.Jobs **Active Jobs DB**. Real ATS sources (greenhouse.io, comeet.com, workday, lever) — gives real Israeli company names (Unframe, JFrog, Komodor, SentinelOne, etc.) with working apply URLs.

### Cascade design (current)
- IL users → Active Jobs DB (single country-level query, `location_filter="Israel"`, seniority modifiers stripped from `title_filter`, `limit=20`)
- All other users → JSearch (existing global cascade: role+metro → role+country → role+`Israel`-in-query → role+remote → role-only-global)
- IL users falling through to JSearch get the cascade-message banner: "No live postings in Israel — showing remote and international opportunities instead"

### JSearch IL coverage — confirmed zero
Probed 4 query formats (no location, "Tel Aviv, Israel" in query, "Israel" in query, `country=IL` param). All 4 returned 0 IL jobs even though JSearch supposedly aggregates Google-for-Jobs. Don't try to use JSearch as IL primary; it has nothing.

### Sanitization saga (the RAPIDAPI_KEY incidents)
Five distinct paste-failure modes hit and fixed:
1. Trailing apostrophe (`a1b7…c0b6'` → 51-char header → 403 not subscribed)
2. Surrounding quote chars from clipboard managers
3. Invisible non-printable bytes (BOM, zero-width space) mid-string
4. User pasted page text instead of key value (`Page Not Found - API Hub`)
5. Initial whole-value-reject sanitizer was too strict — "key has 1 bad char anywhere → entire key dropped to empty"

Final `sanitizeKey()` strips bytes outside printable ASCII (`\x20-\x7e`), trims whitespace, then strips wrapping quote chars. Plus a per-call fingerprint log (`<first8>...<last4> len=50`) so future paste mishaps are diagnosable in one log line without leaking the value.

### Setting secrets via Management API
Established pattern: `POST /v1/projects/<ref>/secrets` with body `[{"name":"RAPIDAPI_KEY","value":"..."}]`. Bypasses the dashboard paste step that introduced the corruption. Works first try.

---

## Performance work — selective GPT-4o upgrade

Latency audit over a 10-hour traffic window (real production calls, n=109 across all functions):

| Function | Before | After (expected) | Δ cost/mo (100 students) |
|---|---|---|---|
| `generate-career-analysis` | 51s p50, 71s max | ~12s | +$31 |
| `generate-tailored-cv` | 28s p50 | ~14s | +$45 |
| `extract-proof-signals` | 25s p50 | ~10s | +$3 |
| `generate-job-suggestions` | 16s p50, 49s max | ~7s | +$52 |
| `generate-tasks` (N-K5 trim, no model change) | 24s p95 tail | ~8-10s | $0 (saves prompt tokens) |
| `ai-chat` (left on -mini) | 6s p50 | unchanged | $0 (would be +$800/mo) |
| `analyze-job-match` (left on -mini) | 0.7s p50 | unchanged | $0 |
| `generate-learning-paths` (left on -mini) | 0.1s p50 | unchanged | $0 |

**Net cost:** ~+$130/mo at 100-student scale. Reversible per-function (each `MODEL` constant has a comment explaining the tradeoff).

**Why not ai-chat:** ~30k calls/mo at scale — gpt-4o upgrade would have cost ~$800-2000/mo. -mini is fast enough (6s p50) for chat.

---

## Test suite changes

**Before:** 35 tests (Vitest, 7 test files)
**After:** 62 tests (9 test files)

New files:
- `src/test/staleAnalysis.test.js` (11 cases) — exact timestamp comparison after the date→timestamptz migration
- `src/test/tierMatching.test.js` (15 cases) — auto-classification helper for TR2

Failing test fixed once (incorrect "Customer Specialist" subset assertion). All 62 pass at session end.

---

## Migrations applied (live + source-controlled)

```
20260426_applications_qualification_score.sql
20260426_applications_subtab_jsonb_columns.sql        (5 JSONB columns: skills_required, projects_proof, networking_contacts, follow_up, interview_prep)
20260426_calendar_events_cascade_app_delete.sql       (FK SET NULL → CASCADE)
20260426_last_reality_check_date_timestamptz.sql      (date → timestamptz)
```

All applied to production via Management API SQL endpoint, verified by re-querying `information_schema`.

---

## Skills decision

Recommended 4 to install:
- **Playwright Skill / webapp-testing** — eliminate the manual UI testing loop pattern
- **postgres** — schema introspection + migration scaffolding
- **docx** — simplify the 1500-line CV generator
- **varlock-claude-skill** — prevent the next PAT leak (verify README confirms it's secrets management before installing)

Currently 6 skills installed at `~/.claude/skills/` (debugging-wizard, fullstack-guardian, systematic-debugging, test-driven-development, test-master, vibesec) but **none are Skill-tool-invocable** — they're filesystem-only and were used this session by reading SKILL.md directly with the Read tool. Verify the install mechanism for the 4 above before assuming Skill tool integration.

---

## Remaining open items

| ID | Status | Why deferred |
|---|---|---|
| **TR3** | held | "CV gen broken" — need a concrete error message; `error_logs` empty for `generate-tailored-cv` last 7 days |
| **AI6** | held | Never specified what was wrong |
| **CV1-CV4** | not investigated | Listed by ID only, no descriptions provided |
| **N-O39→O44** (#30) | pending | Education fields (high-school dates, secondary subfields, education_dates parsing) lost or never collected |
| **N-K2/K6** (#31) | pending | Tasks have no `due_date` — flagged as product decision earlier this session |
| **N-X3** (#33) | pending | `extract-proof-signals` system prompt embeds entire signal+skill libraries — would break discovery if naively trimmed; needs deterministic pre-filter design before touching |
| **N-X4** (#35) | pending | `AddInformation` only edits ~10 of ~30+ profile columns. Largest user-facing scope-vs-effort win remaining. |
| Skip-JSearch-on-IL | optional | 5-line code change; saves ~4 useless API calls per IL user click |
| Cache-by-input-hash for career-analysis | optional | Combined with gpt-4o upgrade would make most refresh clicks near-instant |
| Drop RAPIDAPI_KEY fingerprint diagnostic log | optional | Once Active Jobs DB integration confirmed stable across a few sessions |

---

## What worked well this session

- **Live log inspection via Management API** — diagnosed root causes in seconds instead of guessing. Established `/tmp/.gaj_supabase_token` pattern for per-session secret persistence.
- **Verified-deploy pattern** — every edge function deploy followed by `npx supabase functions download` + grep to confirm the change actually shipped. Caught two cwd-persistence bugs that would have wasted a day of "why doesn't my fix work."
- **Investigation-before-fix discipline** — user pushed back on prompt-slimming for career-analysis (would-have-broken-Tier-2 concern), I re-read the code, and the conclusion changed: career-analysis was already slim. Avoided shipping a wrong fix.
- **Cost-benefit framing for GPT-4o upgrades** — kept ai-chat on -mini ($800/mo saved), upgraded only the 4 click-triggered slow functions (~$130/mo), all reversible.

## What hurt and why

- **Two PAT leaks via paste-into-chat.** Both times the working pattern was right there (`read -s`) and we didn't use it. Re-establish discipline.
- **Five RAPIDAPI_KEY paste-failure modes** before sanitization was robust. Should have set the secret via Management API from the start instead of dashboard paste.
- **Wrong-cwd deploys** twice. Caused real debugging time. Now habituated to `cd /Users/elienglard/getajob &&` prefix on every deploy.

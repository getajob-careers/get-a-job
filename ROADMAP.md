# Get A Job — Roadmap

Living document. Both Eli and Isaac update as work moves. Anchor for what's shipped, what's in flight, what's next.

**Pilot launch: June 15, 2026 — 80 own-pilot users via WhatsApp groups. Reichman 10-student practicum follows in August.**

This roadmap's source of truth for **scheduling** is the [June 15 launch sprint](#june-15-launch-sprint-may-4--june-15-2026) section below. The "Planned: …" sections later in the file describe **feature designs** in detail; week numbers inside those design sections may be stale — defer to the sprint plan when they conflict.

---

## Done (recent)

- **2026-05-08 — Docs catch-up + living source of truth (PR #36).** `PROJECT_INSTRUCTIONS.md` established as the index/onboarding doc — cross-references `CLAUDE.md` / `ROADMAP.md` / `tasks/lessons.md` / `docs/research/`. Brings any new collaborator (Isaac) fully up to speed in one read: where we are, all 15 edge functions, all 5 voice-rules constants, key files, sprint status, Isaac's task list, how to work with Claude Code (ask-don't-tell, decision checkpoints, full-CI-before-push), tools we use. ROADMAP Done section caught up through PRs #20-#35. PR template gained a checkbox enforcing the update rule.
- **2026-05-06 → 2026-05-08 — Wk 3 LinkedIn command center: Networking tab Phase 4 PR B (PR #35).** Outreach Conversation Coach. 8 outreach goals (recruiter / hiring manager / alumni / informational interview / thank-you / reconnect-dormant / referral / recommendation), multi-turn coaching, warm-up-vs-ask judgment for multi-step goals (dormant-relationship referrals correctly emit `warm_up_advice` "send reconnection first, ask in turn 2-3"). Schema: 1 row per (user, goal, target_person), JSONB `message_thread`, 4-policy RLS. Edge function with two modes (new / continue). Programmatic anti-pattern detection in post-process — model still slips "I hope you're doing well" despite hard-rule injection, so warning chips surface to user. NetworkingPrinciples relocated to Resources page (Resources accordion now supports optional `component` field on guide entries).
- **2026-05-06 — Wk 3 LinkedIn command center: Networking tab Phase 4 PR A (PR #34).** Networking tab — 6-card networking principles + Comment Coach. Comment Coach = highest-leverage AI tool per the research doc (substantive comments → ~55% profile-view lift for sub-1K-follower accounts). Anti-fab: empty options + `no_fit_reason` when nothing genuine to contribute.
- **2026-05-06 — Wk 3 LinkedIn command center: Posts Phase 3 (PR #33).** 4 more post types (recap / observation / question / free_form). Carousel warning when LLM picks `format_recommendation: 'carousel'` (under-5K-follower accounts get warned per the research doc).
- **2026-05-06 — Wk 3 LinkedIn command center: Posts Phase 2 MVP (PR #32).** 3 post types (project / lessons / milestone), edge function, Compose flow with separate `edited_text` column for prompt-quality analysis.
- **2026-05-05 — Wk 3 LinkedIn command center: Phase 1 hub tabs (PR #31).** `LinkedinOptimizer.jsx` becomes a 3-tab hub (Profile / Posts / Networking) routed via `useSearchParams`. POST_VOICE_RULES added to `_shared/voice-rules.ts`.
- **2026-05-05 — LinkedIn post performance research doc (PR #30).** `docs/research/linkedin-post-performance.md`, ~430 lines, cross-validated / single-sourced / contested tagging. Source-of-truth referenced by all LinkedIn-related prompts.
- **2026-04-28 → 2026-05-04 — CV polish series (PRs #21–#29).** Template engine + sector-aware fonts + matcher hardening (#21), chat story-capture follow-up gating + CV style picker (#22), date normalization (#23), conditional Experience umbrella + remove anchoring subtitle (#24), institution guard + About left-align + sub-header weight (#25), drop Experience umbrella + cross-section honors dedup (#26), per-bucket tailoring policy (preserve authentic register — don't push corporate-tech voice into volunteer roles) (#27), Polished one-page chrome (#28), restored visual hierarchy on ATS template (#29).
- **2026-04-27 — Replace banned-vocab lists with positive voice rules (PR #20).** Old approach (banning words) didn't work; the model pattern-matched around banned words but kept the underlying voice. Voice-rules approach gives the model what TO write, not just what NOT to. Set the architectural precedent for `CV_VOICE_RULES` / `LINKEDIN_VOICE_RULES` / `POST_VOICE_RULES` / `COMMENT_VOICE_RULES` / `OUTREACH_VOICE_RULES`.
- **2026-05-04 — Wk 2 Story Bank backend (PR #8).** Schema (`stories` table + RLS + 4 indexes + trigger), `extract-story-from-text` edge function (gpt-4o-mini, 3-layer anti-fabrication), CV Agent `SUGGESTED_STORY_CAPTURE_JSON` integration with sequential follow-up after CV gen completes (Path B — Path A same-turn cross-emission failed reliability), `StorySaveCard` frontend component (5-phase state machine), Story Bank consumption in `generate-tailored-cv` with STORY BANK PRECEDENCE + BINDING rules. Headline metric "88% adoption in first quarter" verbatim binding 3/3 in DOCX verification.
- **2026-05-04 — Wk 1 Day 4: function_metrics observability across 9 edge functions (PR #6).** Per-call latency / ok-fail / model / tokens / locked-in cost_usd, fire-and-forget writes, smoke-tested in prod. Powers Wk 2 admin view + Wk 5 scout sizing.
- **2026-05-04 — Wk 1 Day 1: Application Outcome Loop schema (PR #5).** `status_changes` audit table + trigger, `applications.source` / `found_via_*` / `outcome_notes` columns, all 3 add-paths populate `source` correctly.
- **2026-05-04 — Wk 1 pending fix #30: education fields manual UI (PR #7).** `StepEducation` now has inputs for `education_dates`, `honors`, `languages`, `secondary_education`. All 4 round-trip cleanly to DB.
- **2026-05-04 — Wk 1 pending fixes verified shipped via prior commits:** #31 tasks `due_date` (B4 fix from Apr 27), #35 AddInformation column coverage (PR #3 covers 33 of 38 user-editable cols).
- **2026-04-28 — JD-based track auto-assignment, goal-aware scoring, seniority cap.** Replaces title-based track guesses; track now derived from `analyze-job-match` returning `match_score` + `goal_alignment_score` + `required_seniority`. `trackFromScores` (`src/lib/scoreApplication.js`) applies thresholds + a hard track_3 cap when role exceeds user stage.
- **2026-04-28 — Demo for Reichman professor + Dr. Miller. Practicum pilot confirmed Aug–Nov 2026.** Zero bugs in demo. Both faculty personally vouching.
- **2026-04-28 — Team workflow infrastructure:** ROADMAP.md, PR template, CI workflow, CLAUDE.md handoff rules.
- **Earlier April 2026:** CV Track 1 prompt improvements, learning-paths URL validation, ai-chat retry layer, onboarding handleFinalise clobber fix, Career Agent dropdown, demo account reset RPC.

## In Progress

- **Wk 2 Day 5 / Isaac's queue** — Admin view (`cohort_scout_metrics` + `student_engagement_summary` SQL views + `/admin` page, RLS-gated). Eli picking up.
- **Wk 3 remaining (Eli):** Daily Action Card schema + edge function · Admin chat log viewer · Admin story browser
- **Wk 3 remaining (Isaac):** Story Bank Phase 2 AddInformation surface · Daily Action Card UI · Daily Action calibration loop

---

## June 15 launch sprint (May 4 → June 15, 2026)

6-week sprint. ~30 dev-days for Eli (full-time), ~15 for Isaac (50%) = **45 dev-days against ~58 days of estimated work.** Some features ship as **v1 (functional) instead of v2 (polished)** — nothing is cut from scope, but post-launch iteration handles polish based on real pilot signal. The v1/v2 cuts table is documented at the end of this section.

### Dependency map (the order things ship in)

```
Week 1: Foundations
  ├── PRs merged ────────────────────────────────────────┐
  ├── Outcome Loop schema (audit table + applications cols)│
  ├── function_metrics + Sentry + PostHog instrumentation │
  ├── Domain + Vercel deploy ──────────────────────────────┤
  ├── Pending fixes (#30, #31, #33)                       │
  └── AI disclaimer + privacy notice                      │
                                                           │
Week 2: Building on foundations                            │
  ├── Landing page (needs domain) ◄────────────────────────┤
  ├── Admin view (needs function_metrics) ◄────────────────┤
  ├── Story Bank schema + extract function                 │
  └── Story Bank → CV gen consumption                      │
                                                           │
Week 3: Engagement layer                                   │
  ├── Story Bank phase 2 (AddInformation surface)          │
  ├── LinkedIn Optimizer (generation-first, no PDF needed) │
  └── Daily Action Card                                    │
                                                           │
Week 4: Networking + Practicum foundations                 │
  ├── LinkedIn import (needs Eli's archive! request Wk 1) │
  ├── Internship Finder Phase 1 (profile gen + matching)   │
  └── Connection cross-reference (needs LinkedIn)          │
                                                           │
Week 5: Scout + Practice Interview + Role library          │
  ├── Autonomous Job Scout (needs function_metrics)        │
  ├── Practice Interview Agent (needs Story Bank)          │
  └── Schema validator + role research skill               │
                                                           │
Week 6: Final features + launch                            │
  ├── Streaming chat                                       │
  ├── Firecrawl JD auto-fetch (activate Firecrawl now)     │
  ├── Final QA + smoke test                                │
  └── Soft launch → full launch June 15                    │
```

### Paid services activation calendar

Activate when needed, not before. Total monthly recurring cost at launch: **~$130/mo.**

| Service | When | Why now | Monthly cost |
|---|---|---|---|
| **1Password** | Wk 1 Day 1 | Before any other credential creation | $5–8 |
| **Domain (Cloudflare Registrar)** | Wk 1 Day 1 | DNS propagation needs 24–48h buffer | ~$1/mo amortized |
| **Vercel Hobby** | Wk 1 Day 2 | Free tier covers pilot; need for preview deploys | $0 |
| **Sentry Developer** | Wk 1 Day 2 | Free 5K errors/mo; need from launch | $0 |
| **PostHog Free** | Wk 1 Day 2 | Free 1M events/mo; instrument from day 1 | $0 |
| **JSearch Pro (RapidAPI)** | Wk 1 Day 2 | Already in production; upgrade from Basic now | $25 |
| **Active Jobs DB Pro (RapidAPI)** | Wk 1 Day 2 | Already in production; upgrade now | ~$25 |
| **Coursera affiliate signup** | Wk 1 Day 3 | 3–5 day approval window | $0 |
| **LinkedIn Learning affiliate signup** | Wk 1 Day 3 | 3–5 day approval window | $0 |
| **OpenAI Track 2 pre-spend** | Wk 5 | Need ~$50 of test calls to auto-promote to Track 2 (450K TPM headroom) before launch wave hits | One-time $50 |
| **Mailgun Free (inbound)** | Wk 4 OR skip | Only needed if LinkedIn email forwarding ships v1; defer to post-launch | $0 |
| **Firecrawl Hobby** | **Wk 6 Day 1** | Don't activate until JD auto-fetch ships. Save $19 × 5 weeks = $95 | $19 |
| **Langfuse Cloud Free** | Wk 5 | Free 50K observations/mo; activate when scout ships and LLM volume increases | $0 |
| **Cursor Pro** | Anytime | Personal preference, doesn't block anything | $20 |

**Cost-timing wins:** Firecrawl deferred to Wk 6 saves ~$95. Mailgun skipped entirely. **Pre-launch one-time:** ~$60. **Recurring at launch:** ~$130/mo.

### Week 1 (May 5–11): Stabilize + foundations

**Eli (5 days)**

| Day | Task | Status |
|---|---|---|
| Mon | 1Password setup + domain purchase + Cloudflare DNS (let propagation start) | — |
| Tue | Merge PRs #1–5 → Sentry/PostHog/Vercel signup + Vercel connect to repo (preview only) | PRs #1–5 ✓ merged |
| Wed | **Application Outcome Loop schema** + auto-populate `source` from add-paths | ✓ shipped (PR #5) |
| Thu | function_metrics table + emit from each edge function | ✓ shipped (PR #6) |
| Fri | Pre-spend OpenAI to land in Track 2 (~$50). Affiliate signups. **Request your own LinkedIn full archive (24h wait)**. Smoke test + buffer | — |

**Isaac (2.5 days)**

| Day | Task | Status |
|---|---|---|
| Mon | Pending fix #31: tasks `due_date` | ✓ already shipped (B4 fix Apr 27) |
| Wed | Pending fix #30: education fields manual UI | ✓ shipped (PR #7) |
| Fri | Pending fix #33: extract-proof-signals library bloat (filter by primary_domain) + AI disclaimer text + onboarding consent screen | #33 declined (extraction quality risk too high for marginal savings); disclaimer + consent still pending |

### Week 2 (May 12–18): Story Bank core + Landing + Admin

**Eli (5 days)**

| Day | Task | Status |
|---|---|---|
| Mon | Story Bank schema + RLS migration | ✓ shipped (PR #8) |
| Tue | `extract-story-from-text` edge function (gpt-4o-mini, structured output) | ✓ shipped (PR #8) |
| Wed | CV Agent integration: SUGGESTED_STORY_CAPTURE_JSON parsing + save card UI | ✓ shipped (PR #8) |
| Thu | Story Bank consumption in `generate-tailored-cv` (pull stories matching JD keywords) | ✓ shipped (PR #8) |
| Fri | Buffer + integration testing + cross-check Isaac's landing page | — |

**Isaac (2.5 days)**

| Day | Task | Status |
|---|---|---|
| Mon | Landing page: v0.dev generation → paste into `Landing.jsx` → routing change for unauth users | — |
| Wed | Admin view: SQL views (`cohort_scout_metrics`, `student_engagement_summary`) + `/admin` page (read-only, RLS-gated to Eli's user_id) | in progress (Eli picking up) |
| Fri | ESLint warning for hardcoded hex + Playwright screenshot baseline (top 8 screens) | — |

### Week 3 (May 19–25): LinkedIn Optimizer + Daily Action + Story Bank surface + Admin pilot tooling

**Eli (5 days)**

| Day | Task | Status |
|---|---|---|
| Mon–Wed | **LinkedIn Optimizer (generation-first)** — page, prompt, generate-from-profile flow. v1 = no PDF upload mode, just generation from existing profile data + Story Bank stories | ✓ shipped + expanded into a 3-tab command center (Profile / Posts / Networking) — PRs #30 (research), #31 (Phase 1 hub), #32 (Phase 2 Posts MVP), #33 (Phase 3 4 more types), #34 (Phase 4 PR A: Comment Coach), #35 (Phase 4 PR B: Outreach Conversation Coach) |
| Thu | Daily Action Card schema + `generate-daily-action` edge function (priority logic + LLM picker) | — |
| Fri | **Admin chat log viewer + admin story browser** (new cards on `/admin`). How Eli will tune prompts during the pilot based on real student data. Same RLS gating pattern as existing admin cards (`is_admin()`-gated SELECT policies + admin RPC functions with explicit gate). v1: read-only browse; filter by student dropdown. Buffer absorbed if these run long; integration testing slips to Wk 4 buffer. | — |

**Eli Friday — admin pilot tooling detail**

1. **Admin chat log viewer.** Reads `chat_messages` + `conversations` joined. New `admin_chat_logs(p_user_id uuid, p_limit int)` RPC. Card on `/admin` with student dropdown → renders threaded message list (user message → agent reply with `suggested_*_json` blocks pretty-printed). Shows the suggested-action blocks the agent emitted (TASKS, ROADMAP_CHANGES, APPLICATION_ACTIONS, CV_GENERATION, AGENT, STORY_CAPTURE) so prompt drift is visible at a glance.
2. **Admin story browser.** Reads `stories` table. New `admin_stories_browse(p_user_id uuid NULL, p_limit int)` RPC — null user_id = all students, otherwise filtered. Card on `/admin` with student dropdown + story list showing: title, source surface (`conversation` / `manual_form` / etc), STAR fields, metrics, skills_demonstrated, tools_used, and `extraction_notes` italicised so Eli can see what the extractor left blank and why. Both raw-text (when available — e.g. linked `chat_messages` for `source='conversation'`) and STAR output side-by-side where the data permits, so prompt-tuning signal is direct.

**Isaac (2.5 days)**

| Day | Task | Status |
|---|---|---|
| Mon | Story Bank Phase 2: AddInformation Experience tab inline stories + quick-add modal | — |
| Wed | Daily Action Card UI on Home dashboard (display + Done/Snooze/Dismiss actions) | — (depends on Eli landing schema + edge function first) |
| Fri | Daily Action calibration loop (dismissed-type backoff in priority weighting) | — |

**Wk 3 scope expansion note.** What was originally scoped as "LinkedIn Optimizer (generation-first)" expanded into a full 3-tab command center across PRs #30–35 — driven by Eli's research finding that commenting on others' posts is the highest-leverage motion for sub-1K-follower accounts (~55% profile-view lift). The original scope (Profile generation from Story Bank) shipped as Phase 1 (#31). Posts (Phase 2 #32 + Phase 3 #33) and Networking with Comment Coach + Outreach Conversation Coach (Phase 4 #34 + #35) are scope additions justified by the research. Wk 3's other tracks (Daily Action, admin tooling, Story Bank Phase 2) slipped into Wk 4 buffer as a result.

### Week 4 (May 26 – June 1): LinkedIn import + Internship Finder Phase 1

**Eli (5 days)** — should have own LinkedIn archive by now (requested Wk 1)

| Day | Task |
|---|---|
| Mon–Tue | LinkedIn import — schema (`linkedin_imports` + `linkedin_connections` + `linkedin_change_events`) + zip upload edge function + parser (Connections.csv first, others added if time) |
| Wed | Connection cross-reference — match user's connections against Internship Picker company list. Surface "X connections at Atera" UI on Tracker rows |
| Thu | Internship Finder schema (`internship_profiles` + `companies` + `company_targets` + `faculty_practicum_companies`) + `practicum_mode` onboarding toggle + `generate-internship-profile` edge function |
| Fri | Buffer + integration test |

**Isaac (2.5 days)**

| Day | Task |
|---|---|
| Mon | `match-internship-companies` edge function (scoring against profile) |
| Wed | `/Practicum` page UI: profile display + kanban pipeline (basic — exploring → outreach → interview → offered) |
| Fri | Career Agent practicum prompt addition + SUGGESTED_COMPANY_TARGET_JSON parsing |

**Wk 4 risk:** Internship Finder is normally 10 days; we're fitting ~4. v1 cuts: no curated companies DB seed (job-board API only), no `draft-outreach-message` (defer post-launch), no faculty-provided list (manual entries). Phase 2 polish post-launch.

### Week 5 (June 2–8): Scout + Practice Interview + Role library

**Eli (5 days)**

| Day | Task |
|---|---|
| Mon | Autonomous Job Scout schema (`scout_findings` table) + `pg_cron` schedule + `scout-find-jobs` edge function skeleton |
| Tue | Scout scoring pipeline (reuse `analyze-job-match` logic) + threshold logic + `fit_rationale` generation |
| Wed | Scout UI: Home dashboard "Scout" card + JobSuggestions integration (scout badge) + Career Agent passive mention |
| Thu | Practice Interview Agent schema + question generation edge function + answer scoring rubric |
| Fri | Practice Interview Agent UI: mode toggle on `/InterviewCoach` + practice-mode chat |

**Isaac (2.5 days)**

| Day | Task |
|---|---|
| Mon | Schema validator skill (reads `role_library` + `skill_library`, emits enums + ID sets as JSON) |
| Wed | Role library research skill (slash command, drafts to `_drafts/`) |
| Fri | Add 30–50 business-student roles using the research skill (BD Analyst, Solutions Engineer, RevOps, Customer Marketing, GTM Strategist, etc.) |

**Wk 5 risk:** Practice Interview ships v1 — basic Q&A with rubric scoring; no story integration polish, no drill-down. Story integration post-launch.

### Week 6 (June 9–15): Final features + polish + launch

**Eli (5 days)**

| Day | Task |
|---|---|
| Mon–Tue | **Streaming chat refactor** — convert `ai-chat` to streaming responses (frontend SSE handling + backend OpenAI streaming + retry logic adjustment) |
| Wed | Morning: **activate Firecrawl Hobby ($19/mo)**. Afternoon: Firecrawl JD auto-fetch in `handleAddToTracker` (~30 lines) |
| Thu | Final smoke test: fresh user signup → onboarding → application → CV gen → LinkedIn optimize → daily action → scout finding → practice interview. Find what breaks. |
| Fri | Fix what broke. Triage. Ship-no-ship decision. **Soft launch — invite first 10 users from group chat.** |

**Isaac (2.5 days)**

| Day | Task |
|---|---|
| Mon | Story Bank → Career Agent passive mention. Story Bank → LinkedIn Optimizer evidence injection |
| Wed | Visual redesign incremental: token migration on top 5 most-trafficked components (Home, Tracker, AddInformation, Career Agent, Onboarding). Playwright baseline as regression check. |
| Fri | Final UI polish + responsive checks on mobile + faculty briefing materials |

### Launch weekend (June 13–15)

| Day | Task |
|---|---|
| Sat (Jun 13) | Quiet day — monitor preview environment, fix issues found Friday |
| Sun (Jun 14) | Production deploy on launch domain. Final smoke test. Open registration |
| **Mon (Jun 15)** | **Full launch — broader invite from WhatsApp groups (target 80 own-pilot users)** |

### v1 / v2 cuts (the honest cuts inside "everything ships")

| Feature | v1 ships June 15 | v2 polish post-launch |
|---|---|---|
| LinkedIn import | Connections.csv parsing + connection cross-reference at companies | Other archive files (Recommendations, Endorsements, etc.), email forwarding mode, diff-on-import |
| Internship Finder | Profile gen, matching against job board, kanban UI, Career Agent integration | Curated companies DB seed (~100 IL companies), faculty list import, `draft-outreach-message` |
| Practice Interview | Mode toggle, question generation, answer scoring, rubric output | Story integration polish, drill-down conversation, session summary visualization |
| LinkedIn Optimizer | Generation-first from profile + stories | Visual mirror page (per ROADMAP entry below), PDF upload mode for current LinkedIn comparison |
| Daily Action Card | Card with Done/Snooze/Dismiss + calibration loop | Calendar integration ("block time"), advanced source variety |
| Scout | Daily cron + scoring + Home card + Career Agent passive | Per-user notification preferences, optional digest emails |
| Visual redesign | ESLint warning + screenshot baseline + top-5 component token migration | Full migration of remaining 200+ hex usages |
| Role library expansion | 30 new roles via research skill | 50+ roles, validated cross-references, market notes for each |
| Streaming chat | Working stream | Polished error states, retry UX, optimistic message UI |

### Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Eli's LinkedIn archive doesn't arrive Wk 1 | Medium | Request immediately. If late, parser uses sample data; ship Connections-only v1 |
| Wk 4 Internship Finder runs over | High | v1 cuts already documented (no curated DB, no outreach drafting). Accept the cut. |
| Wk 6 Streaming chat breaks existing chat | Medium | Land it Mon–Tue so Wed–Fri has rollback time. If risky, defer streaming to post-launch |
| Visual redesign migration introduces regressions | Medium | Playwright screenshot baseline IS the regression check. If breaks > 3 components, revert + ship as post-launch |
| OpenAI rate limits hit during launch wave | Low | Pre-spend Wk 5 lands you in Track 2 (450K TPM). Should comfortably handle 80 users onboarding |
| Domain DNS propagation takes >48h | Low | Buy Wk 1 Day 1 — gives 5 weeks of buffer |
| Isaac's part-time capacity drops below 50% | Medium | Plan stays achievable — drops to 40d if Isaac is at ~25%. Cuts visual redesign + role library would absorb shortfall |
| Sentry / PostHog instrumentation slows feature work | Low | Both are 1-line SDK installs. Real work is wiring events through; minimal dev cost |
| Privacy counsel review takes >2 weeks | Medium | Engage Wk 1 with a 3-week deadline. They're typically responsive on small scope. |

### Eli's personal Wk 1 to-dos (beyond code)

1. **Engage Israeli privacy counsel today** — 3-hour consultation. Brief on: LinkedIn data import, third-party connection data processing, 80-user own-pilot consent posture. Goal: signed-off privacy policy + LIA documentation by Wk 5. Budget ₪3–6K.
2. **Sign Isaac's equity / contractor agreement this week** — even a simple 1-pager.
3. **Personal financial runway document** — months sustainable without revenue. Determines mid-pilot extension vs. compress decisions.

---

## Planned: LinkedIn full-archive import

Status: **design complete, awaiting trigger.** Eli is waiting on his own LinkedIn archive to arrive so the actual file structure can be inspected before parser code is written.

### Design

- **Full archive only** — skip the quick "Want something in particular" export. LinkedIn enforces a 2-hour cooldown between data export requests, which makes a two-phase (quick + full) flow impractical. Full archive includes everything we need: Connections, Profile, Positions, Skills, Education, Recommendations, Endorsements.
- **Requested at onboarding step 0**, onboarding flow does not depend on it. User clicks a deep link to LinkedIn's data download page, requests, returns to onboarding. ~24h LinkedIn processing.
- **Single upload zone**, auto-detects archive type. Accepts the .zip; if it's the quick variant (no Connections.csv) we ingest what's there and flag networking features as still locked.
- **Files parsed**: Connections, Profile, Positions, Skills, Education, Recommendations (received + given), Endorsements_Given. Skip Messages, search history, ad data, posts (not needed; reduces blast radius).
- **Networking unlocks when connections are imported.** Cross-references connections with target companies on the Internship Picker + Tracker (e.g., "You have 3 connections at Atera").
- **Diff-on-import for re-uploads** — surfaces what changed since last import (especially company moves at target companies). Schema: `linkedin_imports` + `linkedin_change_events` tables; UPSERT by LinkedIn URL with name+company fallback for vanity-URL changes.
- **Smart re-upload prompts**: contextual ("data is 28 days old" banner when adding an application to a target company), quarterly task auto-generated, optional Mailgun email forwarding for zero-effort sync (power users).

### Security

- **Delete the raw .zip immediately after parsing** — never lands in Storage.
- **No PII in logs** (counts and timings only).
- **Encrypt sensitive columns** at the application layer: `linkedin_connections.email`, `linkedin_recommendations.text`. RLS protects access; encryption protects backup leaks.
- **RLS on every `linkedin_*` table**, 4-policy pattern matching `applications`. Verify against `pg_class.relrowsecurity` per the lessons.md doctrine — don't trust until grep'd.
- **Onboarding consent screen** explicitly covers: what's collected, that the raw file is deleted, that the user can erase everything from settings.
- **"Delete my LinkedIn data" button** on profile settings — wipes all `linkedin_*` rows for the user. ON DELETE CASCADE on every table from `auth.users`.
- **"Export what you have on me" button** — emit JSON dump for right-of-access compliance.
- **Privacy policy update** for Reichman ethics review. Israeli Privacy Protection Law (2024 amendment) likely requires registration with the Privacy Protection Authority for processing third-party connection data at 100-student scale; loop in faculty + legal before pilot launch.
- **Faculty cannot see student LinkedIn data** in cohort dashboards — aggregates only.

### Timeline

- **Wk 1-2** (alongside the AddInformation expansion): security + lifecycle infrastructure only — consent screen, `linkedin_archive_requested_at` / `linkedin_archive_imported_at` columns on profiles, RLS on the `linkedin_*` tables, delete-my-data button, privacy policy update. ~1.5 days dev.
- **Wk 9-10**: full import edge function + parser + connection cross-referencing + diff-on-import + networking UI on Internship Picker / Tracker. ~4-5 days dev.
- **Optional, post-pilot**: Mailgun inbound email forwarding for fully automatic re-sync. ~1 day if Mailgun is already provisioned for any other purpose.

**Total: ~6 days dev across both phases.**

### Open questions (resolve when archive arrives)

- Exact schema of Connections.csv — confirm fields (First Name, Last Name, URL, Email, Company, Position, Connected On)
- Are emails truly only present for ~15% of connections, or has LinkedIn changed this?
- Vanity URL handling — confirm whether old URLs redirect or 404 in the export data
- Whether Recommendations text includes recommender's profile URL (for clickable display)

---

## Planned: Strategic Internship Finder

Status: **design complete, awaiting decision on Wk 3 start.** Three-phase architecture turns "find an internship" into "find an internship that strategically closes your specific skill gaps." Differentiator vs. faculty-provided placements — students get matched against companies where the work would actually fill the gaps blocking their track_1 roles.

### Design — three phases, each with its own data shape

1. **Translate skill gaps → "internship profile"** (abstract characteristics, not company names). Edge function `generate-internship-profile` reads career_roles + skill_gaps + stories, emits structured JSON: target_role_types, target_company_stages, target_team_signals, jd_keywords_to_seek, jd_keywords_to_avoid, rationale. Regenerates when career_roles change.
2. **Match profile against company universe.** Edge function `match-internship-companies` scores candidates against the active profile: curated IL companies DB (~100 anchor companies, faculty-curated) + faculty-provided practicum list (cohort-specific) + live JSearch results + LinkedIn connections + Reichman alumni. Output: `company_targets` rows with fit_score + fit_rationale + identified contacts.
3. **Coach outreach + execution.** Edge function `draft-outreach-message` produces tailored LinkedIn DMs grounded in the student's actual stories from Story Bank. Anti-fabrication preserved — never invents companies, contacts, or claims. Drafts persist on `company_targets.outreach_drafts`; student edits and sends manually from LinkedIn.

### Schema additions

- `profiles.practicum_mode` (bool), `practicum_cohort` (text), `practicum_status` (enum)
- `internship_profiles` — versioned ideal-profile records per user, regenerated on roadmap changes
- `companies` — curated IL DB (sector, stage, employees, hiring_functions, internship_program, team_structure_notes, notable_for, curator attribution)
- `company_targets` — student's pipeline (kanban-style status: exploring → researching → reaching_out → in_conversation → interview → offered → declined/rejected/placed)
- `faculty_practicum_companies` — university-provided list (per cohort)

### UI surfaces

- **Onboarding step:** "Are you in a university practicum?" toggle. If yes, captures cohort and queues internship_profile generation post-analysis.
- **New page `/Practicum`:** profile display + kanban pipeline + faculty-provided right rail + "find more matches" trigger.
- **Career Agent (when `practicum_mode = true`):** prompt addition leads with gaps before companies, surfaces target companies + identified contacts conversationally, drafts outreach using stories. Status updates emitted as `SUGGESTED_COMPANY_TARGET_JSON` confirmation cards (mirroring existing TaskSuggestionCard pattern).
- **Tracker integration:** when a `company_target` reaches interview status, agent suggests promoting to a Tracker application — unifies practicum tracking with general application flow.

### Compounds with other systems

```
career_roles + skill_gaps     → internship_profile
internship_profile + companies + faculty_list + JSearch → company_targets
company_targets + linkedin_connections + reichman_alumni → contacts_identified
company_targets + Story Bank  → outreach_drafts
company_target (interview)    → applications (Tracker)
```

Every existing primitive feeds in. The architectural insight: **the platform's value compounds because each new primitive amplifies all the others.** Internship Finder is unlocked by Story Bank + LinkedIn + curated companies all already existing.

### Build phases

| Phase | Wk | Effort | Notes |
|---|---|---|---|
| Schema + practicum mode toggle in onboarding | 3 | 1 day | Migrations, profile flag, onboarding question |
| `generate-internship-profile` edge function + /Practicum profile display | 3-4 | 2 days | Prompt iteration with sample students |
| `match-internship-companies` + kanban pipeline UI | 4-5 | 2 days | Reuses analyze-job-match scoring patterns |
| Curated company DB seed (~100 IL anchor companies) + faculty list import | 4 | 1.5 days | Faculty input + manual research |
| Career Agent practicum prompt addition | 5 | 0.5 day | System prompt + JSON-block parsing |
| `draft-outreach-message` + Tracker integration | 9-10 | 2 days | Depends on Story Bank + LinkedIn import landing |

**Total: ~10 days dev, spread Wk 3-10.** Phases 1-5 ship incrementally; outreach drafting (phase 6) gates on Story Bank (Wk 7-8) + LinkedIn import (Wk 9-10).

### Open questions

- Which 100 companies seed the curated DB? Faculty curation timeline — needs to start Wk 1-2.
- How does faculty submit their practicum-eligible list? Spreadsheet import vs. admin UI vs. just a managed CSV in the repo?
- What's the right trigger for re-generating internship_profile? Career analysis re-run, manual button, or scheduled?

---

## Planned: Autonomous Job Scout

Status: **design complete.** Backend is architecturally trivial (cron + LLM call + DB write) but systemically valuable — produces three outputs from one process: student engagement, conversational substrate for Career Agent, and (post-pilot) instructor visibility.

### Design — one process, three surfaces

**Backend (~5 days dev):**
- `pg_cron` daily schedule, staggered per user
- Edge function `scout-find-jobs` per user: query JSearch / Active Jobs DB with last-24h filter against target_job_titles + target_industries + location
- For each new posting (deduped against `applications`, `job_suggestions`, `scout_findings`): score using existing analyze-job-match logic
- Threshold: track_1 OR (track_2 + alignment > 0.7) OR (practicum_fit > 0.7 in practicum mode)
- UPSERT into `scout_findings` table; increment `profile.scout_unread_count`
- Reuse existing OpenAI client + function_metrics observability — no new vendors, no agent framework, just a scheduled function

**Three student-facing surfaces (one mental model):**

| Surface | Channel | Why |
|---|---|---|
| Home dashboard "Scout" card | Passive — visible always, never demanding | Primary entry point for "dashboard people" |
| Career Agent passive mention on chat open | Conversational — "I found 3 things, want to talk?" | Primary entry for "chat people"; agent has fresh material |
| JobSuggestions page with scout badge | Existing surface, scout findings appear alongside pull-based matches | Unified "all my AI-suggested matches" view |

**Why no separate scout chat:** Career Agent already understands goals, roadmap, applications. Scout findings are "more things to talk about" within that context. A separate chat fragments the mental model. The scout's value is its content + rationale, not conversational personality.

### Admin metrics for Eli (replaces full instructor dashboard for pilot)

Skip the full faculty-facing cohort dashboard. For the pilot, just an admin page or SQL query for Eli covering:
- Daily scout activity (findings surfaced, students with unseen findings 7+ days, conversion rate findings → applications)
- Per-student engagement (last seen, findings this week, application velocity)
- Aggregate trends (top company matches across cohort, skill-gap drivers, week-over-week conversion change)

Implementation: two SQL views (`cohort_scout_metrics`, `student_engagement_summary`) + a simple `/admin` page for Eli. RLS gates instructor-role access. **Full faculty dashboard deferred until pilot proves the concept.**

### Schema additions

- `scout_findings` — per-user, dedup by `(user_id, job_external_id)`. Status: new → seen → saved/dismissed/applied. Stores tier, fit_score, goal_alignment_score, practicum_fit_score, fit_rationale.
- `profiles.scout_last_seen_at`, `profiles.scout_unread_count` — for the dashboard surfacing
- `profiles.cohort` — already in the practicum design; reused for admin views
- Two SQL views for admin metrics (no new tables required)

### Compounds with other systems

```
career_roles + internship_profile → scout-find-jobs scoring
JSearch / Active Jobs DB           → posting source (existing integration)
analyze-job-match logic            → reused (no duplication)
scout_findings                     → Home card + Career Agent + JobSuggestions
saved finding                       → applications (existing Tracker flow)
function_metrics                   → admin engagement view
```

Every part is existing infrastructure. **The scout doesn't introduce a new system — it activates the systems that already exist.**

### Cost & scale

- API calls: ~300-400 RapidAPI/day (JSearch Pro $25/mo = 333/day average — comfortable headroom on 10K/mo allowance)
- LLM scoring: ~500 gpt-4o-mini calls/day × $0.001 ≈ $0.30/day = $9/mo
- Cron infra: pg_cron (free) — graduate to Inngest or Trigger.dev only if reliability issues surface

**Total marginal cost: ~$10/mo.** Negligible relative to the engagement value.

### Build phases

| Phase | Wk | Effort | Notes |
|---|---|---|---|
| `scout_findings` table + pg_cron + edge function skeleton | 7 | 1 day | Schema, scheduler, dedup logic |
| Scoring pipeline + threshold logic + fit_rationale | 7 | 2 days | Reuses analyze-job-match patterns |
| Home dashboard "Scout" card | 7-8 | 1 day | Save / dismiss / mark-seen actions |
| Career Agent passive mention | 8 | 0.5 day | Prompt addition + when-to-mention logic |
| JobSuggestions integration (scout badge) | 8 | 0.5 day | Unified status flow |
| Practicum-mode scoring | 8 | 0.5 day | Inject internship_profile; depends on practicum work |
| Admin metrics SQL views + /admin page | 9 | 1 day | The simplified instructor visibility |

**Total: ~7 days dev, Wk 7-9.**

### Open questions

- pg_cron reliability at scale — fine for 100 users, but if it flakes during pilot, do we graduate to Inngest or just absorb the occasional miss?
- Notification surface for high-priority findings — silent dashboard card vs. push/email/WhatsApp. Default silent for pilot; revisit if engagement is low.
- Scout finding decay — at what point should an unseen finding age out? 14 days seems right.

---

## Planned: Story Bank as system primitive

Status: **design complete.** Three capture surfaces, six consumption points, one shared data layer. Stories are the platform's narrative layer — the evidence connecting "I worked at X" to "I can do Y." Currently the platform has experiences (structural) and skills (capabilities) with no narrative bridge.

### Design

Capture pattern (same on all three surfaces): user types free-form text → AI extracts STAR structure → user confirms/edits in a card → row written to `stories`. **No STAR formatting required from the user** — the AI does the parsing. Anti-fabrication preserved: any STAR field unsupported by the user's words stays NULL.

Three capture surfaces:
1. **CV Agent chat (proactive)** — agent asks targeted questions when discussing an experience. Emits `SUGGESTED_STORY_JSON` block; user confirms via existing `TaskSuggestionCard`-style component.
2. **AddInformation → Experience tab** — each experience card gains an inline "Stories" section + `+ Add story` button → modal with single textarea + AI extraction + editable confirmation.
3. **Quick-add from anywhere** — floating "+ Story" button on profile-editing pages with experience selector dropdown.

All three call `extract-story-from-text` edge function. One pattern, three surfaces.

Six consumption points (all share a `getStoriesFor({user_id, experienceIds?, jdKeywords?, skillTags?})` helper):

| Consumer | Behaviour |
|---|---|
| `generate-tailored-cv` | Pulls stories matching JD keywords as bullet evidence; replaces generic responsibility-shaped bullets with metric-backed ones |
| LinkedIn Optimizer | Top 2-3 stories per experience; LinkedIn descriptions become tightened paraphrases of real stories |
| Career Agent | Stories matching current discussion context for grounded coaching |
| Interview Coach | Stories matching question's `skills_demonstrated` for behavioral answers |
| `generate-career-analysis` | Top 3-5 stories per experience as context — track scoring becomes more accurate |
| Internship Finder outreach drafting | Stories as evidence in cold-DM templates |

### Schema

```sql
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id uuid REFERENCES experiences(id) ON DELETE SET NULL,
  title text NOT NULL,
  situation text, task text, action text, result text,    -- nullable for progressive capture
  metrics text[] DEFAULT '{}',
  skills_demonstrated text[] DEFAULT '{}',
  tools_used text[] DEFAULT '{}',
  relevance_tags text[] DEFAULT '{}',                     -- gin-indexed for jdKeywords && relevance_tags
  source text NOT NULL CHECK (source IN ('conversation','manual','imported_from_resume')),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- + standard 4-policy RLS
```

### Risks + dependencies

- **Anti-fabrication discipline** — extract-story prompt explicitly says "if unsupported by user's words, leave NULL." Per `tasks/lessons.md`.
- **Editable confirmation card** — critical UX. Catches mis-attribution before save.
- **Multiple stories per message** — extraction can emit multiple SUGGESTED_STORY_JSON blocks; UI stacks them.
- **No external dependencies** — Story Bank is foundational; everything else depends on it, not vice versa.

### Build cost

| Phase | Wk | Effort |
|---|---|---|
| Schema + RLS | 7 | 0.5 day |
| `extract-story-from-text` edge function (gpt-4o-mini, structured output) | 7 | 1 day |
| CV Agent integration (SUGGESTED_STORY_JSON parsing + save card) | 7 | 1 day |
| AddInformation Experience tab inline + quick-add modal | 7-8 | 1.5 days |
| `getStoriesFor` shared helper | 8 | 0.5 day |
| Wire stories into generate-tailored-cv prompt | 8 | 0.5 day |
| Wire stories into other consumers (incremental) | 8-10 | ~1 day across consumers |

**Total: ~6 days dev, Wk 7-10.** Front-loaded so dependents can use stories immediately.

---

## Planned: Practice Interview Agent

Status: **design complete.** Text v1, gpt-4o-mini, story-grounded. Voice mode (OpenAI Realtime API) is post-pilot stretch — same architecture, different I/O.

### Design

Three conversation modes the student picks from:

1. **Application-scoped practice** — student picks a Tracker application → agent reads JD + role family + target company + profile + stories → generates 5-7 likely questions (mix behavioral + role-specific) → asks one at a time → scores each → drills deeper on weak ones.
2. **General behavioral prep** — no application; common behavioral questions ("tell me about a time you led change"); same scoring.
3. **Single-question deep dive** — student picks one question → answers → scored → re-answers with feedback → repeats until satisfied.

### Story integration (the key differentiator)

Two ways:
- **Pre-answer suggestion:** *"You actually have a great story here — your Guardio triage automation. Want to use that as your answer?"*
- **Post-answer enhancement:** *"Solid answer, but no metrics. You have a Guardio story with '200 → 80 tickets/week' — adding that would make this stronger. Try again?"*

Stories pulled by `relevance_tags && question.expected_skills`. Never references stories not in the user's table (anti-fabrication guard).

### Eval rubric (per answer, 1-5 each)

| Dimension | What it measures |
|---|---|
| Structure | STAR clarity — situation/task/action/result identifiable? |
| Specificity | Real situation with names/dates vs. generic platitudes |
| Relevance | Answers the question asked, not adjacent |
| Metrics | Concrete outcomes — numbers, before/after, scope |
| Brevity | Under ~2 min spoken / ~250 words written |

Output JSON with strengths, improvements, story_used_id, would_recommend_story_id, drill_down_question. Surfaced conversationally, not as a grade.

### Schema

```sql
CREATE TABLE interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  mode text CHECK (mode IN ('application_scoped','general_behavioral','single_question')),
  status text CHECK (status IN ('in_progress','completed','abandoned')) DEFAULT 'in_progress',
  avg_structure numeric, avg_specificity numeric, avg_relevance numeric,
  avg_metrics numeric, avg_brevity numeric,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE interview_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question_text text NOT NULL,
  question_type text CHECK (question_type IN ('behavioral','role_specific','technical','culture_fit')),
  answer_text text,
  answered_at timestamptz,
  scores jsonb,
  strengths text[],
  improvements text[],
  story_used_id uuid REFERENCES stories(id),
  would_recommend_story_id uuid REFERENCES stories(id),
  drill_down_question text
);
-- + RLS
```

### UI

Existing `/InterviewCoach` already has the application selector — extend with a mode toggle: **Strategic prep** (existing chat) vs **Practice mode** (new Q&A simulation). Practice mode is stripped-down: agent asks, student types, agent scores + drills or moves on. Sidebar shows session score progression. End-of-session summary with aggregate scores + improvement priority list.

### Risks + dependencies

- **Coaching tone, not grading.** Rubric prompt must emphasize this is preparation, not evaluation. Easy to land harsh.
- **Story confabulation** — agent must never reference a story that doesn't exist. Pull story IDs from DB at prompt-build time.
- **Question-bank quality** — v1 generates per-JD on the fly; quality may be uneven. Cache good questions by role family for reuse.
- **Dependencies:** Story Bank (Wk 7-8). Without stories, the agent works but loses the "you have a great story for this" magic.

### Build cost

| Phase | Wk | Effort |
|---|---|---|
| Schema + RLS | 11 | 0.5 day |
| Mode toggle on /InterviewCoach + practice-mode UI | 11 | 1 day |
| Question generation edge function | 11 | 1 day |
| Answer scoring edge function (rubric prompt) | 11 | 1 day |
| Story integration (suggest / recommend) | 11-12 | 1 day |
| Session summary + score progression | 12 | 0.5 day |
| Drill-down conversation flow | 12 | 1 day |

**Total: ~6 days dev, Wk 11-12.**

---

## Planned: LinkedIn Optimizer with Mirror Page

Status: **v1 generation-first shipping Wk 3 (text output).** v2 visual mirror remains planned (deferred until pilot signal validates section coverage + LinkedIn import lands for before/after diffs).

### v1 — generation-first (Wk 3)

`/LinkedinOptimizer` page. Single "Generate" click runs one LLM call that returns all sections in one structured JSON response. Each section renders as a card with the generated text + character count vs LinkedIn's actual limit + Copy button. User pastes section-by-section into LinkedIn manually.

**6 sections covered in v1:**

| Section | LinkedIn char limit | Source priority |
|---|---|---|
| Headline | 220 | profile.summary + target_job_titles + primary_domain |
| About | 2,600 | profile.summary + top stories across experiences (recency + target alignment) + target_job_titles |
| Experience descriptions (per professional experience) | 2,000 each | experience row + stories linked to that experience_id |
| Volunteering descriptions (per volunteering experience) | 2,000 each | same as Experience but filtered to bucket=volunteering |
| Skills priority order | top 50, top 3 highlighted | profile.skills + frequency in stories' skills_demonstrated + target_job_titles alignment |
| Honors & Awards descriptions | ~200 chars per honor | profile.honors[] expanded into 1-2 sentence factual descriptions (anti-fab discipline; no inventing reasons) |

Anti-fab + Story Bank precedence inherited from `generate-tailored-cv` (Day 4 BINDING rules — metrics verbatim, tools preserved, no cross-experience smearing). Plus LinkedIn-specific banned vocabulary ("passionate about", "results-driven", "let's connect" prefix, etc.).

### v2 — visual mirror page + remaining LinkedIn sections (post-v1)

Visual replica of LinkedIn's actual UI (avatar, font, spacing, character-count meter inline) for the 6 v1 sections, PLUS coverage of every remaining LinkedIn section so the platform handles a complete profile rewrite. None of these are skipped — all on the roadmap for eventual coverage:

**Additional sections to generate (v2):**
- Featured (pinned posts/articles/links — short titled descriptions)
- Projects (project descriptions with bullet evidence from stories)
- Courses + Certifications (descriptions + relevance framing)
- Recommendations text (drafts to send to colleagues to request)
- Per-experience skill tagging (which skills to attach to each experience entry)
- Education descriptions (per education entry — relevant coursework, leadership, awards)
- Patents (description + role)
- Publications (description + abstract)
- Test Scores (context framing)
- Organizations (membership descriptions)
- Causes (cause descriptions)
- Languages (proficiency framing)
- Career Break (gap explanation framing if user adds one)

**Visual mirror surfaces:** desktop + mobile previews; "Copy this section" button per visually-rendered panel; LinkedIn import (Wk 9-10) gives the user's actual current LinkedIn data as before/after diff.

### Dependencies

- v1: Story Bank backend (✓ shipped Wk 2). No external deps.
- v2 visual mirror: LinkedIn import (Wk 9-10) for the before-baseline; otherwise same data sources as v1.
- v2 additional sections: schema additions for Patents / Publications / Test Scores / Organizations / Causes / Career Break (these aren't currently captured in the platform). Onboarding / AddInformation surfaces would need extending to capture them.

### Open questions

- Which LinkedIn page version do we mirror in v2 — desktop, mobile, or both? Desktop is denser and harder to fit; mobile is what most students actually use.
- Featured/Posts: one-shot drafts or a content-calendar-style series? Defer until pilot signal indicates demand.
- Is paste-section-by-section actually better than a "copy entire profile JSON" workflow some students might prefer? Pilot eval question.

---

## Planned: AI Response Grading

Status: **idea logged, awaiting design.** Thumbs up/down on every AI output across every agent (Career Agent, CV Agent, Interview Coach, Skill Development, etc.). Stored per user. Two consumption layers: (a) personalisation — over time the system learns what each user's "thumbs up" looks like and tunes future outputs; (b) Outcome Learning Loop quality signal — links agent output quality to downstream outcomes (did the thumbs-up CV correlate with more interviews?).

### Why this matters

Agent quality is currently judged by usage proxies (did the user click Generate Again?) and complaint signals only. Explicit per-output grading gives a much sharper signal: which prompts work, which agents drift, which output styles each individual user prefers. At pilot scale (100 students × multi-month), grading data compounds into a real personalisation surface.

### Design sketch

- `feedback_events` table: `(user_id, agent, function_name, output_id, thumbs, comment text NULL, created_at, metric_event_id uuid REFERENCES function_metrics(id) NULL)`.
- Tiny thumbs-up / thumbs-down + optional one-line comment surface on every AI-generated artefact (chat reply, generated CV, scored job match, generated tasks, etc.).
- Per-user aggregation feeds the system prompt of each agent: "This user has rated 47 of your replies; their thumbs-down replies tend to share these traits: [extracted patterns]. Avoid those when responding."
- Outcome Learning Loop integration: join `feedback_events` against `applications.outcome` to surface "thumbs-up CVs lead to X% more interviews than thumbs-down CVs" type observations (with the same N-count discipline as the rest of the loop).
- Anti-overfitting: do not personalise off small N — minimum ~10 ratings per agent before the system prompt addition kicks in for that user.

### Dependencies

- `function_metrics` (Wk 1, shipped) — `metric_event_id` foreign key joins each grade back to the underlying agent call for cost / latency / model context.
- Application Outcome Learning Loop (Wk 1-2 schema shipped, surfacing Wk 11-12) — for the quality-correlates-with-outcome layer.

### Build cost (rough)

| Phase | Effort |
|---|---|
| Schema + RLS | 0.5 day |
| Thumbs UI component, wire into ~6 agent surfaces | 1 day |
| Per-user aggregation + system-prompt injection helper | 1 day |
| Outcome correlation view + Career Agent reference rules | 0.5 day |

**Total: ~3 days dev. Can be wired incrementally — schema + UI on every surface lands first as the data-capture foundation, personalisation + outcome correlation comes later.**

### Open questions

- Show personalisation status to the user? ("I've adapted to your last 47 ratings" — feels like surveillance vs. transparency tradeoff).
- One thumbs vs. richer rubric (helpful / accurate / personalised)? Start with one thumbs to maximise capture rate; add dimensions only if the pilot shows hunger for it.
- Per-agent thumbs vs. global-context thumbs? Per-agent — different agents have different success modes.

---

## Planned: Daily Action Card

Status: **design complete.** Daily curation pass over the user's existing pool (tasks + applications + scout findings + skill gaps + practicum company_targets). Picks **one** action and frames it for today. Doesn't create new content — ranks and selects.

### Design

`generate-daily-action` edge function runs daily per user (pg_cron, staggered). Reads the candidate pool, scores each by **leverage × urgency × low-friction**:

| Factor | Examples |
|---|---|
| Leverage | Warm-intro outreach > generic application > skill-gap practice |
| Urgency | Interview tomorrow > application going stale 5 days > skill-gap with no deadline |
| Low-friction | "Send the draft you already wrote" > "Draft outreach to Maya" > "Research 5 new companies" |

LLM picks the single highest-scoring action and writes a one-sentence framing.

### How it differs from existing tasks

| Tasks | Daily action |
|---|---|
| Persistent — accumulate as a to-do list | Ephemeral — generated daily, replaced when done |
| User browses + picks | System picks one for you |
| Created weekly by `generate-tasks` | Curated daily by `generate-daily-action` |
| Generic priority (high/med/low) | Today's-priority (computed contextually) |

The daily action **may reference** an existing task ("Reach out to Maya — task #7, you've been on it 5 days. Today's the day."). Doesn't duplicate; surfaces.

### Snooze/dismiss flow + calibration loop

- **✓ Done** — mark complete, generate tomorrow's action
- **⏭ Snooze** — defer for today, regenerate tomorrow
- **✕ Not relevant** — dismiss this *type* for the next 7 days; the priority logic deweights similar items

Third option is the calibration signal — students who dismiss "skill practice" 3 times in a row get fewer skill-practice surfacings, more outreach surfacings.

### Schema

```sql
CREATE TABLE daily_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  for_date date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  action_type text CHECK (action_type IN
    ('apply','reach_out','follow_up','interview_prep','skill_practice','scout_review','reflect','update_profile')),
  source_table text,                  -- 'tasks' | 'applications' | 'scout_findings' | 'company_targets' | null
  source_id uuid,
  title text NOT NULL,
  rationale text NOT NULL,
  estimated_minutes integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending','done','snoozed','dismissed')),
  completed_at timestamptz,
  user_notes text,
  UNIQUE (user_id, for_date)          -- one card per day, max
);
-- + RLS
```

### UI + calendar relationship

Card lives at the top of Home dashboard. One per day, replaces when completed. "Block time for this →" affordance creates a calendar event tomorrow morning (light integration; doesn't auto-block).

### Risks + dependencies

- **Risk: feels nagging.** Mitigation: 3 dismissals of a type → that type backs off for 7 days.
- **Risk: action picks poorly.** Mitigation: small "see other options" link reveals ranked alternatives.
- **Risk: duplicate generation.** Mitigation: UNIQUE constraint per day; if today's done, no new card until tomorrow.
- **Dependencies:** none hard. Scout, Story Bank, applications all enrich the candidate pool but aren't required.

### Build cost

| Phase | Wk | Effort |
|---|---|---|
| Schema + RLS | 7 | 0.5 day |
| `generate-daily-action` edge function (priority logic + LLM picker) | 7-8 | 2 days |
| Home dashboard card UI (display, done/snooze/dismiss) | 8 | 1 day |
| Calibration loop (dismissed-type backoff) | 8 | 0.5 day |
| Calendar integration ("block time for this") | 8 | 0.5 day |

**Total: ~4.5 days dev, Wk 7-8.**

---

## Planned: Application Outcome Learning Loop

Status: **design complete — needs Wk 1-2 schema landing for day-1 data capture.** The hardest part is honesty about small-N: at 100 students × 4 months, individual patterns ride on 5-15 datapoints; cohort patterns on 1-3K. Every claim must include the count.

### Critical: data capture must land Wk 1-2, not Wk 11-12

If the audit table + schema additions wait until Wk 11-12 when we want to surface patterns, we have 4 months of student behavior with nothing to learn from. **Schema lands NOW. Surfacing lands LATER.**

### Signals to capture

**At application creation** (already + new):
- tier, qualification_score, goal_alignment_score, required_seniority (already)
- `source` — scout / job_suggestion / manual / chat_agent / company_target (NEW)
- `attached_cv_version` (already as cv_version_used)
- `found_via_connection` — bool, true if company has linkedin_connections row at creation (NEW; depends on Wk 9-10 LinkedIn import)
- `found_via_alumni` — bool, true if company has reichman_alumni overlap (NEW; depends on alumni list)

**At each status transition:**
- `status_changes` audit table (already designed for cohort velocity precondition) + trigger
- duration_in_previous_status (computed via view)

**At terminal status** (offer / rejected / accepted / declined):
- `outcome_notes` — single-sentence reflection prompt ("what worked, what didn't?")
- referral_attached (already)

### Schema additions (Wk 1-2)

```sql
-- The audit trail
CREATE TABLE status_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_log_application_status_change
  AFTER UPDATE OF status ON applications
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_application_status_change();

ALTER TABLE applications
  ADD COLUMN source text CHECK (source IN ('scout','job_suggestion','manual','chat_agent','company_target')),
  ADD COLUMN found_via_connection boolean DEFAULT false,
  ADD COLUMN found_via_alumni boolean DEFAULT false,
  ADD COLUMN outcome_notes text;
```

Auto-populate `source` from existing add-paths during the same PR (Tracker → 'manual', JobSuggestions → 'job_suggestion', ChatInterface → 'chat_agent'; the others land as their features ship).

### Pattern surfacing (Wk 11-12)

Two views, one Career Agent integration:

```sql
CREATE VIEW user_application_patterns AS ...   -- counts per user across tier/source/referral cuts
CREATE VIEW cohort_application_patterns AS ... -- aggregated by cohort
```

Always returns counts, not just rates — the UI needs N to decide if a pattern is worth surfacing.

### Anti-overfitting discipline (non-negotiable)

- **Individual claim minimum: 5+ data points.** Below that, no claim surfaced.
- **Cohort claim minimum: 30+ data points.** Below that, no claim surfaced.
- **Always show the count.** "Your track_1 apps with referrals → 3 of 4 got interviews (75%, low N)" — N is part of the claim.
- **No causal claims** — just "what." Not "referrals cause higher interview rate"; just "apps with referrals → higher interview rate."
- **Cohort comparison anonymized** — medians + ranges, never individual data. Suppress entirely if cohort has <10 active.

Career Agent prompt addition:
> When discussing strategy, you MAY reference patterns from `user_application_patterns` and `cohort_application_patterns` ONLY IF count ≥5 (individual) or ≥30 (cohort). Always cite the count. Never present a pattern as a rule. Frame as "trend to consider," not "this is what works."

### UI surfaces

1. **Reflection prompt at terminal status** — when user updates to rejected/offer/accepted/declined, inline prompt: *"Quick reflection — what worked or didn't? One sentence is fine. (skips silently if blank)"*
2. **/Insights page** (per-student) — personal patterns with explicit N counts; cohort comparison anonymized.
3. **Career Agent integration** — agent references patterns when discussing strategy with the safety rules above.

### Build cost (split across pilot)

| Phase | Wk | Effort |
|---|---|---|
| status_changes table + trigger | 1-2 | 0.5 day |
| applications schema additions (source, found_via_*, outcome_notes) | 1-2 | 0.5 day |
| Reflection prompt UI on terminal status change | 2 | 0.5 day |
| Auto-populate source from add-paths + found_via_* logic | 2 | 0.5 day |
| user_application_patterns + cohort_application_patterns views | 11 | 1 day |
| /Insights page UI | 11-12 | 1.5 days |
| Career Agent pattern integration (prompt + safety rules) | 12 | 0.5 day |

**Total: ~4.5 days dev, BUT split: 2 days NOW (Wk 1-2) + 3 days LATER (Wk 11-12).**

---

## Planned: Visual redesign / design system migration

Status: **planned, post-pilot OR incremental during.** Codebase has 700+ hardcoded hex values across components (audit found 274 of `#A3A3A3`, 195 of `#0A0A0A`, etc.). CSS variables exist in `globals.css` but components don't use them — the design system is half-built.

### Approach: incremental, never big-bang

A "rewrite all the CSS" PR is the kind of thing that introduces visual regressions you only notice in production. Three safer paths, in order of preference:

1. **Token migration alongside feature work** — when we touch a component for any feature (Story Bank cards, Practice Interview UI, Daily Action card, Insights page), swap its hardcoded hex for CSS variables in the same PR. By pilot end, ~30-40% of components are token-clean for free.
2. **Design system master prompt + Stitch 2.0 / v0.dev workflow** — for genuinely new component families (e.g., the kanban pipeline in /Practicum, the Insights charts), generate via Stitch / v0 against the token contract. New components born clean.
3. **Dedicated migration sprint** — only after pilot. ~1-2 weeks. Token-by-token (`--text-secondary` → grep for the hex → replace → screenshot test). Playwright screenshot regression tests added BEFORE the migration starts.

### Risks

- **Visual regression** — the largest risk. Hardcoded hex values are at least *predictable*; CSS variables resolved at runtime can shift unexpectedly across themes/devices. Mitigation: Playwright screenshot tests on the 8-10 most-trafficked screens before any wholesale migration.
- **Mid-pilot UI churn** — students notice when "the buttons changed." Avoid dedicated migration during Aug-Nov.
- **Half-migrated state** — some components use tokens, some hex; visual drift becomes hard to debug. Mitigation: lint rule that flags `#[0-9a-f]{6}` in JSX during PR review (warning, not error).

### Tooling decision (deferred until execution)

- **Stitch 2.0 (Google):** generates full-page UIs from prompts; exports HTML/Tailwind. Useful for landing page + new pages, awkward for component-level migration.
- **v0.dev:** generates shadcn/Tailwind components against your token contract if you supply `components.json` + tokens. Best fit for component-level work.
- **Figma + manual rebuild:** possible but slow.

Recommendation when execution starts: v0.dev for components, Stitch for full-page concepts.

### Build cost

| Phase | Wk | Effort |
|---|---|---|
| ESLint rule: warn on hardcoded hex in JSX | 1-2 | 0.5 day |
| Playwright screenshot baseline (top 8 screens) | 2 | 1 day |
| Token migration alongside feature PRs (free, no separate effort) | ongoing | 0 day |
| Dedicated migration sprint (post-pilot) | post-Nov 2026 | 8-12 days |

**Total: ~1.5 days now (lint + screenshot baseline) + ongoing free progress + ~2 weeks post-pilot for the dedicated sprint.**

### Open questions

- Do we lock the token contract before pilot or refine during? Recommend lock — student-facing UI shouldn't restyle mid-pilot.
- Tailwind v4 migration — separate question; tokens-as-CSS-vars work in both v3 and v4.

---

## Planned: Public landing page

Status: **planned, Wk 13.** Pilot students get direct invites and never see a landing page during onboarding, but faculty will share publicly, future cohorts will discover via search/word-of-mouth, and brand legitimacy matters even for closed pilots. Ship a minimal, honest landing page that explains what it is + has a signup CTA → existing `/login`.

### Design

Single-page route at `/` for unauthenticated users. Authenticated users redirect to existing Home (current behavior preserved).

Sections (in order):
- **Hero** — single sentence value prop ("Engineer your career, from your first internship") + one CTA (Sign up / Sign in)
- **What it does** — three cards: career roadmap, application tracker with AI scoring, conversational career agents
- **How it works** — 3-step process: (1) onboard with CV → roadmap, (2) track + score applications, (3) practice with role-specific agents
- **Who it's for** — Reichman business students (during pilot) + general framing for post-pilot
- **Faculty section** — Dr. Miller + the professor's testimonials (with permission)
- **Footer** — privacy policy, contact, status

NO pricing, no waitlist, no marketing fluff. Honest description of what the platform does.

### Tooling

- **v0.dev** for the section components — generates shadcn/Tailwind directly into our Vite app
- **Stitch 2.0** as alternative for the full-page concept if v0 output feels generic
- Build in the existing Vite app as `src/pages/Landing.jsx` — public route, no auth required, redirects authenticated users to Home
- Keep dependencies inside the existing stack (Tailwind + shadcn). No separate Webflow / Framer site.

### Routing change

```jsx
// In src/App.jsx
<Route path="/" element={
  isAuthenticated
    ? <Navigate to="/Home" replace />
    : <Landing />
} />
```

Authenticated users keep Home as their landing; unauthenticated see the public page.

### Risks + dependencies

- **Risk: public page reveals features that aren't shipped yet.** Mitigation: only describe what's actually in production; no "coming soon" sections.
- **Risk: tone drift** — marketing voice creeps into a product that's grounded and honest in-app. Mitigation: copy reviewed against the same "anti-fabrication, no invented metrics" doctrine that governs the agents. No "10x your job search," no fake stats.
- **Dependencies:** domain purchase (Wk 1) needs to land for production deploy; otherwise page lives at `<project>.vercel.app`.

### Build cost

| Phase | Wk | Effort |
|---|---|---|
| v0.dev / Stitch generation + paste into Landing.jsx | 13 | 0.5 day |
| Routing change (public `/` for unauth, redirect for auth) | 13 | 0.5 day |
| Copy + faculty testimonials (with permission) | 13 | 0.5 day |
| Privacy policy + footer pages (mostly already exist for LinkedIn import compliance) | 13 | 0.5 day |

**Total: ~2 days dev, Wk 13.**

---

## Skipped for pilot

Deliberately not building these before Aug-Nov 2026. Listed with reasoning so the decisions are visible, not silently dropped.

| Feature | Why skipped |
|---|---|
| **Email parser inbox (Mailgun)** | Auto-classify-and-update has too many wrong-action failure modes; risk surface > value at pilot scale. The "draft updates instead of auto-apply" version is technically possible but not differentiating enough to spend a week on pre-pilot. Already in backlog. |
| **WhatsApp/SMS via Twilio** | Notifications are nice but not a feature differentiator; the value is in *what* we surface, not *how*. Existing surfaces (Home card, Career Agent passive mention, scout findings) cover engagement without push. Add post-pilot if engagement metrics show late-week drop-off. |
| **N5 reverse-job-spec / North-star JD generator** | Cute but `five_year_role` + `target_job_titles` + the new internship_profile already cover "clarify what students aim at." Synthetic-JD framing is a flourish, not foundational. |
| **Voice mode for Practice Interview** | Realtime API costs more, adds complexity. Text v1 proves the rubric and conversation shape. If text works, voice is a UI swap. Post-pilot stretch. |
| **Hebrew/RTL support** | Reichman business cohort is English-comfortable; CVs are in English; Israeli scale-ups operate in English at the recruiter level. Real i18n is multi-week scope and most of the value (CV gen, agent chats) doesn't need it. Revisit if a non-English cohort comes up. |
| **Salary negotiation coach** | Useful in principle but only triggers at "offer" status — at 100 students × 4 months, maybe 5-15 reach this. Hand-hold via Career Agent ad-hoc until pilot signal justifies a dedicated feature. |
| **Mobile-first responsive pass** | Audit-flagged but most current screens already work on mobile (`overflow-x-auto` patterns are in place). Polish post-pilot rather than optimize for an unsettled desktop UX. |
| **Library deduplication audit machinery** | ~10 MB of duplicated `_shared/libraries` is annoying but each function deploys individually so they update together. Real fix is the existing Wk 2 "library deduplication" item — don't add audit infrastructure on top. |
| **Cohort velocity metric on student dashboard** | Already parked to mid-pilot. Need real user data (status_changes audit table populated for ≥6 weeks) before comparison metrics are meaningful. |
| **Faculty-facing cohort dashboard** | Replaced by simple admin metrics (SQL views + /admin page) for Eli during pilot. Full faculty dashboard waits for pilot to prove the concept. |

**Net: cuts ~3 weeks of dev work from the backlog.** What remains is genuinely differentiating: Internship Finder, Scout, Story Bank, LinkedIn import + Optimizer, Practice Interview, Daily Action Card, Application Outcome Loop, Visual redesign, Landing page. Everything else is post-pilot signal-driven.

---

## Backlog (post-pilot or stretch)

- Persist `suggested_story_capture` on `chat_messages` so reload doesn't hide the StorySaveCard. Currently in-memory only (Wk 2 Day 3 scope cut). One column add + threading through load-from-DB path. Non-blocking — user can re-trigger by continuing the conversation.
- Story edit / delete from the AddInformation Story Bank inline list (Wk 3 Phase 2 scope cut — capture-only for v1). Currently stories are immutable from the UI; cleanup requires admin SQL. Modest UI work: edit modal reusing StorySaveCard's PREVIEW phase (pre-fill with story state) + DELETE confirm dialog. Keep the audit trail by soft-deleting (add `deleted_at` column) rather than hard delete so admin story browser can still inspect tuning history.
- N5 reverse-job-spec / North-star JD generator
- Voice mode for Practice Interview (OpenAI Realtime API)
- Hebrew/RTL support
- Salary negotiation coach
- Mobile-first responsive pass
- Library deduplication audit across all 5 copies
- ESLint rule: any error in user-initiated async must toast or render, not console-only

---

## How to use this file

- When you start work, move an item to **In Progress** with your name.
- When you ship, move to **Done** with the date and a one-line summary.
- New ideas go in the relevant week or **Backlog** with a one-line scope.
- This file is the source of truth for "what are we doing." If it's not here, it's not happening.
